// © 2026 김용현
//
// 촘촘한 세로축 눈금 (2.1.1).
//
// GeoGrapher 의 지역별 편차(deviation-b) 기본 자료는 기준값이 0 이다. 지역 값을
// 그대로 치면 편차가 0 에서 멀어(강수량 900~1550, 기온 9.5~14.2) 자동 범위가
// 좁은 자료 범위에서 고른 간격(100·1)을 둔 채 ±1700·±15 로 대칭으로 넓어졌다 —
// 눈금 숫자가 서른 개 넘게 한 기둥으로 뭉갰다 (두 양식 모두, exam 이 더 심했다).
// 눈금 사이가 실제 숫자 높이의 1.3배보다 좁으면 다음 좋은 간격으로 올린다.
// `npm run test:fallback` 에서도 돈다 — 대체 글꼴에서도 숫자 상자가 안 겹쳐야 한다.
import { describe, it, expect } from 'vitest';
import { drawLogged, type Box } from './draw-log';
import {
  renderDeviationAGraph, renderDeviationBGraph, renderClimateGraph,
  createDefaultDeviationAData, createDefaultDeviationBData, createDefaultClimateData,
  createDefaultGraphOptions, type GraphOptions, type StyleName,
} from '../../src/core/index';
import { spaceTicks, nextNiceStep } from '../../src/core/canvas/renderer';

type Render = (ctx: CanvasRenderingContext2D, w: number, h: number, data: never, o: GraphOptions) => void;

/** GeoGrapher 기본 자료(기준값 0) + 데모 지역 값 */
const geoGrapherDevB = () => ({
  ...createDefaultDeviationBData(),
  regions: [
    { label: 'A', precip: 1550, temp: 9.5 },
    { label: 'B', precip: 1180, temp: 14.2 },
    { label: 'C', precip: 900, temp: 11.1 },
  ],
});

const CASES: [string, Render, () => unknown, [number, number]][] = [
  ['deviation-b · GeoGrapher 기준값 0', renderDeviationBGraph as Render, geoGrapherDevB, [800, 600]],
  ['deviation-b · GeoGrapher 기준값 0 · 낮은 캔버스', renderDeviationBGraph as Render, geoGrapherDevB, [800, 400]],
  ['deviation-b · 사용자 범위 ±1600·±16', renderDeviationBGraph as Render, () => ({
    ...geoGrapherDevB(),
    precipRange: { min: -1600, max: 1600, auto: false },
    tempRange: { min: -16, max: 16, auto: false },
  }), [800, 400]],
  ['deviation-a · 기준값 0', renderDeviationAGraph as Render, () => {
    const d = createDefaultDeviationAData();
    d.months = [30, 32, 45, 80, 110, 150, 250, 240, 140, 60, 45, 28]
      .map((p, i) => ({ precip: p + 1000, temp: 20 + i * 0.3 }));
    return d;
  }, [800, 600]],
  ['deviation-a · 사용자 간격 1', renderDeviationAGraph as Render, () => {
    const d = createDefaultDeviationAData();
    d.months = d.months.map((_, i) => ({ precip: (i - 6) * 40, temp: (i - 6) * 0.8 }));
    d.precipRange = { min: -300, max: 300, auto: false, step: 1 } as typeof d.precipRange;
    d.tempRange = { min: -8, max: 8, auto: false, step: 0.5 } as typeof d.tempRange;
    return d;
  }, [800, 600]],
  ['climate · 사용자 간격 1', renderClimateGraph as Render, () => {
    const d = createDefaultClimateData();
    d.months = d.months.map((_, i) => ({ temp: i * 2 - 5, precip: 20 + i * 25 }));
    d.tempRange = { min: -10, max: 40, auto: false, step: 1 } as typeof d.tempRange;
    d.precipRange = { min: 0, max: 400, auto: false, step: 1 } as typeof d.precipRange;
    return d;
  }, [800, 600]],
];

const NUM = /^[-−+]?\d+(\.\d+)?$/;

/** 플롯 바깥 양옆(캔버스 폭의 바깥 1/5)에 찍힌 숫자 — 왼쪽·오른쪽 세로축 눈금 열 */
function tickColumns(texts: { s: string; box: Box }[], w: number) {
  const cols: Box[][] = [[], []];
  for (const t of texts) {
    if (!NUM.test(t.s)) continue;
    const mid = (t.box.left + t.box.right) / 2;
    if (mid < w * 0.2) cols[0].push(t.box);
    else if (mid > w * 0.8) cols[1].push(t.box);
  }
  return cols;
}

describe('촘촘한 세로축 눈금', () => {
  for (const style of ['classic', 'exam'] as StyleName[]) {
    describe(style, () => {
      for (const [name, render, data, [w, h]] of CASES) {
        it(`${name} — 눈금 숫자 상자가 세로로 겹치지 않는다`, () => {
          const o = { ...createDefaultGraphOptions(style), style };
          const log = drawLogged((ctx) => render(ctx, w, h, data() as never, o), w, h);
          const cols = tickColumns(log.texts, w);
          for (const col of cols) {
            expect(col.length).toBeGreaterThanOrEqual(3);
            const sorted = [...col].sort((a, b) => a.top - b.top);
            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i].top, `${name}: 숫자 상자가 ${(sorted[i - 1].bottom - sorted[i].top).toFixed(1)}px 겹친다`)
                .toBeGreaterThanOrEqual(sorted[i - 1].bottom);
            }
          }
        });
      }

      it('deviation-b · GeoGrapher 기준값 0 · 오른쪽 범례 — 범례 상자가 넓힌 눈금 숫자를 덮지 않는다', () => {
        const o = { ...createDefaultGraphOptions(style), style, legendPosition: 'right' as const };
        const log = drawLogged((ctx) => renderDeviationBGraph(ctx, 800, 600, geoGrapherDevB() as never, o));
        // 플롯이 좁아져 오른쪽 축이 가운데 가까이 온다 — 오른쪽 0 과 왼쪽 끝을 맞춘 숫자가 오른쪽 눈금이다
        const zeroR = log.texts.filter((t) => t.s === '0').reduce((a, b) => (b.box.left > a.box.left ? b : a)).box;
        const right = log.texts.filter((t) => NUM.test(t.s) && Math.abs(t.box.left - zeroR.left) < 8).map((t) => t.box);
        expect(right.length).toBeGreaterThanOrEqual(3);
        // 범례 상자 = 범례 이름을 품은 테두리 (막대도 strokeRect 로 그린다)
        const name = log.texts.find((t) => t.s === '강수량 차이')!.box;
        const legend = log.strokeRects.find((r) => r.left <= name.left && r.right >= name.right
          && r.top <= name.top && r.bottom >= name.bottom)!;
        expect(legend).toBeDefined();
        for (const b of right) expect(b.right, '범례가 눈금 숫자를 덮는다').toBeLessThanOrEqual(legend.left);
      });

      it('deviation-b · GeoGrapher 기준값 0 — 두 축의 0 눈금이 같은 높이다', () => {
        const o = { ...createDefaultGraphOptions(style), style };
        const log = drawLogged((ctx) => renderDeviationBGraph(ctx, 800, 600, geoGrapherDevB() as never, o));
        const zeros = log.texts.filter((t) => t.s === '0');
        expect(zeros).toHaveLength(2);
        const mid = (b: Box) => (b.top + b.bottom) / 2;
        expect(Math.abs(mid(zeros[0].box) - mid(zeros[1].box))).toBeLessThan(0.5);
      });
    });
  }
});

describe('spaceTicks', () => {
  it('넉넉하면 축을 그대로 돌려준다 (기준 이미지가 안 흔들린다)', () => {
    const a = { min: -15, max: 15, step: 5 };
    expect(spaceTicks(a, 400, 30, true)).toEqual(a);
  });

  it('자동 범위는 대칭 그대로 넓히고 0 을 눈금에 둔다', () => {
    const r = spaceTicks({ min: -1700, max: 1700, step: 100 }, 400, 36, true);
    expect(r.step).toBeGreaterThan(100);
    expect(r.min).toBe(-r.max);
    expect(r.ticks).toContain(0);
    expect((r.step / (r.max - r.min)) * 400).toBeGreaterThanOrEqual(36);
  });

  it('넓힐 때마다 처음 범위에서 잰다 — ±500 은 250 간격으로 ±500 그대로', () => {
    const r = spaceTicks({ min: -500, max: 500, step: 100 }, 194, 36, true);
    expect(r).toMatchObject({ min: -500, max: 500, step: 250 });
  });

  it('사용자 범위는 min·max 를 두고 양 끝과 0 에 눈금이 놓이는 간격을 고른다', () => {
    const r = spaceTicks({ min: -1600, max: 1600, step: 533 }, 200, 36, false);
    expect(r).toMatchObject({ min: -1600, max: 1600, step: 800 });
    expect(r.ticks).toEqual([-1600, -800, 0, 800, 1600]);
  });

  it('양 끝을 지킬 간격이 없으면 범위 안의 좋은 배수에만 눈금을 둔다', () => {
    const r = spaceTicks({ min: -250, max: 200, step: 1 }, 100, 36, false);
    expect(r.min).toBe(-250);
    expect(r.max).toBe(200);
    expect(r.ticks).toContain(0);
    for (const v of r.ticks!) expect(v >= -250 && v <= 200).toBe(true);
    expect((r.step / 450) * 100).toBeGreaterThanOrEqual(36);
  });

  it('다음 좋은 간격은 1·2·2.5·5 — 0.25 같은 소수 둘째 자리는 건너뛴다', () => {
    expect(nextNiceStep(100)).toBe(200);
    expect(nextNiceStep(200)).toBe(250);
    expect(nextNiceStep(250)).toBe(500);
    expect(nextNiceStep(0.2)).toBe(0.5);
    expect(nextNiceStep(1)).toBe(2);
  });
});
