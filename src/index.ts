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
export {
  AGE_GROUPS,
  DOT_MARKER_ORDER,
  LINE_DASH,
  LINE_MARKER_ORDER,
  LINE_STYLE_ORDER,
  MONTH_LABELS_EN,
  MONTH_LABELS_NUM,
} from './core/index';

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
