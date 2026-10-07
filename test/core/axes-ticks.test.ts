// © 2026 김용현
// 눈금 표시 방향 — 바깥·안쪽·없음·가로지름이 실제로 그 자리에 잉크를 남기는가.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { drawYAxis } from '../../src/core/canvas/axes';
import { clearCanvas, createDefaultGraphOptions } from '../../src/core/index';
import type { TickDir } from '../../src/core/canvas/style';

const W = 400;
const H = 300;
const PAD = { top: 40, right: 40, bottom: 40, left: 100 };

/** 축 x=100 에서 왼쪽(바깥)·오른쪽(안쪽) 4px 지점, 눈금 y 에 잉크가 있는가 */
function inkAt(dir: TickDir) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  clearCanvas(ctx, W, H);
  drawYAxis({
    ctx, padding: PAD, width: W, height: H, min: 0, max: 10, step: 5, label: '', side: 'left',
    fonts: createDefaultGraphOptions('exam'), tickFontSize: 20, labelFontSize: 20, tickDir: dir,
  });
  const y = PAD.top + (H - PAD.top - PAD.bottom) / 2; // 값 5 의 눈금
  const dark = (x: number) => (c.getContext('2d').getImageData(x, Math.round(y), 1, 1).data[0] < 128);
  return { out: dark(PAD.left - 4), in: dark(PAD.left + 4) };
}

describe('세로축 눈금 방향', () => {
  it('바깥', () => expect(inkAt('out')).toEqual({ out: true, in: false }));
  it('안쪽', () => expect(inkAt('in')).toEqual({ out: false, in: true }));
  it('없음', () => expect(inkAt('none')).toEqual({ out: false, in: false }));
  it('가로지름', () => expect(inkAt('cross')).toEqual({ out: true, in: true }));
});
