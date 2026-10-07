// © 2026 김용현
// 점 기호 — 범주 점 그래프의 계열 기호와 그 범례 견본이 같은 모양을 쓴다.
import type { DotMarker } from '../types/categorydot';

/** 기호 하나를 (cx, cy)에 채워 그린다. 채움색은 부르는 쪽이 건다. */
export function drawDotMarker(
  ctx: CanvasRenderingContext2D,
  marker: DotMarker,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.beginPath();
  switch (marker) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.lineTo(cx - r, cy + r);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      break;
  }
  ctx.fill();
}
