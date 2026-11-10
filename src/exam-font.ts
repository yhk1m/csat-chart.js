// © 2026 김용현
// 그래프 밖에서 시험지 글꼴을 쓰고 싶은 사람을 위한 창구.
//
// 지도 위 기호((가)·A·㉠)처럼 그래프가 아닌 그림도 시험지는 명조로 쓴다. 렌더러가
// 쓰는 글꼴 순서를 손으로 베끼면 이 패키지가 순서를 바꿀 때 어긋나므로, 렌더러와
// 같은 함수(`fontStackOf`)를 거쳐 내준다.
import { fontStackOf } from './core/index';
import type { FontRole } from './core/index';

/** `examFont` 의 자리 — 명조·고딕·숫자 */
export type ExamFontRole = Exclude<FontRole, 'custom'>;

/**
 * 시험지(exam) 양식의 글꼴 순서. CSS `font-family` 값으로 그대로 쓴다.
 *
 * - `serif`: 명조 자리. 숫자·라틴·괄호는 Garamond 로, 한글은 신명조 → HY신명조 →
 *   Noto Serif KR 로 넘어간다 (렌더러의 축 이름·자료값과 같다).
 * - `sans`: 고딕 자리. 숫자·괄호는 같은 세리프, 한글은 HY중고딕 → 돋움 → Noto Sans KR.
 * - `numeral`: 숫자 자리 — `serif` 와 순서가 같다.
 *
 * 웹폰트(Noto)로 떨어질 수 있으니 캔버스에 그리기 전에 `ensureFonts()` 를 기다린다.
 */
export function examFontFamily(role: ExamFontRole = 'serif'): string {
  return fontStackOf({ style: 'exam' }, role);
}

/**
 * 캔버스 `ctx.font` 에 넣을 시험지 글꼴 한 줄. 예: `examFont(20, 'serif', 'bold')`.
 * `px` 가 유한한 양수가 아니면 던진다 — 캔버스는 잘못된 `font` 를 조용히 무시한다.
 */
export function examFont(
  px: number,
  role: ExamFontRole = 'serif',
  weight: 'normal' | 'bold' = 'normal',
): string {
  if (!Number.isFinite(px) || px <= 0) {
    throw new RangeError(`examFont: 글자 크기는 양수여야 합니다 (받은 값 ${px})`);
  }
  return `${weight} ${px}px ${examFontFamily(role)}`;
}
