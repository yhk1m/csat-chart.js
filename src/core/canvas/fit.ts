// © 2026 김용현
// 글자를 캔버스 안에 넣는 공통 계산.
//
// 시험지 그림에서 **이름을 잘라 「…」로 끝내는 것은 답이 아니다.** 「서울특별시」와
// 「서울특별시 강남구」가 같은 「서울특별…」로 보이면 문항 자체가 틀린다. 그래서
// 자리가 모자랄 때 쓸 수 있는 수는 넷뿐이고, 순서가 있다.
//
//  1. **여백을 넓힌다** — 글자가 놓일 자리를 그만큼 비우고 그림을 줄인다.
//  2. **줄을 늘린다** — 여백을 더 못 넓힐 때 이름을 여러 줄로 접는다.
//  3. **글꼴을 줄인다** — 그 글자에 한해, 바닥(`MIN_SCALE`)까지만.
//  4. **밀어 넣는다** — 여백에 떠 있는 글자(축 위 단위·유도선 붙은 이름)는
//     옆으로 밀어도 자료를 가리지 않는다. 이때도 글자는 통째로 남는다.
//
// 이 파일은 그 넷을 재는 자다. 어느 수를 쓸지는 그래프마다 다르므로 각 렌더러가
// 정한다.

/** 글꼴은 원래 크기의 이만큼까지만 줄인다. 더 줄이면 시험지에서 읽기 어렵다. */
export const MIN_SCALE = 0.7;

/** 캔버스 가장자리에서 이만큼은 띄운다 (글자 가장자리 안티에일리어싱 여유) */
export const EDGE = 1;

export interface TextExtent {
  /** 기준점에서 왼쪽으로 뻗은 길이 */
  left: number;
  /** 기준점에서 오른쪽으로 뻗은 길이 */
  right: number;
  /** 기준점에서 위로 뻗은 길이 */
  up: number;
  /** 기준점에서 아래로 뻗은 길이 */
  down: number;
}

/**
 * 지금 `ctx.font`·`textAlign`·`textBaseline` 으로 그렸을 때 글자가 기준점
 * 둘레로 뻗는 길이.
 *
 * **가로는 `actualBoundingBoxLeft/Right` 를 쓰지 않고 보내는 폭(`width`)으로
 * 잰다.** 글꼴 대체가 일어나면 그 두 값이 «첫 글꼴 조각만» 재는 구현이 있다 —
 * @napi-rs/canvas 가 그렇다. 「평년 대비 강수량 차이(mm)」의 `width` 는 338.1
 * 인데 `actualBoundingBoxRight` 는 한글 부분만 센 275.2 를 돌려준다. 그 값을
 * 믿으면 「(mm)」 이 캔버스 밖으로 나가는데도 들어갔다고 판단한다. `width` 는
 * 조각 수와 무관하게 늘 옳고, 잉크보다 조금 넉넉하니 안전한 쪽으로 틀린다.
 *
 * 세로는 **글자마다 따로 재서** 가장 높은·낮은 것을 취한다. 한 글자는 언제나
 * 한 조각이므로 같은 함정에 빠지지 않는다.
 */
export function textExtent(ctx: CanvasRenderingContext2D, text: string): TextExtent {
  const m = ctx.measureText(text);
  const w = m.width;
  const left = ctx.textAlign === 'right' || ctx.textAlign === 'end' ? w
    : ctx.textAlign === 'center' ? w / 2 : 0;

  const size = fontSizeOf(ctx.font);
  let up = ctx.textBaseline === 'top' ? 0 : ctx.textBaseline === 'middle' ? size * 0.5 : size * 0.8;
  let down = size - up;
  if (m.actualBoundingBoxAscent != null) {
    up = 0;
    down = 0;
    for (const ch of text) {
      if (!ch.trim()) continue;
      const cm = ctx.measureText(ch);
      up = Math.max(up, cm.actualBoundingBoxAscent);
      down = Math.max(down, cm.actualBoundingBoxDescent);
    }
  }
  return { left, right: w - left, up, down };
}

/** `'bold 28px ...'` 에서 28 을 뽑는다. 못 읽으면 16. */
function fontSizeOf(font: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  return m ? parseFloat(m[1]) : 16;
}

/**
 * 캔버스 안으로 **밀어 넣은** 기준점.
 *
 * 이미 안에 들어 있으면 받은 좌표를 **그대로** 돌려준다 — 멀쩡한 그림이
 * 움직이지 않게 하는 성질이 여기 걸려 있다.
 *
 * 글자가 캔버스보다 넓거나 높으면 한쪽만 맞춘다. 그런 글자는 밀어서 될 일이
 * 아니므로 부르는 쪽이 먼저 `shrinkToWidth` 로 줄여야 한다.
 */
export function nudgeInside(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  margin: number = EDGE,
): { x: number; y: number } {
  const e = textExtent(ctx, text);
  let nx = x;
  let ny = y;
  if (x - e.left < margin) nx = margin + e.left;
  else if (x + e.right > canvasW - margin) nx = canvasW - margin - e.right;
  if (y - e.up < margin) ny = margin + e.up;
  else if (y + e.down > canvasH - margin) ny = canvasH - margin - e.down;
  return { x: nx, y: ny };
}

/**
 * 주어진 폭에 들어가도록 줄인 글꼴 크기. 바닥은 `size * MIN_SCALE`.
 *
 * 바닥에서도 안 들어가면 바닥 값을 돌려준다 — 자르지는 않는다.
 */
export function shrinkToWidth(
  ctx: CanvasRenderingContext2D,
  texts: string[],
  size: number,
  available: number,
  makeFont: (size: number) => string,
  minScale: number = MIN_SCALE,
): number {
  if (available <= 0 || texts.length === 0) return size;
  const saved = ctx.font;
  ctx.font = makeFont(size);
  const w = Math.max(...texts.map((t) => ctx.measureText(t).width));
  ctx.font = saved;
  if (w <= available) return size;
  return Math.max(size * minScale, size * (available / w));
}

/**
 * 이름을 주어진 폭 안에 들어가도록 여러 줄로 접는다.
 *
 * 공백에서 먼저 접고, 한 낱말이 통째로 넘치면 글자 단위로 접는다. 한글은
 * 낱말 사이에만 공백이 있어 글자 단위 접기가 실제로 필요하다
 * (「지역내총생산」 한 낱말이 벌써 여섯 글자다).
 *
 * 폭이 0 이하면 접지 않는다 — 부르는 쪽이 재기 전이라는 뜻이다.
 */
export function wrapToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (maxWidth <= 0 || !text) return [text];
  if (ctx.measureText(text).width <= maxWidth) return [text];

  const lines: string[] = [];
  let line = '';
  const flush = () => { if (line) { lines.push(line); line = ''; } };

  for (const word of text.split(/(\s+)/)) {
    if (/^\s+$/.test(word)) {
      if (line) line += word;
      continue;
    }
    const trial = line ? line + word : word;
    if (ctx.measureText(trial).width <= maxWidth) { line = trial; continue; }
    flush();
    if (ctx.measureText(word).width <= maxWidth) { line = word; continue; }
    // 한 낱말이 통째로 넘친다 — 글자 단위로 자른다
    for (const ch of word) {
      const t2 = line + ch;
      if (line && ctx.measureText(t2).width > maxWidth) { flush(); line = ch; }
      else line = t2;
    }
  }
  flush();
  return lines.length > 0 ? lines : [text];
}

/** 여러 줄 중 가장 넓은 줄의 폭 */
export function widestLine(ctx: CanvasRenderingContext2D, lines: string[]): number {
  if (lines.length === 0) return 0;
  return Math.max(...lines.map((l) => ctx.measureText(l).width));
}

/**
 * 여러 줄을 (x, y)를 **세로 가운데**로 삼아 그린다.
 * 한 줄이면 `fillText(text, x, y)` 와 좌표가 정확히 같다.
 */
export function fillLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  const top = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, top + i * lineHeight);
}

/**
 * 여백에 떠 있는 글자를 그린다.
 *
 * 캔버스보다 넓으면 글꼴을 줄이고, 가장자리를 넘으면 안쪽으로 민다. **옆으로
 * 밀어도 자료를 가리지 않는 자리**에만 쓴다 — 축 위 단위, 축 아래 이름처럼
 * 플롯 바깥 여백에 놓이는 글자다. 이미 안에 들어 있으면 좌표가 그대로다.
 */
export function drawFloatingLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  fontSize: number,
  makeFont: (size: number) => string,
) {
  if (!text) return;
  ctx.font = makeFont(shrinkToWidth(ctx, [text], fontSize, canvasW - EDGE * 2, makeFont));
  const at = nudgeInside(ctx, text, x, y, canvasW, canvasH);
  ctx.fillText(text, at.x, at.y);
}

/**
 * 여러 줄 묶음(가운데가 `x, y`)을 캔버스 안으로 밀어 넣은 기준점.
 * `ctx.font`·`textAlign`·`textBaseline` 이 그릴 때와 같아야 한다.
 */
export function nudgeLinesInside(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  canvasW: number,
  canvasH: number,
  margin: number = EDGE,
): { x: number; y: number } {
  if (lines.length === 0) return { x, y };
  const es = lines.map((l) => textExtent(ctx, l));
  const half = ((lines.length - 1) * lineHeight) / 2;
  const left = Math.max(...es.map((e) => e.left));
  const right = Math.max(...es.map((e) => e.right));
  const up = half + Math.max(...es.map((e) => e.up));
  const down = half + Math.max(...es.map((e) => e.down));
  let nx = x;
  let ny = y;
  if (x - left < margin) nx = margin + left;
  else if (x + right > canvasW - margin) nx = canvasW - margin - right;
  if (y - up < margin) ny = margin + up;
  else if (y + down > canvasH - margin) ny = canvasH - margin - down;
  return { x: nx, y: ny };
}

/**
 * 여러 줄 묶음의 **세로 가운데**를 캔버스 안으로 민 값.
 * `ctx.font`·`textBaseline` 이 그릴 때와 같아야 한다.
 */
export function clampLinesMiddle(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  mid: number,
  lineHeight: number,
  canvasH: number,
  margin: number = EDGE,
): number {
  if (lines.length === 0) return mid;
  const half = ((lines.length - 1) * lineHeight) / 2;
  const up = Math.max(...lines.map((l) => textExtent(ctx, l).up));
  const down = Math.max(...lines.map((l) => textExtent(ctx, l).down));
  if (mid - half - up < margin) return margin + half + up;
  if (mid + half + down > canvasH - margin) return canvasH - margin - half - down;
  return mid;
}

/**
 * `fits(size)` 가 참이 되는 가장 큰 크기를 찾는다 (`lo`~`hi` 사이, 이분 탐색).
 *
 * 방사형의 반지름·정육면체의 배율처럼 **키우면 글자가 바깥으로 나가는** 값에
 * 쓴다. `hi` 에서 이미 들어가면 `hi` 를 그대로 돌려주므로, 멀쩡한 그림은
 * 한 픽셀도 움직이지 않는다.
 */
export function largestFitting(
  lo: number,
  hi: number,
  fits: (v: number) => boolean,
  steps: number = 24,
): number {
  if (fits(hi)) return hi;
  let a = lo;
  let b = hi;
  for (let i = 0; i < steps; i++) {
    const mid = (a + b) / 2;
    if (fits(mid)) a = mid;
    else b = mid;
  }
  return a;
}
