// © 2026 김용현
// 삼각 그래프 점은 흰 고리로 격자 선에서 떨어진다 (exam). classic 은 1.7.0 그대로.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { renderTernaryGraph, createDefaultTernaryData, createDefaultGraphOptions } from '../../src/core/index';

/** 가로 격자선(c = 20) 위에 놓인 점 하나 — 점 오른쪽 바로 곁 픽셀의 밝기 */
function besideDot(style: 'exam' | 'classic') {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const arcs: { x: number; y: number; r: number }[] = [];
  const arc = ctx.arc.bind(ctx);
  (ctx as unknown as { arc: unknown }).arc = (x: number, y: number, r: number, s: number, e: number) => { arcs.push({ x, y, r }); arc(x, y, r, s, e); };
  const d = createDefaultTernaryData();
  d.points = [{ a: 40, b: 40, c: 20, label: '' }];
  renderTernaryGraph(ctx, 800, 600, d, { ...createDefaultGraphOptions(style), style });
  const dot = arcs[arcs.length - 1];
  const px = canvas.getContext('2d').getImageData(Math.round(dot.x + dot.r + 1.5), Math.round(dot.y), 1, 1).data;
  return { light: px[0], center: canvas.getContext('2d').getImageData(Math.round(dot.x), Math.round(dot.y), 1, 1).data[0] };
}

describe('삼각 그래프 점 테두리', () => {
  it('exam — 격자선 위의 점 둘레가 희다', () => {
    const { light, center } = besideDot('exam');
    expect(center).toBeLessThan(60);
    expect(light).toBeGreaterThan(230);
  });
  it('classic — 1.7.0 처럼 격자선(연회색)이 점에 닿는다', () => {
    expect(besideDot('classic').light).toBeLessThan(240);
  });
});
