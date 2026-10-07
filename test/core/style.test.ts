// © 2026 김용현
// 양식 토큰 — classic 은 1.7.0 의 글꼴 문자열을 한 글자도 다르지 않게 내야 한다.
import { describe, it, expect } from 'vitest';
import {
  classicStyle, examStyle, styleOf, byStyle, tickDirOf, labelPlace, type TextPlace,
} from '../../src/core/canvas/style';
import { getFont, sansFont, textFont, textSize } from '../../src/core/canvas/renderer';
import { createDefaultGraphOptions } from '../../src/core/index';

const AXIS_PLACES: TextPlace[] = ['tick', 'unit', 'axisName', 'axisNameV', 'category', 'region', 'symbol', 'value'];
const SANS_PLACES: TextPlace[] = ['legend', 'title', 'source', 'year'];

describe('styleOf', () => {
  it('이름대로 고른다', () => {
    expect(styleOf({ style: 'classic' })).toBe(classicStyle);
    expect(styleOf({ style: 'exam' })).toBe(examStyle);
  });

  it('모르는 이름은 기본 양식으로 본다', () => {
    expect(styleOf({ style: 'zzz' as never })).toBe(styleOf({}));
  });
});

describe('classic 글꼴은 1.7.0 과 같다', () => {
  for (const fontFamily of ['serif', 'sans'] as const) {
    it.each(AXIS_PLACES)(`축 쪽 자리 %s (fontFamily ${fontFamily}) = getFont(…, 'bold')`, (place) => {
      const o = { ...createDefaultGraphOptions(), style: 'classic' as const, fontFamily };
      expect(textFont(o, place, 26)).toBe(getFont(26, o, 'bold'));
    });
  }

  it.each(SANS_PLACES)('고딕 자리 %s = bold + sansFont', (place) => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const };
    expect(textFont(o, place, 20)).toBe(`bold 20px ${sansFont(o)}`);
  });

  it('각주는 보통 굵기 고딕', () => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const };
    expect(textFont(o, 'footnote', 18)).toBe(`normal 18px ${sansFont(o)}`);
  });

  it('legacy 굵기·자리를 그대로 따른다', () => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const };
    expect(textFont(o, 'tick', 20, { weight: 'normal' })).toBe(getFont(20, o, 'normal'));
    expect(textFont(o, 'region', 20, { role: 'sans' })).toBe(getFont(20, o, 'bold', 'sans'));
  });

  it('custom 은 customFont 로 간다', () => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const, fontFamily: 'custom' as const, customFont: "'내글꼴'" };
    expect(textFont(o, 'tick', 20)).toBe("bold 20px '내글꼴'");
  });

  it('textSize 는 받은 1.7.0 식 값을 그대로 돌려준다', () => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const };
    expect(textSize(o, 'legend', 23.7)).toBe(23.7);
    expect(textSize(o, 'footnote', 19.8)).toBe(19.8);
  });
});

describe('exam 글꼴', () => {
  const o = { ...createDefaultGraphOptions(), style: 'exam' as const };

  it('굵은 글자가 없다', () => {
    for (const place of [...AXIS_PLACES, ...SANS_PLACES, 'footnote' as const]) {
      expect(textFont(o, place, 30).startsWith('normal ')).toBe(true);
    }
  });

  it('legacy 를 읽지 않는다', () => {
    expect(textFont(o, 'tick', 30, { weight: 'bold', role: 'sans' })).toBe(textFont(o, 'tick', 30));
  });

  it('지명·단위·범례·출처·각주는 고딕, 항목 이름은 명조', () => {
    expect(textFont(o, 'region', 30)).toContain(sansFont(o));
    expect(textFont(o, 'unit', 30)).toContain(sansFont(o));
    expect(textFont(o, 'legend', 30)).toContain(sansFont(o));
    expect(textFont(o, 'category', 30)).toBe(getFont(30, o, 'normal', 'serif'));
  });

  it('fontFamily 를 고르면 축 쪽 자리가 그 자리를 따른다', () => {
    const custom = { ...o, fontFamily: 'custom' as const, customFont: "'내글꼴'" };
    expect(textFont(custom, 'tick', 30)).toBe("normal 30px '내글꼴'");
    expect(textFont(custom, 'legend', 30)).toContain(sansFont(custom));
  });

  it('크기는 자리 규칙 — 단위·범례·출처는 눈금 크기, 항목 이름은 ×1.37', () => {
    const fs = { title: 40, axisLabel: 39, tick: 35, dataLabel: 40 };
    const e = { ...o, fontSize: fs };
    expect(textSize(e, 'unit', 999)).toBe(35);
    expect(textSize(e, 'legend', 999)).toBe(35);
    expect(textSize(e, 'source', 999)).toBe(35);
    expect(textSize(e, 'category', 999)).toBeCloseTo(47.95, 2);
    expect(textSize(e, 'region', 999)).toBe(39);
    expect(textSize(e, 'footnote', 999)).toBeCloseTo(33.95, 2);
    // 식을 따르는 자리 — 1.7.0 식에 exam fontSize 가 들어간 값 그대로
    expect(textSize(e, 'value', 32)).toBe(32);
  });
});

describe('labelPlace', () => {
  it('괄호 기호는 항목, 한글은 지명, 나머지는 기호', () => {
    expect(labelPlace('(가)')).toBe('category');
    expect(labelPlace('전국')).toBe('region');
    expect(labelPlace('S_1')).toBe('symbol');
    expect(labelPlace('A')).toBe('symbol');
  });
});

describe('byStyle·tickDirOf', () => {
  it('byStyle 은 양식 이름으로 표를 고른다', () => {
    const table = { classic: 1, exam: 2 };
    expect(byStyle({ style: 'classic' }, table)).toBe(1);
    expect(byStyle({ style: 'exam' }, table)).toBe(2);
  });

  it('classic 은 늘 바깥', () => {
    expect(tickDirOf({ style: 'classic' }, { x: 'in', y: 'none' })).toEqual({ x: 'out', y: 'out' });
  });

  it('exam 은 종류 기본값', () => {
    expect(tickDirOf({ style: 'exam' }, { x: 'in', y: 'none' })).toEqual({ x: 'in', y: 'none' });
  });

  it('tickDirection 을 주면 양식과 상관없이 두 축 모두 그쪽', () => {
    expect(tickDirOf({ style: 'exam', tickDirection: 'out' }, { x: 'in', y: 'none' })).toEqual({ x: 'out', y: 'out' });
    expect(tickDirOf({ style: 'classic', tickDirection: 'in' }, { x: 'out', y: 'out' })).toEqual({ x: 'in', y: 'in' });
  });
});
