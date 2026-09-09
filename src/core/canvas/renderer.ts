// © 2026 김용현
// Canvas 공통 렌더링 유틸리티
import type { FontRole, FontStack } from '../types/common';

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

/** 명조 자리의 기본 글꼴 — 축 이름·눈금·자료값 */
export const DEFAULT_SERIF_STACK = "'Noto Serif KR', 'NanumMyeongjo', serif";
/** 고딕 자리의 기본 글꼴 — 제목·출처·각주·범례 */
export const DEFAULT_SANS_STACK = "'Noto Sans KR', sans-serif";
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
}

/** 자리 이름 하나를 실제 글꼴 문자열로 푼다 */
export function fontStackOf(fonts: FontOptions, role: FontRole): string {
  if (role === 'custom') return fonts.customFont || CUSTOM_FALLBACK_STACK;
  if (role === 'sans') return fonts.fontStack?.sans || DEFAULT_SANS_STACK;
  return fonts.fontStack?.serif || DEFAULT_SERIF_STACK;
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

export function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
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
