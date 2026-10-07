// © 2026 김용현
// 괄호를 따로 찍는 글줄 도우미 — 가짜 ctx 로 조각 나누기·폭·세로 자리를 본다.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  splitParenRuns, measureMixed, fillMixed, textCtx, resetParenCache, PAREN_HEIGHT,
} from '../../src/core/canvas/parens';
import { createDefaultGraphOptions } from '../../src/core/index';

const PAREN = "'PARENFONT'";

interface Call { op: 'fill' | 'stroke'; text: string; x: number; y: number; font: string; align: string; maxWidth?: number }

/**
 * 가짜 ctx. 글자 폭: 괄호 글꼴 0.3em, 나머지 0.5em.
 * 잉크(alphabetic): 본 글꼴 `가` 위 0.8em·아래 0.1em, 괄호 글꼴 `(` 위 0.75em·아래 0.2em.
 */
function fakeCtx(font = '35px MAIN') {
  const calls: Call[] = [];
  const st = { font, textAlign: 'left' as CanvasTextAlign, textBaseline: 'alphabetic' as CanvasTextBaseline };
  const stack: (typeof st)[] = [];
  const px = () => parseFloat(/([\d.]+)px/.exec(st.font)![1]);
  const isParen = () => st.font.includes('PARENFONT');
  const ctx = {
    get font() { return st.font; }, set font(v: string) { st.font = v; },
    get textAlign() { return st.textAlign; }, set textAlign(v: CanvasTextAlign) { st.textAlign = v; },
    get textBaseline() { return st.textBaseline; }, set textBaseline(v: CanvasTextBaseline) { st.textBaseline = v; },
    save() { stack.push({ ...st }); },
    restore() { Object.assign(st, stack.pop()); },
    measureText(t: string) {
      const p = px();
      const per = isParen() ? 0.3 : 0.5;
      const asc = isParen() ? 0.75 : 0.8;
      const desc = isParen() ? 0.2 : 0.1;
      const w = [...t].length * per * p;
      return {
        width: w,
        actualBoundingBoxLeft: 0, actualBoundingBoxRight: w,
        actualBoundingBoxAscent: asc * p, actualBoundingBoxDescent: desc * p,
        fontBoundingBoxAscent: p, fontBoundingBoxDescent: 0.2 * p,
      } as unknown as TextMetrics;
    },
    fillText(text: string, x: number, y: number, maxWidth?: number) {
      calls.push({ op: 'fill', text, x, y, font: st.font, align: st.textAlign, maxWidth });
    },
    strokeText(text: string, x: number, y: number) {
      calls.push({ op: 'stroke', text, x, y, font: st.font, align: st.textAlign });
    },
    translate() {}, scale() {},
    canvas: { width: 800 },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

beforeEach(() => resetParenCache());

describe('splitParenRuns', () => {
  it('괄호 조각과 나머지를 차례대로 가른다', () => {
    expect(splitParenRuns('2020(년)')).toEqual([
      { text: '2020', paren: false }, { text: '(', paren: true },
      { text: '년', paren: false }, { text: ')', paren: true },
    ]);
  });
  it('이어진 괄호는 한 조각', () => {
    expect(splitParenRuns('((가))')).toEqual([
      { text: '((', paren: true }, { text: '가', paren: false }, { text: '))', paren: true },
    ]);
  });
  it('괄호가 없으면 한 조각, 빈 글은 없음', () => {
    expect(splitParenRuns('통계청')).toEqual([{ text: '통계청', paren: false }]);
    expect(splitParenRuns('')).toEqual([]);
  });
});

describe('괄호 크기·자리', () => {
  // 본 글꼴 35px: 가 = 위 28·아래 3.5 → 높이 31.5, 가운데 −12.25
  // 괄호 35px 의 높이 0.95×35 = 33.25 → 크기 p = 35 × 1.04 × 31.5 / 33.25
  const p = 35 * PAREN_HEIGHT * 31.5 / 33.25;

  it('폭은 조각 폭의 합 — 괄호는 괄호 글꼴, 크기 p 로', () => {
    const { ctx } = fakeCtx();
    const m = measureMixed(ctx, '(가)', PAREN);
    expect(m.width).toBeCloseTo(0.3 * p * 2 + 0.5 * 35, 6);
    expect(ctx.font).toBe('35px MAIN'); // 재고 나서 글꼴을 되돌린다
  });

  it('괄호 높이 = 한글 높이 × 1.04, 가운데를 한글 가운데에 맞춘다', () => {
    const { ctx, calls } = fakeCtx();
    fillMixed(ctx, '(가)', 100, 200, PAREN);
    const paren = calls.filter((c) => c.text === '(' || c.text === ')');
    expect(paren).toHaveLength(2);
    expect(paren[0].font).toBe(`${p}px 'PARENFONT'`);
    const hangulMid = 200 + (3.5 - 28) / 2;
    const parenMid = paren[0].y + (0.2 * p - 0.75 * p) / 2;
    expect(parenMid).toBeCloseTo(hangulMid, 6);
    // 높이 비
    expect((0.95 * p) / 31.5).toBeCloseTo(PAREN_HEIGHT, 6);
    const hangul = calls.find((c) => c.text === '가')!;
    expect(hangul.y).toBe(200);
    expect(hangul.font).toBe('35px MAIN');
  });

  it('가운데 정렬이면 전체 폭의 절반만큼 왼쪽에서 시작해 조각을 차례로 놓는다', () => {
    const { ctx, calls } = fakeCtx();
    ctx.textAlign = 'center';
    fillMixed(ctx, '(가)', 100, 200, PAREN);
    const total = 0.3 * p * 2 + 0.5 * 35;
    expect(calls.map((c) => c.align)).toEqual(['left', 'left', 'left']);
    expect(calls[0].x).toBeCloseTo(100 - total / 2, 6);
    expect(calls[1].x).toBeCloseTo(100 - total / 2 + 0.3 * p, 6);
    expect(calls[2].x).toBeCloseTo(100 - total / 2 + 0.3 * p + 17.5, 6);
    expect(ctx.textAlign).toBe('center'); // 되돌린다
  });

  it('오른쪽 정렬이면 오른쪽 끝이 x', () => {
    const { ctx, calls } = fakeCtx();
    ctx.textAlign = 'right';
    fillMixed(ctx, '2020(년)', 300, 50, PAREN);
    const total = 0.5 * 35 * 5 + 0.3 * p * 2;
    expect(calls[0].x).toBeCloseTo(300 - total, 6);
    const last = calls[calls.length - 1];
    expect(last.x + 0.3 * p).toBeCloseTo(300, 6);
  });

  it('괄호 없는 글은 그대로 한 번에 그린다 (정렬·maxWidth 그대로)', () => {
    const { ctx, calls } = fakeCtx();
    ctx.textAlign = 'center';
    fillMixed(ctx, '통계청', 10, 20, PAREN, 99);
    expect(calls).toEqual([{ op: 'fill', text: '통계청', x: 10, y: 20, font: '35px MAIN', align: 'center', maxWidth: 99 }]);
  });

  it('굵기 등 크기 앞부분은 괄호 글꼴에도 붙는다', () => {
    const { ctx, calls } = fakeCtx('bold 35px MAIN');
    fillMixed(ctx, '(가)', 0, 0, PAREN);
    expect(calls[0].font).toBe(`bold ${p}px 'PARENFONT'`);
  });

  it('refScale — 숫자 자리처럼 키운 px 면 괄호는 요청 크기(px × refScale)의 한글에 맞춘다', () => {
    const { ctx, calls } = fakeCtx();
    fillMixed(ctx, '(2024)', 0, 0, PAREN, undefined, false, 0.8);
    // 한글 = 28px 에서 위 22.4·아래 2.8 → 높이 25.2, 괄호 35px 높이 33.25
    const size = parseFloat(/([\d.]+)px/.exec(calls[0].font)![1]);
    expect(size).toBeCloseTo(35 * PAREN_HEIGHT * 25.2 / 33.25, 9);
  });

  it('잉크 위·아래는 조각 중 가장 큰 것 (괄호는 옮긴 자리로)', () => {
    const { ctx } = fakeCtx();
    const m = measureMixed(ctx, '(가)', PAREN);
    const dy = (3.5 - 28) / 2 - (0.2 * p - 0.75 * p) / 2;
    expect(m.actualBoundingBoxAscent).toBeCloseTo(Math.max(28, 0.75 * p - dy), 6);
    expect(m.actualBoundingBoxDescent).toBeCloseTo(Math.max(3.5, 0.2 * p + dy), 6);
  });
});

describe('textCtx', () => {
  it('classic 은 받은 ctx 그대로', () => {
    const { ctx } = fakeCtx();
    expect(textCtx(ctx, { ...createDefaultGraphOptions('classic'), style: 'classic' })).toBe(ctx);
  });

  it('exam 은 fillText·strokeText·measureText 를 괄호 조각으로 가르고 나머지는 그대로 넘긴다', () => {
    const { ctx, calls } = fakeCtx();
    const c = textCtx(ctx, { ...createDefaultGraphOptions('exam'), style: 'exam', fontStack: { serif: PAREN } });
    expect(c).not.toBe(ctx);
    c.font = '35px MAIN';
    expect(ctx.font).toBe('35px MAIN');
    c.fillText('(가)', 0, 0);
    c.strokeText('(가)', 0, 0);
    expect(calls.filter((k) => k.op === 'fill').map((k) => k.text)).toEqual(['(', '가', ')']);
    expect(calls.filter((k) => k.op === 'stroke').map((k) => k.text)).toEqual(['(', '가', ')']);
    expect(c.measureText('(가)').width).toBeCloseTo(measureMixed(ctx, '(가)', PAREN).width, 6);
    expect(c.measureText('가가').width).toBe(35);
    expect(c.canvas).toBe(ctx.canvas);
  });
});
