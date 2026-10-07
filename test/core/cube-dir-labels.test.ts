// © 2026 김용현
// 정육면체 낮음·높음 글자 위로 모서리·축 선이 지나가지 않는다 (exam).
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { renderCubeGraph, createDefaultCubeData, createDefaultGraphOptions, type CubeGraphData } from '../../src/core/index';
import { segmentHitsBox } from '../../src/core/canvas/avoid';

type Box = { left: number; right: number; top: number; bottom: number };

/** 그리는 동안 그은 선분과 찍은 글자 상자를 모은다 */
function record(data: CubeGraphData) {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const segs: [number, number, number, number][] = [];
  const texts: { s: string; box: Box }[] = [];
  let path: [number, number][][] = [];
  const c = ctx as unknown as Record<string, (...a: never[]) => unknown>;
  const orig = { beginPath: ctx.beginPath.bind(ctx), moveTo: ctx.moveTo.bind(ctx), lineTo: ctx.lineTo.bind(ctx), stroke: ctx.stroke.bind(ctx), fillText: ctx.fillText.bind(ctx) };
  c.beginPath = () => { path = []; orig.beginPath(); };
  c.moveTo = ((x: number, y: number) => { path.push([[x, y]]); orig.moveTo(x, y); }) as never;
  c.lineTo = ((x: number, y: number) => { path[path.length - 1]?.push([x, y]); orig.lineTo(x, y); }) as never;
  c.stroke = (() => {
    const m = ctx.getTransform();
    for (const sub of path) for (let i = 1; i < sub.length; i++) {
      const p = (q: [number, number]) => [m.a * q[0] + m.c * q[1] + m.e, m.b * q[0] + m.d * q[1] + m.f];
      const [x1, y1] = p(sub[i - 1]);
      const [x2, y2] = p(sub[i]);
      segs.push([x1, y1, x2, y2]);
    }
    orig.stroke();
  }) as never;
  c.fillText = ((s: string, x: number, y: number) => {
    const mm = ctx.measureText(s);
    texts.push({ s, box: { left: x - mm.actualBoundingBoxLeft, right: x + mm.actualBoundingBoxRight, top: y - mm.actualBoundingBoxAscent, bottom: y + mm.actualBoundingBoxDescent } });
    orig.fillText(s, x, y);
  }) as never;
  renderCubeGraph(ctx, 800, 600, data, { ...createDefaultGraphOptions('exam'), style: 'exam' });
  return { segs, texts };
}

const shrink = (b: Box, d: number) => ({ left: b.left + d, right: b.right - d, top: b.top + d, bottom: b.bottom - d });

function demoData(): CubeGraphData {
  const d = createDefaultCubeData();
  d.points = [
    { x: 0.25, y: 0.85, z: 0.65, label: '가', labelDx: 8, labelDy: -4 },
    { x: 0.8, y: 0.6, z: 0.3, label: '나', labelDx: 10, labelDy: 0 },
    { x: 0.85, y: 0.4, z: 0.75, label: '다', labelDx: 14, labelDy: -6 },
  ];
  return d;
}

describe('정육면체 낮음·높음 (exam)', () => {
  it.each([['기본 자료', createDefaultCubeData], ['데모 자료', demoData]])('%s — 어느 선도 글자를 지나지 않는다', (_n, make) => {
    const { segs, texts } = record(make());
    const dirs = texts.filter((t) => t.s === '높음' || t.s === '낮음');
    expect(dirs.length).toBe(4);
    for (const t of dirs) {
      const crossing = segs.filter(([x1, y1, x2, y2]) => segmentHitsBox(x1, y1, x2, y2, shrink(t.box, 1)));
      expect(crossing, `${t.s} @ ${JSON.stringify(t.box)}`).toEqual([]);
    }
  });

  it('데모 자료 — 낮음·높음이 점 이름과 겹치지 않는다', () => {
    const { texts } = record(demoData());
    const dirs = texts.filter((t) => t.s === '높음' || t.s === '낮음');
    const names = texts.filter((t) => ['가', '나', '다'].includes(t.s));
    for (const d of dirs) for (const n of names) {
      const o = !(d.box.right <= n.box.left || d.box.left >= n.box.right || d.box.bottom <= n.box.top || d.box.top >= n.box.bottom);
      expect(o, `${d.s} ↔ ${n.s}`).toBe(false);
    }
  });
});
