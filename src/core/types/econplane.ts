// © 2026 김용현
// 경제 좌표평면 데이터.
//
// 수능 경제 문항의 그림은 주제가 달라도(수요·공급, 총수요·총공급, 생산가능곡선,
// 고용 지표, 물가-성장률, 국민 소득) **한 장의 그림**이다 — 화살표 달린
// 좌표평면 위에 다섯 가지만 놓인다. 그래서 종류를 나누지 않고 하나로 두고,
// 문항마다 갈리는 것은 옵션으로 뺐다.
//
//   · 직선  — 끝에 제 이름을 달고 선다. 실선이 보통이고 파선도 쓴다.
//   · 점    — 채운 점 하나에 글자 하나. 글자 자리는 이웃한 것에 따라 옮긴다.
//   · 유도선 — 점에서 축으로 내리는 점선.
//   · 화살표 — 점에서 점으로(균형점 이동), 또는 곡선 옆에 나란히(이동 방향).
//   · 계열  — 점 여럿을 잇고 기호를 얹은 꺾은선. **이것만 범례 상자를 쓴다.**
//
// 1.4.0 은 실물 «열세» 장을 재어 「범례 상자가 없다」고 적었는데, 열여섯 장으로
// 늘려 보니 2027학년도 6월 16번(명목 GDP·실질 GDP)에 범례 상자가 있다. 계열을
// 쓰는 그림에만 붙고, 나머지 열다섯 장은 여전히 선 끝에 이름을 단다.
//
// **이 그림의 이름은 모두 아래 첨자를 쓸 수 있다** — 밑줄 뒤에 영문자·숫자를
// 적으면(`D_1`·`P_2`·`E_Y`) 작은 글자로 내려앉는다. 선 이름·점 이름·화살표
// 이름·축 이름·눈금 글자·계열 이름이 모두 그렇다. 자세한 규칙은
// `src/core/canvas/subscript.ts` 를 보라.
import type { InsideLegendCorner } from './common';

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
  /**
   * 축 이름. 세로축은 축 위에, 가로축은 화살촉 오른쪽에 놓인다.
   *
   * 리터럴 `\n`(역슬래시 + n)이나 진짜 줄바꿈을 넣으면 **여러 줄**로 앉는다 —
   * 실물이 「GDP」와 「(억 달러)」를 두 줄로 쌓는 꼴이다(2027학년도 6월 16번,
   * 2026학년도 수능 7번). 산점도의 `yLabel` 과 같은 규약이다.
   */
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
   * 눈금 자리에 숫자 대신 적을 **글자**. `ticks` 와 짝을 이룬다(같은 자리끼리).
   *
   * 눈금이 값이 아니라 이름인 그림이 실물에 둘 있다. 2027학년도 6월 17번의
   * 세로축은 숫자가 하나도 없이 `P_1`·`P_2` 두 이름만 서고, 같은 회차 16번의
   * 가로축은 `t년`·`t+1년`·`t+2년` 이다. 그 둘은 서로 다른 그림이 아니라
   * **같은 일**이다 — 자리는 `ticks` 가 정하고 이 배열은 거기 적을 글자만 준다.
   *
   * 적지 않거나 빈 문자열이면 숫자를 그대로 적는다. 아래 첨자를 쓸 수 있다.
   */
  tickLabels?: string[];
  /**
   * 눈금이 0에서 시작하지 않을 때 축에 넣는 생략 기호 `≈`.
   * 원점과 첫 눈금 사이에 놓인다 (2026학년도 9월 7번은 두 축에 다 있다).
   */
  broken: boolean;
  /**
   * 물결을 놓을 «값». 미지정이면 원점과 첫 눈금의 한가운데다(눈금이 하나도
   * 없으면 축 길이의 12% 자리).
   *
   * **자리를 축의 값으로 말한다** — 눈금·점·직선과 같은 자[尺]다. `min`~`max`
   * 밖을 적으면 축 안으로 자른다. 물결은 축 «위» 의 기호라 축 밖에 놓을 자리가
   * 없기 때문이다. `broken` 이 거짓이면 이 값은 읽히지 않는다.
   */
  brokenAt?: number;
}

export interface EconLine {
  /** 선 끝에 붙는 이름. 계열을 쓰지 않는 그림은 범례 없이 여기에 이름을 단다 */
  label: string;
  from: EconXY;
  to: EconXY;
  /** 이름을 어느 끝에 붙일지. 시험지는 거의 언제나 오른쪽 끝이다 */
  labelAt: 'from' | 'to';
  /** 이름 자리를 미세하게 옮긴다(px). 선 둘이 한 점에서 만날 때 쓴다 */
  labelDx?: number;
  labelDy?: number;
  /**
   * 파선으로 긋는다.
   *
   * 선 종류가 문항의 뜻을 나른다. 2027학년도 6월 3번은 사적 편익만 반영한
   * 수요 곡선 `D_1` 을 실선으로, 사회적 편익까지 반영한 `D_2` 를 파선으로
   * 그어 둘을 가른다 — 색이 없는 흑백 시험지에서 이것이 유일한 구분이다.
   */
  dashed?: boolean;
}

/** 계열 꼭짓점에 얹는 기호 */
export type EconMarker = 'circle' | 'square';

/**
 * 점 여럿을 잇고 기호를 얹은 꺾은선.
 *
 * 값의 «자리» 가 아니라 «흐름» 을 묻는 그림에 쓴다 — 2027학년도 6월 16번의
 * 명목 GDP·실질 GDP 가 t년부터 t+2년까지 어떻게 엇갈리는지가 그 예다.
 * 직선(`lines`)과 갈리는 곳은 셋이다. 꼭짓점이 셋 이상일 수 있고, 꼭짓점마다
 * 기호가 붙고, 이름을 **범례 상자**에 적는다.
 */
export interface EconSeries {
  /** 범례 상자에 적히는 이름 */
  label: string;
  /** 꼭짓점. 왼쪽에서 오른쪽으로 이어 긋는다 */
  points: EconXY[];
  /** 파선으로 긋는다 */
  dashed: boolean;
  /** 꼭짓점 기호 */
  marker: EconMarker;
  /** 기호 속을 비운다 (흰색 채움 + 검정 테두리) */
  hollow: boolean;
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
  /**
   * 꺾은선 계열.
   *
   * **선택 항목으로 둔 것에 뜻이 있다.** 이 셋(`series`·`legend`·`seriesGuides`)을
   * 기본 데이터에 넣으면, 1.4.0 에 맞춰 적어 둔 자료가 검증기에서 「항목이
   * 없습니다」로 막힌다 — `validate.ts` 는 «기본 데이터의 키» 를 필수로 보기
   * 때문이다. 실물 열여섯 장 중 하나만 쓰는 그림이기도 하다.
   */
  series?: EconSeries[];
  /**
   * 계열 범례 상자를 놓을 모서리. 적지 않으면 범례를 그리지 않는다.
   *
   * 그 모서리가 자료에 막히면 나머지 셋을 차례로 본다. `options.showLegend` 는
   * 읽지 않는다 — 이 상자는 «보여 줄까 말까» 하는 장식이 아니라 계열 이름을
   * 적을 **유일한** 자리라서, 끄면 어느 선이 명목이고 실질인지 알 길이 없다.
   */
  legend?: InsideLegendCorner;
  /**
   * 계열 꼭짓점마다 가로축으로 파선을 내린다.
   *
   * 한 눈금 자리에 계열이 여럿이면 **가장 높은 점** 하나까지만 긋는다 —
   * 실물이 그렇다(파선 하나가 두 점을 함께 꿴다).
   */
  seriesGuides?: boolean;
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
