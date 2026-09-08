// © 2026 김용현
import { type AbsBarGraphData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, autoRange, getFont } from '../canvas/renderer';
import { drawYAxis } from '../canvas/axes';
import { drawTitle, drawSourceAndFootnote, labelStride, widestLabel } from '../canvas/labels';
import { drawLegend, drawInsideLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';
import { getStackedFill, isLightFill, resolveFill, isLightFillValue } from '../canvas/patterns';

export function renderAbsBarGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: AbsBarGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendW = (showLegend && legendPos === 'right' && !data.insideLegend)
    ? measureLegendWidth(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5)
    : 0;

  const isVertical = data.barDirection === 'vertical';
  const font = options.fontFamily;
  const customFont = options.customFont;
  const n = data.categories.length;
  const sCount = data.seriesLabels.length;

  // 2단 라벨(가로 전용) — 바깥 라벨이 들어갈 만큼 왼쪽 여백을 넓힌다
  const hasGroups = !isVertical && !!data.groups && data.groups.length > 0;
  let groupLabelW = 0;
  let catLabelW = 0;
  let unitW = 0;
  if (hasGroups || data.unitAdjacent || data.insideLegend) {
    ctx.save();
    ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
    if (hasGroups) {
      groupLabelW = widestLabel(ctx, data.groups!.map((g) => g.label));
      catLabelW = widestLabel(ctx, data.categories.map((c) => c.label));
    }
    ctx.font = getFont(options.fontSize.axisLabel, font, customFont, 'bold');
    unitW = ctx.measureText(data.unit).width;
    ctx.restore();
  }

  const padRight = isVertical
    ? 60 + legendW
    : (data.unitAdjacent ? 40 + unitW : 160 + legendW);
  const padLeft = isVertical
    ? 130
    : (hasGroups ? 20 + groupLabelW + 14 + catLabelW + 12 : 100);
  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom' && !data.insideLegend)
    ? measureBottomLegend(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5, w - padLeft - padRight)
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: padRight,
    bottom: (() => {
      let b = isVertical ? 70 : 60;
      // 플롯 안에 범례를 그릴 때는 아래에 자리를 비워 둘 이유가 없다
      if (showLegend && legendPos === 'bottom' && !data.insideLegend) b += 60;
      b = Math.max(b, legendReserve);
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
      return b;
    })(),
    left: padLeft,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  // 축 범위 계산
  const allValues: number[] = [0]; // 0을 항상 포함 (막대 기준선)
  for (const cat of data.categories) {
    if (data.stacked) {
      allValues.push(cat.values.reduce((a, b) => a + b, 0));
    } else {
      allValues.push(...cat.values);
    }
  }
  if (allValues.length <= 1) allValues.push(100);

  let axis = data.yRange.auto
    ? autoRange(allValues, 6)
    : {
        min: data.yRange.min,
        max: data.yRange.max,
        step: data.yRange.step || Math.max(1, Math.round((data.yRange.max - data.yRange.min) / 6)),
      };

  // 최댓값에 맞추기: 축 최댓값을 데이터 최댓값으로 설정
  if (data.yRange.auto && data.fitMax) {
    const dataMax = Math.max(...allValues);
    axis = { ...axis, max: dataMax };
  }

  /** 계열 채움 — seriesFills 를 줬으면 그 값(색 또는 패턴), 아니면 기본 팔레트 */
  const fillOf = (i: number): string | CanvasPattern => {
    const v = data.seriesFills?.[i];
    return v === undefined || v === null ? getStackedFill(ctx, i) : resolveFill(ctx, v);
  };

  // 플롯 안 범례가 막대를 덮지 않도록, 그린 막대 자리를 모아 둔다
  const barRects: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const noteBar = (x: number, y: number, bw: number, bh: number) => {
    if (data.insideLegend) barRects.push({ x0: x, y0: y, x1: x + bw, y1: y + bh });
  };

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;

  if (isVertical) {
    // 사각 테두리
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY);
    ctx.lineTo(plotX, plotY);
    ctx.stroke();

    // Y축 눈금
    drawYAxis({
      ctx, padding, width: w, height: h,
      min: axis.min, max: axis.max, step: axis.step,
      label: data.unit,
      side: 'left',
      fontFamily: font, customFont,
      tickFontSize: options.fontSize.tick,
      labelFontSize: options.fontSize.axisLabel,
      drawGrid: true,
    });

    // 막대 (플롯 영역 클리핑)
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotX, plotY, plotW, plotH);
    ctx.clip();

    const catArea = plotW / n;
    const valToY = (v: number) => plotY + plotH - ((v - axis.min) / (axis.max - axis.min)) * plotH;
    // 막대가 어디서 시작하는가 — 기본은 축 바닥, zeroBaseline 이면 0
    const baseValue = data.zeroBaseline ? 0 : axis.min;
    const baseY = valToY(baseValue);
    if (data.stacked) {
      const barW = Math.min(catArea * 0.5, 80);
      for (let c = 0; c < n; c++) {
        const cx = plotX + catArea * c + catArea / 2;
        // 누적 막대는 원래부터 0에서 쌓는다 — zeroBaseline 과 무관하다
        let cumVal = 0;
        for (let s = 0; s < sCount; s++) {
          const val = data.categories[c].values[s] || 0;
          const y = Math.min(valToY(cumVal + val), valToY(cumVal));
          const barH = Math.abs(valToY(cumVal) - valToY(cumVal + val));

          ctx.fillStyle = fillOf(s);
          ctx.fillRect(cx - barW / 2, y, barW, barH);
          noteBar(cx - barW / 2, y, barW, barH);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(cx - barW / 2, y, barW, barH);

          if (options.showDataLabels && barH > options.fontSize.dataLabel) {
            ctx.fillStyle = isLightFill(s) ? '#000' : '#fff';
            ctx.font = getFont(options.fontSize.dataLabel * 0.8, font, customFont, 'bold');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(val), cx, y + barH / 2);
          }
          cumVal += val;
        }
      }
    } else {
      // 그룹 막대
      const groupW = Math.min(catArea * 0.7, sCount * 60);
      const barW = groupW / sCount;
      for (let c = 0; c < n; c++) {
        const groupStart = plotX + catArea * c + (catArea - groupW) / 2;
        for (let s = 0; s < sCount; s++) {
          const val = data.categories[c].values[s] || 0;
          const by = Math.min(valToY(val), baseY);
          const barH = Math.abs(valToY(val) - baseY);
          const bx = groupStart + barW * s;

          ctx.fillStyle = fillOf(s);
          ctx.fillRect(bx, by, barW, barH);
          noteBar(bx, by, barW, barH);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(bx, by, barW, barH);

          if (options.showDataLabels && barH > options.fontSize.dataLabel) {
            ctx.fillStyle = isLightFill(s) ? '#000' : '#fff';
            ctx.font = getFont(options.fontSize.dataLabel * 0.8, font, customFont, 'bold');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(String(val), bx + barW / 2, by - 4);
          }
        }
      }
    }
    ctx.restore(); // 클리핑 해제

    // 0 기준선 — 막대 위에 그어야 가려지지 않는다
    if (data.zeroBaseline && baseY > plotY && baseY < plotY + plotH) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(plotX, baseY);
      ctx.lineTo(plotX + plotW, baseY);
      ctx.stroke();
    }

    // X축 라벨 (클리핑 밖에서).
    // 편차 그래프는 라벨이 플롯 아래가 아니라 0선 바로 아래에 붙는다.
    const labelY = data.categoryLabelAtBaseline ? baseY + 6 : plotY + plotH + 12;
    ctx.fillStyle = '#000';
    ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // 범주 이름이 서로 붙으면 몇 개 걸러 그린다
    const catStride = labelStride(catArea, widestLabel(ctx, data.categories.map((c) => c.label)));
    for (let c = 0; c < n; c++) {
      if (c % catStride !== 0) continue;
      const cx = plotX + catArea * c + catArea / 2;
      ctx.fillText(data.categories[c].label, cx, labelY);
    }
  } else {
    // 가로 — 사각 테두리
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY);
    ctx.lineTo(plotX, plotY);
    ctx.stroke();

    // X축 눈금 (하단)
    const ticks: number[] = [];
    for (let v = axis.min; v < axis.max - axis.step * 1e-9; v += axis.step) {
      ticks.push(Math.abs(v) < 1e-9 ? 0 : v);
    }
    if (ticks.length === 0 || Math.abs(ticks[ticks.length - 1] - axis.max) > 1e-9) {
      ticks.push(axis.max);
    }

    ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let lastTickHalfW = 0;
    for (let i = 0; i < ticks.length; i++) {
      const v = ticks[i];
      const x = plotX + ((v - axis.min) / (axis.max - axis.min)) * plotW;
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(x, plotY + plotH);
      ctx.lineTo(x, plotY + plotH + 5);
      ctx.stroke();
      ctx.fillText(formatTick(v), x, plotY + plotH + 10);
      if (i === ticks.length - 1) lastTickHalfW = ctx.measureText(formatTick(v)).width / 2;

      if (i > 0 && i < ticks.length - 1) {
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

    // 단위 — 기본은 축 오른쪽에 떨어뜨리고, unitAdjacent 면 마지막 눈금 숫자에 바로 붙인다
    ctx.font = getFont(options.fontSize.axisLabel, font, customFont, 'bold');
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const unitX = data.unitAdjacent
      ? plotX + plotW + lastTickHalfW + 2
      : plotX + plotW + 30;
    ctx.fillText(data.unit, unitX, plotY + plotH + 10);

    // 막대 (플롯 영역 클리핑)
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotX, plotY, plotW, plotH);
    ctx.clip();

    const catArea = plotH / n;
    // 그룹이 있으면 그룹 안 막대는 붙이고 그룹 사이는 벌린다.
    // 그룹이 없으면 아래 식이 예전과 같은 값(칸 가운데)을 준다.
    const barPitch = hasGroups ? catArea * 0.73 : catArea;
    const centerY: number[] = [];
    if (hasGroups) {
      let first = 0;
      for (const g of data.groups!) {
        const blockTop = plotY + catArea * first + (catArea - barPitch) * g.span / 2;
        for (let i = 0; i < g.span; i++) centerY.push(blockTop + barPitch * (i + 0.5));
        first += g.span;
      }
    }
    for (let c = centerY.length; c < n; c++) centerY.push(plotY + catArea * c + catArea / 2);

    const valToX = (v: number) => plotX + ((v - axis.min) / (axis.max - axis.min)) * plotW;
    if (data.stacked) {
      const barH = hasGroups ? Math.min(barPitch * 0.74, 80) : Math.min(catArea * 0.5, 80);
      for (let c = 0; c < n; c++) {
        const cy = centerY[c];
        let cumVal = 0;
        for (let s = 0; s < sCount; s++) {
          const val = data.categories[c].values[s] || 0;
          const bx = valToX(cumVal);
          const bw = valToX(cumVal + val) - bx;

          ctx.fillStyle = fillOf(s);
          ctx.fillRect(bx, cy - barH / 2, bw, barH);
          noteBar(bx, cy - barH / 2, bw, barH);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(bx, cy - barH / 2, bw, barH);

          if (options.showDataLabels && bw > options.fontSize.dataLabel * 2) {
            ctx.fillStyle = isLightFill(s) ? '#000' : '#fff';
            ctx.font = getFont(options.fontSize.dataLabel * 0.8, font, customFont, 'bold');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(val), bx + bw / 2, cy);
          }
          cumVal += val;
        }
      }
    } else {
      // 그룹 막대 (가로)
      const groupH = Math.min(catArea * 0.7, sCount * 60);
      const barH = groupH / sCount;
      for (let c = 0; c < n; c++) {
        const groupStart = centerY[c] - groupH / 2;
        for (let s = 0; s < sCount; s++) {
          const val = data.categories[c].values[s] || 0;
          const bx = valToX(axis.min);
          const bw = valToX(val) - bx;
          const by = groupStart + barH * s;

          ctx.fillStyle = fillOf(s);
          ctx.fillRect(bx, by, bw, barH);
          noteBar(bx, by, bw, barH);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(bx, by, bw, barH);

          if (options.showDataLabels && bw > options.fontSize.dataLabel * 2) {
            ctx.fillStyle = isLightFill(s) ? '#000' : '#fff';
            ctx.font = getFont(options.fontSize.dataLabel * 0.8, font, customFont, 'bold');
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(val), bx + bw + 4, by + barH / 2);
          }
        }
      }
    }
    ctx.restore(); // 클리핑 해제

    // Y축 라벨 (클리핑 밖에서)
    const catLabelX = hasGroups ? plotX - 12 : plotX - 10;
    for (let c = 0; c < n; c++) {
      ctx.fillStyle = '#000';
      ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.categories[c].label, catLabelX, centerY[c]);
    }

    // 바깥(2단) 라벨 — 그룹이 차지한 칸의 한가운데에 놓는다
    if (hasGroups) {
      let first = 0;
      for (const g of data.groups!) {
        const cy = plotY + catArea * first + (catArea * g.span) / 2;
        ctx.fillText(g.label, catLabelX - catLabelW - 14, cy);
        first += g.span;
      }
    }
  }

  // 제목
  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });

  // 범례
  if (showLegend && data.insideLegend) {
    // 시험지는 범례를 플롯 안쪽 모서리에 작은 상자로 둔다.
    // 막대와 겹치는 모서리는 피한다 — 어느 나라를 고르든 가려지면 안 된다.
    drawInsideLegend({
      ctx,
      items: data.seriesLabels.map((label, i) => ({
        type: 'rect' as const,
        fillStyle: fillOf(i),
        label,
      })),
      corner: data.insideLegend,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: options.fontSize.dataLabel * 0.9,
      font: getFont(options.fontSize.dataLabel * 0.9, font, customFont, 'bold'),
      avoid: barRects,
    });
  } else if (showLegend) {
    const items = data.seriesLabels.map((label, i) => ({
      type: 'rect' as const,
      // 막대와 같은 채움을 쓴다 — seriesFills 를 준 경우 범례도 그 색이어야 한다
      fillStyle: fillOf(i),
      bordered: data.seriesFills?.[i] ? isLightFillValue(data.seriesFills[i]) : isLightFill(i),
      label,
    }));
    drawLegend({
      ctx, items, position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: options.fontSize.dataLabel * 0.85 + 5,
    });
  }

  // 출처 + 각주
  drawSourceAndFootnote({ ctx, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel, canvasWidth: w });
}

function formatTick(val: number): string {
  if (Number.isInteger(val)) return val.toString();
  return val.toFixed(1);
}
