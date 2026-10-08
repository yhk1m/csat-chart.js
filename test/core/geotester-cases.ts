// © 2026 김용현
// GeoTester v2 문항 그림 — 어댑터가 넘기는 자료·선택지·캔버스 크기·배율을 그대로 옮겼다 (2.2.1).
//
// GeoTester 는 패널(가로×세로)을 `EXAM_SCALE = 0.7` 로 나눈 논리 캔버스에 exam 기본값
// 그대로 그린 뒤 통째로 줄인다(`ctx.scale(0.7, 0.7)`). 여기서도 똑같이 그린다 —
// 라이브러리 입장에서는 «작은 캔버스에 시험지 글자 크기» 가 들어오는 경우다.
import {
  renderAbsBarGraph, renderScatterGraph, renderStackedGraph, renderTreemapGraph,
  createDefaultGraphOptions, type GraphOptions,
} from '../../src/core/index';

export const EXAM_SCALE = 0.7;

export interface GeoCase {
  name: string;
  /** 패널 크기 (CSS 픽셀) — 라이브러리에는 이것을 EXAM_SCALE 로 나눈 크기가 간다 */
  width: number;
  height: number;
  render: (ctx: CanvasRenderingContext2D, w: number, h: number, data: never, options: GraphOptions) => void;
  data: () => unknown;
  options: () => GraphOptions;
}

/** GeoTester 어댑터가 공통으로 넘기는 선택지 */
function geoOptions(over: Partial<GraphOptions>): GraphOptions {
  return {
    ...createDefaultGraphOptions('exam'),
    title: '', source: '', footnotes: [''],
    fontFamily: 'serif', customFont: '', fontStack: {}, style: 'exam',
    fontSize: { title: 40, axisLabel: 39, tick: 35, dataLabel: 40 },
    showDataLabels: false, showLegend: false, legendLabel1: '', legendLabel2: '',
    ...over,
  } as GraphOptions;
}

/** 패널 하나를 GeoTester 처럼 그린다 — 배율을 건 뒤 논리 크기로 */
export function renderGeoCase(ctx: CanvasRenderingContext2D, c: GeoCase): void {
  ctx.save();
  ctx.scale(EXAM_SCALE, EXAM_SCALE);
  try {
    c.render(ctx, c.width / EXAM_SCALE, c.height / EXAM_SCALE, c.data() as never, c.options());
  } finally {
    ctx.restore();
  }
}

// ── w10_202709: 가로 100% 누적 막대 — 긴 국가 이름이 왼쪽 여백에서 잘렸다 ──
const w10_202709: GeoCase = {
  name: 'w10_202709', width: 820, height: 540,
  render: renderStackedGraph as GeoCase['render'],
  data: () => ({
    displayMode: 'bar', barDirection: 'horizontal',
    categories: [
      { label: '이집트', values: [39.23, 1.7, 3.13, 53.29, 2.65] },
      { label: '이란', values: [29.13, 0.51, 1.28, 68.43, 0.65] },
      { label: '노르웨이', values: [20.21, 1.66, 63.93, 6.33, 7.87] },
      { label: '중국', values: [18.49, 52.81, 6.81, 8.96, 12.93] },
    ],
    seriesLabels: ['A', 'B', 'C', 'D', '기타'],
    seriesFills: ['#c8c8c8', 'pattern:dot', '#595959', 'pattern:diagonal', '#ffffff'],
    seriesIsSymbol: [true, true, true, true, false],
    unit: '(%)', axisStep: 20, gridColor: '#333333',
  }),
  options: () => geoOptions({
    title: '〈국가별 1차 에너지 소비 구조〉', source: '(2024)',
    showLegend: true, legendPosition: 'bottom',
  }),
};

// ── k13: 원점이 가운데인 편차 산점도 — 축이 엇갈리고 축 이름은 상자 ──
const k13: GeoCase = {
  name: 'k13', width: 720, height: 560,
  render: renderScatterGraph as GeoCase['render'],
  data: () => ({
    mode: 'deviation',
    points: [
      { x: 0.1, y: -9.1, size: 0, label: 'A' },
      { x: -1, y: 22.4, size: 0, label: 'B' },
      { x: 0.3, y: 6.3, size: 0, label: 'C' },
      { x: 0.1, y: 8.8, size: 0, label: 'D' },
    ],
    bubbleLegendPosition: 'bottom-right',
    xLabel: '(나)\\n시기\\n평균\\n기온\\n차이', yLabel: '(가) 시기 강수량 차이',
    xUnit: '(°C)', yUnit: '(mm)',
    xRange: { min: -1.5, max: 1.5, auto: false, step: 0.5 },
    yRange: { min: -30, max: 30, auto: false, step: 10 },
    showBubble: false, bubbleScale: 30, showFrame: false,
    boxedAxisLabels: true, ticksOnAxis: true, quadrantLabels: ['', '', '', ''],
  }),
  options: () => geoOptions({
    footnotes: ['기후 값 차이 = 각 지역 값 − 대전 값', '1991~2020년의 평년값임.'],
    fontSize: { title: 40, axisLabel: 26, tick: 35, dataLabel: 40 },
  }),
};

/** k13 에 시험지 기본 축 이름 크기(39)를 준 것 — 상자가 커져도 오른쪽 여백이 따라 넓어지는지 */
const k13Axis39: GeoCase = {
  ...k13, name: 'k13_axis39',
  options: () => ({ ...k13.options(), fontSize: { title: 40, axisLabel: 39, tick: 35, dataLabel: 40 } }),
};

// ── w18: 시험지 틀 산점도 — 가까운 두 점 (다)·(나) 의 이름이 겹쳤다 ──
const w18: GeoCase = {
  name: 'w18', width: 460, height: 440,
  render: renderScatterGraph as GeoCase['render'],
  data: () => ({
    mode: 'normal',
    points: [
      { x: -6.2, y: 19.7, size: 0, label: '(가)' },
      { x: 26.8, y: 28.2, size: 0, label: '(나)' },
      { x: 13.9, y: 29.2, size: 0, label: '(다)' },
      { x: 5.7, y: 19, size: 0, label: '(라)' },
    ],
    bubbleLegendPosition: 'bottom-right',
    xLabel: 'B 시기 평균 기온', yLabel: 'A\\n시\\n기\\n평\\n균\\n기\\n온',
    xUnit: '(°C)', yUnit: '(°C)',
    xRange: { min: -10, max: 30, auto: false, step: 5 },
    yRange: { min: -10, max: 30, auto: false, step: 5 },
    showBubble: false, bubbleScale: 30, quadrantLabels: ['', '', '', ''], examFrame: true,
  }),
  options: () => geoOptions({}),
};

// ── w6_202709: 순위 트리맵 셋 — 좁은 칸 「5위 3.6」 이 이름 없이 비었다 ──
const treemap = (name: string, title: string, source: string, vals: number[]): GeoCase => ({
  name, width: 360, height: 440,
  render: renderTreemapGraph as GeoCase['render'],
  data: () => {
    const fills = ['#7f7f7f', '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#ffffff'];
    const labels = ['1위', '2위', '3위', '4위', '5위', '기타'];
    return {
      cells: vals.map((v, i) => ({
        label: `${labels[i]}\n${v.toFixed(1)}${i === 5 ? '(%)' : ''}`, value: v, fill: fills[i],
      })),
      reserveSourceSpace: true,
    };
  },
  options: () => geoOptions({ title, source }),
});
const w6a = treemap('w6_202709_ga', '(가)', '', [32.971, 20.268, 12.454, 5.022, 4.371, 24.912]);
const w6b = treemap('w6_202709_na', '(나)', '', [15.39, 8.691, 7.735, 7.144, 4.499, 56.541]);
const w6c = treemap('w6_202709_da', '(다)', '(2023)', [30.098, 29.774, 5.885, 5.18, 3.589, 25.474]);

// ── w10_202211: 묶은 막대 + 아래 범례 — 범주 이름이 범례 상자에 닿았다 ──
const w10_202211: GeoCase = {
  name: 'w10_202211', width: 560, height: 460,
  render: renderAbsBarGraph as GeoCase['render'],
  data: () => ({
    barDirection: 'vertical', stacked: false,
    categories: [
      { label: '석유', values: [1, 0.20055710306406688, 0.20891364902506965] },
      { label: '천연가스', values: [1, 0.13125, 0.509375] },
    ],
    seriesLabels: ['미국', '(가)', '(나)'],
    seriesFills: ['#595959', '#ffffff', 'pattern:diagonal'],
    unit: '', yRange: { min: 0, max: 1, auto: false, step: 0.2 },
  }),
  options: () => geoOptions({
    source: '(2023)', footnotes: ['소비량이 가장 많은 국가의 수치를 1로 했을 때의 상대값임.'],
    showLegend: true, legendPosition: 'bottom',
  }),
};

export const GEO_CASES: GeoCase[] = [w10_202709, k13, k13Axis39, w18, w6a, w6b, w6c, w10_202211];
