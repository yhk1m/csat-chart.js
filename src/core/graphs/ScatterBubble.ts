// © 2026 김용현
import { type ScatterGraphData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, autoRange, fillTextMultiline, textFont, textSize, type FontOptions } from '../canvas/renderer';
import { textCtx } from '../canvas/parens';
import { legendSideOf } from '../canvas/legend';
import { xTickLabelAt, yTickLabelAt, yUnitLeft } from '../canvas/axes';
import { styleOf, byStyle, labelPlace, leaderOf, tickDirOf, type StyleTokens, type TickDir } from '../canvas/style';
import { drawTitle, drawSourceAndFootnote, sourceFootnoteReserve, LabelPlacer, labelStride, widestLabel, type LabelBox } from '../canvas/labels';
import { EDGE, clampLinesMiddle, drawFloatingLabel, fillLines, fontSizeOf, inkExtent, nudgeInside, shrinkToWidth, textExtent, widestLine, wrapToWidth } from '../canvas/fit';

const LOOK = {
  classic: {
    frameGrid: { color: '#333', width: 1, dash: [5, 4] }, // examFrame:true 의 격자
    tickW: 1,
    crossW: 1.5,          // 편차 모드 0 십자선
    dotR: 4,
    bubbleW: 1.5, bubbleStroke: '#333', bubbleFill: 'rgba(80,80,80,0.3)',
    valueInk: '#555',
    legendBox: { color: '#666', width: 1.5, radius: 4 },
    leaderDash: [3, 2],   // 거품 크기 범례의 유도선 — 색·굵기는 CLASSIC_LEADER
    boxedLabelW: 1.2,
    closedFrame: false,
    stackYName: false,
  },
  exam: {
    frameGrid: { color: '#000', width: 1.45, dash: [7.6, 4.7] },
    tickW: 1.9,
    crossW: 1.75,
    dotR: 7,              // 지름 2.9pt (§3 #40)
    bubbleW: 4.0, bubbleStroke: '#000', bubbleFill: 'transparent', // 원 테두리 0.83pt, 채움 없음 (#39)
    valueInk: '#000',
    legendBox: { color: '#000', width: 1.45, radius: 0 },
    leaderDash: [7.6, 4.7], // 색·굵기는 t.leader
    boxedLabelW: 1.45,
    // 표본 셋 모두 닫힌 틀에 눈금 표시가 없고, 세로 축 이름은 한 자씩 쌓는다 (§1.4, §2 scatter)
    closedFrame: true,
    stackYName: true,
  },
};

/** 눈금 한 줄이 축에서 [a, b] 만큼 — 바깥 +, 안쪽 − (가로축 기준) */
function tickSeg(t: StyleTokens, d: TickDir): [number, number] {
  const L = t.line.tickLen;
  return d === 'out' ? [0, L] : d === 'in' ? [-L, 0] : d === 'cross' ? [-L / 2, L / 2] : [0, 0];
}

/** 1.7.0 거품 크기 범례 유도선 — classic 에서만. exam 은 t.leader */
const CLASSIC_LEADER = { color: '#666', width: 1 };

export function renderScatterGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ScatterGraphData,
  options: GraphOptions
) {
  // exam 은 괄호를 명조로 따로 찍는다 — 이 아래 모든 글자 그리기·재기가 이 ctx 를 거친다
  ctx = textCtx(ctx, options);
  clearCanvas(ctx, w, h);

  if (data.mode === 'deviation') {
    renderDeviation(ctx, w, h, data, options);
  } else if (renderNormal(ctx, w, h, data, options) === 'blocked') {
    // exam: 플롯 안 어느 모서리도 버블을 덮지 않고는 범례를 못 놓는다 — 플롯을 줄여 바깥에.
    // 쪽은 options.legendPosition 이고, 적지 않으면 2.1.0 이전처럼 오른쪽이다
    clearCanvas(ctx, w, h);
    if (legendSideOf(options, 'right') === 'bottom') renderNormal(ctx, w, h, data, options, true);
    else renderNormal(ctx, w, h, { ...data, bubbleLegendPosition: 'outside-right' }, options);
  }
}

// ── 일반 산점도/버블 ──────────────────────────────────

function renderNormal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ScatterGraphData,
  options: GraphOptions,
  /** 범례를 플롯 아래(가로축 이름 밑)에 둔다 — exam 에서 모서리가 다 막히고 legendPosition 이 'bottom' 일 때 */
  below = false,
): 'blocked' | void {
  const fs = options.fontSize;
  const t = styleOf(options);
  const look = byStyle(options, LOOK);
  const tickPx = textSize(options, 'tick', fs.tick);
  const axisPx = textSize(options, 'axisName', fs.axisLabel);
  const dir = tickDirOf(options, { x: 'none', y: 'none' });
  // 시험지는 닫힌 틀이 기본 — examFrame 을 직접 주면 그것을 따른다
  const examFrame = data.examFrame ?? look.closedFrame;

  // 범례를 플롯 바깥에 둘 참이면 먼저 크기를 재서 오른쪽 여백을 확보한다.
  // 그려 놓고 자리를 잡으면 이미 늦다.
  const hasBubbleLegend = data.showBubble && data.points.length > 0;
  const outsideBelow = below && hasBubbleLegend;
  const outsideLegend = !outsideBelow && data.bubbleLegendPosition === 'outside-right' && hasBubbleLegend;
  const bubbleM = outsideLegend || outsideBelow ? bubbleLegendMetrics(ctx, data, fs, options) : null;
  const fillM = outsideLegend || outsideBelow ? measureFillLegend(ctx, data, fs, options) : { boxW: 0, boxH: 0 };
  const legendW = outsideLegend ? Math.max(bubbleM?.boxW ?? 0, fillM.boxW) : 0;
  /** 아래 범례 — 버블 크기 상자와 채움 상자를 나란히, 높은 쪽만큼 */
  const belowH = outsideBelow ? Math.max(bubbleM?.boxH ?? 0, fillM.boxH) : 0;

  // 시험지 틀은 x축 단위를 마지막 눈금 **옆**에 두므로 그만큼 오른쪽이 더 필요하다.
  // 60px 고정으로 두면 `(℃)` 가 캔버스 밖으로 밀린다.
  const examUnitW = (() => {
    if (!examFrame || !data.xUnit) return 0;
    ctx.save();
    ctx.font = textFont(options, 'unit', textSize(options, 'unit', fs.tick));
    const width = ctx.measureText(data.xUnit).width;
    ctx.restore();
    return width;
  })();

  // 축 범위 — 여백보다 **먼저** 잡는다. 눈금 숫자의 폭과 y축 이름의 폭이
  // 왼쪽 여백을 정하는데, 범위는 자료만으로 정해지므로 순환이 없다.
  const xs = data.points.map((p) => p.x);
  const ys = data.points.map((p) => p.y);
  const xAuto = autoRange(xs);
  const yAuto = autoRange(ys);
  const xMin = data.xRange.auto ? xAuto.min : data.xRange.min;
  const xMax = data.xRange.auto ? xAuto.max : data.xRange.max;
  const yMin = data.yRange.auto ? yAuto.min : data.yRange.min;
  const yMax = data.yRange.auto ? yAuto.max : data.yRange.max;
  const xStep = data.xRange.step ?? (data.xRange.auto ? xAuto.step : (xMax - xMin) / 5);
  const yStep = data.yRange.step ?? (data.yRange.auto ? yAuto.step : (yMax - yMin) / 5);

  const yName = measureYAxisName(ctx, data, w, h, yMin, yMax, yStep, fs, options);

  // 가로축에서 축 이름 윗변까지. classic 은 1.7.0 의 40. exam 은 눈금 숫자가 커서
  // 40 이면 「X축」 이 숫자를 밟는다 — 숫자 잉크 아래(글자 0.3 만큼 띄움)로 민다.
  const xNameOff = (() => {
    ctx.save();
    ctx.font = textFont(options, 'tick', tickPx);
    const at = xTickLabelAt(ctx, options, 0, dir.x);
    ctx.restore();
    return at ? Math.max(40, at.y + tickPx * 0.3) : 40;
  })();

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: legendW > 0 ? legendW + 40 : Math.max(60, examUnitW + 34),
    bottom: (() => {
      // 축 이름을 민 만큼 아래 여백도 늘린다
      let b = 90 + (xNameOff - 40);
      const notes = options.footnotes.filter(f => f.trim()).length;
      // 출처를 각주와 같은 줄에 두면(sourceInline) 줄이 하나 줄어든다
      b += sourceFootnoteReserve(options, fs.dataLabel,
        (options.source && !(options.sourceInline && notes > 0) ? 30 : 0) + notes * 22,
        { sourceInline: options.sourceInline });
      // 아래 범례 — 가로축 이름(높이 axisPx) 밑 10px 에서 시작한다. 기본 여백이 이름 아래로
      // 남겨 둔 틈(50 - axisPx)을 넘는 만큼만 더 비운다
      if (outsideBelow) b += Math.max(belowH + 16, axisPx + 10 + belowH + 16 - 50);
      return b;
    })(),
    // 130 은 「Y축」 정도를 담을 만큼이다. 이름이 길면 그만큼 더 비운다 —
    // 「1인당 지역내총생산」이 왼쪽으로 77.6px 넘던 자리다. 이미 130 으로
    // 충분하면 130 이 이겨 예전 그림이 한 픽셀도 안 움직인다.
    left: Math.max(130, yName.reserve),
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const toCanvasX = (v: number) => plotX + ((v - xMin) / (xMax - xMin)) * plotW;
  const toCanvasY = (v: number) => plotY + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // 격자선 — 시험지 틀이면 진한 점선이다
  ctx.save();
  ctx.strokeStyle = examFrame ? look.frameGrid.color : t.line.barGridColor;
  ctx.lineWidth = examFrame ? look.frameGrid.width : t.line.barGrid;
  ctx.setLineDash(examFrame ? look.frameGrid.dash : t.line.barGridDash);
  for (let v = xMin + xStep; v < xMax; v += xStep) {
    const x = toCanvasX(v);
    ctx.beginPath();
    ctx.moveTo(x, plotY);
    ctx.lineTo(x, plotY + plotH);
    ctx.stroke();
  }
  for (let v = yMin + yStep; v < yMax; v += yStep) {
    const y = toCanvasY(v);
    ctx.beginPath();
    ctx.moveTo(plotX, y);
    ctx.lineTo(plotX + plotW, y);
    ctx.stroke();
  }
  ctx.restore();

  // 축선 — 시험지 틀이면 사각 테두리로 감싼다
  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  if (examFrame) {
    ctx.strokeRect(plotX, plotY, plotW, plotH);
  } else {
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();
  }

  // X축 눈금
  ctx.fillStyle = '#000';
  ctx.font = textFont(options, 'tick', tickPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // 숫자가 서로 붙으면 몇 개 걸러 그린다 (눈금 표시는 그대로 둔다)
  const xTicks: number[] = [];
  for (let v = xMin; v <= xMax + xStep * 0.01; v += xStep) xTicks.push(v);
  const xStride = labelStride(
    plotW / Math.max(1, xTicks.length - 1),
    widestLabel(ctx, xTicks.map(formatTick)),
  );
  // 눈금 숫자는 가운데 정렬이라 마지막 것이 플롯 오른쪽 밖으로 절반 삐져나온다.
  // 시험지 틀의 x축 단위를 그 옆에 놓으려면 **실제로 그려진** 마지막 숫자의
  // 오른쪽 끝을 알아야 한다 (`30` 과 `(℃)` 가 겹치던 원인).
  let lastXLabelRight = plotX + plotW;
  xTicks.forEach((v, i) => {
    const x = toCanvasX(v);
    const [a, b] = tickSeg(t, dir.x);
    if (a !== b) {
      ctx.lineWidth = look.tickW;
      ctx.beginPath();
      ctx.moveTo(x, plotY + plotH + a);
      ctx.lineTo(x, plotY + plotH + b);
      ctx.stroke();
    }
    if (i % xStride === 0) {
      const text = formatTick(v);
      const at = xTickLabelAt(ctx, options, plotY + plotH, dir.x);
      if (at) {
        ctx.textBaseline = at.baseline;
        ctx.fillText(text, x, at.y);
        ctx.textBaseline = 'top';
      } else {
        ctx.fillText(text, x, plotY + plotH + 10);
      }
      lastXLabelRight = Math.max(lastXLabelRight, x + ctx.measureText(text).width / 2);
    }
  });

  // Y축 눈금
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + yStep * 0.01; v += yStep) yTicks.push(v);
  const yStride = labelStride(plotH / Math.max(1, yTicks.length - 1), tickPx * 1.1);
  // 축 이름이 눈금 숫자를 밟지 않도록, 가장 넓은 숫자만큼 밀어낼 거리를 재 둔다
  // (여백을 정할 때 이미 잰 값이다 — 같은 것을 두 번 세지 않는다)
  const yTickTextW = yName.tickW;
  /** 눈금 숫자 열의 왼쪽 끝 — exam 세로축 단위 자리 */
  let yTickLeft = plotX;
  yTicks.forEach((v, i) => {
    const y = toCanvasY(v);
    const [a, b] = tickSeg(t, dir.y);
    if (a !== b) {
      ctx.lineWidth = look.tickW;
      ctx.beginPath();
      ctx.moveTo(plotX - b, y);
      ctx.lineTo(plotX - a, y);
      ctx.stroke();
    }
    if (i % yStride === 0) {
      const at = yTickLabelAt(ctx, options, plotX, 'left', dir.y, y, plotY + plotH);
      if (at) {
        ctx.textBaseline = at.baseline;
        ctx.fillText(formatTick(v), at.x, at.y);
        ctx.textBaseline = 'middle';
      } else {
        ctx.fillText(formatTick(v), plotX - 10, y);
      }
      yTickLeft = Math.min(yTickLeft, (at ? at.x : plotX - 10) - ctx.measureText(formatTick(v)).width);
    }
  });

  // 축 라벨
  ctx.font = textFont(options, 'axisName', axisPx);

  // X축 라벨 (하단 중앙) — 플롯 가운데에 놓이므로 캔버스 양쪽으로 넘칠 수 있다
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  drawFloatingLabel(ctx, data.xLabel, plotX + plotW / 2, plotY + plotH + xNameOff, w, h,
    axisPx, (size) => textFont(options, 'axisName', size));
  ctx.font = textFont(options, 'axisName', axisPx);

  // X축 단위 — 시험지 틀이면 마지막 눈금 옆(`4(℃)` 꼴),
  // 아니면 기존대로 축 이름과 같은 줄 오른쪽 끝
  if (data.xUnit) {
    if (examFrame) {
      ctx.font = textFont(options, 'unit', textSize(options, 'unit', fs.tick));
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      // 마지막 눈금 숫자 오른쪽 끝에서 한 칸 띄운다
      ctx.fillText(data.xUnit, lastXLabelRight + 6, plotY + plotH + 10);
      ctx.font = textFont(options, 'axisName', axisPx);
    } else {
      ctx.font = textFont(options, 'unit', textSize(options, 'unit', fs.axisLabel));
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(data.xUnit, plotX + plotW + 10, plotY + plotH + xNameOff);
    }
  }

  // Y축 단위 (상단 끝) — 플롯 위 여백에 떠 있다
  if (data.yUnit) {
    const examLeft = yUnitLeft(options, plotX, yTickLeft);
    ctx.textAlign = examLeft === null ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    drawFloatingLabel(ctx, data.yUnit, examLeft ?? plotX - 10, plotY - 16, w, h,
      textSize(options, 'unit', fs.axisLabel), (size) => textFont(options, 'unit', size));
  }

  // Y축 라벨 (Y축 중간) — 왼쪽 여백은 이미 이 이름 몫만큼 비워 두었다
  ctx.font = textFont(options, 'axisNameV', yName.size);
  ctx.textAlign = yName.stacked ? 'center' : 'right';
  ctx.textBaseline = 'middle';
  const yNameLineH = yName.size * (yName.stacked ? STACK_LINE : 1.3);
  fillLines(ctx, yName.lines, plotX - 18 - yTickTextW - (yName.stacked ? yName.nameW / 2 : 0),
    clampLinesMiddle(ctx, yName.lines, plotY + plotH / 2, yNameLineH, h), yNameLineH);
  ctx.font = textFont(options, 'axisName', axisPx);

  // 데이터 포인트 — exam 은 글자가 커서 점 이름이 플롯 안 범례 상자에 닿는다.
  // 범례 자리는 버블만 보고 정하므로 미리 셈해 이름이 비키게 한다(classic 은 1.7.0 그대로).
  const legendAvoid = byStyle(options, { classic: false, exam: true })
    && !outsideLegend && !outsideBelow && data.showBubble && data.points.length > 0
    ? insideLegendBoxes(ctx, data, plotX, plotY, plotW, plotH, fs, options,
      bubbleRects(data, toCanvasX, toCanvasY, look.dotR))
    : [];
  // exam: 범례 상자(둘레 6px 포함)가 버블·점을 하나라도 덮으면 이 그림을 버리고 바깥 범례로 다시 그린다
  if (legendAvoid.length > 0) {
    const dots = bubbleRects(data, toCanvasX, toCanvasY, look.dotR);
    const covers = legendAvoid.some((b) => dots.some((r) =>
      r.x1 > b.left && r.x0 < b.right && r.y1 > b.top && r.y0 < b.bottom));
    if (covers) return 'blocked';
  }
  drawPoints(ctx, data, toCanvasX, toCanvasY, fs, options, options.showDataLabels,
    { left: plotX, right: plotX + plotW, top: plotY, bottom: plotY + plotH }, w, h, legendAvoid);

  // 버블 크기 범례
  if (outsideLegend) {
    // 플롯 바깥 오른쪽 — 위에서부터 차례로 쌓는다. 자료를 덮을 일이 없다.
    const x = plotX + plotW + 20;
    let y = plotY;
    if (bubbleM) {
      drawBubbleLegendAt(ctx, bubbleM, x, y, options);
      y += bubbleM.boxH + 8;
    }
    if (fillM.boxH > 0) drawFillLegendAt(ctx, data, x, y, fillM, fs, options);
  } else if (outsideBelow) {
    // 플롯 아래 — 가로축 이름 밑, 플롯 오른쪽 끝에 맞춰 버블 크기·채움 상자를 나란히 둔다
    const y = plotY + plotH + xNameOff + axisPx + 10;
    const total = (bubbleM?.boxW ?? 0) + (fillM.boxH > 0 ? (bubbleM ? 8 : 0) + fillM.boxW : 0);
    let x = Math.max(4, plotX + plotW - total);
    if (bubbleM) {
      drawBubbleLegendAt(ctx, bubbleM, x, y, options);
      x += bubbleM.boxW + 8;
    }
    if (fillM.boxH > 0) drawFillLegendAt(ctx, data, x, y, fillM, fs, options);
  } else if (data.showBubble && data.points.length > 0) {
    const avoid = bubbleRects(data, toCanvasX, toCanvasY, look.dotR);
    const fill = measureFillLegend(ctx, data, fs, options);
    const used = drawBubbleLegend(ctx, data, plotX, plotY, plotW, plotH, fs, options, avoid, fill.boxH);
    drawFillLegend(ctx, data, plotX, plotY, plotW, plotH, used.bottom, fs, options, used.corner);
  }

  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: fs.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, sourceInline: options.sourceInline, footnotes: options.footnotes, fontSize: fs.dataLabel, canvasWidth: w });
}

// ── 편차 산점도 ───────────────────────────────────────

function renderDeviation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ScatterGraphData,
  options: GraphOptions
) {
  const fs = options.fontSize;
  const t = styleOf(options);
  const look = byStyle(options, LOOK);

  // 상자 축 이름·단위·눈금 숫자의 실제 크기 (2.2.1) — 고정 여백(위 120·오른쪽 170)이면
  // 단위 「(mm)」 가 맨 위 눈금 「30」 에 붙고, 오른쪽 상자 이름이 캔버스 끝에서 잘렸다.
  const tickPx = textSize(options, 'tick', fs.tick);
  const unitPx = textSize(options, 'unit', fs.axisLabel);
  let boxedPx = textSize(options, 'axisName', fs.axisLabel);
  ctx.save();
  ctx.font = textFont(options, 'tick', tickPx);
  ctx.textBaseline = 'middle';
  const tickUp = textExtent(ctx, formatTick(Math.max(Math.abs(data.yRange.min), Math.abs(data.yRange.max)))).up;
  const lastXTickHalf = ctx.measureText(formatTick(Math.max(Math.abs(data.xRange.min), Math.abs(data.xRange.max)))).width / 2;
  ctx.font = textFont(options, 'unit', unitPx);
  const yUnitExt = data.yUnit ? textExtent(ctx, data.yUnit) : null;
  const yUnitH = yUnitExt ? yUnitExt.up + yUnitExt.down : 0;
  // 십자축 눈금이면 x 단위는 마지막 눈금 숫자 바로 오른쪽 — 숫자 반폭 + 6
  const xUnitGap = data.ticksOnAxis ? Math.max(20, lastXTickHalf + 6) : 10;
  const xUnitW = data.xUnit && data.ticksOnAxis ? ctx.measureText(data.xUnit).width : 0;
  // 오른쪽 상자 이름 — 너무 넓으면(캔버스 폭의 30% 넘게) 그때만 글꼴을 줄인다
  const xBoxGap = 14;
  const boxRoom = w * 0.3 - xUnitGap - xUnitW - xBoxGap - BOX_PAD_X * 2 - EDGE;
  if (data.boxedAxisLabels && data.xLabel) {
    boxedPx = shrinkToWidth(ctx, data.xLabel.split('\\n'), boxedPx, boxRoom,
      (sz) => textFont(options, 'axisName', sz));
  }
  ctx.font = textFont(options, 'axisName', boxedPx);
  const xBox = data.boxedAxisLabels ? boxedLabelSize(ctx, data.xLabel, boxedPx) : { w: 0, h: 0 };
  const yBox = data.boxedAxisLabels ? boxedLabelSize(ctx, data.yLabel, boxedPx) : { w: 0, h: 0 };
  ctx.restore();
  // 위: 상자(y 이름) → 6 → y 단위 → 4 → 맨 위 눈금 숫자의 윗끝 → 플롯 윗변
  const topNeeded = Math.ceil(BOX_TOP + yBox.h + (yUnitH ? 6 + yUnitH + 4 : 6) + tickUp);
  const rightNeeded = Math.ceil(xUnitGap + xUnitW + xBoxGap + xBox.w + EDGE + 2);

  const padding: Padding = {
    // 상자 축이름은 그래프 위에 놓이고 그 아래에 y 단위가 들어가므로 자리를 더 준다
    top: options.title ? 100 : (data.boxedAxisLabels ? Math.max(120, topNeeded) : 50),
    // 상자 축이름은 플롯 오른쪽 바깥에 놓인다 — 단위·상자 폭을 재서 잡는다
    right: data.boxedAxisLabels ? Math.max(80, rightNeeded) : 80,
    bottom: (() => {
      let b = 90;
      const notes = options.footnotes.filter(f => f.trim()).length;
      // 출처를 각주와 같은 줄에 두면(sourceInline) 줄이 하나 줄어든다
      b += sourceFootnoteReserve(options, fs.dataLabel,
        (options.source && !(options.sourceInline && notes > 0) ? 30 : 0) + notes * 22,
        { sourceInline: options.sourceInline });
      return b;
    })(),
    left: 130,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  // 대칭 범위 계산
  const xs = data.points.map((p) => Math.abs(p.x));
  const ys = data.points.map((p) => Math.abs(p.y));
  const xAbsMax = xs.length > 0 ? Math.max(...xs) : 10;
  const yAbsMax = ys.length > 0 ? Math.max(...ys) : 10;

  const xSymAuto = symmetricRange(xAbsMax);
  const ySymAuto = symmetricRange(yAbsMax);
  const xLimit = data.xRange.auto ? xSymAuto.limit : Math.max(Math.abs(data.xRange.min), Math.abs(data.xRange.max));
  const yLimit = data.yRange.auto ? ySymAuto.limit : Math.max(Math.abs(data.yRange.min), Math.abs(data.yRange.max));
  const xStep = data.xRange.step ?? (data.xRange.auto ? xSymAuto.step : xLimit / 4);
  const yStep = data.yRange.step ?? (data.yRange.auto ? ySymAuto.step : yLimit / 4);

  const toCanvasX = (v: number) => plotX + ((v + xLimit) / (2 * xLimit)) * plotW;
  const toCanvasY = (v: number) => plotY + plotH - ((v + yLimit) / (2 * yLimit)) * plotH;

  const originX = toCanvasX(0);
  const originY = toCanvasY(0);
  const dir = tickDirOf(options, { x: 'none', y: 'none' });

  // 격자선
  ctx.save();
  ctx.strokeStyle = t.line.barGridColor;
  ctx.lineWidth = t.line.barGrid;
  ctx.setLineDash(t.line.barGridDash);
  for (let v = -xLimit + xStep; v < xLimit; v += xStep) {
    if (Math.abs(v) < xStep * 0.01) continue;
    const x = toCanvasX(v);
    ctx.beginPath();
    ctx.moveTo(x, plotY);
    ctx.lineTo(x, plotY + plotH);
    ctx.stroke();
  }
  for (let v = -yLimit + yStep; v < yLimit; v += yStep) {
    if (Math.abs(v) < yStep * 0.01) continue;
    const y = toCanvasY(v);
    ctx.beginPath();
    ctx.moveTo(plotX, y);
    ctx.lineTo(plotX + plotW, y);
    ctx.stroke();
  }
  ctx.restore();

  // 외곽 축선 — 시험지 편차 그래프는 테두리 없이 교차하는 두 축만 둔다
  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  if (data.showFrame !== false) {
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY);
    ctx.closePath();
    ctx.stroke();
  }

  // 십자 기준선 (0,0)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = look.crossW;
  ctx.beginPath();
  ctx.moveTo(originX, plotY);
  ctx.lineTo(originX, plotY + plotH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(plotX, originY);
  ctx.lineTo(plotX + plotW, originY);
  ctx.stroke();

  // 0 표시
  ctx.fillStyle = '#000';
  ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick));
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('0', originX - 6, originY + 4);

  // 눈금을 어디에 붙일지 — 기본은 플롯 가장자리, ticksOnAxis 면 가운데 십자선
  const xTickBase = data.ticksOnAxis ? originY : plotY + plotH;
  const yTickBase = data.ticksOnAxis ? originX : plotX;
  // exam: 십자축 눈금 숫자는 플롯 안 점선 격자 위에 놓인다 — 숫자 자리만 흰 바탕으로 비운다.
  // 시험지 그림은 격자가 숫자를 지나지 않는다 (2.2.1)
  const knockout = !!data.ticksOnAxis && byStyle(options, { classic: false, exam: true });
  // 그 숫자 자리는 점 이름도 비켜 간다
  const tickBoxes: LabelBox[] = [];

  // X축 눈금
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const devXTicks: number[] = [];
  for (let v = -xLimit; v <= xLimit + xStep * 0.01; v += xStep) devXTicks.push(v);
  const devXStride = labelStride(
    plotW / Math.max(1, devXTicks.length - 1),
    widestLabel(ctx, devXTicks.map(formatTick)),
  );
  devXTicks.forEach((v, i) => {
    if (Math.abs(v) < xStep * 0.01) return;
    const x = toCanvasX(v);
    const [a, b] = tickSeg(t, dir.x);
    if (a !== b) {
      ctx.lineWidth = look.tickW;
      ctx.beginPath();
      ctx.moveTo(x, xTickBase + a);
      ctx.lineTo(x, xTickBase + b);
      ctx.stroke();
    }
    if (i % devXStride === 0) {
      if (knockout) tickBoxes.push(knockOut(ctx, formatTick(v), x, xTickBase + 10));
      ctx.fillText(formatTick(v), x, xTickBase + 10);
    }
  });

  // Y축 눈금
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const devYTicks: number[] = [];
  for (let v = -yLimit; v <= yLimit + yStep * 0.01; v += yStep) devYTicks.push(v);
  const devYStride = labelStride(plotH / Math.max(1, devYTicks.length - 1), textSize(options, 'tick', fs.tick) * 1.1);
  const yTickTextW = widestLabel(ctx, devYTicks.map(formatTick));
  devYTicks.forEach((v, i) => {
    if (Math.abs(v) < yStep * 0.01) return;
    const y = toCanvasY(v);
    const [a, b] = tickSeg(t, dir.y);
    if (a !== b) {
      ctx.lineWidth = look.tickW;
      ctx.beginPath();
      ctx.moveTo(yTickBase - b, y);
      ctx.lineTo(yTickBase - a, y);
      ctx.stroke();
    }
    if (i % devYStride === 0) {
      if (knockout) tickBoxes.push(knockOut(ctx, formatTick(v), yTickBase - 10, y));
      ctx.fillText(formatTick(v), yTickBase - 10, y);
    }
  });

  // 축 라벨
  ctx.font = textFont(options, 'axisName', textSize(options, 'axisName', fs.axisLabel));

  // X축 라벨 (하단 중앙). 상자 방식이면 아래에서 따로 그린다.
  if (!data.boxedAxisLabels) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(data.xLabel, plotX + plotW / 2, plotY + plotH + 40);
  }

  // 축 단위.
  // 눈금이 십자축에 붙어 있으면 단위도 그 축 끝에, 눈금 숫자와 같은 줄·열에 둔다.
  // (축선 위가 아니라 숫자와 나란히 놓여야 읽힌다.)
  ctx.font = textFont(options, 'unit', textSize(options, 'unit', fs.axisLabel));
  if (data.xUnit) {
    ctx.textAlign = data.ticksOnAxis ? 'left' : 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(
      data.xUnit,
      plotX + plotW + xUnitGap,
      data.ticksOnAxis ? originY + 10 : plotY + plotH + 40,
    );
  }

  if (data.yUnit) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    // 십자축이면 맨 위 눈금 숫자(가운데 맞춤)의 잉크 윗끝에서 띄운다 — 단위·숫자 모두 실제로
    // 찍히는 글꼴·크기(숫자 높이 맞춤 뒤, 괄호 조각 포함)의 잉크로 잰다. 틈은 글꼴 크기에서
    // 잡는다 — 어느 글꼴이 대체로 들어와도(리눅스 CI) 붙지 않는다 (2.2.1)
    let unitY = plotY - 16;
    if (data.ticksOnAxis) {
      const unitFont = ctx.font;
      ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick));
      ctx.textBaseline = 'middle';
      const tickTop = plotY - inkExtent(ctx, formatTick(yLimit)).up;
      ctx.font = unitFont;
      ctx.textBaseline = 'bottom';
      const gap = Math.max(4, fontSizeOf(ctx.font) * 0.1);
      unitY = tickTop - gap - inkExtent(ctx, data.yUnit).down;
    }
    ctx.fillText(data.yUnit, data.ticksOnAxis ? originX - 10 : plotX - 10, unitY);
  }

  if (data.boxedAxisLabels) {
    // 시험지 관습 — y 이름은 그래프 위, x 이름은 그래프 오른쪽에 상자로 둔다
    // y 이름은 맨 위에 둔다 — 그 아래 자리는 y 단위가 쓴다.
    // x 이름은 x 단위 오른쪽에 둔다 — 둘 다 축 오른쪽 끝, 같은 줄이라 겹칠 수 있다.
    // (단위 폭은 단위 글꼴로 재야 하므로 상자 글꼴로 바꾸기 전에 잰다)
    ctx.font = textFont(options, 'axisName', boxedPx);
    // y 이름은 세로축(0선)에 가운데를 맞춘다
    drawBoxedLabel(ctx, data.yLabel, originX, BOX_TOP, boxedPx, 'below', look.boxedLabelW);
    drawBoxedLabel(ctx, data.xLabel, plotX + plotW + xUnitGap + xUnitW + xBoxGap, plotY + plotH / 2,
      boxedPx, 'right', look.boxedLabelW);
  } else {
    // Y축 라벨 (Y축 중간, 줄바꿈 지원)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const namePx = textSize(options, 'axisNameV', fs.axisLabel);
    ctx.font = textFont(options, 'axisNameV', namePx);
    const stacked = look.stackYName ? stackChars(data.yLabel, namePx, h) : null;
    if (stacked) {
      // 한 자씩 쌓는다 — 시험지 「폭염 일수」 꼴
      const nameW = widestLine(ctx, stacked);
      ctx.textAlign = 'center';
      const lineH = namePx * STACK_LINE;
      fillLines(ctx, stacked, yTickBase - 18 - yTickTextW - nameW / 2,
        clampLinesMiddle(ctx, stacked, plotY + plotH / 2, lineH, h), lineH);
    } else {
      fillTextMultiline(ctx, data.yLabel, yTickBase - 18 - yTickTextW, plotY + plotH / 2, namePx * 1.3);
    }
  }

  // 데이터 포인트
  drawPoints(ctx, data, toCanvasX, toCanvasY, fs, options, options.showDataLabels,
    { left: plotX, right: plotX + plotW, top: plotY, bottom: plotY + plotH }, w, h, tickBoxes);

  // 버블 크기 범례
  if (data.showBubble && data.points.length > 0) {
    drawBubbleLegend(ctx, data, plotX, plotY, plotW, plotH, fs, options,
      bubbleRects(data, toCanvasX, toCanvasY, look.dotR));
  }

  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: fs.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, sourceInline: options.sourceInline, footnotes: options.footnotes, fontSize: fs.dataLabel, canvasWidth: w });
}

// ── 공통 유틸 ─────────────────────────────────────────

function drawPoints(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  toX: (v: number) => number,
  toY: (v: number) => number,
  fs: GraphOptions['fontSize'],
  options: FontOptions,
  showLabels: boolean,
  bounds: LabelBox | undefined,
  canvasW: number,
  canvasH: number,
  /** 이름이 비켜야 할 상자 — 플롯 안 범례 */
  obstacles: LabelBox[] = [],
) {
  const look = byStyle(options, LOOK);
  const maxSize = data.points.length > 0 ? Math.max(...data.points.map((p) => p.size), 1) : 1;

  // 라벨이 서로/점과 겹치지 않게 자리를 잡는다.
  // 점을 먼저 전부 등록해야 라벨이 다른 점 위에 얹히지 않는다.
  const placer = new LabelPlacer(styleOf(options).leader);
  for (const box of obstacles) placer.reserve(box);
  if (bounds) {
    for (const pt of data.points) {
      const r = data.showBubble && pt.size > 0 ? (pt.size / maxSize) * data.bubbleScale : look.dotR;
      placer.reserveCircle(toX(pt.x), toY(pt.y), r);
    }
  }

  // 큰 원부터 그린다 — 겹칠 때 작은 원이 위로 올라와 가려지지 않는다.
  // (원은 흰색으로 바탕을 지우고 칠하므로, 나중에 그린 쪽이 위에 온다.)
  const drawOrder = [...data.points].sort((a, b) => b.size - a.size);
  for (const pt of drawOrder) {
    const cx = toX(pt.x);
    const cy = toY(pt.y);

    if (data.showBubble && pt.size > 0) {
      const r = (pt.size / maxSize) * data.bubbleScale;
      // 흰색 배경으로 그래프 선 가리기
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // 버블 원 — 점별 채움색을 주면 그 색으로 (크기와 다른 값을 색으로 나타낼 때)
      ctx.fillStyle = pt.fill ?? look.bubbleFill;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = look.bubbleStroke;
      ctx.lineWidth = look.bubbleW;
      ctx.stroke();
    } else {
      // 버블 없을 때만 중심 점 표시
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx, cy, look.dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 라벨
    if (pt.label) {
      ctx.fillStyle = '#000';
      const lp = labelPlace(pt.label);
      const lpx = textSize(options, lp, fs.dataLabel);
      ctx.font = textFont(options, lp, lpx);
      // exam 은 글자가 커서 4px 틈이면 «D(» 처럼 원에 닿는다 — 1.9pt 띄운다
      const labelGap = byStyle(options, { classic: 4, exam: 9 });
      const offset = data.showBubble && pt.size > 0
        ? (pt.size / maxSize) * data.bubbleScale + labelGap
        : look.dotR + labelGap;

      if (bounds) {
        placer.place(ctx, pt.label, cx, cy, {
          gap: offset,
          lineHeight: lpx * 1.1,
          bounds,
          // exam: 다 막혀도 남의 이름 위에 얹지 않는다 — 더 넓게 찾는다 (2.2.1)
          wide: byStyle(options, { classic: false, exam: true }),
        });
      } else {
        // 경계를 모르면 겹침 회피를 할 수 없다 — 기존처럼 오른쪽 위에 둔다
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(pt.label, cx + offset, cy - 2);
      }
    }

    // 데이터 라벨 (좌표값)
    if (showLabels) {
      ctx.fillStyle = look.valueInk;
      ctx.font = textFont(options, 'value', textSize(options, 'value', fs.dataLabel * 0.8), { weight: 'normal' });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const offset = data.showBubble && pt.size > 0
        ? (pt.size / maxSize) * data.bubbleScale + 4
        : look.dotR + 4;
      // 오른쪽 끝 점의 값 라벨은 플롯 밖으로 흘러 캔버스를 넘을 수 있다
      const valueLabel = `(${pt.x}, ${pt.y})`;
      const at = nudgeInside(ctx, valueLabel, cx + offset, cy + 2, canvasW, canvasH);
      ctx.fillText(valueLabel, at.x, at.y);
    }
  }
}

function symmetricRange(absMax: number): { limit: number; step: number } {
  if (absMax === 0) return { limit: 10, step: 2 };
  const margin = absMax * 0.2;
  const raw = absMax + margin;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  let nice: number;
  if (norm <= 1.5) nice = 1.5;
  else if (norm <= 2) nice = 2;
  else if (norm <= 3) nice = 3;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  const limit = nice * pow;
  const step = limit / 4;
  return { limit, step };
}

function formatTick(v: number): string {
  return Math.abs(v) < 0.0001 ? '0' : Number(v.toFixed(2)).toString();
}

/**
 * y축 이름이 **왼쪽에 얼마나 자리를 요구하는지** 재고, 필요하면 접거나 줄인다.
 *
 * 이름은 눈금 숫자 열 바깥에 가로로 놓인다. 그래서 왼쪽 여백은
 * `18 + 눈금숫자폭 + 이름폭 + 12` 이상이라야 하고, 예전 상수 `130` 은
 * 「Y축」 정도만 감당했다 — 「1인당 지역내총생산」은 77.6px 이 캔버스 밖이었다.
 *
 * 여백만 넓히면 이름 하나가 그림을 다 먹으므로, 이름 몫을 캔버스 너비의 30%
 * 로 묶고 그보다 길면 **줄을 늘린다**. 한 글자가 이미 그 몫보다 넓은
 * 극단에서만 그 이름의 글꼴을 줄인다. 어느 경우에도 이름을 자르지 않는다.
 */
function measureYAxisName(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  w: number,
  h: number,
  yMin: number,
  yMax: number,
  yStep: number,
  fs: GraphOptions['fontSize'],
  options: FontOptions,
): { lines: string[]; size: number; tickW: number; reserve: number; nameW: number; stacked: boolean } {
  ctx.save();

  ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick));
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + yStep * 0.01; v += yStep) ticks.push(v);
  const tickW = widestLabel(ctx, ticks.map(formatTick));

  const makeFont = (size: number) => textFont(options, 'axisNameV', size);
  const base = textSize(options, 'axisNameV', fs.axisLabel);
  ctx.font = makeFont(base);
  const stacked = byStyle(options, LOOK).stackYName ? stackChars(data.yLabel, base, h) : null;
  if (stacked) {
    const nameW = widestLine(ctx, stacked);
    ctx.restore();
    return { lines: stacked, size: base, tickW, reserve: 18 + tickW + nameW + 12, nameW, stacked: true };
  }
  // 사용자가 손으로 나눈 줄(리터럴 \n)은 그대로 지킨다
  const given = (data.yLabel || '').split('\\n');
  const budget = Math.max(40, w * 0.3 - 18 - tickW - 12);
  // 낱말이 접을 폭보다 넓으면 글자 단위로 잘리기 전에(「지역내총생 / 산」) 먼저 줄여
  // 낱말째 담는다(폭은 크기에 꼭 비례하지 않아 1% 덜 잡는다). 바닥(MIN_SCALE)까지 줄여도 넘치는 낱말만 wrapToWidth 가 글자로 자른다.
  const words = given.flatMap((l) => l.split(/\s+/)).filter(Boolean);
  let size = widestLine(ctx, words) > budget ? shrinkToWidth(ctx, words, base, budget * 0.99, makeFont) : base;
  ctx.font = makeFont(size);
  let lines = given.flatMap((l) => wrapToWidth(ctx, l, budget));
  if (widestLine(ctx, lines) > budget) {
    size = shrinkToWidth(ctx, lines, size, budget, makeFont);
    ctx.font = makeFont(size);
    lines = given.flatMap((l) => wrapToWidth(ctx, l, budget));
  }
  const nameW = widestLine(ctx, lines);

  ctx.restore();
  return { lines, size, tickW, reserve: 18 + tickW + nameW + 12, nameW, stacked: false };
}

/** 한 자씩 쌓은 세로 축 이름의 줄 간격 (글자 크기 배) */
const STACK_LINE = 1.15;

/**
 * 세로 축 이름을 한 자씩 쌓은 줄 배열. 공백은 빈 줄로 둔다(「폭염 일수」).
 * 쌓은 높이가 캔버스 높이의 60% 를 넘으면 null — 그때는 가로로 눕혀 쓴다.
 */
function stackChars(label: string | undefined, size: number, canvasH: number): string[] | null {
  const chars = Array.from((label || '').split('\\n').join(''));
  if (chars.length === 0) return null;
  if (chars.length * size * STACK_LINE > canvasH * 0.6) return null;
  return chars.map((ch) => (ch === ' ' ? '' : ch));
}

interface Rect { x0: number; y0: number; x1: number; y1: number }

/** 그려진 버블(과 중심점)이 차지한 자리 — 범례가 이걸 덮지 않아야 한다 */
function bubbleRects(
  data: ScatterGraphData,
  toX: (v: number) => number,
  toY: (v: number) => number,
  dotR: number,
): Rect[] {
  const maxSize = data.points.length > 0 ? Math.max(...data.points.map((p) => p.size), 1) : 1;
  return data.points.map((pt) => {
    const r = data.showBubble && pt.size > 0 ? (pt.size / maxSize) * data.bubbleScale : dotR;
    const cx = toX(pt.x);
    const cy = toY(pt.y);
    return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
  });
}

const CORNERS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;
type Corner = (typeof CORNERS)[number];

/** 플롯 안쪽에 그릴 때 쓸 모서리. `outside-right` 는 위-오른쪽으로 본다. */
function insideCorner(pos: ScatterGraphData['bubbleLegendPosition']): Corner {
  return pos === 'outside-right' || !pos ? 'top-right' : pos;
}

/**
 * 범례 상자를 놓을 모서리를 고른다.
 *
 * 버블을 **가장 적게 덮는** 모서리를 쓴다. 빈 모서리를 찾는 방식은 상자가
 * 클 때(두 범례를 합치면 플롯 높이의 절반을 넘는다) 네 곳이 모두 걸려
 * 그대로 원위치에 놓이는 일이 잦았다. 겹친 넓이로 견주면 늘 가장 나은
 * 자리가 나온다. 넓이가 같으면 원하는 모서리를 먼저 쓴다.
 *
 * @param extraH 아래에 함께 쌓일 상자의 높이 — 두 범례가 같이 들어갈 자리를 본다
 */
function pickLegendCorner(
  preferred: Corner,
  boxW: number,
  boxH: number,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
  avoid: Rect[],
  extraH = 0,
): { corner: Corner; x: number; y: number } {
  const total = boxH + (extraH > 0 ? extraH + 6 : 0);
  const spotAt = (c: Corner) => ({
    x: c.endsWith('right') ? plotX + plotW - boxW - 10 : plotX + 10,
    y: c.startsWith('top') ? plotY + 10 : plotY + plotH - total - 10,
  });
  /** 상자가 버블을 덮은 넓이 */
  const overlap = (x: number, y: number) => avoid.reduce((sum, b) => {
    const w = Math.min(b.x1, x + boxW) - Math.max(b.x0, x);
    const h = Math.min(b.y1, y + total) - Math.max(b.y0, y);
    return sum + (w > 0 && h > 0 ? w * h : 0);
  }, 0);

  const order: Corner[] = [preferred, ...CORNERS.filter((c) => c !== preferred)];
  let best = { corner: preferred, ...spotAt(preferred), score: Infinity };
  for (const corner of order) {
    const { x, y } = spotAt(corner);
    const score = overlap(x, y);
    if (score < best.score) best = { corner, x, y, score };
    if (score === 0) break;
  }
  return { corner: best.corner, x: best.x, y: best.y };
}

/** 채움 범례가 차지할 크기 — 모서리를 고를 때 두 상자를 함께 본다 */
function measureFillLegend(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  fs: GraphOptions['fontSize'],
  options: FontOptions,
): { boxW: number; boxH: number } {
  const legend = data.fillLegend;
  if (!legend || legend.items.length === 0) return { boxW: 0, boxH: 0 };

  const fontSize = textSize(options, 'legend', fs.dataLabel * 0.8);
  ctx.save();
  ctx.font = textFont(options, 'legend', fontSize, { role: options.fontFamily ?? 'serif' });
  const rowH = fontSize * 1.5;
  const swatch = fontSize * 0.95;
  const pad = 8;
  const titleH = legend.title ? rowH : 0;
  const textW = Math.max(
    legend.title ? ctx.measureText(legend.title).width : 0,
    ...legend.items.map((it) => swatch + 6 + ctx.measureText(it.label).width),
  );
  ctx.restore();
  return { boxW: textW + pad * 2, boxH: titleH + legend.items.length * rowH + pad * 2 };
}

/** 버블 크기 범례: 겹친 원 + 박스 */
/** 그린 범례 상자의 높이를 돌려준다 (아래에 다른 범례를 붙일 때 쓴다) */
interface BubbleLegendMetrics {
  uniqueSteps: number[];
  labelOf: (size: number) => string;
  radiusOf: (size: number) => number;
  maxR: number;
  boxW: number;
  boxH: number;
  labelOffsets: number[];
  lowest: number;
  labelFontSize: number;
  pad: number;
}

/** 버블 범례의 크기·배치를 잰다. 그리기 전에 여백을 잡아야 할 때도 쓴다. */
function bubbleLegendMetrics(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  fs: GraphOptions['fontSize'],
  options: FontOptions,
): BubbleLegendMetrics | null {
  const sizes = data.points.map((p) => p.size).filter((s) => s > 0);
  if (sizes.length === 0) return null;
  const maxSize = Math.max(...sizes);
  if (maxSize === 0) return null;

  // 항목을 직접 준 경우 그대로 쓴다 (자릿수가 큰 값은 자동 표기로는 읽을 수 없다).
  // 단 **데이터에서 가장 큰 원보다 큰 항목은 뺀다** — 원 반지름이
  // (크기 / 데이터최대) 비율이라 배율이 1을 넘으면 상자와 캔버스를 뚫고 나간다.
  const given = data.bubbleLegendItems?.filter((it) => it.size > 0 && it.size <= maxSize) ?? [];
  const steps = given.length > 0
    ? given.map((it) => it.size)
    : [maxSize, Math.round(maxSize * 0.5), Math.round(maxSize * 0.2)].filter((v) => v > 0);
  const uniqueSteps = [...new Set(steps)].sort((a, b) => b - a);
  const labelOf = (size: number) =>
    given.find((it) => it.size === size)?.label ?? String(size);

  // ⚠️ 범례 원은 **데이터 원과 반지름 식이 완전히 같아야 한다**.
  // 범례는 "이만한 원이 이만한 값"을 알려 주는 자이므로, 배율이 조금이라도
  // 다르면 자로서 못 쓴다. (예전에는 1.2배로 그려 따로 놀았다.)
  const radiusOf = (size: number) => (size / maxSize) * data.bubbleScale;
  const maxR = radiusOf(uniqueSteps[0]);

  const labelFontSize = textSize(options, 'value', fs.dataLabel * 0.85);
  ctx.save();
  ctx.font = textFont(options, 'value', labelFontSize);
  const labelW = Math.max(50, ...uniqueSteps.map((v) => ctx.measureText(labelOf(v)).width));
  ctx.restore();
  const pad = 14;
  const boxW = maxR * 2 + labelW + pad * 2 + 20;

  // 라벨 세로 위치를 먼저 잡는다.
  // 원 크기 차이가 크면 작은 원들의 지시선 높이가 거의 같아 라벨이 겹치므로
  // 아래로 밀어 간격을 확보하는데, 그만큼 상자도 커져야 라벨이 안 잘린다.
  // (원 바닥을 0 으로 놓은 상대 좌표. 음수가 위쪽이다.)
  const labelGap = labelFontSize * 1.2;
  const labelOffsets: number[] = [];
  let cursor = -Infinity;
  for (const size of uniqueSteps) {
    const r = radiusOf(size);
    cursor = Math.max(-2 * r, cursor + labelGap);
    labelOffsets.push(cursor);
  }
  const lowest = Math.max(0, ...labelOffsets) + labelFontSize / 2;
  const boxH = maxR * 2 + lowest + pad * 2 + 10;

  return { uniqueSteps, labelOf, radiusOf, maxR, boxW, boxH, labelOffsets, lowest, labelFontSize, pad };
}

/** 잰 값을 받아 지정한 자리에 그린다 */
function drawBubbleLegendAt(
  ctx: CanvasRenderingContext2D,
  m: BubbleLegendMetrics,
  boxX: number,
  boxY: number,
  options: FontOptions,
) {
  const look = byStyle(options, LOOK);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = look.legendBox.color;
  ctx.lineWidth = look.legendBox.width;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, m.boxW, m.boxH, look.legendBox.radius);
  ctx.fill();
  ctx.stroke();

  const circleX = boxX + m.pad + m.maxR;
  const bottomCircleY = boxY + m.boxH - m.pad - m.lowest;

  m.uniqueSteps.forEach((size, si) => {
    const r = m.radiusOf(size);
    const cy = bottomCircleY - r;

    ctx.strokeStyle = look.bubbleStroke;
    ctx.lineWidth = look.bubbleW;
    ctx.beginPath();
    ctx.arc(circleX, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    const leader = leaderOf(options, CLASSIC_LEADER);
    ctx.strokeStyle = leader.color;
    ctx.lineWidth = leader.width;
    ctx.setLineDash(look.leaderDash);
    const lineY = cy - r;
    ctx.beginPath();
    ctx.moveTo(circleX, lineY);
    ctx.lineTo(circleX + m.maxR + 12, lineY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#000';
    ctx.font = textFont(options, 'value', m.labelFontSize);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.labelOf(size), circleX + m.maxR + 16, bottomCircleY + m.labelOffsets[si]);
  });
}

/** 플롯 **안쪽** 모서리에 그린다 — 버블을 가장 적게 덮는 자리를 고른다 */
function drawBubbleLegend(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
  fs: GraphOptions['fontSize'],
  options: FontOptions,
  avoid: Rect[] = [],
  extraH = 0,
): { height: number; corner: Corner; bottom: number } {
  const preferred = insideCorner(data.bubbleLegendPosition);
  const m = bubbleLegendMetrics(ctx, data, fs, options);
  if (!m) return { height: 0, corner: preferred, bottom: 0 };

  const spot = pickLegendCorner(preferred, m.boxW, m.boxH, plotX, plotY, plotW, plotH, avoid, extraH);
  drawBubbleLegendAt(ctx, m, spot.x, spot.y, options);
  return { height: m.boxH, corner: spot.corner, bottom: spot.y + m.boxH };
}

/**
 * 플롯 안 범례 두 상자가 놓일 자리 — 그리지 않고 셈만 한다.
 * `drawBubbleLegend`·`drawFillLegend` 와 같은 셈이다. 이름이 상자에 붙지 않게 둘레를 넓힌다.
 */
function insideLegendBoxes(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
  fs: GraphOptions['fontSize'],
  options: FontOptions,
  avoid: Rect[],
): LabelBox[] {
  const pad = 6;
  const grow = (x: number, y: number, bw: number, bh: number): LabelBox =>
    ({ left: x - pad, right: x + bw + pad, top: y - pad, bottom: y + bh + pad });
  ctx.save();
  const fill = measureFillLegend(ctx, data, fs, options);
  const m = bubbleLegendMetrics(ctx, data, fs, options);
  ctx.restore();
  const boxes: LabelBox[] = [];
  let corner: Corner = insideCorner(data.bubbleLegendPosition);
  let stackBelow = 0;
  if (m) {
    const spot = pickLegendCorner(corner, m.boxW, m.boxH, plotX, plotY, plotW, plotH, avoid, fill.boxH);
    boxes.push(grow(spot.x, spot.y, m.boxW, m.boxH));
    corner = spot.corner;
    stackBelow = spot.y + m.boxH;
  }
  if (fill.boxH > 0) {
    const x = corner.endsWith('right') ? plotX + plotW - fill.boxW - 10 : plotX + 10;
    const y = stackBelow > 0
      ? stackBelow + 6
      : (corner.startsWith('top') ? plotY + 10 : plotY + plotH - fill.boxH - 10);
    boxes.push(grow(x, y, fill.boxW, fill.boxH));
  }
  return boxes;
}

/**
 * 축 이름을 얇은 상자에 넣어 그린다 (시험지 편차 그래프 관습).
 *
 * place 가 'below' 면 (x, y)가 상자의 **위쪽 가운데**,
 * 'right' 면 (x, y)가 상자의 왼쪽 세로 중앙이다.
 * 줄바꿈 구분자는 fillTextMultiline 과 같은 리터럴 
 이다.
 */
const BOX_PAD_X = 8;
const BOX_PAD_Y = 6;
/** 위 상자 축 이름의 윗변 */
const BOX_TOP = 10;

/** 상자 축 이름의 바깥 크기 (지금 ctx.font 로) */
function boxedLabelSize(ctx: CanvasRenderingContext2D, text: string, fontSize: number): { w: number; h: number } {
  if (!text) return { w: 0, h: 0 };
  const lines = text.split('\\n');
  return {
    w: Math.max(...lines.map((l) => ctx.measureText(l).width)) + BOX_PAD_X * 2,
    h: lines.length * fontSize * 1.25 + BOX_PAD_Y * 2,
  };
}

/** 글자 자리를 흰 바탕으로 비운다 — 지금 ctx 의 글꼴·맞춤으로 잰 잉크 상자 + 2 */
function knockOut(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): LabelBox {
  const e = textExtent(ctx, text);
  const box = { left: x - e.left - 2, right: x + e.right + 2, top: y - e.up - 2, bottom: y + e.down + 2 };
  const fill = ctx.fillStyle;
  ctx.fillStyle = '#fff';
  ctx.fillRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
  ctx.fillStyle = fill;
  return box;
}

function drawBoxedLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  place: 'below' | 'right',
  lineW: number,
) {
  if (!text) return;
  // fillTextMultiline 과 같은 규약 — 실제 줄바꿈이 아니라 리터럴 역슬래시+n 으로 나눈다
  const lines = text.split('\\n');
  const lineH = fontSize * 1.25;
  const padX = BOX_PAD_X;
  const padY = BOX_PAD_Y;

  ctx.save();
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = textW + padX * 2;
  const boxH = lines.length * lineH + padY * 2;
  // 'below' 는 x 를 가로 중앙으로 본다 — 축에 맞춰 가운데 정렬하기 위해서다
  const boxX = place === 'below' ? x - boxW / 2 : x;
  const boxY = place === 'below' ? y : y - boxH / 2;

  ctx.fillStyle = '#fff';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lineW;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], boxX + boxW / 2, boxY + padY + i * lineH);
  }
  ctx.restore();
}

/**
 * 채움색이 무엇을 뜻하는지 알려주는 범례.
 * 버블 크기 범례와 같은 모서리에, 그 아래에 붙인다.
 *
 * @param offsetH 위에 이미 그려진 범례의 높이 (겹치지 않게 그만큼 비켜 놓는다)
 */
/** 잰 값을 받아 지정한 자리에 그린다 */
function drawFillLegendAt(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  boxX: number,
  boxY: number,
  m: { boxW: number; boxH: number },
  fs: GraphOptions['fontSize'],
  options: FontOptions,
) {
  const legend = data.fillLegend;
  if (!legend || legend.items.length === 0) return;
  const t = styleOf(options);
  const look = byStyle(options, LOOK);

  const fontSize = textSize(options, 'legend', fs.dataLabel * 0.8);
  ctx.save();
  ctx.font = textFont(options, 'legend', fontSize, { role: options.fontFamily ?? 'serif' });
  const rowH = fontSize * 1.5;
  const swatch = fontSize * 0.95;
  const pad = 8;

  ctx.fillStyle = '#fff';
  ctx.fillRect(boxX, boxY, m.boxW, m.boxH);
  ctx.strokeStyle = look.legendBox.color;
  ctx.lineWidth = look.legendBox.width;
  ctx.setLineDash([]);
  ctx.strokeRect(boxX, boxY, m.boxW, m.boxH);

  let y = boxY + pad;
  if (legend.title) {
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(legend.title, boxX + m.boxW / 2, y);
    y += rowH;
  }

  for (const it of legend.items) {
    ctx.fillStyle = it.fill;
    ctx.fillRect(boxX + pad, y + (rowH - swatch) / 2, swatch, swatch);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.barStroke;
    ctx.strokeRect(boxX + pad, y + (rowH - swatch) / 2, swatch, swatch);

    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.label, boxX + pad + swatch + 6, y + rowH / 2);
    y += rowH;
  }
  ctx.restore();
}

/** 플롯 안쪽 — 버블 범례가 고른 모서리를 따라가 그 바로 아래에 붙는다 */
function drawFillLegend(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
  /** 버블 범례의 아래끝. 0 이면 버블 범례가 없다. */
  stackBelow: number,
  fs: GraphOptions['fontSize'],
  options: FontOptions,
  corner: Corner = 'bottom-right',
) {
  const legend = data.fillLegend;
  if (!legend || legend.items.length === 0) return;

  const m = measureFillLegend(ctx, data, fs, options);
  const boxX = corner.endsWith('right') ? plotX + plotW - m.boxW - 10 : plotX + 10;
  const boxY = stackBelow > 0
    ? stackBelow + 6
    : (corner.startsWith('top') ? plotY + 10 : plotY + plotH - m.boxH - 10);

  drawFillLegendAt(ctx, data, boxX, boxY, m, fs, options);
}
