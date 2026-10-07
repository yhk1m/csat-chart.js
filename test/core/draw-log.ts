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
