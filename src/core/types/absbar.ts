// © 2026 김용현
// 절댓값 막대 그래프 데이터
export type AbsBarDirection = 'vertical' | 'horizontal';

export interface AbsBarCategory {
  label: string;
  values: number[];
}

export interface AbsBarGraphData {
  barDirection: AbsBarDirection;
  stacked: boolean;
  categories: AbsBarCategory[];
  seriesLabels: string[];
  unit: string;
  yRange: { min: number; max: number; auto: boolean; step?: number };
  fitMax?: boolean; // 최댓값에 맞추기
  /**
   * 계열별 채움색 직접 지정. 미지정이면 기존 팔레트(getStackedFill)를 쓴다.
   * 원본 시험지를 재현할 때 기본 팔레트와 색이 다른 경우에 쓴다.
   */
  seriesFills?: string[];
  /**
   * 0을 기준으로 막대를 그린다. 음수는 0에서 아래로 내려가고 0 위치에 실선을 긋는다.
   *
   * 미지정이면 기존대로 축 바닥에서 막대가 자란다. 축이 음수까지 내려가는
   * 편차 그래프에서는 그 방식이 막대를 허공에 띄운 것처럼 보이게 한다.
   */
  zeroBaseline?: boolean;
  /**
   * 범주 라벨을 0선 바로 아래에 놓는다. 미지정이면 플롯 아래(축 바깥)에 놓는다.
   *
   * 시험지마다 다르다 — 2026 수능 한국지리 6번은 0선 아래, 2025 수능
   * 세계지리 19번은 플롯 아래다. 그래서 zeroBaseline 과 따로 둔다.
   */
  categoryLabelAtBaseline?: boolean;
  /**
   * 범주를 묶어 2단 라벨로 만든다 (가로 막대 전용).
   *
   * 시험지에서 흔한 형태다 — 바깥 라벨이 A·B·C, 안쪽 라벨이 1990년·2020년.
   * `span` 은 그 그룹에 속한 범주 개수이고, 합이 categories 길이와 같아야 한다.
   * 그룹 안 막대는 서로 붙고 그룹 사이는 벌어진다.
   *
   * 미지정이면 기존대로 범주마다 라벨 하나를 고르게 배치한다.
   */
  groups?: { label: string; span: number }[];
  /**
   * 범례를 플롯 안쪽 모서리에 작은 상자로 둔다.
   *
   * 미지정이면 기존대로 options.legendPosition 을 따라 플롯 바깥에 그린다.
   */
  insideLegend?: 'top-right' | 'top-left';
  /**
   * 단위를 마지막 눈금 숫자 바로 옆에 붙인다 (가로 막대 전용).
   *
   * 원본 시험지는 축 끝이 `100(EJ)` 처럼 붙어 있다.
   * 미지정이면 기존대로 축 오른쪽에 조금 떨어뜨려 그린다.
   */
  unitAdjacent?: boolean;
}

export function createDefaultAbsBarData(): AbsBarGraphData {
  return {
    barDirection: 'vertical',
    stacked: false,
    categories: [
      { label: '(가)', values: [30, 50] },
      { label: '(나)', values: [45, 35] },
      { label: '(다)', values: [60, 20] },
    ],
    seriesLabels: ['항목1', '항목2'],
    unit: '',
    yRange: { min: 0, max: 100, auto: true },
  };
}
