// © 2026 김용현
// 꺾은선 그래프 데이터
//
// 시험지 관습 — 계열은 색이 아니라 **선 종류와 기호 모양**으로 구분하고,
// 계열 이름은 범례 대신 **선 끝**에 붙이는 경우가 많다.

/** 선 종류 — 흑백 인쇄에서 계열을 구분하는 수단 */
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dashdot';

/** 선 종류별 대시 패턴 (Canvas setLineDash 인자) */
export const LINE_DASH: Record<LineStyle, number[]> = {
  solid: [],
  dashed: [10, 6],
  dotted: [2, 5],
  dashdot: [12, 5, 3, 5],
};

export const LINE_STYLE_ORDER: LineStyle[] = ['solid', 'dashed', 'dotted', 'dashdot'];

/** 꼭짓점 기호 — 선 종류만으로 부족할 때 함께 쓴다 */
export type LineMarker = 'circle' | 'square' | 'triangle' | 'diamond';

export const LINE_MARKER_ORDER: LineMarker[] = ['circle', 'square', 'triangle', 'diamond'];

export interface LineSeries {
  label: string;
  /** xLabels 와 같은 길이. 빠진 값은 null 로 둔다 (선이 끊긴다). */
  values: (number | null)[];
  lineStyle?: LineStyle;
  marker?: LineMarker;
  /** 기호 속을 비운다 (흰색 채움 + 검정 테두리) */
  hollowMarker?: boolean;
  /**
   * 면적 채움색. 주면 이 계열의 선 아래를 채운다.
   * `stacked` 와 함께 쓰면 아래 계열의 경계까지만 채워 누적 면적이 된다.
   */
  areaFill?: string;
}

/** 계열 이름을 어디에 쓸지 */
export type LineLabelPlacement = 'lineEnd' | 'legend';

export interface LineGraphData {
  series: LineSeries[];
  /** x축 눈금 이름 (예: 1~12월) */
  xLabels: string[];
  /** x축 끝에 붙는 단위 (예: '(월)') */
  xUnit: string;
  /** y축 위에 붙는 단위 (예: '(°C)') */
  yUnit: string;
  yRange: { min: number; max: number; auto: boolean; step?: number };
  /** 기본은 시험지 관습대로 선 끝 */
  labelPlacement: LineLabelPlacement;
  showMarkers: boolean;
  /** 0 위치에 점선 기준선을 긋는다 (편차 그래프) */
  zeroBaseline?: boolean;
  /**
   * 계열을 아래에서부터 쌓아 올린다 (누적 면적 그래프).
   * 각 계열의 선은 "그때까지의 합"을 나타낸다.
   */
  stacked?: boolean;
  /**
   * 범례를 플롯 안쪽 왼쪽 위에 작은 상자로 둔다.
   * 시험지 누적 면적 그래프가 이 방식이다. `labelPlacement:'legend'` 와 함께 쓴다.
   */
  insideLegend?: boolean;
}

export function createDefaultLineData(): LineGraphData {
  return {
    series: [
      { label: '(가)', values: Array.from({ length: 12 }, (_, i) => i * 2) },
    ],
    xLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    xUnit: '(월)',
    yUnit: '',
    yRange: { min: 0, max: 100, auto: true },
    labelPlacement: 'lineEnd',
    showMarkers: true,
  };
}
