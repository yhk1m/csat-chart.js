// © 2026 김용현
// 축 범위 계산이 렌더러를 멎게 하지 않는지 검증한다.
//
// 배경: 축 눈금은 `for (v = min; v <= max; v += step)` 꼴로 그린다.
// step 이 0 이거나 1e-16 수준이면 루프가 사실상 끝나지 않고, 동기 코드라
// 브라우저 탭이 멎는다. vitest 타임아웃으로도 끊기지 않으므로
// 아래 검사들은 값 자체를 본다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import {
  autoRange, niceStep,
  renderDeviationAGraph, createDefaultDeviationAData,
  renderPyramidGraph, createDefaultPyramidData,
  createDefaultGraphOptions,
} from '../../src/core/index';

describe('autoRange', () => {
  it('부동소수점 오차로 미세하게 갈린 값들도 범위를 벌린다', () => {
    // 같은 수를 더했다 빼면 비트 단위로는 갈린다.
    // 편차 그래프에서 모든 달에 같은 값을 더하면 실제로 이렇게 된다.
    const values = [3.0000000000000004, 3, 2.9999999999999996];

    const r = autoRange(values, 6);

    expect(r.step).toBeGreaterThan(0.01);
    expect(Math.round((r.max - r.min) / r.step)).toBeLessThan(100);
  });

  it('정확히 같은 값들은 ±10 으로 벌린다', () => {
    const r = autoRange([3, 3, 3], 6);

    expect(r.min).toBeLessThanOrEqual(-7);
    expect(r.max).toBeGreaterThanOrEqual(13);
    expect(r.step).toBeGreaterThan(0);
  });

  it('전부 0이어도 눈금 간격이 0이 되지 않는다', () => {
    const r = autoRange([0, 0, 0], 6);

    expect(r.step).toBeGreaterThan(0);
  });

  it('정상 범위는 기존 동작을 유지한다', () => {
    expect(autoRange([0, 100], 6)).toEqual({ min: -20, max: 120, step: 20 });
  });

  it('진짜로 작은 범위는 그대로 둔다', () => {
    // 미세하지만 의도된 범위 — 벌리면 안 된다
    const r = autoRange([0.0000001, 0.0000002], 6);

    expect(r.max).toBeLessThan(1);
    expect(r.step).toBeGreaterThan(0);
  });
});

describe('niceStep', () => {
  it('범위가 0이면 양수 간격을 돌려준다', () => {
    // 인구 피라미드는 `for (v = step; v <= max; v += step)` 로 격자선을 그린다.
    // step 이 0 이면 무한 루프다.
    expect(niceStep(0, 5)).toBeGreaterThan(0);
  });

  it('범위가 음수이거나 유효하지 않아도 양수 간격을 돌려준다', () => {
    expect(niceStep(-10, 5)).toBeGreaterThan(0);
    expect(niceStep(NaN, 5)).toBeGreaterThan(0);
  });

  it('정상 범위는 기존 동작을 유지한다', () => {
    expect(niceStep(120, 6)).toBe(20);
    expect(niceStep(100, 5)).toBe(20);
  });
});

/**
 * 사용자가 실제로 하는 입력으로 렌더가 끝나는지 본다.
 *
 * ⚠️ 이 검사들이 회귀하면 **테스트가 실패하는 게 아니라 멎는다.**
 * 동기 루프라 vitest 타임아웃이 끊지 못한다. 위 단위 검사가 먼저 실패하므로
 * 보통은 거기서 원인이 드러난다.
 */
describe('렌더러가 멎지 않는다', () => {
  const draw = (fn: (ctx: CanvasRenderingContext2D, w: number, h: number, d: never, o: ReturnType<typeof createDefaultGraphOptions>) => void, data: unknown) => {
    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    fn(ctx, 400, 300, data as never, createDefaultGraphOptions());
  };

  it('편차 그래프 — 모든 달에 같은 값을 더해도 끝난다', () => {
    const d = createDefaultDeviationAData();
    const base = [1, 2.6, 7, 13, 19, 23.4, 25, 23.4, 19, 13, 7, 2.6];
    d.baseMonths = base.map((t) => ({ temp: t, precip: t * 10 }));
    d.months = base.map((t) => ({ temp: t + 3, precip: t * 10 + 3 }));

    expect(() => draw(renderDeviationAGraph, d)).not.toThrow();
  });

  it('인구 피라미드 — 수동 범위 최댓값이 0이어도 끝난다', () => {
    const d = createDefaultPyramidData();
    d.range = { max: 0, auto: false };

    expect(() => draw(renderPyramidGraph, d)).not.toThrow();
  });
});
