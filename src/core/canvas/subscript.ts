// © 2026 김용현
// 아래 첨자 — `D_1` 을 D₁ 로 그린다.
//
// 캔버스에는 첨자라는 것이 없다. 유니코드 첨자 문자(₁·ₓ)를 쓰는 길도 있지만
// 명조 글꼴마다 있고 없고가 갈려 없는 글꼴에서는 네모로 떨어지고, 있더라도
// 크기와 내려앉은 자리를 시험지에 맞출 수 없다. 그래서 **작은 글꼴로 한 번 더
// 그려** 만든다.
//
// ── 표기를 밑줄(`_`)로 고른 까닭 ─────────────────────────────────────────
// 시험지 그림의 이름은 한글·괄호·쉼표·기호로 되어 있고, 실물 열여섯 장 어디에도
// 밑줄이 나오지 않는다. `^`·`~`·`<>`·`{}` 는 「<X재 시장>」처럼 실제로 쓰이는
// 글자와 부딪히고, 「(가)」의 괄호도 마찬가지다. 밑줄은 `D_1` 이라는 수식 표기로
// 이미 널리 읽히기까지 한다.
//
// 게다가 규칙을 **밑줄 + 영문자·숫자** 로 좁혀 두어, 그 밖의 글자 앞에 선
// 밑줄은 밑줄 그대로 남는다. 한글 이름에 밑줄을 쓰는 사람이 있어도(「강원_춘천」)
// 첨자로 끌려가지 않는다.
//
//   `D_1` → D₁      `P_2` → P₂       `E_Y` → E 뒤에 Y 가 첨자
//   `수량_2024년` → 「2024」가 첨자, 「년」은 제자리
//   `강원_춘천` → 밑줄 그대로 (한글 앞이라 첨자가 아니다)
//
// 첨자가 없는 글은 **옛 길로 그대로 흘려보낸다** — `fit.ts` 의 같은 함수를
// 부른다. 1.4.0 까지의 그림이 한 픽셀도 안 움직여야 하기 때문이다.
import { EDGE, MIN_SCALE, drawFloatingLabel, textExtent, type TextExtent } from './fit';

/** 글 한 도막 — 첨자인지 아닌지가 붙는다 */
export interface RichRun {
  text: string;
  sub: boolean;
}

/**
 * 첨자 글꼴의 크기 배율.
 *
 * 실물의 「D₁」에서 잰 값이다 — 숫자 1 의 높이가 D 의 0.65배쯤이다.
 */
export const SUB_SCALE = 0.65;

/** 첨자를 아래로 내리는 거리 (원래 글꼴 크기에 대한 비율) */
export const SUB_DROP = 0.16;

/** 밑줄 뒤에서 첨자가 될 수 있는 글자 */
const SUB_CHARS = /[0-9A-Za-z]/;
/** 첨자가 들어 있는 글인지 — 한 번의 정규식으로 본다 */
const HAS_SUB = /_[0-9A-Za-z]/;

/** 첨자 표기가 들어 있는지 */
export function hasSubscript(text: string): boolean {
  return HAS_SUB.test(text);
}

/**
 * 글을 «보통 글»과 «첨자» 도막으로 가른다.
 *
 * 첨자가 없으면 통째로 한 도막을 돌려준다 — 부르는 쪽이 그 모양을 보고 옛
 * 길로 빠진다.
 */
export function parseRich(text: string): RichRun[] {
  if (!HAS_SUB.test(text)) return [{ text, sub: false }];

  const runs: RichRun[] = [];
  let plain = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '_' && i + 1 < text.length && SUB_CHARS.test(text[i + 1])) {
      let j = i + 1;
      while (j < text.length && SUB_CHARS.test(text[j])) j++;
      if (plain) {
        runs.push({ text: plain, sub: false });
        plain = '';
      }
      runs.push({ text: text.slice(i + 1, j), sub: true });
      i = j - 1;
      continue;
    }
    plain += text[i];
  }
  if (plain) runs.push({ text: plain, sub: false });
  return runs;
}

/** 첨자 없는 한 도막인지 — 옛 길로 흘려보낼 수 있는 글인지 본다 */
function isPlain(runs: RichRun[]): boolean {
  return runs.length === 1 && !runs[0].sub;
}

/**
 * 첨자까지 **합친** 글의 폭. `ctx.font` 은 이 함수가 정해 놓고 나온다.
 *
 * 여백을 잡는 쪽·선 이름 자리를 고르는 쪽·범례 폭을 재는 쪽이 모두 이것을
 * 불러야 한다. 원문(`'D_1'`)을 그대로 재면 밑줄 한 칸만큼 넓게 잡히고, 첨자를
 * 지운 글자(`'D1'`)를 재면 좁게 잡힌다.
 */
export function richWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  makeFont: (size: number) => string,
): number {
  const runs = parseRich(text);
  const base = makeFont(size);
  if (isPlain(runs)) {
    ctx.font = base;
    return ctx.measureText(text).width;
  }
  const sub = makeFont(size * SUB_SCALE);
  let w = 0;
  for (const r of runs) {
    ctx.font = r.sub ? sub : base;
    w += ctx.measureText(r.text).width;
  }
  ctx.font = base;
  return w;
}

/**
 * 첨자까지 합친 글이 기준점 둘레로 뻗는 길이.
 *
 * `textExtent` 와 같은 규약이다 — 지금 `ctx.textAlign`·`ctx.textBaseline` 으로
 * 그렸을 때를 잰다. 첨자는 아래로 내려앉으므로 `down` 이 그만큼 늘고 `up` 은
 * 준다.
 */
export function richExtent(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  makeFont: (size: number) => string,
): TextExtent {
  const runs = parseRich(text);
  const base = makeFont(size);
  if (isPlain(runs)) {
    ctx.font = base;
    return textExtent(ctx, text);
  }

  const subFont = makeFont(size * SUB_SCALE);
  const drop = size * SUB_DROP;
  let w = 0;
  let up = 0;
  let down = 0;
  for (const r of runs) {
    ctx.font = r.sub ? subFont : base;
    const e = textExtent(ctx, r.text);
    w += e.left + e.right;
    up = Math.max(up, r.sub ? e.up - drop : e.up);
    down = Math.max(down, r.sub ? e.down + drop : e.down);
  }
  ctx.font = base;
  const left = ctx.textAlign === 'right' || ctx.textAlign === 'end' ? w
    : ctx.textAlign === 'center' ? w / 2 : 0;
  return { left, right: w - left, up, down };
}

/**
 * 첨자까지 합친 글을 그린다. `ctx.textAlign`·`ctx.textBaseline` 을 지킨다.
 *
 * 도막마다 `textAlign: 'left'` 로 바꿔 놓고 왼쪽부터 차례로 찍는다 — 그래야
 * 도막 사이가 벌어지지 않는다. 정렬 값은 그리고 나서 되돌린다.
 */
export function fillRich(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  makeFont: (size: number) => string,
): void {
  const runs = parseRich(text);
  const base = makeFont(size);
  if (isPlain(runs)) {
    ctx.font = base;
    ctx.fillText(text, x, y);
    return;
  }

  const subFont = makeFont(size * SUB_SCALE);
  const drop = size * SUB_DROP;
  let total = 0;
  for (const r of runs) {
    ctx.font = r.sub ? subFont : base;
    total += ctx.measureText(r.text).width;
  }

  const align = ctx.textAlign;
  let cx = align === 'right' || align === 'end' ? x - total
    : align === 'center' ? x - total / 2 : x;
  ctx.textAlign = 'left';
  for (const r of runs) {
    ctx.font = r.sub ? subFont : base;
    ctx.fillText(r.text, cx, r.sub ? y + drop : y);
    cx += ctx.measureText(r.text).width;
  }
  ctx.textAlign = align;
  ctx.font = base;
}

/**
 * 첨자까지 합친 글을 주어진 폭에 넣도록 줄인 글꼴 크기.
 * `shrinkToWidth` 와 같은 규약이고, 바닥도 같다.
 */
export function shrinkRichToWidth(
  ctx: CanvasRenderingContext2D,
  texts: string[],
  size: number,
  available: number,
  makeFont: (size: number) => string,
  minScale: number = MIN_SCALE,
): number {
  if (available <= 0 || texts.length === 0) return size;
  const saved = ctx.font;
  const w = Math.max(...texts.map((t) => richWidth(ctx, t, size, makeFont)));
  ctx.font = saved;
  if (w <= available) return size;
  return Math.max(size * minScale, size * (available / w));
}

/** 첨자까지 합친 글을 캔버스 안으로 밀어 넣은 기준점 */
export function nudgeRichInside(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  size: number,
  makeFont: (size: number) => string,
  margin: number = EDGE,
): { x: number; y: number } {
  const e = richExtent(ctx, text, size, makeFont);
  let nx = x;
  let ny = y;
  if (x - e.left < margin) nx = margin + e.left;
  else if (x + e.right > canvasW - margin) nx = canvasW - margin - e.right;
  if (y - e.up < margin) ny = margin + e.up;
  else if (y + e.down > canvasH - margin) ny = canvasH - margin - e.down;
  return { x: nx, y: ny };
}

/**
 * 여백에 떠 있는 글자를 첨자까지 살려 그린다.
 *
 * 첨자가 없으면 `drawFloatingLabel` 을 **그대로** 부른다. 1.4.0 이 그린 그림이
 * 한 픽셀도 안 움직여야 하므로, 같은 결과를 다시 계산하지 않고 같은 코드를
 * 지나가게 한다.
 */
export function drawFloatingRich(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  fontSize: number,
  makeFont: (size: number) => string,
): void {
  if (!text) return;
  if (!HAS_SUB.test(text)) {
    drawFloatingLabel(ctx, text, x, y, canvasW, canvasH, fontSize, makeFont);
    return;
  }
  const size = shrinkRichToWidth(ctx, [text], fontSize, canvasW - EDGE * 2, makeFont);
  const at = nudgeRichInside(ctx, text, x, y, canvasW, canvasH, size, makeFont);
  fillRich(ctx, text, at.x, at.y, size, makeFont);
}
