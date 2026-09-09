// © 2026 김용현
// 모드 B — 지역별 편차 (비교형)
import { type DeviationBData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, autoRange, getFont, type FontOptions } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawFloatingLabel } from '../canvas/fit';
import { drawLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';

export function renderDeviationBGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: DeviationBData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendLabels = [
    options.legendLabel1 || data.precipDiffLabel,
    options.legendLabel2 || data.tempDiffLabel,
  ];
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5, options)
    : 0;

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? measureBottomLegend(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5,
        w - 130 - (130 + legendW), options, ['rect', 'circle'])
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: 130 + legendW,
    bottom: (() => {
      let b = 60;
      if (showLegend && legendPos === 'bottom') b += 60;
      b = Math.max(b, legendReserve);
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
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
  drawDevBYAxis(ctx, padding, w, h, tempAxis, 'left', data.tempUnit, options, options.fontSize);
  drawDevBYAxis(ctx, padding, w, h, precipAxis, 'right', data.precipUnit, options, options.fontSize);

  // X축
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();

  // 기준선 (0선)
  const zeroYPrecip = plotY + plotH - ((0 - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotX, zeroYPrecip);
  ctx.lineTo(plotX + plotW, zeroYPrecip);
  ctx.stroke();

  const slotW = plotW / n;
  // 지역이 둘·셋뿐이면 칸의 절반도 90px 을 넘는다 — AbsBarGraph 와 같은 80px 상한을 둔다
  const barWidth = Math.min(slotW * 0.5, 80);

  // X축 라벨 (크게)
  ctx.fillStyle = '#000';
  ctx.font = getFont(options.fontSize.tick * 1.2, options, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // 지역 이름은 칸 가운데에 놓이므로 양 끝 칸의 이름이 캔버스를 넘을 수 있다.
  // 아래 여백에 떠 있는 글자라 안으로 밀어도 어느 막대의 이름인지 안 흐려진다.
  const regionFont = (size: number) => getFont(size, options, 'bold');
  for (let i = 0; i < n; i++) {
    const cx = plotX + slotW * i + slotW / 2;
    drawFloatingLabel(ctx, regions[i].label, cx, plotY + plotH + 12, w, h,
      options.fontSize.tick * 1.2, regionFont);
  }

  // 강수량 차이 막대
  for (let i = 0; i < n; i++) {
    const val = precipDiffs[i];
    const cx = plotX + slotW * i + slotW / 2;
    const bx = cx - barWidth / 2;
    const valY = plotY + plotH - ((val - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;

    ctx.fillStyle = val >= 0 ? '#888' : '#CCC';
    const barTop = Math.min(zeroYPrecip, valY);
    const barH = Math.abs(valY - zeroYPrecip);
    ctx.fillRect(bx, barTop, barWidth, barH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, barTop, barWidth, barH);
  }

  // 기온 차이 점 (●)
  for (let i = 0; i < n; i++) {
    const cx = plotX + slotW * i + slotW / 2;
    const y = plotY + plotH - ((tempDiffs[i] - tempAxis.min) / (tempAxis.max - tempAxis.min)) * plotH;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 데이터 라벨
  if (options.showDataLabels) {
    ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const cx = plotX + slotW * i + slotW / 2;
      const pVal = precipDiffs[i];
      const pY = plotY + plotH - ((pVal - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;
      ctx.fillStyle = '#000';
      ctx.textBaseline = pVal >= 0 ? 'bottom' : 'top';
      ctx.fillText(String(pVal), cx, pVal >= 0 ? pY - barWidth / 2 - 4 : pY + 4);
      const tVal = tempDiffs[i];
      const tY = plotY + plotH - ((tVal - tempAxis.min) / (tempAxis.max - tempAxis.min)) * plotH;
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(tVal), cx, tY - 10);
    }
  }

  // 범례

  if (showLegend) {
    drawLegend({
      ctx, fonts: options,
      items: [
        { type: 'rect', fillStyle: '#888', strokeStyle: '#444', label: legendLabels[0] },
        { type: 'circle', fillStyle: '#000', label: legendLabels[1] },
      ],
      position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: options.fontSize.dataLabel * 0.85 + 5,
      rightGap: 80,
    });
  }

  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel });
}

function drawDevBYAxis(
  ctx: CanvasRenderingContext2D,
  padding: Padding,
  width: number,
  height: number,
  axis: { min: number; max: number; step: number },
  side: 'left' | 'right',
  label: string,
  fonts: FontOptions,
  fontSize: { tick: number; axisLabel: number }
) {
  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const x = side === 'left' ? plotX : plotX + plotW;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, plotY);
  ctx.lineTo(x, plotY + plotH);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = getFont(fontSize.tick, fonts, 'bold');
  ctx.textBaseline = 'middle';
  ctx.textAlign = side === 'left' ? 'right' : 'left';

  const tickCount = Math.round((axis.max - axis.min) / axis.step);
  for (let i = 0; i <= tickCount; i++) {
    const val = axis.min + i * axis.step;
    const y = plotY + plotH - ((val - axis.min) / (axis.max - axis.min)) * plotH;

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y);
    }
    ctx.stroke();

    const tx = side === 'left' ? x - 12 : x + 12;
    const valStr = Number.isInteger(val) ? val.toString() : val.toFixed(1);
    ctx.fillText(valStr, tx, y);
  }

  ctx.save();
  ctx.font = getFont(fontSize.axisLabel, fonts, 'bold');
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'bottom';
  const labelX = side === 'left' ? x - 12 : x + 12;
  ctx.textAlign = side === 'left' ? 'right' : 'left';
  ctx.fillText(label, labelX, plotY - 16);
  ctx.restore();
}
