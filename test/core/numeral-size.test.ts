// © 2026 김용현
// 시험지 숫자 크기 맞추기 — 숫자 글꼴의 숫자 높이를 본문 «한양신명조»(0.758 em)에 맞춘다.
//
// Garamond 숫자는 0.650 em, Times New Roman 은 0.685 em 이라 같은 px 로 그리면
// 시험지보다 10–14% 작다(실측 명세 «숫자 글꼴 대조»). numeral 자리만, exam 에서만 키운다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import { textFont, createDefaultGraphOptions } from '../../src/core/index';
import { numeralSize, setFontMeasurer, resetDigitCache, RAW_CTX } from '../../src/core/canvas/renderer';
import { EXAM_NUMERAL_STACK, EXAM_SERIF_STACK, examStyle, classicStyle } from '../../src/core/canvas/style';

/** 글자 크기 × ratio 를 숫자 높이로 돌려주는 가짜 ctx */
function fakeCtx(ratio: number | undefined) {
  const calls: string[] = [];
  const state = { font: '10px serif', textBaseline: 'alphabetic' };
  const stack: (typeof state)[] = [];
  const ctx = {
    get font() { return state.font; },
    set font(f: string) { state.font = f; },
    get textBaseline() { return state.textBaseline; },
    set textBaseline(b: string) { state.textBaseline = b; },
    save() { stack.push({ ...state }); },
    restore() { Object.assign(state, stack.pop()); },
    measureText(s: string) {
      calls.push(`${state.font}|${state.textBaseline}|${s}`);
      const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(state.font)![1]);
      return { width: px * s.length * 0.5, actualBoundingBoxAscent: ratio === undefined ? undefined : px * ratio };
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, state };
}

const STACK = `${EXAM_NUMERAL_STACK}, ${EXAM_SERIF_STACK}`;

beforeEach(() => resetDigitCache());
afterEach(() => setFontMeasurer(null));

describe('numeralSize — 숫자 높이를 목표 비율에 맞춘다', () => {
  it('숫자 높이 0.650 em 글꼴을 0.758 em 로 — 크기 × 0.758/0.650', () => {
    const { ctx } = fakeCtx(0.65);
    expect(numeralSize(30, 'normal', STACK, 0.758, ctx)).toBeCloseTo(30 * 0.758 / 0.65, 1);
  });

  it('잴 때 기준선을 alphabetic 으로 두고, ctx 의 글꼴·기준선을 되돌린다', () => {
    const { ctx, calls, state } = fakeCtx(0.65);
    state.textBaseline = 'middle';
    numeralSize(30, 'normal', STACK, 0.758, ctx);
    expect(calls[0]).toContain('|alphabetic|');
    expect(state).toEqual({ font: '10px serif', textBaseline: 'middle' });
  });

  it('같은 글꼴은 한 번만 잰다 — 크기가 달라도', () => {
    const { ctx, calls } = fakeCtx(0.685);
    const a = numeralSize(30, 'normal', STACK, 0.758, ctx);
    const b = numeralSize(20, 'normal', STACK, 0.758, ctx);
    expect(calls).toHaveLength(1);
    expect(b / a).toBeCloseTo(20 / 30, 3);
    numeralSize(30, 'normal', "'Times New Roman'", 0.758, ctx);
    expect(calls).toHaveLength(2);
  });

  it('actualBoundingBoxAscent 가 없거나 0 이면 키우지 않는다', () => {
    expect(numeralSize(30, 'normal', STACK, 0.758, fakeCtx(undefined).ctx)).toBe(30);
    resetDigitCache();
    expect(numeralSize(30, 'normal', STACK, 0.758, fakeCtx(0).ctx)).toBe(30);
  });

  it('잴 수 없던 결과는 캐시에 남기지 않는다 — 다음에 잴 수 있는 ctx 로 다시 잰다', () => {
    expect(numeralSize(30, 'normal', STACK, 0.758, fakeCtx(undefined).ctx)).toBe(30);
    expect(numeralSize(30, 'normal', STACK, 0.758, fakeCtx(0.65).ctx)).toBeCloseTo(30 * 0.758 / 0.65, 1);
  });

  it('감싼 ctx 는 감싸기 전 ctx 로 잰다 (RAW_CTX)', () => {
    const inner = fakeCtx(0.65);
    const wrapped = new Proxy(inner.ctx as object, {
      get(t, p) {
        if (p === RAW_CTX) return t;
        if (p === 'measureText') return () => ({ width: 0, actualBoundingBoxAscent: 758 });
        return Reflect.get(t, p);
      },
    }) as CanvasRenderingContext2D;
    expect(numeralSize(30, 'normal', STACK, 0.758, wrapped)).toBeCloseTo(30 * 0.758 / 0.65, 1);
    expect(inner.calls).toHaveLength(1);
  });

  it('잴 ctx 가 없거나 목표가 없으면(classic) 그대로', () => {
    expect(numeralSize(30, 'normal', STACK, 0.758, null)).toBe(30);
    expect(numeralSize(30, 'normal', STACK, null, fakeCtx(0.65).ctx)).toBe(30);
  });
});

describe('textFont — exam 의 numeral 자리만 키운다', () => {
  const exam = { ...createDefaultGraphOptions(), style: 'exam' as const };
  const classic = createDefaultGraphOptions('classic');

  it('토큰: classic 은 맞추지 않고 exam 은 0.758', () => {
    expect(classicStyle.digitHeight).toBeNull();
    expect(examStyle.digitHeight).toBe(0.758);
  });

  it('잴 ctx 를 걸면 exam 눈금 숫자가 커진다', () => {
    setFontMeasurer(fakeCtx(0.65).ctx);
    const px = 30 * 0.758 / 0.65;
    expect(textFont(exam, 'tick', 30)).toBe(`normal ${Math.round(px * 100) / 100}px ${STACK}`);
  });

  it('exam 의 고딕·명조 자리는 그대로', () => {
    setFontMeasurer(fakeCtx(0.65).ctx);
    expect(textFont(exam, 'axisName', 30)).toMatch(/^normal 30px /);
    expect(textFont(exam, 'category', 30)).toMatch(/^normal 30px /);
  });

  it('classic 은 어느 자리도 바뀌지 않는다 — fontFamily numeral 을 골라도', () => {
    const { ctx, calls } = fakeCtx(0.65);
    setFontMeasurer(ctx);
    expect(textFont(classic, 'tick', 26)).toMatch(/^bold 26px /);
    expect(textFont({ ...classic, fontFamily: 'numeral' }, 'value', 22)).toMatch(/^bold 22px /);
    expect(calls).toHaveLength(0);
  });
});

const has = (f: string) => GlobalFonts.families.some((x) => x.family === f);

describe.runIf(has('Garamond'))('실제 Garamond (@napi-rs/canvas)', () => {
  it('exam 눈금 숫자 "0" 의 높이 ≈ 0.758 × 크기 (±3%)', () => {
    const ctx = createCanvas(10, 10).getContext('2d') as unknown as CanvasRenderingContext2D;
    setFontMeasurer(ctx);
    const exam = { ...createDefaultGraphOptions(), style: 'exam' as const };
    const size = 200; // 작은 크기는 잰 높이가 정수 px 로 반올림된다
    ctx.font = textFont(exam, 'tick', size);
    ctx.textBaseline = 'alphabetic';
    const ascent = ctx.measureText('0').actualBoundingBoxAscent;
    expect(ascent / size).toBeGreaterThan(0.758 * 0.97);
    expect(ascent / size).toBeLessThan(0.758 * 1.03);
  });
});
