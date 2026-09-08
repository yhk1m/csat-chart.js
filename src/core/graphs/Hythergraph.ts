// © 2026 김용현
import {
  type HythergraphData,
  type GraphOptions,
  MONTH_LABELS_NUM,
  MONTH_LABELS_EN,
} from '../types/index';
import { type Padding, clearCanvas, getFont, autoRange } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawFloatingLabel } from '../canvas/fit';
import { measureLegendWidth, layoutBottomLegend } from '../canvas/legend';

// 계열별 선 스타일
const LINE_STYLES: { dash: number[]; width: number }[] = [
  { dash: [], width: 2 },           // 실선
  { dash: [8, 4], width: 2 },       // 파선
  { dash: [2, 3], width: 2 },       // 점선
  { dash: [8, 3, 2, 3], width: 2 }, // 일점쇄선
  { dash: [12, 4, 2, 4, 2, 4], width: 2 }, // 이점쇄선
];

// 기호: ● ■ ▲ ○ □
type MarkerType = 'filledCircle' | 'filledSquare' | 'filledTriangle' | 'openCircle' | 'openSquare';
const MARKERS: MarkerType[] = ['filledCircle', 'filledSquare', 'filledTriangle', 'openCircle', 'openSquare'];

function drawMarker(ctx: CanvasRenderingContext2D, type: MarkerType, cx: number, cy: number, size: number) {
  const s = size;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';

  switch (type) {
    case 'filledCircle':
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'filledSquare':
      ctx.fillStyle = '#000';
      ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
      break;
    case 'filledTriangle':
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 1.1);
      ctx.lineTo(cx - s, cy + s * 0.7);
      ctx.lineTo(cx + s, cy + s * 0.7);
      ctx.closePath();
      ctx.fill();
      break;
    case 'openCircle':
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'openSquare':
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
      ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
      break;
  }
}

function drawMarkerLegendIcon(ctx: CanvasRenderingContext2D, type: MarkerType, cx: number, cy: number) {
  drawMarker(ctx, type, cx, cy, 5);
}

export function renderHythergraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: HythergraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const font = options.fontFamily;
  const cf = options.customFont;
  const fs = options.fontSize;
  const showLegend = options.showLegend && data.series.length > 0;
  const legendPos = options.legendPosition;
  const legendLabels = data.series.map((s) => s.label);
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, legendLabels, fs.dataLabel * 0.85 + 5)
    : 0;

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다.
  // 아이콘 너비·간격은 아래 범례 그리기와 같은 값을 써야 한다.
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? 65 + layoutBottomLegend(ctx, legendLabels, data.series.map(() => 36),
        fs.dataLabel * 0.85 + 5, w - 80 - (80 + legendW), { iconGap: 8 }).boxH + 2
    : 0;

  const padding: Padding = {
    top: options.title ? 110 : 60,
    right: 80 + legendW,
    bottom: (() => {
      let b = 90;
      if (showLegend && legendPos === 'bottom') b += 80;
      b = Math.max(b, legendReserve);
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
      return b;
    })(),
    left: 80,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  // 모든 계열의 데이터로 축 범위 계산
  const allTemps = data.series.flatMap((s) => s.months.map((m) => m.temp));
  const allPrecips = data.series.flatMap((s) => s.months.map((m) => m.precip));
  const xAuto = autoRange(allTemps);
  const yAuto = autoRange(allPrecips);
  const xMin = data.xRange.auto ? xAuto.min : data.xRange.min;
  const xMax = data.xRange.auto ? xAuto.max : data.xRange.max;
  const yMin = data.yRange.auto ? yAuto.min : data.yRange.min;
  const yMax = data.yRange.auto ? yAuto.max : data.yRange.max;
  const xStep = data.xRange.auto ? xAuto.step : (xMax - xMin) / 5;
  const yStep = data.yRange.auto ? yAuto.step : (yMax - yMin) / 5;

  const toX = (v: number) => plotX + ((v - xMin) / (xMax - xMin)) * plotW;
  const toY = (v: number) => plotY + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // 격자선
  ctx.save();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  for (let v = xMin + xStep; v < xMax; v += xStep) {
    const x = toX(v);
    ctx.beginPath();
    ctx.moveTo(x, plotY);
    ctx.lineTo(x, plotY + plotH);
    ctx.stroke();
  }
  for (let v = yMin + yStep; v < yMax; v += yStep) {
    const y = toY(v);
    ctx.beginPath();
    ctx.moveTo(plotX, y);
    ctx.lineTo(plotX + plotW, y);
    ctx.stroke();
  }
  ctx.restore();

  // 축선
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();

  // X축 눈금 — 마지막 눈금은 단위와 겹치므로 스킵
  ctx.fillStyle = '#000';
  ctx.font = getFont(fs.tick, font, cf, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = xMin; v <= xMax + xStep * 0.01; v += xStep) {
    const x = toX(v);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plotY + plotH);
    ctx.lineTo(x, plotY + plotH + 6);
    ctx.stroke();
    const isLast = v + xStep > xMax + xStep * 0.01;
    if (!(isLast && data.xUnit)) {
      ctx.fillText(formatTick(v), x, plotY + plotH + 10);
    }
  }

  // Y축 눈금 — 최상단 눈금은 단위와 겹치므로 스킵
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = yMin; v <= yMax + yStep * 0.01; v += yStep) {
    const y = toY(v);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX - 6, y);
    ctx.lineTo(plotX, y);
    ctx.stroke();
    const isLast = v + yStep > yMax + yStep * 0.01;
    if (!(isLast && data.yUnit)) {
      ctx.fillText(formatTick(v), plotX - 10, y);
    }
  }

  // 축 단위 — X축 우측 끝, Y축 상단 끝
  ctx.font = getFont(fs.axisLabel, font, cf, 'bold');
  ctx.fillStyle = '#000';
  // 단위는 플롯 **바깥 여백**에 떠 있다 — 캔버스를 벗어나면 안으로 민다.
  // 왼쪽 여백이 좁은 편이라 대체 글꼴이 조금만 넓어도 「(mm)」 이 밖으로 나갔다.
  const unitFont = (size: number) => getFont(size, font, cf, 'bold');
  if (data.xUnit) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    drawFloatingLabel(ctx, data.xUnit, plotX + plotW + 10, plotY + plotH + 35, w, h, fs.axisLabel, unitFont);
  }
  if (data.yUnit) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    drawFloatingLabel(ctx, data.yUnit, plotX, plotY - 16, w, h, fs.axisLabel, unitFont);
  }

  // 계열별 렌더링
  const mLabels = data.monthLabelStyle === 'english' ? MONTH_LABELS_EN : MONTH_LABELS_NUM;
  const showLoop = data.mode === 'loop' || data.mode === 'both';
  const showPts = data.mode === 'points' || data.mode === 'both';

  for (let si = 0; si < data.series.length; si++) {
    const series = data.series[si];
    const style = LINE_STYLES[si % LINE_STYLES.length];
    const pts = series.months.map((m) => ({ cx: toX(m.temp), cy: toY(m.precip) }));

    // 루프 선
    if (showLoop && pts.length === 12) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = style.width;
      ctx.setLineDash(style.dash);
      ctx.beginPath();
      ctx.moveTo(pts[0].cx, pts[0].cy);
      for (let i = 1; i < 12; i++) {
        ctx.lineTo(pts[i].cx, pts[i].cy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 포인트 + 월 라벨
    if (showPts) {
      const marker = MARKERS[si % MARKERS.length];
      for (let i = 0; i < 12; i++) {
        const { cx, cy } = pts[i];

        // 흰색 배경으로 선 가리기
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();

        // 기호
        drawMarker(ctx, marker, cx, cy, 5);

        // 월 라벨 (모든 계열에 표시)
        {
          ctx.fillStyle = '#000';
          ctx.font = getFont(fs.dataLabel, font, cf, 'bold');
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(mLabels[i], cx + 9, cy - 5);
        }
      }
    }
  }

  // 범례 (기호 + 선 스타일)
  if (showLegend) {
    const lfSize = fs.dataLabel * 0.85 + 5;
    const LEGEND_FONT = "'Noto Sans KR', sans-serif";
    ctx.save();
    ctx.font = `bold ${lfSize}px ${LEGEND_FONT}`;

    const iconW = 36; // 선 + 기호 공간
    const iconGap = 8;
    const pad = 12;
    const lineH = lfSize + 8;
    const n = data.series.length;

    const itemWidths = data.series.map((s) => iconW + iconGap + ctx.measureText(s.label).width);

    if (legendPos === 'bottom') {
      // 한 줄에 다 못 넣으면 줄을 늘린다 (이름은 자르지 않는다) — 바깥 범례와 같은 규칙
      const spacing = 30;
      const boxW = plotW;
      const layout = layoutBottomLegend(ctx, data.series.map((s) => s.label),
        data.series.map(() => iconW), lfSize, boxW, { iconGap, padding: pad, spacing });
      const boxH = layout.boxH;
      const boxX = plotX;
      const boxY = Math.max(0, Math.min(plotY + plotH + 65, h - boxH - 1));

      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 0);
      ctx.fill();
      ctx.stroke();

      for (let r = 0; r < layout.rows.length; r++) {
        const row = layout.rows[r];
        const rowW = row.reduce((a, it) => a + it.width, 0) + spacing * (row.length - 1);
        let cx = boxX + (boxW - rowW) / 2;
        const cy = boxY + pad + r * (layout.lineHeight + layout.rowGap) + layout.lineHeight / 2;
        for (const { index: i, width } of row) {
          const style = LINE_STYLES[i % LINE_STYLES.length];
          // 선
          ctx.strokeStyle = '#000';
          ctx.lineWidth = style.width;
          ctx.setLineDash(style.dash);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + iconW, cy);
          ctx.stroke();
          ctx.setLineDash([]);
          // 기호
          drawMarkerLegendIcon(ctx, MARKERS[i % MARKERS.length], cx + iconW / 2, cy);
          // 라벨
          ctx.font = `bold ${layout.fontSize}px ${LEGEND_FONT}`;
          ctx.fillStyle = '#000';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(data.series[i].label, cx + iconW + iconGap, cy);
          cx += width + spacing;
        }
      }
    } else {
      const itemGap = 10;
      const maxItemW = Math.max(...itemWidths);
      const boxW = maxItemW + pad * 2;
      const boxH = lineH * n + itemGap * (n - 1) + pad * 2;
      const boxX = Math.max(0, Math.min(plotX + plotW + 20, w - boxW - 1));
      const boxY = Math.max(0, Math.min(plotY + plotH - boxH, h - boxH - 1));

      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 0);
      ctx.fill();
      ctx.stroke();

      let cy = boxY + pad + lineH / 2;
      for (let i = 0; i < n; i++) {
        const ix = boxX + pad;
        const style = LINE_STYLES[i % LINE_STYLES.length];
        // 선
        ctx.strokeStyle = '#000';
        ctx.lineWidth = style.width;
        ctx.setLineDash(style.dash);
        ctx.beginPath();
        ctx.moveTo(ix, cy);
        ctx.lineTo(ix + iconW, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        // 기호
        drawMarkerLegendIcon(ctx, MARKERS[i % MARKERS.length], ix + iconW / 2, cy);
        // 라벨
        ctx.font = `bold ${lfSize}px ${LEGEND_FONT}`;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.series[i].label, ix + iconW + iconGap, cy);
        cy += lineH + itemGap;
      }
    }
    ctx.restore();
  }

  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: fs.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: fs.dataLabel, canvasWidth: w });
}

function formatTick(v: number): string {
  return Math.abs(v) < 0.0001 ? '0' : Number(v.toFixed(2)).toString();
}
