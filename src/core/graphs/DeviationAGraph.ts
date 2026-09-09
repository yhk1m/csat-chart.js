// © 2026 김용현
// 모드 A — 월별 편차 (시계열)
import { type DeviationAData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, autoRange, getFont, type FontOptions } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawLegend, drawInsideLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';
import { EDGE, MIN_SCALE, nudgeInside, shrinkToWidth } from '../canvas/fit';

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

  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendLabels = [
    options.legendLabel1 || data.precipLabel,
    options.legendLabel2 || data.tempLabel,
  ];
  const legendW = (showLegend && legendPos === 'right' && !data.insideLegend)
    ? measureLegendWidth(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5, options)
    : 0;

  // 축 이름을 세로로 쌓으면 눈금 숫자 바깥에 한 글자 폭이 더 필요하다
  let nameW = 0;
  if (data.tempAxisName || data.precipAxisName) {
    ctx.save();
    ctx.font = getFont(options.fontSize.axisLabel, options, 'bold');
    nameW = ctx.measureText('가').width + 12;
    ctx.restore();
  }

  const padRight = 130 + legendW + (data.precipAxisName ? nameW : 0);
  const padLeft = 130 + (data.tempAxisName ? nameW : 0);
  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom' && !data.insideLegend)
    ? measureBottomLegend(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5,
        w - padLeft - padRight, options, ['rect', data.monthInterval === 12 ? 'line' : 'circle'])
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: padRight,
    bottom: (() => {
      let b = 60;
      // 플롯 안에 범례를 그릴 때는 아래에 자리를 비워 둘 이유가 없다
      if (showLegend && legendPos === 'bottom' && !data.insideLegend) b += 60;
      b = Math.max(b, legendReserve);
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
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
  const tempTickW = drawDeviationYAxis(ctx, padding, w, h, tempAxis, 'left', data.tempLabel, options, options.fontSize);
  const precipTickW = drawDeviationYAxis(ctx, padding, w, h, precipAxis, 'right', data.precipLabel, options, options.fontSize);

  // X축
  const totalSlots = indices.length;
  const slotW = plotW / totalSlots;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();

  // 위쪽까지 이어 사각 테두리로 감싼다 (좌·우·아래 선은 이미 그려졌다)
  if (data.showFrame) {
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX + plotW, plotY);
    ctx.stroke();
  }

  ctx.fillStyle = '#000';
  ctx.font = getFont(options.fontSize.tick, options, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let s = 0; s < totalSlots; s++) {
    const cx = plotX + slotW * s + slotW / 2;
    ctx.fillText(MONTH_LABELS[indices[s]], cx, plotY + plotH + 12);
  }

  // 기준선 (0선)
  const zeroYPrecip = plotY + plotH - ((0 - precipAxis.min) / (precipAxis.max - precipAxis.min)) * plotH;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
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

    ctx.fillStyle = data.barFill ?? (val >= 0 ? '#666' : '#CCC');
    const barTop = Math.min(zeroYPrecip, valY);
    const barH = Math.abs(valY - zeroYPrecip);
    ctx.fillRect(bx, barTop, barWidth, barH);
    ctx.strokeStyle = data.barStroke ?? '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, barTop, barWidth, barH);
    inkRects.push({ x0: bx, y0: barTop, x1: bx + barWidth, y1: barTop + barH });
  }

  // 기온 편차 꺾은선 (12개월일 때만)
  if (data.monthInterval === 12) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
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
    if (data.markerShape === 'square') {
      ctx.fillRect(cx - 5, y - 5, 10, 10);
    } else {
      ctx.beginPath();
      ctx.arc(cx, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    inkRects.push({ x0: cx - 6, y0: y - 6, x1: cx + 6, y1: y + 6 });
  }

  // (월) 라벨
  ctx.fillStyle = '#000';
  ctx.font = getFont(options.fontSize.tick, options, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('(월)', plotX + plotW + 30, plotY + plotH + 12);

  // 범례

  if (showLegend && data.insideLegend) {
    // 시험지는 기온(선)을 위, 강수량(막대)을 아래로 적는다 — 바깥 범례와 순서가 반대다
    drawInsideLegend({
      ctx,
      items: [
        {
          type: data.monthInterval === 12 ? 'line' : 'circle',
          fillStyle: '#000',
          marker: data.markerShape ?? 'circle',
          label: legendLabels[1],
        },
        {
          type: 'rect',
          fillStyle: data.barFill ?? '#888',
          strokeStyle: data.barStroke ?? '#444',
          label: legendLabels[0],
        },
      ],
      corner: data.insideLegend,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: options.fontSize.dataLabel * 0.9,
      font: getFont(options.fontSize.dataLabel * 0.9, options, 'bold'),
      avoid: inkRects,
    });
  } else if (showLegend) {
    drawLegend({
      ctx, fonts: options,
      items: [
        { type: 'rect', fillStyle: '#888', strokeStyle: '#444', label: legendLabels[0] },
        { type: data.monthInterval === 12 ? 'line' : 'circle', fillStyle: '#000', label: legendLabels[1] },
      ],
      position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: options.fontSize.dataLabel * 0.85 + 5,
      rightGap: 80,
    });
  }

  // 축 이름 — 눈금 숫자 바깥에 한 글자씩 세로로 쌓는다
  if (data.tempAxisName) {
    drawVerticalAxisName(ctx, data.tempAxisName, plotX - 22 - tempTickW - nameW / 2, plotY, plotH, h,
      options.fontSize.axisLabel, options);
  }
  if (data.precipAxisName) {
    drawVerticalAxisName(ctx, data.precipAxisName, plotX + plotW + 22 + precipTickW + nameW / 2, plotY, plotH, h,
      options.fontSize.axisLabel, options);
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
  fonts: FontOptions,
  fontSize: { tick: number; axisLabel: number }
): number {
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

  let maxTickW = 0;
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
    maxTickW = Math.max(maxTickW, ctx.measureText(valStr).width);
  }

  // 단위 표기는 플롯 **위 여백**에 떠 있다 — 캔버스를 벗어나면 플롯을 줄이는
  // 대신 안으로 민다 (「평년 대비 기온 차이(°C)」가 좌우로 129.5px 넘던 자리).
  if (label) {
    ctx.save();
    const makeFont = (size: number) => getFont(size, fonts, 'bold');
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = side === 'left' ? 'right' : 'left';
    ctx.font = makeFont(shrinkToWidth(ctx, [label], fontSize.axisLabel, width - EDGE * 2, makeFont));
    const labelX = side === 'left' ? x - 12 : x + 12;
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
  fonts: FontOptions,
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
  ctx.font = getFont(size, fonts, 'bold');
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
