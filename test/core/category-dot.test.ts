// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import {
  renderCategoryDotGraph,
  createDefaultCategoryDotData,
  createDefaultGraphOptions,
} from '../../src/core/index';

const W = 400;
const H = 300;

/**
 * 렌더러가 쓰는 여백 — CategoryDotGraph 와 같은 값이어야 한다.
 * 제목·범례·출처·각주가 없을 때 기준.
 */
const PAD = { top: 50, right: 60, bottom: 70, left: 130 };
const DOT_R = 6;

function renderAtMax(value: number) {
  const data = createDefaultCategoryDotData();
  data.categories = [{ label: 'A', values: [value] }];
  data.seriesLabels = ['값'];
  data.dotRadius = DOT_R;
  // 최댓값과 데이터가 정확히 같은 상황 — 점 중심이 위쪽 테두리에 놓인다
  data.yRange = { min: 0, max: value, auto: false, step: value / 5 };

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  renderCategoryDotGraph(ctx, W, H, data, {
    ...createDefaultGraphOptions(),
    showLegend: false,
    title: '',
  });
  return canvas.getContext('2d').getImageData(0, 0, W, H).data;
}

/** (x, y) 픽셀이 검은색에 가까운가 */
function isDark(px: Uint8ClampedArray, x: number, y: number) {
  const i = (y * W + x) * 4;
  return px[i] < 100 && px[i + 1] < 100 && px[i + 2] < 100;
}

describe('CategoryDotGraph', () => {
  it('축 최댓값과 같은 값도 점이 잘리지 않는다', () => {
    const px = renderAtMax(25);

    const plotW = W - PAD.left - PAD.right;
    const centerX = PAD.left + plotW / 2; // 범주가 하나면 플롯 한가운데
    const frameTop = PAD.top;

    // 점 중심이 frameTop 에 있으므로, 잘리지 않았다면 그 위로도 점이 그려져 있어야 한다.
    // (frameTop 자체는 테두리 선이라 항상 검다 — 그보다 위를 본다.)
    const above = [];
    for (let dy = 2; dy <= DOT_R - 1; dy++) {
      above.push(isDark(px, Math.round(centerX), frameTop - dy));
    }

    expect(above.some(Boolean)).toBe(true);
  });

  it('테두리 한참 위쪽까지 번지지는 않는다', () => {
    const px = renderAtMax(25);
    const plotW = W - PAD.left - PAD.right;
    const centerX = Math.round(PAD.left + plotW / 2);

    // 점 반지름보다 훨씬 위는 여전히 비어 있어야 한다
    expect(isDark(px, centerX, PAD.top - DOT_R - 6)).toBe(false);
  });
});
