// © 2026 김용현
// 잉크가 캔버스 밖으로 나가는지 — 그리기 호출을 직접 기록해서 본다.
//
// 가장자리 픽셀을 세는 방법으로는 두 가지를 놓친다. 플롯 틀은 넘었지만 캔버스
// 안에 머무는 범례를 못 보고, 닿는 것이 정상인 축 테두리를 넘쳤다고 잘못 잡는다.
// 그래서 `fillText`·`fillRect`·`strokeRect`·경로 그리기를 감싸 **호출마다 실제로
// 덮는 사각형**을 적어 두고 캔버스·범례 상자와 견준다.
//
// 지키는 것은 두 가지다.
//  1. **범례**가 캔버스를 넘지 않는다 (1.1.1).
//  2. **글자**는 무엇이든 캔버스를 넘지 않는다 (1.2.0). 캔버스 밖 글자는 언제나
//     결함이다 — 잉크 일반과 달리(그림은 경계를 넘어 그린 뒤 잘라 낼 수 있다)
//     읽히지 않는 글자를 그리는 것이 옳은 경우가 없다.
//
// 세로로 세운 축 이름은 `rotate` 뒤에 찍히므로 **변환을 먹인 사각형**을 잰다.
// 재는 시점의 `getTransform()` 으로 네 모서리를 옮겨 감싸는 상자를 만든다.
//
// 케이스는 76가지(17종 × 두 자료 × 두 범례 위치) × 두 글꼴 폭이다. 글꼴 폭은
// `FONT_WIDTHS` 를 보라 — 기계마다 다른 대체 글꼴 때문에 여기서만 통과하는 일이
// 없게 «넓은 글꼴» 을 흉내 내어 한 번 더 돈다.
//
// 진단표: `OVERFLOW_REPORT=경로.txt npx vitest run test/core/overflow.test.ts`
//         (`OVERFLOW_FONT_SCALE=1.25` 를 함께 주면 넓은 글꼴로 잰다)
import { describe, it, vi, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { CASES_A, CASES_B, type ProbeCase } from './overflow-cases';

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
interface Hit extends Rect {
  op: string;
  text: string;
  legend: boolean;
  call: number;
  kind: string;
  plot: Rect | null;
  where: string;
}

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
  const record = (r: Rect, op: string, text = '') => {
    hits.push({
      ...r, op, text,
      legend: flag.depth > 0,
      call: flag.depth > 0 ? flag.call : -1,
      kind: flag.depth > 0 ? flag.kind : '',
      plot: flag.depth > 0 ? flag.plot : null,
      where: frame(),
    });
  };

  /**
   * 글자가 덮는 사각형.
   *
   * 가로는 `actualBoundingBoxLeft/Right` 가 아니라 **보내는 폭**과 `textAlign`
   * 으로 잰다. @napi-rs/canvas 는 글꼴 대체가 일어나면 그 두 값을 «첫 글꼴
   * 조각만» 재서 돌려준다 — 「평년 대비 강수량 차이(mm)」의 오른쪽 끝을 63px
   * 짧게 말한다. 그대로 믿으면 정말로 잘린 글자를 통과시킨다.
   * 세로는 **글자마다 따로** 재서 가장 높은·낮은 것을 취한다 (한 글자는 언제나
   * 한 조각이다).
   *
   * `maxWidth` 를 준 호출은 캔버스가 글자를 그 폭으로 **눌러** 그리므로
   * 가로 폭을 그 비율로 줄여 잡는다. 안 그러면 이미 눌러 담은 제목·각주를
   * 넘쳤다고 잘못 잡는다.
   *
   * 마지막으로 **현재 변환**을 먹여 세운 글자도 제자리에서 재게 한다.
   */
  const textRect = (text: string, x: number, y: number, maxWidth?: number): Rect => {
    const s = String(text);
    const m = ctx.measureText(s);
    const w = (maxWidth != null && Number.isFinite(maxWidth) && maxWidth > 0)
      ? Math.min(m.width, maxWidth)
      : m.width;
    const left = ctx.textAlign === 'right' || ctx.textAlign === 'end' ? w
      : ctx.textAlign === 'center' ? w / 2 : 0;
    let up = 0;
    let down = 0;
    for (const ch of s) {
      if (!ch.trim()) continue;
      const cm = ctx.measureText(ch);
      up = Math.max(up, cm.actualBoundingBoxAscent ?? 0);
      down = Math.max(down, cm.actualBoundingBoxDescent ?? 0);
    }
    const local = { x0: x - left, x1: x + (w - left), y0: y - up, y1: y + down };
    const t = ctx.getTransform();
    if (t.a === 1 && t.b === 0 && t.c === 0 && t.d === 1 && t.e === 0 && t.f === 0) return local;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [px, py] of [
      [local.x0, local.y0], [local.x1, local.y0],
      [local.x0, local.y1], [local.x1, local.y1],
    ]) {
      xs.push(t.a * px + t.c * py + t.e);
      ys.push(t.b * px + t.d * py + t.f);
    }
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };

  c.fillText = ((t: string, x: number, y: number, mw?: number) => {
    if (String(t).trim().length > 0) record(textRect(t, x, y, mw), 'fillText', String(t));
    return raw.fillText(t as never, x as never, y as never, mw as never);
  }) as never;
  c.strokeText = ((t: string, x: number, y: number, mw?: number) => {
    if (String(t).trim().length > 0) record(pad(textRect(t, x, y, mw), ctx.lineWidth / 2), 'strokeText', String(t));
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

/**
 * 재는 기계마다 **대체 글꼴이 다르다.** 이 검사는 그 폭에 매달려 있어서, 저자
 * 기계에서 3px 남고 통과한 자리가 CI 의 리눅스 글꼴에서는 4px 모자라 깨졌다
 * (하이서그래프의 「(mm)」가 실제로 그랬다). 그래서 «폭이 이만큼 넓은 글꼴»
 * 을 흉내 내어 한 번 더 돌린다 — `measureText().width` 만 부풀리면 배치를
 * 정하는 쪽과 재는 쪽이 함께 그 글꼴을 본다.
 *
 * 사용자에게도 실제 상황이다. 이 라이브러리는 Noto 를 못 받으면 시스템 대체
 * 글꼴로 그린다고 README 가 적어 두었다.
 *
 * **`options.fontStack` (1.3.0) 도 이 판이 그대로 덮는다.** 배치 코드는 글꼴
 * **이름**을 보지 않는다 — `measureText().width` 만 본다. 그러니 「함초롬돋움을
 * 범례에 넣었더니 이름이 상자를 넘더라」는 「글꼴이 예상보다 넓다」와 같은 일이고,
 * 그게 바로 이 배율이 흉내 내는 것이다. 게다가 배율은 명조·고딕 **두 자리에
 * 함께** 걸리므로, 한쪽만 넓은 글꼴을 준 경우보다 매 글자에 더 가혹하다.
 * 그래서 세 번째 판을 만들지 않았다. 다만 재는 쪽과 그리는 쪽이 **같은** 글꼴을
 * 보아야 이 가정이 성립한다 — 그 짝은 `font-stack.test.ts` 가 지킨다.
 */
// 1.25 는 «재는 기계의 글꼴보다 25% 넓은 글꼴» 이다. CI 의 리눅스 대체 글꼴이
// 이미 5% 쯤 넓으니 거기서는 사실상 1.3배로 돈다.
//
// **여기서 더 올리면 눈금 숫자 열이 먼저 무너진다.** 1.4 배로 걸어 보면
// 하이서그래프·누적 막대·인구 피라미드의 세로축 숫자가 왼쪽으로 0.7~6px
// 넘는다. 축 이름·단위와 달리 눈금 숫자는 눈금선에 붙어 있어 «밀기» 로는 못
// 고치고, **왼쪽 여백을 잰 숫자 폭에 맞춰 잡아야** 한다 (산점도에서 y축 이름에
// 한 것과 같은 손질을 세 종류에 더 해야 한다는 뜻이다). 제 글꼴에서도 CI
// 글꼴에서도 넘치지 않으므로 이 판에서는 손대지 않았다.
const FONT_WIDTHS: [string, number][] = [['제 글꼴', 1], ['넓은 대체 글꼴', 1.25]];

/** `measureText().width` 만 배로 부풀린 ctx (다른 값은 그대로) */
function widenFont(ctx: CanvasRenderingContext2D, scale: number) {
  if (scale === 1) return;
  const raw = ctx.measureText.bind(ctx);
  (ctx as unknown as Record<string, unknown>).measureText = (t: string) => {
    const m = raw(t);
    return new Proxy(m, {
      get: (o, k) => (k === 'width' ? (o as unknown as TextMetrics).width * scale : Reflect.get(o, k)),
    }) as TextMetrics;
  };
}

function run(c: ProbeCase, fontScale = 1) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const hits: Hit[] = [];
  widenFont(ctx, fontScale);
  instrument(ctx, hits);
  c.render(ctx, W, H, c.data() as never, c.options());
  return hits;
}

const isText = (h: Hit) => h.op === 'fillText' || h.op === 'strokeText';

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

/** 이 케이스에서 캔버스를 넘어간 글자 하나하나 */
function textOverflows(hits: Hit[]) {
  const out: { hit: Hit; o: ReturnType<typeof outCanvas> }[] = [];
  for (const hit of hits) {
    if (!isText(hit)) continue;
    const o = outCanvas(hit);
    if (worst(o) > EPS) out.push({ hit, o });
  }
  return out;
}

/** 진단표를 적을 파일. 없으면 표를 만들지 않는다 (평소에는 아래 검사만 돈다). */
const REPORT_OUT = process.env.OVERFLOW_REPORT;

describe('넘침', () => {
  const all = [...CASES_A, ...CASES_B];

  if (REPORT_OUT) {
    it('진단표', () => {
      const rows: string[] = [];
      for (const c of all) {
        const hits = run(c, Number(process.env.OVERFLOW_FONT_SCALE ?? 1));
        const legendHits = hits.filter((x) => x.legend);
        const texts = hits.filter(isText);
        const bad = textOverflows(hits);
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
          legendHits.length === 0 ? '(범례 없음)' : `범례 호출 ${legendHits.length}`,
          cv.max > EPS ? `범례 캔버스밖: ${dirs(cv.acc)}` : '범례 OK',
          worst(boxAcc) > EPS ? `상자밖: ${dirs(boxAcc)}` : '상자 OK',
          `글자 ${texts.length}`,
          bad.length === 0
            ? '글자 OK'
            : `글자 캔버스밖: ${bad.map(({ hit, o }) => `«${hit.text}» ${hit.where}${hit.legend ? '(범례)' : ''} ${dirs(o)}`).join(' / ')}`,
        ].join(' | '));
      }
      writeFileSync(REPORT_OUT, rows.join('\n'), 'utf8');
    });
  }

  const withFonts = all.flatMap((c) =>
    FONT_WIDTHS.map(([fontName, scale]) => [`${c.name} · ${fontName}`, c, scale] as const));

  it.each(withFonts)('%s — 범례가 캔버스를 넘지 않는다', (_name, c, scale) => {
    const hits = run(c, scale);
    const { max, acc } = legendCanvasOverflow(hits);
    expect(max, `범례가 캔버스를 벗어났습니다 — ${dirs(acc)}`).toBeLessThanOrEqual(EPS);
  });

  // 범례든 축 이름이든 눈금 숫자든, **읽히지 않는 글자**를 그리는 것은 언제나
  // 결함이다. 그래서 종류를 가리지 않고 글자 전부에 같은 잣대를 댄다.
  it.each(withFonts)('%s — 글자가 캔버스를 넘지 않는다', (_name, c, scale) => {
    const hits = run(c, scale);
    const bad = textOverflows(hits);
    const why = bad.map(({ hit, o }) => `«${hit.text}» (${hit.where}) ${dirs(o)}`).join('\n  ');
    expect(bad.length, `글자가 캔버스를 벗어났습니다 —\n  ${why}`).toBe(0);
  });
});
