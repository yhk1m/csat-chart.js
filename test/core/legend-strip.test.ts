// © 2026 김용현
// 2.4.0 범례 띠 — 그래프 여러 장 아래에 한 번만 다는 범례 상자와 각주.
import { describe, it, expect } from 'vitest';
import { renderLegendStrip, createDefaultGraphOptions } from '../../src/core/index';
import { drawLogged } from './draw-log';

describe('renderLegendStrip', () => {
  const draw = (w: number) => {
    const o = createDefaultGraphOptions('exam');
    o.footnotes = ['월평균 기온 차이 = 각 지역 값 − 세 지역 평균', '월 강수량 차이 = 각 지역 값 − 세 지역 평균'];
    return drawLogged((ctx) => renderLegendStrip(ctx, w, 200, {
      items: [
        { type: 'circle', label: '월평균 기온 차이' },
        { type: 'rect', label: '월 강수량 차이' },
      ],
    }, o), w, 200);
  };

  it('항목 둘과 각주 둘을 적는다', () => {
    const s = draw(1800).texts.map((t) => t.s).join('|');
    expect(s).toContain('월평균 기온 차이');
    expect(s).toContain('월 강수량 차이');
    expect(s).toContain('세 지역 평균');
  });

  it('넓은 띠에서는 두 항목을 한 줄(같은 높이)에 놓는다', () => {
    const t = draw(1800).texts;
    const a = t.find((x) => x.s === '월평균 기온 차이');
    const b = t.find((x) => x.s === '월 강수량 차이');
    expect(a && b).toBeTruthy();
    expect(Math.abs(a!.box.top - b!.box.top)).toBeLessThan(2);
    expect(b!.box.left).toBeGreaterThan(a!.box.right);
    // 상자는 가운데 — 첫 항목이 띠 왼쪽 1/4 보다 오른쪽에서 시작한다
    expect(a!.box.left).toBeGreaterThan(1800 / 4);
  });
});
