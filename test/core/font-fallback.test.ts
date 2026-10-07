// © 2026 김용현
// 한 글줄 안에서 글꼴이 글자마다 넘어가는가 — 시험지의 «세리프 괄호 + 고딕 한글».
//
// 두 글꼴이 깔린 기계에서만 뜻이 있다(CI 우분투에는 없다) — 없으면 건너뛴다.
import { describe, it, expect } from 'vitest';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import { textFont, createDefaultGraphOptions } from '../../src/core/index';
import { EXAM_NUMERAL_STACK } from '../../src/core/canvas/style';

const has = (f: string) => GlobalFonts.families.some((x) => x.family === f);
const NUM = EXAM_NUMERAL_STACK.split(',')[0].trim().replace(/'/g, '');
const ready = has(NUM) && has('HYGothic-Medium');

describe.runIf(ready)('한 글줄 안 글꼴 섞임 (@napi-rs/canvas)', () => {
  const ctx = createCanvas(10, 10).getContext('2d');
  const width = (font: string, s: string) => {
    ctx.font = font;
    return ctx.measureText(s).width;
  };

  it('괄호는 숫자 글꼴, 한글은 다음 글꼴에서 가져온다', () => {
    const mixed = width(`30px '${NUM}', 'HYGothic-Medium'`, '(통계청)');
    const parts = width(`30px '${NUM}'`, '()') + width(`30px 'HYGothic-Medium'`, '통계청');
    expect(mixed).toBeCloseTo(parts, 0);
    expect(Math.abs(mixed - width(`30px 'HYGothic-Medium'`, '(통계청)'))).toBeGreaterThan(1);
  });

  it('exam 의 출처 글꼴 문자열이 그렇게 섞인다', () => {
    // 작업 16 에서 createDefaultGraphOptions('exam') 으로 바꾼다
    const o = { ...createDefaultGraphOptions(), style: 'exam' as const };
    const mixed = width(textFont(o, 'source', 30), '(통계청)');
    const parts = width(`30px '${NUM}'`, '()') + width(`30px 'HYGothic-Medium'`, '통계청');
    expect(mixed).toBeCloseTo(parts, 0);
  });
});
