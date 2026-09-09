// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { CsatChartError, assertChartType, assertChartData } from '../src/validate';
import { CHART_TYPES, REGISTRY } from '../src/registry';
import { createAdAsData, createPointShiftData, createSupplyDemandData } from '../src/core/index';

describe('assertChartType', () => {
  it('아는 키는 통과시킨다', () => {
    expect(() => assertChartType('pyramid')).not.toThrow();
  });

  it('가까운 오타에는 후보를 제안한다', () => {
    expect(() => assertChartType('piramid')).toThrow(/혹시 "pyramid"\?/);
  });

  it('전혀 다른 값에는 전체 목록을 보여준다', () => {
    expect(() => assertChartType('zzzzzzzz')).toThrow(/쓸 수 있는 값: absbar, category-dot/);
  });

  it('문자열이 아니면 거부한다', () => {
    expect(() => assertChartType(7)).toThrow(CsatChartError);
  });
});

describe('assertChartData', () => {
  it.each(CHART_TYPES)('%s 의 기본 데이터는 통과한다', (type) => {
    expect(() => assertChartData(type, REGISTRY[type].createDefaultData())).not.toThrow();
  });

  it('객체가 아니면 거부한다', () => {
    expect(() => assertChartData('ternary', [])).toThrow(/data 는 객체여야 합니다 \(지금 배열\)/);
    expect(() => assertChartData('ternary', null)).toThrow(/지금 null/);
  });

  it('필수 키가 빠지면 그 이름을 말한다', () => {
    const data = { ...REGISTRY.pyramid.createDefaultData() } as Record<string, unknown>;
    delete data.ages;
    expect(() => assertChartData('pyramid', data)).toThrow(
      /type "pyramid" 의 data 에 ages 항목이 없습니다/,
    );
  });

  it('키의 종류가 다르면 무엇이어야 하는지 말한다', () => {
    const data = { ...REGISTRY.ternary.createDefaultData(), points: 3 };
    expect(() => assertChartData('ternary', data)).toThrow(
      /data\.points: 배열이어야 합니다 \(지금 숫자\)/,
    );
  });

  it('받침에 따라 «이어야»와 «여야»를 가른다', () => {
    // 조사를 하나로 고정하면 «배열여야»·«문자열여야» 같은 문장이 나온다.
    const t = REGISTRY.ternary.createDefaultData() as { axisLabels: string[] };
    expect(() => assertChartData('ternary', { ...t, axisLabels: 3 })).toThrow(
      /배열이어야 합니다/,
    );
    const c = REGISTRY.climate.createDefaultData() as { tempLabel: string };
    expect(() => assertChartData('climate', { ...c, tempLabel: [] })).toThrow(
      /문자열이어야 합니다/,
    );
    expect(() => assertChartData('ternary', 3)).toThrow(/객체여야 합니다/);
  });

  it('길이가 고정된 배열은 길이도 본다', () => {
    const data = REGISTRY.climate.createDefaultData() as { months: unknown[] };
    expect(() =>
      assertChartData('climate', { ...data, months: data.months.slice(0, 11) }),
    ).toThrow(/data\.months: 12개여야 합니다 \(지금 11개\)/);

    const t = REGISTRY.ternary.createDefaultData() as { axisLabels: string[] };
    expect(() => assertChartData('ternary', { ...t, axisLabels: ['A', 'B'] })).toThrow(
      /data\.axisLabels: 3개여야 합니다 \(지금 2개\)/,
    );
  });

  it('배열 원소의 종류가 다르면 몇 번째인지 말한다', () => {
    // 열두 달 자료를 «숫자 12개» 로 납작하게 붙여넣는 실수. 배열도 맞고 길이도
    // 12라 겉모양만 보면 통과하는데, 그대로 그리면 브라우저에서는 빈 그림이 되고
    // Node 캔버스에서는 네이티브 프로세스가 죽는다.
    const c = REGISTRY.climate.createDefaultData() as { months: unknown[] };
    expect(() =>
      assertChartData('climate', { ...c, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }),
    ).toThrow(/data\.months\[0\]: 객체여야 합니다 \(지금 숫자\)/);
  });

  it('경제 좌표평면의 프리셋 셋도 통과한다', () => {
    // 기본값과 «같은 모양» 이라는 뜻이다. 프리셋을 손보다 칸 하나를 빠뜨리면
    // 여기서 잡힌다 — 그림은 나오는데 검증만 막히는 어긋남이 생기지 않게.
    for (const make of [createSupplyDemandData, createAdAsData, createPointShiftData]) {
      expect(() => assertChartData('econ-plane', make())).not.toThrow();
    }
  });

  it('선택 필드를 더 준 것은 통과한다', () => {
    const data = { ...REGISTRY.pyramid.createDefaultData(), numericAgeAxis: true };
    expect(() => assertChartData('pyramid', data)).not.toThrow();
  });

  it('메시지가 모두 csat-chart 로 시작한다', () => {
    expect(() => assertChartData('ternary', null)).toThrow(/^csat-chart: /);
  });
});
