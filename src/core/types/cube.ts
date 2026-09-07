// © 2026 김용현
// 직육면체 그래프 데이터
export interface CubePoint {
  x: number; // 0~1
  y: number; // 0~1
  z: number; // 0~1
  label: string;
  labelDx: number; // 유도선 X 오프셋
  labelDy: number; // 유도선 Y 오프셋
}

export interface LabelOffset {
  x: number;
  y: number;
}

export interface CubeAxisConfig {
  name: string;
  lowLabel: string;
  highLabel: string;
  lowOffset: LabelOffset;
  highOffset: LabelOffset;
}

export interface CubeGraphData {
  points: CubePoint[];
  xAxis: CubeAxisConfig;
  yAxis: CubeAxisConfig;
  zAxis: CubeAxisConfig;
}

export function createDefaultCubeData(): CubeGraphData {
  return {
    points: [
      { x: 0, y: 1, z: 1, label: 'ㄱ', labelDx: 0, labelDy: 0 },
      { x: 0, y: 0, z: 0, label: 'ㄴ', labelDx: 0, labelDy: 0 },
      { x: 1, y: 0, z: 1, label: 'ㄷ', labelDx: 0, labelDy: 0 },
    ],
    xAxis: { name: 'X축', lowLabel: '낮음', highLabel: '높음', lowOffset: { x: 0, y: 0 }, highOffset: { x: 0, y: 0 } },
    yAxis: { name: 'Y축', lowLabel: '낮음', highLabel: '높음', lowOffset: { x: 0, y: 0 }, highOffset: { x: 0, y: 0 } },
    zAxis: { name: 'Z축', lowLabel: '낮음', highLabel: '높음', lowOffset: { x: 0, y: 0 }, highOffset: { x: 0, y: 0 } },
  };
}
