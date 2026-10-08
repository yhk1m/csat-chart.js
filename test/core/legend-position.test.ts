// © 2026 김용현
// options.legendPosition — 모서리가 다 막힌 안쪽 범례가 나갈 쪽 (exam). 적지 않으면 종류의 예전 자리.
import { describe, it, expect } from 'vitest';
import {
  renderScatterGraph, renderAbsBarGraph, createDefaultScatterData, createDefaultAbsBarData,
  createDefaultGraphOptions, type LegendPosition,
} from '../../src/core/index';
import { drawLogged, overlaps, type DrawLog, type Box, type Drawn } from './draw-log';

const opts = (legendPosition?: LegendPosition) => ({
  ...createDefaultGraphOptions('exam'), style: 'exam' as const, legendPosition,
  title: '시·도별 인구밀도와 1인당 지역내총생산', source: '통계청, 2023',
});

/** 데모 산점도 — 축 이름이 길어 플롯이 좁고, 어느 모서리든 버블에 걸린다 */
function scatter() {
  const d = createDefaultScatterData();
  d.xLabel = '인구밀도'; d.xUnit = '(명/km²)';
  d.yLabel = '1인당 지역내총생산'; d.yUnit = '(백만 원)';
  return d;
}

/** 범례 상자 — 플롯 틀보다 나중에 그린 큰 테두리 (틀은 맨 먼저 그린다) */
const bigBoxes = (log: DrawLog): Drawn[] =>
  log.strokeRects.filter((b) => b.right - b.left > 40 && b.bottom - b.top > 40).sort((a, b) => a.seq - b.seq).slice(1);

describe('산점도 버블 범례 — 막히면 legendPosition 쪽', () => {
  it("적지 않으면 예전대로 오른쪽 바깥", () => {
    const log = drawLogged((ctx) => renderScatterGraph(ctx, 800, 600, scatter(), opts()));
    const name = log.texts.find((t) => t.s === '인구밀도')!;
    const box = bigBoxes(log)[0];
    expect(box.top).toBeLessThan(name.box.top);
  });

  it("'bottom' 이면 가로축 이름 아래, 버블·글자를 덮지 않고 캔버스 안", () => {
    const log = drawLogged((ctx) => renderScatterGraph(ctx, 800, 600, scatter(), opts('bottom')));
    const boxes = bigBoxes(log);
    expect(boxes.length).toBeGreaterThan(0);
    const name = log.texts.find((t) => t.s === '인구밀도')!;
    for (const b of boxes) {
      expect(b.top).toBeGreaterThan(name.box.bottom);
      expect(b.bottom).toBeLessThanOrEqual(600);
      // 상자 밖에서 그린 글자(출처·각주 포함)와 겹치지 않는다
      const inside = (t: Box) => t.left >= b.left && t.right <= b.right && t.top >= b.top && t.bottom <= b.bottom;
      expect(log.texts.filter((t) => !inside(t.box) && overlaps(t.box, b)).map((t) => t.s)).toEqual([]);
    }
    expect(log.arcs.filter((a) => boxes.some((b) => a.seq < b.seq && overlaps(a, b)))).toEqual([]);
  });
});

describe('막대 insideLegend — 막히면 legendPosition 을 적었을 때만 바깥', () => {
  /** 오른쪽 위가 막대에 막히는 기본 자료 + 안쪽 범례 */
  const data = () => ({ ...createDefaultAbsBarData(), insideLegend: 'top-right' as const });
  const legendRect = (log: DrawLog) => log.strokeRects.filter((b) => b.right - b.left > 60)
    .sort((a, b) => (b.right - b.left) * (b.bottom - b.top) - (a.right - a.left) * (a.bottom - a.top));

  /** 범례 이름(「항목」 — 숫자는 따로 찍힌다)과 마지막 범주 이름 「다」 */
  const where = (log: DrawLog) => ({
    label: log.texts.find((t) => t.s === '항목')!.box,
    lastTick: log.texts.find((t) => t.s === '다')!.box,
  });

  /** 플롯 틀의 왼쪽·오른쪽 끝 — 가장 긴 가로 선분(가로축·틀 윗변) */
  const plotSpan = (log: DrawLog) => {
    const h = log.segs.filter(([, y1, , y2]) => Math.abs(y1 - y2) < 0.5)
      .sort((a, b) => Math.abs(b[2] - b[0]) - Math.abs(a[2] - a[0]))[0];
    return { left: Math.min(h[0], h[2]), right: Math.max(h[0], h[2]) };
  };

  // 범례 이름과 범주 이름의 가로 자리를 견주면 글꼴 폭(CI 대체 글꼴)에 따라 뒤집힌다 —
  // 범례 상자가 플롯 틀 안에 있는지를 본다
  it("적지 않으면 예전 그대로 플롯 안", () => {
    const log = drawLogged((ctx) => renderAbsBarGraph(ctx, 800, 600, data(), opts()));
    const { label } = where(log);
    const plot = plotSpan(log);
    const box = legendRect(log)[0];
    expect(box.left).toBeGreaterThan(plot.left);
    expect(box.right).toBeLessThanOrEqual(plot.right);
    expect(label.left).toBeGreaterThan(box.left);
    expect(label.right).toBeLessThan(box.right);
  });

  it("'right' 면 플롯 오른쪽 바깥으로 나가 막대를 덮지 않는다", () => {
    const log = drawLogged((ctx) => renderAbsBarGraph(ctx, 800, 600, data(), opts('right')));
    const { label, lastTick } = where(log);
    expect(label.left).toBeGreaterThan(lastTick.right + 20);
    const box = legendRect(log)[0];
    expect(box.right).toBeLessThanOrEqual(800);
    expect(box.left).toBeGreaterThan(lastTick.right);
    expect(box.left).toBeGreaterThan(plotSpan(log).right);
  });
});
