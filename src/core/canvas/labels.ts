// © 2026 김용현
import { currentMeasurer, textFont, textSize, type FontOptions } from './renderer';
import { styleOf, type StyleTokens } from './style';
import { inkExtent } from './fit';
import type { GraphOptions } from '../types/common';

/** 출처·각주 도우미가 받는 옵션 — 렌더러는 options 를 통째로 넘긴다 */
type LabelFonts = FontOptions & { fontSize?: GraphOptions['fontSize'] };

interface TitleParams {
  ctx: CanvasRenderingContext2D;
  plotX: number;
  plotW: number;
  title: string;
  fontSize: number;
  /**
   * 글꼴 옵션. `options` 를 그대로 넘긴다.
   *
   * 제목·출처·각주는 언제나 **고딕 자리**로 그린다(시험지 원본이 그렇다).
   * 그 자리에 무슨 글꼴을 쓸지는 `options.fontStack.sans` 가 정한다.
   * 없어도 되는 항목으로 두지 않는다 — 빠뜨린 호출부가 조용히 기본 글꼴로
   * 그려지는 것이 1.2.0 까지의 결함이었다.
   */
  fonts: LabelFonts;
  /** 캔버스 전체 너비. 주면 제목이 넘칠 때 글자를 줄여 맞춘다. */
  canvasWidth?: number;
}

/** 최소 이만큼까지는 줄인다. 더 줄이면 읽기 어렵다. */
const MIN_SHRINK = 0.6;

/**
 * 주어진 폭에 들어가도록 글꼴 크기를 줄인다.
 * 그래도 안 들어가면 마지막 수단으로 fillText 의 maxWidth 로 눌러 담는다.
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  available: number,
  makeFont: (size: number) => string
): number {
  if (available <= 0) return fontSize;
  ctx.font = makeFont(fontSize);
  const w = ctx.measureText(text).width;
  if (w <= available) return fontSize;
  const scaled = Math.max(fontSize * MIN_SHRINK, fontSize * (available / w));
  return Math.floor(scaled);
}

export function drawTitle({ ctx, plotX, plotW, title, fontSize, fonts, canvasWidth }: TitleParams) {
  if (!title) return;
  ctx.save();
  ctx.fillStyle = '#000';

  const makeFont = (size: number) => textFont(fonts, 'title', size);
  // 제목은 그래프 가운데에 놓이므로 캔버스 양쪽으로 넘칠 수 있다.
  // 가운데를 기준으로 양쪽에서 좁은 쪽 × 2 가 실제로 쓸 수 있는 폭이다.
  const centerX = plotX + plotW / 2;
  const available = canvasWidth != null
    ? Math.max(0, Math.min(centerX, canvasWidth - centerX) * 2 - 12)
    : plotW;

  const size = fitFontSize(ctx, title, fontSize, available, makeFont);
  ctx.font = makeFont(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, centerX, 10, available > 0 ? available : undefined);
  ctx.restore();
}

interface SourceFootnoteParams {
  ctx: CanvasRenderingContext2D;
  plotX: number;
  plotW: number;
  height: number;
  source: string;
  /** 출처 줄 왼쪽에 함께 적는 글 (예: 자료 연도). 주면 출처 줄이 각주 아래로 내려간다. */
  sourceLeft?: string;
  /** 출처를 마지막 각주와 같은 줄 오른쪽 끝에 둔다 (시험지 관습) */
  sourceInline?: boolean;
  footnotes: string[];
  fontSize: number;
  /** 글꼴 옵션. `options` 를 그대로 넘긴다 — `TitleParams.fonts` 와 같다. */
  fonts: LabelFonts;
  canvasWidth?: number;
}

/**
 * exam: 각주 묶음과 그 아래 출처 줄 사이에 빈 줄 대신 남기는 몫(px). 시험지 잉크 틈 4.6pt
 * (2027_09 korgeo q14 각주 ↔ «(2024) … (행정안전부)») 에 맞춘 값.
 */
const BELOW_GAP = 16;

/** 출처·각주를 캔버스 좌우 끝에서 얼마나 띄울지 */
const EDGE_MARGIN = 10;

export function drawSourceAndFootnote({
  ctx, plotX, plotW, height, source, sourceLeft, sourceInline, footnotes, fontSize, fonts, canvasWidth,
}: SourceFootnoteParams) {
  ctx.save();
  const t = styleOf(fonts);
  const srcSize = textSize(fonts, 'source', fontSize);
  const noteSize = textSize(fonts, 'footnote', fontSize * 0.9);
  const yearSize = textSize(fonts, 'year', fontSize);

  // 출처·연도는 오른쪽 **끝**, 각주는 왼쪽 **끝**에 붙인다 (2026-08-04 사용자 결정).
  // 예전에는 플롯 영역에 맞춰 안쪽으로 들여써서 그림 가운데에 뜬 것처럼 보였다.
  let leftX = plotX;
  let rightX = plotX + plotW;
  if (canvasWidth != null) {
    leftX = EDGE_MARGIN;
    rightX = canvasWidth - EDGE_MARGIN;
  }

  // 위에서 아래로: 출처 → 각주들.
  // 단 sourceLeft 를 주면 순서가 뒤집힌다 — 각주 아래에 "(연도) ... (출처)" 한 줄.
  const filtered = footnotes.filter((f) => f.trim());
  const totalFootnoteH = filtered.length * (noteSize + 4);
  const sourceBelow = !!sourceLeft;
  // 시험지 관습 — 출처를 마지막 각주와 **같은 줄** 오른쪽 끝에 둔다.
  // 주지 않으면 양식의 기본값(exam 은 켜짐). 각주가 없으면 놓을 줄이 없으므로 기존 배치.
  // 쓸 수 있는 폭 (각주는 왼쪽 끝에서 오른쪽으로 흐른다 — 넘치면 글꼴을 줄인다)
  const rightEdge = canvasWidth != null ? rightX : plotX + plotW;
  const available = Math.max(0, rightEdge - leftX);
  // 출처가 줄의 절반을 넘게 차지하면 각주 자리가 남지 않는다 — 그때는 따로 한 줄
  ctx.font = textFont(fonts, 'source', srcSize);
  const inlineFits = !source || ctx.measureText(source).width + 16 <= available * 0.5;
  const wantsInline = !!(sourceInline ?? t.sourceInline) && !!source && !sourceBelow && filtered.length > 0
    && inlineFits;
  // exam: 마지막 각주와 출처가 제 크기로 한 줄에 안 들어가면 각주를 줄이지 않고 출처를 각주
  // 아래 줄 오른쪽 끝으로 내린다 (sourceFootnoteReserve 가 같은 판정으로 한 줄을 비운다)
  const sourceUnder = wantsInline && t.name === 'exam'
    && !inlineLineFits(ctx, fonts, source, t.footnoteMark(filtered.length - 1) + filtered[filtered.length - 1],
      srcSize, noteSize, available);
  const inlineSource = wantsInline && !sourceUnder;
  const sourceH = (source || sourceLeft) && !inlineSource ? srcSize + 4 : 0;
  let y = height - 6 - totalFootnoteH - (sourceBelow || sourceUnder ? sourceH : 0);
  // 각주는 글자 아래끝(bottom)에 맞춰 찍으므로 묶음이 한 줄 높다 — 아래 출처 줄과의 사이가 빈 줄
  // 하나만큼 벌어졌다(겹침 비교 stacked: 9.3pt ↔ 시험지 4.6pt). exam 은 그 한 줄에서 BELOW_GAP 만 남긴다
  if ((sourceBelow || sourceUnder) && t.name === 'exam' && filtered.length > 0) y += noteSize + 4 - BELOW_GAP;

  const sourceFont = (size: number) => textFont(fonts, 'source', size);

  if (source && !sourceBelow && !inlineSource && !sourceUnder) {
    ctx.fillStyle = t.ink.source;
    const size = fitFontSize(ctx, source, srcSize, available, sourceFont);
    ctx.font = sourceFont(size);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(source, rightX, y, available > 0 ? available : undefined);
    y += sourceH;
  }

  // 같은 줄에 출처가 들어오면 각주가 쓸 수 있는 폭이 그만큼 줄어든다
  ctx.font = sourceFont(srcSize);
  const inlineSourceW = inlineSource ? ctx.measureText(source).width + 16 : 0;
  const footnoteAvailable = Math.max(0, available - inlineSourceW);

  let lastFootnoteY = y;
  for (let i = 0; i < filtered.length; i++) {
    const text = t.footnoteMark(i) + filtered[i];
    ctx.fillStyle = t.ink.footnote;
    const makeFont = (size: number) => textFont(fonts, 'footnote', size);
    // 같은 줄 출처는 마지막 각주 줄에만 놓인다 — exam 은 그 앞 줄들에 온 폭을 준다
    // (classic 은 1.7.0 그대로 모든 줄을 좁힌다)
    const room = t.name === 'exam' && i < filtered.length - 1 ? available : footnoteAvailable;
    const size = fitFontSize(ctx, text, noteSize, room, makeFont);
    ctx.font = makeFont(size);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, leftX, y, room > 0 ? room : undefined);
    lastFootnoteY = y;
    y += noteSize + 4;
  }

  // 마지막 각주와 같은 줄, 오른쪽 끝
  if (inlineSource) {
    ctx.fillStyle = t.ink.source;
    const size = fitFontSize(ctx, source, srcSize, inlineSourceW, sourceFont);
    ctx.font = sourceFont(size);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(source, rightX, lastFootnoteY, inlineSourceW > 0 ? inlineSourceW : undefined);
  }

  if (sourceUnder) {
    ctx.fillStyle = t.ink.source;
    const size = fitFontSize(ctx, source, srcSize, available, sourceFont);
    ctx.font = sourceFont(size);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(source, rightX, height - 6, available > 0 ? available : undefined);
  }

  // 각주 아래 출처 줄 — 왼쪽에 자료 연도, 오른쪽에 출처 기관
  if (sourceBelow) {
    const yearFont = (size: number) => textFont(fonts, 'year', size);
    const half = available > 0 ? available / 2 : 0;
    ctx.fillStyle = t.ink.source;
    ctx.textBaseline = 'bottom';

    ctx.font = yearFont(fitFontSize(ctx, sourceLeft!, yearSize, half, yearFont));
    ctx.textAlign = 'left';
    ctx.fillText(sourceLeft!, leftX, height - 6, half > 0 ? half : undefined);

    if (source) {
      ctx.font = sourceFont(fitFontSize(ctx, source, srcSize, half, sourceFont));
      ctx.textAlign = 'right';
      ctx.fillText(source, rightX, height - 6, half > 0 ? half : undefined);
    }
  }

  ctx.restore();
}

/** 마지막 각주와 출처가 제 크기로 한 줄(사이 16px)에 들어가는가 */
function inlineLineFits(
  ctx: CanvasRenderingContext2D, fonts: LabelFonts, source: string, lastNote: string,
  srcSize: number, noteSize: number, available: number,
): boolean {
  ctx.save();
  ctx.font = textFont(fonts, 'source', srcSize);
  const sw = ctx.measureText(source).width;
  ctx.font = textFont(fonts, 'footnote', noteSize);
  const nw = ctx.measureText(lastNote).width;
  ctx.restore();
  return nw + 16 + sw <= available;
}

/**
 * 출처·각주 묶음이 캔버스 아래에서 차지하는 높이 — 렌더러가 아래 여백에 더할 몫.
 *
 * classic 은 렌더러마다 1.7.0 상수(출처 30 · 각주 줄마다 22 …)를 `classic` 으로 넘겨
 * 그대로 돌려받는다 — 골든이 바이트 그대로여야 한다.
 * exam 은 글자가 커서 상수로는 가로축 숫자·축 이름을 덮는다. drawSourceAndFootnote 가
 * 실제로 쓰는 크기(같은 `fontSize` 인자)로 줄 높이를 잰다:
 * 출처 줄 = 출처 글자 + 8, 각주 줄 = 각주 글자 + 4, 각주 묶음은 마지막 줄 글자 높이만큼
 * 더 올라가므로 한 줄 몫을 더 세고, 바닥 6px·윗틈 4px 를 더한다. `sourceLeft` 를 주면 각주 아래 «(연도) … (출처)» 한 줄.
 * `draws.reserveSource` 는 출처 글이 없어도 한 줄을 비워 둔다(트리맵 패널 맞춤).
 */
export function sourceFootnoteReserve(
  o: LabelFonts & Pick<GraphOptions, 'source' | 'footnotes'>,
  fontSize: number,
  classic: number,
  /** drawSourceAndFootnote 에 넘기는 것과 같은 값 — 넘기지 않는 렌더러는 비워 둔다 */
  draws: { sourceLeft?: string; sourceInline?: boolean; reserveSource?: boolean } = {},
): number {
  const t = styleOf(o);
  if (t.name === 'classic') return classic;
  const notes = o.footnotes.filter((f) => f.trim()).length;
  const srcLine = textSize(o, 'source', fontSize) + 8;
  const noteLine = textSize(o, 'footnote', fontSize * 0.9) + 4;
  const inline = !draws.sourceLeft && !!(draws.sourceInline ?? t.sourceInline) && notes > 0;
  // 같은 줄에 안 들어가 출처가 각주 아래로 내려가는 경우 (drawSourceAndFootnote 의 sourceUnder).
  // 렌더러는 출처·각주를 캔버스 좌우 끝(EDGE_MARGIN)까지 쓴다 — 그 폭으로 잰다
  const { ctx, width } = currentMeasurer();
  const filtered = o.footnotes.filter((f) => f.trim());
  const avail = width - EDGE_MARGIN * 2;
  let under = false;
  let above = false;
  if (inline && !!o.source && !!ctx && width > 0) {
    ctx.save();
    ctx.font = textFont(o, 'source', textSize(o, 'source', fontSize));
    const half = ctx.measureText(o.source).width + 16 <= avail * 0.5;
    ctx.restore();
    // 출처가 줄 절반을 넘으면 draw 는 출처를 각주 **위** 따로 한 줄에 둔다(above), 절반 안인데
    // 마지막 각주와 한 줄에 안 들어가면 각주 **아래**로 내린다(under)
    above = !half;
    under = half && !inlineLineFits(ctx, o, o.source, t.footnoteMark(notes - 1) + filtered[notes - 1],
      textSize(o, 'source', fontSize), textSize(o, 'footnote', fontSize * 0.9), avail);
  }
  let b = 0;
  if (draws.sourceLeft) b += Math.max(srcLine, textSize(o, 'year', fontSize) + 8);
  else if ((o.source && (!inline || under || above)) || (draws.reserveSource && notes === 0)) b += srcLine;
  // 묶음 윗변은 바닥에서 6 + 줄 수 × 줄 높이 + 글자 높이 — 그 위로 4px 더 띄운다.
  // 출처 줄이 각주 아래에 오면 각주 묶음을 한 줄 내려 그린다(drawSourceAndFootnote) — 그만큼 덜 비운다
  if (notes > 0) b += draws.sourceLeft || under ? notes * noteLine + 6 + BELOW_GAP : (notes + 1) * noteLine + 6;
  return b;
}

// ── 겹침 회피 라벨 배치 ─────────────────────────────────────
//
// 점이 붙어 있으면 라벨끼리, 또는 라벨과 점이 겹쳐 읽을 수 없게 된다.
// 후보 위치를 순서대로 시도해 빈 자리를 찾고, 어디에도 안 들어가면
// 가장 멀리 밀어낸 뒤 유도선을 그어 어느 점의 라벨인지 알 수 있게 한다.

export interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** 이미 자리를 차지한 영역들을 모아 두고 충돌을 판정한다 */
export class LabelPlacer {
  private used: LabelBox[] = [];
  private readonly leader: StyleTokens['leader'];

  /** @param leader 자리를 못 찾았을 때 긋는 유도선 — `styleOf(options).leader` */
  constructor(leader: StyleTokens['leader']) {
    this.leader = leader;
  }

  /** 점 자체도 자리를 차지한다 — 라벨이 점 위에 얹히지 않게 미리 등록한다 */
  reserve(box: LabelBox) {
    this.used.push(box);
  }

  reserveCircle(cx: number, cy: number, r: number) {
    this.used.push({ left: cx - r, right: cx + r, top: cy - r, bottom: cy + r });
  }

  private overlaps(box: LabelBox): boolean {
    return this.used.some(
      (u) => !(box.right < u.left || box.left > u.right || box.bottom < u.top || box.top > u.bottom)
    );
  }

  /**
   * 라벨을 **정해진 x 열에** 놓고, 겹치면 위아래로만 민다.
   *
   * 선 끝 이름처럼 여러 라벨이 한 줄로 나란해야 하는 경우에 쓴다.
   * 일반 `place()` 는 8방향으로 움직여 가로 위치가 흐트러진다.
   *
   * @param x 라벨 왼쪽 끝 x (모든 라벨이 공유하는 열)
   * @param preferredY 원래 놓고 싶은 y (라벨 상단)
   */
  placeInColumn(
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    preferredY: number,
    opts: { lineHeight: number; bounds: LabelBox }
  ) {
    const w = ctx.measureText(label).width;
    const h = opts.lineHeight;
    const { bounds } = opts;
    const stepY = h + 2;

    // 원래 자리에서 시작해 위·아래로 번갈아 가며 빈 자리를 찾는다
    for (let k = 0; k < 40; k++) {
      const dy = Math.ceil(k / 2) * stepY * (k % 2 === 0 ? 1 : -1);
      const y = preferredY + dy;
      if (y < bounds.top || y + h > bounds.bottom) continue;

      const box = { left: x, right: x + w, top: y, bottom: y + h };
      if (!this.overlaps(box)) {
        this.used.push(box);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x, y);
        return;
      }
    }

    // 빈 자리를 못 찾으면 원래 자리에 그대로 둔다 (열은 유지)
    this.used.push({ left: x, right: x + w, top: preferredY, bottom: preferredY + h });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, preferredY);
  }

  /**
   * (cx, cy) 근처에 라벨을 놓는다.
   *
   * 가까운 후보부터 8방향으로 시도하고, 다 막히면 거리를 늘려 다시 돈다.
   * 그래도 안 되면 마지막 후보에 놓고 유도선을 긋는다.
   *
   * @param bounds 라벨이 벗어나면 안 되는 영역 (플롯 영역)
   */
  place(
    ctx: CanvasRenderingContext2D,
    label: string,
    cx: number,
    cy: number,
    opts: {
      gap: number; lineHeight: number; bounds: LabelBox;
      /**
       * 8방향 세 거리가 다 막혔을 때 유도선부터 긋지 않고 **더 넓게 찾는다** (2.2.1, exam 산점).
       * 위·아래·옆에서 반 칸씩 비킨 자리, 영역 밖으로 나간 후보를 영역 안으로 당긴 자리까지
       * 점에서 가까운 순으로 본다. 그래도 없으면 **가장 덜 겹치는** 자리에 놓는다 —
       * 첫 후보(남의 이름 위일 수 있다)에 놓지 않는다.
       */
      wide?: boolean;
      /**
       * 시험지 점 이름 (2.2.2, exam 산점). 줄 높이 상자 대신 **실제 잉크**로 자리를 잡는다 —
       * 줄 높이 상자는 글자 위아래에 빈 데가 있어 이름이 점에서 떠 보이고, 틀에 닿아도 모른다.
       * - 점 **옆**(오른쪽·왼쪽 가운데)을 먼저 본다 — 시험지는 이름을 점 옆에 붙인다.
       * - 영역 가장자리(틀 선)에서 `clearance` 만큼 띄운다.
       * - 놓인 잉크가 점 **가장자리**(반지름 `r`)에서 잉크 높이의 `leaderAt` 배보다 멀면
       *   유도선(`t.leader`)으로 잇는다.
       */
      ink?: { clearance: number; leaderAt: number; r: number };
    }
  ) {
    const w = ctx.measureText(label).width;
    // 잉크 모드: 상자는 잉크 윗끝~아랫끝, 「top」 기준선에서 inkTop 만큼 아래가 잉크 윗끝이다
    let inkTop = 0;
    let h = opts.lineHeight;
    if (opts.ink) {
      ctx.textBaseline = 'top';
      const e = inkExtent(ctx, label);
      inkTop = -e.up;
      h = e.up + e.down;
    }
    const { gap } = opts;
    const c = opts.ink?.clearance ?? 0;
    const bounds = { left: opts.bounds.left + c, right: opts.bounds.right - c, top: opts.bounds.top + c, bottom: opts.bounds.bottom - c };
    const draw = (x: number, y: number) => {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x, y - inkTop);
    };
    /** 잉크가 점에서 너무 멀면 유도선 — 잉크 모드에서만 */
    const leaderIfFar = (x: number, y: number) => {
      if (!opts.ink) return;
      const dx = Math.max(x - cx, 0, cx - (x + w));
      const dy = Math.max(y - cy, 0, cy - (y + h));
      if (Math.hypot(dx, dy) - opts.ink.r > h * opts.ink.leaderAt) this.leaderLine(ctx, cx, cy, x, y, w, h);
    };

    // 가까운 곳부터 — 오른쪽 위를 먼저 본다(기존 기본 위치). 잉크 모드(시험지)는 옆부터
    const dirs: [number, number][] = opts.ink
      ? [[1, 0], [-1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [0, 1]]
      : [
        [1, -1], [1, 0], [0, -1], [-1, -1],
        [-1, 0], [0, 1], [1, 1], [-1, 1],
      ];

    let fallback: { x: number; y: number } | null = null;

    for (const dist of [gap, gap * 2, gap * 3.5]) {
      for (const [dx, dy] of dirs) {
        // 대각 자리는 잉크 모드에서 가로·세로를 0.7 배로 — 모서리까지 거리가 옆 자리와 같다
        const dd = opts.ink && dx !== 0 && dy !== 0 ? dist * Math.SQRT1_2 : dist;
        const x = cx + dx * dd - (dx < 0 ? w : dx === 0 ? w / 2 : 0);
        let y = cy + dy * dd - (dy > 0 ? 0 : dy === 0 ? h / 2 : h);
        // 잉크 모드의 옆 자리는 틀 안으로 위아래만 당긴다 — 틀에 붙은 점도 이름이 옆에 남는다
        // (대각으로 비키면 점에서 떠 보인다). 점 높이는 여전히 이름 잉크 안에 든다
        if (opts.ink && dy === 0) y = Math.max(bounds.top, Math.min(y, bounds.bottom - h));
        const box = { left: x, right: x + w, top: y, bottom: y + h };

        if (box.left < bounds.left || box.right > bounds.right) continue;
        if (box.top < bounds.top || box.bottom > bounds.bottom) continue;

        if (!this.overlaps(box)) {
          this.used.push(box);
          leaderIfFar(x, y);
          draw(x, y);
          return;
        }
        if (!fallback) fallback = { x, y };
      }
    }

    if (opts.wide) {
      const spot = this.wideSearch(cx, cy, w, h, gap, bounds);
      this.used.push({ left: spot.x, right: spot.x + w, top: spot.y, bottom: spot.y + h });
      if (opts.ink) {
        leaderIfFar(spot.x, spot.y);
      } else {
        // 점에서 떨어져 놓였으면(가장 가까운 변까지 gap 의 두 배 넘게) 유도선으로 잇는다
        const dx = Math.max(spot.x - cx, 0, cx - (spot.x + w));
        const dy = Math.max(spot.y - cy, 0, cy - (spot.y + h));
        if (Math.hypot(dx, dy) > gap * 2) this.leaderLine(ctx, cx, cy, spot.x, spot.y, w, h);
      }
      draw(spot.x, spot.y);
      return;
    }

    // 다 막혔다 — 가장 먼 자리에 놓고 유도선을 긋는다.
    // 어느 후보도 영역 안에 못 들었으면(이름이 길다 — exam 은 글자가 크다) 영역 안으로 당긴다
    const far = fallback ?? {
      x: Math.max(bounds.left, Math.min(cx + gap, bounds.right - w)),
      y: Math.max(bounds.top, Math.min(cy - h, bounds.bottom - h)),
    };
    const box = { left: far.x, right: far.x + w, top: far.y, bottom: far.y + h };
    this.used.push(box);

    ctx.save();
    ctx.strokeStyle = this.leader.color;
    ctx.lineWidth = this.leader.width;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(far.x + w / 2, far.y + h / 2);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, far.x, far.y);
  }

  /** 겹친 넓이의 합 */
  private overlapArea(box: LabelBox): number {
    let a = 0;
    for (const u of this.used) {
      const ox = Math.min(box.right, u.right) - Math.max(box.left, u.left);
      const oy = Math.min(box.bottom, u.bottom) - Math.max(box.top, u.top);
      if (ox >= 0 && oy >= 0) a += Math.max(ox, 0.5) * Math.max(oy, 0.5);
    }
    return a;
  }

  /**
   * 점 둘레의 자리를 넓게 훑는다 — 가로 일곱 자리 × 세로 일곱 자리 × 네 거리,
   * 영역 밖이면 안으로 당긴다. 점(상자 중심)에서 가까운 순으로 첫 빈자리,
   * 빈자리가 없으면 가장 덜 겹치는 자리.
   */
  private wideSearch(
    cx: number, cy: number, w: number, h: number, gap: number, bounds: LabelBox,
  ): { x: number; y: number } {
    const seen = new Set<string>();
    const cands: { x: number; y: number; d: number }[] = [];
    for (const dist of [gap, gap * 2, gap * 3.5, gap * 5]) {
      // 상자 왼쪽 끝 — 오른쪽 옆 / 왼쪽 옆 / 가운데 / 반의반씩 비킨 자리
      const xs = [cx + dist, cx - dist - w, cx - w / 2, cx - w * 0.25, cx - w * 0.75, cx, cx - w];
      // 상자 윗끝 — 위 / 아래 / 가운데 / 반씩 비킨 자리
      const ys = [cy - dist - h, cy + dist, cy - h / 2, cy - h * 0.25, cy - h * 0.75, cy, cy - h];
      for (const x0 of xs) for (const y0 of ys) {
        const x = Math.max(bounds.left, Math.min(x0, bounds.right - w));
        const y = Math.max(bounds.top, Math.min(y0, bounds.bottom - h));
        const key = `${Math.round(x)},${Math.round(y)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        cands.push({ x, y, d: Math.hypot(x + w / 2 - cx, y + h / 2 - cy) });
      }
    }
    cands.sort((a, b) => a.d - b.d);
    let best = cands[0];
    let bestArea = Infinity;
    for (const c of cands) {
      const area = this.overlapArea({ left: c.x, right: c.x + w, top: c.y, bottom: c.y + h });
      if (area === 0) return c;
      if (area < bestArea) { best = c; bestArea = area; }
    }
    return best;
  }

  private leaderLine(ctx: CanvasRenderingContext2D, cx: number, cy: number, x: number, y: number, w: number, h: number) {
    ctx.save();
    ctx.strokeStyle = this.leader.color;
    ctx.lineWidth = this.leader.width;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    // 상자 가장자리에서 멈춘다 — 글자 위로 선이 지나지 않게
    const tx = Math.max(x, Math.min(cx, x + w));
    const ty = Math.max(y, Math.min(cy, y + h));
    ctx.lineTo(tx === cx && ty === cy ? x + w / 2 : tx, tx === cx && ty === cy ? y + h / 2 : ty);
    ctx.stroke();
    ctx.restore();
  }
}

// ── 눈금 라벨 겹침 방지 ─────────────────────────────────────

/**
 * 눈금 라벨을 몇 개 걸러 그릴지 정한다.
 *
 * 축 범위가 좁거나 칸이 많으면 숫자가 서로 붙어 읽을 수 없게 된다.
 * 라벨 크기와 눈금 간격을 재서, 겹치지 않는 최소 간격(stride)을 돌려준다.
 * 1이면 전부 그려도 된다는 뜻이다.
 *
 * 눈금 표시(작은 선)는 그대로 두고 숫자만 솎아낸다 — 축의 눈금 간격 자체는
 * 그래프가 읽히는 근거이므로 없애면 안 된다.
 *
 * @param spacing 이웃한 눈금 사이의 픽셀 거리
 * @param extent  라벨이 축 방향으로 차지하는 크기 (가로축이면 글자 너비, 세로축이면 줄 높이)
 */
export function labelStride(spacing: number, extent: number, minGap = 6): number {
  if (!Number.isFinite(spacing) || spacing <= 0) return 1;
  return Math.max(1, Math.ceil((extent + minGap) / spacing));
}

/** 눈금 라벨들 중 가장 넓은 글자 너비 */
export function widestLabel(ctx: CanvasRenderingContext2D, labels: string[]): number {
  if (labels.length === 0) return 0;
  return Math.max(...labels.map((l) => ctx.measureText(l).width));
}

/**
 * 채움 위 글자. `light` 는 «검은 글자가 읽히는 바탕» 이다.
 *
 * 어두운 바탕에서 classic 은 흰 글자, exam 은 검은 글자 + 흰 테두리다(실측 §1.3).
 * `haloOnLight` 를 주면 밝은 바탕에도 흰 테두리를 두른다 — 1.7.0 누적 막대의
 * 빗금·점무늬 칸 글자가 그랬다.
 */
export function inkText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number | undefined,
  light: boolean,
  st: StyleTokens,
  haloOnLight = false,
): void {
  const halo = light ? haloOnLight : st.darkLabel === 'halo';
  if (!light && !halo) {
    ctx.fillStyle = '#fff';
    put(ctx, 'fill', text, x, y, maxW);
    return;
  }
  if (halo) {
    ctx.save();
    ctx.lineWidth = st.haloWidth;
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    put(ctx, 'stroke', text, x, y, maxW);
    ctx.restore();
  }
  ctx.fillStyle = '#000';
  put(ctx, 'fill', text, x, y, maxW);
}

/** maxW 가 없으면 넷째 인자를 아예 넘기지 않는다 — undefined 를 넘기면 백엔드에 따라 안 그려진다 */
function put(ctx: CanvasRenderingContext2D, kind: 'fill' | 'stroke', text: string, x: number, y: number, maxW?: number) {
  if (kind === 'fill') {
    if (maxW === undefined) ctx.fillText(text, x, y);
    else ctx.fillText(text, x, y, maxW);
  } else if (maxW === undefined) ctx.strokeText(text, x, y);
  else ctx.strokeText(text, x, y, maxW);
}
