// © 2026 김용현
// 편차 막대 — 0을 기준으로 위아래로 자라는지 검증한다.
//
// 기존 동작은 막대가 "축 바닥"에서 자란다. 축이 음수까지 내려가는 편차
// 그래프에서는 막대가 허공에 떠 있는 꼴이 되어 원본 시험지와 다르다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import {
  renderAbsBarGraph,
  createDefaultAbsBarData,
  createDefaultGraphOptions,
} from '../../src/core/index';

const W = 400;
const H = 300;
/** AbsBarGraph 의 세로 막대 여백 (제목·범례·출처·각주 없음) */
const PAD = { top: 50, right: 60, bottom: 70, left: 130 };

function render(zeroBaseline: boolean) {
  const data = createDefaultAbsBarData();
  data.categories = [
    { label: 'A', values: [100] },
    { label: 'B', values: [-100] },
  ];
  data.seriesLabels = ['편차'];
  data.yRange = { min: -300, max: 300, auto: false, step: 100 };
  data.zeroBaseline = zeroBaseline;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  renderAbsBarGraph(ctx, W, H, data, {
    ...createDefaultGraphOptions(),
    showLegend: false,
    title: '',
  });
  return canvas.getContext('2d').getImageData(0, 0, W, H).data;
}

function isDark(px: Uint8ClampedArray, x: number, y: number) {
  const i = (y * W + x) * 4;
  return px[i] < 120 && px[i + 1] < 120 && px[i + 2] < 120;
}

/** 두 번째 범주(B)의 막대 중심 x */
const plotW = W - PAD.left - PAD.right;
const catArea = plotW / 2;
const bCenterX = Math.round(PAD.left + catArea * 1 + catArea / 2);
/** 0 이 놓이는 y — 축이 -300~300 이라 플롯 한가운데 */
const zeroY = Math.round(PAD.top + (H - PAD.top - PAD.bottom) / 2);
/** 플롯 바닥 바로 위 */
const nearBottomY = H - PAD.bottom - 10;

describe('AbsBarGraph zeroBaseline', () => {
  it('음수 막대가 0선에서 아래로 자란다', () => {
    const px = render(true);

    expect(isDark(px, bCenterX, zeroY + 15)).toBe(true);
  });

  it('음수 막대가 축 바닥까지 내려가지 않는다', () => {
    const px = render(true);

    expect(isDark(px, bCenterX, nearBottomY)).toBe(false);
  });

  it('0선을 그린다', () => {
    const px = render(true);

    // 막대가 없는 곳(플롯 왼쪽 가장자리 근처)에도 0선이 지나간다
    expect(isDark(px, PAD.left + 6, zeroY)).toBe(true);
  });

  it('지정하지 않으면 기존대로 축 바닥에서 자란다', () => {
    const px = render(false);

    expect(isDark(px, bCenterX, nearBottomY)).toBe(true);
  });
});
