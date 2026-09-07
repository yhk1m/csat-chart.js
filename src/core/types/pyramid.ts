// © 2026 김용현
// 인구 피라미드 데이터
export const AGE_GROUPS = [
  '0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34',
  '35-39', '40-44', '45-49', '50-54', '55-59', '60-64',
  '65-69', '70-74', '75-79', '80+',
];

export interface PyramidAgeData {
  male: number;
  female: number;
}

export type PyramidUnit = 'count' | 'percent';
export type AgeLabelSide = 'left' | 'right' | 'center';

export interface PyramidGraphData {
  ages: PyramidAgeData[];
  unit: PyramidUnit;
  maleLabel: string;
  femaleLabel: string;
  axisLabel: string;
  range: { max: number; auto: boolean };
  ageLabelSide: AgeLabelSide;
  /**
   * 세로축을 연령대 이름(0-4, 5-9…) 대신 **나이 수치 눈금**으로 그린다.
   * 시험지 피라미드가 이 방식이다 — 왼쪽에 (세) 0/20/40/60/80.
   * 미지정이면 기존대로 연령대 이름을 쓴다.
   */
  numericAgeAxis?: boolean;
  /** 나이 축 단위 표기 (numericAgeAxis 일 때만). 예: '(세)' */
  ageUnit?: string;
  /**
   * 가로축 단위 표기를 눈금 **숫자와 같은 줄** 오른쪽 끝에 둔다.
   * 시험지 피라미드가 이 배치다. 미지정이면 기존대로 숫자 아랫줄에 적는다.
   */
  axisLabelInline?: boolean;
  /**
   * 남·여 막대 채움색 [남, 여]. 미지정이면 기존 색(진회색/연회색).
   * 시험지는 둘 다 같은 연회색에 검정 테두리다.
   */
  sexFills?: [string, string];
}

export function createDefaultPyramidData(): PyramidGraphData {
  return {
    ages: Array.from({ length: 17 }, () => ({ male: 0, female: 0 })),
    unit: 'percent',
    maleLabel: '남',
    femaleLabel: '여',
    axisLabel: '(%)',
    range: { max: 10, auto: true },
    ageLabelSide: 'center',
  };
}
