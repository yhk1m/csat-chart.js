// © 2026 김용현
// csat-chart.js 공개 표면.
//
// `export *` 를 쓰지 않는다 — core 에는 GeoGrapher UI 의 관심사(지도 4종을 담은
// GraphType, 내보내기 대화상자의 ExportSettings)가 섞여 있어서, 몰아 내보내면
// 이 패키지에 없는 기능이 딸려 나간다. 이름을 하나씩 적는다.

// ── 파사드 ─────────────────────────────────────────────
export { CsatChart } from './chart';
export type { CanvasLike } from './chart';

// ── 종류와 설정 ────────────────────────────────────────
export { CHART_TYPES, isCsatChartType } from './registry';
export type {
  ChartDataMap,
  ConfigFor,
  CsatChartConfig,
  CsatChartType,
  PartialGraphOptions,
  UpdateFor,
} from './types';

// ── 오류 ───────────────────────────────────────────────
export { CsatChartError } from './validate';

// ── 글꼴 ───────────────────────────────────────────────
export { ensureFonts } from './fonts';
export type { EnsureFontsOptions } from './fonts';

// ── roundRect 폴리필 ───────────────────────────────────
// `CsatChart` 생성자가 첫 렌더 전에 자동으로 부른다. 파사드를 거치지 않고
// 저수준 렌더러를 직접 부르는 사람만 이 함수를 스스로 불러야 한다 — 자세한
// 사정은 `./roundrect` 참고.
export { installRoundRectPolyfill } from './roundrect';

// ── 저수준 렌더러 16종 ─────────────────────────────────
export {
  renderAbsBarGraph,
  renderCategoryDotGraph,
  renderClimateGraph,
  renderCubeGraph,
  renderDataTable,
  renderDeviationAGraph,
  renderDeviationBGraph,
  renderHythergraph,
  renderLineGraph,
  renderMatrixTable,
  renderPyramidGraph,
  renderRadarChart,
  renderScatterGraph,
  renderStackedGraph,
  renderTernaryGraph,
  renderTreemapGraph,
} from './core/index';

// ── 축 계산 유틸 ───────────────────────────────────────
export { niceStep, autoRange } from './core/index';

// ── 기본값 생성기 ──────────────────────────────────────
export {
  createDefaultGraphOptions,
  createDefaultAbsBarData,
  createDefaultCategoryDotData,
  createDefaultClimateData,
  createDefaultCubeData,
  createDefaultDataTableData,
  createDefaultDeviationAData,
  createDefaultDeviationBData,
  createDefaultHythergraphData,
  createDefaultLineData,
  createDefaultMatrixTableData,
  createDefaultPyramidData,
  createDefaultRadarData,
  createDefaultScatterData,
  createDefaultStackedData,
  createDefaultTernaryData,
  createDefaultTreemapData,
} from './core/index';

// ── 상수 ───────────────────────────────────────────────
import {
  AGE_GROUPS as coreAgeGroups,
  DOT_MARKER_ORDER as coreDotMarkerOrder,
  LINE_DASH as coreLineDash,
  LINE_MARKER_ORDER as coreLineMarkerOrder,
  LINE_STYLE_ORDER as coreLineStyleOrder,
  MONTH_LABELS_EN as coreMonthLabelsEn,
  MONTH_LABELS_NUM as coreMonthLabelsNum,
} from './core/index';

/**
 * 상수는 얼려서 내보낸다.
 *
 * 여기서 내보내는 것은 렌더러가 기본값으로 읽는 **바로 그 객체**다. 얼리지 않으면
 * `CsatChart.DOT_MARKER_ORDER.reverse()` 한 번에 이후 모든 그림의 기호 배정이
 * 조용히 어긋난다. 타입 검사를 받지 않는 CDN 사용자를 겨냥한 패키지라 특히 그렇다.
 * `CHART_TYPES` 를 얼린 것과 같은 이유다.
 *
 * 각 `Object.freeze` 앞의 PURE 주석을 지우지 말 것. 함수 호출은 번들러가
 * 부작용이 있을 수 있다고 보수적으로 가정하는 대상이라, 표시가 없으면 이
 * 상수들을 아무도 안 써도 문장 자체가 안 지워진다 — 여기서는 값이 각각
 * `core` 배열 하나씩만 가리키므로 결과가 이 파일 안에서 끝나 심각하지 않지만,
 * `registry.ts` 의 `CHART_TYPES` 는 같은 문제가 16종 렌더러 전체를 붙드는
 * 문제로 번진다. 그 사례를 따라 여기도 표시해 둔다.
 */
export const AGE_GROUPS = /* @__PURE__ */ Object.freeze(coreAgeGroups);
export const DOT_MARKER_ORDER = /* @__PURE__ */ Object.freeze(coreDotMarkerOrder);
export const LINE_MARKER_ORDER = /* @__PURE__ */ Object.freeze(coreLineMarkerOrder);
export const LINE_STYLE_ORDER = /* @__PURE__ */ Object.freeze(coreLineStyleOrder);
export const MONTH_LABELS_EN = /* @__PURE__ */ Object.freeze(coreMonthLabelsEn);
export const MONTH_LABELS_NUM = /* @__PURE__ */ Object.freeze(coreMonthLabelsNum);

// LINE_DASH 는 Record<LineStyle, number[]> 다. 얕게 얼리면 LINE_DASH.dashed 를
// 갈아 끼우는 것만 막고, LINE_DASH.dashed.push(1) 은 그대로 통한다.
export const LINE_DASH = /* @__PURE__ */ Object.freeze({
  solid: /* @__PURE__ */ Object.freeze(coreLineDash.solid),
  dashed: /* @__PURE__ */ Object.freeze(coreLineDash.dashed),
  dotted: /* @__PURE__ */ Object.freeze(coreLineDash.dotted),
  dashdot: /* @__PURE__ */ Object.freeze(coreLineDash.dashdot),
});

// ── 타입 ───────────────────────────────────────────────
export type {
  GraphOptions,
  LegendPosition,
  InsideLegendCorner,
  AbsBarCategory,
  AbsBarDirection,
  AbsBarGraphData,
  CategoryDotCategory,
  CategoryDotGraphData,
  DotMarker,
  ClimateGraphData,
  ClimateMode,
  ClimateMonthData,
  MonthInterval,
  DeviationAData,
  DeviationBData,
  DeviationBRegion,
  CubeAxisConfig,
  CubeGraphData,
  CubePoint,
  LabelOffset,
  DataTableData,
  DataTableRow,
  HythergraphData,
  HythergraphMode,
  HythergraphSeries,
  MonthLabelStyle,
  LineGraphData,
  LineLabelPlacement,
  LineMarker,
  LineSeries,
  LineStyle,
  MatrixTableData,
  AgeLabelSide,
  PyramidAgeData,
  PyramidGraphData,
  PyramidUnit,
  RadarGraphData,
  RadarSeries,
  BubbleLegendPosition,
  ScatterGraphData,
  ScatterMode,
  ScatterPoint,
  StackedBarDirection,
  StackedCategory,
  StackedDisplayMode,
  StackedGraphData,
  TernaryGraphData,
  TernaryGridInterval,
  TernaryPoint,
  TreemapCell,
  TreemapGraphData,
} from './core/index';
