// © 2026 김용현
// 꺾은선 끝 이름 세로 배치 — 선 끝의 위아래 차례를 지키고 겹치지 않는다 (exam).
import { describe, it, expect } from 'vitest';
import { stackInOrder } from '../../src/core/graphs/LineGraph';

describe('stackInOrder', () => {
  it('떨어져 있으면 바라는 자리 그대로', () => {
    expect(stackInOrder([100, 300, 200], 40, 0, 1000)).toEqual([100, 300, 200]);
  });

  it('붙으면 차례를 지키며 gap 만큼 벌린다 — 덩어리 가운데는 바라는 자리들의 가운데', () => {
    // 2026_11 wgeo q10: (나) 2.8 (다) 1.8 (라) 1.2 의 선 끝 — 화면 y 로는 (나) 가 가장 위
    const out = stackInOrder([400, 430, 450], 40, 0, 1000);
    expect(out[0]).toBeLessThan(out[1]);
    expect(out[1]).toBeLessThan(out[2]);
    expect(out[1] - out[0]).toBeCloseTo(40, 9);
    expect(out[2] - out[1]).toBeCloseTo(40, 9);
    expect((out[0] + out[1] + out[2]) / 3).toBeCloseTo((400 + 430 + 450) / 3 + 0 - 0, 0);
  });

  it('아래 끝을 넘으면 덩어리째 위로 당긴다 — 차례는 그대로', () => {
    const out = stackInOrder([590, 595, 598], 40, 10, 590);
    expect(out).toEqual([510, 550, 590]);
  });

  it('겹친 둘이 또 다른 이름과 붙으면 셋이 한 덩어리', () => {
    const out = stackInOrder([100, 110, 150], 40, 0, 1000);
    expect(out[1] - out[0]).toBeCloseTo(40, 9);
    expect(out[2] - out[1]).toBeCloseTo(40, 9);
  });
});
