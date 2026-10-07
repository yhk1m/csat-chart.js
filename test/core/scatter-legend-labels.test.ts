// © 2026 김용현
// 산점 — 플롯 안 범례 상자를 점 이름이 비켜 가는가 (exam).
// exam 은 글자가 커서 「큰원」이 범례 상자 아래 끝에 닿았다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { clearCanvas, createDefaultGraphOptions, renderScatterGraph } from '../../src/core/index';
import { CASES } from './fixtures';

interface Box { left: number; right: number; top: number; bottom: number }

function record(style: 'exam' | 'classic') {
  const c = createCanvas(800, 600);
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  clearCanvas(ctx, 800, 600);
  const rects: Box[] = [];
  const texts: { text: string; box: Box }[] = [];
  const origStroke = ctx.strokeRect.bind(ctx);
  ctx.strokeRect = (x: number, y: number, w: number, h: number) => {
    rects.push({ left: x, right: x + w, top: y, bottom: y + h });
    origStroke(x, y, w, h);
  };
  const origRound = ctx.roundRect.bind(ctx);
  ctx.roundRect = ((x: number, y: number, w: number, h: number, r?: number) => {
    rects.push({ left: x, right: x + w, top: y, bottom: y + h });
    origRound(x, y, w, h, r);
  }) as typeof ctx.roundRect;
  const origFill = ctx.fillText.bind(ctx);
  ctx.fillText = (text: string, x: number, y: number) => {
    const m = ctx.measureText(text);
    const left = ctx.textAlign === 'left' ? x : ctx.textAlign === 'right' ? x - m.width : x - m.width / 2;
    texts.push({ text, box: { left, right: left + m.width, top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent } });
    origFill(text, x, y);
  };
  const data = CASES.find(([n]) => n === 'scatterLegendAvoid')![2]();
  renderScatterGraph(ctx, 800, 600, data as never, { ...createDefaultGraphOptions(style), style });
  return { rects, texts };
}

const gapBetween = (a: Box, b: Box) => Math.max(
  b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom,
);

describe('산점 범례 — 점 이름이 범례 상자를 비킨다', () => {
  it('exam: 점 이름과 범례 상자 사이가 4px 이상 떨어진다', () => {
    const { rects, texts } = record('exam');
    // 범례 상자 — 플롯 틀보다 작은 사각형
    const boxes = rects.filter((r) => r.right - r.left < 400);
    expect(boxes.length).toBeGreaterThanOrEqual(2);
    for (const name of ['큰원', '작은원', '우상단']) {
      const label = texts.find((t) => t.text === name)!;
      expect(label).toBeDefined();
      for (const b of boxes) expect(gapBetween(label.box, b)).toBeGreaterThanOrEqual(4);
    }
  });
});
