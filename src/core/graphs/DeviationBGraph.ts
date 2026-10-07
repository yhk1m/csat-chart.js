// © 2026 김용현
// 모드 B — 지역별 편차 (비교형)
import { type DeviationBData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, autoRange, textFont, textSize } from '../canvas/renderer';
import { textCtx } from '../canvas/parens';
import { drawTitle, drawSourceAndFootnote, sourceFootnoteReserve } from '../canvas/labels';
import { drawFloatingLabel, nudgeInside } from '../canvas/fit';
import { drawLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';
import { styleOf, byStyle, tickLabelGap } from '../canvas/style';

const LOOK = {
  // 막대 흰색·127, 테두리 0.30pt, 0 선, 범주 경계 눈금이 0 선을 가로지른다 3.2pt (§2 deviation-b)
  classic: { zero: 1.5, barPos: '#888', barNeg: '#CCC', barStrokeColor: '#444', barStroke: 1, markerR: 7, crossTicks: false, crossLen: 0, labelAtZero: false, frame: false },
  exam: { zero: 1.75, barPos: '#7f7f7f', barNeg: '#ffffff', barStrokeColor: '#000', barStroke: 1.45, markerR: 6.8, crossTicks: true, crossLen: 15.5, labelAtZero: true, frame: true },
};

/** 편차 값 — 뺄셈이 남긴 부동소수 꼬리(2.1999999999999993)를 지운다 */
function fmtDiff(v: number): string {
  return String(Math.round(v * 1e10) / 1e10);
}

export function renderDeviationBGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: DeviationBData,
  options: GraphOptions
) {
  // exam 은 괄호를 명조로 따로 찍는다 — 이 아래 모든 글자 그리기·재기가 이 ctx 를 거친다
  ctx = textCtx(ctx, options);
  clearCanvas(ctx, w, h);
  const t = styleOf(options);
  const look = byStyle(options, LOOK);
  const legendFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5);
  const regionFs = textSize(options, 'symbol', options.fontSize.tick * 1.2);

  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendLabels = [
    options.legendLabel1 || data.precipDiffLabel,
    options.legendLabel2 || data.tempDiffLabel,
  ];
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, legendLabels, legendFs, options)
    : 0;

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? measureBottomLegend(ctx, legendLabels, legendFs,
        w - 130 - (130 + legendW), options, ['rect', 'circle'])
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: 130 + legendW,
    bottom: (() => {
      let b = 60;
      if (showLegend && legendPos === 'bottom') b += 60;
      b = Math.max(b, legendReserve);
      // 출처·각주 — classic 은 1.7.0 상수, exam 은 글자 크기로 잰다
      b += sourceFootnoteReserve(options, options.fontSize.dataLabel,
        (options.source ? 30 : 0) + options.footnotes.filter(f => f.trim()).length * 22);
      return b;
    })(),
    left: 130,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const regions = data.regions;
  const n = regions.length;

  // 기준값에서 자동 편차 계산
  const precipDiffs = regions.map((r) => r.precip - data.basePrecip);
  const tempDiffs = regions.map((r) => r.temp - data.baseTemp);

  // 축 범위 (대칭)
  const precipVals = precipDiffs;
  const tempVals = tempDiffs;

  const precipAxis = data.precipRange.auto
    ? autoRange(precipVals, 6)
    : { min: data.precipRange.min, max: data.precipRange.max, step: 0 };
  if (precipAxis.step === 0) precipAxis.step = Math.max(1, Math.round((precipAxis.max - precipAxis.min) / 6));
  if (data.precipRange.auto) {
    const precipAbs = Math.max(Math.abs(precipAxis.min), Math.abs(precipAxis.max));
    precipAxis.min = -precipAbs;
    precipAxis.max = precipAbs;
  }

  const tempAxis = data.tempRange.auto
    ? autoRange(tempVals, 6)
    : { min: data.tempRange.min, max: data.tempRange.max, step: 0 };
  if (tempAxis.step === 0) tempAxis.step = Math.max(1, Math.round((tempAxis.max - tempAxis.min) / 6));
  if (data.tempRange.auto) {
    const tempAbs = Math.max(Math.abs(tempAxis.min), Math.abs(tempAxis.max));
    tempAxis.min = -tempAbs;
    tempAxis.max = tempAbs;
  }

  // Y축 좌 (기온 차이), 우 (강수량 차이)
  drawDevBYAxis(ctx, padding, w, h, tempAxis, 'left', data.tempUnit, options);
  drawDevBYAxis(ctx, padding, w, h, precipAxis, 'right', data.precipUnit, options);

  // X축
  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();

  // 시험지는 위까지 닫는다
  if (look.frame) {
    ctx.lineWidth = t.line.axis;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX + plotW, plotY);
    ctx.stroke();
  }

  // 기준선 (0선)
  const zeroYPrecip = plotY + plotH - ((0 - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = look.zero;
  ctx.beginPath();
  ctx.moveTo(plotX, zeroYPrecip);
  ctx.lineTo(plotX + plotW, zeroYPrecip);
  ctx.stroke();

  const slotW = plotW / n;
  // 지역이 둘·셋뿐이면 칸의 절반도 90px 을 넘는다 — AbsBarGraph 와 같은 80px 상한을 둔다
  const barWidth = Math.min(slotW * 0.5, 80);

  // 시험지는 범주 경계 눈금이 0 선을 가로지른다
  if (look.crossTicks) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    for (let c = 1; c < n; c++) {
      const bx = plotX + slotW * c;
      ctx.beginPath();
      ctx.moveTo(bx, zeroYPrecip - look.crossLen / 2);
      ctx.lineTo(bx, zeroYPrecip + look.crossLen / 2);
      ctx.stroke();
    }
  }
  // 범주 이름 — 시험지는 0 선 바로 아래 (음수 막대가 있으면 막대를 덮지 않게 축 아래로)
  const labelY = look.labelAtZero && precipDiffs.every((v) => v >= 0)
    ? zeroYPrecip + look.crossLen / 2 + 4
    : plotY + plotH + 12;

  // X축 라벨 (크게)
  ctx.fillStyle = '#000';
  ctx.font = textFont(options, 'symbol', regionFs);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // 지역 이름은 칸 가운데에 놓이므로 양 끝 칸의 이름이 캔버스를 넘을 수 있다.
  // 아래 여백에 떠 있는 글자라 안으로 밀어도 어느 막대의 이름인지 안 흐려진다.
  const regionFont = (size: number) => textFont(options, 'symbol', size);
  for (let i = 0; i < n; i++) {
    const cx = plotX + slotW * i + slotW / 2;
    drawFloatingLabel(ctx, regions[i].label, cx, labelY, w, h,
      regionFs, regionFont);
  }

  // 강수량 차이 막대
  for (let i = 0; i < n; i++) {
    const val = precipDiffs[i];
    const cx = plotX + slotW * i + slotW / 2;
    const bx = cx - barWidth / 2;
    const valY = plotY + plotH - ((val - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;

    ctx.fillStyle = val >= 0 ? look.barPos : look.barNeg;
    const barTop = Math.min(zeroYPrecip, valY);
    const barH = Math.abs(valY - zeroYPrecip);
    ctx.fillRect(bx, barTop, barWidth, barH);
    ctx.strokeStyle = look.barStrokeColor;
    ctx.lineWidth = look.barStroke;
    ctx.strokeRect(bx, barTop, barWidth, barH);
  }

  // 기온 차이 점 (●)
  for (let i = 0; i < n; i++) {
    const cx = plotX + slotW * i + slotW / 2;
    const y = plotY + plotH - ((tempDiffs[i] - tempAxis.min) / (tempAxis.max - tempAxis.min)) * plotH;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, y, look.markerR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 데이터 라벨
  if (options.showDataLabels) {
    ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel));
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const cx = plotX + slotW * i + slotW / 2;
      const pVal = precipDiffs[i];
      const pY = plotY + plotH - ((pVal - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;
      ctx.fillStyle = '#000';
      ctx.textBaseline = pVal >= 0 ? 'bottom' : 'top';
      ctx.fillText(fmtDiff(pVal), cx, pVal >= 0 ? pY - barWidth / 2 - 4 : pY + 4);
      const tVal = tempDiffs[i];
      const tY = plotY + plotH - ((tVal - tempAxis.min) / (tempAxis.max - tempAxis.min)) * plotH;
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmtDiff(tVal), cx, tY - look.markerR - 3);
    }
  }

  // 범례

  if (showLegend) {
    drawLegend({
      ctx, fonts: options,
      items: [
        { type: 'rect', fillStyle: look.barPos, strokeStyle: look.barStrokeColor, label: legendLabels[0] },
        { type: 'circle', fillStyle: '#000', label: legendLabels[1] },
      ],
      position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: legendFs,
      rightGap: 80,
    });
  }

  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel,
    // exam 은 각주를 캔버스 끝에서 끝까지 — 플롯 폭에 담으면 둘째 줄부터 글자가 줄어든다
    canvasWidth: byStyle(options, { classic: undefined, exam: w }) });
}

function drawDevBYAxis(
  ctx: CanvasRenderingContext2D,
  padding: Padding,
  width: number,
  height: number,
  axis: { min: number; max: number; step: number },
  side: 'left' | 'right',
  label: string,
  o: GraphOptions,
) {
  const t = styleOf(o);
  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const x = side === 'left' ? plotX : plotX + plotW;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  ctx.beginPath();
  ctx.moveTo(x, plotY);
  ctx.lineTo(x, plotY + plotH);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = textFont(o, 'tick', textSize(o, 'tick', o.fontSize.tick));
  ctx.textBaseline = 'middle';
  ctx.textAlign = side === 'left' ? 'right' : 'left';

  const tickCount = Math.round((axis.max - axis.min) / axis.step);
  for (let i = 0; i <= tickCount; i++) {
    const val = axis.min + i * axis.step;
    const y = plotY + plotH - ((val - axis.min) / (axis.max - axis.min)) * plotH;

    ctx.lineWidth = t.line.tick;
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(x - t.line.tickLen, y);
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + t.line.tickLen, y);
    }
    ctx.stroke();

    const tx = side === 'left' ? x - tickLabelGap(t) : x + tickLabelGap(t);
    const valStr = Number.isInteger(val) ? val.toString() : val.toFixed(1);
    ctx.fillText(valStr, tx, y);
  }

  ctx.save();
  ctx.font = textFont(o, 'unit', textSize(o, 'unit', o.fontSize.axisLabel));
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'bottom';
  const labelX = side === 'left' ? x - tickLabelGap(t) : x + tickLabelGap(t);
  ctx.textAlign = side === 'left' ? 'right' : 'left';
  // 안에 있으면 그 자리 그대로 — exam 의 괄호(한글 가운데로 올라선다)가 위로 넘칠 때만 민다
  const at = nudgeInside(ctx, label, labelX, plotY - 16, width, height);
  ctx.fillText(label, at.x, at.y);
  ctx.restore();
}
