// © 2026 김용현
// 범주형 점 그래프 데이터
//
// 시험지에서 흔한 형태 — x축은 A·B·C·D 같은 범주, y축은 수치, 값은 점으로 찍는다.
// 막대 그래프(AbsBar)와 축·틀 구조는 같고 표시만 점이다.

/** 계열 구분은 색이 아니라 기호 모양으로 한다 (흑백 인쇄 관습) */
export type DotMarker = 'circle' | 'square' | 'triangle' | 'diamond';

export const DOT_MARKER_ORDER: DotMarker[] = ['circle', 'square', 'triangle', 'diamond'];

export interface CategoryDotCategory {
  label: string;
  /** 계열별 값. 계열이 하나면 길이 1. */
  values: number[];
}

export interface CategoryDotGraphData {
  categories: CategoryDotCategory[];
  seriesLabels: string[];
  /** 계열별 기호. 미지정이면 DOT_MARKER_ORDER 순서를 쓴다. */
  seriesMarkers?: DotMarker[];
  /** y축 단위 — 축 위쪽에 붙는다 (예: '(°C)') */
  unit: string;
  /** 점 반지름(px) */
  dotRadius: number;
  yRange: { min: number; max: number; auto: boolean; step?: number };
  /**
   * 0 위치에 실선을 긋는다. 편차 그래프에서 기준선을 보이게 하려고 쓴다.
   * 점 자체는 값 위치에 찍히므로 막대와 달리 기준선이 그리기에 영향을 주지 않는다.
   */
  zeroBaseline?: boolean;
}

export function createDefaultCategoryDotData(): CategoryDotGraphData {
  return {
    categories: [
      { label: 'A', values: [17] },
      { label: 'B', values: [11] },
      { label: 'C', values: [9] },
      { label: 'D', values: [25] },
    ],
    seriesLabels: ['항목1'],
    unit: '',
    dotRadius: 6,
    yRange: { min: 0, max: 100, auto: true },
  };
}
