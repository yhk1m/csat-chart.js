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
