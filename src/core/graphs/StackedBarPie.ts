// © 2026 김용현
import { type StackedGraphData, type StackedCategory, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, textFont, textSize } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote, sourceFootnoteReserve, inkText } from '../canvas/labels';
import { drawLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';
import { EDGE, nudgeInside } from '../canvas/fit';
import { getStackedFill, isLightFill, resolveFill, isLightFillValue } from '../canvas/patterns';
import { styleOf, byStyle, tickDirOf, type StyleTokens } from '../canvas/style';

const LOOK = {
  classic: { tick: 1, tickLen: 5, catTicks: false, unitAdjacent: false },
  exam: { tick: 1.9, tickLen: 12, catTicks: true, unitAdjacent: true }, // §3 #24·#25
};

const PIE_LOOK = {
  classic: { sliceLine: 1, rimLine: 1.5 },
  exam: { sliceLine: 1.9, rimLine: 1.9 }, // 원 테두리·조각 경계 0.39pt (실측 §2 stacked 원)
};

export function renderStackedGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: StackedGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  if (data.displayMode === 'bar') {
    renderStackedBar(ctx, w, h, data, options);
  } else {
    renderPieChart(ctx, w, h, data, options);
  }
}

function renderStackedBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: StackedGraphData,
  options: GraphOptions
) {
  const t = styleOf(options);
  const look = byStyle(options, LOOK);
  const legendFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5);
  const tickFs = textSize(options, 'tick', options.fontSize.tick);
  const unitFs = textSize(options, 'unit', options.fontSize.axisLabel);
  const valueFs = textSize(options, 'value', options.fontSize.dataLabel * 0.8);
  const catFs = textSize(options, 'category', options.fontSize.tick);
  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, data.seriesLabels, legendFs, options)
    : 0;

  const isVertical = data.barDirection === 'vertical';

  // 세로 막대 왼쪽 여백 — exam 은 눈금 숫자 「100」 폭에서 잰다 (classic 은 80 그대로)
  ctx.font = textFont(options, 'tick', tickFs);
  const vLeft = byStyle(options, { classic: 80, exam: Math.max(80, ctx.measureText('100').width + 10 + EDGE) });

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? measureBottomLegend(ctx, data.seriesLabels, legendFs,
        w - (isVertical ? vLeft : 100) - (isVertical ? 60 + legendW : 160 + legendW), options)
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: isVertical ? 60 + legendW : 160 + legendW,
    bottom: (() => {
      let b = isVertical ? 70 : 60;
      if (showLegend && legendPos === 'bottom') b += 60;
      b = Math.max(b, legendReserve);
      // 출처·각주 — classic 은 1.7.0 상수, exam 은 글자 크기로 잰다
      b += sourceFootnoteReserve(options, options.fontSize.dataLabel,
        (options.source ? 30 : 0) + options.footnotes.filter(f => f.trim()).length * 22,
        { sourceLeft: options.sourceLeft });
      return b;
    })(),
    left: isVertical ? vLeft : 100,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;
  const n = data.categories.length;
  const sCount = data.seriesLabels.length;

  // 시험지: 세로 막대는 값 눈금 없이 격자가 대신하고, 범주 경계에 안쪽 눈금 (실측 §2 stacked)
  const dir = tickDirOf(options, isVertical ? { x: 'in', y: 'none' } : { x: 'none', y: 'in' });

  // 축선
  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;

  if (isVertical) {
    // 세로 누적 막대 — 사각 테두리
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY);
    ctx.lineTo(plotX, plotY);
    ctx.stroke();

    // Y축 눈금 (0~100)
    const stepV = data.axisStep ?? 20;
    ctx.font = textFont(options, 'tick', tickFs);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= 100; v += stepV) {
      const y = plotY + plotH - (v / 100) * plotH;
      if (dir.y !== 'none') {
        const sgn = dir.y === 'in' ? 1 : -1;
        ctx.lineWidth = look.tick;
        ctx.beginPath();
        ctx.moveTo(plotX + sgn * look.tickLen, y);
        ctx.lineTo(plotX, y);
        ctx.stroke();
      }
      ctx.fillText(String(v), plotX - 10, y);

      if (v > 0 && v < 100) {
        ctx.save();
        ctx.strokeStyle = data.gridColor ?? t.line.barGridColor;
        ctx.lineWidth = t.line.barGrid;
        ctx.setLineDash(t.line.barGridDash);
        ctx.beginPath();
        ctx.moveTo(plotX, y);
        ctx.lineTo(plotX + plotW, y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 단위
    ctx.font = textFont(options, 'unit', unitFs);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(data.unit, plotX - 10, plotY - 16);

    // 막대 — 칸의 30%, 최대 84px. 상한은 AbsBarGraph 의 80px 과 같은 꼴이되
    // 조금 넓다: 이 막대는 칸 안에 계열 이름을 적으므로(drawSegmentLabel),
    // 네 글자 이름(19.8px 굵은 명조로 76.5px)이 좌우 여백 6px 과 함께
    // 눌리지 않고 들어가는 폭이 82.5px 이다.
    const barArea = plotW / n;
    const barW = Math.min(barArea * 0.3, 84);
    for (let c = 0; c < n; c++) {
      const cx = plotX + barArea * c + barArea / 2;
      const total = data.categories[c].values.reduce((a, b) => a + b, 0);
      let cumY = 0;
      for (const s of stackOrder(data.categories[c], sCount)) {
        const val = data.categories[c].values[s] || 0;
        const ratio = total > 0 ? val / total : 0;
        const barH = ratio * plotH;
        const y = plotY + plotH - cumY - barH;

        ctx.fillStyle = fillOf(ctx, data, s, t);
        ctx.fillRect(cx - barW / 2, y, barW, barH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = t.line.barStroke;
        ctx.strokeRect(cx - barW / 2, y, barW, barH);

        if (data.labelInSegment) {
          drawSegmentLabel(ctx, data, options, s, cx, y + barH / 2, barW, barH, lightAt(data, s, t));
        } else if (options.showDataLabels && barH > options.fontSize.dataLabel) {
          ctx.font = textFont(options, 'value', valueFs);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          inkText(ctx, String(val), cx, y + barH / 2, undefined, lightAt(data, s, t), t);
        }
        cumY += barH;
      }

      // X축 라벨
      ctx.fillStyle = '#000';
      ctx.font = textFont(options, 'category', catFs);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // 양 끝 칸의 긴 이름은 캔버스를 넘는다 — 아래 여백에 떠 있으니 안으로 민다
      const at = nudgeInside(ctx, data.categories[c].label, cx, plotY + plotH + 12, w, h);
      ctx.fillText(data.categories[c].label, at.x, at.y);
    }

    // 경계 눈금 (세로) — 범주 사이 경계에서 위로
    if (look.catTicks && dir.x !== 'none') {
      const sgn = dir.x === 'in' ? -1 : 1;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = t.line.tick;
      for (let c = 1; c < n; c++) {
        const bx = plotX + barArea * c;
        ctx.beginPath();
        ctx.moveTo(bx, plotY + plotH);
        ctx.lineTo(bx, plotY + plotH + sgn * t.line.tickLen);
        ctx.stroke();
      }
    }
  } else {
    // 가로 누적 막대 — 사각 테두리
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY);
    ctx.lineTo(plotX, plotY);
    ctx.stroke();

    // X축 눈금 (0~100)
    const stepH = data.axisStep ?? 20;
    ctx.font = textFont(options, 'tick', tickFs);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= 100; v += stepH) {
      const x = plotX + (v / 100) * plotW;
      // 값 눈금 (가로) — classic 은 바깥 그대로
      if (dir.x !== 'none') {
        const sgn = dir.x === 'in' ? -1 : 1;
        ctx.lineWidth = look.tick;
        ctx.beginPath();
        ctx.moveTo(x, plotY + plotH);
        ctx.lineTo(x, plotY + plotH + sgn * look.tickLen);
        ctx.stroke();
      }
      ctx.fillText(String(v), x, plotY + plotH + 10);

      if (v > 0 && v < 100) {
        ctx.save();
        ctx.strokeStyle = t.line.barGridColor;
        ctx.lineWidth = t.line.barGrid;
        ctx.setLineDash(t.line.barGridDash);
        ctx.beginPath();
        ctx.moveTo(x, plotY);
        ctx.lineTo(x, plotY + plotH);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 단위 (축 맨 오른쪽) — 시험지는 마지막 눈금에 붙인다: 100(%) (실측 §2 stacked)
    if (look.unitAdjacent) {
      ctx.font = textFont(options, 'tick', tickFs);
      const half = ctx.measureText('100').width / 2;
      ctx.font = textFont(options, 'unit', unitFs);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(data.unit, plotX + plotW + half + 2, plotY + plotH + 10);
    } else {
      ctx.font = textFont(options, 'unit', unitFs);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(data.unit, plotX + plotW + 30, plotY + plotH + 10);
    }

    // 막대 — 세로와 같은 규칙(칸의 30%, 최대 84px)
    const barArea = plotH / n;
    const barH = Math.min(barArea * 0.3, 84);
    for (let c = 0; c < n; c++) {
      const cy = plotY + barArea * c + barArea / 2;
      const total = data.categories[c].values.reduce((a, b) => a + b, 0);
      let cumX = 0;
      for (const s of stackOrder(data.categories[c], sCount)) {
        const val = data.categories[c].values[s] || 0;
        const ratio = total > 0 ? val / total : 0;
        const bw = ratio * plotW;
        const x = plotX + cumX;

        ctx.fillStyle = fillOf(ctx, data, s, t);
        ctx.fillRect(x, cy - barH / 2, bw, barH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = t.line.barStroke;
        ctx.strokeRect(x, cy - barH / 2, bw, barH);

        if (options.showDataLabels && bw > options.fontSize.dataLabel * 2) {
          ctx.font = textFont(options, 'value', valueFs);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          inkText(ctx, String(val), x + bw / 2, cy, undefined, lightAt(data, s, t), t);
        }
        cumX += bw;
      }

      // Y축 라벨
      ctx.fillStyle = '#000';
      ctx.font = textFont(options, 'category', catFs);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.categories[c].label, plotX - 10, cy);
    }

    // 경계 눈금 (가로) — 범주 사이 경계에서 오른쪽(안쪽)으로
    if (look.catTicks && dir.y !== 'none') {
      const sgn = dir.y === 'in' ? 1 : -1;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = t.line.tick;
      for (let c = 1; c < n; c++) {
        const by = plotY + barArea * c;
        ctx.beginPath();
        ctx.moveTo(plotX, by);
        ctx.lineTo(plotX + sgn * t.line.tickLen, by);
        ctx.stroke();
      }
    }
  }

  // 제목
  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });

  // 범례
  if (showLegend) {
    const items = data.seriesLabels.map((label, i) => ({
      type: 'rect' as const,
      fillStyle: fillOf(ctx, data, i, t),
      bordered: lightAt(data, i, t),
      label,
    }));
    drawLegend({
      ctx, fonts: options, items, position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: legendFs,
    });
  }

  // 출처 + 각주
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, sourceLeft: options.sourceLeft, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel, canvasWidth: w });
}

function renderPieChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: StackedGraphData,
  options: GraphOptions
) {
  const t = styleOf(options);
  const look = byStyle(options, PIE_LOOK);
  const catSize = textSize(options, 'category', options.fontSize.tick);
  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, data.seriesLabels, textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5), options)
    : 0;

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? measureBottomLegend(ctx, data.seriesLabels, textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5),
        w - 60 - (60 + legendW), options, 'rect', 16)
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: 60 + legendW,
    bottom: (() => {
      let b = 50;
      if (showLegend && legendPos === 'bottom') b += 60;
      b = Math.max(b, legendReserve);
      // 출처·각주 — classic 은 1.7.0 상수, exam 은 글자 크기로 잰다
      b += sourceFootnoteReserve(options, options.fontSize.dataLabel,
        (options.source ? 30 : 0) + options.footnotes.filter(f => f.trim()).length * 22,
        { sourceLeft: options.sourceLeft });
      return b;
    })(),
    left: 60,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;
  const n = data.categories.length;
  const sCount = data.seriesLabels.length;

  // 원 그래프: 카테고리별 원 그리드 배치 (겹침 방지)
  const pieScale = (data.pieScale ?? 100) / 100;
  const rotationRad = ((data.pieRotation ?? 0) * Math.PI) / 180;
  const minGap = 24;
  const labelSpace = catSize + 16;

  // 기준 반지름 (scale=100%, 한 줄 배치)
  const singleColW = plotW / n;
  const refR = Math.min(singleColW * 0.4, (plotH - labelSpace) * 0.4);
  const desiredR = refR * pieScale;

  // 그리드: 카테고리 수 기반 결정 (캔버스 크기와 독립 — 화면/PNG 일관성 보장)
  // n <= 5: 한 줄, n >= 6: ceil(sqrt(n)) 으로 그리드 구성
  const cols = n <= 5 ? n : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const colW = plotW / cols;
  const rowH = plotH / rows;

  // 셀에 맞게 반지름 제한
  const maxR = Math.min(desiredR, (colW - minGap) / 2, (rowH - labelSpace - minGap) / 2);

  for (let c = 0; c < n; c++) {
    const col = c % cols;
    const row = Math.floor(c / cols);
    const cx = plotX + colW * col + colW / 2;
    const cy = plotY + rowH * row + (rowH - labelSpace) / 2;
    const total = data.categories[c].values.reduce((a, b) => a + b, 0);
    let startAngle = -Math.PI / 2 + rotationRad;

    for (let s = 0; s < sCount; s++) {
      const val = data.categories[c].values[s] || 0;
      const ratio = total > 0 ? val / total : 0;
      const endAngle = startAngle + ratio * Math.PI * 2;

      ctx.fillStyle = fillOf(ctx, data, s, t);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = look.sliceLine;
      ctx.stroke();

      // 데이터 라벨
      if (options.showDataLabels && ratio > 0.05) {
        const midAngle = (startAngle + endAngle) / 2;
        const lx = cx + Math.cos(midAngle) * maxR * 0.65;
        const ly = cy + Math.sin(midAngle) * maxR * 0.65;
        const light = lightAt(data, s, t);
        ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel * 0.8));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        inkText(ctx, String(val), lx, ly, undefined, light, t);
      }

      startAngle = endAngle;
    }

    // 원 외곽선
    ctx.strokeStyle = '#000';
    ctx.lineWidth = look.rimLine;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.stroke();

    // 카테고리 라벨
    ctx.fillStyle = '#000';
    ctx.font = textFont(options, 'category', catSize);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(data.categories[c].label, cx, cy + maxR + 12);
  }

  // 제목
  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });

  // 범례 — 원 그래프 실제 영역(우측 끝 / 하단 끝) 기준으로 위치
  if (showLegend) {
    const items = data.seriesLabels.map((label, i) => ({
      type: 'rect' as const,
      fillStyle: fillOf(ctx, data, i, t),
      bordered: lightAt(data, i, t),
      label,
    }));
    if (legendPos === 'right') {
      const rightmostCol = Math.min(cols - 1, n - 1);
      const rightmostCx = plotX + colW * rightmostCol + colW / 2;
      const effectivePlotW = rightmostCx + maxR - plotX;
      // 마지막 행 원의 하단까지를 유효 plotH로 사용 (범례를 원 옆에 정렬)
      const lastRow = rows - 1;
      const lastCy = plotY + rowH * lastRow + (rowH - labelSpace) / 2;
      const pieBottom = lastCy + maxR + 12 + catSize;
      const effectivePlotH = pieBottom - plotY;
      drawLegend({
        ctx, fonts: options, items, position: legendPos,
        plotX, plotY, plotW: effectivePlotW, plotH: effectivePlotH,
        canvasW: w, canvasH: h,
        fontSize: textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5),
      });
    } else {
      // 하단: 가장 아래 행의 원+카테고리 라벨 하단까지를 기준으로
      const lastRow = rows - 1;
      const lastCy = plotY + rowH * lastRow + (rowH - labelSpace) / 2;
      const pieBottom = lastCy + maxR + 12 + catSize;
      const effectivePlotH = pieBottom - plotY;
      drawLegend({
        ctx, fonts: options, items, position: legendPos,
        plotX, plotY, plotW, plotH: effectivePlotH,
        canvasW: w, canvasH: h,
        fontSize: textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5),
        bottomOffset: 16,
      });
    }
  }

  // 출처 + 각주
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, sourceLeft: options.sourceLeft, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel, canvasWidth: w });
}

/** 이 막대의 쌓기 순서 (아래→위). 미지정이면 계열 번호 순. */
function stackOrder(cat: StackedCategory, sCount: number): number[] {
  const given = cat.segmentOrder;
  if (!given || given.length === 0) {
    return Array.from({ length: sCount }, (_, i) => i);
  }
  // 빠뜨린 계열이 있으면 뒤에 붙인다 — 값이 있는데 안 그려지면 안 된다
  const rest = Array.from({ length: sCount }, (_, i) => i).filter((i) => !given.includes(i));
  return [...given.filter((i) => i >= 0 && i < sCount), ...rest];
}

/** 계열 채움 — seriesFills 를 줬으면 그 값(색 또는 패턴), 아니면 기본 팔레트 */
function fillOf(
  ctx: CanvasRenderingContext2D,
  data: StackedGraphData,
  i: number,
  t: StyleTokens,
): string | CanvasPattern {
  const v = data.seriesFills?.[i];
  return v === undefined || v === null ? getStackedFill(ctx, i, t) : resolveFill(ctx, v, t);
}

/** 그 채움 위에 검은 글자를 써도 읽히는가 */
function lightAt(data: StackedGraphData, i: number, t: StyleTokens): boolean {
  const v = data.seriesFills?.[i];
  return v === undefined || v === null ? isLightFill(i, t) : isLightFillValue(v);
}

/**
 * 세그먼트 안에 계열 이름을 적는다.
 *
 * 패턴 위에서도 읽히도록 글자에 흰 테두리를 두르고, 어두운 채움 위에서는
 * 흰 글자로 쓴다. 칸이 이름보다 좁으면 폭에 맞춰 눌러 넣는다.
 */
function drawSegmentLabel(
  ctx: CanvasRenderingContext2D,
  data: StackedGraphData,
  options: GraphOptions,
  s: number,
  cx: number,
  cy: number,
  barW: number,
  barH: number,
  light: boolean,
) {
  const text = data.seriesLabels[s] ?? '';
  // 시험지 관습 — 기호(A·B)는 명조, 지명은 고딕
  const isSymbol = !data.seriesIsSymbol || data.seriesIsSymbol[s];
  const size = textSize(options, isSymbol ? 'symbol' : 'region', options.fontSize.dataLabel * 0.9);
  // 칸이 글자보다 얇으면 적지 않는다 — 넘쳐서 옆 칸을 밟는 것보다 낫다
  if (!text || barH < size * 1.1) return;

  const family = isSymbol ? options.fontFamily : 'sans';
  ctx.font = textFont(options, isSymbol ? 'symbol' : 'region', size, { role: family });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxW = Math.max(1, barW - 6);

  // 패턴·연한 채움 위에는 흰 테두리를 둘러 글자를 띄운다
  inkText(ctx, text, cx, cy, maxW, light, styleOf(options), true);
}
