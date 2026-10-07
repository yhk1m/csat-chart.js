// © 2026 김용현
// 양식 토큰 — 시험지(exam)와 1.7.x(classic) 의 굵기·선·회색·범례 치수를 한 곳에 둔다.
//
// 렌더러는 이 표만 읽는다. 두 양식 사이에 if 문을 두지 않는다 — 갈리는 자리는 전부
// 이 표의 칸이다. 한 종류에서만 갈리는 값은 그 렌더러 안의 LOOK 표에 둔다.
//
// exam 값의 근거: planning/specs/2026-10-07-exam-style-measurements.md §1·§3.
// 1pt = 4.85px (단일 그래프 폭 165pt 를 800px 캔버스로).
//
// ⚠️ 이 파일은 renderer.ts 를 import 하지 않는다 — renderer.ts 가 이 파일을 쓴다.
import type { FontRole, GraphOptions, StyleName, TickDirection } from '../types/common';
import { LINE_DASH, type LineStyle } from '../types/line';

/** 1.7.x 명조 자리 — 축 이름·눈금·자료값 */
export const DEFAULT_SERIF_STACK = "'Noto Serif KR', 'NanumMyeongjo', serif";
/** 1.7.x 고딕 자리 — 제목·출처·각주·범례 */
export const DEFAULT_SANS_STACK = "'Noto Sans KR', sans-serif";
/**
 * 시험지 명조 — 신명 중명조(상용, 설치된 PC 에서만) → HY신명조 → Noto.
 * 신명의 정확한 family 이름은 설치해 봐야 안다(설계 §4) — 별칭을 여럿 둔다.
 */
export const EXAM_SERIF_STACK =
  "'신명 중명조', '신명-중명조', '신명중명조', 'HY신명조', 'HYSinMyeongJo-Medium', 'Noto Serif KR', serif";
/** 시험지 고딕 — 그림 속 고딕은 HY중고딕과 꼴·굵기가 맞는다(실측 §4 결정 2) */
export const EXAM_SANS_STACK =
  "'HY중고딕', 'HYGothic-Medium', '돋움', 'Dotum', 'Noto Sans KR', sans-serif";
/**
 * 시험지 숫자 — 본문 «한양신명조» 숫자와 꼴이 가장 가까운, 한글이 없는 세리프.
 * 작업 13(numerals.py)의 결과다 — 실측 명세 «숫자 글꼴 대조» 참고.
 * Garamond(Office)가 비율·획 굵기·굽은 `7` 이 가장 가깝고, 없으면 Times New Roman.
 */
export const EXAM_NUMERAL_STACK = "'Garamond', 'Times New Roman'";

/** 눈금 하나가 축에서 어디로 뻗는가. `cross` 는 축을 가로지른다(방사형·편차 B). */
export type TickDir = TickDirection | 'none' | 'cross';

/** 글자 자리 — 시험지에서 글꼴·굵기·크기가 갈리는 단위 */
export type TextPlace =
  | 'tick'      // 눈금 숫자
  | 'unit'      // 축 단위 (만 명)·(%)
  | 'axisName'  // 축 이름
  | 'axisNameV' // 세로 축 이름 (한 자씩 쌓는 것)
  | 'category'  // 항목 이름 (가)·(나) — 명조
  | 'region'    // 지명·범주 글자 세계·서울·1위 — 고딕
  | 'symbol'    // 라틴 기호 A·B·S₁
  | 'value'     // 자료값 라벨
  | 'legend'    // 범례 글자
  | 'title'     // 제목 〈…〉
  | 'source'    // 출처 (통계청)
  | 'footnote'  // 각주
  | 'year';     // 연도 (2023) — sourceLeft

type FontSizes = GraphOptions['fontSize'];

export interface TextToken {
  weight: 'bold' | 'normal';
  /** 이 자리의 글꼴 자리. null 이면 options.fontFamily 를 따른다(1.7.0 의 축 쪽 글자). */
  role: FontRole | null;
  /** 축 쪽 글자인가 — 사용자가 fontFamily 를 serif 밖으로 고르면 exam 에서도 그것을 따른다 */
  axisSide: boolean;
  /** 글자 크기. classicPx = 1.7.0 이 그 자리에 쓰던 식의 값 */
  size: (fs: FontSizes, classicPx: number) => number;
}

export interface StyleTokens {
  name: StyleName;
  /** textFont 의 legacy 인자(1.7.0 의 자리별 예외)를 읽는가 */
  honorsLegacy: boolean;
  /** 기본 글자 크기 — createDefaultGraphOptions 가 쓴다 */
  fontSize: FontSizes;
  text: Record<TextPlace, TextToken>;
  /** 글꼴 순서 — numeral 이 비어 있지 않으면 명조·고딕 기본 순서 앞에 붙는다 */
  stack: { serif: string; sans: string; numeral: string };
  /**
   * numeral 자리 숫자 높이 / 글자 크기의 목표. 그려지는 글꼴의 숫자 높이를 재서
   * 이 비율이 되게 px 를 키운다(renderer.ts `numeralSize`). null 이면 맞추지 않는다.
   */
  digitHeight: number | null;
  ink: { source: string; footnote: string };
  line: {
    /** 축·바깥 틀 */
    axis: number;
    /** 눈금 표시 굵기·길이 */
    tick: number;
    tickLen: number;
    /** 축 도우미(axes.ts)·꺾은선·방사형 격자 */
    grid: number;
    gridDash: number[];
    gridColor: string;
    /** 막대류 격자 (1.7.0 은 축 격자와 값이 달랐다) */
    barGrid: number;
    barGridDash: number[];
    barGridColor: string;
    /** 막대·면 테두리 */
    barStroke: number;
    /** 계열 선 기본 굵기 */
    series: number;
    /** 기온선 — 기후 그래프·편차 A 의 기온 꺾은선 */
    tempLine: number;
    /** 0 기준선 */
    zero: number;
    /** 표 바깥·안쪽 선 */
    tableOuter: number;
    tableInner: number;
  };
  legend: {
    /** 아래·오른쪽 범례 상자 테두리 */
    boxLine: number;
    boxColor: string;
    /** 플롯 안 범례 상자 테두리 */
    insideBoxLine: number;
    /** 아래·오른쪽 범례 상자 안 여백 (1.7.0 BOX_PADDING) */
    pad: number;
    /** 사각 견본 한 변 (1.7.0 16) */
    swatch: number;
    /** 선 견본 길이 (1.7.0 LINE_ICON_SIZE 36) */
    lineIcon: number;
    /** 견본과 글자 사이 (1.7.0 ICON_GAP 10) */
    iconGap: number;
    /** 플롯 안 범례 사각 견본 = 글자 크기 × 이 값 (1.7.0 0.95) */
    insideSwatchRatio: number;
    /** 사각 견본 테두리 (1.7.0 1px) */
    swatchLine: number;
  };
  marker: { r: number; stroke: number };
  /** 자리를 못 찾은 라벨을 점에 잇는 유도선 (LabelPlacer) */
  leader: { color: string; width: number };
  seriesDash: Record<LineStyle, number[]>;
  /** 누적 채움 순서. 'pattern:<이름>' 은 패턴 */
  fills: string[];
  /** fills 를 다 쓰면 이 자리부터 되풀이한다 */
  fillsCycleFrom: number;
  /** 사선 빗금 타일 한 변·선 굵기 (선 사이 수직 간격 = tile / √2) */
  hatch: { tile: number; width: number };
  /** 나머지 패턴 타일의 선 굵기 — 격자(grid·diagonalGrid)·줄무늬(vertical·horizontal) */
  patternLine: { grid: number; stripe: number };
  /** 어두운 칸 위 글자 — 흰 글자 / 검은 글자 + 흰 테두리 */
  darkLabel: 'white' | 'halo';
  haloWidth: number;
  /** i 번째 각주 앞 표 */
  footnoteMark: (i: number) => string;
  /** sourceInline 을 주지 않았을 때의 기본값 */
  sourceInline: boolean;
  /** 눈금 방향을 종류별 기본값으로 정하는가 (false 면 늘 바깥) */
  ticksByType: boolean;
  /**
   * 눈금 숫자 자리 — 글자 **잉크**를 기준으로 잰 간격 (axes.ts `yTickLabelAt`·`xTickLabelAt`).
   * null 이면 1.7.0 처럼 글자 상자 기준(`tickLabelGap`)으로 둔다.
   */
  tickText: {
    /** 세로축 숫자 오른쪽 끝 ↔ 축선 바깥쪽 가장자리 */
    yGap: number;
    /** 축선 아래 가장자리 ↔ 가로축 숫자 잉크 위 */
    xGap: number;
    /** 바깥 눈금이 있으면 그 끝에서 이만큼 더 띄운다 */
    pastTick: number;
  } | null;
}

const same = (_fs: FontSizes, classicPx: number) => classicPx;

/** classic 의 글자 자리 — 축 쪽은 bold + fontFamily, 고딕 자리는 bold + sans, 각주만 보통 */
const axisClassic = (): TextToken => ({ weight: 'bold', role: null, axisSide: true, size: same });
const sansClassic = (): TextToken => ({ weight: 'bold', role: 'sans', axisSide: false, size: same });

export const classicStyle: StyleTokens = {
  name: 'classic',
  honorsLegacy: true,
  fontSize: { title: 36, axisLabel: 28, tick: 26, dataLabel: 22 },
  stack: { serif: DEFAULT_SERIF_STACK, sans: DEFAULT_SANS_STACK, numeral: '' },
  digitHeight: null,
  text: {
    tick: axisClassic(),
    unit: axisClassic(),
    axisName: axisClassic(),
    axisNameV: axisClassic(),
    category: axisClassic(),
    region: axisClassic(),
    symbol: axisClassic(),
    value: axisClassic(),
    legend: sansClassic(),
    title: sansClassic(),
    source: sansClassic(),
    year: sansClassic(),
    footnote: { weight: 'normal', role: 'sans', axisSide: false, size: same },
  },
  ink: { source: '#555', footnote: '#555' },
  line: {
    axis: 2,
    tick: 1.5,
    tickLen: 6,
    grid: 0.5,
    gridDash: [4, 4],
    gridColor: '#ccc',
    barGrid: 0.5,
    barGridDash: [3, 3],
    barGridColor: '#ddd',
    barStroke: 0.8,
    series: 2,
    tempLine: 2.5,
    zero: 1,
    tableOuter: 2,
    tableInner: 1,
  },
  legend: {
    boxLine: 1.5,
    boxColor: '#888',
    insideBoxLine: 1,
    pad: 12,
    swatch: 16,
    lineIcon: 36,
    iconGap: 10,
    insideSwatchRatio: 0.95,
    swatchLine: 1,
  },
  marker: { r: 4.5, stroke: 1.5 },
  leader: { color: '#666', width: 0.8 },
  seriesDash: LINE_DASH,
  fills: [
    '#333', '#999', '#666', '#fff',
    'pattern:diagonal', 'pattern:grid', 'pattern:diagonalGrid', 'pattern:dot',
    'pattern:dotReverse', 'pattern:vertical', 'pattern:horizontal',
  ],
  fillsCycleFrom: 4,
  hatch: { tile: 10, width: 1.5 },
  patternLine: { grid: 1.2, stripe: 1.5 },
  darkLabel: 'white',
  haloWidth: 3,
  footnoteMark: () => '* ',
  sourceInline: false,
  ticksByType: false,
  tickText: null,
};

/** 시험지 글자 — 굵은 글자는 표본 어디에도 없다(실측 §1.1) */
const examText = (role: FontRole, axisSide: boolean, size: TextToken['size']): TextToken =>
  ({ weight: 'normal', role, axisSide, size });

export const examStyle: StyleTokens = {
  name: 'exam',
  honorsLegacy: false,
  // 눈금 7.3pt·축 이름 8.0pt·제목 8.2pt·자료값 8.2pt (실측 §1.1) × 4.85
  // createDefaultGraphOptions 가 `{ ...fontSize }` 로 복사해 넘긴다 — 이 객체를 그대로
  // 넘기면 사용자가 옵션을 고칠 때 토큰이 함께 바뀐다.
  fontSize: { title: 40, axisLabel: 39, tick: 35, dataLabel: 40 },
  stack: { serif: EXAM_SERIF_STACK, sans: EXAM_SANS_STACK, numeral: EXAM_NUMERAL_STACK },
  // 본문 «한양신명조» 숫자 높이 0.758 em — Garamond 0.650·Times New Roman 0.685 라
  // 같은 px 면 10–14% 작다 (실측 명세 «숫자 글꼴 대조»)
  digitHeight: 0.758,
  text: {
    tick: examText('numeral', true, same),
    unit: examText('sans', true, (fs) => fs.tick),
    axisName: examText('sans', true, (fs) => fs.axisLabel),
    axisNameV: examText('sans', true, (fs) => fs.tick * 0.93),
    category: examText('serif', true, (fs) => fs.tick * 1.37),
    region: examText('sans', true, (fs) => fs.axisLabel),
    symbol: examText('numeral', true, same),
    value: examText('numeral', true, same),
    legend: examText('sans', false, (fs) => fs.tick),
    title: examText('sans', false, same),
    source: examText('sans', false, (fs) => fs.tick),
    year: examText('numeral', false, (fs) => fs.tick),
    footnote: examText('sans', false, (fs) => fs.tick * 0.97),
  },
  ink: { source: '#000', footnote: '#000' },
  line: {
    axis: 1.9,          // 0.39pt
    tick: 1.9,          // 0.39pt
    tickLen: 12,        // 2.5pt
    grid: 1.45,         // 0.30pt
    gridDash: [7.6, 4.7], // 1.56/0.96pt
    gridColor: '#000',
    barGrid: 1.45,
    barGridDash: [7.6, 4.7],
    barGridColor: '#000',
    barStroke: 1.75,    // 0.36pt
    series: 3.9,        // 0.81pt
    tempLine: 3.9,      // 기후·편차 기온선도 계열 선 0.81pt (실측 §2 deviation-a)
    zero: 1.75,         // 0.34–0.39pt
    tableOuter: 1.9,    // 0.39pt
    tableInner: 1.45,   // 0.30pt
  },
  legend: {
    boxLine: 1.7,       // 0.30–0.39pt
    boxColor: '#000',
    insideBoxLine: 1.7,
    pad: 15,            // 왼 2.7–4.0pt · 위 2.3–3.2pt 의 가운데
    swatch: 30,         // 6.2pt
    lineIcon: 112,      // 23pt
    iconGap: 14,        // 1.9–3.7pt
    insideSwatchRatio: 0.86, // 6.2 / 7.2
    swatchLine: 1.75,   // ≈ 막대 테두리 0.36pt 를 따랐다 (견본 테두리는 잰 적 없음)
  },
  marker: { r: 6.8, stroke: 1.75 }, // 지름 2.8pt, 외곽 0.36pt
  leader: { color: '#000', width: 1.45 }, // ≈0.3pt 검정 (실측 §2 line «짧은 유도선 0.3 쯤»)
  seriesDash: {
    solid: [],
    dashed: [15, 6.8],             // 3.1/1.4pt
    dotted: [9.7, 4.9],            // 2.0/1.0pt (짧은 점선)
    dashdot: [41, 4.9, 5.3, 4.9],  // 8.5/1.0/1.1/1.0pt
  },
  // 연회색 217 → 진회색 127 → 빗금 → 흰색 (absbar 2026_11), 그다음 5단계 회색
  fills: [
    '#d9d9d9', '#7f7f7f', 'pattern:diagonal', '#ffffff',
    '#b2b2b2', '#3f3f3f', '#e5e5e5', '#999999', '#cbcbcb',
    'pattern:grid', 'pattern:dot', 'pattern:vertical', 'pattern:horizontal',
  ],
  fillsCycleFrom: 9,
  hatch: { tile: 15, width: 2 }, // 수직 간격 10.6px = 2.2pt, 선 0.42pt
  patternLine: { grid: 2, stripe: 2 }, // ≈ 빗금 0.42pt 를 따랐다 (실측 없음 — 표본에 없는 무늬)
  darkLabel: 'halo',
  haloWidth: 8,                  // strokeText 는 획 가운데로 그린다 — 한쪽 4px = 0.8pt (실측 0.7–1.0pt)
  footnoteMark: (i) => '* '.repeat(i + 1),
  sourceInline: true,
  ticksByType: true,
  // 꺾은선 표본 둘(2026_11 wgeo-q10, 2027_09 korgeo-q8): 세로 숫자는 눈금에 가운데 맞춰
  // 축에서 1.44–2.16pt 띄우고, 가로 숫자 잉크 위는 축 아래 3.1pt(안쪽 눈금)·3.8pt
  // (바깥 2.6pt 눈금 끝 + 1.2pt). 맨 아래 「0」 은 가운데에 두되 가로 숫자와 1.2pt 이상 떨어진다
  tickText: { yGap: 8.7, xGap: 15, pastTick: 5.8 }, // 1.8pt · 3.1pt · 1.2pt
};

const STYLES: Record<StyleName, StyleTokens> = { classic: classicStyle, exam: examStyle };

/** 양식을 적지 않은 옵션이 받는 양식 — 2.0.0 부터 시험지 */
export const DEFAULT_STYLE: StyleName = 'exam';

export function styleOf(o: { style?: StyleName }): StyleTokens {
  return STYLES[o.style as StyleName] ?? STYLES[DEFAULT_STYLE];
}

/** 한 종류에서만 갈리는 값 — 렌더러 안의 LOOK 표에서 고른다 */
export function byStyle<T>(o: { style?: StyleName }, table: Record<StyleName, T>): T {
  return table[styleOf(o).name];
}

/**
 * 축에서 눈금 숫자까지 — 축 바깥으로 뻗은 눈금 길이 + 6px 띄움.
 * 안쪽·없음은 바깥으로 뻗지 않고, 가로지름은 절반만 뻗는다.
 */
export function tickLabelGap(t: StyleTokens, dir: TickDir = 'out'): number {
  const reach = dir === 'out' ? t.line.tickLen : dir === 'cross' ? t.line.tickLen / 2 : 0;
  return reach + 6;
}

/**
 * 유도선. `t.leader` 가 유일한 출처다 — 1.7.0 이 종류마다 달리 쓰던 값(`classic`)만
 * 그 종류가 넘겨 classic 에서 덮어쓴다. exam 은 언제나 `t.leader` 그대로다.
 */
export function leaderOf(
  o: { style?: StyleName },
  classic: Partial<StyleTokens['leader']>,
): StyleTokens['leader'] {
  return { ...styleOf(o).leader, ...byStyle<Partial<StyleTokens['leader']>>(o, { classic, exam: {} }) };
}

/**
 * 눈금 방향. `tickDirection` 을 주면 두 축 모두 그쪽, 아니면 classic 은 늘 바깥,
 * exam 은 종류별 시험지 다수결(`byType`).
 */
export function tickDirOf(
  o: { style?: StyleName; tickDirection?: TickDirection },
  byType: { x: TickDir; y: TickDir },
): { x: TickDir; y: TickDir } {
  if (o.tickDirection === 'in' || o.tickDirection === 'out') {
    return { x: o.tickDirection, y: o.tickDirection };
  }
  return styleOf(o).ticksByType ? byType : { x: 'out', y: 'out' };
}

/**
 * 한 호출로 `(가)`·`전국`·`A` 를 다 그리는 자리(산점 점 이름, 경제 선 이름)에서
 * 글자를 보고 자리를 고른다. classic 에서는 셋 다 같은 글꼴이라 그림이 같다.
 */
export function labelPlace(text: string): TextPlace {
  const s = text.trim();
  if (/^\(.+\)$/.test(s)) return 'category';
  return /[가-힣]/.test(s) ? 'region' : 'symbol';
}
