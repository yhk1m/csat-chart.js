// © 2026 김용현
//
// 인구 피라미드 가로축 눈금 간격.
//
// 축 **끝에 눈금이 놓이고 그 숫자가 적히는지** 를 지킨다. 예전에는
// `niceStep(maxVal, 5)` 를 그대로 써서, 최댓값 9 면 눈금이 0·2·4·6·8 에서
// 끊기고 10 이면 끝 눈금이 숫자 솎기에 걸려 사라졌다 — 축이 몇 %까지인지
// 읽을 수 없었다 (2026-08-27 사용자 지적).
import { describe, it, expect } from 'vitest';
import { pickTickStep } from '../../src/core/graphs/PopulationPyramid';

/** 실제 문항 패널(360px)에서 눈금 글꼴 24px 로 잰 값에 가깝다 */
const NARROW = { halfW: 110, twoDigits: 26, oneDigit: 13 };
/** 골든 이미지(800px) 쪽 */
const WIDE = { halfW: 330, twoDigits: 26, oneDigit: 13 };

const divides = (max: number, step: number) =>
  Math.abs(max / step - Math.round(max / step)) < 1e-9;

describe('pickTickStep', () => {
  it('좁은 칸의 12% 는 4% 간격 — 원본 시험지 눈금이다', () => {
    expect(pickTickStep(12, NARROW.halfW, NARROW.twoDigits)).toBe(4);
  });

  it('좁은 칸의 10% 는 5% 간격 — 끝 눈금이 숫자 솎기에 안 걸린다', () => {
    expect(pickTickStep(10, NARROW.halfW, NARROW.twoDigits)).toBe(5);
  });

  it('최댓값이 홀수여도 축 끝에 눈금이 놓인다', () => {
    // 예전 niceStep 은 9 에 간격 2 를 줘서 눈금이 8 에서 끊겼다
    expect(pickTickStep(9, NARROW.halfW, NARROW.oneDigit)).toBe(3);
  });

  it('한 자리 최댓값은 1% 간격까지 촘촘하게 쓴다', () => {
    expect(pickTickStep(4, NARROW.halfW, NARROW.oneDigit)).toBe(1);
    expect(pickTickStep(5, NARROW.halfW, NARROW.oneDigit)).toBe(1);
  });

  it('넓은 칸에서는 예전 간격을 그대로 준다 — 골든이 안 흔들린다', () => {
    expect(pickTickStep(12, WIDE.halfW, WIDE.twoDigits)).toBe(2);
    expect(pickTickStep(5, WIDE.halfW, WIDE.oneDigit)).toBe(1);
  });

  it('어떤 최댓값이든 간격이 최댓값을 정확히 나눈다', () => {
    for (let max = 1; max <= 40; max += 1) {
      const label = max >= 10 ? NARROW.twoDigits : NARROW.oneDigit;
      const step = pickTickStep(max, NARROW.halfW, label);

      expect(step).toBeGreaterThan(0);
      expect(divides(max, step)).toBe(true);
    }
  });

  it('소수 최댓값도 나누어떨어지는 간격을 찾는다', () => {
    for (const max of [0.5, 1.5, 2.5, 3.5, 4.5, 7.5]) {
      const step = pickTickStep(max, WIDE.halfW, WIDE.oneDigit);

      expect(step).toBeGreaterThan(0);
      expect(divides(max, step)).toBe(true);
    }
  });

  it('⚠️ 간격이 절대 0이 되지 않는다 — 0이면 눈금 루프가 영원히 돈다', () => {
    // `auto-range.test.ts` 의 「수동 범위 최댓값이 0이어도 끝난다」 와 같은 사고다.
    for (const bad of [0, -1, NaN, Infinity]) {
      expect(pickTickStep(bad, NARROW.halfW, NARROW.oneDigit)).toBeGreaterThan(0);
    }
  });

  it('숫자가 들어갈 자리가 없으면 0 과 끝만 남긴다', () => {
    // 칸이 아주 좁으면 나눌 수가 없다 — 그래도 간격은 양수여야 한다
    const step = pickTickStep(7, 20, 40);

    expect(step).toBe(7);
  });
});
