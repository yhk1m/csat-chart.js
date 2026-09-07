// © 2026 김용현
// 종류 → 데이터 타입 지도.
//
// 이 파일이 «어떤 종류에 어떤 데이터가 오는가»의 유일한 출처다. CsatChartType 과
// 판별 유니온이 모두 여기서 도출되므로 둘이 어긋날 수 없고, 레지스트리에 종류를
// 더하거나 빼면 컴파일이 막힌다.
import type {
  AbsBarGraphData,
  CategoryDotGraphData,
  ClimateGraphData,
  CubeGraphData,
  DataTableData,
  DeviationAData,
  DeviationBData,
  GraphOptions,
  HythergraphData,
  LineGraphData,
  MatrixTableData,
  PyramidGraphData,
  RadarGraphData,
  ScatterGraphData,
  StackedGraphData,
  TernaryGraphData,
  TreemapGraphData,
} from './core/index';

export interface ChartDataMap {
  absbar: AbsBarGraphData;
  'category-dot': CategoryDotGraphData;
  climate: ClimateGraphData;
  cube: CubeGraphData;
  'data-table': DataTableData;
  'deviation-a': DeviationAData;
  'deviation-b': DeviationBData;
  hythergraph: HythergraphData;
  line: LineGraphData;
  'matrix-table': MatrixTableData;
  pyramid: PyramidGraphData;
  radar: RadarGraphData;
  scatter: ScatterGraphData;
  stacked: StackedGraphData;
  ternary: TernaryGraphData;
  treemap: TreemapGraphData;
}

/** 그릴 수 있는 그래프 종류. 여러 낱말은 kebab-case, 한 낱말은 그대로. */
export type CsatChartType = keyof ChartDataMap;

/**
 * 부분 지정을 허용하는 옵션.
 *
 * `Partial` 은 맨 위 칸만 선택으로 만든다. 그래서 `fontSize` 는 넷을 다 적어야
 * 했다 — 런타임은 하나만 줘도 받는데 타입이 막는, 거꾸로 된 어긋남이다.
 * 한 겹 더 풀어 준다.
 */
export type PartialGraphOptions = Omit<Partial<GraphOptions>, 'fontSize'> & {
  fontSize?: Partial<GraphOptions['fontSize']>;
};

/** 한 종류의 설정. `type` 을 적으면 `data` 가 그 종류로 좁혀진다. */
export interface ConfigFor<T extends CsatChartType> {
  type: T;
  data: ChartDataMap[T];
  options?: PartialGraphOptions;
}

/** 16종을 모은 판별 유니온. */
export type CsatChartConfig = { [K in CsatChartType]: ConfigFor<K> }[CsatChartType];

/** 한 종류의 부분 갱신. 준 것만 덮는다. */
export interface UpdateFor<T extends CsatChartType> {
  data?: ChartDataMap[T];
  options?: PartialGraphOptions;
}

export type CsatChartUpdate = { [K in CsatChartType]: UpdateFor<K> }[CsatChartType];
