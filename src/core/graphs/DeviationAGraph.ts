// © 2026 김용현
// 모드 A — 월별 편차 (시계열)
import { type DeviationAData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, autoRange, textFont, textSize, type FontOptions } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote, sourceFootnoteReserve } from '../canvas/labels';
import { drawLegend, drawInsideLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';
import { EDGE, MIN_SCALE, nudgeInside, shrinkToWidth } from '../canvas/fit';
import { styleOf, byStyle, tickLabelGap } from '../canvas/style';

const LOOK = {
  // 막대 229 + 테두리 0.34pt, 0 선 0.34pt, ■ 지름 2.8pt (§3 #46·#32, §2 deviation-a)
  classic: {
    zero: 1.5, barPos: '#666', barNeg: '#CCC', barStrokeColor: '#444', barStroke: 1, legendBar: '#888',
    markerR: 5, marker: 'circle' as 'circle' | 'square', xTicks: false, unitAdjacent: false,
    insideLegend: undefined as undefined | 'bottom-right', frame: false,
  },
  exam: {
    zero: 1.65, barPos: '#e5e5e5', barNeg: '#e5e5e5', barStrokeColor: '#000', barStroke: 1.65, legendBar: '#e5e5e5',
    markerR: 6.8, marker: 'square' as 'circle' | 'square', xTicks: true, unitAdjacent: true,
    insideLegend: 'bottom-right' as undefined | 'bottom-right', frame: true,
  },
};

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const INTERVAL_INDICES: Record<number, number[]> = {
  12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  4: [2, 5, 8, 11],
  2: [0, 6],
};

export function renderDeviationAGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: DeviationAData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);
  const t = styleOf(options);
  const look = byStyle(options, LOOK);
  const legendFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5);
  const tickFs = textSize(options, 'tick', options.fontSize.tick);
  const nameFs = textSize(options, 'axisNameV', options.fontSize.axisLabel);
  const inLegFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.9);

  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  // 시험지는 플롯 안 오른쪽 아래 범례가 기본
  const insideLegend = data.insideLegend ?? look.insideLegend;
  const legendLabels = [
    options.legendLabel1 || data.precipLabel,
    options.legendLabel2 || data.tempLabel,
  ];
  const legendW = (showLegend && legendPos === 'right' && !insideLegend)
    ? measureLegendWidth(ctx, legendLabels, legendFs, options)
    : 0;

  // 축 이름을 세로로 쌓으면 눈금 숫자 바깥에 한 글자 폭이 더 필요하다
  let nameW = 0;
  if (data.tempAxisName || data.precipAxisName) {
    ctx.save();
    ctx.font = textFont(options, 'axisNameV', nameFs);
    nameW = ctx.measureText('가').width + 12;
    ctx.restore();
  }

  const padRight = 130 + legendW + (data.precipAxisName ? nameW : 0);
  const padLeft = 130 + (data.tempAxisName ? nameW : 0);
  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom' && !insideLegend)
    ? measureBottomLegend(ctx, legendLabels, legendFs,
        w - padLeft - padRight, options, ['rect', data.monthInterval === 12 ? 'line' : 'circle'])
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: padRight,
    bottom: (() => {
      let b = 60;
      // 플롯 안에 범례를 그릴 때는 아래에 자리를 비워 둘 이유가 없다
      if (showLegend && legendPos === 'bottom' && !insideLegend) b += 60;
      b = Math.max(b, legendReserve);
      // 출처·각주 — classic 은 1.7.0 상수, exam 은 글자 크기로 잰다
      b += sourceFootnoteReserve(options, options.fontSize.dataLabel,
        (options.source ? 30 : 0) + options.footnotes.filter(f => f.trim()).length * 22);
      return b;
    })(),
    left: padLeft,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const indices = INTERVAL_INDICES[data.monthInterval] ?? INTERVAL_INDICES[12];

  // 편차 계산 (월별 기준값)
  const tempDevs = data.months.map((m, i) => m.temp - data.baseMonths[i].temp);
  const precipDevs = data.months.map((m, i) => m.precip - data.baseMonths[i].precip);

  const visibleTempDevs = indices.map((i) => tempDevs[i]);
  const visiblePrecipDevs = indices.map((i) => precipDevs[i]);

  // 좌축: 강수량 편차
  const precipAxis = data.precipRange.auto
    ? autoRange(visiblePrecipDevs.length > 0 ? visiblePrecipDevs : [0], 6)
    : { min: data.precipRange.min, max: data.precipRange.max, step: data.precipRange.step ?? 0 };
  if (precipAxis.step === 0) {
    precipAxis.step = Math.max(1, Math.round((precipAxis.max - precipAxis.min) / 6));
  }
  if (data.precipRange.auto) {
    const precipAbs = Math.max(Math.abs(precipAxis.min), Math.abs(precipAxis.max));
    precipAxis.min = -precipAbs;
    precipAxis.max = precipAbs;
  }

  // 우축: 기온 편차
  const tempAxis = data.tempRange.auto
    ? (() => {
        const r = autoRange(visibleTempDevs.length > 0 ? visibleTempDevs : [0], 6);
        const abs = Math.max(Math.abs(r.min), Math.abs(r.max));
        return { min: -abs, max: abs, step: r.step };
      })()
    : { min: data.tempRange.min, max: data.tempRange.max, step: data.tempRange.step ?? 0 };
  if (tempAxis.step === 0) {
    tempAxis.step = Math.max(0.5, Math.round(((tempAxis.max - tempAxis.min) / 6) * 10) / 10);
  }

  // Y축 (좌: 기온, 우: 강수량)
  const tempTickW = drawDeviationYAxis(ctx, padding, w, h, tempAxis, 'left', data.tempLabel, options);
  const precipTickW = drawDeviationYAxis(ctx, padding, w, h, precipAxis, 'right', data.precipLabel, options);

  // X축
  const totalSlots = indices.length;
  const slotW = plotW / totalSlots;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();

  // 위쪽까지 이어 사각 테두리로 감싼다 (좌·우·아래 선은 이미 그려졌다)
  if (data.showFrame ?? look.frame) {
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX + plotW, plotY);
    ctx.stroke();
  }

  ctx.fillStyle = '#000';
  ctx.font = textFont(options, 'tick', tickFs);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // 시험지는 달 경계마다 바깥 눈금 (§2 deviation-a)
  const monthY = plotY + plotH + (look.xTicks ? t.line.tickLen + 6 : 12);
  if (look.xTicks) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    for (let s = 0; s <= totalSlots; s++) {
      const bx = plotX + slotW * s;
      ctx.beginPath();
      ctx.moveTo(bx, plotY + plotH);
      ctx.lineTo(bx, plotY + plotH + t.line.tickLen);
      ctx.stroke();
    }
  }
  for (let s = 0; s < totalSlots; s++) {
    const cx = plotX + slotW * s + slotW / 2;
    ctx.fillText(MONTH_LABELS[indices[s]], cx, monthY);
  }

  // 기준선 (0선)
  const zeroYPrecip = plotY + plotH - ((0 - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = look.zero;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(plotX, zeroYPrecip);
  ctx.lineTo(plotX + plotW, zeroYPrecip);
  ctx.stroke();

  // 강수량 편차 막대 — +/- 동일 색상
  // monthInterval 이 2면 칸이 둘뿐이라 55%가 148px 까지 벌어진다 — 같은 80px 상한을 둔다.
  // 열두 달(24.75px)·넉 달(74.25px)에서는 걸리지 않아 그림이 그대로다.
  const barWidth = Math.min(slotW * 0.55, 80);
  // 플롯 안 범례가 자료를 덮지 않도록 막대·점이 차지한 자리를 모아 둔다
  const inkRects: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (let s = 0; s < totalSlots; s++) {
    const i = indices[s];
    const val = precipDevs[i];
    const cx = plotX + slotW * s + slotW / 2;
    const bx = cx - barWidth / 2;
    const valY = plotY + plotH - ((val - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;

    ctx.fillStyle = data.barFill ?? (val >= 0 ? look.barPos : look.barNeg);
    const barTop = Math.min(zeroYPrecip, valY);
    const barH = Math.abs(valY - zeroYPrecip);
    ctx.fillRect(bx, barTop, barWidth, barH);
    ctx.strokeStyle = data.barStroke ?? look.barStrokeColor;
    ctx.lineWidth = look.barStroke;
    ctx.strokeRect(bx, barTop, barWidth, barH);
    inkRects.push({ x0: bx, y0: barTop, x1: bx + barWidth, y1: barTop + barH });
  }

  // 기온 편차 꺾은선 (12개월일 때만)
  if (data.monthInterval === 12) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tempLine;
    ctx.beginPath();
    let prev: { x: number; y: number } | null = null;
    for (let s = 0; s < totalSlots; s++) {
      const i = indices[s];
      const cx = plotX + slotW * s + slotW / 2;
      const y = plotY + plotH - ((tempDevs[i] - tempAxis.min) / (tempAxis.max - tempAxis.min)) * plotH;
      if (s === 0) ctx.moveTo(cx, y);
      else ctx.lineTo(cx, y);
      if (prev) {
        inkRects.push({
          x0: prev.x, y0: Math.min(prev.y, y),
          x1: cx, y1: Math.max(prev.y, y),
        });
      }
      prev = { x: cx, y };
    }
    ctx.stroke();
  }

  // 기온 점
  for (let s = 0; s < totalSlots; s++) {
    const i = indices[s];
    const cx = plotX + slotW * s + slotW / 2;
    const y = plotY + plotH - ((tempDevs[i] - tempAxis.min) / (tempAxis.max - tempAxis.min)) * plotH;
    ctx.fillStyle = '#000';
    if ((data.markerShape ?? look.marker) === 'square') {
      ctx.fillRect(cx - look.markerR, y - look.markerR, look.markerR * 2, look.markerR * 2);
    } else {
      ctx.beginPath();
      ctx.arc(cx, y, look.markerR, 0, Math.PI * 2);
      ctx.fill();
    }
    { const m = look.markerR + 1; inkRects.push({ x0: cx - m, y0: y - m, x1: cx + m, y1: y + m }); }
  }

  // (월) 라벨
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  const unitFont = textFont(options, 'unit', textSize(options, 'unit', options.fontSize.tick));
  if (look.unitAdjacent) {
    // 시험지는 마지막 달 숫자 바로 뒤에 붙인다
    const lastCx = plotX + slotW * (totalSlots - 1) + slotW / 2;
    ctx.font = textFont(options, 'tick', tickFs);
    const half = ctx.measureText(MONTH_LABELS[indices[totalSlots - 1]]).width / 2;
    ctx.font = unitFont;
    ctx.textAlign = 'left';
    ctx.fillText('(월)', lastCx + half, monthY);
  } else {
    ctx.font = unitFont;
    ctx.textAlign = 'center';
    ctx.fillText('(월)', plotX + plotW + 30, plotY + plotH + 12);
  }

  // 범례

  if (showLegend && insideLegend) {
    // 시험지는 기온(선)을 위, 강수량(막대)을 아래로 적는다 — 바깥 범례와 순서가 반대다
    drawInsideLegend({
      ctx,
      items: [
        {
          type: data.monthInterval === 12 ? 'line' : 'circle',
          fillStyle: '#000',
          marker: data.markerShape ?? look.marker,
          label: legendLabels[1],
        },
        {
          type: 'rect',
          fillStyle: data.barFill ?? look.legendBar,
          strokeStyle: data.barStroke ?? look.barStrokeColor,
          label: legendLabels[0],
        },
      ],
      corner: insideLegend,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: inLegFs,
      font: textFont(options, 'legend', inLegFs, { role: options.fontFamily ?? 'serif' }),
      fonts: options,
      avoid: inkRects,
    });
  } else if (showLegend) {
    drawLegend({
      ctx, fonts: options,
      items: [
        { type: 'rect', fillStyle: look.legendBar, strokeStyle: look.barStrokeColor, label: legendLabels[0] },
        { type: data.monthInterval === 12 ? 'line' : 'circle', fillStyle: '#000', label: legendLabels[1] },
      ],
      position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: legendFs,
      rightGap: 80,
    });
  }

  // 축 이름 — 눈금 숫자 바깥에 한 글자씩 세로로 쌓는다
  if (data.tempAxisName) {
    drawVerticalAxisName(ctx, data.tempAxisName, plotX - 22 - tempTickW - nameW / 2, plotY, plotH, h,
      nameFs, options);
  }
  if (data.precipAxisName) {
    drawVerticalAxisName(ctx, data.precipAxisName, plotX + plotW + 22 + precipTickW + nameW / 2, plotY, plotH, h,
      nameFs, options);
  }

  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel, canvasWidth: w });
}

function drawDeviationYAxis(
  ctx: CanvasRenderingContext2D,
  padding: Padding,
  width: number,
  height: number,
  axis: { min: number; max: number; step: number },
  side: 'left' | 'right',
  label: string,
  o: GraphOptions,
): number {
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

  let maxTickW = 0;
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
    maxTickW = Math.max(maxTickW, ctx.measureText(valStr).width);
  }

  // 단위 표기는 플롯 **위 여백**에 떠 있다 — 캔버스를 벗어나면 플롯을 줄이는
  // 대신 안으로 민다 (「평년 대비 기온 차이(°C)」가 좌우로 129.5px 넘던 자리).
  if (label) {
    ctx.save();
    const makeFont = (size: number) => textFont(o, 'unit', size);
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = side === 'left' ? 'right' : 'left';
    ctx.font = makeFont(shrinkToWidth(ctx, [label], textSize(o, 'unit', o.fontSize.axisLabel), width - EDGE * 2, makeFont));
    const labelX = side === 'left' ? x - tickLabelGap(t) : x + tickLabelGap(t);
    const at = nudgeInside(ctx, label, labelX, plotY - 16, width, height);
    ctx.fillText(label, at.x, at.y);
    ctx.restore();
  }

  return maxTickW;
}

/**
 * 축 이름을 한 글자씩 세로로 쌓아 그린다 (플롯 세로 가운데 정렬).
 *
 * **세로로 세운 이름은 플롯의 «높이»에 갇힌다.** 좌우 여백을 아무리 넓혀도
 * 자리가 늘지 않으므로 다른 글자에 쓰는 «여백을 넓힌다» 가 여기서는 무효다.
 * 줄을 늘리는 수(두 칸으로 세우기)도 세로 이름의 뜻을 흐린다 — 어느 칸부터
 * 읽어야 하는지가 그림에 안 적혀 있다. 그래서 남는 수는 글꼴을 줄이는 것이고,
 * 바닥(`MIN_SCALE`)까지 줄여도 넘치면 플롯 위아래 여백까지 빌린다.
 * 캔버스보다도 긴 이름이라면 그때만 바닥을 깨고 더 줄인다 — 잘라 내는 것보다
 * 작게 쓰는 편이 시험지에서 낫다.
 */
function drawVerticalAxisName(
  ctx: CanvasRenderingContext2D,
  name: string,
  cx: number,
  plotY: number,
  plotH: number,
  canvasH: number,
  fontSize: number,
  o: FontOptions,
) {
  const chars = [...name].filter((c) => c.trim() !== '');
  if (chars.length === 0) return;

  const stack = (size: number) => (chars.length - 1) * size * 1.15 + size;
  let size = fontSize;
  if (stack(size) > plotH) {
    size = Math.max(fontSize * MIN_SCALE, plotH / stack(1));
  }
  if (stack(size) > canvasH - EDGE * 2) size = (canvasH - EDGE * 2) / stack(1);

  ctx.save();
  ctx.font = textFont(o, 'axisNameV', size);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineH = size * 1.15;
  // 플롯 가운데에 맞추되, 캔버스를 넘으면 위아래 여백 쪽으로 민다
  const half = ((chars.length - 1) * lineH) / 2;
  let mid = plotY + plotH / 2;
  const top = mid - half - size / 2;
  const bottom = mid + half + size / 2;
  if (top < EDGE) mid += EDGE - top;
  else if (bottom > canvasH - EDGE) mid -= bottom - (canvasH - EDGE);
  let y = mid - half;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    y += lineH;
  }
  ctx.restore();
}
