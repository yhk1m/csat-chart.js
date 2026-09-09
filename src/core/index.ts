// © 2026 김용현
// geo-graph 공개 API — 이 폴더 바깥에서는 반드시 이 파일을 통해 접근한다.
// 내부 파일을 직접 import 하지 말 것.

// ── 렌더러 ──────────────────────────────────────────────
export { renderAbsBarGraph } from './graphs/AbsBarGraph';
export { renderCategoryDotGraph } from './graphs/CategoryDotGraph';
export { renderLineGraph } from './graphs/LineGraph';
export { renderMatrixTable } from './graphs/MatrixTable';
export { renderDataTable } from './graphs/DataTable';
export { renderEconPlane } from './graphs/EconPlane';
export { renderTreemapGraph } from './graphs/TreemapGraph';
export { renderClimateGraph } from './graphs/ClimateGraph';
export { renderCubeGraph } from './graphs/CubeGraph';
export { renderDeviationAGraph } from './graphs/DeviationAGraph';
export { renderDeviationBGraph } from './graphs/DeviationBGraph';
export { renderHythergraph } from './graphs/Hythergraph';
export { renderPyramidGraph } from './graphs/PopulationPyramid';
export { renderRadarChart } from './graphs/RadarChart';
export { renderScatterGraph } from './graphs/ScatterBubble';
export { renderStackedGraph } from './graphs/StackedBarPie';
export { renderTernaryGraph } from './graphs/TernaryDiagram';

// ── 공용 유틸 ───────────────────────────────────────────
export {
  getFont, fontStackOf, sansFont, clearCanvas, niceStep, autoRange,
  DEFAULT_SERIF_STACK, DEFAULT_SANS_STACK,
} from './canvas/renderer';
export type { Padding, CanvasSize, FontOptions } from './canvas/renderer';

// ── 타입 및 기본값 ──────────────────────────────────────
export * from './types/index';
