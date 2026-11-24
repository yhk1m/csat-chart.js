// © 2026 김용현
// 여러 그래프가 함께 쓰는 범례 띠 (2.4.0~)
//
// 시험지는 같은 모양 그래프 여러 장((가)·(나)·(다))을 나란히 두고, 범례와 각주를 그 아래에
// **한 번만** 적는다(2027학년도 수능 세계지리 15번). 그래프 한 장에 범례를 달면 그 장 폭에
// 갇히므로, 범례 상자와 각주만 따로 그리는 띠를 둔다. 그래프들과 같은 폭으로 그 아래에 붙인다.

export interface LegendStripItem {
  /** 견본 모양 — 막대(rect)·점(circle)·선(line) */
  type: 'rect' | 'circle' | 'line';
  label: string;
  /** 채움색. 미지정이면 rect 는 연회색, 나머지는 검정 */
  fill?: string;
  /** 테두리색 (rect). 미지정이면 검정 */
  stroke?: string;
  /** 선 견본의 대시 패턴 (line). 미지정이면 실선 */
  dash?: number[];
}

export interface LegendStripData {
  /** 왼쪽부터 한 줄로 늘어놓는다. 띠 폭이 모자라면 줄을 늘린다 */
  items: LegendStripItem[];
  /** 상자 윗변을 띠 위에서 띄우는 거리(px). 미지정이면 8 */
  top?: number;
}
