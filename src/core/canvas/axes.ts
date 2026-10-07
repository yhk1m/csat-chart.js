// © 2026 김용현
import { type Padding, type FontOptions, textFont, textSize } from './renderer';
import { styleOf, tickLabelGap, type TickDir } from './style';
import type { GraphOptions } from '../types/common';
import { labelStride, widestLabel } from './labels';
import { EDGE, nudgeInside, shrinkToWidth } from './fit';

interface AxisOptions {
  ctx: CanvasRenderingContext2D;
  padding: Padding;
  width: number;
  height: number;
  /** 글꼴 옵션. `options` 를 그대로 넘긴다. */
  fonts: FontOptions & { fontSize?: GraphOptions['fontSize'] };
  tickFontSize: number;
  labelFontSize: number;
}

interface YAxisParams extends AxisOptions {
  min: number;
  max: number;
  step: number;
  label: string;
  side: 'left' | 'right';
  drawGrid?: boolean;
  /** 격자선 색 — 미지정이면 양식의 격자 색 (classic #ccc) */
  gridColor?: string;
  /** 격자선 굵기(px) — 미지정이면 양식의 격자 굵기 (classic 0.5) */
  gridWidth?: number;
  /** 눈금 표시 방향 — 미지정이면 바깥(1.7.0). 렌더러는 tickDirOf 로 정해 넘긴다 */
  tickDir?: TickDir;
  /** 눈금 숫자에 부호를 붙인다 (+4 · −4) — 범주 점 그래프 시험지 꼴 */
  signed?: boolean;
}

interface XAxisParams extends AxisOptions {
  labels: string[];
  indices?: number[];
  /** 눈금 표시 방향 — 미지정이면 바깥(1.7.0) */
  tickDir?: TickDir;
}

const plotArea = (p: Padding, w: number, h: number) => ({
  x: p.left,
  y: p.top,
  w: w - p.left - p.right,
  h: h - p.top - p.bottom,
});

export function drawYAxis({
  ctx, padding, width, height,
  min, max, step, label, side,
  fonts, tickFontSize, labelFontSize,
  drawGrid = false,
  gridColor,
  gridWidth,
  tickDir = 'out',
  signed = false,
}: YAxisParams) {
  const plot = plotArea(padding, width, height);
  const t = styleOf(fonts);
  const tickLen = t.line.tickLen;
  const tickGap = tickLabelGap(t, tickDir);
  const x = side === 'left' ? plot.x : plot.x + plot.w;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  ctx.beginPath();
  ctx.moveTo(x, plot.y);
  ctx.lineTo(x, plot.y + plot.h);
  ctx.stroke();

  // 눈금 숫자
  ctx.fillStyle = '#000';
  ctx.font = textFont(fonts, 'tick', tickFontSize);
  ctx.textBaseline = 'middle';
  ctx.textAlign = side === 'left' ? 'right' : 'left';

  // 눈금 값 배열 생성: min부터 step 간격, max는 항상 포함
  const ticks: number[] = [];
  for (let val = min; val < max - step * 1e-9; val += step) {
    ticks.push(Math.abs(val) < 1e-9 ? 0 : val);
  }
  if (ticks.length === 0 || Math.abs(ticks[ticks.length - 1] - max) > 1e-9) {
    ticks.push(max);
  }

  const stride = labelStride(plot.h / Math.max(1, ticks.length - 1), tickFontSize * 1.1);

  for (let i = 0; i < ticks.length; i++) {
    const val = ticks[i];
    const y = plot.y + plot.h - ((val - min) / (max - min)) * plot.h;

    // 눈금 선 — 바깥은 1.7.0 과 같은 순서로 긋는다(classic 바이트)
    if (tickDir !== 'none') {
      ctx.lineWidth = t.line.tick;
      ctx.beginPath();
      if (tickDir === 'out') {
        if (side === 'left') { ctx.moveTo(x - tickLen, y); ctx.lineTo(x, y); }
        else { ctx.moveTo(x, y); ctx.lineTo(x + tickLen, y); }
      } else if (tickDir === 'in') {
        const s = side === 'left' ? 1 : -1;
        ctx.moveTo(x, y); ctx.lineTo(x + s * tickLen, y);
      } else {
        ctx.moveTo(x - tickLen / 2, y); ctx.lineTo(x + tickLen / 2, y);
      }
      ctx.stroke();
    }

    // 격자선
    if (drawGrid && i > 0 && i < ticks.length - 1) {
      ctx.save();
      ctx.strokeStyle = gridColor ?? t.line.gridColor;
      ctx.lineWidth = gridWidth ?? t.line.grid;
      ctx.setLineDash(t.line.gridDash);
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.w, y);
      ctx.stroke();
      ctx.restore();
    }

    // 숫자 — 서로 붙으면 몇 개 걸러 그린다 (눈금선은 그대로)
    if (i % stride === 0) {
      const tx = side === 'left' ? x - tickGap : x + tickGap;
      ctx.fillText(signed ? signedTick(val) : formatTick(val), tx, y);
    }
  }

  // 축 라벨 (축 상단, 숫자 열에 맞춤)
  //
  // 이 글자는 플롯 **위 여백**에 떠 있다 — 옆으로 밀거나 조금 내려도 자료를
  // 가리지 않는다. 그래서 캔버스를 벗어날 때는 플롯을 줄이는 대신 안으로 민다.
  // (「(°C)」의 여는 괄호가 위로 3.2px, 「월평균 기온(°C)」 같은 긴 이름이
  //  왼쪽으로 72.9px 넘던 자리다.)
  if (label) {
    ctx.save();
    const makeFont = (size: number) => textFont(fonts, 'unit', size);
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = side === 'left' ? 'right' : 'left';
    // 캔버스보다 넓은 이름은 밀어서 될 일이 아니다 — 글꼴부터 줄인다
    const unitSize = textSize(fonts, 'unit', labelFontSize);
    ctx.font = makeFont(shrinkToWidth(ctx, [label], unitSize, width - EDGE * 2, makeFont));
    const labelX = side === 'left' ? x - tickGap : x + tickGap;
    const at = nudgeInside(ctx, label, labelX, plot.y - tickFontSize * 0.5 - 8, width, height);
    ctx.fillText(label, at.x, at.y);
    ctx.restore();
  }
}

export function drawXAxis({
  ctx, padding, width, height,
  labels, indices,
  fonts, tickFontSize,
  tickDir = 'out',
}: XAxisParams) {
  const plot = plotArea(padding, width, height);
  const t = styleOf(fonts);
  const y = plot.y + plot.h;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  ctx.beginPath();
  ctx.moveTo(plot.x, y);
  ctx.lineTo(plot.x + plot.w, y);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = textFont(fonts, 'tick', tickFontSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const showIndices = indices ?? labels.map((_, i) => i);
  const slotWidth = plot.w / labels.length;
  // 범주 이름이 서로 붙으면 몇 개 걸러 그린다 (눈금선은 그대로)
  const stride = labelStride(slotWidth, widestLabel(ctx, labels));
  let shown = 0;

  for (const i of showIndices) {
    if (i < 0 || i >= labels.length) continue;
    const cx = plot.x + slotWidth * i + slotWidth / 2;

    // 눈금선
    if (tickDir !== 'none') {
      const L = t.line.tickLen;
      ctx.lineWidth = t.line.tick;
      ctx.beginPath();
      if (tickDir === 'out') { ctx.moveTo(cx, y); ctx.lineTo(cx, y + L); }
      else if (tickDir === 'in') { ctx.moveTo(cx, y); ctx.lineTo(cx, y - L); }
      else { ctx.moveTo(cx, y - L / 2); ctx.lineTo(cx, y + L / 2); }
      ctx.stroke();
    }

    // 라벨
    if (shown % stride === 0) ctx.fillText(labels[i], cx, y + tickLabelGap(t, tickDir));
    shown++;
  }
}

function formatTick(val: number): string {
  if (Number.isInteger(val)) return val.toString();
  return val.toFixed(1);
}

/** +4 · 0 · −4 (빼기는 U+2212 — 시험지 꼴) */
function signedTick(val: number): string {
  const s = formatTick(Math.abs(val));
  return val > 0 ? `+${s}` : val < 0 ? `−${s}` : s;
}
