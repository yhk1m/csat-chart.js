// © 2026 김용현
// 트리맵(사각형 분할) 그래프 데이터
export interface TreemapCell {
  /**
   * 칸 라벨. `\n` 을 넣으면 그 자리에서 반드시 줄을 바꾼다(`'1위\n33.0'`).
   * 나눈 한 줄이 칸보다 넓으면 그 줄 안에서는 예전처럼 글자 수로 더 나눈다.
   */
  label: string;
  /** 넓이의 근거가 되는 값. 렌더러가 합으로 나눠 비율을 낸다. */
  value: number;
  /**
   * 칸 채움 — 색(`'#7f7f7f'`) 또는 패턴(`'pattern:diagonal'`). 미지정이면 칠하지 않는다(원래 동작).
   * `#999999` 이거나 그보다 어두운 색이면 라벨에 흰 테두리를 둘러 읽히게 한다(`isDarkFill`).
   */
  fill?: string;
}

export interface TreemapGraphData {
  /**
   * 순서는 배치 결과에만 영향을 준다 — 넓이는 값 비율대로 나뉘므로 어느
   * 순서든 정확하다. 다만 내림차순이라야 칸이 정사각형에 가깝게 나온다.
   * '기타'는 값이 더 크더라도 시험지 관행대로 맨 뒤에 둔다.
   */
  cells: TreemapCell[];
  /** 칸 라벨 글자 크기. 미지정이면 options.fontSize.tick 을 쓴다. */
  labelFontSize?: number;
  /**
   * 라벨을 적을 최소 칸 너비(px). 이보다 좁으면 글자를 생략한다.
   * 좁은 칸에 억지로 넣으면 글자가 테두리를 넘어 옆 칸을 밟는다.
   */
  minLabelWidth?: number;
  /**
   * 출처가 없어도 출처 한 줄만큼 아래를 비워 둔다.
   *
   * 패널을 여러 장 나란히 놓을 때 쓴다 — 출처를 마지막 패널에만 적으면
   * 그 패널만 상자가 짧아져 줄이 안 맞는다. 모두 같은 자리를 비우면
   * 상자 높이가 같아지고 출처는 상자 **아래**에 놓인다.
   */
  reserveSourceSpace?: boolean;
}

export function createDefaultTreemapData(): TreemapGraphData {
  return {
    cells: [
      { label: '중국', value: 50 },
      { label: '미국', value: 20 },
      { label: '인도', value: 12 },
      { label: '기타', value: 18 },
    ],
  };
}
