// © 2026 김용현
// 산점도 버블 범례 상자는 버블·점을 덮지 않는다 (exam). 플롯 안에 빈 모서리가 없으면 오른쪽 바깥으로.
import { describe, it, expect } from 'vitest';
import { renderScatterGraph, createDefaultScatterData, createDefaultGraphOptions } from '../../src/core/index';
import { drawLogged, overlaps } from './draw-log';

/** 데모 표본 — 축 이름이 길어 플롯이 좁고, 어느 모서리든 버블에 걸린다 */
function demo() {
  const d = createDefaultScatterData();
  d.xLabel = '인구밀도'; d.xUnit = '(명/km²)';
  d.yLabel = '1인당 지역내총생산'; d.yUnit = '(백만 원)';
  return d;
}

function check(style: 'exam' | 'classic', make: typeof demo) {
  const log = drawLogged((ctx) => renderScatterGraph(ctx, 800, 600, make(), {
    ...createDefaultGraphOptions(style), style,
    title: '시·도별 인구밀도와 1인당 지역내총생산', source: '통계청, 2023',
  }));
  const boxes = log.strokeRects.filter((b) => b.right - b.left > 40 && b.bottom - b.top > 40 && b.right - b.left < 400);
  expect(boxes.length).toBeGreaterThan(0);
  // 범례 상자보다 먼저 그린 호 = 자료 버블·점 (상자 뒤에 그린 것은 견본)
  const covered = log.arcs.filter((a) => boxes.some((b) => a.seq < b.seq && overlaps(a, b)));
  return covered;
}

describe('산점도 버블 범례 (exam)', () => {
  it('데모 표본 — 범례 상자가 버블·점을 덮지 않는다', () => {
    expect(check('exam', demo)).toEqual([]);
  });
  it('기본 자료 — 범례 상자가 버블·점을 덮지 않는다', () => {
    expect(check('exam', createDefaultScatterData)).toEqual([]);
  });
});
