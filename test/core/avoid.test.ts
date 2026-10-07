// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { Obstacles, segmentHitsBox } from '../../src/core/canvas/avoid';

const box = { left: 10, right: 20, top: 10, bottom: 20 };

describe('segmentHitsBox', () => {
  it('상자를 가로지르는 선분', () => {
    expect(segmentHitsBox(0, 15, 30, 15, box)).toBe(true);
    expect(segmentHitsBox(0, 0, 30, 30, box)).toBe(true);
  });
  it('상자 안에서 끝나는 선분', () => {
    expect(segmentHitsBox(15, 15, 40, 40, box)).toBe(true);
  });
  it('비켜 가는 선분', () => {
    expect(segmentHitsBox(0, 25, 30, 25, box)).toBe(false);
    expect(segmentHitsBox(0, 0, 9, 30, box)).toBe(false);
    expect(segmentHitsBox(25, 0, 40, 30, box)).toBe(false);
  });
});

describe('Obstacles', () => {
  it('선분은 pad 만큼 두껍게 본다', () => {
    const o = new Obstacles().addSegment(0, 23, 30, 23, 4);
    expect(o.hits(box)).toBe(1);
    expect(new Obstacles().addSegment(0, 23, 30, 23, 1).hits(box)).toBe(0);
  });
  it('상자·원·꺾은선을 센다', () => {
    const o = new Obstacles()
      .addCircle(15, 15, 2)
      .addBox({ left: 100, right: 110, top: 0, bottom: 5 })
      .addPolyline([[0, 0], [5, 5], [16, 16]]);
    expect(o.boxHits(box)).toBe(1);
    expect(o.segmentHits(box)).toBe(1);
    expect(o.hits({ left: 200, right: 210, top: 200, bottom: 210 })).toBe(0);
  });
});
