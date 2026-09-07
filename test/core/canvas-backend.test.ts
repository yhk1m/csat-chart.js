// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';

describe('canvas 백엔드', () => {
  it('캔버스에 도형을 그리고 PNG 버퍼를 만든다', () => {
    const canvas = createCanvas(100, 50);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 100, 50);
    ctx.fillStyle = '#000';
    ctx.fillRect(10, 10, 30, 20);

    const buf = canvas.toBuffer('image/png');

    // PNG 매직 넘버 확인
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(buf.length).toBeGreaterThan(100);
  });

  it('같은 입력에 같은 출력을 낸다 (결정적)', () => {
    const draw = () => {
      const c = createCanvas(80, 40);
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, 80, 40);
      x.beginPath();
      x.arc(40, 20, 15, 0, Math.PI * 2);
      x.fill();
      return c.toBuffer('image/png');
    };

    expect(draw().equals(draw())).toBe(true);
  });
});
