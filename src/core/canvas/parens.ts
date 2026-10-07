// © 2026 김용현
// 괄호를 따로 찍는 글줄 — 시험지는 `(통계청)`·`(만 명)`·`2020(년)`·`(가)` 의 괄호를
// 본문 명조(HY신명조 꼴)로 찍고, 한글 높이의 1.04 배로 한글 위아래에 가운데로 걸친다
// (실측 명세 §4 «괄호 높이»). 숫자는 숫자 글꼴, 한글은 그 자리 글꼴 그대로다.
//
// 글꼴 목록(CSS font stack)만으로는 «숫자 Garamond · 괄호 HY신명조 · 한글 HY중고딕» 을
// 만들 수 없다. 그래서 글줄을 괄호 조각과 나머지로 갈라 조각마다 따로 찍는다.
//
// 쓰는 길은 하나다 — 렌더러는 그리기 첫머리에서 `ctx = textCtx(ctx, options)` 로 ctx 를
// 감싼다. exam 이면 fillText·strokeText·measureText 가 이 파일의 fillMixed·measureMixed 로
// 가고(폭을 재서 맞추고 가운데 두는 계산도 같은 폭을 본다), classic 이면 받은 ctx 그대로라
// 1.7.0 그림이 한 픽셀도 달라지지 않는다.
//
// 숫자도 같은 길로 가른다 — 고딕·명조 자리(출처·각주·범례)의 `1991~2020년`·`(2023)` 의
// 숫자는 글꼴 목록 앞의 숫자 글꼴로 그려지지만 크기는 그 자리 크기라, 숫자 높이를 맞춘
// 숫자 자리(눈금·자료값)보다 낮다. exam 은 숫자 조각만 숫자 자리 크기(`numeralSize`)로
// 찍고 alphabetic 기준선을 본 글줄과 맞춘다.
import { styleOf } from './style';
import { numeralScaleOf, numeralSize, parenStackOf, fontStackOf, currentMeasurer, type FontOptions } from './renderer';

/** 괄호 잉크 높이 / 한글 잉크 높이 — 시험지 `(천만 명)` 실측 53/51px */
export const PAREN_HEIGHT = 1.04;

/** 높이·가운데를 잴 때 견주는 한글 */
const REF_HANGUL = '가';
const REF_PAREN = '(';

export interface Run {
  text: string;
  paren: boolean;
  /** 숫자 조각 — `splitRuns(text, true)` 에서만 붙는다 */
  digit?: true;
}

/** 숫자 조각 — 숫자 사이의 쉼표·점(`1,234.5`)까지 한 조각 */
const DIGIT_RUN = /[0-9]+(?:[.,][0-9]+)*/y;

/**
 * 괄호 조각·(digits 면) 숫자 조각·나머지를 차례로 가른다. 이어진 괄호는 한 조각이다.
 * `1991~2020년` → `1991` · `~` · `2020` · `년`.
 */
export function splitRuns(text: string, digits: boolean): Run[] {
  const runs: Run[] = [];
  let pos = 0; // UTF-16 위치
  while (pos < text.length) {
    if (digits) {
      DIGIT_RUN.lastIndex = pos;
      const m = DIGIT_RUN.exec(text);
      if (m) {
        runs.push({ text: m[0], paren: false, digit: true });
        pos += m[0].length;
        continue;
      }
    }
    const ch = String.fromCodePoint(text.codePointAt(pos)!);
    const paren = ch === '(' || ch === ')';
    const last = runs[runs.length - 1];
    if (last && !last.digit && last.paren === paren) last.text += ch;
    else runs.push({ text: ch, paren });
    pos += ch.length;
  }
  return runs;
}

/** `2020(년)` → `2020` · `(` · `년` · `)`. 이어진 괄호는 한 조각이다. */
export function splitParenRuns(text: string): Run[] {
  return splitRuns(text, false);
}

/** 한글이 든 글줄은 괄호를 그려지는 한글에 맞춘다 — 숫자 자리 배율(refScale)은 한글 없는 「(2024)」 에만 */
const HANGUL = /[가-힣]/;

const hasParen = (text: string) => text.includes('(') || text.includes(')');
const hasDigit = (text: string) => /[0-9]/.test(text);
/** 갈라 찍을 것이 있는가 — 숫자 조각 글꼴(digitFont)이 없으면 괄호만 본다 */
const needsSplit = (text: string, digitFont?: string | null) => hasParen(text) || (!!digitFont && hasDigit(text));

interface ParenFit {
  /** 괄호 조각의 글꼴 문자열 */
  font: string;
  /** 괄호 조각을 본 글줄 기준선에서 옮기는 세로 거리 (+ 아래) */
  dy: number;
}

/** `${ctx.font}|${baseline}|${stack}` → 괄호 글꼴·옮김 */
const fitCache = new Map<string, ParenFit>();

/** `${ctx.font}|${baseline}|${digitFont}` → 숫자 조각 세로 옮김 */
const digitDyCache = new Map<string, number>();

/** 잰 값을 버린다 — 글꼴이 새로 도착했을 때 (renderer.ts `resetDigitCache` 가 함께 부른다) */
export function resetParenCache(): void {
  fitCache.clear();
  digitDyCache.clear();
}

/** 지금 textBaseline 의 y 에서 alphabetic 기준선까지 (+ 아래) — `0` 의 잉크로 잰다 */
function baselineOf(ctx: CanvasRenderingContext2D, font: string): number {
  const baseline = ctx.textBaseline;
  ctx.font = font;
  const here = ctx.measureText('0').actualBoundingBoxAscent;
  ctx.textBaseline = 'alphabetic';
  const alpha = ctx.measureText('0').actualBoundingBoxAscent;
  ctx.textBaseline = baseline;
  return typeof here === 'number' && typeof alpha === 'number' ? alpha - here : 0;
}

/** 숫자 조각을 본 글줄과 같은 alphabetic 기준선에 두는 세로 옮김 */
function digitDy(ctx: CanvasRenderingContext2D, digitFont: string): number {
  const main = ctx.font;
  const key = `${main}|${ctx.textBaseline}|${digitFont}`;
  let dy = digitDyCache.get(key);
  if (dy === undefined) {
    dy = ctx.textBaseline === 'alphabetic' ? 0 : baselineOf(ctx, main) - baselineOf(ctx, digitFont);
    ctx.font = main;
    digitDyCache.set(key, dy);
  }
  return dy;
}

function inkOf(ctx: CanvasRenderingContext2D, ch: string): { up: number; down: number } | null {
  const m = ctx.measureText(ch);
  const up = m.actualBoundingBoxAscent;
  const down = m.actualBoundingBoxDescent;
  return typeof up === 'number' && typeof down === 'number' && up + down > 0 ? { up, down } : null;
}

/**
 * 지금 ctx.font 의 한글에 맞춘 괄호 글꼴과 세로 옮김. 글꼴 문자열 `<앞>NNpx <목록>` 에서
 * 크기 앞부분(굵기·기울임)은 괄호에도 그대로 붙인다. 잉크를 못 재는 ctx 에서는 같은
 * 크기·옮김 0.
 */
function parenFit(ctx: CanvasRenderingContext2D, stack: string, refScale = 1): ParenFit {
  const main = ctx.font;
  const key = `${main}|${ctx.textBaseline}|${stack}|${refScale}`;
  let fit = fitCache.get(key);
  if (fit) return fit;
  const m = /^(.*?)(\d+(?:\.\d+)?)px\b/.exec(main);
  const prefix = m ? m[1] : '';
  const px = m ? parseFloat(m[2]) : 16;
  const fontAt = (size: number) => `${prefix}${size}px ${stack}`;

  // 견줄 한글 — refScale 이 1 이 아니면(숫자 자리: 숫자 높이로 키운 px) 요청 크기에서 잰다
  if (refScale !== 1 && m) ctx.font = main.replace(m[0], `${prefix}${px * refScale}px`);
  const hangul = inkOf(ctx, REF_HANGUL);
  ctx.font = fontAt(px);
  const paren0 = inkOf(ctx, REF_PAREN);
  if (!hangul || !paren0) {
    fit = { font: fontAt(px), dy: 0 };
  } else {
    const size = px * PAREN_HEIGHT * (hangul.up + hangul.down) / (paren0.up + paren0.down);
    ctx.font = fontAt(size);
    const paren = inkOf(ctx, REF_PAREN) ?? paren0;
    const mid = (k: { up: number; down: number }) => (k.down - k.up) / 2;
    fit = { font: fontAt(size), dy: mid(hangul) - mid(paren) };
  }
  ctx.font = main;
  fitCache.set(key, fit);
  return fit;
}

interface Placed extends Run {
  /** 글줄 왼쪽 끝에서 이 조각 왼쪽 끝까지 */
  x: number;
  width: number;
  metrics: TextMetrics;
}

interface Layout {
  runs: Placed[];
  width: number;
  /** 조각의 글꼴·세로 옮김 */
  fontOf: (r: Run) => string;
  dyOf: (r: Run) => number;
}

/** 조각마다 폭을 재서 왼쪽부터 놓는다. ctx.font 는 원래대로 돌려놓는다. */
function layout(ctx: CanvasRenderingContext2D, text: string, stack: string, refScale = 1, digitFont?: string | null): Layout {
  const main = ctx.font;
  const align = ctx.textAlign;
  const fit = hasParen(text) ? parenFit(ctx, stack, refScale) : { font: main, dy: 0 };
  const ddy = digitFont ? digitDy(ctx, digitFont) : 0;
  const fontOf = (r: Run) => (r.paren ? fit.font : r.digit && digitFont ? digitFont : main);
  const dyOf = (r: Run) => (r.paren ? fit.dy : r.digit ? ddy : 0);
  ctx.textAlign = 'left';
  let x = 0;
  const runs: Placed[] = [];
  for (const r of splitRuns(text, !!digitFont)) {
    ctx.font = fontOf(r);
    const metrics = ctx.measureText(r.text);
    runs.push({ ...r, x, width: metrics.width, metrics });
    x += metrics.width;
  }
  ctx.font = main;
  ctx.textAlign = align;
  return { runs, width: x, fontOf, dyOf };
}

/** textAlign 이 가리키는 기준점 = 글줄 왼쪽 끝 + 이만큼 */
function alignOffset(align: CanvasTextAlign, width: number): number {
  if (align === 'center') return width / 2;
  if (align === 'right' || align === 'end') return width;
  return 0;
}

/**
 * `measureText` 와 같은 꼴의 값 — 폭은 조각 폭의 합, 잉크는 조각 잉크를 모은 것
 * (괄호는 옮긴 자리로). 괄호가 없으면 ctx.measureText 그대로.
 */
export function measureMixed(
  ctx: CanvasRenderingContext2D,
  text: string,
  stack: string,
  refScale = 1,
  /** 숫자 조각 글꼴 — 주면 숫자도 갈라 잰다 */
  digitFont?: string | null,
): TextMetrics {
  if (!needsSplit(text, digitFont)) return ctx.measureText(text);
  const { runs, width, dyOf } = layout(ctx, text, stack, refScale, digitFont);
  const a = alignOffset(ctx.textAlign, width);
  let left = Infinity;
  let right = -Infinity;
  let up = -Infinity;
  let down = -Infinity;
  for (const r of runs) {
    const m = r.metrics;
    const dy = dyOf(r);
    left = Math.min(left, r.x - (m.actualBoundingBoxLeft ?? 0));
    right = Math.max(right, r.x + (m.actualBoundingBoxRight ?? r.width));
    up = Math.max(up, (m.actualBoundingBoxAscent ?? 0) - dy);
    down = Math.max(down, (m.actualBoundingBoxDescent ?? 0) + dy);
  }
  const first = runs.find((r) => !r.paren && !r.digit)?.metrics ?? runs[0].metrics;
  return {
    width,
    actualBoundingBoxLeft: a - left,
    actualBoundingBoxRight: right - a,
    actualBoundingBoxAscent: up,
    actualBoundingBoxDescent: down,
    fontBoundingBoxAscent: first.fontBoundingBoxAscent,
    fontBoundingBoxDescent: first.fontBoundingBoxDescent,
  } as TextMetrics;
}

/**
 * `fillText`(stroke 면 `strokeText`)와 같은 자리에 같은 정렬로 그린다 — 괄호 조각만
 * 괄호 글꼴로, 한글 가운데에 맞춰 옮겨 찍는다. `maxWidth` 를 넘으면 글줄 전체를
 * 가로로 눌러 담는다(fillText 와 같은 동작).
 */
export function fillMixed(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  stack: string,
  maxWidth?: number,
  stroke = false,
  refScale = 1,
  /** 숫자 조각 글꼴 — 주면 숫자도 갈라 찍는다 */
  digitFont?: string | null,
): void {
  const draw = (t: string, dx: number, dy: number, mw?: number) => {
    if (stroke) {
      if (mw === undefined) ctx.strokeText(t, dx, dy);
      else ctx.strokeText(t, dx, dy, mw);
    } else if (mw === undefined) ctx.fillText(t, dx, dy);
    else ctx.fillText(t, dx, dy, mw);
  };
  if (!needsSplit(text, digitFont)) {
    draw(text, x, y, maxWidth);
    return;
  }
  const { runs, width, fontOf, dyOf } = layout(ctx, text, stack, refScale, digitFont);
  const squeeze = maxWidth !== undefined && maxWidth > 0 && width > maxWidth ? maxWidth / width : 1;
  const start = x - alignOffset(ctx.textAlign, width * squeeze);
  ctx.save();
  ctx.textAlign = 'left';
  if (squeeze < 1) {
    ctx.translate(start, 0);
    ctx.scale(squeeze, 1);
  }
  const x0 = squeeze < 1 ? 0 : start;
  for (const r of runs) {
    ctx.font = fontOf(r);
    draw(r.text, x0 + r.x, y + dyOf(r));
  }
  ctx.restore();
}

/**
 * 렌더러가 그리기 첫머리에 거는 ctx. 양식이 괄호를 따로 찍으면(exam) 글자 세 메서드만
 * 갈라 그리는 감싼 ctx 를, 아니면(classic) 받은 ctx 를 그대로 돌려준다.
 *
 * 나머지 속성·메서드는 원래 ctx 로 넘긴다 — 브라우저의 CanvasRenderingContext2D 는
 * getter 를 다른 this 로 부르면 던지므로, 읽기·쓰기 모두 원래 객체를 this 로 쓴다.
 */
export function textCtx(ctx: CanvasRenderingContext2D, o: FontOptions): CanvasRenderingContext2D {
  if (!styleOf(o).separateParens) return ctx;
  const stack = parenStackOf(o);
  // 숫자 자리(숫자 높이로 키운 px)의 한글 없는 글줄이면 괄호는 요청 크기의 한글에 맞춘다.
  // 렌더러가 건 글꼴 문자열로 본다 — 캔버스가 ctx.font 를 고쳐 쓰므로(따옴표 등) 걸 때 기억한다
  // 캔버스가 고쳐 쓴 ctx.font → 그 배율. save/restore 로 글꼴이 돌아와도 맞는 값을 찾는다
  const scales = new Map<string, number>();
  const refScale = (t: string) => (HANGUL.test(t) ? 1 : scales.get(ctx.font) ?? 1);

  // 숫자 조각 글꼴 — 고딕·명조 자리 글꼴(숫자 글꼴이 앞에 붙은 목록, 숫자 높이를 맞추지
  // 않은 px)이면 숫자만 숫자 자리 크기로. 렌더러가 건 글꼴 문자열(캔버스가 고쳐 쓰기 전)로 본다.
  const tok = styleOf(o);
  const numeralList = o.fontStack?.numeral || tok.stack.numeral;
  const numeralStack = fontStackOf(o, 'numeral');
  const digitFonts = new Map<string, string | null>();
  const digitFontOf = (raw: string): string | null => {
    if (!tok.digitHeight || !numeralList || numeralScaleOf(raw) !== 1) return null;
    const m = /^(.*?)(\d+(?:\.\d+)?)px\s+(.*)$/.exec(raw);
    if (!m || !m[3].startsWith(numeralList)) return null;
    const px = parseFloat(m[2]);
    // 잴 ctx 는 감싸지 않은 원래 것 — 감싼 ctx 로 재면 글꼴 쓰기가 여기로 되돌아온다.
    // 그리기 밖(잴 ctx 없음)이면 textFont 처럼 키우지 않는다
    if (!currentMeasurer().ctx) return null;
    const size = numeralSize(px, m[1].trim() || 'normal', numeralStack, tok.digitHeight, ctx);
    return size !== px ? `${m[1]}${size}px ${numeralStack}` : null;
  };
  const digitFont = () => digitFonts.get(ctx.font) ?? null;
  return new Proxy(ctx, {
    get(target_, prop) {
      if (prop === 'fillText') {
        return (s: string, x: number, y: number, mw?: number) => fillMixed(target_, String(s), x, y, stack, mw, false, refScale(String(s)), digitFont());
      }
      if (prop === 'strokeText') {
        return (s: string, x: number, y: number, mw?: number) => fillMixed(target_, String(s), x, y, stack, mw, true, refScale(String(s)), digitFont());
      }
      if (prop === 'measureText') return (s: string) => measureMixed(target_, String(s), stack, refScale(String(s)), digitFont());
      const v = Reflect.get(target_, prop, target_);
      return typeof v === 'function' ? v.bind(target_) : v;
    },
    set(target_, prop, value) {
      const ok = Reflect.set(target_, prop, value, target_);
      if (prop === 'font' && typeof value === 'string') {
        scales.set(target_.font, numeralScaleOf(value));
        digitFonts.set(target_.font, digitFontOf(value));
      }
      return ok;
    },
  });
}
