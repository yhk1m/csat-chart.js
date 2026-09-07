// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { REGISTRY, CHART_TYPES, isCsatChartType } from '../src/registry';
import { clearCanvas, createDefaultGraphOptions } from '../src/core/index';

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

  it('프로토타입 속성 이름을 종류로 착각하지 않는다', () => {
    // REGISTRY 는 객체 리터럴이라 프로토타입을 물고 있다. `in` 으로 판정하면
    // 아래가 전부 통과하고, 곧이어 REGISTRY['constructor'].render 에서 터진다.
    expect(isCsatChartType('constructor')).toBe(false);
    expect(isCsatChartType('__proto__')).toBe(false);
    expect(isCsatChartType('toString')).toBe(false);
    expect(isCsatChartType('hasOwnProperty')).toBe(false);
  });

  it('CHART_TYPES 는 얼어 있다', () => {
    // readonly 는 타입에만 있다. 타입 검사가 없는 CDN 사용자가 제자리에서
    // 뒤집으면 오류 메시지가 조용히 망가진다.
    expect(Object.isFrozen(CHART_TYPES)).toBe(true);
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
    // 새 캔버스는 흰색이 아니라 **투명한 검정**이다. 흰색으로 채우지 않으면
    // 렌더러가 아무것도 안 그려도 «흰색이 아닌 픽셀» 이 480,000 개 세어져
    // 이 검사가 영원히 통과한다.
    clearCanvas(ctx, 800, 600);
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
