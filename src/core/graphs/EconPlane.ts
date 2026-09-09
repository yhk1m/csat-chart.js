// © 2026 김용현
// 경제 좌표평면 — 수능 경제 문항의 그림.
//
// 이 라이브러리의 첫 비지리 종류다. 지리 열여섯 종과 가장 크게 갈리는 곳은
// **범례가 없다**는 것이다. 실물 열세 장에 범례 상자가 한 번도 나오지 않는다 —
// 선은 제 끝에 이름을 달고 선다. 그래서 `showLegend`·`legendPosition`·
// `showDataLabels` 를 읽지 않는다. 대신 `fontStack` 두 자리는 나머지 열여섯 종과
// 똑같이 지킨다.
//
// 눈금 표시선(작은 선분)도 그리지 않는다. 시험지가 그렇다 — 격자나 유도선이
// 축까지 닿아 자리를 알려 주므로 표시선이 따로 없다.
import { type EconPlaneData, type EconAxis, type EconLabelPos, type GraphOptions } from '../types/index';
import { clearCanvas, getFont, type Padding } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawFloatingLabel, nudgeInside } from '../canvas/fit';

/** 축이 자료 칸 바깥으로 내미는 길이(px). 화살촉이 이 끝에 붙는다 */
const ARROW_EXT = 26;
/** 축선 굵기 */
const AXIS_W = 2.5;
/** 직선(수요·공급 따위) 굵기 */
const LINE_W = 3;
/** 유도선·격자 굵기 */
const GUIDE_W = 1.5;
/** 화살표 굵기 */
const ARROW_W = 2.5;
/** 점 반지름 */
const DOT_R = 6;
/** 화살촉 길이 */
const HEAD_LEN = 14;
/** 화살촉 반너비 */
const HEAD_HALF = 6;
/** 글자를 기준점에서 띄우는 거리 */
const LABEL_GAP = 13;

const DASH_PATTERN: Record<'dashed' | 'dotted', number[]> = {
  dashed: [7, 5],
  dotted: [1.5, 4],
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 눈금 숫자.
 *
 * 음수는 하이픈(`-`)이 아니라 **빼기 기호**(U+2212)로 적는다. 시험지가 그렇고,
 * 명조 글꼴에서 하이픈은 눈에 띄게 짧아 「−5」가 「-5」로 보이면 티가 난다.
 */
function formatTick(v: number): string {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}

/** 0 으로 나누지 않게 지킨 축 폭 */
function span(axis: EconAxis): number {
  const d = axis.max - axis.min;
  return Number.isFinite(d) && Math.abs(d) > 1e-9 ? d : 1;
}

interface Anchor {
  dx: number;
  dy: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
}

/** 나침반 여덟 방향을 그리기 좌표로 푼다 */
function anchorOf(pos: EconLabelPos, gap: number): Anchor {
  const d = gap * 0.75;
  switch (pos) {
    case 'left': return { dx: -gap, dy: 0, align: 'right', baseline: 'middle' };
    case 'top': return { dx: 0, dy: -gap, align: 'center', baseline: 'bottom' };
    case 'bottom': return { dx: 0, dy: gap, align: 'center', baseline: 'top' };
    case 'top-left': return { dx: -d, dy: -d, align: 'right', baseline: 'bottom' };
    case 'top-right': return { dx: d, dy: -d, align: 'left', baseline: 'bottom' };
    case 'bottom-left': return { dx: -d, dy: d, align: 'right', baseline: 'top' };
    case 'bottom-right': return { dx: d, dy: d, align: 'left', baseline: 'top' };
    default: return { dx: gap, dy: 0, align: 'left', baseline: 'middle' };
  }
}

/** 끝점 (x2, y2) 에 채운 삼각형 화살촉을 얹는다 */
function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (!(len > 0)) return;
  const ux = dx / len;
  const uy = dy / len;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * HEAD_LEN - uy * HEAD_HALF, y2 - uy * HEAD_LEN + ux * HEAD_HALF);
  ctx.lineTo(x2 - ux * HEAD_LEN + uy * HEAD_HALF, y2 - uy * HEAD_LEN - ux * HEAD_HALF);
  ctx.closePath();
  ctx.fill();
}

/**
 * 축 생략 기호 `≈`.
 *
 * 축선을 흰색으로 끊고 그 자리에 물결 둘을 겹쳐 놓는다. 끊지 않고 얹기만 하면
 * 축선이 물결 사이로 그대로 비쳐 「자른 자리」로 읽히지 않는다.
 *
 * @param vertical 세로축이면 참. 물결의 방향이 축과 직각이 되게 돌린다.
 */
function drawBreakMark(ctx: CanvasRenderingContext2D, x: number, y: number, vertical: boolean) {
  const half = 8;
  const gap = 7;
  ctx.save();
  ctx.translate(x, y);
  if (vertical) ctx.rotate(-Math.PI / 2);

  // 축선을 끊는다
  ctx.fillStyle = '#fff';
  ctx.fillRect(-half - 2, -gap, (half + 2) * 2, gap * 2);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.6;
  for (const dy of [-gap * 0.5, gap * 0.5]) {
    ctx.beginPath();
    ctx.moveTo(-half, dy + 2.5);
    ctx.quadraticCurveTo(-half / 2, dy - 4.5, 0, dy);
    ctx.quadraticCurveTo(half / 2, dy + 4.5, half, dy - 2.5);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderEconPlane(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: EconPlaneData,
  options: GraphOptions,
) {
  clearCanvas(ctx, w, h);

  const fs = options.fontSize;
  const four = data.quadrants === 'all';
  const nameFont = (size: number) => getFont(size, options);
  const tickFont = getFont(fs.tick, options);

  // ── 여백 — 글자를 먼저 재고 자리를 비운다 ─────────────────────────
  ctx.font = tickFont;
  const yTickW = data.yAxis.ticks.length > 0
    ? Math.max(...data.yAxis.ticks.map((v) => ctx.measureText(formatTick(v)).width))
    : 0;

  ctx.font = nameFont(fs.axisLabel);
  const xNameW = data.xAxis.label ? ctx.measureText(data.xAxis.label).width : 0;
  const yNameW = data.yAxis.label ? ctx.measureText(data.yAxis.label).width : 0;
  const lineLabelW = data.lines.length > 0
    ? Math.max(...data.lines.map((l) => (l.label ? ctx.measureText(l.label).width : 0)))
    : 0;

  const notes = options.footnotes.filter((f) => f.trim()).length;
  // `sourceInline` 이면 출처가 마지막 각주와 **같은 줄**에 붙어 줄이 늘지 않는다.
  // `sourceLeft` 를 주면 반대로 출처 줄이 각주 **아래**로 내려가 한 줄이 더 든다.
  const inlineSource = !!options.sourceInline && !!options.source
    && !options.sourceLeft && notes > 0;
  const hasSourceLine = (!!options.source || !!options.sourceLeft) && !inlineSource;
  const bottomText =
    (hasSourceLine ? fs.dataLabel + 6 : 0) +
    notes * (fs.dataLabel * 0.9 + 6) +
    12;

  const padding: Padding = {
    top: (options.title ? fs.title + 40 : 18) + fs.axisLabel + 10 + ARROW_EXT,
    // 세로축 이름은 축 **왼쪽 위**에 오른쪽 맞춤으로 선다(네 사분면이면 가운데).
    // 자리가 모자라면 글꼴을 줄이고 밀어 넣지만, 흔한 길이는 여기서 비워 둔다.
    // 34% 를 넘겨 비우지는 않는다 — 이름 하나 때문에 그림이 사라지면 안 된다.
    left: four
      ? Math.max(46, ARROW_EXT + 20)
      : Math.max(46, yTickW + 14, Math.min(yNameW + 8, w * 0.34)),
    right: Math.min(
      w * 0.45,
      Math.max(56, lineLabelW + 16, ARROW_EXT + 12 + xNameW + 6),
    ),
    bottom: fs.tick + 24 + bottomText,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = Math.max(40, w - padding.left - padding.right);
  const plotH = Math.max(40, h - padding.top - padding.bottom);

  const toX = (v: number) => plotX + ((v - data.xAxis.min) / span(data.xAxis)) * plotW;
  const toY = (v: number) => plotY + plotH - ((v - data.yAxis.min) / span(data.yAxis)) * plotH;

  // 축이 서는 자리. 1사분면이면 플롯의 왼쪽·아래 모서리, 네 사분면이면 값 0 자리다.
  const axX = four ? clamp(toX(0), plotX, plotX + plotW) : plotX;
  const axY = four ? clamp(toY(0), plotY, plotY + plotH) : plotY + plotH;

  const dash = DASH_PATTERN[data.dash] ?? DASH_PATTERN.dashed;

  // ── 격자 ─────────────────────────────────────────────────────────
  // 눈금 자리마다 점선을 깐다. 끝은 «반대 축의 마지막 눈금» 이다 — 시험지 격자는
  // 화살촉까지 가지 않고 자료 칸에서 닫힌 상자를 이룬다.
  if (data.grid) {
    const xEnd = data.xAxis.ticks.length > 0 ? toX(Math.max(...data.xAxis.ticks)) : plotX + plotW;
    const yEnd = data.yAxis.ticks.length > 0 ? toY(Math.max(...data.yAxis.ticks)) : plotY;
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = GUIDE_W;
    ctx.setLineDash(dash);
    for (const v of data.xAxis.ticks) {
      if (v === 0) continue;
      const x = toX(v);
      ctx.beginPath();
      ctx.moveTo(x, axY);
      ctx.lineTo(x, yEnd);
      ctx.stroke();
    }
    for (const v of data.yAxis.ticks) {
      if (v === 0) continue;
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(axX, y);
      ctx.lineTo(xEnd, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── 유도선 ───────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = GUIDE_W;
  ctx.setLineDash(dash);
  for (const p of data.points) {
    if (p.guide === 'none') continue;
    const px = toX(p.x);
    const py = toY(p.y);
    const cross = p.guide === 'cross';
    if (cross || p.guide === 'to-x' || p.guide === 'both') {
      ctx.beginPath();
      ctx.moveTo(px, cross ? plotY : py);
      ctx.lineTo(px, cross ? plotY + plotH : axY);
      ctx.stroke();
    }
    if (cross || p.guide === 'to-y' || p.guide === 'both') {
      ctx.beginPath();
      ctx.moveTo(cross ? plotX : px, py);
      ctx.lineTo(cross ? plotX + plotW : axX, py);
      ctx.stroke();
    }
  }
  ctx.restore();

  // ── 축선과 화살촉 ────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = AXIS_W;
  ctx.lineCap = 'butt';

  const xLeft = four ? plotX - ARROW_EXT : axX;
  const xRight = plotX + plotW + ARROW_EXT;
  ctx.beginPath();
  ctx.moveTo(xLeft, axY);
  ctx.lineTo(xRight, axY);
  ctx.stroke();
  drawArrowHead(ctx, xLeft, axY, xRight, axY);
  if (four) drawArrowHead(ctx, xRight, axY, xLeft, axY);

  const yBottom = four ? plotY + plotH + ARROW_EXT : axY;
  const yTop = plotY - ARROW_EXT;
  ctx.beginPath();
  ctx.moveTo(axX, yBottom);
  ctx.lineTo(axX, yTop);
  ctx.stroke();
  drawArrowHead(ctx, axX, yBottom, axX, yTop);
  if (four) drawArrowHead(ctx, axX, yTop, axX, yBottom);

  // 생략 기호는 원점과 첫 눈금의 한가운데에 놓는다 (2026학년도 9월 7번 실측).
  if (data.xAxis.broken) {
    const first = data.xAxis.ticks.find((v) => v !== 0);
    drawBreakMark(ctx, first == null ? axX + plotW * 0.12 : (axX + toX(first)) / 2, axY, false);
  }
  if (data.yAxis.broken) {
    const first = data.yAxis.ticks.find((v) => v !== 0);
    drawBreakMark(ctx, axX, first == null ? axY - plotH * 0.12 : (axY + toY(first)) / 2, true);
  }
  ctx.restore();

  // ── 직선 ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = LINE_W;
  ctx.lineCap = 'round';
  for (const line of data.lines) {
    ctx.beginPath();
    ctx.moveTo(toX(line.from.x), toY(line.from.y));
    ctx.lineTo(toX(line.to.x), toY(line.to.y));
    ctx.stroke();
  }
  ctx.restore();

  // ── 직선 이름 — 선의 «제 끝»에 붙는다 (범례가 없다) ──────────────
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const line of data.lines) {
    if (!line.label) continue;
    const end = line.labelAt === 'from' ? line.from : line.to;
    const lx = toX(end.x) + 12 + (line.labelDx ?? 0);
    // 가로축에 닿아 끝나는 선(수요 곡선이 그렇다)은 이름을 축 위로 올린다.
    const raw = toY(end.y) + (line.labelDy ?? 0);
    const ly = Math.min(raw, axY - 6 - fs.axisLabel * 0.5);
    drawFloatingLabel(ctx, line.label, lx, ly, w, h, fs.axisLabel, nameFont);
  }
  ctx.restore();

  // ── 화살표 ───────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = ARROW_W;
  for (const a of data.arrows) {
    const x1 = toX(a.from.x);
    const y1 = toY(a.from.y);
    const x2 = toX(a.to.x);
    const y2 = toY(a.to.y);
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (!(len > 0)) continue;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    // 진행 방향의 오른쪽 (화면 좌표는 아래가 +y 이므로 이 방향이 오른쪽이다)
    const ox = -uy * a.offset;
    const oy = ux * a.offset;
    const cut = Math.min(a.shorten, len * 0.4);
    const sx = x1 + ux * cut + ox;
    const sy = y1 + uy * cut + oy;
    const ex = x2 - ux * cut + ox;
    const ey = y2 - uy * cut + oy;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    drawArrowHead(ctx, sx, sy, ex, ey);

    if (a.label) {
      const at = anchorOf(a.labelPos, LABEL_GAP + 4);
      ctx.textAlign = at.align;
      ctx.textBaseline = at.baseline;
      drawFloatingLabel(ctx, a.label, (sx + ex) / 2 + at.dx, (sy + ey) / 2 + at.dy, w, h, fs.axisLabel, nameFont);
    }
  }
  ctx.restore();

  // ── 점과 이름 ────────────────────────────────────────────────────
  ctx.save();
  ctx.fillStyle = '#000';
  for (const p of data.points) {
    const px = toX(p.x);
    const py = toY(p.y);
    if (p.dot) {
      ctx.beginPath();
      ctx.arc(px, py, DOT_R, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!p.label) continue;
    const at = anchorOf(p.labelPos, DOT_R + LABEL_GAP);
    ctx.textAlign = at.align;
    ctx.textBaseline = at.baseline;
    drawFloatingLabel(ctx, p.label, px + at.dx, py + at.dy, w, h, fs.axisLabel, nameFont);
  }
  ctx.restore();

  // ── 눈금 숫자 (눈금 표시선은 없다) ───────────────────────────────
  //
  // 네 사분면에서는 숫자가 플롯 **안쪽**에 놓여 유도선이 그 뒤로 지나간다.
  // 그때만 글자 자리를 희게 지운다 — 실물도 「−5」 자리에서 점선이 끊긴다.
  // 1사분면 숫자는 축 바깥이라 뒤로 지나갈 것이 없으므로 손대지 않는다.
  const tickInk = (text: string, x: number, y: number) => {
    if (four) {
      const tw = ctx.measureText(text).width;
      const left = ctx.textAlign === 'right' ? tw : ctx.textAlign === 'center' ? tw / 2 : 0;
      const up = ctx.textBaseline === 'top' ? 0 : fs.tick * 0.5;
      const rx = clamp(x - left - 3, 0, w);
      const ry = clamp(y - up - 2, 0, h);
      ctx.fillStyle = '#fff';
      ctx.fillRect(rx, ry, Math.min(tw + 6, w - rx), Math.min(fs.tick + 4, h - ry));
      ctx.fillStyle = '#000';
    }
    ctx.fillText(text, x, y);
  };

  ctx.save();
  ctx.fillStyle = '#000';
  ctx.font = tickFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const v of data.xAxis.ticks) {
    if (v === 0) continue;
    const at = nudgeInside(ctx, formatTick(v), toX(v), axY + 10, w, h);
    tickInk(formatTick(v), at.x, at.y);
  }
  // 네 사분면에서는 세로축 숫자가 축 **오른쪽**에 붙는다 (2027학년도 6월 16번).
  ctx.textAlign = four ? 'left' : 'right';
  ctx.textBaseline = 'middle';
  for (const v of data.yAxis.ticks) {
    if (v === 0) continue;
    const at = nudgeInside(ctx, formatTick(v), axX + (four ? 10 : -10), toY(v), w, h);
    tickInk(formatTick(v), at.x, at.y);
  }
  // 원점의 0 — 눈금 값에 0 이 있어도 여기서 한 번만 그린다
  ctx.textAlign = four ? 'left' : 'center';
  ctx.textBaseline = 'top';
  const zero = nudgeInside(ctx, '0', axX + (four ? 8 : 0), axY + 10, w, h);
  tickInk('0', zero.x, zero.y);
  ctx.restore();

  // ── 축 이름 ──────────────────────────────────────────────────────
  ctx.save();
  ctx.fillStyle = '#000';
  if (data.xAxis.label) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    drawFloatingLabel(ctx, data.xAxis.label, xRight + 10, axY + fs.tick * 0.6, w, h, fs.axisLabel, nameFont);
  }
  if (data.yAxis.label) {
    // 1사분면이면 축 왼쪽에 오른쪽 맞춤, 네 사분면이면 화살촉 위 가운데 맞춤이다.
    ctx.textAlign = four ? 'center' : 'right';
    ctx.textBaseline = 'bottom';
    drawFloatingLabel(ctx, data.yAxis.label, axX + (four ? 0 : -8), yTop - (four ? 8 : -4), w, h, fs.axisLabel, nameFont);
  }
  ctx.restore();

  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: fs.title, fonts: options, canvasWidth: w });
  drawSourceAndFootnote({
    ctx, plotX, plotW, height: h,
    source: options.source,
    sourceLeft: options.sourceLeft,
    sourceInline: options.sourceInline,
    footnotes: options.footnotes,
    fontSize: fs.dataLabel,
    fonts: options,
    canvasWidth: w,
  });
}
