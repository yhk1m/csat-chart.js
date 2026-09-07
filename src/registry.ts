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
import type { ChartDataMap, CsatChartType } from './types';

/**
 * 한 종류의 렌더러와 기본 데이터.
 *
 * **키마다 제네릭을 따로 두는 이유가 있다.** 하나로 뭉뚱그리면(`data: never` 같은)
 * 항목을 엉뚱하게 이어도 컴파일과 테스트가 모두 통과한다 — `radar` 를 산점도
 * 렌더러에 연결해도 그림은 나오고 픽셀도 찍히기 때문이다. 이렇게 두면 잘못
 * 이을 수 있는 480가지 중 478가지가 컴파일 오류가 되고, 항목마다 붙던
 * `as` 캐스팅 16개가 사라진다.
 */
export interface RegistryEntry<T extends CsatChartType> {
  render: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: ChartDataMap[T],
    options: GraphOptions,
  ) => void;
  createDefaultData: () => ChartDataMap[T];
}

export const REGISTRY: { [K in CsatChartType]: RegistryEntry<K> } = {
  absbar: { render: renderAbsBarGraph, createDefaultData: createDefaultAbsBarData },
  'category-dot': { render: renderCategoryDotGraph, createDefaultData: createDefaultCategoryDotData },
  // 컴파일러가 갈라주지 못하는 **유일한** 짝이 climate 와 deviation-a 다.
  // DeviationAData 가 ClimateGraphData 의 구조적 상위집합이기 때문이다
  // (같은 6필드 + baseMonths + 선택 필드). 한쪽 칸만 바꾼 오배선 두 가지가 통과한다:
  //   · climate 의 기본값만 createDefaultDeviationAData 로 바꾼 경우
  //   · deviation-a 의 렌더러만 renderClimateGraph 로 바꾼 경우
  // 렌더러와 기본값을 둘 다 바꿔 끼우면 어느 쪽이든 잡힌다.
  climate: { render: renderClimateGraph, createDefaultData: createDefaultClimateData },
  cube: { render: renderCubeGraph, createDefaultData: createDefaultCubeData },
  'data-table': { render: renderDataTable, createDefaultData: createDefaultDataTableData },
  // 위 climate 주석 참고 — 이 칸의 렌더러만 바꾼 오배선은 컴파일러가 잡지 못한다.
  'deviation-a': { render: renderDeviationAGraph, createDefaultData: createDefaultDeviationAData },
  'deviation-b': { render: renderDeviationBGraph, createDefaultData: createDefaultDeviationBData },
  hythergraph: { render: renderHythergraph, createDefaultData: createDefaultHythergraphData },
  line: { render: renderLineGraph, createDefaultData: createDefaultLineData },
  'matrix-table': { render: renderMatrixTable, createDefaultData: createDefaultMatrixTableData },
  pyramid: { render: renderPyramidGraph, createDefaultData: createDefaultPyramidData },
  radar: { render: renderRadarChart, createDefaultData: createDefaultRadarData },
  scatter: { render: renderScatterGraph, createDefaultData: createDefaultScatterData },
  stacked: { render: renderStackedGraph, createDefaultData: createDefaultStackedData },
  ternary: { render: renderTernaryGraph, createDefaultData: createDefaultTernaryData },
  treemap: { render: renderTreemapGraph, createDefaultData: createDefaultTreemapData },
};

/**
 * 사전순으로 정렬된 전체 종류 목록. 오류 메시지와 데모가 이 순서를 쓴다.
 *
 * `Object.freeze` 를 쓰는 까닭: `readonly` 는 타입에만 있고 런타임에는 없다.
 * 이 패키지는 타입 검사를 받지 않는 CDN 사용자를 겨냥하므로, 얼려 두지 않으면
 * `CsatChart.CHART_TYPES.reverse()` 한 번에 오류 메시지가 조용히 망가진다.
 *
 * 인자 없는 `sort()` 는 로캘을 보지 않고 UTF-16 코드 단위로 비교한다(명세).
 * 리눅스 CI 의 small-icu 빌드에서도 같은 순서가 나온다.
 */
export const CHART_TYPES: readonly CsatChartType[] = Object.freeze(
  (Object.keys(REGISTRY) as CsatChartType[]).sort(),
);

/**
 * 아는 키인지 본다.
 *
 * **`v in REGISTRY` 로 바꾸지 말 것.** REGISTRY 는 객체 리터럴이라 프로토타입을
 * 물고 있어서 `'constructor'`·`'__proto__'`·`'toString'` 이 전부 통과하고,
 * 곧이어 `REGISTRY['constructor'].render` 에서 터진다.
 */
export function isCsatChartType(v: unknown): v is CsatChartType {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(REGISTRY, v);
}
