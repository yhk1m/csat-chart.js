// © 2026 김용현
// 2.4.0 — 기호는 명조·한글은 돋움(exam), 눈금 숫자만 키우기, 하이서그래프 달 이름 흰 테두리.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { splitRuns, textCtx } from '../../src/core/canvas/parens';
import { textFont, textSize, clearCanvas, fontStackOf } from '../../src/core/canvas/renderer';
import {
  renderHythergraph,
  createDefaultHythergraphData,
  createDefaultGraphOptions,
} from '../../src/core/index';

describe('splitRuns 글자 갈래', () => {
  it('「(가)」 안쪽은 기호, 그 밖의 한글은 한글 조각', () => {
    expect(splitRuns('(가) 미국', false, true)).toEqual([
      { text: '(', paren: true },
      { text: '가', paren: false, script: 'symbol' },
      { text: ')', paren: true },
      { text: ' ', paren: false },
      { text: '미국', paren: false, script: 'hangul' },
    ]);
  });
  it('「(년)」 같은 단위는 기호가 아니다', () => {
    expect(splitRuns('(년)', false, true).find((r) => r.text === '년')?.script).toBe('hangul');
  });
  it('㉠ 은 기호', () => {
    expect(splitRuns('㉠', false, true)).toEqual([{ text: '㉠', paren: false, script: 'symbol' }]);
  });
  it('갈래를 묻지 않으면 예전 그대로', () => {
    expect(splitRuns('(가) 미국', false)).toEqual([
      { text: '(', paren: true }, { text: '가', paren: false }, { text: ')', paren: true }, { text: ' 미국', paren: false },
    ]);
  });
});

/** 감싼 ctx 로 글줄 하나를 찍고, 조각마다 쓴 글꼴을 모은다 */
function fontsUsed(place: 'title' | 'category', text: string, style: 'exam' | 'classic' = 'exam') {
  const c = createCanvas(400, 100);
  const raw = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  const o = createDefaultGraphOptions(style);
  const used: Record<string, string> = {};
  const spy = new Proxy(raw, {
    get(t, p) {
      if (p === 'fillText') return (s: string, x: number, y: number) => { used[s] = t.font; t.fillText(s, x, y); };
      const v = Reflect.get(t, p, t);
      return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, p, v) { return Reflect.set(t, p, v, t); },
  });
  clearCanvas(raw, 400, 100);
  const ctx = textCtx(spy, o);
  ctx.font = textFont(o, place, 30);
  ctx.fillText(text, 10, 50);
  return { used, sans: fontStackOf(o, 'sans'), serif: fontStackOf(o, 'serif') };
}

describe('exam 글자 갈래 글꼴', () => {
  it('고딕 자리(제목)의 「(가)」 는 명조로 찍는다', () => {
    const { used } = fontsUsed('title', '(가) 미국');
    expect(used['가']).toContain('신명조');
    expect(used['미국'] ?? used[' 미국']).toContain('중고딕');
  });
  it('명조 자리(범주)의 한글은 돋움으로, 기호는 명조 그대로', () => {
    const { used } = fontsUsed('category', '1990년 (가)');
    expect(used['년']).toContain('중고딕');
    expect(used['가']).toContain('신명조');
  });
  it('classic 은 건드리지 않는다', () => {
    const { used } = fontsUsed('title', '(가) 미국', 'classic');
    expect(Object.keys(used)).toEqual(['(가) 미국']);
  });
});

describe('fontSize.tickNumber', () => {
  it('눈금 숫자만 키우고 범례 크기는 그대로', () => {
    const o = createDefaultGraphOptions('exam');
    const big = { ...o, fontSize: { ...o.fontSize, tickNumber: o.fontSize.tick * 1.2 } };
    expect(textSize(big, 'tick', o.fontSize.tick)).toBeCloseTo(o.fontSize.tick * 1.2);
    expect(textSize(big, 'legend', o.fontSize.tick)).toBe(textSize(o, 'legend', o.fontSize.tick));
  });
});

describe('Hythergraph monthLabelHalo', () => {
  const series = [{ label: '(가)', months: Array.from({ length: 12 }, (_, i) => ({ temp: i * 100, precip: i * 2 })) }];
  const strokes = (halo: boolean) => {
    const data = { ...createDefaultHythergraphData(), series, monthLabels: [...Array(11).fill(null), '12월'], monthLabelHalo: halo };
    const c = createCanvas(600, 500);
    const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
    const seen: string[] = [];
    const orig = ctx.strokeText.bind(ctx);
    ctx.strokeText = (s: string, x: number, y: number, mw?: number) => { seen.push(`${s}|${ctx.strokeStyle}`); orig(s, x, y, mw); };
    renderHythergraph(ctx, 600, 500, data, createDefaultGraphOptions('exam'));
    return seen;
  };
  it('켜면 달 이름 둘레를 흰색으로 긋는다', () => {
    expect(strokes(true).some((s) => s.includes('#ffffff') || s.includes('#fff'))).toBe(true);
  });
  it('끄면 긋지 않는다', () => {
    expect(strokes(false)).toEqual([]);
  });
});
