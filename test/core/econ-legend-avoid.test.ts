// © 2026 김용현
// 경제 좌표평면 범례 상자는 곡선·점·이름·유도선을 덮지 않는다 (exam).
import { describe, it, expect } from 'vitest';
import { renderEconPlane, createDefaultGraphOptions, type EconPlaneData } from '../../src/core/index';
import { segmentHitsBox } from '../../src/core/canvas/avoid';
import { drawLogged, overlaps, shrink, type DrawLog, type Box } from './draw-log';

const gdp = (legend: EconPlaneData['legend'] = 'bottom-right'): EconPlaneData => ({
  quadrants: 'first',
  xAxis: { label: '연도', min: 0, max: 4.5, ticks: [1, 2, 3], tickLabels: ['t년', 't+1년', 't+2년'], broken: true },
  yAxis: { label: 'GDP\n(억 달러)', min: 0, max: 10, ticks: [], broken: true },
  grid: false, dash: 'dashed', lines: [], points: [], arrows: [],
  series: [
    { label: '명목 GDP', points: [{ x: 1, y: 7.2 }, { x: 2, y: 6.2 }, { x: 3, y: 3.2 }], dashed: true, marker: 'circle', hollow: false },
    { label: '실질 GDP', points: [{ x: 1, y: 3.5 }, { x: 2, y: 6.2 }, { x: 3, y: 8.8 }], dashed: false, marker: 'square', hollow: true },
  ],
  legend, seriesGuides: true,
});

/** 오른쪽 위가 비는 자료 — 계열이 왼쪽 아래에만 있다 */
const lowLeft = (): EconPlaneData => ({
  ...gdp('top-right'),
  xAxis: { label: '연도', min: 0, max: 10, ticks: [1, 2, 3], broken: false },
  series: [
    { label: '명목 GDP', points: [{ x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 1.5 }], dashed: true, marker: 'circle', hollow: false },
    { label: '실질 GDP', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2.5 }], dashed: false, marker: 'square', hollow: true },
  ],
});

function draw(data: EconPlaneData, style: 'exam' | 'classic' = 'exam', legendPosition?: 'bottom' | 'right'): DrawLog {
  return drawLogged((ctx) => renderEconPlane(ctx, 800, 600, data, { ...createDefaultGraphOptions(style), style, legendPosition }));
}

/** 범례 상자 — strokeRect 가운데 가장 큰 것 (나머지는 견본 네모) */
function legendBox(log: DrawLog): Box {
  const area = (b: Box) => (b.right - b.left) * (b.bottom - b.top);
  return [...log.strokeRects].sort((a, b) => area(b) - area(a))[0];
}

/** 상자 안쪽에 범례 자신이 아닌 그림이 있는가 */
function covered(log: DrawLog, box: Box): string[] {
  const inner = shrink(box, 1);
  const legendTexts = ['명목 GDP', '실질 GDP', '명목', '실질', 'GDP', ' '];
  const hits: string[] = [];
  for (const t of log.texts) if (!legendTexts.includes(t.s.trim()) && t.s.trim() && overlaps(inner, t.box)) hits.push(`글자 ${t.s}`);
  for (const a of log.arcs) if (overlaps(inner, a) && !(a.left >= box.left && a.right <= box.right && a.top >= box.top && a.bottom <= box.bottom)) hits.push('기호');
  for (const [x1, y1, x2, y2] of log.segs) {
    const insideBox = [x1, x2].every((x) => x >= box.left && x <= box.right) && [y1, y2].every((y) => y >= box.top && y <= box.bottom);
    if (!insideBox && segmentHitsBox(x1, y1, x2, y2, inner)) hits.push(`선 ${[x1, y1, x2, y2].map(Math.round)}`);
  }
  return hits;
}

describe('경제 좌표평면 범례 자리 (exam)', () => {
  it('빈 모서리가 없으면 플롯 아래로 나가 아무것도 덮지 않는다 (명목·실질 GDP)', () => {
    const log = draw(gdp());
    const box = legendBox(log);
    expect(covered(log, box)).toEqual([]);
    // 가로축 숫자(t+2년)보다 아래
    const tick = log.texts.find((t) => t.s.includes('t+2'))!;
    expect(box.top).toBeGreaterThan(tick.box.bottom);
  });

  it('비는 모서리가 있으면 플롯 안 그 모서리에 둔다', () => {
    const log = draw(lowLeft());
    const box = legendBox(log);
    expect(covered(log, box)).toEqual([]);
    const tick = log.texts.find((t) => t.s === '1')!;
    expect(box.bottom).toBeLessThan(tick.box.top);
    expect(box.top).toBeLessThan(300);
  });

  it("legendPosition: 'right' 면 플롯을 좁혀 오른쪽 위에 두고 아무것도 덮지 않는다", () => {
    const below = draw(gdp());
    const log = draw(gdp(), 'exam', 'right');
    const box = legendBox(log);
    expect(covered(log, box)).toEqual([]);
    // 가로축 끝 눈금(t+2년)보다 오른쪽, 그 글자보다 위
    const tick = log.texts.find((t) => t.s.includes('t+2'))!;
    expect(box.left).toBeGreaterThan(tick.box.right);
    expect(box.bottom).toBeLessThan(tick.box.top);
    // 캔버스 안
    expect(box.right).toBeLessThanOrEqual(800);
    // 아래로 나간 경우보다 높이 앉는다 (플롯 위쪽에 맞춘다)
    expect(box.top).toBeLessThan(legendBox(below).top - 200);
    // 축 화살촉·가로축 이름과도 겹치지 않는다
    const xName = log.texts.find((t) => t.s === '연도')!;
    expect(overlaps(box, xName.box)).toBe(false);
  });

  it("legendPosition: 'bottom' 은 적지 않은 것과 같다", () => {
    const a = draw(gdp());
    const b = draw(gdp(), 'exam', 'bottom');
    expect(legendBox(b)).toEqual(legendBox(a));
  });

  it('비는 모서리가 있으면 legendPosition 은 읽히지 않는다', () => {
    const a = draw(lowLeft());
    const b = draw(lowLeft(), 'exam', 'right');
    expect(legendBox(b)).toEqual(legendBox(a));
  });
});
