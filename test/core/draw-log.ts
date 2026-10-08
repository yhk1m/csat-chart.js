// © 2026 김용현
// 테스트 도우미 — 렌더러가 ctx 에 한 일을 기록한다 (그은 선분·찍은 글자 상자·호·사각 테두리).
// 범례·글자가 그림 내용을 덮지 않는지 «그린 것» 으로 확인할 때 쓴다.
import { createCanvas } from '@napi-rs/canvas';

export type Box = { left: number; right: number; top: number; bottom: number };
/** 그린 차례가 붙은 상자 — 범례 상자 «뒤에» 그린 것은 범례 속 견본이다 */
export type Drawn = Box & { seq: number };

export interface DrawLog {
  segs: [number, number, number, number][];
  texts: { s: string; box: Box }[];
  arcs: Drawn[];
  strokeRects: Drawn[];
}

export function drawLogged(
  render: (ctx: CanvasRenderingContext2D) => void, w = 800, h = 600,
): DrawLog {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const log: DrawLog = { segs: [], texts: [], arcs: [], strokeRects: [] };
  let path: [number, number][][] = [];
  let seq = 0;
  const tf = (x: number, y: number): [number, number] => {
    const m = ctx.getTransform();
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  };
  const c = ctx as unknown as Record<string, unknown>;
  const o = {
    beginPath: ctx.beginPath.bind(ctx), moveTo: ctx.moveTo.bind(ctx), lineTo: ctx.lineTo.bind(ctx),
    stroke: ctx.stroke.bind(ctx), fillText: ctx.fillText.bind(ctx), arc: ctx.arc.bind(ctx),
    strokeRect: ctx.strokeRect.bind(ctx), rect: ctx.rect.bind(ctx), fillRect: ctx.fillRect.bind(ctx),
  };
  // 캔버스 전체를 칠하면(clearCanvas) 그 전 기록을 버린다 — 두 번 그리는 렌더러의 앞 그림
  c.fillRect = (x: number, y: number, w2: number, h2: number) => {
    if (x <= 0 && y <= 0 && w2 >= w && h2 >= h) { log.segs = []; log.texts = []; log.arcs = []; log.strokeRects = []; }
    o.fillRect(x, y, w2, h2);
  };
  c.beginPath = () => { path = []; o.beginPath(); };
  c.moveTo = (x: number, y: number) => { path.push([tf(x, y)]); o.moveTo(x, y); };
  c.lineTo = (x: number, y: number) => { (path[path.length - 1] ?? (path[0] = [])).push(tf(x, y)); o.lineTo(x, y); };
  c.rect = (x: number, y: number, w2: number, h2: number) => {
    const [a, b] = [tf(x, y), tf(x + w2, y + h2)];
    log.arcs.push({ left: a[0], top: a[1], right: b[0], bottom: b[1], seq: seq++ });
    o.rect(x, y, w2, h2);
  };
  c.arc = (x: number, y: number, r: number, s: number, e: number, ccw?: boolean) => {
    const [cx, cy] = tf(x, y);
    log.arcs.push({ left: cx - r, right: cx + r, top: cy - r, bottom: cy + r, seq: seq++ });
    o.arc(x, y, r, s, e, ccw);
  };
  c.stroke = () => {
    for (const sub of path) for (let i = 1; i < sub.length; i++) {
      log.segs.push([sub[i - 1][0], sub[i - 1][1], sub[i][0], sub[i][1]]);
    }
    o.stroke();
  };
  // 둥근 사각형(산점도 범례 상자)도 사각 테두리로 본다
  const roundRect = (ctx as unknown as { roundRect?: (...a: unknown[]) => void }).roundRect?.bind(ctx);
  if (roundRect) {
    c.roundRect = (x: number, y: number, w2: number, h2: number, r?: unknown) => {
      const [a, b] = [tf(x, y), tf(x + w2, y + h2)];
      log.strokeRects.push({ left: a[0], top: a[1], right: b[0], bottom: b[1], seq: seq++ });
      roundRect(x, y, w2, h2, r);
    };
  }
  c.strokeRect = (x: number, y: number, w2: number, h2: number) => {
    const [a, b] = [tf(x, y), tf(x + w2, y + h2)];
    log.strokeRects.push({ left: a[0], top: a[1], right: b[0], bottom: b[1], seq: seq++ });
    o.strokeRect(x, y, w2, h2);
  };
  c.fillText = (s: string, x: number, y: number, mw?: number) => {
    const m = ctx.measureText(s);
    const [px, py] = tf(x, y);
    log.texts.push({ s, box: { left: px - m.actualBoundingBoxLeft, right: px + m.actualBoundingBoxRight, top: py - m.actualBoundingBoxAscent, bottom: py + m.actualBoundingBoxDescent } });
    o.fillText(s, x, y, mw);
  };
  render(ctx);
  return log;
}

export const overlaps = (a: Box, b: Box) =>
  !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

export const shrink = (b: Box, d: number): Box =>
  ({ left: b.left + d, right: b.right - d, top: b.top + d, bottom: b.bottom - d });

/**
 * 글자 잉크 상자를 **글자마다 따로 재서** 기록한다 (2.2.1). 위·아래 끝은 부호 그대로다.
 *
 * `actualBoundingBox*` 를 문자열 통째로 재면 @napi-rs/canvas 는 글꼴 대체가 일어난
 * 문자열에서 첫 조각만 잰다 (src/core/canvas/fit.ts 의 textExtent 설명). 그래서 폭은
 * `width`, 높이는 글자별 잉크로 잰다 — 렌더러가 자리를 잡을 때 쓰는 것과 같은 자다.
 * exam 의 괄호는 렌더러 안에서 「(」「다」「)」 조각으로 따로 찍히므로, 잇달아 찍힌
 * 맞닿은 조각을 한 이름(`runs`)으로 묶는다.
 */
export interface InkLog {
  /** 찍은 글자 하나하나 */
  texts: { s: string; box: Box }[];
  /** 잇달아 붙여 찍은 조각을 묶은 것 — 「(다)」 */
  runs: { s: string; box: Box }[];
  /** 점선으로 그은 선분 (격자) */
  dashed: [number, number, number, number][];
  /** 흰색으로 칠한 사각형 (글자 바탕 비우기) — 칠한 차례 포함 */
  whiteRects: Drawn[];
  /** 테두리 사각형 (범례·축 이름 상자) */
  strokeRects: Drawn[];
}

export function inkLogged(
  render: (ctx: CanvasRenderingContext2D) => void, w: number, h: number,
): InkLog {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const log: InkLog = { texts: [], runs: [], dashed: [], whiteRects: [], strokeRects: [] };
  let path: [number, number][][] = [];
  let seq = 0;
  const tf = (x: number, y: number): [number, number] => {
    const m = ctx.getTransform();
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  };
  const c = ctx as unknown as Record<string, unknown>;
  const o = {
    beginPath: ctx.beginPath.bind(ctx), moveTo: ctx.moveTo.bind(ctx), lineTo: ctx.lineTo.bind(ctx),
    stroke: ctx.stroke.bind(ctx), fillText: ctx.fillText.bind(ctx),
    strokeRect: ctx.strokeRect.bind(ctx), fillRect: ctx.fillRect.bind(ctx),
    measureText: ctx.measureText.bind(ctx),
  };
  const white = () => /^#fff(fff)?$/i.test(String(ctx.fillStyle));
  c.fillRect = (x: number, y: number, w2: number, h2: number) => {
    if (white()) {
      const [a, b] = [tf(x, y), tf(x + w2, y + h2)];
      log.whiteRects.push({ left: a[0], top: a[1], right: b[0], bottom: b[1], seq: seq++ });
    }
    o.fillRect(x, y, w2, h2);
  };
  c.beginPath = () => { path = []; o.beginPath(); };
  c.moveTo = (x: number, y: number) => { path.push([tf(x, y)]); o.moveTo(x, y); };
  c.lineTo = (x: number, y: number) => { (path[path.length - 1] ?? (path[0] = [])).push(tf(x, y)); o.lineTo(x, y); };
  c.stroke = () => {
    if (ctx.getLineDash().length > 0) {
      for (const sub of path) for (let i = 1; i < sub.length; i++) {
        log.dashed.push([sub[i - 1][0], sub[i - 1][1], sub[i][0], sub[i][1]]);
      }
    }
    o.stroke();
  };
  c.strokeRect = (x: number, y: number, w2: number, h2: number) => {
    const [a, b] = [tf(x, y), tf(x + w2, y + h2)];
    log.strokeRects.push({ left: a[0], top: a[1], right: b[0], bottom: b[1], seq: seq++ });
    o.strokeRect(x, y, w2, h2);
  };
  const roundRect2 = (ctx as unknown as { roundRect?: (...a: unknown[]) => void }).roundRect?.bind(ctx);
  if (roundRect2) {
    c.roundRect = (x: number, y: number, w2: number, h2: number, r?: unknown) => {
      const [a, b] = [tf(x, y), tf(x + w2, y + h2)];
      log.strokeRects.push({ left: a[0], top: a[1], right: b[0], bottom: b[1], seq: seq++ });
      roundRect2(x, y, w2, h2, r);
    };
  }
  c.fillText = (s: string, x: number, y: number, mw?: number) => {
    const width = Math.min(o.measureText(s).width, mw ?? Infinity);
    const al = ctx.textAlign;
    const left = al === 'right' || al === 'end' ? width : al === 'center' ? width / 2 : 0;
    // 부호 있는 잉크 — 「bottom」 기준선의 괄호처럼 잉크가 기준점 위에서 끝나면 그 자리가 아랫끝이다
    // (0 에서 자르면 기준점까지 잉크가 있다고 보아 틈을 실제보다 좁게 잰다 — 2.2.1 CI)
    let up = -Infinity;
    let down = -Infinity;
    for (const ch of s) {
      if (!ch.trim()) continue;
      const m = o.measureText(ch);
      up = Math.max(up, m.actualBoundingBoxAscent);
      down = Math.max(down, m.actualBoundingBoxDescent);
    }
    if (up === -Infinity) { up = 0; down = 0; }
    const m = ctx.getTransform();
    const sx = Math.hypot(m.a, m.b);
    const sy = Math.hypot(m.c, m.d);
    const [px, py] = tf(x, y);
    // 회전(세로 축 이름)은 다루지 않는다 — 이 기록은 가로 글자용
    const box = { left: px - left * sx, right: px + (width - left) * sx, top: py - up * sy, bottom: py + down * sy };
    if (s.trim()) log.texts.push({ s, box });
    o.fillText(s, x, y, mw);
  };
  render(ctx);
  // 맞닿은 조각을 묶는다 — 같은 줄(세로로 반 이상 겹침)에서 왼쪽 끝이 앞 조각 오른쪽 끝 ±3 안
  for (const t of log.texts) {
    const prev = log.runs[log.runs.length - 1];
    const vOver = prev
      ? Math.min(prev.box.bottom, t.box.bottom) - Math.max(prev.box.top, t.box.top)
      : 0;
    const hTouch = prev && t.box.left >= prev.box.left && t.box.left <= prev.box.right + 3;
    const sameLine = prev && vOver > 0.5 * Math.min(prev.box.bottom - prev.box.top, t.box.bottom - t.box.top);
    if (prev && hTouch && sameLine && /^[()]|[()]$/.test(t.s + prev.s)) {
      prev.s += t.s;
      prev.box = {
        left: Math.min(prev.box.left, t.box.left), right: Math.max(prev.box.right, t.box.right),
        top: Math.min(prev.box.top, t.box.top), bottom: Math.max(prev.box.bottom, t.box.bottom),
      };
    } else {
      log.runs.push({ s: t.s, box: { ...t.box } });
    }
  }
  return log;
}

/** 두 상자 사이 틈 (겹치면 음수) */
export const gapBetween = (a: Box, b: Box) => Math.max(
  b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom,
);
