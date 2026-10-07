// © 2026 김용현
// labelPlacement:'rightLeader' — 계열 이름을 플롯 오른쪽 바깥 한 열에, 선 끝 점에서 유도선으로 잇는다.
import { describe, it, expect } from 'vitest';
import { renderLineGraph, createDefaultLineData, createDefaultGraphOptions, type LineGraphData } from '../../src/core/index';
import { drawLogged, overlaps } from './draw-log';

/** 2026_11 wgeo q10 꼴 — (나)(다)(라) 의 끝이 몰려 있다 */
function data(): LineGraphData {
  const d = createDefaultLineData();
  d.xLabels = ['1970', '1980', '1990', '2000', '2010', '2020'];
  d.xUnit = '(년)';
  d.yRange = { min: 0, max: 14, auto: false, step: 2 };
  d.series = [
    { label: '(가)', values: [4.4, 5.6, 7.5, 9.3, 11.1, 13.1] },
    { label: '(나)', values: [4.2, 4.2, 3.9, 3.3, 3.1, 2.8] },
    { label: '(다)', values: [2.2, 2.1, 2.1, 2.0, 1.9, 1.9] },
    { label: '(라)', values: [0.3, 0.35, 0.5, 0.7, 0.9, 1.2] },
  ];
  d.labelPlacement = 'rightLeader';
  return d;
}

describe.each(['exam', 'classic'] as const)('rightLeader — %s', (style) => {
  const log = drawLogged((ctx) => renderLineGraph(ctx, 800, 600, data(), { ...createDefaultGraphOptions(style), style }));
  // exam 은 괄호를 따로 찍는다 — 이름 상자 = 괄호·글자 조각을 합친 상자
  const pieceOf = (n: string) => {
    const whole = log.texts.find((t) => t.s === n);
    if (whole) return whole;
    const at = log.texts.findIndex((t) => t.s === n || t.s === n[1] || t.s.includes(n[1]));
    if (at < 0) return undefined;
    const parts = log.texts.slice(Math.max(0, at - 1), at + 2).filter((t) => /[()]/.test(t.s) || t.s.includes(n[1]));
    const b = parts.map((p) => p.box);
    return { s: n, box: { left: Math.min(...b.map((x) => x.left)), right: Math.max(...b.map((x) => x.right)), top: Math.min(...b.map((x) => x.top)), bottom: Math.max(...b.map((x) => x.bottom)) } };
  };
  const names = ['(가)', '(나)', '(다)', '(라)'].map((n) => pieceOf(n)!);

  it('이름이 모두 그려진다', () => {
    expect(names.every(Boolean)).toBe(true);
  });

  it('이름은 한 열 — 왼쪽 끝이 같다', () => {
    const lefts = names.map((t) => Math.round(t.box.left));
    expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1);
  });

  it('선 끝의 위아래 차례를 지키고 서로 겹치지 않는다', () => {
    for (let i = 1; i < names.length; i++) {
      expect(names[i].box.top).toBeGreaterThan(names[i - 1].box.top);
      expect(overlaps(names[i].box, names[i - 1].box)).toBe(false);
    }
  });

  it('이름마다 왼쪽에서 들어오는 유도선이 있다', () => {
    for (const t of names) {
      const cy = (t.box.top + t.box.bottom) / 2;
      const hit = log.segs.some(([x1, y1, x2, y2]) => {
        const [rx, ry] = x2 >= x1 ? [x2, y2] : [x1, y1];
        const [lx] = x2 >= x1 ? [x1, y1] : [x2, y2];
        return rx <= t.box.left && rx >= t.box.left - 20 && Math.abs(ry - cy) < 3 && rx - lx > 8;
      });
      expect(hit, t.s).toBe(true);
    }
  });
});
