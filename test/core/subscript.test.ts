// © 2026 김용현
// 아래 첨자 — 표기를 가르는 규칙과, **재는 쪽이 그리는 쪽과 같은 값을 보는지**.
//
// 두 번째가 이 파일의 요점이다. 여백을 잡는 쪽이 원문 `'D_1'` 을 그대로 재면
// 밑줄 한 칸이 더 얹히고, 첨자를 지운 `'D1'` 을 재면 좁게 잡힌다. 둘 다 글자가
// 캔버스 밖으로 나가거나 자리가 남는 그림이 된다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import {
  SUB_SCALE,
  fillRich,
  hasSubscript,
  parseRich,
  richWidth,
} from '../../src/core/canvas/subscript';
import { getFont, createDefaultGraphOptions } from '../../src/core/index';

const SIZE = 28;
const options = createDefaultGraphOptions();
const makeFont = (size: number) => getFont(size, options);

function ctx2d(): CanvasRenderingContext2D {
  return createCanvas(400, 200).getContext('2d') as unknown as CanvasRenderingContext2D;
}

describe('첨자 표기 가르기', () => {
  it('밑줄 뒤의 영문자·숫자가 첨자가 된다', () => {
    expect(parseRich('D_1')).toEqual([{ text: 'D', sub: false }, { text: '1', sub: true }]);
    expect(parseRich('P_2')).toEqual([{ text: 'P', sub: false }, { text: '2', sub: true }]);
    expect(parseRich('E_Y')).toEqual([{ text: 'E', sub: false }, { text: 'Y', sub: true }]);
  });

  it('이어지는 영숫자는 통째로 첨자가 된다', () => {
    expect(parseRich('수량_2024년')).toEqual([
      { text: '수량', sub: false },
      { text: '2024', sub: true },
      { text: '년', sub: false },
    ]);
  });

  it('한글·공백·괄호 앞의 밑줄은 밑줄 그대로다', () => {
    // 규칙을 «밑줄 + 영숫자» 로 좁혀 둔 까닭이다 — 한글 이름에 밑줄을 쓰는
    // 사람이 있어도 첨자로 끌려가지 않는다.
    for (const plain of ['강원_춘천', '가_ 나', '(가)_', '_', '__']) {
      expect(hasSubscript(plain), plain).toBe(false);
      expect(parseRich(plain)).toEqual([{ text: plain, sub: false }]);
    }
  });

  it('첨자가 없는 글은 통째로 한 도막이다 — 옛 길로 흘러간다', () => {
    expect(parseRich('수요')).toEqual([{ text: '수요', sub: false }]);
    expect(parseRich('')).toEqual([{ text: '', sub: false }]);
  });
});

describe('재는 쪽이 첨자까지 합쳐 본다', () => {
  it('첨자 없는 글의 폭은 measureText 와 정확히 같다', () => {
    // 1.4.0 이 그린 그림이 한 픽셀도 안 움직여야 한다는 약속이 이 줄이다.
    const ctx = ctx2d();
    for (const text of ['수요', '가격(천 원)', '0', '−5']) {
      ctx.font = makeFont(SIZE);
      const plain = ctx.measureText(text).width;
      expect(richWidth(ctx, text, SIZE, makeFont)).toBe(plain);
    }
  });

  it('첨자가 든 글은 원문보다 좁고 첨자를 지운 글보다 넓다', () => {
    const ctx = ctx2d();
    ctx.font = makeFont(SIZE);
    const raw = ctx.measureText('D_1').width;      // 밑줄까지 센 폭
    const stripped = ctx.measureText('D').width;   // 첨자를 아예 지운 폭
    const rich = richWidth(ctx, 'D_1', SIZE, makeFont);
    expect(rich).toBeLessThan(raw);
    expect(rich).toBeGreaterThan(stripped);
  });

  it('첨자 폭은 작은 글꼴로 잰 값이다', () => {
    const ctx = ctx2d();
    ctx.font = makeFont(SIZE);
    const base = ctx.measureText('P').width;
    ctx.font = makeFont(SIZE * SUB_SCALE);
    const sub = ctx.measureText('1').width;
    expect(richWidth(ctx, 'P_1', SIZE, makeFont)).toBeCloseTo(base + sub, 6);
  });
});

describe('그리는 쪽', () => {
  /** 그리는 동안 오간 (글꼴, 글, y) 를 적어 둔다 */
  function trace(text: string, align: CanvasTextAlign = 'left') {
    const ctx = ctx2d();
    const calls: { font: string; text: string; x: number; y: number }[] = [];
    const raw = ctx.fillText.bind(ctx);
    (ctx as unknown as Record<string, unknown>).fillText =
      (t: string, x: number, y: number) => {
        calls.push({ font: ctx.font, text: t, x, y });
        return raw(t, x, y);
      };
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    fillRich(ctx, text, 100, 50, SIZE, makeFont);
    return { calls, align: ctx.textAlign };
  }

  it('첨자 도막만 작은 글꼴로, 낮은 자리에 찍는다', () => {
    const { calls } = trace('D_1');
    expect(calls.map((c) => c.text)).toEqual(['D', '1']);
    expect(calls[0].font).toContain(`${SIZE}px`);
    expect(calls[1].font).toContain(`${SIZE * SUB_SCALE}px`);
    expect(calls[1].y).toBeGreaterThan(calls[0].y);
    expect(calls[1].x).toBeGreaterThan(calls[0].x);
  });

  it('첨자가 없으면 한 번에 찍는다', () => {
    const { calls } = trace('수요');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ text: '수요', x: 100, y: 50 });
  });

  it('정렬 값을 지키고, 그리고 나서 되돌려 놓는다', () => {
    const { calls, align } = trace('D_1', 'right');
    // 오른쪽 맞춤이면 합친 폭만큼 왼쪽에서 시작한다
    expect(calls[0].x).toBeLessThan(100);
    expect(align).toBe('right');
  });
});
