// © 2026 김용현
// GeoTester v2 문항 그림 다섯 가지 결함의 회귀 시험 (2.2.1).
// 자료·크기·배율은 geotester-cases.ts — GeoTester 어댑터가 넘기는 그대로다.
// `npm run test:fallback` 에서도 돈다 — 시험지 글꼴이 없는 CI 처럼 넓은 대체 글꼴로 한 번 더.
import { describe, it, expect } from 'vitest';
import { inkLogged, overlaps, gapBetween, type Box, type InkLog } from './draw-log';
import { GEO_CASES, renderGeoCase, type GeoCase } from './geotester-cases';

const byName = (n: string) => GEO_CASES.find((c) => c.name === n)!;
const logOf = (c: GeoCase): InkLog => inkLogged((ctx) => renderGeoCase(ctx, c), c.width, c.height);
const inside = (b: Box, c: GeoCase) => b.left >= 0 && b.top >= 0 && b.right <= c.width && b.bottom <= c.height;
const run = (log: InkLog, s: string) => log.runs.find((r) => r.s === s);

/** 선분이 상자 안을 지나는가 (가로·세로 선분만) */
function crosses(seg: [number, number, number, number], b: Box): boolean {
  const [x1, y1, x2, y2] = seg;
  if (Math.abs(y1 - y2) < 0.01) {
    return y1 > b.top && y1 < b.bottom && Math.max(x1, x2) > b.left && Math.min(x1, x2) < b.right;
  }
  if (Math.abs(x1 - x2) < 0.01) {
    return x1 > b.left && x1 < b.right && Math.max(y1, y2) > b.top && Math.min(y1, y2) < b.bottom;
  }
  return false;
}
const covers = (outer: Box, inner: Box) =>
  outer.left <= inner.left && outer.right >= inner.right && outer.top <= inner.top && outer.bottom >= inner.bottom;

describe('GeoTester — 가로 100% 누적 막대 (w10_202709)', () => {
  it('긴 국가 이름이 왼쪽 여백에서 잘리지 않는다', () => {
    const c = byName('w10_202709');
    const log = logOf(c);
    for (const name of ['이집트', '이란', '노르웨이', '중국']) {
      const r = run(log, name);
      expect(r, name).toBeDefined();
      expect(inside(r!.box, c), `${name} ${JSON.stringify(r!.box)}`).toBe(true);
    }
    // 이름은 막대 틀 왼쪽 바깥에 머문다
    const frame = log.strokeRects.reduce((a, b) => (b.right - b.left > a.right - a.left ? b : a));
    for (const name of ['이집트', '노르웨이']) expect(run(log, name)!.box.right).toBeLessThanOrEqual(frame.left);
  });
});

describe.each(['k13', 'k13_axis39'])('GeoTester — 십자축 편차 산점도 (%s)', (name) => {
  const c = byName(name);
  const log = logOf(c);
  const ticks = log.runs.filter((r) => /^-?\d+(\.\d+)?$/.test(r.s) && r.s !== '0');

  it('눈금 숫자 위로 점선 격자가 지나지 않는다 (흰 바탕으로 비우거나 비켜 놓는다)', () => {
    expect(ticks.length).toBeGreaterThanOrEqual(10);
    for (const t of ticks) {
      const hit = log.dashed.some((s) => crosses(s, t.box));
      // 캔버스 전체를 지우는 흰 칠(clearCanvas)은 빼고 — 글자 자리만 비운 작은 흰 칠
      const cleared = log.whiteRects.some((w) => w.right - w.left < c.width / 4 && covers(w, t.box));
      expect(!hit || cleared, `${t.s} ${JSON.stringify(t.box)}`).toBe(true);
    }
  });

  it('y 단위 「(mm)」 가 맨 위 눈금 「30」 과 떨어져 있다', () => {
    const unit = run(log, '(mm)')!;
    const top = ticks.find((t) => t.s === '30')!;
    expect(unit).toBeDefined();
    expect(gapBetween(unit.box, top.box)).toBeGreaterThanOrEqual(2);
  });

  it('오른쪽 상자 축 이름이 캔버스 안에 있고 x 단위·마지막 눈금과 겹치지 않는다', () => {
    const unit = run(log, '(°C)')!;
    const last = ticks.find((t) => t.s === '1.5')!;
    expect(gapBetween(unit.box, last.box)).toBeGreaterThanOrEqual(2);
    // 오른쪽 상자 — 가장 오른쪽 테두리 사각형
    const box = log.strokeRects.reduce((a, b) => (b.right > a.right ? b : a));
    expect(box.right).toBeLessThanOrEqual(c.width);
    expect(gapBetween(box, unit.box)).toBeGreaterThanOrEqual(4);
    for (const r of log.runs) expect(inside(r.box, c), `${r.s} ${JSON.stringify(r.box)}`).toBe(true);
    // 상자 안 글자가 상자를 넘지 않는다
    for (const s of ['시기', '평균', '기온', '차이']) {
      const t = run(log, s)!;
      expect(covers(box, t.box), s).toBe(true);
    }
  });
});

describe('GeoTester — 점 이름이 서로 겹치지 않는다 (w18)', () => {
  it('(가)~(라) 네 이름이 서로 겹치지 않는다', () => {
    const log = logOf(byName('w18'));
    const labels = ['(가)', '(나)', '(다)', '(라)'].map((s) => {
      const r = run(log, s);
      expect(r, s).toBeDefined();
      return r!;
    });
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      expect(overlaps(labels[i].box, labels[j].box), `${labels[i].s} ↔ ${labels[j].s}`).toBe(false);
    }
  });
});

describe.each(['w6_202709_ga', 'w6_202709_na', 'w6_202709_da'])('GeoTester — 순위 트리맵 (%s)', (name) => {
  it('좁은 칸도 이름을 버리지 않는다 — 1위~5위·기타가 모두 찍힌다', () => {
    const log = logOf(byName(name));
    // 숫자·한글은 조각으로 따로 찍힌다 — 이어 붙여 본다
    const all = log.texts.map((t) => t.s).join('');
    for (const s of ['1위', '2위', '3위', '4위', '5위', '기타']) expect(all, s).toContain(s);
  });
});

describe('GeoTester — 묶은 막대 범주 이름과 아래 범례 (w10_202211)', () => {
  it('범주 이름 줄과 범례 상자 사이가 4px 이상 떨어진다', () => {
    const c = byName('w10_202211');
    const log = logOf(c);
    const legend = log.strokeRects.find((r) => r.right - r.left > c.width * 0.5 && r.bottom - r.top < c.height * 0.3)!;
    expect(legend).toBeDefined();
    for (const s of ['석유', '천연가스']) {
      const r = run(log, s)!;
      expect(r, s).toBeDefined();
      expect(legend.top - r.box.bottom, s).toBeGreaterThanOrEqual(4);
    }
  });
});
