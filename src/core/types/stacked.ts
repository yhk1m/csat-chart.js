// © 2026 김용현
// 누적 막대/원 그래프 데이터
export type StackedDisplayMode = 'bar' | 'pie';
export type StackedBarDirection = 'vertical' | 'horizontal';

export interface StackedCategory {
  label: string;
  values: number[];
  /**
   * 이 막대에서 세그먼트를 쌓을 순서 (아래→위). 계열 번호를 늘어놓는다.
   *
   * 시험지 누적 막대는 막대마다 **자기 값 순서로** 쌓는다(큰 값이 아래,
   * '기타'가 맨 위). 계열 순서는 모든 막대가 공유하므로 그것만으로는
   * 재현할 수 없다. 미지정이면 기존대로 계열 번호 순으로 쌓는다.
   */
  segmentOrder?: number[];
}

export interface StackedGraphData {
  displayMode: StackedDisplayMode;
  barDirection: StackedBarDirection;
  categories: StackedCategory[];
  seriesLabels: string[];
  unit: string;
  /**
   * 계열별 채움 직접 지정. `'pattern:diagonal'` 처럼 적으면 패턴을 쓴다.
   * 미지정이면 기존 팔레트(getStackedFill).
   */
  seriesFills?: string[];
  /**
   * 값 대신 **계열 이름**을 세그먼트 안에 적는다.
   *
   * 시험지 누적 막대는 범례 없이 칸마다 이름을 적는 경우가 많다.
   * 패턴 위에서도 읽히도록 글자에 흰 테두리를 두르고, 어두운 채움 위에서는
   * 흰 글자로 쓴다. 미지정이면 기존대로 `showDataLabels` 에 따라 값을 적는다.
   */
  labelInSegment?: boolean;
  /**
   * 계열 이름이 기호(A·B)인지 실제 이름인지. 시험지는 기호를 명조,
   * 지명을 고딕으로 쓴다. 미지정이면 전부 본문 글꼴.
   */
  seriesIsSymbol?: boolean[];
  /** 가로 격자선 색 — 미지정이면 `#ddd`. 시험지는 더 진하다. */
  gridColor?: string;
  pieRotation?: number;  // 0~360도
  pieScale?: number;     // 퍼센트 (기본 100)
  axisStep?: number;     // 축 눈금 간격 (기본 20)
}

// 채움 색상/패턴은 canvas/patterns.ts 의 getStackedFill() 사용

export function createDefaultStackedData(): StackedGraphData {
  return {
    displayMode: 'bar',
    barDirection: 'vertical',
    categories: [
      { label: '(가)', values: [40, 30, 30] },
      { label: '(나)', values: [50, 25, 25] },
      { label: '(다)', values: [20, 40, 40] },
    ],
    seriesLabels: ['항목1', '항목2', '항목3'],
    unit: '(%)',
  };
}
