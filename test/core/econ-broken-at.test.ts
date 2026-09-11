// © 2026 김용현
// 경제 좌표평면 — 물결(축 생략 기호 `≈`) 자리를 자료가 정한다.
//
// 자리를 «값» 으로 적는다(`xAxis.brokenAt`). 안 적으면 원점과 첫 눈금의
// 한가운데라는 기존 자리가 그대로여야 하고, 축 밖 값은 축 안으로 잘려야 한다 —
// 물결은 축 «위» 의 기호라 축 밖에 놓을 자리가 없다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import {
  renderEconPlane,
  createDefaultGraphOptions,
  type EconPlaneData,
} from '../../src/core/index';

const W = 400;
const H = 300;

/** 고용 지표 모양 — 두 축 모두 0 에서 시작하지 않아 물결이 선다 */
function dataWith(patch: Partial<EconPlaneData['xAxis']>, broken = true): EconPlaneData {
  return {
    quadrants: 'first',
    xAxis: { label: '참가율', min: 66, max: 86, ticks: [72, 80], broken, ...patch },
    yAxis: { label: '고용률', min: 48, max: 68, ticks: [54, 60, 64], broken: false },
    grid: false,
    dash: 'dashed',
    lines: [],
    points: [],
    arrows: [],
  };
}

function render(data: EconPlaneData) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  renderEconPlane(ctx, W, H, data, { ...createDefaultGraphOptions(), title: '' });
  return canvas.getContext('2d').getImageData(0, 0, W, H).data;
}

const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

function isDark(px: Uint8ClampedArray, x: number, y: number) {
  const i = (y * W + x) * 4;
  return px[i] < 120 && px[i + 1] < 120 && px[i + 2] < 120;
}

/**
 * 물결이 선 x 를 찾는다.
 *
 * 물결은 축선을 흰색으로 끊고 그 자리에 얹힌다. 그래서 «가로축 줄에서 가장 긴
 * 흰 토막» 의 한가운데가 곧 물결 자리다. 축 줄은 아래 절반에서 검은 점이 가장
 * 많은 줄로 찾는다 — 여백을 셈으로 박아 두지 않으려는 뜻이다.
 */
function breakX(px: Uint8ClampedArray): number {
  let axisY = -1;
  let best = -1;
  for (let y = Math.floor(H / 2); y < H; y++) {
    let n = 0;
    for (let x = 0; x < W; x++) if (isDark(px, x, y)) n++;
    if (n > best) { best = n; axisY = y; }
  }
  const xs: number[] = [];
  for (let x = 0; x < W; x++) if (isDark(px, x, axisY)) xs.push(x);
  const left = xs[0];
  const right = xs[xs.length - 1];

  let run = 0;
  let runStart = 0;
  let gap = { len: 0, start: 0 };
  for (let x = left; x <= right; x++) {
    if (isDark(px, x, axisY)) {
      run = 0;
      continue;
    }
    if (run === 0) runStart = x;
    run++;
    if (run > gap.len) gap = { len: run, start: runStart };
  }
  return gap.start + gap.len / 2;
}

describe('EconPlane brokenAt', () => {
  it('적지 않으면 원점과 첫 눈금의 한가운데 — 기존 자리 그대로다', () => {
    const a = render(dataWith({}));
    const b = render(dataWith({ brokenAt: undefined }));

    expect(same(a, b)).toBe(true);
  });

  it('적으면 그 값 자리로 옮긴다', () => {
    const base = render(dataWith({}));
    const moved = render(dataWith({ brokenAt: 71 }));

    expect(same(base, moved)).toBe(false);
    // 기본 자리는 66(원점)과 첫 눈금 72 의 한가운데라 69 쯤이다. 71 은 그보다
    // 오른쪽이어야 한다.
    expect(breakX(moved)).toBeGreaterThan(breakX(base));
  });

  it('큰 값은 축 오른쪽 끝으로 잘린다', () => {
    const huge = render(dataWith({ brokenAt: 1e6 }));
    const atMax = render(dataWith({ brokenAt: 86 }));

    expect(same(huge, atMax)).toBe(true);
  });

  it('작은 값은 축 왼쪽 끝으로 잘린다', () => {
    const tiny = render(dataWith({ brokenAt: -1e6 }));
    const atMin = render(dataWith({ brokenAt: 66 }));

    expect(same(tiny, atMin)).toBe(true);
  });

  it('숫자가 아닌 값은 적지 않은 것과 같다', () => {
    const base = render(dataWith({}));

    expect(same(render(dataWith({ brokenAt: NaN })), base)).toBe(true);
    expect(same(render(dataWith({ brokenAt: Infinity })), base)).toBe(true);
  });

  it('물결을 끄면 자리를 적어도 그림이 바뀌지 않는다', () => {
    const off = render(dataWith({}, false));
    const offWithAt = render(dataWith({ brokenAt: 84 }, false));

    expect(same(off, offWithAt)).toBe(true);
  });
});
