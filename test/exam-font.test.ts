// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { examFont, examFontFamily } from '../src/index';
import { EXAM_SERIF_STACK, EXAM_SANS_STACK, EXAM_NUMERAL_STACK } from '../src/core/index';

describe('examFont — 그래프 밖에서 쓰는 시험지 글꼴', () => {
  it('명조 자리는 숫자 세리프 뒤에 시험지 명조가 온다', () => {
    expect(examFontFamily('serif')).toBe(`${EXAM_NUMERAL_STACK}, ${EXAM_SERIF_STACK}`);
    expect(examFontFamily()).toBe(examFontFamily('serif'));
  });

  it('고딕 자리는 숫자 세리프 뒤에 시험지 고딕이 온다', () => {
    expect(examFontFamily('sans')).toBe(`${EXAM_NUMERAL_STACK}, ${EXAM_SANS_STACK}`);
  });

  it('신명조·HY신명조가 Noto 보다 앞선다', () => {
    const f = examFontFamily('serif');
    expect(f.indexOf('HY신명조')).toBeGreaterThan(-1);
    expect(f.indexOf('HY신명조')).toBeLessThan(f.indexOf('Noto Serif KR'));
  });

  it('캔버스 font 한 줄을 만든다', () => {
    expect(examFont(20, 'serif', 'bold')).toBe(`bold 20px ${examFontFamily('serif')}`);
    expect(examFont(12)).toBe(`normal 12px ${examFontFamily('serif')}`);
  });

  it.each([0, -3, Number.NaN, Infinity])('크기 %s 는 던진다', (px) => {
    expect(() => examFont(px)).toThrow(RangeError);
  });
});
