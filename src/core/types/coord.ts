// © 2026 김용현
// 경·위도 좌표 평면 — 지점을 경도·위도 위치에 점으로 찍는다.
// 2027학년도 9월 세계지리 19번 「(가)~(라) 지역의 경·위도 좌표」. GeoTester 에서 올려 왔다(2.2.0).

export interface CoordPoint {
  /** 경도 −180~180 (서경은 음수). 범위 밖이면 틀 끝에 붙인다 */
  lon: number;
  /** 위도 −90~90 (남위는 음수). 범위 밖이면 틀 끝에 붙인다 */
  lat: number;
  /** showLabels 가 참일 때 점 옆에 쓴다 */
  label?: string;
}

export interface CoordGraphData {
  points: CoordPoint[];
  /** 점 이름표를 쓸지. 원본 시험지는 쓰지 않는다(지점을 가린다). */
  showLabels?: boolean;
  /** 점 반지름(px). 미지정이면 classic 7, exam 6.8(시험지 점 기호 지름 2.8pt) */
  pointRadius?: number;
}

export function createDefaultCoordData(): CoordGraphData {
  return {
    points: [
      { lon: 0, lat: 51.5, label: '(가)' },
      { lon: 80, lat: 73, label: '(나)' },
      { lon: -58, lat: -34.6, label: '(다)' },
      { lon: 130.8, lat: -12.5, label: '(라)' },
    ],
  };
}
