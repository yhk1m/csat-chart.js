// © 2026 김용현
// 경제 좌표평면 — 수능 경제 문항의 그림.
//
// 이 라이브러리의 첫 비지리 종류다. 지리 열여섯 종과 갈리는 곳은 이름을 다는
// 방식이다 — 선은 **제 끝에** 이름을 달고 선다. 실물 열여섯 장 중 열다섯 장이
// 그렇고, 계열(꺾은선)을 쓰는 한 장만 범례 상자를 쓴다. 그 상자도
// `options.showLegend` 가 아니라 **자료**(`data.legend`)가 부른다. 그래서 이
// 종류는 여전히 `showLegend`·`legendPosition`·`showDataLabels` 를 읽지 않는다.
// 대신 `fontStack` 두 자리는 나머지 열여섯 종과 똑같이 지킨다.
//
// 눈금 표시선(작은 선분)도 그리지 않는다. 시험지가 그렇다 — 격자나 유도선이
// 축까지 닿아 자리를 알려 주므로 표시선이 따로 없다.
//
// **이 그림의 글자는 모두 아래 첨자를 지난다**(`D_1` → D₁). 그래서 재는 일도
// 그리는 일도 `subscript.ts` 의 짝(richWidth·drawFloatingRich)을 쓴다. 첨자가
// 없는 글은 그 안에서 `fit.ts` 의 옛 함수로 그대로 흘러가므로, 1.4.0 이 그린
// 그림은 한 픽셀도 움직이지 않는다.
import {
  type EconPlaneData, type EconAxis, type EconLabelPos, type EconSeries,
  type GraphOptions,
} from '../types/index';
import { clearCanvas, getFont, type Padding } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawFloatingLabel, nudgeInside } from '../canvas/fit';
import { drawFloatingRich, fillRich, nudgeRichInside, richWidth } from '../canvas/subscript';
import { drawInsideLegend, type LegendItem } from '../canvas/legend';

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
/** 세로축 이름이 여러 줄일 때의 줄 간격 배율 */
const NAME_LINE_H = 1.15;

const DASH_PATTERN: Record<'dashed' | 'dotted', number[]> = {
  dashed: [7, 5],
  dotted: [1.5, 4],
};

/**
 * 굵은 선(직선·계열)의 파선 무늬.
 *
 * 유도선의 `[7, 5]` 보다 성기다 — 굵기가 두 배(3px 대 1.5px)라 같은 무늬로
 * 그으면 파선이 아니라 이 빠진 실선으로 보인다. 2027학년도 6월 3번의 `D_2` 에서
 * 잰 값이다.
 */
const THICK_DASH = [12, 8];

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

/**
 * 눈금 자리에 적을 글자.
 *
 * `tickLabels` 에 적힌 것이 있으면 그것을, 없으면 숫자를 적는다. 자리는 언제나
 * `ticks` 가 정한다 — 이 배열은 «거기 무엇이라 적을까» 만 바꾼다.
 */
function tickText(axis: EconAxis, i: number): string {
  const given = Array.isArray(axis.tickLabels) ? axis.tickLabels[i] : undefined;
  return typeof given === 'string' && given !== '' ? given : formatTick(axis.ticks[i]);
}

/**
 * 손으로 나눈 축 이름의 줄.
 *
 * 리터럴 `\n`(역슬래시 + n)과 진짜 줄바꿈을 모두 받는다. 앞쪽은 산점도의
 * `yLabel` 이 이미 쓰는 규약이고(JSON 에 그대로 적을 수 있다), 뒤쪽은
 * 자바스크립트로 자료를 짤 때 자연스러운 쪽이다.
 */
function splitLines(text: string): string[] {
  return text ? text.split(/\\n|\n/) : [''];
}

/** 0 으로 나누지 않게 지킨 축 폭 */
function span(axis: EconAxis): number {
  const d = axis.max - axis.min;
  return Number.isFinite(d) && Math.abs(d) > 1e-9 ? d : 1;
}

/** 계열 배열 — 검증기의 얕은 검사가 닿지 않는 선택 항목이라 여기서 한 번 더 본다 */
function seriesOf(data: EconPlaneData): EconSeries[] {
  return Array.isArray(data.series) ? data.series.filter((s) => s && Array.isArray(s.points)) : [];
}

/**
 * 계열을 그리는 순서 — **먼저 적은 것이 위에 온다.**
 *
 * 계열 둘이 한 점에서 만나면 기호가 포개진다. 실물은 그 자리에 명목 GDP 의 찬
 * 동그라미를 보이고 실질 GDP 의 빈 네모를 그 아래 감춘다 — 범례에서 먼저 읽는
 * 계열이 그림에서도 앞에 서는 것이다. 배열 순서대로 그리면 반대가 되므로
 * 뒤에서부터 그린다. 범례는 배열 순서 그대로다.
 */
function drawOrder(series: EconSeries[]): EconSeries[] {
  return series.length > 1 ? [...series].reverse() : series;
}

/** 계열 꼭짓점에 얹는 기호 하나 */
function drawSeriesMarker(
  ctx: CanvasRenderingContext2D,
  s: EconSeries,
  cx: number,
  cy: number,
) {
  ctx.beginPath();
  if (s.marker === 'square') ctx.rect(cx - DOT_R, cy - DOT_R, DOT_R * 2, DOT_R * 2);
  else ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
  ctx.fillStyle = s.hollow ? '#fff' : '#000';
  ctx.fill();
  if (s.hollow) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();
  }
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
  const series = seriesOf(data);

  // ── 여백 — 글자를 먼저 재고 자리를 비운다 ─────────────────────────
  //
  // 재는 것은 **첨자까지 합친 결과** 다. 원문 `'P_1'` 을 그대로 재면 밑줄
  // 한 칸이 더 얹혀 왼쪽 여백이 넓어지고, 첨자를 지운 `'P1'` 을 재면 좁아진다.
  ctx.font = tickFont;
  const yTickW = data.yAxis.ticks.length > 0
    ? Math.max(...data.yAxis.ticks.map((_, i) => richWidth(ctx, tickText(data.yAxis, i), fs.tick, nameFont)))
    : 0;

  ctx.font = nameFont(fs.axisLabel);
  // 줄을 나누는 것은 **세로축 이름뿐이다.** 실물에서 두 줄로 앉는 것이 언제나
  // 세로축이고(「가격」·「(만 원)」, 「GDP」·「(억 달러)」), 가로축 이름은 화살촉
  // 오른쪽 한 줄에 눕는다.
  const yNameLines = splitLines(data.yAxis.label);
  const xNameW = data.xAxis.label ? richWidth(ctx, data.xAxis.label, fs.axisLabel, nameFont) : 0;
  const yNameW = data.yAxis.label
    ? Math.max(...yNameLines.map((l) => (l ? richWidth(ctx, l, fs.axisLabel, nameFont) : 0)))
    : 0;
  const lineLabelW = data.lines.length > 0
    ? Math.max(...data.lines.map((l) => (l.label ? richWidth(ctx, l.label, fs.axisLabel, nameFont) : 0)))
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

  // 세로축 이름이 두 줄이면 그만큼 위를 더 비운다. 한 줄이면 0 이 더해진다 —
  // 1.4.0 의 여백이 그대로 남아야 한다.
  const yNameExtra = (yNameLines.length - 1) * fs.axisLabel * NAME_LINE_H;

  const padding: Padding = {
    top: (options.title ? fs.title + 40 : 18) + fs.axisLabel + yNameExtra + 10 + ARROW_EXT,
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
  // 계열 유도선 — 한 자리에 점이 여럿이면 가장 높은 점까지만 한 번 긋는다.
  // 계열마다 그으면 같은 자리에 파선이 겹쳐 무늬가 어긋나고 굵어 보인다.
  if (data.seriesGuides && series.length > 0) {
    const highest = new Map<number, number>();
    for (const s of series) {
      for (const p of s.points) {
        const prev = highest.get(p.x);
        if (prev == null || p.y > prev) highest.set(p.x, p.y);
      }
    }
    for (const [x, y] of highest) {
      ctx.beginPath();
      ctx.moveTo(toX(x), toY(y));
      ctx.lineTo(toX(x), axY);
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
  //
  // 파선일 때만 끝을 뭉툭하게(`butt`) 자른다. 둥근 끝으로 파선을 그으면 토막
  // 끝이 부풀어 사이가 메워지고 실선처럼 보인다.
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = LINE_W;
  for (const line of data.lines) {
    ctx.lineCap = line.dashed ? 'butt' : 'round';
    ctx.setLineDash(line.dashed ? THICK_DASH : []);
    ctx.beginPath();
    ctx.moveTo(toX(line.from.x), toY(line.from.y));
    ctx.lineTo(toX(line.to.x), toY(line.to.y));
    ctx.stroke();
  }
  ctx.restore();

  // ── 계열 — 꼭짓점을 이은 꺾은선 ──────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = LINE_W;
  for (const s of drawOrder(series)) {
    if (s.points.length < 2) continue;
    ctx.lineCap = s.dashed ? 'butt' : 'round';
    ctx.setLineDash(s.dashed ? THICK_DASH : []);
    ctx.beginPath();
    s.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(toX(p.x), toY(p.y));
      else ctx.lineTo(toX(p.x), toY(p.y));
    });
    ctx.stroke();
  }
  ctx.restore();

  // ── 직선 이름 — 선의 «제 끝»에 붙는다 (계열만 범례를 쓴다) ───────
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
    drawFloatingRich(ctx, line.label, lx, ly, w, h, fs.axisLabel, nameFont);
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
      drawFloatingRich(ctx, a.label, (sx + ex) / 2 + at.dx, (sy + ey) / 2 + at.dy, w, h, fs.axisLabel, nameFont);
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
    drawFloatingRich(ctx, p.label, px + at.dx, py + at.dy, w, h, fs.axisLabel, nameFont);
  }
  ctx.restore();

  // ── 계열 기호 — 선 위에 얹는다 ───────────────────────────────────
  ctx.save();
  for (const s of drawOrder(series)) {
    for (const p of s.points) drawSeriesMarker(ctx, s, toX(p.x), toY(p.y));
  }
  ctx.restore();

  // ── 눈금 숫자 (눈금 표시선은 없다) ───────────────────────────────
  //
  // 네 사분면에서는 숫자가 플롯 **안쪽**에 놓여 유도선이 그 뒤로 지나간다.
  // 그때만 글자 자리를 희게 지운다 — 실물도 「−5」 자리에서 점선이 끊긴다.
  // 1사분면 숫자는 축 바깥이라 뒤로 지나갈 것이 없으므로 손대지 않는다.
  const tickInk = (text: string, x: number, y: number) => {
    if (four) {
      const tw = richWidth(ctx, text, fs.tick, nameFont);
      const left = ctx.textAlign === 'right' ? tw : ctx.textAlign === 'center' ? tw / 2 : 0;
      const up = ctx.textBaseline === 'top' ? 0 : fs.tick * 0.5;
      const rx = clamp(x - left - 3, 0, w);
      const ry = clamp(y - up - 2, 0, h);
      ctx.fillStyle = '#fff';
      ctx.fillRect(rx, ry, Math.min(tw + 6, w - rx), Math.min(fs.tick + 4, h - ry));
      ctx.fillStyle = '#000';
    }
    fillRich(ctx, text, x, y, fs.tick, nameFont);
  };

  ctx.save();
  ctx.fillStyle = '#000';
  ctx.font = tickFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  data.xAxis.ticks.forEach((v, i) => {
    if (v === 0) return;
    const text = tickText(data.xAxis, i);
    const at = nudgeRichInside(ctx, text, toX(v), axY + 10, w, h, fs.tick, nameFont);
    tickInk(text, at.x, at.y);
  });
  // 네 사분면에서는 세로축 숫자가 축 **오른쪽**에 붙는다 (2027학년도 6월 16번).
  ctx.textAlign = four ? 'left' : 'right';
  ctx.textBaseline = 'middle';
  data.yAxis.ticks.forEach((v, i) => {
    if (v === 0) return;
    const text = tickText(data.yAxis, i);
    const at = nudgeRichInside(ctx, text, axX + (four ? 10 : -10), toY(v), w, h, fs.tick, nameFont);
    tickInk(text, at.x, at.y);
  });
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
    drawFloatingRich(ctx, data.xAxis.label, xRight + 10, axY + fs.tick * 0.6, w, h, fs.axisLabel, nameFont);
  }
  if (data.yAxis.label) {
    // 1사분면이면 축 왼쪽에 오른쪽 맞춤, 네 사분면이면 화살촉 위 가운데 맞춤이다.
    ctx.textAlign = four ? 'center' : 'right';
    ctx.textBaseline = 'bottom';
    const baseY = yTop - (four ? 8 : -4);
    if (yNameLines.length === 1) {
      drawFloatingRich(ctx, data.yAxis.label, axX + (four ? 0 : -8), baseY, w, h, fs.axisLabel, nameFont);
    } else {
      // 여러 줄이면 마지막 줄을 한 줄일 때의 자리에 두고 위로 쌓는다.
      // 줄마다 폭이 다르므로 오른쪽 맞춤 대신 **묶음 가운데 맞춤**이다 —
      // 실물이 「GDP」를 「(억 달러)」 위에 가운데로 앉힌다.
      const lh = fs.axisLabel * NAME_LINE_H;
      const cx = four ? axX : axX - 8 - yNameW / 2;
      ctx.textAlign = 'center';
      yNameLines.forEach((lineText, i) => {
        const ly = baseY - (yNameLines.length - 1 - i) * lh;
        drawFloatingRich(ctx, lineText, cx, ly, w, h, fs.axisLabel, nameFont);
      });
    }
  }
  ctx.restore();

  // ── 계열 범례 상자 ───────────────────────────────────────────────
  //
  // 실물의 상자는 축 화살촉 바깥 오른쪽 아래에 선다. 800×600 한 장에서는 그
  // 자리가 캔버스 밖이라, 플롯 **안쪽** 모서리에 놓는다 — 자료에 막히면
  // 나머지 세 모서리를 차례로 보는 공용 배치기를 그대로 쓴다.
  if (data.legend && series.length > 0) {
    const items: LegendItem[] = series.map((s) => ({
      type: 'line',
      fillStyle: '#000',
      strokeStyle: '#000',
      label: s.label,
      dash: s.dashed ? THICK_DASH : [],
      lineWidth: 2.5,
      marker: s.marker,
      hollow: s.hollow,
    }));
    drawInsideLegend({
      ctx,
      items,
      corner: data.legend,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: fs.axisLabel * 0.8,
      font: nameFont(fs.axisLabel * 0.8),
      // 기호가 상자에 덮이지 않게 꼭짓점 둘레를 피할 자리로 넘긴다
      avoid: series.flatMap((s) => s.points.map((p) => ({
        x0: toX(p.x) - DOT_R, y0: toY(p.y) - DOT_R,
        x1: toX(p.x) + DOT_R, y1: toY(p.y) + DOT_R,
      }))),
    });
  }

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
