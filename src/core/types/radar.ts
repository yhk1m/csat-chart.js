// © 2026 김용현
// 방사형 그래프 데이터
export interface RadarSeries {
  label: string;
  values: number[];
}

export interface RadarGraphData {
  axisLabels: string[];
  series: RadarSeries[];
  maxValue: number;
  autoMax: boolean;
  gridSteps: number;
  showFill: boolean;
}

export function createDefaultRadarData(): RadarGraphData {
  return {
    axisLabels: ['축1', '축2', '축3', '축4', '축5'],
    series: [
      { label: '(가)', values: [0, 0, 0, 0, 0] },
    ],
    maxValue: 100,
    autoMax: true,
    gridSteps: 5,
    showFill: false,
  };
}
