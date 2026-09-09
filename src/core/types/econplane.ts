// © 2026 김용현
// 경제 좌표평면 데이터.
//
// 수능 경제 문항의 그림은 주제가 달라도(수요·공급, 총수요·총공급, 생산가능곡선,
// 고용 지표, 물가-성장률) **한 장의 그림**이다 — 화살표 달린 좌표평면 위에 네
// 가지만 놓인다. 그래서 종류를 나누지 않고 하나로 두고, 문항마다 갈리는 것은
// 옵션으로 뺐다.
//
//   · 직선  — 끝에 제 이름을 달고 선다. **범례 상자가 없다.** 실물 열세 장에
//             범례가 한 번도 나오지 않는다. 지리 열여섯 종과 가장 크게 갈리는 곳이다.
//   · 점    — 채운 점 하나에 글자 하나. 글자 자리는 이웃한 것에 따라 옮긴다.
//   · 유도선 — 점에서 축으로 내리는 점선.
//   · 화살표 — 점에서 점으로(균형점 이동), 또는 곡선 옆에 나란히(이동 방향).

/** 그릴 사분면. `'all'` 은 축 양끝에 화살표를 단다 */
export type EconQuadrants = 'first' | 'all';

/**
 * 유도선·격자의 점선 모양.
 *
 * 실물은 둘 다 쓴다 — 열세 장 중 열둘이 파선, 2027학년도 6월 16번만 촘촘한
 * 점선이다. 두 모양이 하는 일은 같아 보인다(둘 다 값을 축으로 끌어 내린다).
 * 조판 취향으로 보이지만 어느 쪽도 재현할 수 있게 남겨 둔다.
 */
export type EconDash = 'dashed' | 'dotted';

/** 글자를 기준점의 어느 쪽에 놓을지 */
export type EconLabelPos =
  | 'top' | 'bottom' | 'left' | 'right'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * 점에서 긋는 점선 유도선.
 *
 * `'to-x'` 는 가로축으로 내리고 `'to-y'` 는 세로축으로 끌며 `'both'` 는 둘 다다.
 * `'cross'` 는 점을 지나 **플롯 전체**를 가로지른다 — 2026학년도 수능 12번처럼
 * 「이 값이 안 변했다」를 보이는 자리에 쓴다.
 */
export type EconGuide = 'none' | 'to-x' | 'to-y' | 'both' | 'cross';

export interface EconXY {
  x: number;
  y: number;
}

export interface EconAxis {
  /** 축 이름. 세로축은 축 위에, 가로축은 화살촉 오른쪽에 놓인다 */
  label: string;
  min: number;
  max: number;
  /**
   * 눈금 «값». **값이 곧 자리다** — 자[尺]는 언제나 고르고, 눈금만 띄엄띄엄
   * 찍힌다. 2026학년도 9월 15번의 `0·10·20·50` 이 그 꼴이다(50 이 20 의 세 배
   * 거리에 선다). 눈금 표시선은 그리지 않는다 — 시험지가 그렇다. 격자나
   * 유도선이 축까지 닿아 자리를 알려 준다.
   */
  ticks: number[];
  /**
   * 눈금이 0에서 시작하지 않을 때 축에 넣는 생략 기호 `≈`.
   * 원점과 첫 눈금 사이에 놓인다 (2026학년도 9월 7번은 두 축에 다 있다).
   */
  broken: boolean;
}

export interface EconLine {
  /** 선 끝에 붙는 이름. 이 라이브러리에서 범례 없이 이름을 다는 유일한 종류다 */
  label: string;
  from: EconXY;
  to: EconXY;
  /** 이름을 어느 끝에 붙일지. 시험지는 거의 언제나 오른쪽 끝이다 */
  labelAt: 'from' | 'to';
  /** 이름 자리를 미세하게 옮긴다(px). 선 둘이 한 점에서 만날 때 쓴다 */
  labelDx?: number;
  labelDy?: number;
}

export interface EconPoint {
  x: number;
  y: number;
  label: string;
  labelPos: EconLabelPos;
  guide: EconGuide;
  /**
   * 점을 찍을지.
   *
   * `false` 면 유도선만 남는다 — 2026학년도 수능 7번이 그 꼴이다. 문항이 쓰는
   * 값마다 파선을 내리되 교점에 점은 찍지 않는다.
   */
  dot: boolean;
}

export interface EconArrow {
  from: EconXY;
  to: EconXY;
  /**
   * 잇는 선에서 **수직으로** 이만큼(px) 비켜 놓는다.
   *
   * 곡선을 따라 움직이는 화살표가 이 꼴이다 — 2026학년도 9월 16번의 (가)·(나)는
   * 총수요 곡선 위를 옮겨 가므로 그대로 그으면 곡선에 겹친다.
   * 양수는 **진행 방향의 오른쪽**이다.
   */
  offset: number;
  /** 양 끝을 이만큼(px) 줄인다 — 점에 닿지 않게 */
  shorten: number;
  /** 화살표 옆에 적는 글 (예: `(가)`) */
  label: string;
  labelPos: EconLabelPos;
}

export interface EconPlaneData {
  quadrants: EconQuadrants;
  xAxis: EconAxis;
  yAxis: EconAxis;
  /** 눈금 자리마다 점선 격자를 깐다 */
  grid: boolean;
  dash: EconDash;
  lines: EconLine[];
  points: EconPoint[];
  arrows: EconArrow[];
}

/**
 * 수요·공급 교차 — 열세 장 중 여섯 장이 이 그림이다.
 *
 * 2027학년도 6월 9번의 자리값 그대로다. 이름만 바꿔 「국내 수요」·「국내 공급」
 * 으로 쓰는 문항이 둘 더 있다.
 */
export function createSupplyDemandData(): EconPlaneData {
  return {
    quadrants: 'first',
    xAxis: { label: '수량(kg)', min: 0, max: 9, ticks: [1, 2, 3, 4, 5, 6, 7, 8], broken: false },
    yAxis: { label: '가격(천 원)', min: 0, max: 9, ticks: [1, 2, 3, 4, 5, 6, 7, 8], broken: false },
    grid: true,
    dash: 'dashed',
    lines: [
      { label: '수요', from: { x: 0, y: 8 }, to: { x: 8, y: 0 }, labelAt: 'to' },
      { label: '공급', from: { x: 0, y: 0 }, to: { x: 8, y: 8 }, labelAt: 'to' },
    ],
    points: [{ x: 4, y: 4, label: 'E', labelPos: 'top', guide: 'none', dot: true }],
    arrows: [],
  };
}

/**
 * 총수요·총공급 — 물가와 실질 GDP 를 축으로 삼는 국민 경제 그림.
 *
 * 2026학년도 9월 16번의 모양이다. 눈금이 하나도 없는 것이 이 그림의 성격이다 —
 * 값이 아니라 «어느 쪽으로 움직였는가» 만 묻기 때문이다. 같은 축 이름을 쓰는
 * 문항이 하나 더 있다(2026학년도 수능 12번, 그쪽은 곡선 없이 점만 찍는다).
 */
export function createAdAsData(): EconPlaneData {
  return {
    quadrants: 'first',
    xAxis: { label: '실질 GDP', min: 0, max: 10, ticks: [], broken: false },
    yAxis: { label: '물가', min: 0, max: 10, ticks: [], broken: false },
    grid: false,
    dash: 'dashed',
    lines: [
      { label: '총수요', from: { x: 1, y: 8.5 }, to: { x: 8.5, y: 1 }, labelAt: 'to' },
      { label: '총공급', from: { x: 1, y: 1 }, to: { x: 8.5, y: 8.5 }, labelAt: 'to' },
    ],
    points: [{ x: 4.75, y: 4.75, label: 'E', labelPos: 'right', guide: 'none', dot: true }],
    arrows: [],
  };
}

/**
 * 점 이동 — 이름 붙인 점 몇 개에 유도선을 내리고 화살표로 순서를 잇는다.
 *
 * 이것도 여섯 장이다(균형점 이동·고용 지표·교역 전후 소비점). 자리값은
 * 2027학년도 6월 6번에서 그대로 가져왔다.
 */
export function createPointShiftData(): EconPlaneData {
  return {
    quadrants: 'first',
    xAxis: { label: '수량(만 개)', min: 0, max: 18, ticks: [5, 10, 15], broken: false },
    yAxis: { label: '가격(달러)', min: 0, max: 18, ticks: [10, 15], broken: false },
    grid: false,
    dash: 'dashed',
    lines: [],
    points: [
      { x: 5, y: 10, label: 'E', labelPos: 'top', guide: 'both', dot: true },
      { x: 10, y: 10, label: 'A', labelPos: 'top', guide: 'both', dot: true },
      { x: 15, y: 15, label: 'B', labelPos: 'top', guide: 'both', dot: true },
    ],
    arrows: [
      { from: { x: 5, y: 10 }, to: { x: 10, y: 10 }, offset: 0, shorten: 10, label: '', labelPos: 'top' },
      { from: { x: 10, y: 10 }, to: { x: 15, y: 15 }, offset: 0, shorten: 10, label: '', labelPos: 'top' },
    ],
  };
}

/**
 * 기준 모양. 열세 장 중 가장 흔한 그림(수요·공급 교차)을 그대로 쓴다 —
 * 값이 0뿐인 기본값을 하나 더 만들지 않으려는 뜻이다.
 */
export function createDefaultEconPlaneData(): EconPlaneData {
  return createSupplyDemandData();
}
