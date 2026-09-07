// © 2026 김용현
// 모드 A — 월별 편차 (시계열)
import { type DeviationAData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, autoRange, getFont } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawLegend, drawInsideLegend, measureLegendWidth } from '../canvas/legend';

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
    ? measureLegendWidth(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5)
    : 0;

  // 축 이름을 세로로 쌓으면 눈금 숫자 바깥에 한 글자 폭이 더 필요하다
  let nameW = 0;
  if (data.tempAxisName || data.precipAxisName) {
    ctx.save();
    ctx.font = getFont(options.fontSize.axisLabel, options.fontFamily, options.customFont, 'bold');
    nameW = ctx.measureText('가').width + 12;
    ctx.restore();
  }

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: 130 + legendW + (data.precipAxisName ? nameW : 0),
    bottom: (() => {
      let b = 60;
      // 플롯 안에 범례를 그릴 때는 아래에 자리를 비워 둘 이유가 없다
      if (showLegend && legendPos === 'bottom' && !data.insideLegend) b += 60;
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
      return b;
    })(),
    left: 130 + (data.tempAxisName ? nameW : 0),
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const font = options.fontFamily;
  const customFont = options.customFont;
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
  const tempTickW = drawDeviationYAxis(ctx, padding, w, h, tempAxis, 'left', data.tempLabel, font, customFont, options.fontSize);
  const precipTickW = drawDeviationYAxis(ctx, padding, w, h, precipAxis, 'right', data.precipLabel, font, customFont, options.fontSize);

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
  ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
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
  const barWidth = slotW * 0.55;
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
  ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
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
      fontSize: options.fontSize.dataLabel * 0.9,
      font: getFont(options.fontSize.dataLabel * 0.9, font, customFont, 'bold'),
      avoid: inkRects,
    });
  } else if (showLegend) {
    drawLegend({
      ctx,
      items: [
        { type: 'rect', fillStyle: '#888', strokeStyle: '#444', label: legendLabels[0] },
        { type: data.monthInterval === 12 ? 'line' : 'circle', fillStyle: '#000', label: legendLabels[1] },
      ],
      position: legendPos,
      plotX, plotY, plotW, plotH,
      fontSize: options.fontSize.dataLabel * 0.85 + 5,
      rightGap: 80,
    });
  }

  // 축 이름 — 눈금 숫자 바깥에 한 글자씩 세로로 쌓는다
  if (data.tempAxisName) {
    drawVerticalAxisName(ctx, data.tempAxisName, plotX - 22 - tempTickW - nameW / 2, plotY, plotH,
      options.fontSize.axisLabel, font, customFont);
  }
  if (data.precipAxisName) {
    drawVerticalAxisName(ctx, data.precipAxisName, plotX + plotW + 22 + precipTickW + nameW / 2, plotY, plotH,
      options.fontSize.axisLabel, font, customFont);
  }

  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel, canvasWidth: w });
}

function drawDeviationYAxis(
  ctx: CanvasRenderingContext2D,
  padding: Padding,
  width: number,
  height: number,
  axis: { min: number; max: number; step: number },
  side: 'left' | 'right',
  label: string,
  fontFamily: 'serif' | 'sans' | 'custom',
  customFont: string | undefined,
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
  ctx.font = getFont(fontSize.tick, fontFamily, customFont, 'bold');
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

  ctx.save();
  ctx.font = getFont(fontSize.axisLabel, fontFamily, customFont, 'bold');
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'bottom';
  const labelX = side === 'left' ? x - 12 : x + 12;
  ctx.textAlign = side === 'left' ? 'right' : 'left';
  ctx.fillText(label, labelX, plotY - 16);
  ctx.restore();

  return maxTickW;
}

/** 축 이름을 한 글자씩 세로로 쌓아 그린다 (플롯 세로 가운데 정렬) */
function drawVerticalAxisName(
  ctx: CanvasRenderingContext2D,
  name: string,
  cx: number,
  plotY: number,
  plotH: number,
  fontSize: number,
  fontFamily: 'serif' | 'sans' | 'custom',
  customFont: string | undefined
) {
  const chars = [...name].filter((c) => c.trim() !== '');
  if (chars.length === 0) return;

  ctx.save();
  ctx.font = getFont(fontSize, fontFamily, customFont, 'bold');
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineH = fontSize * 1.15;
  let y = plotY + plotH / 2 - ((chars.length - 1) * lineH) / 2;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    y += lineH;
  }
  ctx.restore();
}
