// © 2026 김용현
// 숫자 높이 맞추기는 그리는 차례와 무관해야 한다.
//
// 2.1.0 까지는 숫자 높이를 «괄호 가르는 감싼 ctx»(parens.ts textCtx)로 재기도 했다.
// 감싼 ctx 는 숫자 자리 글꼴을 이미 키운 크기로 재므로, 처음 잰 그림이 무엇이냐에 따라
// 잰 비율이 달라지고(키운 크기로 잰 0.758 이 캐시에 남으면 그 뒤로 숫자를 키우지 않는다)
// 같은 그림이 «혼자 그릴 때» 와 «다른 그림 뒤에 그릴 때» 숫자 크기가 달랐다(경제 좌표평면).
import { describe, it, expect, vi } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';

type Mods = {
  REGISTRY: Record<string, { render: (...a: unknown[]) => void; createDefaultData: () => unknown }>;
  createDefaultGraphOptions: (s?: 'exam' | 'classic') => Record<string, unknown>;
};

/** 모듈 캐시를 비우고 새로 읽는다 — 잰 값 캐시·잴 ctx 가 처음 상태다 */
async function fresh(): Promise<Mods> {
  vi.resetModules();
  const reg = await import('../../src/registry');
  const core = await import('../../src/core/index');
  return { REGISTRY: reg.REGISTRY as unknown as Mods['REGISTRY'], createDefaultGraphOptions: core.createDefaultGraphOptions as unknown as Mods['createDefaultGraphOptions'] };
}

/** 한 그림을 그리며 글자를 찍을 때의 글꼴 문자열을 모은다 */
function fontsOf(m: Mods, type: string): string[] {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const seen: string[] = [];
  const fill = ctx.fillText.bind(ctx);
  (ctx as unknown as Record<string, unknown>).fillText = (s: string, x: number, y: number, mw?: number) => {
    seen.push(`${ctx.font}|${s}`);
    if (mw === undefined) fill(s, x, y); else fill(s, x, y, mw);
  };
  const e = m.REGISTRY[type];
  const opts = { ...m.createDefaultGraphOptions('exam'), style: 'exam' };
  e.render(ctx, 800, 600, e.createDefaultData(), opts);
  return seen;
}

describe('숫자 크기는 그리는 차례와 무관하다 (exam)', () => {
  it('경제 좌표평면 — 꺾은선 뒤에 그려도, 혼자 처음 그려도 글꼴이 같다', async () => {
    const after = await fresh();
    fontsOf(after, 'line');
    const b1 = fontsOf(after, 'econ-plane');
    const alone = await fresh();
    const b2 = fontsOf(alone, 'econ-plane');
    expect(b2).toEqual(b1);
  });

  it('모든 종류 — 혼자 처음 그린 것과 다른 종류를 다 그린 뒤 그린 것이 같다', async () => {
    const types = Object.keys((await fresh()).REGISTRY);
    const warm = await fresh();
    for (const t of types) fontsOf(warm, t);
    const later = Object.fromEntries(types.map((t) => [t, fontsOf(warm, t)]));
    for (const t of types) {
      const first = fontsOf(await fresh(), t);
      expect(first, t).toEqual(later[t]);
    }
  });
});
