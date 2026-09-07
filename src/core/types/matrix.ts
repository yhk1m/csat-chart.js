// © 2026 김용현
// 계단식 행렬표 데이터
//
// 시험지에서 흔한 형태 — 도시 간 거리처럼 **짝마다 값이 하나뿐인** 자료를
// 아래 삼각형만 남긴 계단 모양 표로 낸다. 대각선 칸에는 이름이 들어간다.
// 그래프는 아니지만 시험지에 붙일 그림이므로 같은 파이프라인에 둔다.

export interface MatrixTableData {
  /**
   * 대각선 칸에 들어갈 이름. 문제에서 가릴 이름은 이미 (가)·(나)로
   * 바꿔서 넘긴다 — 렌더러는 무엇을 가렸는지 모른다.
   */
  names: string[];
  /**
   * 짝별 값. `values[i][j]`(j < i)만 쓴다 — 위 삼각형과 대각선은 무시한다.
   * 정사각 행렬을 그대로 넘겨도 된다.
   */
  values: number[][];
  /**
   * 이름이 기호인지((가)·A) 실제 지명인지.
   *
   * 시험지는 **기호를 명조, 지명을 고딕**으로 쓴다. 미지정이면 전부
   * 본문 글꼴(`options.fontFamily`)을 쓴다.
   */
  nameIsSymbol?: boolean[];
  /** 오른쪽 위에 붙는 단위 표기. 예: `'(단위 : km)'` */
  unit: string;
  /** 이름 칸 채움색 — 미지정이면 연회색 */
  nameFill?: string;
  /** 천 단위 쉼표 — 미지정이면 붙인다 (원본이 `2,648` 꼴이다) */
  groupThousands?: boolean;
}

export function createDefaultMatrixTableData(): MatrixTableData {
  return {
    names: ['(가)', '(나)', '(다)'],
    values: [
      [0, 0, 0],
      [559, 0, 0],
      [2648, 2210, 0],
    ],
    unit: '(단위 : km)',
  };
}
