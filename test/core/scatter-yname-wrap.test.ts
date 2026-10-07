// © 2026 김용현
// 산점도 세로 축 이름은 낱말 경계(공백)에서 접는다.
//
// 「1인당 지역내총생산」 의 「지역내총생산」 이 접을 폭보다 조금 넓으면 예전에는 곧장 글자 단위로
// 잘라 「지역내총생 / 산」 이 됐다. 낱말이 넘치면 먼저 글자를 줄여(바닥 MIN_SCALE) 낱말째 담고,
// 줄여도 안 들어가는 낱말만 글자 단위로 자른다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { renderScatterGraph, createDefaultScatterData, createDefaultGraphOptions } from '../../src/core/index';

function drawnTexts(yLabel: string, w = 800, h = 600): string[] {
  const d = createDefaultScatterData();
  d.xLabel = '인구밀도'; d.xUnit = '(명/km²)';
  d.yLabel = yLabel; d.yUnit = '(백만 원)';
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const seen: string[] = [];
  const fill = ctx.fillText.bind(ctx);
  (ctx as unknown as Record<string, unknown>).fillText = (s: string, x: number, y: number, mw?: number) => {
    seen.push(String(s));
    if (mw === undefined) fill(s, x, y); else fill(s, x, y, mw);
  };
  renderScatterGraph(ctx, w, h, d, { ...createDefaultGraphOptions('exam'), style: 'exam', title: '시·도별 인구밀도와 1인당 지역내총생산' });
  return seen;
}

describe('산점도 세로 축 이름 접기 (exam)', () => {
  it('「1인당 지역내총생산」 — 「지역내총생산」 을 가르지 않는다', () => {
    const t = drawnTexts('1인당 지역내총생산');
    expect(t).toContain('지역내총생산');
    expect(t).not.toContain('지역내총생');
  });

  it('줄여도 안 들어가는 한 낱말만 글자 단위로 자른다', () => {
    const t = drawnTexts('가나다라마바사아자차카타파하가나다라마바사아자차카타파하');
    expect(t.some((s) => /^[가-힣]+$/.test(s) && s.length < 28 && s.length > 0)).toBe(true);
  });
});
