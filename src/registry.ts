// © 2026 김용현
// 문자열 키 하나로 16종을 고르게 한다. 렌더러와 기본 데이터를 짝지어 두는 곳.
import {
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
  type GraphOptions,
} from './core/index';
import type { CsatChartType } from './types';

/**
 * 모든 렌더러가 공유하는 시그니처.
 * `data` 는 종류마다 다르므로 여기서는 `never` 로 두고 호출부에서 좁힌다.
 */
export type AnyRenderer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: never,
  options: GraphOptions,
) => void;

export interface RegistryEntry {
  render: AnyRenderer;
  createDefaultData: () => object;
}

export const REGISTRY: Record<CsatChartType, RegistryEntry> = {
  absbar: { render: renderAbsBarGraph as AnyRenderer, createDefaultData: createDefaultAbsBarData },
  'category-dot': { render: renderCategoryDotGraph as AnyRenderer, createDefaultData: createDefaultCategoryDotData },
  climate: { render: renderClimateGraph as AnyRenderer, createDefaultData: createDefaultClimateData },
  cube: { render: renderCubeGraph as AnyRenderer, createDefaultData: createDefaultCubeData },
  'data-table': { render: renderDataTable as AnyRenderer, createDefaultData: createDefaultDataTableData },
  'deviation-a': { render: renderDeviationAGraph as AnyRenderer, createDefaultData: createDefaultDeviationAData },
  'deviation-b': { render: renderDeviationBGraph as AnyRenderer, createDefaultData: createDefaultDeviationBData },
  hythergraph: { render: renderHythergraph as AnyRenderer, createDefaultData: createDefaultHythergraphData },
  line: { render: renderLineGraph as AnyRenderer, createDefaultData: createDefaultLineData },
  'matrix-table': { render: renderMatrixTable as AnyRenderer, createDefaultData: createDefaultMatrixTableData },
  pyramid: { render: renderPyramidGraph as AnyRenderer, createDefaultData: createDefaultPyramidData },
  radar: { render: renderRadarChart as AnyRenderer, createDefaultData: createDefaultRadarData },
  scatter: { render: renderScatterGraph as AnyRenderer, createDefaultData: createDefaultScatterData },
  stacked: { render: renderStackedGraph as AnyRenderer, createDefaultData: createDefaultStackedData },
  ternary: { render: renderTernaryGraph as AnyRenderer, createDefaultData: createDefaultTernaryData },
  treemap: { render: renderTreemapGraph as AnyRenderer, createDefaultData: createDefaultTreemapData },
};

/** 사전순으로 정렬된 전체 종류 목록. 오류 메시지와 데모가 이 순서를 쓴다. */
export const CHART_TYPES: readonly CsatChartType[] = (
  Object.keys(REGISTRY) as CsatChartType[]
).sort();

export function isCsatChartType(v: unknown): v is CsatChartType {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(REGISTRY, v);
}
