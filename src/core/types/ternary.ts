// © 2026 김용현
// 삼각 그래프 데이터
export interface TernaryPoint {
  a: number;
  b: number;
  c: number;
  label: string;
}

export type TernaryGridInterval = 10 | 20 | 25;

export interface TernaryGraphData {
  points: TernaryPoint[];
  axisLabels: [string, string, string];
  gridInterval: TernaryGridInterval;
}

export function createDefaultTernaryData(): TernaryGraphData {
  return {
    points: [
      { a: 33, b: 33, c: 34, label: '(가)' },
    ],
    axisLabels: ['A', 'B', 'C'],
    gridInterval: 20,
  };
}
