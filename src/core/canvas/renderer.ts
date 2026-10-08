// © 2026 김용현
// Canvas 공통 렌더링 유틸리티
import type { FontRole, FontStack, GraphOptions, StyleName } from '../types/common';
import { styleOf, DEFAULT_SERIF_STACK, DEFAULT_SANS_STACK, type TextPlace } from './style';
export { DEFAULT_SERIF_STACK, DEFAULT_SANS_STACK };

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

/** `fontFamily: 'custom'` 인데 `customFont` 이 비었을 때 대신 쓸 글꼴 */
const CUSTOM_FALLBACK_STACK = "'Noto Serif KR', serif";

/**
 * 글꼴을 고르는 데 필요한 옵션 조각. `GraphOptions` 가 구조적으로 만족한다.
 *
 * **글꼴 문자열이 아니라 옵션 객체를 통째로 받는 이유가 있다.** 자리마다
 * 글꼴 문자열을 인자로 하나 더 받게 하면, 넘겨주기를 빠뜨린 호출부가 조용히
 * 기본 글꼴로 그려진다 — 1.2.0 까지의 결함이 정확히 그것이었다(제목·범례가
 * 상수 글꼴을 박아 두고 `options` 를 아예 보지 않았다). 필수 항목 하나짜리
 * 객체로 받으면 빠뜨린 자리가 전부 **컴파일 오류**가 된다.
 * (`registry.ts` 가 종류별 제네릭으로 오배선을 막는 것과 같은 생각이다.)
 */
export interface FontOptions {
  fontFamily?: FontRole;
  customFont?: string;
  fontStack?: FontStack;
  /** 양식 — 자리마다 굵기·글꼴을 고른다. `styleOf` 참고 */
  style?: StyleName;
}

/** 자리 이름 하나를 실제 글꼴 문자열로 푼다 */
export function fontStackOf(fonts: FontOptions, role: FontRole): string {
  if (role === 'custom') return fonts.customFont || CUSTOM_FALLBACK_STACK;
  const t = styleOf(fonts);
  const given = fonts.fontStack ?? {};
  const serif = given.serif || t.stack.serif;
  const sans = given.sans || t.stack.sans;
  const numeral = given.numeral || t.stack.numeral;
  if (role === 'numeral') return numeral ? `${numeral}, ${serif}` : serif;
  const base = role === 'sans' ? sans : serif;
  const own = role === 'sans' ? given.sans : given.serif;
  // 시험지의 숫자·괄호는 어느 자리에서나 세리프다. 숫자 글꼴에는 한글이 없으므로
  // 앞에 두면 한 글줄 안에서 숫자·괄호만 그 글꼴로, 한글은 뒤 글꼴로 넘어간다.
  // 자리를 직접 준 사람의 글꼴에는 붙이지 않는다 — 준 그대로 쓴다.
  return numeral && !own ? `${numeral}, ${base}` : base;
}

/**
 * 괄호를 따로 찍을 때(parens.ts)의 글꼴 — 명조 자리 순서 그대로, 숫자 글꼴은 붙이지 않는다.
 * 시험지 괄호는 본문 명조(HY신명조) 꼴이다. 그 글꼴이 없으면 목록의 다음 명조로 넘어간다.
 */
export function parenStackOf(fonts: FontOptions): string {
  return fonts.fontStack?.serif || styleOf(fonts).stack.serif;
}

/** 고딕 자리 글꼴 — 제목·출처·각주·범례가 자리를 가리지 않고 이것을 쓴다 */
export function sansFont(fonts: FontOptions): string {
  return fontStackOf(fonts, 'sans');
}

export function getFont(
  size: number,
  fonts: FontOptions,
  weight: string = 'normal',
  /** 자리를 눌러 지정한다. 표에서 기호는 명조, 지명은 고딕으로 갈릴 때 쓴다. */
  role: FontRole = fonts.fontFamily ?? 'serif',
): string {
  return `${weight} ${size}px ${fontStackOf(fonts, role)}`;
}

// ── 숫자 높이 맞추기 ─────────────────────────────────────
//
// 숫자 글꼴(Garamond 등)은 숫자가 본문 명조보다 낮다. 그래서 numeral 자리는 그려질
// 글꼴의 숫자 높이를 한 번 재서, 숫자 높이 = 목표 비율 × 요청 크기가 되게 px 를 키운다.
// 글꼴 문자열에는 키운 px 가 실린다 — fit.ts 가 문자열에서 크기를 읽고 줄여도 비율이
// 그대로 남는다(줄이는 쪽은 언제나 «요청 크기» 로 makeFont 를 다시 부른다).
//
// 잴 ctx 는 clearCanvas 가 걸어 둔다 — 모든 그리기가 그것으로 시작한다. 걸린 것이
// 없으면(그리기 밖에서 부른 textFont) 키우지 않고, 그 결과는 캐시에 남기지 않는다.
// 잴 때는 감싼 ctx 를 벗겨(RAW_CTX) 감싸기 전 ctx 로 잰다 — 그래야 그리는 차례와 무관하다.

/** 잴 때 쓰는 기준 크기 — 비율만 남기므로 글꼴마다 한 번 잰다. 작은 크기는 높이가 정수 px 로 반올림돼(@napi-rs/canvas) 크게 잰다 */
const DIGIT_REF_PX = 1000;
let measurer: CanvasRenderingContext2D | null = null;
/** 지금 그리는 그림의 논리 폭 — clearCanvas 가 건다 (배율을 건 캔버스의 canvas.width 와 다를 수 있다) */
let measureWidth = 0;

/** 지금 그리는 그림의 잴 ctx·논리 폭. 그리기 밖이면 ctx 가 null */
export function currentMeasurer(): { ctx: CanvasRenderingContext2D | null; width: number } {
  return { ctx: measurer, width: measureWidth };
}
/** `${weight} 1000px ${stack}` → 숫자 높이 / 크기. 잰 값(> 0)만 담는다 */
const digitRatio = new Map<string, number>();

/** 숫자 높이를 잴 ctx 를 건다 (null 이면 뗀다) */
export function setFontMeasurer(ctx: CanvasRenderingContext2D | null): void {
  measurer = ctx;
}

/** 잰 값을 버린다 — 글꼴이 새로 도착했을 때 */
export function resetDigitCache(): void {
  digitRatio.clear();
  numeralScale.clear();
}

/**
 * 감싼 ctx(parens.ts `textCtx`)가 이 이름으로 감싸기 전 ctx 를 내준다.
 * 숫자 높이는 감싸지 않은 ctx 로 잰다 — 감싼 ctx 는 숫자 자리 글꼴을 이미 키운 크기로
 * 재므로, 그것으로 재면 잰 비율이 목표 비율 그대로 나와 «키우지 않음» 이 캐시에 남는다.
 * 그러면 어느 그림을 먼저 그렸느냐에 따라 숫자 크기가 달라진다(2.1.0 의 경제 좌표평면).
 */
export const RAW_CTX: unique symbol = Symbol('csat-chart.rawCtx');

function unwrapCtx(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  let c = ctx;
  for (let raw = (c as unknown as Record<symbol, unknown>)[RAW_CTX]; raw && raw !== c; raw = (c as unknown as Record<symbol, unknown>)[RAW_CTX]) {
    c = raw as CanvasRenderingContext2D;
  }
  return c;
}

function digitHeightRatio(ctx: CanvasRenderingContext2D, weight: string, stack: string): number {
  const key = `${weight} ${DIGIT_REF_PX}px ${stack}`;
  const cached = digitRatio.get(key);
  if (cached !== undefined) return cached;
  const raw = unwrapCtx(ctx);
  raw.save();
  raw.font = key;
  raw.textBaseline = 'alphabetic';
  const a = raw.measureText('0123456789').actualBoundingBoxAscent;
  raw.restore();
  if (!(typeof a === 'number' && a > 0)) return 0; // 잴 수 없음 — 캐시에 남기지 않는다
  const r = a / DIGIT_REF_PX;
  digitRatio.set(key, r);
  return r;
}

/**
 * 숫자 높이가 `target × size` 가 되는 px. 잴 ctx·목표가 없거나 글꼴이 숫자 높이를
 * 주지 않으면(actualBoundingBoxAscent 없음·0) `size` 그대로.
 */
export function numeralSize(
  size: number,
  weight: string,
  stack: string,
  target: number | null,
  ctx: CanvasRenderingContext2D | null = measurer,
): number {
  if (!target || !ctx) return size;
  const r = digitHeightRatio(ctx, weight, stack);
  return r > 0 ? Math.round((size * target / r) * 100) / 100 : size;
}

/** 숫자 자리 글꼴 문자열 → 요청 크기 / 키운 px (textFont 가 적는다) */
const numeralScale = new Map<string, number>();

/**
 * 숫자 높이 맞추기로 키운 글꼴 문자열이면 요청 크기 / 키운 px, 아니면 1.
 * 괄호(parens.ts)는 요청 크기의 한글에 맞춘다: 「(2024)」 의 괄호가 「(행정안전부)」 와 같은 크기여야 한다.
 * (숫자 자리와 명조 자리는 글꼴 목록 문자열이 같을 수 있어 목록으로는 못 가른다)
 */
export function numeralScaleOf(font: string): number {
  return numeralScale.get(font) ?? 1;
}

/** 1.7.0 이 그 자리에서 쓰던 굵기·자리. classic 에서만 읽힌다. */
export interface Legacy {
  weight?: 'bold' | 'normal';
  role?: FontRole;
}

/**
 * 글자 자리의 크기(px).
 *
 * `classicPx` 는 1.7.0 이 그 자리에 쓰던 식의 값이다. classic 은 그대로 쓰고,
 * exam 은 자리 규칙(실측 §1.1 의 «비»)으로 정한다. fontSize 가 없는 옵션
 * (손으로 만든 FontOptions)은 classicPx 를 그대로 돌려준다.
 *
 * ⚠️ exam 에서도 fontSize 가 없으면 classic 크기로 떨어진다. 그리고 fontSize 가
 * 있어도 그 값은 아직 createDefaultGraphOptions 의 classic 기본값이다 —
 * `examStyle.fontSize` 는 작업 17 에서 잇는다(style.ts 의 그 칸 주석 참고).
 */
export function textSize(
  o: FontOptions & { fontSize?: GraphOptions['fontSize'] },
  place: TextPlace,
  classicPx: number,
): number {
  return o.fontSize ? styleOf(o).text[place].size(o.fontSize, classicPx) : classicPx;
}

/**
 * 글자 자리의 글꼴 문자열 `${weight} ${size}px ${stack}`.
 *
 * 렌더러는 굵기와 글꼴 자리를 직접 고르지 않는다 — 그 자리가 무엇인지만 말한다.
 * `legacy` 는 1.7.0 이 그 호출에서 쓰던 예외(보통 굵기·특정 자리)이고 classic
 * 에서만 읽힌다. 그래야 classic 그림이 한 픽셀도 달라지지 않는다.
 */
export function textFont(o: FontOptions, place: TextPlace, size: number, legacy: Legacy = {}): string {
  const t = styleOf(o);
  const tok = t.text[place];
  const chosen = o.fontFamily && o.fontFamily !== 'serif' && tok.axisSide
    ? o.fontFamily
    : (tok.role ?? o.fontFamily ?? 'serif');
  const weight = (t.honorsLegacy && legacy.weight) || tok.weight;
  const role = (t.honorsLegacy && legacy.role) || chosen;
  const px = role === 'numeral' ? numeralSize(size, weight, fontStackOf(o, role), t.digitHeight) : size;
  const font = getFont(px, o, weight, role);
  if (px !== size && px > 0) numeralScale.set(font, size / px);
  return font;
}

export function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  setFontMeasurer(ctx);
  measureWidth = w;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
}

/** 줄바꿈(\n) 지원 텍스트 렌더링 */
export function fillTextMultiline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  lineHeight: number
) {
  const lines = text.split('\\n');
  if (lines.length <= 1) {
    ctx.fillText(text, x, y);
    return;
  }
  // 세로 중앙 정렬: baseline이 middle인 경우 전체 블록 중앙에 맞춤
  const totalH = (lines.length - 1) * lineHeight;
  const startY = y - totalH / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

/** 적절한 눈금 간격을 자동 계산 */
export function niceStep(range: number, maxTicks: number = 8): number {
  // 간격 0을 돌려주면 안 된다. 호출부는 `for (v = step; v <= max; v += step)`
  // 꼴로 눈금을 그리므로 step 이 0 이면 영원히 돈다(동기 루프라 탭이 멎는다).
  // 범위가 0·음수·NaN 인 경우가 여기 해당한다.
  if (!Number.isFinite(range) || range <= 0) return 1;
  const rough = range / maxTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  let step: number;
  if (norm <= 1.5) step = 1;
  else if (norm <= 3) step = 2;
  else if (norm <= 7) step = 5;
  else step = 10;
  return step * pow;
}

/** 자동 축 범위 계산 (min, max, step) */
export function autoRange(
  values: number[],
  maxTicks: number = 8
): { min: number; max: number; step: number } {
  if (values.length === 0) return { min: 0, max: 100, step: 20 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  // 값이 사실상 하나뿐이면 범위를 벌린다.
  //
  // `min === max` 로만 판정하면 부동소수점 오차로 미세하게 갈린 값들이
  // 빠져나간다. 예를 들어 편차 그래프에서 모든 달에 같은 값을 더하면
  // 3.0000000000000004 와 2.9999999999999996 이 섞여 나온다. 그러면
  // step 이 1e-16 수준이 되어 눈금 루프가 6e16 번 돌고 화면이 멎는다.
  // 그래서 절대 크기에 비례한 허용 오차로 판정한다.
  if (!(max - min > Math.max(Math.abs(min), Math.abs(max)) * 1e-9)) {
    min -= 10;
    max += 10;
  }
  const margin = (max - min) * 0.1;
  min = min - margin;
  max = max + margin;
  const step = niceStep(max - min, maxTicks);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  return { min, max, step };
}

/**
 * s 보다 큰 다음 «좋은» 간격 (1·2·2.5·5 × 10^k). 2.5 는 10^k ≥ 1 일 때만 —
 * 250 은 ±500 축을 넷으로 나눠 끝 눈금을 지키지만, 0.25 는 소수 한 자리 숫자로 못 적는다.
 */
export function nextNiceStep(s: number): number {
  if (!Number.isFinite(s) || s <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(s)));
  for (const m of pow >= 1 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10]) {
    const c = Math.round(m * pow * 1e12) / 1e12;
    if (c > s * (1 + 1e-9)) return c;
  }
  return 10 * pow;
}

/** 지금 ctx.font 로 찍을 눈금 숫자의 잉크 높이(px) — 글꼴이 바뀌어도(대체 글꼴) 실제 높이로 잰다 */
export function tickLabelHeight(ctx: CanvasRenderingContext2D): number {
  const m = ctx.measureText('-0123456789.');
  const h = (m.actualBoundingBoxAscent ?? 0) + (m.actualBoundingBoxDescent ?? 0);
  return h > 0 ? h : parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? '12') * 0.75;
}

export interface SpacedAxis {
  min: number;
  max: number;
  step: number;
  /** 간격을 넓혔을 때만 — 그릴 눈금 값. 없으면 렌더러가 예전처럼 min 부터 step 씩 센다 */
  ticks?: number[];
}

/**
 * 눈금 숫자가 세로로 붙지 않게 간격을 넓힌다 (2.1.1).
 *
 * 편차 그래프의 자동 범위는 좁은 자료 범위에서 고른 간격을 둔 채 0 을 가운데로
 * 대칭으로 넓힌다 — 자료가 0 에서 멀면(기준값 0, 강수량 900~1550) 눈금이
 * 100 간격으로 서른 개를 넘어 숫자가 한 기둥으로 뭉갰다. 눈금 사이가
 * `minGap`(px) 보다 좁으면 다음 좋은 간격(1·2·5)으로 올린다.
 *
 * - 넉넉하면 축을 **그대로** 돌려준다 (`ticks` 없음) — 기준 이미지가 흔들리지 않는다.
 * - `expand` (자동 범위) 면 양 끝을 새 간격의 배수로 넓힌다. 대칭 축은 대칭 그대로라
 *   두 축의 0 선이 계속 같은 높이다.
 * - 사용자 범위면 min·max 는 두고, 그 안의 새 간격 배수(0 포함)에만 눈금을 둔다.
 */
export function spaceTicks(
  axis: { min: number; max: number; step: number },
  plotH: number,
  minGap: number,
  expand: boolean,
): SpacedAxis {
  let { min, max, step } = axis;
  const span = () => max - min;
  if (!(span() > 0) || !(step > 0) || !(plotH > 0)) return { min, max, step };
  if ((step / span()) * plotH >= minGap) return { min, max, step };
  const snap = (v: number) => Math.round(v * 1e10) / 1e10;
  const whole = (v: number) => Math.abs(v - Math.round(v)) < 1e-9;
  // 사용자 범위는 양 끝 눈금을 지키는 간격을 먼저 찾는다 — ±1600 은 800 간격(−1600·−800·0·800·1600).
  // 간격은 소수 한 자리까지, 0 을 지나는 축이면 0 에 눈금이 놓여야 한다.
  if (!expand) {
    for (let n = Math.floor(plotH / minGap); n >= 1; n--) {
      const s = snap(span() / n);
      if (s <= step || !whole(s * 10)) continue;
      if (min < 0 && max > 0 && !whole(snap(min / s))) continue;
      const ticks: number[] = [];
      for (let i = 0; i <= n; i++) {
        const v = snap(min + i * s);
        ticks.push(Object.is(v, -0) ? 0 : v);
      }
      return { min, max, step: s, ticks };
    }
  }
  for (let guard = 0; guard < 60 && (step / span()) * plotH < minGap; guard++) {
    step = nextNiceStep(step);
    // 넓히기는 늘 처음 범위에서 — 앞 후보가 넓힌 끝(±600)을 다음 후보(250)가 또 넓히면 ±750 이 된다
    if (expand) {
      min = snap(Math.floor(snap(axis.min / step)) * step);
      max = snap(Math.ceil(snap(axis.max / step)) * step);
    }
    // 사용자 범위가 간격 하나보다 좁아지면 더 넓혀도 소용없다
    if (!expand && step >= span()) break;
  }
  const ticks: number[] = [];
  const first = Math.ceil(snap(min / step));
  const last = Math.floor(snap(max / step));
  for (let k = first; k <= last; k++) {
    const v = snap(k * step);
    ticks.push(Object.is(v, -0) ? 0 : v);
  }
  return { min, max, step, ticks };
}
