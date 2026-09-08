// © 2026 김용현
import { type RadarGraphData, type GraphOptions } from '../types/index';
import { clearCanvas, getFont } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';

// 계열별 선 스타일
const LINE_STYLES: { dash: number[]; width: number }[] = [
  { dash: [], width: 2 },
  { dash: [8, 4], width: 2 },
  { dash: [2, 3], width: 2 },
  { dash: [8, 3, 2, 3], width: 2 },
  { dash: [12, 4, 2, 4, 2, 4], width: 2 },
];

const GRAY_SHADES = ['#000', '#444', '#777', '#AAA', '#CCC'];

export function renderRadarChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: RadarGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const font = options.fontFamily;
  const cf = options.customFont;
  const fs = options.fontSize;
  const n = data.axisLabels.length;
  if (n < 3) return;

  const showLegend = options.showLegend && data.series.length > 1;
  const legendPos = options.legendPosition;
  const legendLabels = data.series.map((s) => s.label);
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, legendLabels, fs.dataLabel * 0.85 + 5, 'line')
    : 0;

  const topPad = options.title ? 60 : 10;
  const rightPad = 60 + legendW;
  const leftPad = 60;
  let bottomPad = 10;
  if (showLegend && legendPos === 'bottom') {
    bottomPad += 70;
    // 상수 70 은 한 줄짜리 상자(높이 55.7)에도 모자랐다 — 실제 높이를 재서 잡는다
    bottomPad = Math.max(bottomPad, measureBottomLegend(
      ctx, legendLabels, fs.dataLabel * 0.85 + 5, w - leftPad - rightPad, 'line', 30));
  }
  if (options.source) bottomPad += 25;
  bottomPad += options.footnotes.filter(f => f.trim()).length * 22;

  const availW = w - leftPad - rightPad;
  const availH = h - topPad - bottomPad;
  const radius = Math.min(availW, availH) / 2 - 40;
  const cx = leftPad + availW / 2;
  const cy = topPad + availH / 2;

  // 최대값
  const allValues = data.series.flatMap((s) => s.values);
  const dataMax = allValues.length > 0 ? Math.max(...allValues, 1) : 100;
  const maxVal = data.autoMax ? Math.ceil(dataMax / data.gridSteps) * data.gridSteps : data.maxValue;

  // 각 축의 각도 (12시 방향부터 시계 방향)
  const angles = Array.from({ length: n }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / n);

  const toXY = (angle: number, r: number): [number, number] => [
    cx + Math.cos(angle) * r,
    cy + Math.sin(angle) * r,
  ];

  // 동심 다각형 격자
  ctx.save();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.8;
  for (let step = 1; step <= data.gridSteps; step++) {
    const r = (step / data.gridSteps) * radius;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [px, py] = toXY(angles[i % n], r);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 축 선
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const [px, py] = toXY(angles[i], radius);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  // 눈금값
  ctx.fillStyle = '#888';
  ctx.font = getFont(fs.tick * 0.8, font, cf, 'normal');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let step = 1; step <= data.gridSteps; step++) {
    const val = (maxVal / data.gridSteps) * step;
    const r = (step / data.gridSteps) * radius;
    ctx.fillText(formatTick(val), cx + 4, cy - r - 2);
  }

  // 축 라벨
  ctx.fillStyle = '#000';
  ctx.font = getFont(fs.axisLabel * 0.85, font, cf, 'bold');
  for (let i = 0; i < n; i++) {
    const [px, py] = toXY(angles[i], radius + 20);
    const angle = angles[i];

    // 텍스트 정렬
    if (Math.abs(Math.cos(angle)) < 0.1) {
      ctx.textAlign = 'center';
    } else if (Math.cos(angle) > 0) {
      ctx.textAlign = 'left';
    } else {
      ctx.textAlign = 'right';
    }

    if (Math.abs(Math.sin(angle)) < 0.1) {
      ctx.textBaseline = 'middle';
    } else if (Math.sin(angle) > 0) {
      ctx.textBaseline = 'top';
    } else {
      ctx.textBaseline = 'bottom';
    }

    ctx.fillText(data.axisLabels[i], px, py);
  }

  // 계열별 포인트 좌표 사전 계산
  const allPts = data.series.map((series) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const val = series.values[i] || 0;
      const r = (val / maxVal) * radius;
      pts.push(toXY(angles[i], r));
    }
    return pts;
  });

  // 1단계: 채움 먼저 전부 그리기
  if (data.showFill) {
    for (let si = 0; si < data.series.length; si++) {
      const color = GRAY_SHADES[si % GRAY_SHADES.length];
      const pts = allPts[si];
      const r = parseInt(color.slice(1, 2), 16) * 17;
      const g = parseInt(color.slice(2, 3), 16) * 17;
      const b = parseInt(color.slice(3, 4), 16) * 17;
      ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const [px, py] = pts[i % n];
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.fill();
    }
  }

  // 2단계: 선과 포인트를 채움 위에 그리기
  for (let si = 0; si < data.series.length; si++) {
    const style = LINE_STYLES[si % LINE_STYLES.length];
    const color = GRAY_SHADES[si % GRAY_SHADES.length];
    const pts = allPts[si];

    // 다각형 선
    ctx.strokeStyle = color;
    ctx.lineWidth = style.width;
    ctx.setLineDash(style.dash);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [px, py] = pts[i % n];
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 데이터 포인트
    for (let i = 0; i < n; i++) {
      const [px, py] = pts[i];
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 범례
  if (showLegend) {
    const plotX = leftPad;
    const plotY = topPad;
    const plotW = availW;
    const plotH = availH;

    const items = data.series.map((s, i) => {
      const style = LINE_STYLES[i % LINE_STYLES.length];
      return {
        type: 'line' as const,
        fillStyle: GRAY_SHADES[i % GRAY_SHADES.length],
        label: s.label,
        dash: style.dash,
        lineWidth: style.width,
      };
    });
    drawLegend({
      ctx, items, position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: fs.dataLabel * 0.85 + 5,
      bottomOffset: 30,
    });
  }

  const plotX = leftPad;
  const plotW = availW;
  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: fs.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: fs.dataLabel, canvasWidth: w });
}

function formatTick(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
}
