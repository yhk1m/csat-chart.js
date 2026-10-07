// © 2026 김용현
// 시험지 양식의 구조 — 토큰 값이 아니라 «무엇을 그리고 무엇을 안 그리는가».
// 픽셀 몇 개로 본다. classic 쪽은 골든이 지킨다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import {
  renderAbsBarGraph, createDefaultAbsBarData, createDefaultGraphOptions, clearCanvas,
  renderLineGraph, createDefaultLineData,
  type GraphOptions,
} from '../../src/core/index';

export const W = 800;
export const H = 600;

export function draw(
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number, d: never, o: GraphOptions) => void,
  data: unknown,
  patch: Partial<GraphOptions> = {},
) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  clearCanvas(ctx, W, H);
  // 기록용 — 그리기 호출의 좌표를 모은다
  const lines: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const origMove = ctx.moveTo.bind(ctx);
  const origLine = ctx.lineTo.bind(ctx);
  let last = { x: 0, y: 0 };
  ctx.moveTo = (x: number, y: number) => { last = { x, y }; origMove(x, y); };
  ctx.lineTo = (x: number, y: number) => { lines.push({ x0: last.x, y0: last.y, x1: x, y1: y }); last = { x, y }; origLine(x, y); };
  fn(ctx, W, H, data as never, { ...createDefaultGraphOptions('exam'), ...patch });
  return { c, lines };
}

describe('절댓값 막대 — exam', () => {
  it('세로 막대의 세로축에는 눈금 표시가 없다 (격자가 대신한다)', () => {
    const { lines } = draw(renderAbsBarGraph as never, createDefaultAbsBarData());
    // 왼쪽 축 선(가장 긴 세로선)의 x
    const axisX = lines.filter((l) => l.x0 === l.x1).sort((a, b) => Math.abs(b.y1 - b.y0) - Math.abs(a.y1 - a.y0))[0].x0;
    const ticks = lines.filter((l) => l.y0 === l.y1 && Math.min(l.x0, l.x1) < axisX && Math.max(l.x0, l.x1) <= axisX + 0.5
      && Math.abs(l.x1 - l.x0) <= 13);
    expect(ticks).toEqual([]);
  });

  it('범주 경계에 안쪽(위) 눈금이 있다 — 범주 셋이면 둘', () => {
    const { lines } = draw(renderAbsBarGraph as never, createDefaultAbsBarData());
    const bottom = Math.max(...lines.filter((l) => l.y0 === l.y1).map((l) => l.y0));
    const up = lines.filter((l) => l.x0 === l.x1 && Math.max(l.y0, l.y1) === bottom && Math.abs(l.y1 - l.y0) === 12);
    expect(up.length).toBe(2);
  });

  it('tickDirection: out 이면 세로축 눈금이 바깥에 생긴다', () => {
    const { lines } = draw(renderAbsBarGraph as never, createDefaultAbsBarData(), { tickDirection: 'out' });
    const axisX = lines.filter((l) => l.x0 === l.x1).sort((a, b) => Math.abs(b.y1 - b.y0) - Math.abs(a.y1 - a.y0))[0].x0;
    const ticks = lines.filter((l) => l.y0 === l.y1 && Math.min(l.x0, l.x1) === axisX - 12);
    expect(ticks.length).toBeGreaterThan(0);
  });
});

describe('꺾은선', () => {
  const right = (lines: { x0: number; y0: number; x1: number; y1: number }[]) =>
    Math.max(...lines.map((l) => Math.max(l.x0, l.x1)));

  it("frame: 'open' 이면 위·오른쪽 틀선이 없다", () => {
    const d = { ...createDefaultLineData(), frame: 'open' as const };
    const { lines } = draw(renderLineGraph as never, d);
    const plotTop = Math.min(...lines.filter((l) => l.x0 === l.x1).map((l) => Math.min(l.y0, l.y1)));
    const topEdges = lines.filter((l) => l.y0 === plotTop && l.y1 === plotTop && Math.abs(l.x1 - l.x0) > 100);
    expect(topEdges).toEqual([]);
  });

  it('기본은 닫힌 틀이다', () => {
    const { lines } = draw(renderLineGraph as never, createDefaultLineData());
    const plotTop = Math.min(...lines.filter((l) => l.x0 === l.x1).map((l) => Math.min(l.y0, l.y1)));
    expect(lines.some((l) => l.y0 === plotTop && l.y1 === plotTop && Math.abs(l.x1 - l.x0) > 100)).toBe(true);
    expect(right(lines)).toBeGreaterThan(0);
  });

  it('exam 은 가로축 눈금을 안쪽(위)으로 긋는다', () => {
    const { lines } = draw(renderLineGraph as never, createDefaultLineData());
    const bottom = Math.max(...lines.filter((l) => l.y0 === l.y1 && Math.abs(l.x1 - l.x0) > 100).map((l) => l.y0));
    const up = lines.filter((l) => l.x0 === l.x1 && l.y0 === bottom && l.y1 === bottom - 12);
    expect(up.length).toBeGreaterThan(0);
  });
});
