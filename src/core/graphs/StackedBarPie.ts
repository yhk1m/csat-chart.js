// © 2026 김용현
import { type StackedGraphData, type StackedCategory, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, getFont } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';
import { getStackedFill, isLightFill, resolveFill, isLightFillValue } from '../canvas/patterns';

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
  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5, options)
    : 0;

  const isVertical = data.barDirection === 'vertical';

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? measureBottomLegend(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5,
        w - (isVertical ? 80 : 100) - (isVertical ? 60 + legendW : 160 + legendW), options)
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: isVertical ? 60 + legendW : 160 + legendW,
    bottom: (() => {
      let b = isVertical ? 70 : 60;
      if (showLegend && legendPos === 'bottom') b += 60;
      b = Math.max(b, legendReserve);
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
      return b;
    })(),
    left: isVertical ? 80 : 100,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;
  const n = data.categories.length;
  const sCount = data.seriesLabels.length;

  // 축선
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;

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
    ctx.font = getFont(options.fontSize.tick, options, 'bold');
    ctx.fillStyle = '#000';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= 100; v += stepV) {
      const y = plotY + plotH - (v / 100) * plotH;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotX - 5, y);
      ctx.lineTo(plotX, y);
      ctx.stroke();
      ctx.fillText(String(v), plotX - 10, y);

      if (v > 0 && v < 100) {
        ctx.save();
        ctx.strokeStyle = data.gridColor ?? '#ddd';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(plotX, y);
        ctx.lineTo(plotX + plotW, y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 단위
    ctx.font = getFont(options.fontSize.axisLabel, options, 'bold');
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

        ctx.fillStyle = fillOf(ctx, data, s);
        ctx.fillRect(cx - barW / 2, y, barW, barH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cx - barW / 2, y, barW, barH);

        if (data.labelInSegment) {
          drawSegmentLabel(ctx, data, options, s, cx, y + barH / 2, barW, barH, lightAt(data, s));
        } else if (options.showDataLabels && barH > options.fontSize.dataLabel) {
          ctx.fillStyle = lightAt(data, s) ? '#000' : '#fff';
          ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(val), cx, y + barH / 2);
        }
        cumY += barH;
      }

      // X축 라벨
      ctx.fillStyle = '#000';
      ctx.font = getFont(options.fontSize.tick, options, 'bold');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(data.categories[c].label, cx, plotY + plotH + 12);
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
    ctx.font = getFont(options.fontSize.tick, options, 'bold');
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= 100; v += stepH) {
      const x = plotX + (v / 100) * plotW;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, plotY + plotH);
      ctx.lineTo(x, plotY + plotH + 5);
      ctx.stroke();
      ctx.fillText(String(v), x, plotY + plotH + 10);

      if (v > 0 && v < 100) {
        ctx.save();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, plotY);
        ctx.lineTo(x, plotY + plotH);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 단위 (축 맨 오른쪽)
    ctx.font = getFont(options.fontSize.axisLabel, options, 'bold');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(data.unit, plotX + plotW + 30, plotY + plotH + 10);

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

        ctx.fillStyle = fillOf(ctx, data, s);
        ctx.fillRect(x, cy - barH / 2, bw, barH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x, cy - barH / 2, bw, barH);

        if (options.showDataLabels && bw > options.fontSize.dataLabel * 2) {
          ctx.fillStyle = lightAt(data, s) ? '#000' : '#fff';
          ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(val), x + bw / 2, cy);
        }
        cumX += bw;
      }

      // Y축 라벨
      ctx.fillStyle = '#000';
      ctx.font = getFont(options.fontSize.tick, options, 'bold');
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.categories[c].label, plotX - 10, cy);
    }
  }

  // 제목
  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });

  // 범례
  if (showLegend) {
    const items = data.seriesLabels.map((label, i) => ({
      type: 'rect' as const,
      fillStyle: fillOf(ctx, data, i),
      bordered: lightAt(data, i),
      label,
    }));
    drawLegend({
      ctx, fonts: options, items, position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: options.fontSize.dataLabel * 0.85 + 5,
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
  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5, options)
    : 0;

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? measureBottomLegend(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5,
        w - 60 - (60 + legendW), options, 'rect', 16)
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: 60 + legendW,
    bottom: (() => {
      let b = 50;
      if (showLegend && legendPos === 'bottom') b += 60;
      b = Math.max(b, legendReserve);
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
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
  const labelSpace = options.fontSize.tick + 16;

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

      ctx.fillStyle = fillOf(ctx, data, s);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 데이터 라벨
      if (options.showDataLabels && ratio > 0.05) {
        const midAngle = (startAngle + endAngle) / 2;
        const lx = cx + Math.cos(midAngle) * maxR * 0.65;
        const ly = cy + Math.sin(midAngle) * maxR * 0.65;
        ctx.fillStyle = lightAt(data, s) ? '#000' : '#fff';
        ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(val), lx, ly);
      }

      startAngle = endAngle;
    }

    // 원 외곽선
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.stroke();

    // 카테고리 라벨
    ctx.fillStyle = '#000';
    ctx.font = getFont(options.fontSize.tick, options, 'bold');
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
      fillStyle: fillOf(ctx, data, i),
      bordered: lightAt(data, i),
      label,
    }));
    if (legendPos === 'right') {
      const rightmostCol = Math.min(cols - 1, n - 1);
      const rightmostCx = plotX + colW * rightmostCol + colW / 2;
      const effectivePlotW = rightmostCx + maxR - plotX;
      // 마지막 행 원의 하단까지를 유효 plotH로 사용 (범례를 원 옆에 정렬)
      const lastRow = rows - 1;
      const lastCy = plotY + rowH * lastRow + (rowH - labelSpace) / 2;
      const pieBottom = lastCy + maxR + 12 + options.fontSize.tick;
      const effectivePlotH = pieBottom - plotY;
      drawLegend({
        ctx, fonts: options, items, position: legendPos,
        plotX, plotY, plotW: effectivePlotW, plotH: effectivePlotH,
        canvasW: w, canvasH: h,
        fontSize: options.fontSize.dataLabel * 0.85 + 5,
      });
    } else {
      // 하단: 가장 아래 행의 원+카테고리 라벨 하단까지를 기준으로
      const lastRow = rows - 1;
      const lastCy = plotY + rowH * lastRow + (rowH - labelSpace) / 2;
      const pieBottom = lastCy + maxR + 12 + options.fontSize.tick;
      const effectivePlotH = pieBottom - plotY;
      drawLegend({
        ctx, fonts: options, items, position: legendPos,
        plotX, plotY, plotW, plotH: effectivePlotH,
        canvasW: w, canvasH: h,
        fontSize: options.fontSize.dataLabel * 0.85 + 5,
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
  i: number
): string | CanvasPattern {
  const v = data.seriesFills?.[i];
  return v === undefined || v === null ? getStackedFill(ctx, i) : resolveFill(ctx, v);
}

/** 그 채움 위에 검은 글자를 써도 읽히는가 */
function lightAt(data: StackedGraphData, i: number): boolean {
  const v = data.seriesFills?.[i];
  return v === undefined || v === null ? isLightFill(i) : isLightFillValue(v);
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
  const size = options.fontSize.dataLabel * 0.9;
  // 칸이 글자보다 얇으면 적지 않는다 — 넘쳐서 옆 칸을 밟는 것보다 낫다
  if (!text || barH < size * 1.1) return;

  // 시험지 관습 — 기호(A·B)는 명조, 지명은 고딕
  const family = data.seriesIsSymbol && !data.seriesIsSymbol[s] ? 'sans' : options.fontFamily;
  ctx.font = getFont(size, options, 'bold', family);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxW = Math.max(1, barW - 6);

  if (light) {
    // 패턴·연한 채움 위 — 흰 테두리를 둘러 글자를 띄운다
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, cx, cy, maxW);
    ctx.restore();
    ctx.fillStyle = '#000';
  } else {
    ctx.fillStyle = '#fff';
  }
  ctx.fillText(text, cx, cy, maxW);
}
