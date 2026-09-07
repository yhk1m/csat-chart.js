// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { REGISTRY, CHART_TYPES, isCsatChartType } from '../src/registry';
import { createDefaultGraphOptions } from '../src/core/index';

describe('레지스트리', () => {
  it('16종을 담는다', () => {
    expect(CHART_TYPES).toHaveLength(16);
  });

  it('키가 정확히 이 16개다', () => {
    // ChartDataMap 과 REGISTRY 의 키가 어긋나면 tsc 가 먼저 막는다.
    // 이 테스트가 잡는 건 다른 것이다 — 오타 난 키가 양쪽에 똑같이 들어간 경우.
    expect([...CHART_TYPES]).toEqual([
      'absbar', 'category-dot', 'climate', 'cube', 'data-table',
      'deviation-a', 'deviation-b', 'hythergraph', 'line', 'matrix-table',
      'pyramid', 'radar', 'scatter', 'stacked', 'ternary', 'treemap',
    ]);
  });

  it('키가 사전순으로 정렬돼 있다', () => {
    expect([...CHART_TYPES].sort()).toEqual([...CHART_TYPES]);
  });

  it('isCsatChartType 이 아는 키만 통과시킨다', () => {
    expect(isCsatChartType('pyramid')).toBe(true);
    expect(isCsatChartType('piramid')).toBe(false);
    expect(isCsatChartType(42)).toBe(false);
    expect(isCsatChartType(undefined)).toBe(false);
  });

  it.each(CHART_TYPES)('%s 를 기본 데이터로 그리면 빈 캔버스가 아니다', (type) => {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    const entry = REGISTRY[type];
    entry.render(ctx, 800, 600, entry.createDefaultData() as never, createDefaultGraphOptions());

    const raw = canvas.getContext('2d').getImageData(0, 0, 800, 600).data;
    let nonWhite = 0;
    for (let i = 0; i < raw.length; i += 4) {
      if (raw[i] !== 255 || raw[i + 1] !== 255 || raw[i + 2] !== 255) nonWhite++;
    }
    expect(nonWhite).toBeGreaterThan(50);
  });
});
