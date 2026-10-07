// © 2026 김용현
// 그려진 것(선분·상자·점)을 모아 두고, 글자·범례 상자 후보가 그것을 얼마나 덮는지 센다.
//
// LabelPlacer(labels.ts)는 상자끼리만 본다. 정육면체 모서리·경제 곡선처럼 **선**을
// 피해야 하는 자리에서 이 모음을 쓴다. 판정만 하고 그리지는 않는다.
import type { LabelBox } from './labels';

interface Seg { x1: number; y1: number; x2: number; y2: number; pad: number }

/** 상자를 사방으로 pad 만큼 넓힌다 */
export function inflate(b: LabelBox, pad: number): LabelBox {
  return { left: b.left - pad, right: b.right + pad, top: b.top - pad, bottom: b.bottom + pad };
}

export function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

/** 선분이 상자를 지나는가 (Liang–Barsky 자르기) */
export function segmentHitsBox(
  x1: number, y1: number, x2: number, y2: number, b: LabelBox,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - b.left, b.right - x1, y1 - b.top, b.bottom - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
      continue;
    }
    const r = q[i] / p[i];
    if (p[i] < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return t0 <= t1;
}

/** 이미 그려진(또는 그려질) 것들 */
export class Obstacles {
  private segs: Seg[] = [];
  private boxes: LabelBox[] = [];

  /** 굵기 있는 선분 — pad 는 선 반 굵기 + 띄울 틈 */
  addSegment(x1: number, y1: number, x2: number, y2: number, pad = 3): this {
    this.segs.push({ x1, y1, x2, y2, pad });
    return this;
  }

  /** 꺾은선 (점 사이를 차례로 잇는다) */
  addPolyline(pts: [number, number][], pad = 3): this {
    for (let i = 1; i < pts.length; i++) {
      this.addSegment(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], pad);
    }
    return this;
  }

  addBox(b: LabelBox, pad = 0): this {
    this.boxes.push(inflate(b, pad));
    return this;
  }

  addCircle(cx: number, cy: number, r: number): this {
    return this.addBox({ left: cx - r, right: cx + r, top: cy - r, bottom: cy + r });
  }

  /** 상자가 덮는 선분 수 */
  segmentHits(b: LabelBox): number {
    let n = 0;
    for (const s of this.segs) if (segmentHitsBox(s.x1, s.y1, s.x2, s.y2, inflate(b, s.pad))) n++;
    return n;
  }

  /** 상자가 덮는 상자 수 */
  boxHits(b: LabelBox): number {
    let n = 0;
    for (const o of this.boxes) if (boxesOverlap(b, o)) n++;
    return n;
  }

  /** 선분·상자 모두 */
  hits(b: LabelBox): number {
    return this.segmentHits(b) + this.boxHits(b);
  }
}

const WHITE = /^(#fff|#ffffff|white|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(,\s*1(\.0*)?\s*)?\))$/i;

/**
 * 그리는 대로 장애물을 모으는 ctx. 받은 ctx 에 그대로 그리면서, 그은 선분(굵기 반 + 2px)·
 * 채운 도형의 테두리 상자·찍은 글자 상자를 `obstacles` 에 쌓는다. 흰 채움(바탕·지우개)은
 * 세지 않는다. 범례 상자처럼 «그림 다 그린 뒤 빈자리» 를 찾는 곳에서 쓴다.
 *
 * 좌표는 그리는 순간의 변환(getTransform)을 거친 캔버스 좌표다. 곡선은 시작·조절·끝점을
 * 잇는 꺾은선으로, 호는 그 원의 상자로 어림한다.
 */
export function recordingCtx(ctx: CanvasRenderingContext2D): { ctx: CanvasRenderingContext2D; obstacles: Obstacles } {
  const ob = new Obstacles();
  let subs: [number, number][][] = [];
  let boxes: LabelBox[] = [];
  const tf = (x: number, y: number): [number, number] => {
    const m = ctx.getTransform();
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  };
  const lineTo = (x: number, y: number) => {
    const p = tf(x, y);
    if (subs.length === 0) subs.push([]);
    subs[subs.length - 1].push(p);

  };
  const moveTo = (x: number, y: number) => {
    const p = tf(x, y);
    subs.push([p]);

  };
  const pathBox = (): LabelBox | null => {
    const pts = [...subs.flat(), ...boxes.flatMap((b) => [[b.left, b.top], [b.right, b.bottom]] as [number, number][])];
    if (pts.length === 0) return null;
    return {
      left: Math.min(...pts.map((p) => p[0])), right: Math.max(...pts.map((p) => p[0])),
      top: Math.min(...pts.map((p) => p[1])), bottom: Math.max(...pts.map((p) => p[1])),
    };
  };
  const rectBox = (x: number, y: number, w: number, h: number): LabelBox => {
    const a = tf(x, y);
    const b = tf(x + w, y + h);
    return { left: Math.min(a[0], b[0]), right: Math.max(a[0], b[0]), top: Math.min(a[1], b[1]), bottom: Math.max(a[1], b[1]) };
  };
  const isWhite = () => typeof ctx.fillStyle === 'string' && WHITE.test(ctx.fillStyle.trim());
  const textBox = (s: string, x: number, y: number) => {
    const m = ctx.measureText(s);
    const [px, py] = tf(x, y);
    ob.addBox({
      left: px - (m.actualBoundingBoxLeft ?? 0), right: px + (m.actualBoundingBoxRight ?? m.width),
      top: py - (m.actualBoundingBoxAscent ?? 0), bottom: py + (m.actualBoundingBoxDescent ?? 0),
    });
  };
  const hooks: Record<string, (...a: never[]) => void> = {
    beginPath: () => { subs = []; boxes = []; },
    moveTo: moveTo as never,
    lineTo: lineTo as never,
    quadraticCurveTo: ((cx: number, cy: number, x: number, y: number) => { lineTo(cx, cy); lineTo(x, y); }) as never,
    bezierCurveTo: ((c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) => {
      lineTo(c1x, c1y); lineTo(c2x, c2y); lineTo(x, y);
    }) as never,
    closePath: () => {
      const sub = subs[subs.length - 1];
      if (sub && sub.length > 1) { sub.push(sub[0]); }
    },
    rect: ((x: number, y: number, w: number, h: number) => {
      moveTo(x, y); lineTo(x + w, y); lineTo(x + w, y + h); lineTo(x, y + h); lineTo(x, y);
    }) as never,
    arc: ((x: number, y: number, r: number) => { boxes.push(rectBox(x - r, y - r, r * 2, r * 2)); }) as never,
    ellipse: ((x: number, y: number, rx: number, ry: number) => { boxes.push(rectBox(x - rx, y - ry, rx * 2, ry * 2)); }) as never,
    stroke: () => {
      const pad = ctx.lineWidth / 2 + 2;
      for (const sub of subs) {
        for (let i = 1; i < sub.length; i++) ob.addSegment(sub[i - 1][0], sub[i - 1][1], sub[i][0], sub[i][1], pad);
      }
      for (const b of boxes) ob.addBox(b, pad);
    },
    fill: () => {
      if (isWhite()) return;
      const b = pathBox();
      if (b) ob.addBox(b);
    },
    fillRect: ((x: number, y: number, w: number, h: number) => { if (!isWhite()) ob.addBox(rectBox(x, y, w, h)); }) as never,
    strokeRect: ((x: number, y: number, w: number, h: number) => {
      const b = rectBox(x, y, w, h);
      const pad = ctx.lineWidth / 2 + 2;
      ob.addSegment(b.left, b.top, b.right, b.top, pad).addSegment(b.right, b.top, b.right, b.bottom, pad)
        .addSegment(b.right, b.bottom, b.left, b.bottom, pad).addSegment(b.left, b.bottom, b.left, b.top, pad);
    }) as never,
    fillText: ((s: string, x: number, y: number) => textBox(String(s), x, y)) as never,
    strokeText: ((s: string, x: number, y: number) => textBox(String(s), x, y)) as never,
  };
  const proxy = new Proxy(ctx, {
    get(target, prop) {
      const v = Reflect.get(target, prop, target);
      if (typeof prop === 'string' && prop in hooks && typeof v === 'function') {
        const hook = hooks[prop];
        return (...args: never[]) => {
          hook(...args);
          return (v as (...a: never[]) => unknown).apply(target, args);
        };
      }
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value, target);
    },
  });
  return { ctx: proxy, obstacles: ob };
}
