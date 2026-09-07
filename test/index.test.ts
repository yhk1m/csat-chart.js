// © 2026 김용현
import { describe, it, expect } from 'vitest';
import * as lib from '../src/index';
import { CHART_TYPES } from '../src/registry';

const RENDERERS = [
  'renderAbsBarGraph', 'renderCategoryDotGraph', 'renderClimateGraph', 'renderCubeGraph',
  'renderDataTable', 'renderDeviationAGraph', 'renderDeviationBGraph', 'renderHythergraph',
  'renderLineGraph', 'renderMatrixTable', 'renderPyramidGraph', 'renderRadarChart',
  'renderScatterGraph', 'renderStackedGraph', 'renderTernaryGraph', 'renderTreemapGraph',
];

const DEFAULT_FACTORIES = [
  'createDefaultGraphOptions', 'createDefaultAbsBarData', 'createDefaultCategoryDotData',
  'createDefaultClimateData', 'createDefaultCubeData', 'createDefaultDataTableData',
  'createDefaultDeviationAData', 'createDefaultDeviationBData', 'createDefaultHythergraphData',
  'createDefaultLineData', 'createDefaultMatrixTableData', 'createDefaultPyramidData',
  'createDefaultRadarData', 'createDefaultScatterData', 'createDefaultStackedData',
  'createDefaultTernaryData', 'createDefaultTreemapData',
];

/** GeoGrapher UI 의 관심사여서 일부러 내보내지 않는 것들 */
const EXCLUDED = [
  'GRAPH_LABELS', 'MAP_GRAPH_TYPES', 'isMapGraphType', 'createDefaultExportSettings',
];

describe('공개 표면', () => {
  it('파사드와 레지스트리를 내보낸다', () => {
    expect(typeof lib.CsatChart).toBe('function');
    expect(typeof lib.ensureFonts).toBe('function');
    expect(typeof lib.isCsatChartType).toBe('function');
    expect(lib.CHART_TYPES).toEqual(CHART_TYPES);
  });

  it.each(RENDERERS)('저수준 렌더러 %s 를 내보낸다', (name) => {
    expect(typeof (lib as Record<string, unknown>)[name]).toBe('function');
  });

  it.each(DEFAULT_FACTORIES)('기본값 생성기 %s 를 내보낸다', (name) => {
    expect(typeof (lib as Record<string, unknown>)[name]).toBe('function');
  });

  it('축 계산 유틸을 내보낸다', () => {
    expect(lib.niceStep(100, 5)).toBeGreaterThan(0);
    expect(lib.autoRange([1, 2, 3]).step).toBeGreaterThan(0);
  });

  it.each(EXCLUDED)('GeoGrapher 전용 %s 는 내보내지 않는다', (name) => {
    expect(name in lib).toBe(false);
  });

  it('테스트 전용 헬퍼를 내보내지 않는다', () => {
    expect('resetFontsForTest' in lib).toBe(false);
    expect('REGISTRY' in lib).toBe(false);
  });
});

describe('타입 표면', () => {
  // 타입은 런타임에 남지 않으므로 `in lib` 로는 확인할 수 없다.
  // 여기서 실제로 써 보는 것 자체가 «내보내지고 있다» 의 증거이고,
  // `npm run typecheck` 가 그것을 검사한다.
  it('설정 타입을 공개한다', () => {
    const cfg: lib.CsatChartConfig = {
      type: 'ternary',
      data: lib.createDefaultTernaryData(),
    };
    const one: lib.ConfigFor<'climate'> = {
      type: 'climate',
      data: lib.createDefaultClimateData(),
    };
    const patch: lib.UpdateFor<'climate'> = { options: { title: '제목' } };
    const opts: lib.PartialGraphOptions = { fontSize: { title: 44 } };
    const t: lib.CsatChartType = 'pyramid';
    const map: lib.ChartDataMap['radar'] = lib.createDefaultRadarData();

    expect([cfg.type, one.type, t]).toEqual(['ternary', 'climate', 'pyramid']);
    expect(patch.options?.title).toBe('제목');
    expect(opts.fontSize?.title).toBe(44);
    expect(map).toBeTypeOf('object');
  });

  it('데이터 타입과 오류 타입을 공개한다', () => {
    const data: lib.ClimateGraphData = lib.createDefaultClimateData();
    const err: lib.CsatChartError = new lib.CsatChartError('시험');
    expect(data.months).toHaveLength(12);
    expect(err.name).toBe('CsatChartError');
  });
});
