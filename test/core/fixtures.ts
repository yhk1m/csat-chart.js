// © 2026 김용현
// 골든 이미지용 렌더 케이스 정의.
//
// 일부 렌더러는 기본 데이터(createDefault*)가 전부 0이라 축·범례 틀만 그려진다.
// 그 상태를 기준 이미지로 삼으면 정작 데이터를 그리는 코드가 망가져도
// 골든 테스트가 잡지 못한다. 그래서 여기서 값을 채워 넣는다.
//
// 값은 고정 상수다 — 난수를 쓰면 기준 이미지가 매번 달라진다.

import {
  renderAbsBarGraph, renderClimateGraph, renderCubeGraph,
  renderDeviationAGraph, renderDeviationBGraph, renderHythergraph,
  renderPyramidGraph, renderRadarChart, renderScatterGraph,
  renderStackedGraph, renderTernaryGraph, renderCategoryDotGraph, renderLineGraph,
  renderMatrixTable, renderDataTable, renderTreemapGraph, renderEconPlane,
  createDefaultAbsBarData, createDefaultClimateData, createDefaultCubeData,
  createDefaultDeviationAData, createDefaultDeviationBData,
  createDefaultHythergraphData, createDefaultPyramidData,
  createDefaultRadarData, createDefaultScatterData,
  createDefaultStackedData, createDefaultTernaryData, createDefaultCategoryDotData,
  createDefaultLineData, createDefaultTreemapData, createDefaultEconPlaneData,
  createDefaultGraphOptions,
  type EconPlaneData,
} from '../../src/core/index';

export type Renderer = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: never,
  options: ReturnType<typeof createDefaultGraphOptions>,
) => void;

/** 월별 기후값 12개를 결정적으로 만든다 */
const months12 = (temp: (m: number) => number, precip: (m: number) => number) =>
  Array.from({ length: 12 }, (_, m) => ({ temp: temp(m), precip: precip(m) }));

/** 북반구 온대 기후를 흉내낸 곡선 (1월 최저 · 7월 최고) */
const seasonalTemp = (m: number) => Math.round((13 - 12 * Math.cos((m * Math.PI) / 6)) * 10) / 10;
const seasonalPrecip = (m: number) => Math.round(30 + 220 * Math.max(0, Math.sin(((m - 2) * Math.PI) / 6)));

const climateWithData = () => {
  const d = createDefaultClimateData();
  d.months = months12(seasonalTemp, seasonalPrecip);
  return d;
};

/**
 * 편차를 월마다 다르게 준다 — 실제 편차 그래프에 가깝고, 기준 이미지로도
 * 정보량이 많다. (균일한 편차가 렌더러를 멎게 하던 `autoRange` 버그는
 * 2026-08-02에 고쳤다. `__tests__/auto-range.test.ts`가 지킨다.)
 */
const deviationAWithData = () => {
  const d = createDefaultDeviationAData();
  d.baseMonths = months12(seasonalTemp, seasonalPrecip);
  d.months = months12(
    (m) => seasonalTemp(m) + ((m % 5) - 2),
    (m) => seasonalPrecip(m) + (m % 4) * 25 - 30,
  );
  return d;
};

/**
 * 시험지 모양의 월별 편차 — 단색 막대·정사각 점·세로 축 이름·플롯 안 범례·
 * 사각 테두리, 그리고 **두 축의 0이 같은 높이**인지를 감시한다.
 * (2026학년도 9월 한국지리 12번 모양)
 */
const deviationAExam = () => {
  const d = createDefaultDeviationAData();
  const temp = [6.5, 4.2, 1.5, -0.2, -1.2, -2.5, -2.0, -1.0, 0.8, 3.4, 5.3, 7.0];
  const precip = [100, 65, 35, 18, 5, -8, -215, -140, 20, 50, 75, 110];
  d.baseMonths = Array.from({ length: 12 }, () => ({ temp: 0, precip: 0 }));
  d.months = temp.map((t, i) => ({ temp: t, precip: precip[i] }));
  // 위 4칸·아래 5칸으로 맞춘 축 — 간격은 달라도 0이 겹친다
  d.tempRange = { min: -10, max: 8, auto: false, step: 2 };
  d.precipRange = { min: -250, max: 200, auto: false, step: 50 };
  d.tempAxisName = '기온 차이';
  d.precipAxisName = '강수량 차이';
  d.barFill = '#e6e6e6';
  d.barStroke = '#000000';
  d.markerShape = 'square';
  d.showFrame = true;
  d.insideLegend = 'bottom-right';
  return d;
};

/**
 * 항목 × 지역 표 — 회색 머리글·소수 자릿수·오른쪽 정렬 값·이름 뒤 작은 단위와
 * **기호(명조)와 지명(고딕)의 글꼴이 갈리는지**를 감시한다.
 * (2027학년도 6월 모평 세계지리 9번 모양)
 */
const dataTableExam = () => ({
  cornerLabel: '구분',
  columns: ['(가)', '(나)', '(다)', '카이로'],
  columnIsSymbol: [true, true, true, false],
  rows: [
    { label: '기온의 연교차', unit: '(℃)', values: [40.5, 29.9, 3.8, 3.8] },
    { label: '최한월 평균 기온', unit: '(℃)', values: [-21.4, -24.4, 24.6, 19.5] },
    { label: '1월 강수량', unit: '(mm)', values: [1.8, 4.6, 28.8, 1206.8] },
  ],
});

/**
 * 시험지 모양 트리맵 — 넓은 칸의 이름과 **좁은 칸의 두 줄 접기**를 감시한다.
 * (2024학년도 수능 세계지리 18번 (가) 모양)
 *
 * ⚠️ 800×600 한 장에 다 그리면 가장 좁은 칸도 150px 을 넘어 `minLabelWidth`
 * 생략 경로는 지나지 않는다. 그 경로는 상자 셋을 나란히 놓는 실제 문항
 * (패널 하나가 260px 남짓)에서 처음 걸린다.
 */
const treemapExam = () => ({
  cells: [
    { label: '중국', value: 51.0 },
    { label: '기타', value: 17.5 },
    { label: '인도', value: 10.0 },
    { label: '미국', value: 8.5 },
    { label: '오스트레일리아', value: 7.0 },
    { label: '인도네시아', value: 6.0 },
  ],
});

/**
 * 꼬리가 긴 트리맵 — 값이 아주 작은 칸은 **라벨을 생략**하는지 감시한다.
 * 좁은 칸에 글자를 억지로 넣으면 테두리를 넘어 옆 칸을 밟는다.
 * (패널을 셋 나란히 놓는 2024학년도 수능 세계지리 18번에서 실제로 생기는 상황)
 */
const treemapLongTail = () => ({
  cells: [
    { label: '중국', value: 46 },
    { label: '기타', value: 21 },
    { label: '미국', value: 12 },
    { label: '인도', value: 9 },
    { label: '러시아', value: 6 },
    { label: '사우디아라비아', value: 3 },
    { label: '이란', value: 1.6 },
    { label: '이라크', value: 0.9 },
    { label: '쿠웨이트', value: 0.4 },
    { label: '카타르', value: 0.1 },
  ],
});

/**
 * 계단식 거리 행렬표 — 대각선 이름칸·아래 삼각형·천 단위 쉼표·단위 표기와
 * **각주가 마지막 줄을 덮지 않는지**를 감시한다.
 * (2026학년도 수능 세계지리 15번 모양)
 */
const matrixTableExam = () => ({
  names: ['(가)', '(나)', '(다)', '뉴욕'],
  // 기호는 명조, 지명은 고딕 — 글꼴이 갈리는지도 감시한다
  nameIsSymbol: [true, true, true, false],
  values: [
    [0, 0, 0, 0],
    [559, 0, 0, 0],
    [2206, 2643, 0, 0],
    [3935, 4129, 2281, 0],
  ],
  unit: '(단위 : km)',
});

/**
 * 시험지 모양의 100% 누적 막대 — 칸 안 이름 라벨(흰 테두리·어두운 채움 위 흰 글자)·
 * 계열별 채움·기호와 지명의 글꼴 구분·**막대별 쌓기 순서**를 감시한다.
 * (2026학년도 9월 한국지리 16번 모양)
 */
const stackedExam = () => {
  const d = createDefaultStackedData();
  d.seriesLabels = ['A', 'B', '전남', '경남', '기타'];
  d.seriesFills = ['pattern:diagonal', 'pattern:dot', '#404040', '#bfbfbf', '#ffffff'];
  d.seriesIsSymbol = [true, true, false, false, false];
  d.labelInSegment = true;
  d.gridColor = '#333333';
  d.categories = [
    // 큰 값이 아래, '기타'(계열 4)가 맨 위 — 막대마다 순서가 다르다
    { label: '(가)', values: [48, 0, 0, 31, 21], segmentOrder: [0, 3, 4] },
    { label: '(나)', values: [0, 47, 43, 0, 10], segmentOrder: [1, 2, 4] },
    { label: '(다)', values: [7, 0, 20, 49, 24], segmentOrder: [3, 2, 0, 4] },
  ];
  return d;
};

const deviationBWithData = () => {
  const d = createDefaultDeviationBData();
  d.baseTemp = 12;
  d.basePrecip = 1300;
  d.regions = [
    { label: 'A', precip: 1550, temp: 9.5 },
    { label: 'B', precip: 1180, temp: 14.2 },
    { label: 'C', precip: 900, temp: 11.1 },
  ];
  return d;
};

const hythergraphWithData = () => {
  const d = createDefaultHythergraphData();
  d.series = [
    { label: '(가)', months: months12(seasonalTemp, seasonalPrecip) },
    { label: '(나)', months: months12((m) => seasonalTemp(m) + 6, (m) => seasonalPrecip(m) / 2) },
  ];
  return d;
};

/** 저연령이 넓고 고연령으로 갈수록 좁아지는 인구 구조 */
const pyramidWithData = () => {
  const d = createDefaultPyramidData();
  d.ages = Array.from({ length: 17 }, (_, i) => {
    const male = Math.round((4.2 - i * 0.18) * 10) / 10;
    return { male: Math.max(0.3, male), female: Math.max(0.3, male + 0.2) };
  });
  return d;
};

/**
 * 시험지 피라미드 — 나이 수치 축 + 남녀 같은 연회색 + 단위 (%) 를 눈금
 * 숫자와 같은 줄에 두는 배치. 단위가 마지막 숫자와 겹치지 않는지 감시한다.
 */
const pyramidExam = () => {
  const d = pyramidWithData();
  d.numericAgeAxis = true;
  d.ageUnit = '(세)';
  d.sexFills = ['#d9d9d9', '#d9d9d9'];
  d.axisLabelInline = true;
  d.range = { max: 12, auto: false };
  return d;
};

/**
 * 시험지 피라미드가 맨 위 구간을 합쳐 **18구간**을 주는 경우.
 * 나이 눈금이 85 가 아니라 90 까지 올라가고, 합친 칸이 두툼하게 나온다.
 */
const pyramidTopBin = () => {
  const d = pyramidExam();
  const top = { male: 1.8, female: 3.6 };
  d.ages = [...d.ages, top];
  return d;
};

const radarWithData = () => {
  const d = createDefaultRadarData();
  d.series = [
    { label: '(가)', values: [80, 45, 60, 30, 70] },
    { label: '(나)', values: [40, 75, 35, 85, 50] },
  ];
  return d;
};

/** 계열 2개 — 기호 모양으로 구분되는지까지 감시한다 */
const categoryDotWithData = () => {
  const d = createDefaultCategoryDotData();
  d.categories = [
    { label: 'A', values: [16.8, 5.2] },
    { label: 'B', values: [10.6, 12.1] },
    { label: 'C', values: [9.3, 18.4] },
    { label: 'D', values: [24.6, 7.7] },
  ];
  d.seriesLabels = ['(가)', '(나)'];
  d.unit = '(°C)';
  return d;
};

/**
 * 누적 막대 — 축 바닥이 음수로 내려간 상태에서 0부터 쌓이는지 감시한다.
 * (기본 absbar 케이스는 그룹 막대라 누적 경로를 지나지 않는다.)
 */
const absBarStacked = () => {
  const d = createDefaultAbsBarData();
  d.stacked = true;
  d.seriesLabels = ['항목1', '항목2', '항목3'];
  d.categories = [
    { label: '(가)', values: [30, 20, 10] },
    { label: '(나)', values: [45, 15, 25] },
    { label: '(다)', values: [20, 35, 15] },
  ];
  return d;
};

/**
 * 가로 누적 막대 + 2단 라벨 — 그룹 배치·플롯 안 범례·축 끝 단위를 감시한다.
 * (2023학년도 6월 세계지리 13번 모양)
 */
const absBarGrouped = () => {
  const d = createDefaultAbsBarData();
  d.barDirection = 'horizontal';
  d.stacked = true;
  // 네 번째 계열은 사선 빗금 — 회색이 모자랄 때 쓰는 채움이라 같이 감시한다
  d.seriesLabels = ['미국', '(가)', '(나)', '(다)'];
  d.seriesFills = ['#a6a6a6', '#ffffff', '#595959', 'pattern:diagonal'];
  d.categories = [
    { label: '1990년', values: [19, 0.5, 15, 4] },
    { label: '2020년', values: [30, 12, 15, 6] },
    { label: '1990년', values: [19, 23, 7, 3] },
    { label: '2020년', values: [9, 73, 2, 8] },
  ];
  d.groups = [{ label: 'A', span: 2 }, { label: 'B', span: 2 }];
  d.unit = '(EJ)';
  d.unitAdjacent = true;
  d.insideLegend = 'top-right';
  d.yRange = { min: 0, max: 100, auto: false, step: 20 };
  return d;
};

/** 편차 막대 — 0 기준선 위아래로 자라는 모양을 감시한다 */
const absBarZeroBaseline = () => {
  const d = createDefaultAbsBarData();
  d.seriesLabels = ['(가)', '(나)'];
  d.seriesFills = ['#fff', '#666'];
  d.zeroBaseline = true;
  d.categoryLabelAtBaseline = true;
  d.unit = '(mm)';
  d.yRange = { min: -300, max: 300, auto: false, step: 100 };
  d.categories = [
    { label: 'A', values: [273, 12] },
    { label: 'B', values: [231, -68] },
    { label: 'C', values: [199, 58] },
    { label: 'D', values: [-205, 210] },
  ];
  return d;
};

/**
 * 버블 범례 — **데이터 최대보다 큰 항목이 섞인 경우**를 감시한다.
 * 원 반지름이 (크기 / 데이터최대) 비율이라, 큰 항목을 그대로 그리면
 * 배율이 1을 넘어 상자와 캔버스를 뚫고 나갔다 (2026-08-04 수정).
 */
const scatterBubbleLegend = () => {
  const d = createDefaultScatterData();
  d.showBubble = true;
  d.bubbleScale = 34;
  d.bubbleLegendPosition = 'top-right';
  d.points = [
    { x: 17.5, y: 16.6, size: 144_000_000, label: '러시아' },
    { x: 11.6, y: 29.5, size: 125_000_000, label: '(가)' },
    { x: 28.5, y: 6.2, size: 113_000_000, label: '(나)' },
  ];
  // 10억은 어떤 점보다도 크다 — 빠져야 한다
  d.bubbleLegendItems = [
    { size: 1_000_000_000, label: '10억 명' },
    { size: 100_000_000, label: '1억 명' },
    { size: 50_000_000, label: '5천만 명' },
  ];
  return d;
};

/**
 * 버블 범례가 자료를 덮는 자리 · 큰 원과 작은 원이 겹치는 경우를 감시한다.
 * - 원하는 모서리(우상단)에 점이 있으면 범례가 **덜 겹치는 모서리로** 옮겨야 한다.
 * - 겹친 원은 **작은 쪽이 위로** 와야 가려지지 않는다.
 */
const scatterLegendAvoid = () => {
  const d = createDefaultScatterData();
  d.showBubble = true;
  d.bubbleScale = 34;
  d.bubbleLegendPosition = 'top-right';
  d.points = [
    { x: 18.0, y: 17.0, size: 300_000_000, label: '큰원' },
    { x: 18.6, y: 17.4, size: 60_000_000, label: '작은원' },   // 큰원과 겹친다
    { x: 26.0, y: 30.0, size: 125_000_000, label: '우상단' },  // 범례 자리를 막는다
  ];
  d.bubbleLegendItems = [
    { size: 100_000_000, label: '1억 명' },
    { size: 50_000_000, label: '5천만 명' },
  ];
  d.fillLegend = {
    title: '1인당 국내총생산',
    items: [
      { label: '3만 달러 초과', fill: '#595959' },
      { label: '1만~3만 달러', fill: '#bfbfbf' },
    ],
  };
  return d;
};

/**
 * 점이 서로 붙어 있는 산점도 — 라벨 겹침 회피와 유도선이 작동하는지 감시한다.
 * 기본 scatter 케이스는 점이 넉넉히 떨어져 있어 회피 경로를 지나지 않는다.
 */
const scatterCrowded = () => {
  const d = createDefaultScatterData();
  d.showBubble = false;
  d.points = [
    { x: 30, y: 50, size: 0, label: '(가)' },
    { x: 31, y: 51, size: 0, label: '(나)' },
    { x: 32, y: 49.5, size: 0, label: '(다)' },
    { x: 30.5, y: 48, size: 0, label: '(라)' },
    { x: 33, y: 50.5, size: 0, label: '(마)' },
  ];
  return d;
};

/**
 * 눈금이 아주 촘촘한 산점도 — 숫자 솎아내기와 축 이름 밀어내기를 감시한다.
 * 칸이 40개면 숫자를 전부 그릴 수 없고, 숫자가 길면 축 이름을 밟는다.
 */
const scatterDenseTicks = () => {
  const d = createDefaultScatterData();
  d.showBubble = false;
  d.points = [
    { x: 1000, y: 200000, size: 0, label: 'A' },
    { x: 8000, y: 950000, size: 0, label: 'B' },
  ];
  d.xRange = { min: 0, max: 10000, auto: false, step: 250 };
  d.yRange = { min: 0, max: 1000000, auto: false, step: 25000 };
  return d;
};

/**
 * 시험지 틀 산점도 — 사각 테두리·진한 점선 격자·마지막 눈금 옆 단위(`examFrame`)와
 * **각주·출처가 한 줄에 좌우로 놓이는지**(`sourceInline`)를 감시한다.
 * (2027학년도 6월 모평 한국지리 7번 모양)
 */
const scatterExamFrame = () => {
  const d = createDefaultScatterData();
  d.showBubble = false;
  d.examFrame = true;
  d.points = [
    { x: -1.9, y: 348, size: 0, label: 'A' },
    { x: 1.0, y: 325, size: 0, label: 'B' },
    { x: 1.1, y: 245, size: 0, label: 'C' },
    { x: 3.6, y: 267, size: 0, label: 'D' },
  ];
  d.xLabel = '1월 평균 기온';
  d.yLabel = '8\\n월\\n강\\n수\\n량';
  d.xUnit = '(°C)';
  d.yUnit = '(mm)';
  d.xRange = { min: -3, max: 4, auto: false, step: 1 };
  d.yRange = { min: 0, max: 400, auto: false, step: 100 };
  return d;
};

/**
 * 꺾은선 — 계열 3개를 선 종류·기호로 구분하고 이름은 선 끝에 붙인다.
 * 0 기준선(편차형)과 선 끝 라벨 겹침 회피까지 감시한다.
 */
const lineWithData = () => {
  const d = createDefaultLineData();
  const shape = (peak: number, shift: number) =>
    Array.from({ length: 12 }, (_, m) =>
      Math.round((peak * Math.cos(((m - shift) * Math.PI) / 6)) * 10) / 10);
  d.series = [
    { label: '(가)', values: shape(28, 0), lineStyle: 'solid', marker: 'circle', hollowMarker: true },
    { label: '(나)', values: shape(14, 0), lineStyle: 'solid', marker: 'square' },
    { label: '(다)', values: shape(18, 0).map((v) => v - 4), lineStyle: 'dashed', marker: 'circle', hollowMarker: true },
  ];
  d.yUnit = '(°C)';
  d.yRange = { min: -30, max: 40, auto: false, step: 10 };
  d.zeroBaseline = true;
  return d;
};

/**
 * 2027학년도 6월 모평 한국지리 17번 모양 — 5년 자료에 10년 라벨(빈 이름),
 * 계열은 굵은 일점쇄선·굵은 회색 실선·가는 검정 실선, 이름은 **유도선**.
 * 세로 격자·진한 격자·출처 인라인까지 감시한다.
 */
const lineLeader = () => {
  const d = createDefaultLineData();
  d.xLabels = ['1980', '', '1990', '', '2000', '', '2010', '', '2020'];
  d.series = [
    { label: '(가)', values: [190, 150, 130, 113, 100, 85, 83, 89, 88],
      lineStyle: 'dashdot', lineWidth: 3.5, leader: { at: 2, dx: 40, dy: -45 } },
    { label: '(나)', values: [88, 93, 97, 98, 100, 100, 99, 103, 104],
      lineStyle: 'solid', lineWidth: 3.5, stroke: '#999', leader: { at: 2, dx: -30, dy: -45 } },
    { label: '(다)', values: [57, 70, 87, 97, 100, 100, 99, 98, 97],
      lineStyle: 'solid', lineWidth: 1.5, leader: { at: 3, dx: 30, dy: 45 } },
  ];
  d.xUnit = '(년)';
  d.yUnit = '';
  d.yRange = { min: 0, max: 200, auto: false, step: 50 };
  d.labelPlacement = 'leader';
  d.showMarkers = false;
  d.xGrid = true;
  d.gridColor = '#555';
  d.gridWidth = 1;
  return d;
};

/**
 * 2026학년도 9월 모평 한국지리 13번 모양 — 0 에서 시작하지 않는 y(80~120),
 * 굵은 실선·파선·일점쇄선, 이름은 선 끝. 제목·세로 격자·출처 인라인.
 */
const lineEndExam = () => {
  const d = createDefaultLineData();
  d.xLabels = ['1990', '1995', '2000', '2005', '2010', '2015', '2023'];
  d.series = [
    { label: 'A', values: [93, 92.5, 97.5, 100, 105, 113, 119], lineStyle: 'solid', lineWidth: 3 },
    { label: 'B', values: [81, 89, 94, 100, 104.5, 111, 115], lineStyle: 'dashed' },
    { label: 'C', values: [99, 101, 101.5, 100, 100, 103, 99.5], lineStyle: 'dashdot' },
  ];
  d.xUnit = '(년)';
  d.yUnit = '';
  d.yRange = { min: 80, max: 120, auto: false, step: 10 };
  d.labelPlacement = 'lineEnd';
  d.showMarkers = false;
  d.xGrid = true;
  d.gridColor = '#555';
  d.gridWidth = 1;
  return d;
};

/**
 * 제목·각주가 캔버스보다 긴 경우 — 잘리지 않고 줄어드는지 감시한다.
 * 데이터는 기본값 그대로 두고 글자만 길게 준다.
 */
const absBarLongText = () => createDefaultAbsBarData();

/** 렌더러 이름 → [렌더 함수, 데이터 생성기] */
/* ── 경제 좌표평면 ────────────────────────────────────────────────────────
 *
 * 기본 데이터가 이미 가장 흔한 그림(수요·공급 교차)이라 채워 넣을 것이 없다.
 * 아래 셋은 기본값으로는 한 번도 그려지지 않는 길을 밟는 케이스다 —
 * 축 생략 기호·화살표·네 사분면·십자 유도선·점 없는 유도선.
 */

/**
 * 2026학년도 9월 경제 7번 모양 — **축 생략 기호**(두 축 모두)·눈금이 0에서
 * 시작하지 않는 축·점마다 내리는 유도선·점 사이 화살표·나침반 네 방향의
 * 점 이름을 한 장에 모았다.
 */
const econPlaneShift = (): EconPlaneData => ({
  quadrants: 'first',
  xAxis: { label: '경제 활동 참가율(%)', min: 66, max: 86, ticks: [72, 80], broken: true },
  yAxis: { label: '고용률(%)', min: 48, max: 68, ticks: [54, 60, 64], broken: true },
  grid: false,
  dash: 'dashed',
  lines: [],
  points: [
    { x: 72, y: 54, label: 't년', labelPos: 'bottom-left', guide: 'both', dot: true },
    { x: 72, y: 60, label: 't+1년', labelPos: 'top-left', guide: 'both', dot: true },
    { x: 80, y: 64, label: 't+2년', labelPos: 'right', guide: 'both', dot: true },
    { x: 80, y: 60, label: 't+3년', labelPos: 'right', guide: 'both', dot: true },
  ],
  arrows: [
    { from: { x: 72, y: 54 }, to: { x: 72, y: 60 }, offset: 0, shorten: 14, label: '', labelPos: 'right' },
    { from: { x: 72, y: 60 }, to: { x: 80, y: 64 }, offset: 0, shorten: 14, label: '', labelPos: 'right' },
    { from: { x: 80, y: 64 }, to: { x: 80, y: 60 }, offset: 0, shorten: 14, label: '', labelPos: 'right' },
  ],
});

/**
 * 2027학년도 6월 경제 16번 모양 — **네 사분면**(축 양끝 화살촉)·촘촘한 점선·
 * 음수 눈금(빼기 기호 U+2212)·플롯 «안쪽» 에 놓인 눈금 숫자를 감시한다.
 * 안쪽 숫자는 뒤로 지나가는 점선을 희게 끊고 그린다.
 */
const econPlaneQuadrants = (): EconPlaneData => ({
  quadrants: 'all',
  xAxis: { label: '물가 상승률(%)', min: -8, max: 8, ticks: [-5, -1, 3, 5], broken: false },
  yAxis: { label: '경제 성장률(%)', min: -8, max: 8, ticks: [5, 3, -5], broken: false },
  grid: false,
  dash: 'dotted',
  lines: [],
  points: [
    { x: -5, y: 5, label: 't+4년', labelPos: 'left', guide: 'both', dot: true },
    { x: 5, y: 3, label: 't+1년', labelPos: 'right', guide: 'both', dot: true },
    { x: -1, y: -5, label: 't+3년', labelPos: 'left', guide: 'both', dot: true },
    { x: 3, y: -5, label: 't+2년', labelPos: 'right', guide: 'both', dot: true },
  ],
  arrows: [],
});

/**
 * 총수요·총공급 — **비켜 놓은 화살표**와 그 옆 이름 `(가)`·`(나)`(2026학년도
 * 9월 16번)에, 남은 두 갈래를 일부러 얹었다: 십자 유도선(`guide: 'cross'`,
 * 2026학년도 수능 12번)과 점 없는 유도선(`dot: false`, 2026학년도 수능 7번).
 * 실물 한 장을 그대로 옮긴 것이 아니라 **덜 쓰이는 길을 한 장에 모은** 케이스다.
 */
const econPlaneAdAs = (): EconPlaneData => ({
  quadrants: 'first',
  xAxis: { label: '실질 GDP', min: 0, max: 10, ticks: [], broken: false },
  yAxis: { label: '물가', min: 0, max: 10, ticks: [], broken: false },
  grid: false,
  dash: 'dashed',
  lines: [
    { label: '총공급', from: { x: 1, y: 1 }, to: { x: 8.5, y: 8.5 }, labelAt: 'to' },
    { label: '총수요', from: { x: 1, y: 8.5 }, to: { x: 8.5, y: 1 }, labelAt: 'to' },
  ],
  points: [
    { x: 4.75, y: 4.75, label: 'E', labelPos: 'right', guide: 'cross', dot: true },
    { x: 2.2, y: 7.3, label: '', labelPos: 'right', guide: 'none', dot: true },
    { x: 2.2, y: 2.2, label: '', labelPos: 'right', guide: 'to-x', dot: false },
  ],
  arrows: [
    { from: { x: 4.75, y: 4.75 }, to: { x: 2.9, y: 6.6 }, offset: 14, shorten: 14, label: '(가)', labelPos: 'right' },
    { from: { x: 4.75, y: 4.75 }, to: { x: 2.9, y: 2.9 }, offset: -14, shorten: 14, label: '(나)', labelPos: 'right' },
  ],
});

/**
 * 2027학년도 6월 경제 3번 〈X재 시장〉 모양 — **파선으로 그은 직선**과
 * **아래 첨자**를 감시한다.
 *
 * 사적 편익만 반영한 수요 곡선 `D_1` 은 실선, 사회적 편익까지 반영한 `D_2` 는
 * 파선이다. 색이 없는 시험지에서 그 둘을 가르는 것이 선 종류뿐이라 문항의 뜻이
 * 여기 걸려 있다. 직선 셋이 **두 축 어디에도 닿지 않는** 것도 실물 그대로다.
 */
const econPlaneDashed = (): EconPlaneData => ({
  quadrants: 'first',
  xAxis: { label: '수량', min: 0, max: 10, ticks: [], broken: false },
  yAxis: { label: '가격', min: 0, max: 10, ticks: [], broken: false },
  grid: false,
  dash: 'dashed',
  lines: [
    { label: 'S', from: { x: 1, y: 1.7 }, to: { x: 8, y: 9.7 }, labelAt: 'to' },
    { label: 'D_1', from: { x: 0.8, y: 7.8 }, to: { x: 7, y: 1.3 }, labelAt: 'to' },
    { label: 'D_2', from: { x: 2.2, y: 9.6 }, to: { x: 8.4, y: 3.1 }, labelAt: 'to', dashed: true },
  ],
  points: [],
  arrows: [],
});

/**
 * 2027학년도 6월 경제 16번 모양 — **계열·범례 상자·이름표 눈금·두 줄 축 이름**을
 * 한 장에 모았다. 1.4.0 이 「범례 상자가 없다」고 적어 둔 것을 뒤집은 그림이다.
 *
 * 가로축은 값이 아니라 이름(`t년`·`t+1년`·`t+2년`)이고, 세로축은 숫자가 하나도
 * 없이 이름만 두 줄(「GDP」·「(억 달러)」)로 선다. 두 축에 생략 기호가 있고,
 * 꼭짓점마다 가로축으로 파선이 내려간다.
 */
const econPlaneSeries = (): EconPlaneData => ({
  quadrants: 'first',
  xAxis: {
    label: '연도', min: 0, max: 4.5, ticks: [1, 2, 3],
    tickLabels: ['t년', 't+1년', 't+2년'], broken: true,
  },
  yAxis: { label: 'GDP\\n(억 달러)', min: 0, max: 10, ticks: [], broken: true },
  grid: false,
  dash: 'dashed',
  lines: [],
  points: [],
  arrows: [],
  series: [
    {
      label: '명목 GDP',
      points: [{ x: 1, y: 7.2 }, { x: 2, y: 6.2 }, { x: 3, y: 3.2 }],
      dashed: true, marker: 'circle', hollow: false,
    },
    {
      label: '실질 GDP',
      points: [{ x: 1, y: 3.5 }, { x: 2, y: 6.2 }, { x: 3, y: 8.8 }],
      dashed: false, marker: 'square', hollow: true,
    },
  ],
  legend: 'bottom-right',
  seriesGuides: true,
});

/**
 * 2027학년도 6월 경제 17번 모양 — **눈금 자리에 숫자 대신 이름**을 적는 축과
 * 소수 눈금을 감시한다.
 *
 * 세로축에는 숫자가 없고 `P_1`·`P_2` 두 이름만 선다(첨자까지 재야 왼쪽 여백이
 * 맞는다). 가로축은 반대로 `0.5`·`1.5` 라는 소수다. 점 둘이 두 축으로 파선을
 * 내려 서로의 자리를 알려 준다.
 */
const econPlaneTickLabels = (): EconPlaneData => ({
  quadrants: 'first',
  xAxis: { label: '수요량에 대한 공급량의 비', min: 0, max: 2.2, ticks: [0.5, 1.5], broken: false },
  yAxis: { label: '가격', min: 0, max: 10, ticks: [4, 7.5], tickLabels: ['P_1', 'P_2'], broken: false },
  grid: false,
  dash: 'dashed',
  lines: [],
  points: [
    { x: 0.5, y: 4, label: '', labelPos: 'top-right', guide: 'both', dot: true },
    { x: 1.5, y: 7.5, label: '', labelPos: 'top-right', guide: 'both', dot: true },
  ],
  arrows: [],
});

/**
 * 물결 자리를 자료가 정하는 그림 — `brokenAt`.
 *
 * 축은 고용 지표(`econPlaneShift`)에서 빌렸다. 기본 자리는 원점과 첫 눈금의
 * 한가운데(가로 69쯤·세로 51쯤)인데, 여기서는 첫 눈금 «바로 앞» 으로 당겨
 * 붙였다(71·53). 교과서가 흔히 그 자리에 찍는다.
 */
const econPlaneBrokenAt = (): EconPlaneData => ({
  quadrants: 'first',
  xAxis: { label: '경제 활동 참가율(%)', min: 66, max: 86, ticks: [72, 80], broken: true, brokenAt: 71 },
  yAxis: { label: '고용률(%)', min: 48, max: 68, ticks: [54, 60, 64], broken: true, brokenAt: 53 },
  grid: false,
  dash: 'dashed',
  lines: [],
  points: [
    { x: 72, y: 54, label: 'A', labelPos: 'top-left', guide: 'both', dot: true },
    { x: 80, y: 64, label: 'B', labelPos: 'top-left', guide: 'both', dot: true },
  ],
  arrows: [],
});

export const CASES: [string, Renderer, () => unknown][] = [
  ['absbar', renderAbsBarGraph as Renderer, createDefaultAbsBarData],
  ['absbarLongText', renderAbsBarGraph as Renderer, absBarLongText],
  ['absbarStacked', renderAbsBarGraph as Renderer, absBarStacked],
  ['absbarGrouped', renderAbsBarGraph as Renderer, absBarGrouped],
  ['absbarZeroBaseline', renderAbsBarGraph as Renderer, absBarZeroBaseline],
  ['categorydot', renderCategoryDotGraph as Renderer, categoryDotWithData],
  ['climate', renderClimateGraph as Renderer, climateWithData],
  ['cube', renderCubeGraph as Renderer, createDefaultCubeData],
  ['deviationA', renderDeviationAGraph as Renderer, deviationAWithData],
  ['stackedExam', renderStackedGraph as Renderer, stackedExam],
  ['matrixTable', renderMatrixTable as Renderer, matrixTableExam],
  ['dataTable', renderDataTable as Renderer, dataTableExam],
  ['deviationAExam', renderDeviationAGraph as Renderer, deviationAExam],
  ['deviationB', renderDeviationBGraph as Renderer, deviationBWithData],
  ['econPlane', renderEconPlane as Renderer, createDefaultEconPlaneData],
  ['econPlaneAdAs', renderEconPlane as Renderer, econPlaneAdAs],
  ['econPlaneBrokenAt', renderEconPlane as Renderer, econPlaneBrokenAt],
  ['econPlaneDashed', renderEconPlane as Renderer, econPlaneDashed],
  ['econPlaneLongText', renderEconPlane as Renderer, createDefaultEconPlaneData],
  ['econPlaneQuadrants', renderEconPlane as Renderer, econPlaneQuadrants],
  ['econPlaneSeries', renderEconPlane as Renderer, econPlaneSeries],
  ['econPlaneShift', renderEconPlane as Renderer, econPlaneShift],
  ['econPlaneTickLabels', renderEconPlane as Renderer, econPlaneTickLabels],
  ['hythergraph', renderHythergraph as Renderer, hythergraphWithData],
  ['line', renderLineGraph as Renderer, lineWithData],
  ['lineLeader', renderLineGraph as Renderer, lineLeader],
  ['lineEndExam', renderLineGraph as Renderer, lineEndExam],
  ['pyramid', renderPyramidGraph as Renderer, pyramidWithData],
  ['pyramidExam', renderPyramidGraph as Renderer, pyramidExam],
  ['pyramidTopBin', renderPyramidGraph as Renderer, pyramidTopBin],
  ['radar', renderRadarChart as Renderer, radarWithData],
  ['scatter', renderScatterGraph as Renderer, createDefaultScatterData],
  ['scatterCrowded', renderScatterGraph as Renderer, scatterCrowded],
  ['scatterBubbleLegend', renderScatterGraph as Renderer, scatterBubbleLegend],
  ['scatterLegendAvoid', renderScatterGraph as Renderer, scatterLegendAvoid],
  ['scatterDenseTicks', renderScatterGraph as Renderer, scatterDenseTicks],
  ['scatterExamFrame', renderScatterGraph as Renderer, scatterExamFrame],
  ['stacked', renderStackedGraph as Renderer, createDefaultStackedData],
  ['ternary', renderTernaryGraph as Renderer, createDefaultTernaryData],
  ['treemap', renderTreemapGraph as Renderer, createDefaultTreemapData],
  ['treemapExam', renderTreemapGraph as Renderer, treemapExam],
  ['treemapLongTail', renderTreemapGraph as Renderer, treemapLongTail],
];
