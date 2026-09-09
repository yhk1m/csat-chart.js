// © 2026 김용현
// 글꼴 자리 갈아 끼우기(fontStack) — 두 자리가 **모든** 글자에 닿는지 본다.
//
// 1.2.0 까지는 제목·출처·각주·범례가 글꼴을 상수로 박아 두고 `options` 를 아예
// 보지 않았다. 그래서 자기 글꼴을 준 사람은 축만 그 글꼴이고 제목은 Noto Sans 인
// 그림을 받았다. 그 결함이 돌아오지 않게, 렌더러 16종을 전부 돌려 «Noto 라는
// 글자가 한 번도 `ctx.font` 에 실리지 않는다» 를 지킨다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { CsatChart } from '../../src/chart';
import { REGISTRY } from '../../src/registry';
import { CHART_TYPES } from '../../src/registry';
import {
  DEFAULT_SANS_STACK,
  DEFAULT_SERIF_STACK,
  createDefaultGraphOptions,
  fontStackOf,
  getFont,
  sansFont,
} from '../../src/core/index';
import { measureLegendWidth } from '../../src/core/canvas/legend';
import { CASES, type Renderer } from './fixtures';

const W = 800;
const H = 600;

/** 눈에 띄는 표시를 단 글꼴 — 그려진 글꼴 문자열에서 찾기 쉽다 */
const SERIF_MARK = "'테스트명조', serif";
const SANS_MARK = "'테스트고딕', sans-serif";

/**
 * 그리는 동안 `ctx.font` 에 실린 값을 전부 적어 둔다.
 *
 * 픽셀을 비교하는 방법으로는 못 본다 — 없는 글꼴은 대체 글꼴로 그려져 두 판이
 * 같은 그림이 나오기 때문이다. 실제로 요청한 글꼴 문자열을 봐야 한다.
 */
function recordFonts(ctx: CanvasRenderingContext2D): string[] {
  const seen: string[] = [];
  const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), 'font');
  if (!desc?.get || !desc?.set) throw new Error('이 캔버스 구현에는 font 접근자가 없습니다');
  Object.defineProperty(ctx, 'font', {
    configurable: true,
    get: () => desc.get!.call(ctx),
    set: (v: string) => {
      seen.push(String(v));
      desc.set!.call(ctx, v);
    },
  });
  return seen;
}

function renderWith(fn: Renderer, data: unknown, patch: Record<string, unknown>) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const fonts = recordFonts(ctx);
  // 제목·출처·각주·범례가 **실제로 그려지도록** 글을 채워 넣는다. 비워 두면
  // drawTitle 이 첫 줄에서 돌아 나가 검사가 아무것도 보지 못한다.
  fn(ctx, W, H, data as never, {
    ...createDefaultGraphOptions(),
    title: '제목',
    source: '(출처)',
    footnotes: ['각주'],
    ...patch,
  });
  return fonts;
}

describe('글꼴 자리 풀기', () => {
  it('적지 않은 자리는 기본 글꼴 그대로다', () => {
    const o = createDefaultGraphOptions();
    expect(fontStackOf(o, 'serif')).toBe(DEFAULT_SERIF_STACK);
    expect(fontStackOf(o, 'sans')).toBe(DEFAULT_SANS_STACK);
    expect(sansFont(o)).toBe(DEFAULT_SANS_STACK);
    // fontStack 자체가 없는 옵션(직접 만든 객체)도 같아야 한다
    expect(fontStackOf({}, 'serif')).toBe(DEFAULT_SERIF_STACK);
    expect(fontStackOf({}, 'sans')).toBe(DEFAULT_SANS_STACK);
  });

  it('한 자리만 주면 나머지 자리는 기본값을 지킨다', () => {
    const serifOnly = { fontStack: { serif: SERIF_MARK } };
    expect(fontStackOf(serifOnly, 'serif')).toBe(SERIF_MARK);
    expect(fontStackOf(serifOnly, 'sans')).toBe(DEFAULT_SANS_STACK);

    const sansOnly = { fontStack: { sans: SANS_MARK } };
    expect(fontStackOf(sansOnly, 'serif')).toBe(DEFAULT_SERIF_STACK);
    expect(fontStackOf(sansOnly, 'sans')).toBe(SANS_MARK);
  });

  it('빈 문자열은 «적지 않은 것»으로 본다', () => {
    expect(fontStackOf({ fontStack: { serif: '' } }, 'serif')).toBe(DEFAULT_SERIF_STACK);
    expect(fontStackOf({ fontStack: { sans: '' } }, 'sans')).toBe(DEFAULT_SANS_STACK);
  });

  it('customFont 은 예전 그대로다 — fontStack 이 건드리지 않는다', () => {
    const o = { fontFamily: 'custom' as const, customFont: "'내글꼴', serif", fontStack: { serif: SERIF_MARK } };
    expect(getFont(20, o, 'bold')).toBe("bold 20px '내글꼴', serif");
    // customFont 이 비면 예전과 같은 대체 글꼴로 돌아간다
    expect(getFont(20, { fontFamily: 'custom', customFont: '' }, 'bold'))
      .toBe("bold 20px 'Noto Serif KR', serif");
  });

  it('getFont 은 fontFamily 가 고른 자리를 쓰고, 자리를 눌러 지정할 수도 있다', () => {
    const o = { fontFamily: 'serif' as const, fontStack: { serif: SERIF_MARK, sans: SANS_MARK } };
    expect(getFont(26, o, 'bold')).toBe(`bold 26px ${SERIF_MARK}`);
    // 표에서 기호는 명조, 지명은 고딕으로 갈리는 자리
    expect(getFont(26, o, 'bold', 'sans')).toBe(`bold 26px ${SANS_MARK}`);
    expect(getFont(26, { ...o, fontFamily: 'sans' }, 'bold')).toBe(`bold 26px ${SANS_MARK}`);
  });

  it('범례 폭을 **재는** 쪽과 **그리는** 쪽이 같은 글꼴을 본다', () => {
    // 재는 쪽만 기본 글꼴로 남으면 상자 크기가 어긋나 이름이 상자를 넘는다.
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    const fonts = recordFonts(ctx);
    measureLegendWidth(ctx, ['서울특별시'], 20, { fontStack: { sans: SANS_MARK } });
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((f) => f.includes(SANS_MARK))).toBe(true);
  });
});

describe('fontStack 이 렌더러 16종에 닿는다', () => {
  it.each(CASES)('%s — 두 자리를 다 주면 Noto 가 한 번도 안 쓰인다', (_name, fn, makeData) => {
    const fonts = renderWith(fn, makeData(), {
      fontStack: { serif: SERIF_MARK, sans: SANS_MARK },
    });
    const leftover = fonts.filter((f) => f.includes('Noto'));
    expect(leftover, `아직 글꼴이 박혀 있는 자리: ${leftover.join(' / ')}`).toEqual([]);
  });

  it.each(CASES)('%s — 고딕 자리만 갈아도 명조 자리는 그대로다', (_name, fn, makeData) => {
    const fonts = renderWith(fn, makeData(), { fontStack: { sans: SANS_MARK } });
    expect(fonts.some((f) => f.includes(SANS_MARK)), '고딕 자리가 안 바뀌었다').toBe(true);
    expect(fonts.some((f) => f.includes(DEFAULT_SERIF_STACK)), '명조 자리가 함께 바뀌었다').toBe(true);
    expect(fonts.some((f) => f.includes(DEFAULT_SANS_STACK)), '기본 고딕이 남아 있다').toBe(false);
  });

  // 16종을 하나도 빠뜨리지 않았는지 — 케이스 목록이 아니라 레지스트리에서 센다
  it('CASES 가 16종을 모두 덮는다', () => {
    const covered = new Set(CASES.map(([, fn]) => fn as unknown));
    for (const type of CHART_TYPES) {
      expect(covered.has(REGISTRY[type].render as unknown), `${type} 가 빠졌다`).toBe(true);
    }
  });
});

describe('fontStack 은 update() 에서 살아남는다', () => {
  function chartFonts(patchSeq: Record<string, unknown>[]) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    const chart = new CsatChart(canvas as never, {
      type: 'scatter',
      data: REGISTRY.scatter.createDefaultData(),
      options: { title: '제목', source: '(출처)', footnotes: ['각주'] },
    });
    // 생성자가 이미 한 번 그렸다. 여기서부터 적는다.
    const fonts = recordFonts(ctx);
    for (const p of patchSeq) chart.update({ options: p });
    return fonts;
  }

  it('중첩 객체를 얕게 덮지 않는다 — 나중 갱신이 앞 자리를 지우지 않는다', () => {
    const fonts = chartFonts([
      { fontStack: { serif: SERIF_MARK } },
      { fontStack: { sans: SANS_MARK } },
    ]);
    // 마지막으로 그린 판에 두 자리가 다 살아 있어야 한다
    expect(fonts.some((f) => f.includes(SERIF_MARK))).toBe(true);
    expect(fonts.some((f) => f.includes(SANS_MARK))).toBe(true);
  });

  it('글꼴과 상관없는 갱신이 fontStack 을 떨어뜨리지 않는다', () => {
    const fonts = chartFonts([
      { fontStack: { serif: SERIF_MARK, sans: SANS_MARK } },
      { title: '다른 제목' },
    ]);
    expect(fonts.filter((f) => f.includes('Noto'))).toEqual([]);
  });

  it('한 자리를 undefined 로 주면 그 자리만 기본 글꼴로 돌아간다', () => {
    const fonts = chartFonts([
      { fontStack: { serif: SERIF_MARK, sans: SANS_MARK } },
      { fontStack: { sans: undefined } },
    ]);
    expect(fonts.some((f) => f.includes(SERIF_MARK))).toBe(true);
    expect(fonts.some((f) => f.includes(DEFAULT_SANS_STACK))).toBe(true);
  });
});
