// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';

describe('개발 환경', () => {
  it('vitest 가 돈다', () => {
    expect(1 + 1).toBe(2);
  });

  it('@napi-rs/canvas 로 PNG 버퍼를 만든다', () => {
    const canvas = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 20, 20);
    const buf = canvas.toBuffer('image/png');
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});
