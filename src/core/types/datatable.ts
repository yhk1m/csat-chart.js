// © 2026 김용현
// 항목 × 지역 데이터 표
//
// 시험지에서 가장 흔한 표다 — 머리글 행에 지역 기호((가)~(라)), 왼쪽 열에 항목
// 이름, 칸마다 값이 하나. 계단식 행렬표(MatrixTable)와 달리 칸이 서로 붙어 있고
// 값이 소수다. 그래프는 아니지만 시험지에 붙일 그림이므로 같은 파이프라인에 둔다.

export interface DataTableRow {
  /** 항목 이름. 예: `'기온의 연교차'` */
  label: string;
  /** 이름 뒤에 붙는 괄호 단위. 원본은 이름보다 조금 작게 쓴다. 예: `'(℃)'` */
  unit?: string;
  /** 머리글 순서대로 놓이는 값 */
  values: number[];
  /** 소수점 자릿수. 미지정이면 1자리 — 시험지 표는 대개 소수 한 자리다. */
  decimals?: number;
}

export interface DataTableData {
  /** 왼쪽 위 모서리 칸. 원본은 `'구분'` */
  cornerLabel: string;
  /**
   * 머리글. 시험지는 지역을 (가)~(라) 처럼 기호로 가린다.
   * 문제에서 가릴 이름은 이미 바꿔서 넘긴다 — 렌더러는 무엇을 가렸는지 모른다.
   */
  columns: string[];
  rows: DataTableRow[];
  /**
   * 머리글이 기호인지((가)·A) 실제 지명인지.
   *
   * 시험지는 **기호를 명조, 지명을 고딕**으로 쓴다. 미지정이면 전부
   * 본문 글꼴(`options.fontFamily`)을 쓴다.
   */
  columnIsSymbol?: boolean[];
  /** 머리글 행 채움색 — 미지정이면 연회색 */
  headerFill?: string;
  /** 천 단위 쉼표 — 미지정이면 붙인다 */
  groupThousands?: boolean;
}

export function createDefaultDataTableData(): DataTableData {
  return {
    cornerLabel: '구분',
    columns: ['(가)', '(나)', '(다)', '(라)'],
    rows: [
      { label: '기온의 연교차', unit: '(℃)', values: [40.5, 29.9, 3.8, 3.8] },
      { label: '최한월 평균 기온', unit: '(℃)', values: [-21.4, -24.4, 24.6, 19.5] },
      { label: '1월 강수량', unit: '(mm)', values: [1.8, 4.6, 28.8, 206.8] },
    ],
  };
}
