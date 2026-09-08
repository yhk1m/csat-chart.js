// © 2026 김용현
// 범례 넘침 진단·회귀용 케이스 16종 × 두 자료 × 두 범례 위치.
//
// 자료 A 는 데모 페이지(docs/index.html)의 표본을 그대로 옮긴 것이고,
// 자료 B 는 «선생님이 실제로 칠 만한» 긴 한글 이름(시·군·구 이름 등)이다.
import {
  renderAbsBarGraph, renderCategoryDotGraph, renderClimateGraph, renderCubeGraph,
  renderDataTable, renderDeviationAGraph, renderDeviationBGraph, renderHythergraph,
  renderLineGraph, renderMatrixTable, renderPyramidGraph, renderRadarChart,
  renderScatterGraph, renderStackedGraph, renderTernaryGraph, renderTreemapGraph,
  createDefaultAbsBarData, createDefaultCategoryDotData, createDefaultClimateData,
  createDefaultCubeData, createDefaultDataTableData, createDefaultDeviationAData,
  createDefaultDeviationBData, createDefaultHythergraphData, createDefaultLineData,
  createDefaultMatrixTableData, createDefaultPyramidData, createDefaultRadarData,
  createDefaultScatterData, createDefaultStackedData, createDefaultTernaryData,
  createDefaultTreemapData, createDefaultGraphOptions,
  type GraphOptions, type LegendPosition,
} from '../../src/core/index';

export interface ProbeCase {
  name: string;
  render: (ctx: CanvasRenderingContext2D, w: number, h: number, data: never, options: GraphOptions) => void;
  data: () => unknown;
  options: () => GraphOptions;
}

type Maker = () => unknown;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// ── 자료 A — 데모 페이지 표본 ────────────────────────────────────────────
const A_CLIMATE = {
  months: [
    { temp: 1, precip: 30 }, { temp: 2.6, precip: 30 }, { temp: 7, precip: 30 },
    { temp: 13, precip: 140 }, { temp: 19, precip: 221 }, { temp: 23.4, precip: 250 },
    { temp: 25, precip: 221 }, { temp: 23.4, precip: 140 }, { temp: 19, precip: 30 },
    { temp: 13, precip: 30 }, { temp: 7, precip: 30 }, { temp: 2.6, precip: 30 },
  ],
  monthInterval: 12, tempLabel: '(°C)', precipLabel: '(mm)',
  tempRange: { min: -10, max: 40, auto: true },
  precipRange: { min: 0, max: 400, auto: true },
};

const A_DEVIATION_A = {
  baseMonths: Array.from({ length: 12 }, () => ({ temp: 0, precip: 0 })),
  months: [
    { temp: 6.5, precip: 100 }, { temp: 4.2, precip: 65 }, { temp: 1.5, precip: 35 },
    { temp: -0.2, precip: 18 }, { temp: -1.2, precip: 5 }, { temp: -2.5, precip: -8 },
    { temp: -2.0, precip: -215 }, { temp: -1.0, precip: -140 }, { temp: 0.8, precip: 20 },
    { temp: 3.4, precip: 50 }, { temp: 5.3, precip: 75 }, { temp: 7.0, precip: 110 },
  ],
  monthInterval: 12, tempLabel: '(°C)', precipLabel: '(mm)',
  tempAxisName: '기온 차이', precipAxisName: '강수량 차이',
  tempRange: { min: -10, max: 8, auto: false, step: 2 },
  precipRange: { min: -250, max: 200, auto: false, step: 50 },
  barFill: '#e6e6e6', barStroke: '#000000', markerShape: 'square',
  showFrame: true, insideLegend: 'bottom-right',
};

const A_DEVIATION_B = {
  baseTemp: 12, basePrecip: 1300,
  regions: [
    { label: 'A', precip: 1550, temp: 9.5 },
    { label: 'B', precip: 1180, temp: 14.2 },
    { label: 'C', precip: 900, temp: 11.1 },
  ],
  precipDiffLabel: '강수량 차이', tempDiffLabel: '기온 차이',
  precipUnit: '(mm)', tempUnit: '(°C)',
  precipRange: { min: -200, max: 200, auto: true },
  tempRange: { min: -10, max: 10, auto: true },
};

const A_HYTHER = {
  series: [
    { label: '서울', months: [
      { temp: -2.4, precip: 20 }, { temp: 0.4, precip: 25 }, { temp: 5.7, precip: 37 },
      { temp: 12.5, precip: 77 }, { temp: 17.8, precip: 105 }, { temp: 22.2, precip: 133 },
      { temp: 24.9, precip: 395 }, { temp: 25.7, precip: 300 }, { temp: 20.8, precip: 145 },
      { temp: 14.5, precip: 50 }, { temp: 7.6, precip: 47 }, { temp: -0.9, precip: 31 },
    ] },
    { label: '로마', months: [
      { temp: 6.8, precip: 78 }, { temp: 9.6, precip: 62 }, { temp: 11.9, precip: 52 },
      { temp: 13.9, precip: 46 }, { temp: 18.1, precip: 34 }, { temp: 22.0, precip: 20 },
      { temp: 24.9, precip: 15 }, { temp: 24.7, precip: 26 }, { temp: 21.4, precip: 63 },
      { temp: 17.0, precip: 92 }, { temp: 12.5, precip: 106 }, { temp: 9.2, precip: 92 },
    ] },
  ],
  mode: 'both', monthLabelStyle: 'number', xUnit: '(°C)', yUnit: '(mm)',
  xRange: { min: -10, max: 40, auto: true },
  yRange: { min: 0, max: 400, auto: true },
};

const A_PYRAMID = {
  ages: [
    { male: 4.2, female: 4.4 }, { male: 4, female: 4.2 }, { male: 3.8, female: 4 },
    { male: 3.7, female: 3.9 }, { male: 3.5, female: 3.7 }, { male: 3.3, female: 3.5 },
    { male: 3.1, female: 3.3 }, { male: 2.9, female: 3.1 }, { male: 2.8, female: 3 },
    { male: 2.6, female: 2.8 }, { male: 2.4, female: 2.6 }, { male: 2.2, female: 2.4 },
    { male: 2, female: 2.2 }, { male: 1.9, female: 2.1 }, { male: 1.7, female: 1.9 },
    { male: 1.5, female: 1.7 }, { male: 1.3, female: 1.5 },
  ],
  unit: 'percent', maleLabel: '남', femaleLabel: '여', axisLabel: '(%)',
  range: { max: 5, auto: false }, ageLabelSide: 'center',
  numericAgeAxis: true, ageUnit: '(세)', axisLabelInline: true,
  sexFills: ['#d9d9d9', '#d9d9d9'],
};

const A_RADAR = {
  axisLabels: ['축1', '축2', '축3', '축4', '축5'],
  series: [
    { label: '(가)', values: [80, 45, 60, 30, 70] },
    { label: '(나)', values: [40, 75, 35, 85, 50] },
  ],
  maxValue: 100, autoMax: true, gridSteps: 5, showFill: false,
};

const A_CUBE = {
  points: [
    { x: 0.25, y: 0.85, z: 0.65, label: '가', labelDx: 8, labelDy: -4 },
    { x: 0.8, y: 0.6, z: 0.3, label: '나', labelDx: 10, labelDy: 0 },
    { x: 0.85, y: 0.4, z: 0.75, label: '다', labelDx: 14, labelDy: -6 },
  ],
  xAxis: { name: 'X축', lowLabel: '낮음', highLabel: '높음',
    lowOffset: { x: -55, y: 32 }, highOffset: { x: -40, y: 0 } },
  yAxis: { name: 'Y축', lowLabel: '낮음', highLabel: '높음',
    lowOffset: { x: -25, y: -8 }, highOffset: { x: 0, y: 0 } },
  zAxis: { name: 'Z축', lowLabel: '낮음', highLabel: '높음',
    lowOffset: { x: 55, y: 10 }, highOffset: { x: 0, y: 0 } },
};

const A_LINE = {
  series: [
    { label: '합계출산율', values: [4.53, 2.82, 1.57, 1.47, 1.23, 1.24, 0.84, 0.81, 0.78, 0.72, 0.75, 0.75] },
  ],
  xLabels: ['1970', '1980', '1990', '2000', '2010', '2015', '2020', '2021', '2022', '2023', '2024', '2025'],
  xUnit: '(년)', yUnit: '(명)',
  yRange: { min: 0, max: 5, auto: true },
  labelPlacement: 'lineEnd', showMarkers: true,
};

const A_SCATTER: Maker = () => {
  const d = createDefaultScatterData();
  d.xLabel = '인구밀도'; d.xUnit = '(명/km²)';
  d.yLabel = '지역내총생산'; d.yUnit = '(백만 원)';
  return d;
};

const A_STACKED: Maker = () => {
  const d = createDefaultStackedData();
  d.seriesLabels = ['1차 산업', '2차 산업', '3차 산업'];
  return d;
};

// ── 자료 B — 선생님이 실제로 칠 만한 긴 한글 이름 ────────────────────────
const LONG = ['서울특별시 강남구', '경기도 성남시 분당구', '강원특별자치도 춘천시', '전라남도 여수시'];

const B_ABSBAR: Maker = () => {
  const d = createDefaultAbsBarData();
  d.seriesLabels = [LONG[0], LONG[1], LONG[2]];
  d.categories = [
    { label: '2015년', values: [30, 50, 20] },
    { label: '2020년', values: [45, 35, 25] },
    { label: '2025년', values: [60, 20, 30] },
  ];
  return d;
};

const B_CATEGORY_DOT: Maker = () => {
  const d = createDefaultCategoryDotData();
  d.seriesLabels = [LONG[0], LONG[1]];
  d.categories = [
    { label: '1월', values: [16.8, 5.2] },
    { label: '4월', values: [10.6, 12.1] },
    { label: '7월', values: [9.3, 18.4] },
    { label: '10월', values: [24.6, 7.7] },
  ];
  d.unit = '(°C)';
  return d;
};

const B_CLIMATE: Maker = () => {
  const d = clone(A_CLIMATE) as ReturnType<typeof createDefaultClimateData>;
  d.precipLabel = '월 강수량(mm)';
  d.tempLabel = '월평균 기온(°C)';
  return d;
};

const B_DEVIATION_A: Maker = () => {
  const d = clone(A_DEVIATION_A) as unknown as ReturnType<typeof createDefaultDeviationAData>;
  d.precipLabel = '평년 대비 강수량 차이(mm)';
  d.tempLabel = '평년 대비 기온 차이(°C)';
  return d;
};

const B_DEVIATION_A_OUT: Maker = () => {
  const d = B_DEVIATION_A() as ReturnType<typeof createDefaultDeviationAData>;
  d.insideLegend = undefined;
  return d;
};

const B_DEVIATION_B: Maker = () => {
  const d = clone(A_DEVIATION_B) as unknown as ReturnType<typeof createDefaultDeviationBData>;
  d.precipDiffLabel = '평년 대비 강수량 차이';
  d.tempDiffLabel = '평년 대비 기온 차이';
  d.regions = [
    { label: '서울특별시 강남구', precip: 1550, temp: 9.5 },
    { label: '경기도 성남시 분당구', precip: 1180, temp: 14.2 },
    { label: '강원특별자치도 춘천시', precip: 900, temp: 11.1 },
  ];
  return d;
};

const B_HYTHER: Maker = () => {
  const d = clone(A_HYTHER) as unknown as ReturnType<typeof createDefaultHythergraphData>;
  d.series[0].label = '서울특별시 종로구';
  d.series[1].label = '이탈리아 로마';
  // 선생님이 도시 셋을 견주는 것은 흔한 쓰임이다
  d.series.push({ ...clone(d.series[1]), label: '제주특별자치도 서귀포시' });
  return d;
};

const B_LINE: Maker = () => {
  const d = clone(A_LINE) as unknown as ReturnType<typeof createDefaultLineData>;
  d.series = [
    { ...d.series[0], label: '서울특별시 합계출산율' },
    { ...d.series[0], label: '경기도 성남시 분당구 합계출산율',
      values: d.series[0].values.map((v) => (v ?? 0) * 1.1) },
    { ...d.series[0], label: '강원특별자치도 춘천시 합계출산율',
      values: d.series[0].values.map((v) => (v ?? 0) * 0.9) },
  ];
  d.labelPlacement = 'legend';
  return d;
};

const B_PYRAMID: Maker = () => {
  const d = clone(A_PYRAMID) as unknown as ReturnType<typeof createDefaultPyramidData>;
  d.maleLabel = '남자 인구 비율';
  d.femaleLabel = '여자 인구 비율';
  return d;
};

const B_RADAR: Maker = () => {
  const d = clone(A_RADAR) as unknown as ReturnType<typeof createDefaultRadarData>;
  d.axisLabels = ['1차 산업 비중', '2차 산업 비중', '3차 산업 비중', '노년 인구 비율', '주간 인구 지수'];
  d.series = [
    { label: '서울특별시', values: [80, 45, 60, 30, 70] },
    { label: '울산광역시', values: [40, 75, 35, 85, 50] },
  ];
  return d;
};

const B_STACKED: Maker = () => {
  const d = createDefaultStackedData();
  d.seriesLabels = ['1차 산업 취업자', '2차 산업 취업자', '3차 산업 취업자'];
  d.categories = [
    { label: '서울특별시', values: [2, 18, 80] },
    { label: '경기도 성남시', values: [5, 30, 65] },
    { label: '강원특별자치도', values: [12, 25, 63] },
  ];
  return d;
};

const B_SCATTER: Maker = () => {
  const d = createDefaultScatterData();
  d.xLabel = '인구밀도'; d.xUnit = '(명/km²)';
  d.yLabel = '지역내총생산'; d.yUnit = '(백만 원)';
  d.points = d.points.map((p, i) => ({ ...p, label: LONG[i % LONG.length] }));
  return d;
};

const B_ABSBAR_INSIDE: Maker = () => {
  const d = B_ABSBAR() as ReturnType<typeof createDefaultAbsBarData>;
  d.insideLegend = 'top-right';
  return d;
};

const A_ABSBAR_INSIDE: Maker = () => {
  const d = createDefaultAbsBarData();
  d.insideLegend = 'top-right';
  return d;
};

const OPT_A: Record<string, Partial<GraphOptions>> = {
  climate: { title: '서울의 기후', source: '기상청', footnotes: ['1991~2020년의 평년값임.'] },
  scatter: { title: '시·도별 인구밀도와 1인당 지역내총생산', source: '통계청, 2023' },
  stacked: { title: '(가)~(다) 지역의 산업별 취업자 비중', source: '통계청' },
  pyramid: { title: '우리나라의 인구 피라미드', source: '통계청, 2023' },
};

const B_TITLE = '지역별 통계 비교';

function opts(position: LegendPosition, patch?: Partial<GraphOptions>): () => GraphOptions {
  return () => ({ ...createDefaultGraphOptions(), showLegend: true, legendPosition: position, ...patch });
}

type Entry = [string, ProbeCase['render'], Maker, Maker];

/** [종류 이름, 렌더러, 자료 A, 자료 B] */
const TYPES: Entry[] = [
  ['absbar', renderAbsBarGraph as ProbeCase['render'], createDefaultAbsBarData, B_ABSBAR],
  ['absbar(안쪽범례)', renderAbsBarGraph as ProbeCase['render'], A_ABSBAR_INSIDE, B_ABSBAR_INSIDE],
  ['category-dot', renderCategoryDotGraph as ProbeCase['render'], createDefaultCategoryDotData, B_CATEGORY_DOT],
  ['climate', renderClimateGraph as ProbeCase['render'], () => clone(A_CLIMATE), B_CLIMATE],
  ['cube', renderCubeGraph as ProbeCase['render'], () => clone(A_CUBE), createDefaultCubeData],
  ['data-table', renderDataTable as ProbeCase['render'], createDefaultDataTableData, createDefaultDataTableData],
  ['deviation-a(안쪽범례)', renderDeviationAGraph as ProbeCase['render'], () => clone(A_DEVIATION_A), B_DEVIATION_A],
  ['deviation-a', renderDeviationAGraph as ProbeCase['render'], createDefaultDeviationAData, B_DEVIATION_A_OUT],
  ['deviation-b', renderDeviationBGraph as ProbeCase['render'], () => clone(A_DEVIATION_B), B_DEVIATION_B],
  ['hythergraph', renderHythergraph as ProbeCase['render'], () => clone(A_HYTHER), B_HYTHER],
  ['line', renderLineGraph as ProbeCase['render'], () => clone(A_LINE), B_LINE],
  ['matrix-table', renderMatrixTable as ProbeCase['render'], createDefaultMatrixTableData, createDefaultMatrixTableData],
  ['pyramid', renderPyramidGraph as ProbeCase['render'], () => clone(A_PYRAMID), B_PYRAMID],
  ['radar', renderRadarChart as ProbeCase['render'], () => clone(A_RADAR), B_RADAR],
  ['scatter', renderScatterGraph as ProbeCase['render'], A_SCATTER, B_SCATTER],
  ['stacked', renderStackedGraph as ProbeCase['render'], A_STACKED, B_STACKED],
  ['ternary', renderTernaryGraph as ProbeCase['render'], createDefaultTernaryData, createDefaultTernaryData],
  ['treemap', renderTreemapGraph as ProbeCase['render'], createDefaultTreemapData, createDefaultTreemapData],
];

const POSITIONS: LegendPosition[] = ['bottom', 'right'];

export const CASES_A: ProbeCase[] = TYPES.flatMap(([name, render, makeA]) =>
  POSITIONS.map((position) => ({
    name: `${name} · 데모자료 · ${position}`,
    render,
    data: makeA,
    options: opts(position, OPT_A[name.replace(/\(.*\)/, '')]),
  })));

export const CASES_B: ProbeCase[] = TYPES.flatMap(([name, render, , makeB]) =>
  POSITIONS.map((position) => ({
    name: `${name} · 긴이름 · ${position}`,
    render,
    data: makeB,
    options: opts(position, { title: B_TITLE, source: '통계청' }),
  })));
