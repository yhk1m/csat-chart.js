// © 2026 김용현
import { type Padding, type FontOptions, textFont, textSize } from './renderer';
import { styleOf, tickLabelGap, type StyleTokens, type TickDir } from './style';
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
  /**
   * 눈금 숫자의 부호 — `'minus'` 는 음수만 −4 (U+2212), `'both'` 는 +4 · −4.
   * 미지정·false 면 1.7.0 처럼 그대로 (-4).
   */
  signed?: false | 'minus' | 'both';
}

interface XAxisParams extends AxisOptions {
  labels: string[];
  indices?: number[];
  /** 눈금 표시 방향 — 미지정이면 바깥(1.7.0) */
  tickDir?: TickDir;
  /** 라벨을 이만큼 더 내린다 — 달 숫자처럼 범주 이름 구실을 하는 라벨 (`StyleTokens.categoryGap`) */
  extraGap?: number;
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
  fonts, tickFontSize: tickBase, labelFontSize,
  drawGrid = false,
  gridColor,
  gridWidth,
  tickDir = 'out',
  signed = false,
}: YAxisParams) {
  // 렌더러는 fontSize.tick 을 넘긴다 — 눈금 숫자 크기(fontSize.tickNumber)는 여기서 적용한다 (2.4.1).
  // 예전에는 꺾은선·막대 등 이 함수로 그리는 세로축만 tickNumber 를 무시했다
  const tickFontSize = textSize(fonts, 'tick', tickBase);
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
  /** 눈금 숫자 열의 왼쪽 끝 (왼쪽 축) — 단위 자리를 정한다 */
  let tickLeft = x;

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
      const text = signed ? signedTick(val, signed === 'both') : formatTick(val);
      const at = yTickLabelAt(ctx, fonts, x, side, tickDir, y, plot.y + plot.h);
      const tx = at ? at.x : side === 'left' ? x - tickGap : x + tickGap;
      if (at) {
        ctx.textBaseline = at.baseline;
        ctx.fillText(text, at.x, at.y);
        ctx.textBaseline = 'middle';
      } else {
        ctx.fillText(text, tx, y);
      }
      if (side === 'left') tickLeft = Math.min(tickLeft, tx - ctx.measureText(text).width);
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
    const examLeft = side === 'left' ? yUnitLeft(fonts, x, tickLeft) : null;
    if (examLeft !== null) ctx.textAlign = 'left';
    const labelX = examLeft ?? (side === 'left' ? x - tickGap : x + tickGap);
    const at = nudgeInside(ctx, label, labelX, plot.y - tickFontSize * 0.5 - 8, width, height);
    ctx.fillText(label, at.x, at.y);
    ctx.restore();
  }
}

/**
 * 세로축 단위 「(%)」·「(°C)」 의 아랫변 y (textBaseline 'bottom'). classic 은 1.7.0 그대로 플롯 위 16px.
 * exam 은 눈금 숫자를 키우면(fontSize.tickNumber) 맨 위 숫자가 단위에 닿았다 — 숫자 크기의 절반 + 4 를
 * 띄운다 (2.4.1). 기본 크기(35)에서도 조금 올라간다.
 */
export function yUnitBottom(o: FontOptions & { fontSize?: GraphOptions['fontSize'] }, plotY: number): number {
  if (styleOf(o).name !== 'exam' || !o.fontSize) return plotY - 16;
  const px = textSize(o, 'tick', o.fontSize.tick);
  return plotY - Math.max(16, Math.round(px * 0.5 + 4));
}

/**
 * 세로축 단위가 있을 때 플롯 위 여백 (2.4.1). 단위를 키우자(눈금 숫자와 같은 명조) 제목 아래 고정 여백(100)에서
 * 「(%)」 가 제목 줄에 올라탔다. 제목 자리(64) + 단위 높이 + 단위와 플롯 사이를 더한 값과 base 중 큰 쪽.
 */
export function topWithYUnit(
  o: FontOptions & { fontSize?: GraphOptions['fontSize']; title?: string },
  base: number,
  unit: string | undefined,
): number {
  if (!unit || styleOf(o).name !== 'exam' || !o.fontSize) return base;
  const unitPx = textSize(o, 'unit', o.fontSize.tick);
  // 공용 축(drawYAxis)은 단위를 눈금 크기의 절반 + 8 위에 둔다 — 둘 중 높은 쪽으로 잰다
  const above = Math.max(0 - yUnitBottom(o, 0), textSize(o, 'tick', o.fontSize.tick) * 0.5 + 8);
  return Math.max(base, Math.ceil((o.title ? 64 : 8) + unitPx * 1.25 + above));
}

/**
 * exam 세로축(왼쪽) 단위의 왼쪽 끝 x. `tickLeft` 는 눈금 숫자 열의 왼쪽 끝.
 * classic 이면 null — 1.7.0 자리(숫자 열에 오른쪽 맞춤)를 그대로 쓴다.
 */
export function yUnitLeft(fonts: FontOptions, axisX: number, tickLeft: number): number | null {
  const u = styleOf(fonts).unitAt;
  return u ? Math.min(axisX - u.fromAxis, tickLeft - u.pastTicks) : null;
}

export function drawXAxis({
  ctx, padding, width, height,
  labels, indices,
  fonts, tickFontSize: tickBase,
  tickDir = 'out',
  extraGap = 0,
}: XAxisParams) {
  // 눈금 숫자 크기(fontSize.tickNumber)를 여기서 적용한다 (2.4.1)
  const tickFontSize = textSize(fonts, 'tick', tickBase);
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
    if (shown % stride === 0) {
      const at = xTickLabelAt(ctx, fonts, y, tickDir);
      if (at) {
        ctx.textBaseline = at.baseline;
        ctx.fillText(labels[i], cx, at.y + extraGap);
        ctx.textBaseline = 'top';
      } else {
        ctx.fillText(labels[i], cx, y + tickLabelGap(t, tickDir) + extraGap);
      }
    }
    shown++;
  }
}

/** 지금 글꼴의 숫자 잉크 높이 (기준선 위) */
function digitAscent(ctx: CanvasRenderingContext2D): number {
  const keep = ctx.textBaseline;
  ctx.textBaseline = 'alphabetic';
  const a = ctx.measureText('0').actualBoundingBoxAscent;
  ctx.textBaseline = keep;
  return a;
}

/** 눈금 선이 축 바깥으로 뻗은 길이 */
function outReach(t: StyleTokens, dir: TickDir): number {
  return dir === 'out' ? t.line.tickLen : dir === 'cross' ? t.line.tickLen / 2 : 0;
}

/**
 * 가로축 숫자 자리 — **잉크 위**를 축 아래 `tickText.xGap`(바깥 눈금이면 그 끝 + `pastTick`)에
 * 맞춘다. 글자 상자 위(`'top'`)로 재면 글꼴마다 잉크가 떠서 시험지보다 축에 붙거나 멀어진다.
 * 양식에 `tickText` 가 없으면(classic) null — 부르는 쪽이 1.7.0 자리를 쓴다.
 * 글꼴을 먼저 걸어 두고 부른다.
 */
export function xTickLabelAt(
  ctx: CanvasRenderingContext2D, fonts: FontOptions, axisY: number, dir: TickDir,
): { y: number; baseline: CanvasTextBaseline } | null {
  const t = styleOf(fonts);
  const tt = t.tickText;
  if (!tt) return null;
  const inkTop = axisY + t.line.axis / 2 + Math.max(tt.xGap, outReach(t, dir) + tt.pastTick);
  return { y: inkTop + digitAscent(ctx), baseline: 'alphabetic' };
}

/**
 * 세로축 숫자 자리 — 잉크 가운데를 눈금에 맞추고, 축에서 `tickText.yGap` 띄운다.
 * `bottomY`(가로축)를 주면 맨 아래 숫자가 가로축 숫자와 `pastTick` 이상 떨어지게
 * 올린다 — 시험지 「0」 이 「1990」 위에 얹히지 않는 자리 (2027_09 korgeo-q8).
 * classic 은 null. 글꼴을 먼저 걸어 두고 부른다.
 */
export function yTickLabelAt(
  ctx: CanvasRenderingContext2D, fonts: FontOptions, axisX: number, side: 'left' | 'right',
  dir: TickDir, tickY: number, bottomY?: number,
): { x: number; y: number; baseline: CanvasTextBaseline } | null {
  const t = styleOf(fonts);
  const tt = t.tickText;
  if (!tt) return null;
  const off = t.line.axis / 2 + Math.max(tt.yGap, outReach(t, dir) + tt.pastTick);
  let y = tickY + digitAscent(ctx) / 2;
  if (bottomY != null) y = Math.min(y, bottomY + t.line.axis / 2 + tt.xGap - tt.pastTick);
  return { x: side === 'left' ? axisX - off : axisX + off, y, baseline: 'alphabetic' };
}

function formatTick(val: number): string {
  if (Number.isInteger(val)) return val.toString();
  return val.toFixed(1);
}

/** (+)4 · 0 · −4 (빼기는 U+2212 — 시험지 꼴). plus 가 false 면 양수에 + 를 붙이지 않는다 */
function signedTick(val: number, plus: boolean): string {
  const s = formatTick(Math.abs(val));
  return val > 0 ? (plus ? `+${s}` : s) : val < 0 ? `−${s}` : s;
}
