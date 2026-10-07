// © 2026 김용현
// 시험지 표본 네 장의 자료를 그림에서 읽어 다시 넣은 것 — 겹침 비교용.
// 값은 표본 PNG(planning/specs/exam-samples/)의 픽셀에서 읽었다(±0.05 단위).
import {
  renderAbsBarGraph, renderLineGraph, renderStackedGraph, renderPyramidGraph,
  createDefaultAbsBarData, createDefaultLineData, createDefaultStackedData, createDefaultPyramidData,
  type GraphOptions,
} from '../../src/core/index';

type Render = (ctx: CanvasRenderingContext2D, w: number, h: number, data: never, o: GraphOptions) => void;

export interface OverlayCase {
  /** 표본 폴더와 파일 — planning/specs/exam-samples/<dir>/<sample>.png */
  dir: string;
  sample: string;
  render: Render;
  data: () => unknown;
  options: Partial<GraphOptions>;
}

const FOREIGN = ['외국인 근로자', '결혼 이민자', '유학생', '기타'];

export const OVERLAY_CASES: OverlayCase[] = [
  {
    dir: 'absbar',
    sample: '2026_11_korgeo-q11',
    render: renderAbsBarGraph as unknown as Render,
    data: () => ({
      ...createDefaultAbsBarData(),
      stacked: true,
      seriesLabels: FOREIGN,
      // 연회색 217 → 진회색 127 → 빗금 → 흰색 = exam 기본 채움 순서 그대로
      categories: [
        { label: '(가)', values: [2.57, 0.63, 0.45, 2.58] },
        { label: '(나)', values: [0.89, 0.55, 0.80, 2.05] },
        { label: '(다)', values: [1.00, 0.33, 0.16, 1.67] },
      ],
      unit: '(만 명)',
      yRange: { min: 0, max: 7, auto: false, step: 1 },
    }),
    options: {
      footnotes: ['외국인 주민은 한국 국적을 가지지 않은 자만 고려함.'],
      sourceLeft: '(2023)',
      source: '(통계청)',
    },
  },
  {
    dir: 'line',
    sample: '2026_11_wgeo-q10',
    render: renderLineGraph as unknown as Render,
    data: () => ({
      ...createDefaultLineData(),
      xLabels: ['1970', '', '1980', '', '1990', '', '2000', '', '2010', '', '2020'],
      xUnit: '(년)',
      yUnit: '(천만 명)',
      yRange: { min: 0, max: 14, auto: false, step: 2 },
      frame: 'open',
      labelPlacement: 'lineEnd',
      showMarkers: true,
      series: [
        { label: '(가)', marker: 'circle', hollowMarker: true, lineStyle: 'solid',
          values: [4.4, 4.9, 5.6, 6.5, 7.5, 8.4, 9.3, 10.2, 11.1, 12.1, 13.1] },
        { label: '(나)', marker: 'triangle', hollowMarker: true, lineStyle: 'solid',
          values: [4.2, 4.2, 4.2, 4.1, 3.9, 3.6, 3.3, 3.2, 3.1, 2.9, 2.8] },
        // 표본은 회색(178) 네모 — 기호 회색 채움은 아직 없다(열린 질문), 빈 네모로 둔다
        { label: '(다)', marker: 'square', hollowMarker: true, lineStyle: 'solid',
          values: [2.2, 2.2, 2.1, 2.1, 2.1, 2.1, 2.0, 1.9, 1.8, 1.8, 1.8] },
        { label: '(라)', marker: 'circle', lineStyle: 'solid',
          values: [0.3, 0.33, 0.35, 0.4, 0.45, 0.53, 0.63, 0.76, 0.91, 1.06, 1.21] },
      ],
    }),
    options: { title: '〈촌락 인구 변화〉' },
  },
  {
    dir: 'stacked',
    sample: '2027_09_korgeo-q14',
    render: renderStackedGraph as unknown as Render,
    data: () => ({
      ...createDefaultStackedData(),
      seriesLabels: FOREIGN,
      seriesFills: ['#3f3f3f', '#999999', 'pattern:diagonal', '#ffffff'],
      unit: '(%)',
      categories: [
        { label: '(가)', values: [55.0, 5.2, 1.9, 37.9] },
        { label: '(나)', values: [22.1, 18.4, 0.3, 59.2] },
        { label: '(다)', values: [13.4, 3.9, 50.4, 32.3] },
      ],
    }),
    options: {
      footnotes: ['외국인 주민은 한국 국적을 가지지 않은 사람만 해당함.'],
      sourceLeft: '(2024)',
      source: '(행정안전부)',
    },
  },
  {
    dir: 'pyramid',
    sample: '2026_09_wgeo-q10',
    render: renderPyramidGraph as unknown as Render,
    data: () => ({
      ...createDefaultPyramidData(),
      numericAgeAxis: true,
      ageUnit: '(세)',
      axisLabel: '(%)',
      range: { max: 12, auto: false },
      // 0-4 … 80-84, 85+(85~90) — 18구간. 첫째 패널
      ages: [
        [2.7, 2.8], [2.95, 2.8], [2.6, 2.6], [2.55, 2.6], [5.3, 3.5], [9.4, 4.15], [10.7, 4.55],
        [9.0, 4.4], [6.65, 3.2], [4.7, 2.0], [3.2, 1.55], [2.2, 1.3], [1.1, 0.65], [0.45, 0.35],
        [0.3, 0.3], [0.15, 0.2], [0.05, 0.1], [0.05, 0.05],
      ].map(([male, female]) => ({ male, female })),
    }),
    options: { footnotes: ['85세 이상은 85~90세로 처리함.'] },
  },
];
