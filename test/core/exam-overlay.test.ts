// © 2026 김용현
// 겹침 비교용 그림 — EXAM_OVERLAY_OUT=<폴더> 일 때만 PNG 를 쓴다. 평소에는 «그려진다» 만 본다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clearCanvas, createDefaultGraphOptions } from '../../src/core/index';
import { OVERLAY_CASES } from './exam-overlay-cases';

const OUT = process.env.EXAM_OVERLAY_OUT;

describe('시험지 자료 다시 그리기', () => {
  it.each(OVERLAY_CASES.map((c) => [c.sample, c] as const))('%s', (_n, c) => {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    clearCanvas(ctx, 800, 600);
    c.render(ctx, 800, 600, c.data() as never, { ...createDefaultGraphOptions('exam'), ...c.options });
    const png = canvas.toBuffer('image/png');
    expect(png.length).toBeGreaterThan(1000);
    if (OUT) {
      if (!existsSync(OUT)) mkdirSync(OUT); // 한 칸만 — 한글 경로
      writeFileSync(join(OUT, `${c.dir}-${c.sample}.png`), png);
    }
  });
});
