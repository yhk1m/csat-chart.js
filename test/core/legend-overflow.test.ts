// © 2026 김용현
// 범례가 캔버스 밖으로 나가는지 — 그리기 호출을 직접 기록해서 본다.
//
// 가장자리 픽셀을 세는 방법으로는 두 가지를 놓친다. 플롯 틀은 넘었지만 캔버스
// 안에 머무는 범례를 못 보고, 닿는 것이 정상인 축 테두리를 넘쳤다고 잘못 잡는다.
// 그래서 `fillText`·`fillRect`·`strokeRect`·경로 그리기를 감싸 **호출마다 실제로
// 덮는 사각형**을 적어 두고 캔버스·범례 상자와 견준다.
//
// 진단표: `LEGEND_REPORT=경로.txt npx vitest run test/core/legend-overflow.test.ts`
import { describe, it, vi, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { CASES_A, CASES_B, type ProbeCase } from './legend-overflow-cases';

/** drawLegend/drawInsideLegend 안에서 일어난 그리기인지 표시하는 깃발 */
const flag = vi.hoisted(() => ({
  depth: 0,
  call: 0,
  kind: '' as string,
  plot: null as null | { x0: number; y0: number; x1: number; y1: number },
}));

vi.mock('../../src/core/canvas/legend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/canvas/legend')>();
  const wrap = <T extends { plotX: number; plotY: number; plotW: number; plotH: number }>(
    fn: (p: T) => unknown,
    kind: string,
  ) => (p: T) => {
    flag.depth++;
    flag.call++;
    flag.kind = kind;
    flag.plot = { x0: p.plotX, y0: p.plotY, x1: p.plotX + p.plotW, y1: p.plotY + p.plotH };
    try {
      return fn(p);
    } finally {
      flag.depth--;
    }
  };
  return {
    ...actual,
    drawLegend: wrap(actual.drawLegend, 'drawLegend'),
    drawInsideLegend: wrap(actual.drawInsideLegend, 'drawInsideLegend'),
  };
});

interface Rect { x0: number; y0: number; x1: number; y1: number }
interface Hit extends Rect { op: string; legend: boolean; call: number; kind: string; plot: Rect | null; where: string }

const W = 800;
const H = 600;

function frame(): string {
  const s = new Error().stack ?? '';
  for (const line of s.split('\n').slice(1)) {
    const m = /src[\\/]core[\\/]([^)\s]+)/.exec(line);
    if (m && !m[1].startsWith('canvas\\legend') && !m[1].startsWith('canvas/legend')) return m[1];
  }
  const m2 = /src[\\/]core[\\/]([^)\s]+)/.exec(s);
  return m2 ? m2[1] : '?';
}

/** 그리기 호출마다 실제로 덮는 사각형을 기록한다 */
function instrument(ctx: CanvasRenderingContext2D, hits: Hit[]) {
  const c = ctx as unknown as Record<string, (...a: never[]) => unknown>;
  const raw: Record<string, (...a: never[]) => unknown> = {};
  const OPS = ['fillText', 'strokeText', 'fillRect', 'strokeRect', 'beginPath',
    'moveTo', 'lineTo', 'arc', 'rect', 'roundRect', 'fill', 'stroke'];
  for (const op of OPS) raw[op] = (c[op] as (...a: never[]) => unknown).bind(ctx);

  let path: Rect | null = null;
  const addPt = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    path = path
      ? { x0: Math.min(path.x0, x), y0: Math.min(path.y0, y), x1: Math.max(path.x1, x), y1: Math.max(path.y1, y) }
      : { x0: x, y0: y, x1: x, y1: y };
  };
  const record = (r: Rect, op: string) => {
    hits.push({
      ...r, op,
      legend: flag.depth > 0,
      call: flag.depth > 0 ? flag.call : -1,
      kind: flag.depth > 0 ? flag.kind : '',
      plot: flag.depth > 0 ? flag.plot : null,
      where: frame(),
    });
  };

  const textRect = (text: string, x: number, y: number): Rect => {
    const m = ctx.measureText(String(text));
    return {
      x0: x - (m.actualBoundingBoxLeft ?? 0),
      x1: x + (m.actualBoundingBoxRight ?? 0),
      y0: y - (m.actualBoundingBoxAscent ?? 0),
      y1: y + (m.actualBoundingBoxDescent ?? 0),
    };
  };

  c.fillText = ((t: string, x: number, y: number, mw?: number) => {
    if (String(t).length > 0) record(textRect(t, x, y), 'fillText');
    return raw.fillText(t as never, x as never, y as never, mw as never);
  }) as never;
  c.strokeText = ((t: string, x: number, y: number, mw?: number) => {
    if (String(t).length > 0) record(pad(textRect(t, x, y), ctx.lineWidth / 2), 'strokeText');
    return raw.strokeText(t as never, x as never, y as never, mw as never);
  }) as never;
  c.fillRect = ((x: number, y: number, w: number, h: number) => {
    if (w !== 0 && h !== 0) {
      record({ x0: Math.min(x, x + w), y0: Math.min(y, y + h), x1: Math.max(x, x + w), y1: Math.max(y, y + h) }, 'fillRect');
    }
    return raw.fillRect(x as never, y as never, w as never, h as never);
  }) as never;
  c.strokeRect = ((x: number, y: number, w: number, h: number) => {
    record(pad({ x0: Math.min(x, x + w), y0: Math.min(y, y + h), x1: Math.max(x, x + w), y1: Math.max(y, y + h) }, ctx.lineWidth / 2), 'strokeRect');
    return raw.strokeRect(x as never, y as never, w as never, h as never);
  }) as never;
  c.beginPath = (() => { path = null; return raw.beginPath(); }) as never;
  c.moveTo = ((x: number, y: number) => { addPt(x, y); return raw.moveTo(x as never, y as never); }) as never;
  c.lineTo = ((x: number, y: number) => { addPt(x, y); return raw.lineTo(x as never, y as never); }) as never;
  c.rect = ((x: number, y: number, w: number, h: number) => {
    addPt(x, y); addPt(x + w, y + h);
    return raw.rect(x as never, y as never, w as never, h as never);
  }) as never;
  c.roundRect = ((x: number, y: number, w: number, h: number, r?: unknown) => {
    addPt(x, y); addPt(x + w, y + h);
    return raw.roundRect(x as never, y as never, w as never, h as never, r as never);
  }) as never;
  c.arc = ((x: number, y: number, r: number, ...rest: number[]) => {
    addPt(x - r, y - r); addPt(x + r, y + r);
    return raw.arc(x as never, y as never, r as never, ...(rest as never[]));
  }) as never;
  c.fill = ((...a: unknown[]) => {
    if (path) record(path, 'fill(path)');
    return raw.fill(...(a as never[]));
  }) as never;
  c.stroke = ((...a: unknown[]) => {
    if (path) record(pad(path, ctx.lineWidth / 2), 'stroke(path)');
    return raw.stroke(...(a as never[]));
  }) as never;
}

const pad = (r: Rect, p: number): Rect => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });

const EPS = 0.5;
const outCanvas = (r: Rect) => ({
  left: Math.max(0, 0 - r.x0), right: Math.max(0, r.x1 - W),
  top: Math.max(0, 0 - r.y0), bottom: Math.max(0, r.y1 - H),
});
const outPlot = (r: Rect, p: Rect) => ({
  left: Math.max(0, p.x0 - r.x0), right: Math.max(0, r.x1 - p.x1),
  top: Math.max(0, p.y0 - r.y0), bottom: Math.max(0, r.y1 - p.y1),
});
const worst = (o: ReturnType<typeof outCanvas>) => Math.max(o.left, o.right, o.top, o.bottom);
const dirs = (o: ReturnType<typeof outCanvas>) => {
  const d: string[] = [];
  if (o.left > EPS) d.push(`왼쪽 ${o.left.toFixed(1)}`);
  if (o.right > EPS) d.push(`오른쪽 ${o.right.toFixed(1)}`);
  if (o.top > EPS) d.push(`위 ${o.top.toFixed(1)}`);
  if (o.bottom > EPS) d.push(`아래 ${o.bottom.toFixed(1)}`);
  return d.join(', ');
};

function run(c: ProbeCase) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const hits: Hit[] = [];
  instrument(ctx, hits);
  c.render(ctx, W, H, c.data() as never, c.options());
  return hits;
}

/** 이 케이스에서 범례가 캔버스를 넘어간 최대 픽셀 */
function legendCanvasOverflow(hits: Hit[]) {
  let max = 0;
  const acc = { left: 0, right: 0, top: 0, bottom: 0 };
  for (const hit of hits) {
    if (!hit.legend) continue;
    const o = outCanvas(hit);
    max = Math.max(max, worst(o));
    acc.left = Math.max(acc.left, o.left); acc.right = Math.max(acc.right, o.right);
    acc.top = Math.max(acc.top, o.top); acc.bottom = Math.max(acc.bottom, o.bottom);
  }
  return { max, acc };
}

/** 진단표를 적을 파일. 없으면 표를 만들지 않는다 (평소에는 아래 검사만 돈다). */
const REPORT_OUT = process.env.LEGEND_REPORT;

describe('범례 넘침', () => {
  const all = [...CASES_A, ...CASES_B];

  if (REPORT_OUT) {
    it('진단표', () => {
      const rows: string[] = [];
      for (const c of all) {
        const hits = run(c);
        const legendHits = hits.filter((x) => x.legend);
        const handRolled = hits.filter((x) => !x.legend && worst(outCanvas(x)) > EPS);
        const cv = legendCanvasOverflow(hits);

        // 범례 호출마다 «첫 사각형» 이 상자다 (drawLegend·drawInsideLegend 모두
        // 상자를 먼저 그린다). 그 상자 밖으로 나간 항목 잉크를 «상자밖» 으로 센다.
        const boxAcc = { left: 0, right: 0, top: 0, bottom: 0 };
        const boxes = new Map<number, Rect>();
        for (const hit of legendHits) {
          if (!boxes.has(hit.call)) { boxes.set(hit.call, pad(hit, 1)); continue; }
          const box = boxes.get(hit.call)!;
          const o = outPlot(hit, box);
          boxAcc.left = Math.max(boxAcc.left, o.left); boxAcc.right = Math.max(boxAcc.right, o.right);
          boxAcc.top = Math.max(boxAcc.top, o.top); boxAcc.bottom = Math.max(boxAcc.bottom, o.bottom);
        }
        rows.push([
          c.name,
          legendHits.length === 0 ? '(범례 없음)' : `호출 ${legendHits.length}`,
          cv.max > EPS ? `캔버스밖: ${dirs(cv.acc)}` : '캔버스 OK',
          worst(boxAcc) > EPS ? `상자밖: ${dirs(boxAcc)}` : '상자 OK',
          handRolled.length
            ? `범례 아닌 캔버스밖: ${handRolled.map((x) => `${x.where} ${dirs(outCanvas(x))}`).join(' / ')}`
            : '',
        ].join(' | '));
      }
      writeFileSync(REPORT_OUT, rows.join('\n'), 'utf8');
    });
  }

  it.each(all.map((c) => [c.name, c] as const))('%s — 범례가 캔버스를 넘지 않는다', (_name, c) => {
    const hits = run(c);
    const { max, acc } = legendCanvasOverflow(hits);
    expect(max, `범례가 캔버스를 벗어났습니다 — ${dirs(acc)}`).toBeLessThanOrEqual(EPS);
  });
});
