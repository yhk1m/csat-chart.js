// © 2026 김용현
import {
  type HythergraphData,
  type GraphOptions,
  MONTH_LABELS_NUM,
  MONTH_LABELS_EN,
} from '../types/index';
import { type Padding, clearCanvas, autoRange, textFont, textSize } from '../canvas/renderer';
import { textCtx } from '../canvas/parens';
import { LabelPlacer, drawTitle, drawSourceAndFootnote, sourceFootnoteReserve } from '../canvas/labels';
import { EDGE, drawFloatingLabel } from '../canvas/fit';
import { measureLegendWidth, layoutBottomLegend, legendSideOf } from '../canvas/legend';
import { styleOf, byStyle, tickDirOf } from '../canvas/style';
import { xTickLabelAt, yTickLabelAt } from '../canvas/axes';

// 계열별 점선 (classic) — 굵기는 t.line.series
const LINE_DASHES: number[][] = [
  [],                    // 실선
  [8, 4],                // 파선
  [2, 3],                // 점선
  [8, 3, 2, 3],          // 일점쇄선
  [12, 4, 2, 4, 2, 4],   // 이점쇄선
];

// 기호: ● ■ ▲ ○ □
type MarkerType = 'filledCircle' | 'filledSquare' | 'filledTriangle' | 'openCircle' | 'openSquare';
const MARKERS: MarkerType[] = ['filledCircle', 'filledSquare', 'filledTriangle', 'openCircle', 'openSquare'];

/** 시험지 일점쇄선(짧은) 5.0/0.84/1.0/0.84pt — 다섯째 계열 */
const EXAM_DASHDOT_SHORT = [24.3, 4.1, 4.9, 4.1];
const LOOK = {
  classic: { tickW: 1, markerR: 5, haloR: 7, iconGap: 8, closedFrame: false },
  // 꺾은선 기호(§3 #32)·눈금(#24). haloR ≈ — 기호 + 2px (하이서그래프 표본 없음)
  exam: { tickW: 1.9, markerR: 6.8, haloR: 8.8, iconGap: 14, closedFrame: true },
};

function drawMarker(
  ctx: CanvasRenderingContext2D, type: MarkerType, cx: number, cy: number, size: number, stroke: number,
) {
  const s = size;
  ctx.lineWidth = stroke;
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

function drawMarkerLegendIcon(
  ctx: CanvasRenderingContext2D, type: MarkerType, cx: number, cy: number, r: number, stroke: number,
) {
  drawMarker(ctx, type, cx, cy, r, stroke);
}

export function renderHythergraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: HythergraphData,
  options: GraphOptions
) {
  // exam 은 괄호를 명조로 따로 찍는다 — 이 아래 모든 글자 그리기·재기가 이 ctx 를 거친다
  ctx = textCtx(ctx, options);
  clearCanvas(ctx, w, h);
  const t = styleOf(options);
  const look = byStyle(options, LOOK);

  const fs = options.fontSize;
  const dashes = byStyle(options, {
    classic: LINE_DASHES,
    exam: [t.seriesDash.solid, t.seriesDash.dashed, t.seriesDash.dotted, t.seriesDash.dashdot, EXAM_DASHDOT_SHORT],
  });
  const lfSize = textSize(options, 'legend', fs.dataLabel * 0.85 + 5);
  const showLegend = options.showLegend && data.series.length > 0;
  const legendPos = legendSideOf(options);
  const legendLabels = data.series.map((s) => s.label);
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, legendLabels, lfSize, options)
    : 0;

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

  // 세로축 숫자 열 — exam 은 숫자를 축에서 더 띄우고 글자도 커서 80 으로는 모자란다
  ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick));
  const yTicksW = Math.max(...[yMin, yMax, yMin + yStep].map((v) => ctx.measureText(formatTick(v)).width));
  const padLeft = byStyle(options, { classic: 80, exam: Math.max(80, yTicksW + t.line.axis / 2 + (t.tickText?.yGap ?? 0) + EDGE) });

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다.
  // 아이콘 너비·간격은 아래 범례 그리기와 같은 값을 써야 한다.
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? 65 + layoutBottomLegend(ctx, legendLabels, data.series.map(() => t.legend.lineIcon),
        lfSize, w - padLeft - (80 + legendW), options, { iconGap: look.iconGap }).boxH + 2
    : 0;

  const padding: Padding = {
    top: options.title ? 110 : 60,
    right: 80 + legendW,
    bottom: (() => {
      let b = 90;
      if (showLegend && legendPos === 'bottom') b += 80;
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

  const toX = (v: number) => plotX + ((v - xMin) / (xMax - xMin)) * plotW;
  const toY = (v: number) => plotY + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // 격자선
  ctx.save();
  ctx.strokeStyle = t.line.barGridColor;
  ctx.lineWidth = t.line.barGrid;
  ctx.setLineDash(t.line.barGridDash);
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
  ctx.lineWidth = t.line.axis;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  // 시험지는 산점도처럼 닫힌 틀
  if (look.closedFrame) {
    ctx.lineTo(plotX + plotW, plotY);
    ctx.closePath();
  }
  ctx.stroke();

  // 눈금 방향 — 시험지는 두 축 모두 안쪽
  const dir = tickDirOf(options, { x: 'in', y: 'in' });
  const L = t.line.tickLen;

  // X축 눈금 — 마지막 눈금은 단위와 겹치므로 스킵
  ctx.fillStyle = '#000';
  ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = xMin; v <= xMax + xStep * 0.01; v += xStep) {
    const x = toX(v);
    if (dir.x !== 'none') {
      ctx.lineWidth = look.tickW;
      ctx.beginPath();
      ctx.moveTo(x, plotY + plotH);
      ctx.lineTo(x, plotY + plotH + (dir.x === 'in' ? -L : L));
      ctx.stroke();
    }
    const isLast = v + xStep > xMax + xStep * 0.01;
    if (!(isLast && data.xUnit)) {
      const at = xTickLabelAt(ctx, options, plotY + plotH, dir.x);
      if (at) {
        ctx.textBaseline = at.baseline;
        ctx.fillText(formatTick(v), x, at.y);
        ctx.textBaseline = 'top';
      } else {
        ctx.fillText(formatTick(v), x, plotY + plotH + (dir.x === 'out' ? L : 0) + 4);
      }
    }
  }

  // Y축 눈금 — 최상단 눈금은 단위와 겹치므로 스킵
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = yMin; v <= yMax + yStep * 0.01; v += yStep) {
    const y = toY(v);
    if (dir.y !== 'none') {
      ctx.lineWidth = look.tickW;
      ctx.beginPath();
      if (dir.y === 'in') { ctx.moveTo(plotX, y); ctx.lineTo(plotX + L, y); }
      else { ctx.moveTo(plotX - L, y); ctx.lineTo(plotX, y); }
      ctx.stroke();
    }
    const isLast = v + yStep > yMax + yStep * 0.01;
    if (!(isLast && data.yUnit)) {
      const at = yTickLabelAt(ctx, options, plotX, 'left', dir.y, y, plotY + plotH);
      if (at) {
        ctx.textBaseline = at.baseline;
        ctx.fillText(formatTick(v), at.x, at.y);
        ctx.textBaseline = 'middle';
      } else {
        ctx.fillText(formatTick(v), plotX - (dir.y === 'out' ? L : 0) - 4, y);
      }
    }
  }

  // 축 단위 — X축 우측 끝, Y축 상단 끝
  const unitSize = textSize(options, 'unit', fs.axisLabel);
  ctx.font = textFont(options, 'unit', unitSize);
  ctx.fillStyle = '#000';
  // 단위는 플롯 **바깥 여백**에 떠 있다 — 캔버스를 벗어나면 안으로 민다.
  // 왼쪽 여백이 좁은 편이라 대체 글꼴이 조금만 넓어도 「(mm)」 이 밖으로 나갔다.
  const unitFont = (size: number) => textFont(options, 'unit', size);
  if (data.xUnit) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    drawFloatingLabel(ctx, data.xUnit, plotX + plotW + 10, plotY + plotH + 35, w, h, unitSize, unitFont);
  }
  if (data.yUnit) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    drawFloatingLabel(ctx, data.yUnit, plotX, plotY - 16, w, h, unitSize, unitFont);
  }

  // 계열별 렌더링
  const mLabels = data.monthLabelStyle === 'english' ? MONTH_LABELS_EN : MONTH_LABELS_NUM;
  const showLoop = data.mode === 'loop' || data.mode === 'both';
  const showPts = data.mode === 'points' || data.mode === 'both';

  // exam 은 글자가 커서(8.2pt) 붙은 달끼리 숫자가 겹친다 — 자리 찾기(LabelPlacer)로 놓는다
  const spreadMonths = showPts && byStyle(options, { classic: false, exam: true });

  for (let si = 0; si < data.series.length; si++) {
    const series = data.series[si];
    const pts = series.months.map((m) => ({ cx: toX(m.temp), cy: toY(m.precip) }));

    // 루프 선
    if (showLoop && pts.length === 12) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = t.line.series;
      ctx.setLineDash(dashes[si % dashes.length]);
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
        ctx.arc(cx, cy, look.haloR, 0, Math.PI * 2);
        ctx.fill();

        // 기호
        drawMarker(ctx, marker, cx, cy, look.markerR, t.marker.stroke);

        // 월 라벨 (모든 계열에 표시) — exam 은 기호를 다 그린 뒤 겹치지 않게 따로 놓는다
        if (!spreadMonths) {
          ctx.fillStyle = '#000';
          ctx.font = textFont(options, 'value', textSize(options, 'value', fs.dataLabel));
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(mLabels[i], cx + look.markerR + 4, cy - look.markerR);
        }
      }
    }
  }

  if (spreadMonths) {
    const placer = new LabelPlacer(t.leader);
    const size = textSize(options, 'value', fs.dataLabel);
    const all = data.series.map((sr) => sr.months.map((m) => ({ cx: toX(m.temp), cy: toY(m.precip) })));
    for (const pts of all) for (const p of pts) placer.reserveCircle(p.cx, p.cy, look.markerR + 1);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.font = textFont(options, 'value', size);
    const bounds = { left: plotX + 2, right: plotX + plotW - 2, top: plotY + 2, bottom: plotY + plotH - 2 };
    for (const pts of all) {
      pts.forEach((p, i) => placer.place(ctx, mLabels[i], p.cx, p.cy,
        { gap: look.markerR + 3, lineHeight: size * 0.8, bounds }));
    }
    ctx.restore();
  }

  // 범례 (기호 + 선 스타일)
  if (showLegend) {
    // 범례는 고딕 자리다 — 다른 종류처럼 옵션에서 푼다(글꼴을 여기 박아 두면 못 바꾼다)
    ctx.save();
    ctx.font = textFont(options, 'legend', lfSize);

    const iconW = t.legend.lineIcon; // 선 + 기호 공간
    const iconGap = look.iconGap;
    const pad = t.legend.pad;
    const lineH = lfSize + 8;
    const n = data.series.length;

    const itemWidths = data.series.map((s) => iconW + iconGap + ctx.measureText(s.label).width);

    if (legendPos === 'bottom') {
      // 한 줄에 다 못 넣으면 줄을 늘린다 (이름은 자르지 않는다) — 바깥 범례와 같은 규칙
      const spacing = 30;
      const boxW = plotW;
      const layout = layoutBottomLegend(ctx, data.series.map((s) => s.label),
        data.series.map(() => iconW), lfSize, boxW, options, { iconGap, padding: pad, spacing });
      const boxH = layout.boxH;
      const boxX = plotX;
      const boxY = Math.max(0, Math.min(plotY + plotH + 65, h - boxH - 1));

      ctx.strokeStyle = t.legend.boxColor;
      ctx.lineWidth = t.legend.boxLine;
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
          // 선
          ctx.strokeStyle = '#000';
          ctx.lineWidth = t.line.series;
          ctx.setLineDash(dashes[i % dashes.length]);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + iconW, cy);
          ctx.stroke();
          ctx.setLineDash([]);
          // 기호
          drawMarkerLegendIcon(ctx, MARKERS[i % MARKERS.length], cx + iconW / 2, cy, look.markerR, t.marker.stroke);
          // 라벨
          ctx.font = textFont(options, 'legend', layout.fontSize);
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

      ctx.strokeStyle = t.legend.boxColor;
      ctx.lineWidth = t.legend.boxLine;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 0);
      ctx.fill();
      ctx.stroke();

      let cy = boxY + pad + lineH / 2;
      for (let i = 0; i < n; i++) {
        const ix = boxX + pad;
        // 선
        ctx.strokeStyle = '#000';
        ctx.lineWidth = t.line.series;
        ctx.setLineDash(dashes[i % dashes.length]);
        ctx.beginPath();
        ctx.moveTo(ix, cy);
        ctx.lineTo(ix + iconW, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        // 기호
        drawMarkerLegendIcon(ctx, MARKERS[i % MARKERS.length], ix + iconW / 2, cy, look.markerR, t.marker.stroke);
        // 라벨
        ctx.font = textFont(options, 'legend', lfSize);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.series[i].label, ix + iconW + iconGap, cy);
        cy += lineH + itemGap;
      }
    }
    ctx.restore();
  }

  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: fs.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: fs.dataLabel, canvasWidth: w });
}

function formatTick(v: number): string {
  return Math.abs(v) < 0.0001 ? '0' : Number(v.toFixed(2)).toString();
}
