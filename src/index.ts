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
 */
export const AGE_GROUPS = Object.freeze(coreAgeGroups);
export const DOT_MARKER_ORDER = Object.freeze(coreDotMarkerOrder);
export const LINE_MARKER_ORDER = Object.freeze(coreLineMarkerOrder);
export const LINE_STYLE_ORDER = Object.freeze(coreLineStyleOrder);
export const MONTH_LABELS_EN = Object.freeze(coreMonthLabelsEn);
export const MONTH_LABELS_NUM = Object.freeze(coreMonthLabelsNum);

// LINE_DASH 는 Record<LineStyle, number[]> 다. 얕게 얼리면 LINE_DASH.dashed 를
// 갈아 끼우는 것만 막고, LINE_DASH.dashed.push(1) 은 그대로 통한다.
export const LINE_DASH = Object.freeze({
  solid: Object.freeze(coreLineDash.solid),
  dashed: Object.freeze(coreLineDash.dashed),
  dotted: Object.freeze(coreLineDash.dotted),
  dashdot: Object.freeze(coreLineDash.dashdot),
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
