// © 2026 김용현
import { describe, it, expect } from 'vitest';
import * as lib from '../src/index';
import { CHART_TYPES, REGISTRY } from '../src/registry';

const RENDERERS = [
  'renderAbsBarGraph', 'renderCategoryDotGraph', 'renderClimateGraph', 'renderCubeGraph',
  'renderDataTable', 'renderDeviationAGraph', 'renderDeviationBGraph', 'renderEconPlane',
  'renderHythergraph',
  'renderLineGraph', 'renderMatrixTable', 'renderPyramidGraph', 'renderRadarChart',
  'renderScatterGraph', 'renderStackedGraph', 'renderTernaryGraph', 'renderTreemapGraph',
];

const DEFAULT_FACTORIES = [
  'createDefaultGraphOptions', 'createDefaultAbsBarData', 'createDefaultCategoryDotData',
  'createDefaultClimateData', 'createDefaultCubeData', 'createDefaultDataTableData',
  'createDefaultDeviationAData', 'createDefaultDeviationBData', 'createDefaultEconPlaneData',
  'createDefaultHythergraphData',
  'createDefaultLineData', 'defaultLineLeader', 'createDefaultMatrixTableData', 'createDefaultPyramidData',
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

  it('REGISTRY 의 모든 렌더러와 기본값 생성기가 공개 표면에 있다', () => {
    // 손으로 적은 목록은 «빠뜨린 것» 을 못 잡는다. 레지스트리에서 끌어와 센다.
    const exported = new Set(Object.values(lib as Record<string, unknown>));
    for (const type of CHART_TYPES) {
      const entry = REGISTRY[type];
      expect(exported.has(entry.render), `${type} 의 렌더러`).toBe(true);
      expect(exported.has(entry.createDefaultData), `${type} 의 기본값 생성기`).toBe(true);
    }
  });

  /**
   * 경제 좌표평면 프리셋 셋. `createDefault○○Data` 규칙 밖의 이름이라
   * 위 목록에 안 걸린다 — 따로 센다.
   */
  it.each(['createSupplyDemandData', 'createAdAsData', 'createPointShiftData'])(
    '경제 좌표평면 프리셋 %s 를 내보낸다',
    (name) => {
      const make = (lib as unknown as Record<string, () => lib.EconPlaneData>)[name];
      expect(typeof make).toBe('function');
      // 껍데기가 아니라 그릴 수 있는 자료여야 한다. 모양이 기본값과 같은지는
      // validate.test.ts 가 assertChartData 로 따로 본다.
      const d = make();
      expect(d.quadrants === 'first' || d.quadrants === 'all').toBe(true);
      expect(Array.isArray(d.lines) && Array.isArray(d.points) && Array.isArray(d.arrows)).toBe(true);
    },
  );

  it('기본 경제 좌표평면은 수요·공급 프리셋과 같다', () => {
    expect(lib.createDefaultEconPlaneData()).toEqual(lib.createSupplyDemandData());
  });

  it('축 계산 유틸을 내보낸다', () => {
    expect(lib.niceStep(100, 5)).toBeGreaterThan(0);
    expect(lib.autoRange([1, 2, 3]).step).toBeGreaterThan(0);
  });

  it('상수를 얼려서 내보낸다', () => {
    expect(lib.AGE_GROUPS).toHaveLength(17);
    expect(lib.DOT_MARKER_ORDER).toHaveLength(4);
    expect(lib.LINE_MARKER_ORDER).toHaveLength(4);
    expect(lib.LINE_STYLE_ORDER).toHaveLength(4);
    expect(lib.MONTH_LABELS_EN).toHaveLength(12);
    expect(lib.MONTH_LABELS_NUM).toHaveLength(12);
    expect(Array.isArray(lib.LINE_DASH.solid)).toBe(true);

    for (const c of [
      lib.AGE_GROUPS, lib.DOT_MARKER_ORDER, lib.LINE_MARKER_ORDER,
      lib.LINE_STYLE_ORDER, lib.MONTH_LABELS_EN, lib.MONTH_LABELS_NUM,
      lib.LINE_DASH, lib.LINE_DASH.solid,
    ]) {
      expect(Object.isFrozen(c)).toBe(true);
    }
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

  it('GeoGrapher UI 의 타입은 공개 표면에 없다', () => {
    // 이름을 만들지 않는 꼴로 쓴다. `type _X = …` 로 적으면 쓰이지 않는 이름이
    // 생겨 lint 를 따로 눌러야 한다. 아래는 선언이 아니라서 누를 것이 없다.
    // @ts-expect-error GraphType 은 지도 4종과 'guide' 를 담은 메뉴 목록이다
    void (null as unknown as lib.GraphType);
    // @ts-expect-error ExportSettings 는 GeoGrapher 내보내기 대화상자의 상태다
    void (null as unknown as lib.ExportSettings);
    expect(true).toBe(true);
  });
});
