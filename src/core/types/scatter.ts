// © 2026 김용현
// 산점도/버블 차트 데이터
export type ScatterMode = 'normal' | 'deviation';

export interface ScatterPoint {
  x: number;
  y: number;
  size: number; // 버블 크기 (0이면 기본 점)
  label: string;
  /**
   * 이 점(버블)의 채움색. 미지정이면 기존 회색을 쓴다.
   * 크기와 별개인 두 번째 값(예: 1인당 GDP 구간)을 색으로 나타낼 때 쓴다.
   */
  fill?: string;
}

/**
 * 버블 범례 자리.
 *
 * `outside-right` 는 플롯 **바깥** 오른쪽 여백에 세로로 쌓는다. 자료를 아예
 * 덮지 않으므로 점이 많을 때 가장 안전하다. 나머지는 플롯 안쪽 모서리이고,
 * 버블을 덜 덮는 쪽으로 알아서 옮겨 간다.
 */
export type BubbleLegendPosition =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'outside-right';

export interface ScatterGraphData {
  mode: ScatterMode;
  points: ScatterPoint[];
  bubbleLegendPosition: BubbleLegendPosition;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  /** step 을 주면 눈금 간격을 그 값으로 고정한다. 미지정이면 기존대로 자동 계산 */
  xRange: { min: number; max: number; auto: boolean; step?: number };
  yRange: { min: number; max: number; auto: boolean; step?: number };
  showBubble: boolean;
  bubbleScale: number; // 버블 최대 반지름 (px)
  /**
   * 바깥 사각 테두리를 그린다. 미지정이면 그린다(기존 동작).
   * 시험지 편차 그래프는 테두리 없이 교차하는 두 축만 둔다.
   *
   * **편차 모드 전용이다.** 일반 모드의 틀은 `examFrame` 이 정한다.
   */
  showFrame?: boolean;
  /**
   * 일반 모드의 틀을 시험지 모양으로 바꾼다. 세 가지가 함께 간다 —
   * 시험지 산점도에서 늘 같이 나타나므로 하나로 묶었다.
   *
   * 1. 플롯을 사각 테두리로 감싼다 (기본은 왼쪽·아래 축선만)
   * 2. 격자를 진한 점선으로 (기본은 아주 연한 회색)
   * 3. x축 단위를 **마지막 눈금 옆**에 둔다 — 원본은 `4(℃)` 꼴이다
   *    (기본은 축 이름과 같은 줄 오른쪽 끝)
   *
   * 미지정이면 기존 동작 그대로다.
   */
  examFrame?: boolean;
  /**
   * 축 이름을 상자에 넣어 y는 그래프 위, x는 그래프 오른쪽에 세운다.
   * 시험지 편차 그래프 관습이다. 미지정이면 기존대로 축 옆에 쓴다.
   * 편차 모드에서만 쓴다.
   */
  boxedAxisLabels?: boolean;
  /**
   * 눈금과 눈금 숫자를 가운데 십자선 축에 붙인다. 미지정이면 플롯 가장자리에 붙인다.
   * 테두리를 끄면(showFrame: false) 가장자리에 붙은 눈금이 허공에 뜨므로 함께 쓴다.
   * 편차 모드에서만 쓴다.
   */
  ticksOnAxis?: boolean;
  /**
   * 채움색이 무엇을 뜻하는지 알려주는 범례. 버블 크기 범례 아래에 놓인다.
   * 미지정이면 그리지 않는다.
   */
  fillLegend?: {
    title: string;
    items: { label: string; fill: string }[];
  };
  /**
   * 버블 크기 범례에 쓸 항목을 직접 지정한다.
   * 미지정이면 최댓값에서 자동으로 세 단계를 잡고 숫자를 그대로 쓴다 —
   * 인구처럼 자릿수가 큰 값은 그대로 두면 읽을 수 없으므로 여기서 정해 준다.
   */
  bubbleLegendItems?: { size: number; label: string }[];
  // 편차 모드 전용
  quadrantLabels: [string, string, string, string]; // 1사분면(우상), 2(좌상), 3(좌하), 4(우하)
}

export function createDefaultScatterData(): ScatterGraphData {
  return {
    mode: 'normal',
    bubbleLegendPosition: 'bottom-right',
    points: [
      { x: 10, y: 25, size: 50, label: 'A' },
      { x: 25, y: 40, size: 80, label: 'B' },
      { x: 40, y: 15, size: 30, label: 'C' },
      { x: 55, y: 60, size: 100, label: 'D' },
    ],
    xLabel: 'X축',
    yLabel: 'Y축',
    xUnit: '',
    yUnit: '',
    xRange: { min: 0, max: 100, auto: true },
    yRange: { min: 0, max: 100, auto: true },
    showBubble: true,
    bubbleScale: 30,
    quadrantLabels: ['(가)', '(나)', '(다)', '(라)'],
  };
}
