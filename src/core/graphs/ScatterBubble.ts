// © 2026 김용현
import { type ScatterGraphData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, getFont, autoRange, fillTextMultiline } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote, LabelPlacer, labelStride, widestLabel, type LabelBox } from '../canvas/labels';
import { clampLinesMiddle, drawFloatingLabel, fillLines, nudgeInside, shrinkToWidth, widestLine, wrapToWidth } from '../canvas/fit';

export function renderScatterGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ScatterGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  if (data.mode === 'deviation') {
    renderDeviation(ctx, w, h, data, options);
  } else {
    renderNormal(ctx, w, h, data, options);
  }
}

// ── 일반 산점도/버블 ──────────────────────────────────

function renderNormal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ScatterGraphData,
  options: GraphOptions
) {
  const font = options.fontFamily;
  const cf = options.customFont;
  const fs = options.fontSize;

  // 범례를 플롯 바깥에 둘 참이면 먼저 크기를 재서 오른쪽 여백을 확보한다.
  // 그려 놓고 자리를 잡으면 이미 늦다.
  const outsideLegend = data.bubbleLegendPosition === 'outside-right'
    && data.showBubble && data.points.length > 0;
  const bubbleM = outsideLegend ? bubbleLegendMetrics(ctx, data, fs, font, cf) : null;
  const fillM = outsideLegend ? measureFillLegend(ctx, data, fs, font, cf) : { boxW: 0, boxH: 0 };
  const legendW = Math.max(bubbleM?.boxW ?? 0, fillM.boxW);

  // 시험지 틀은 x축 단위를 마지막 눈금 **옆**에 두므로 그만큼 오른쪽이 더 필요하다.
  // 60px 고정으로 두면 `(℃)` 가 캔버스 밖으로 밀린다.
  const examUnitW = (() => {
    if (data.examFrame !== true || !data.xUnit) return 0;
    ctx.save();
    ctx.font = getFont(fs.tick, font, cf, 'bold');
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

  const yName = measureYAxisName(ctx, data, w, yMin, yMax, yStep, fs, font, cf);

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: legendW > 0 ? legendW + 40 : Math.max(60, examUnitW + 34),
    bottom: (() => {
      let b = 90;
      const notes = options.footnotes.filter(f => f.trim()).length;
      // 출처를 각주와 같은 줄에 두면(sourceInline) 줄이 하나 줄어든다
      if (options.source && !(options.sourceInline && notes > 0)) b += 30;
      b += notes * 22;
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
  const exam = data.examFrame === true;
  ctx.save();
  ctx.strokeStyle = exam ? '#333' : '#ddd';
  ctx.lineWidth = exam ? 1 : 0.5;
  ctx.setLineDash(exam ? [5, 4] : [3, 3]);
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
  ctx.lineWidth = 2;
  if (exam) {
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
  ctx.font = getFont(fs.tick, font, cf, 'bold');
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
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plotY + plotH);
    ctx.lineTo(x, plotY + plotH + 6);
    ctx.stroke();
    if (i % xStride === 0) {
      const text = formatTick(v);
      ctx.fillText(text, x, plotY + plotH + 10);
      lastXLabelRight = Math.max(lastXLabelRight, x + ctx.measureText(text).width / 2);
    }
  });

  // Y축 눈금
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + yStep * 0.01; v += yStep) yTicks.push(v);
  const yStride = labelStride(plotH / Math.max(1, yTicks.length - 1), fs.tick * 1.1);
  // 축 이름이 눈금 숫자를 밟지 않도록, 가장 넓은 숫자만큼 밀어낼 거리를 재 둔다
  // (여백을 정할 때 이미 잰 값이다 — 같은 것을 두 번 세지 않는다)
  const yTickTextW = yName.tickW;
  yTicks.forEach((v, i) => {
    const y = toCanvasY(v);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX - 6, y);
    ctx.lineTo(plotX, y);
    ctx.stroke();
    if (i % yStride === 0) ctx.fillText(formatTick(v), plotX - 10, y);
  });

  // 축 라벨
  ctx.font = getFont(fs.axisLabel, font, cf, 'bold');

  // X축 라벨 (하단 중앙) — 플롯 가운데에 놓이므로 캔버스 양쪽으로 넘칠 수 있다
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  drawFloatingLabel(ctx, data.xLabel, plotX + plotW / 2, plotY + plotH + 40, w, h,
    fs.axisLabel, (size) => getFont(size, font, cf, 'bold'));
  ctx.font = getFont(fs.axisLabel, font, cf, 'bold');

  // X축 단위 — 시험지 틀이면 마지막 눈금 옆(`4(℃)` 꼴),
  // 아니면 기존대로 축 이름과 같은 줄 오른쪽 끝
  if (data.xUnit) {
    if (exam) {
      ctx.font = getFont(fs.tick, font, cf, 'bold');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      // 마지막 눈금 숫자 오른쪽 끝에서 한 칸 띄운다
      ctx.fillText(data.xUnit, lastXLabelRight + 6, plotY + plotH + 10);
      ctx.font = getFont(fs.axisLabel, font, cf, 'bold');
    } else {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(data.xUnit, plotX + plotW + 10, plotY + plotH + 40);
    }
  }

  // Y축 단위 (상단 끝) — 플롯 위 여백에 떠 있다
  if (data.yUnit) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    drawFloatingLabel(ctx, data.yUnit, plotX - 10, plotY - 16, w, h,
      fs.axisLabel, (size) => getFont(size, font, cf, 'bold'));
  }

  // Y축 라벨 (Y축 중간) — 왼쪽 여백은 이미 이 이름 몫만큼 비워 두었다
  ctx.font = getFont(yName.size, font, cf, 'bold');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yNameLineH = yName.size * 1.3;
  fillLines(ctx, yName.lines, plotX - 18 - yTickTextW,
    clampLinesMiddle(ctx, yName.lines, plotY + plotH / 2, yNameLineH, h), yNameLineH);
  ctx.font = getFont(fs.axisLabel, font, cf, 'bold');

  // 데이터 포인트
  drawPoints(ctx, data, toCanvasX, toCanvasY, fs, font, cf, options.showDataLabels,
    { left: plotX, right: plotX + plotW, top: plotY, bottom: plotY + plotH }, w, h);

  // 버블 크기 범례
  if (outsideLegend) {
    // 플롯 바깥 오른쪽 — 위에서부터 차례로 쌓는다. 자료를 덮을 일이 없다.
    const x = plotX + plotW + 20;
    let y = plotY;
    if (bubbleM) {
      drawBubbleLegendAt(ctx, bubbleM, x, y, font, cf);
      y += bubbleM.boxH + 8;
    }
    if (fillM.boxH > 0) drawFillLegendAt(ctx, data, x, y, fillM, fs, font, cf);
  } else if (data.showBubble && data.points.length > 0) {
    const avoid = bubbleRects(data, toCanvasX, toCanvasY);
    const fill = measureFillLegend(ctx, data, fs, font, cf);
    const used = drawBubbleLegend(ctx, data, plotX, plotY, plotW, plotH, fs, font, cf, avoid, fill.boxH);
    drawFillLegend(ctx, data, plotX, plotY, plotW, plotH, used.bottom, fs, font, cf, used.corner);
  }

  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: fs.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, plotX, plotW, height: h, source: options.source, sourceInline: options.sourceInline, footnotes: options.footnotes, fontSize: fs.dataLabel, canvasWidth: w });
}

// ── 편차 산점도 ───────────────────────────────────────

function renderDeviation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ScatterGraphData,
  options: GraphOptions
) {
  const font = options.fontFamily;
  const cf = options.customFont;
  const fs = options.fontSize;

  const padding: Padding = {
    // 상자 축이름은 그래프 위에 놓이고 그 아래에 y 단위가 들어가므로 자리를 더 준다
    top: options.title ? 100 : (data.boxedAxisLabels ? 120 : 50),
    // 상자 축이름은 플롯 오른쪽 바깥에 놓이므로 그때만 자리를 더 준다
    right: data.boxedAxisLabels ? 170 : 80,
    bottom: (() => {
      let b = 90;
      const notes = options.footnotes.filter(f => f.trim()).length;
      // 출처를 각주와 같은 줄에 두면(sourceInline) 줄이 하나 줄어든다
      if (options.source && !(options.sourceInline && notes > 0)) b += 30;
      b += notes * 22;
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

  // 격자선
  ctx.save();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
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
  ctx.lineWidth = 2;
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
  ctx.lineWidth = 1.5;
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
  ctx.font = getFont(fs.tick, font, cf, 'bold');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('0', originX - 6, originY + 4);

  // 눈금을 어디에 붙일지 — 기본은 플롯 가장자리, ticksOnAxis 면 가운데 십자선
  const xTickBase = data.ticksOnAxis ? originY : plotY + plotH;
  const yTickBase = data.ticksOnAxis ? originX : plotX;

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
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, xTickBase);
    ctx.lineTo(x, xTickBase + 6);
    ctx.stroke();
    if (i % devXStride === 0) ctx.fillText(formatTick(v), x, xTickBase + 10);
  });

  // Y축 눈금
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const devYTicks: number[] = [];
  for (let v = -yLimit; v <= yLimit + yStep * 0.01; v += yStep) devYTicks.push(v);
  const devYStride = labelStride(plotH / Math.max(1, devYTicks.length - 1), fs.tick * 1.1);
  const yTickTextW = widestLabel(ctx, devYTicks.map(formatTick));
  devYTicks.forEach((v, i) => {
    if (Math.abs(v) < yStep * 0.01) return;
    const y = toCanvasY(v);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(yTickBase - 6, y);
    ctx.lineTo(yTickBase, y);
    ctx.stroke();
    if (i % devYStride === 0) ctx.fillText(formatTick(v), yTickBase - 10, y);
  });

  // 축 라벨
  ctx.font = getFont(fs.axisLabel, font, cf, 'bold');

  // X축 라벨 (하단 중앙). 상자 방식이면 아래에서 따로 그린다.
  if (!data.boxedAxisLabels) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(data.xLabel, plotX + plotW / 2, plotY + plotH + 40);
  }

  // 축 단위.
  // 눈금이 십자축에 붙어 있으면 단위도 그 축 끝에, 눈금 숫자와 같은 줄·열에 둔다.
  // (축선 위가 아니라 숫자와 나란히 놓여야 읽힌다.)
  if (data.xUnit) {
    ctx.textAlign = data.ticksOnAxis ? 'left' : 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(
      data.xUnit,
      plotX + plotW + (data.ticksOnAxis ? 20 : 10),
      data.ticksOnAxis ? originY + 10 : plotY + plotH + 40,
    );
  }

  if (data.yUnit) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      data.yUnit,
      data.ticksOnAxis ? originX - 10 : plotX - 10,
      data.ticksOnAxis ? plotY - 6 : plotY - 16,
    );
  }

  if (data.boxedAxisLabels) {
    // 시험지 관습 — y 이름은 그래프 위, x 이름은 그래프 오른쪽에 상자로 둔다
    // y 이름은 맨 위에 둔다 — 그 아래 자리는 y 단위가 쓴다.
    // y 이름은 세로축(0선)에 가운데를 맞춘다
    drawBoxedLabel(ctx, data.yLabel, originX, 10, fs.axisLabel, 'below');
    // x 이름은 x 단위 오른쪽에 둔다 — 둘 다 축 오른쪽 끝, 같은 줄이라 겹칠 수 있다.
    const xUnitW = data.xUnit && data.ticksOnAxis ? ctx.measureText(data.xUnit).width + 14 : 0;
    drawBoxedLabel(ctx, data.xLabel, plotX + plotW + 16 + xUnitW, plotY + plotH / 2, fs.axisLabel, 'right');
  } else {
    // Y축 라벨 (Y축 중간, 줄바꿈 지원)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    fillTextMultiline(ctx, data.yLabel, yTickBase - 18 - yTickTextW, plotY + plotH / 2, fs.axisLabel * 1.3);
  }

  // 데이터 포인트
  drawPoints(ctx, data, toCanvasX, toCanvasY, fs, font, cf, options.showDataLabels,
    { left: plotX, right: plotX + plotW, top: plotY, bottom: plotY + plotH }, w, h);

  // 버블 크기 범례
  if (data.showBubble && data.points.length > 0) {
    drawBubbleLegend(ctx, data, plotX, plotY, plotW, plotH, fs, font, cf,
      bubbleRects(data, toCanvasX, toCanvasY));
  }

  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: fs.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, plotX, plotW, height: h, source: options.source, sourceInline: options.sourceInline, footnotes: options.footnotes, fontSize: fs.dataLabel, canvasWidth: w });
}

// ── 공통 유틸 ─────────────────────────────────────────

function drawPoints(
  ctx: CanvasRenderingContext2D,
  data: ScatterGraphData,
  toX: (v: number) => number,
  toY: (v: number) => number,
  fs: GraphOptions['fontSize'],
  font: GraphOptions['fontFamily'],
  cf: string,
  showLabels: boolean,
  bounds: LabelBox | undefined,
  canvasW: number,
  canvasH: number,
) {
  const maxSize = data.points.length > 0 ? Math.max(...data.points.map((p) => p.size), 1) : 1;

  // 라벨이 서로/점과 겹치지 않게 자리를 잡는다.
  // 점을 먼저 전부 등록해야 라벨이 다른 점 위에 얹히지 않는다.
  const placer = new LabelPlacer();
  if (bounds) {
    for (const pt of data.points) {
      const r = data.showBubble && pt.size > 0 ? (pt.size / maxSize) * data.bubbleScale : 4;
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
      ctx.fillStyle = pt.fill ?? 'rgba(80,80,80,0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // 버블 없을 때만 중심 점 표시
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 라벨
    if (pt.label) {
      ctx.fillStyle = '#000';
      ctx.font = getFont(fs.dataLabel, font, cf, 'bold');
      const offset = data.showBubble && pt.size > 0
        ? (pt.size / maxSize) * data.bubbleScale + 4
        : 8;

      if (bounds) {
        placer.place(ctx, pt.label, cx, cy, {
          gap: offset,
          lineHeight: fs.dataLabel * 1.1,
          bounds,
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
      ctx.fillStyle = '#555';
      ctx.font = getFont(fs.dataLabel * 0.8, font, cf, 'normal');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const offset = data.showBubble && pt.size > 0
        ? (pt.size / maxSize) * data.bubbleScale + 4
        : 8;
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
  yMin: number,
  yMax: number,
  yStep: number,
  fs: GraphOptions['fontSize'],
  font: GraphOptions['fontFamily'],
  cf: string,
): { lines: string[]; size: number; tickW: number; reserve: number } {
  ctx.save();

  ctx.font = getFont(fs.tick, font, cf, 'bold');
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + yStep * 0.01; v += yStep) ticks.push(v);
  const tickW = widestLabel(ctx, ticks.map(formatTick));

  const makeFont = (size: number) => getFont(size, font, cf, 'bold');
  ctx.font = makeFont(fs.axisLabel);
  // 사용자가 손으로 나눈 줄(리터럴 \n)은 그대로 지킨다
  const given = (data.yLabel || '').split('\\n');
  const budget = Math.max(40, w * 0.3 - 18 - tickW - 12);
  let lines = given.flatMap((l) => wrapToWidth(ctx, l, budget));
  let size = fs.axisLabel;
  if (widestLine(ctx, lines) > budget) {
    size = shrinkToWidth(ctx, lines, fs.axisLabel, budget, makeFont);
    ctx.font = makeFont(size);
    lines = given.flatMap((l) => wrapToWidth(ctx, l, budget));
  }
  const nameW = widestLine(ctx, lines);

  ctx.restore();
  return { lines, size, tickW, reserve: 18 + tickW + nameW + 12 };
}

interface Rect { x0: number; y0: number; x1: number; y1: number }

/** 그려진 버블(과 중심점)이 차지한 자리 — 범례가 이걸 덮지 않아야 한다 */
function bubbleRects(
  data: ScatterGraphData,
  toX: (v: number) => number,
  toY: (v: number) => number,
): Rect[] {
  const maxSize = data.points.length > 0 ? Math.max(...data.points.map((p) => p.size), 1) : 1;
  return data.points.map((pt) => {
    const r = data.showBubble && pt.size > 0 ? (pt.size / maxSize) * data.bubbleScale : 4;
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
  font: GraphOptions['fontFamily'],
  cf: string,
): { boxW: number; boxH: number } {
  const legend = data.fillLegend;
  if (!legend || legend.items.length === 0) return { boxW: 0, boxH: 0 };

  const fontSize = fs.dataLabel * 0.8;
  ctx.save();
  ctx.font = getFont(fontSize, font, cf, 'bold');
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
  font: GraphOptions['fontFamily'],
  cf: string,
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

  const labelFontSize = fs.dataLabel * 0.85;
  ctx.save();
  ctx.font = getFont(labelFontSize, font, cf, 'bold');
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
  font: GraphOptions['fontFamily'],
  cf: string,
) {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, m.boxW, m.boxH, 4);
  ctx.fill();
  ctx.stroke();

  const circleX = boxX + m.pad + m.maxR;
  const bottomCircleY = boxY + m.boxH - m.pad - m.lowest;

  m.uniqueSteps.forEach((size, si) => {
    const r = m.radiusOf(size);
    const cy = bottomCircleY - r;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(circleX, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    const lineY = cy - r;
    ctx.beginPath();
    ctx.moveTo(circleX, lineY);
    ctx.lineTo(circleX + m.maxR + 12, lineY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#000';
    ctx.font = getFont(m.labelFontSize, font, cf, 'bold');
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
  font: GraphOptions['fontFamily'],
  cf: string,
  avoid: Rect[] = [],
  extraH = 0,
): { height: number; corner: Corner; bottom: number } {
  const preferred = insideCorner(data.bubbleLegendPosition);
  const m = bubbleLegendMetrics(ctx, data, fs, font, cf);
  if (!m) return { height: 0, corner: preferred, bottom: 0 };

  const spot = pickLegendCorner(preferred, m.boxW, m.boxH, plotX, plotY, plotW, plotH, avoid, extraH);
  drawBubbleLegendAt(ctx, m, spot.x, spot.y, font, cf);
  return { height: m.boxH, corner: spot.corner, bottom: spot.y + m.boxH };
}

/**
 * 축 이름을 얇은 상자에 넣어 그린다 (시험지 편차 그래프 관습).
 *
 * place 가 'below' 면 (x, y)가 상자의 **위쪽 가운데**,
 * 'right' 면 (x, y)가 상자의 왼쪽 세로 중앙이다.
 * 줄바꿈 구분자는 fillTextMultiline 과 같은 리터럴 
 이다.
 */
function drawBoxedLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  place: 'below' | 'right'
) {
  if (!text) return;
  // fillTextMultiline 과 같은 규약 — 실제 줄바꿈이 아니라 리터럴 역슬래시+n 으로 나눈다
  const lines = text.split('\\n');
  const lineH = fontSize * 1.25;
  const padX = 8;
  const padY = 6;

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
  ctx.lineWidth = 1.2;
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
  font: GraphOptions['fontFamily'],
  cf: string,
) {
  const legend = data.fillLegend;
  if (!legend || legend.items.length === 0) return;

  const fontSize = fs.dataLabel * 0.8;
  ctx.save();
  ctx.font = getFont(fontSize, font, cf, 'bold');
  const rowH = fontSize * 1.5;
  const swatch = fontSize * 0.95;
  const pad = 8;

  ctx.fillStyle = '#fff';
  ctx.fillRect(boxX, boxY, m.boxW, m.boxH);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1.5;
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
    ctx.lineWidth = 0.8;
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
  font: GraphOptions['fontFamily'],
  cf: string,
  corner: Corner = 'bottom-right',
) {
  const legend = data.fillLegend;
  if (!legend || legend.items.length === 0) return;

  const m = measureFillLegend(ctx, data, fs, font, cf);
  const boxX = corner.endsWith('right') ? plotX + plotW - m.boxW - 10 : plotX + 10;
  const boxY = stackBelow > 0
    ? stackBelow + 6
    : (corner.startsWith('top') ? plotY + 10 : plotY + plotH - m.boxH - 10);

  drawFillLegendAt(ctx, data, boxX, boxY, m, fs, font, cf);
}
