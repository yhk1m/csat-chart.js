// © 2026 김용현
import { type AbsBarGraphData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, autoRange, textFont, textSize } from '../canvas/renderer';
import { drawYAxis } from '../canvas/axes';
import { drawTitle, drawSourceAndFootnote, sourceFootnoteReserve, labelStride, widestLabel, inkText } from '../canvas/labels';
import { drawLegend, drawInsideLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';
import { getStackedFill, isLightFill, resolveFill, isLightFillValue } from '../canvas/patterns';
import { styleOf, byStyle, tickDirOf, type TextPlace } from '../canvas/style';

const LOOK = {
  // 눈금 0.39pt·2.5pt (§3 #24), 0 기준선 0.34–0.39pt, 범주 경계 눈금 (#25)
  classic: { tick: 1, tickLen: 5, zero: 1.5, catTicks: false, unitAdjacent: false },
  exam: { tick: 1.9, tickLen: 12, zero: 1.75, catTicks: true, unitAdjacent: true },
};

export function renderAbsBarGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: AbsBarGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);
  const t = styleOf(options);
  const look = byStyle(options, LOOK);
  const legendFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5);

  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendW = (showLegend && legendPos === 'right' && !data.insideLegend)
    ? measureLegendWidth(ctx, data.seriesLabels, legendFs, options)
    : 0;

  const isVertical = data.barDirection === 'vertical';
  // 단위를 마지막 눈금 숫자에 붙이는가 — 시험지는 15(%) 꼴 (실측 §1.4)
  const unitAdjacent = data.unitAdjacent ?? look.unitAdjacent;
  const n = data.categories.length;
  const sCount = data.seriesLabels.length;

  // 2단 라벨(가로 전용) — 바깥 라벨이 들어갈 만큼 왼쪽 여백을 넓힌다
  const hasGroups = !isVertical && !!data.groups && data.groups.length > 0;
  const tickFs = textSize(options, 'tick', options.fontSize.tick);
  const unitFs = textSize(options, 'unit', options.fontSize.axisLabel);
  const valueFs = textSize(options, 'value', options.fontSize.dataLabel * 0.8);
  // 범주 이름은 대개 (가) — 2단 가로 막대에서는 1990년 같은 글자다
  const catPlace: TextPlace = hasGroups ? 'region' : 'category';
  const catFs = textSize(options, catPlace, options.fontSize.tick);
  // groups[].label 은 A·B
  const groupFs = textSize(options, 'symbol', options.fontSize.tick);
  const inLegFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.9);
  let groupLabelW = 0;
  let catLabelW = 0;
  let unitW = 0;
  if (hasGroups || unitAdjacent || data.insideLegend) {
    ctx.save();
    if (hasGroups) {
      ctx.font = textFont(options, 'symbol', groupFs);
      groupLabelW = widestLabel(ctx, data.groups!.map((g) => g.label));
      ctx.font = textFont(options, catPlace, catFs);
      catLabelW = widestLabel(ctx, data.categories.map((c) => c.label));
    }
    ctx.font = textFont(options, 'unit', unitFs);
    unitW = ctx.measureText(data.unit).width;
    ctx.restore();
  }

  const padRight = isVertical
    ? 60 + legendW
    : (unitAdjacent ? 40 + unitW : 160 + legendW);
  const padLeft = isVertical
    ? 130
    : (hasGroups ? 20 + groupLabelW + 14 + catLabelW + 12 : 100);
  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom' && !data.insideLegend)
    ? measureBottomLegend(ctx, data.seriesLabels, legendFs, w - padLeft - padRight, options)
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: padRight,
    bottom: (() => {
      let b = isVertical ? 70 : 60;
      // 플롯 안에 범례를 그릴 때는 아래에 자리를 비워 둘 이유가 없다
      if (showLegend && legendPos === 'bottom' && !data.insideLegend) b += 60;
      b = Math.max(b, legendReserve);
      // 출처·각주 — classic 은 1.7.0 상수, exam 은 글자 크기로 잰다
      b += sourceFootnoteReserve(options, options.fontSize.dataLabel,
        (options.source ? 30 : 0) + options.footnotes.filter(f => f.trim()).length * 22);
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
    return v === undefined || v === null ? getStackedFill(ctx, i, t) : resolveFill(ctx, v, t);
  };

  // 플롯 안 범례가 막대를 덮지 않도록, 그린 막대 자리를 모아 둔다
  const barRects: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const noteBar = (x: number, y: number, bw: number, bh: number) => {
    if (data.insideLegend) barRects.push({ x0: x, y0: y, x1: x + bw, y1: y + bh });
  };

  // 시험지: 세로 막대는 세로축 눈금 없이 격자가 대신하고, 범주 경계에 안쪽 눈금 (실측 §2 absbar)
  const dir = tickDirOf(options, isVertical ? { x: 'in', y: 'none' } : { x: 'none', y: 'in' });

  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;

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
      fonts: options,
      tickFontSize: options.fontSize.tick,
      labelFontSize: options.fontSize.axisLabel,
      drawGrid: true,
      tickDir: dir.y,
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
          ctx.lineWidth = t.line.barStroke;
          ctx.strokeRect(cx - barW / 2, y, barW, barH);

          if (options.showDataLabels && barH > options.fontSize.dataLabel) {
            ctx.font = textFont(options, 'value', valueFs);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            inkText(ctx, String(val), cx, y + barH / 2, undefined, isLightFill(s, t), t);
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
          ctx.lineWidth = t.line.barStroke;
          ctx.strokeRect(bx, by, barW, barH);

          if (options.showDataLabels && barH > options.fontSize.dataLabel) {
            // 막대 밖 글자 — 1.7.0 의 «어두운 계열 값이 흰 바탕에 흰 글자» 결함은 classic 바이트를 위해 남긴다
            ctx.fillStyle = byStyle(options, { classic: isLightFill(s, t) ? '#000' : '#fff', exam: '#000' });
            ctx.font = textFont(options, 'value', valueFs);
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
      ctx.lineWidth = look.zero;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(plotX, baseY);
      ctx.lineTo(plotX + plotW, baseY);
      ctx.stroke();
    }

    // 경계 눈금 (세로) — 범주 사이 경계에서 위로
    if (look.catTicks && dir.x !== 'none') {
      const sgn = dir.x === 'in' ? -1 : 1;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = t.line.tick;
      for (let c = 1; c < n; c++) {
        const bx = plotX + catArea * c;
        ctx.beginPath();
        ctx.moveTo(bx, plotY + plotH);
        ctx.lineTo(bx, plotY + plotH + sgn * t.line.tickLen);
        ctx.stroke();
      }
    }

    // X축 라벨 (클리핑 밖에서).
    // 편차 그래프는 라벨이 플롯 아래가 아니라 0선 바로 아래에 붙는다.
    const labelY = data.categoryLabelAtBaseline ? baseY + 6 : plotY + plotH + 12;
    ctx.fillStyle = '#000';
    ctx.font = textFont(options, catPlace, catFs);
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

    ctx.font = textFont(options, 'tick', tickFs);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let lastTickHalfW = 0;
    for (let i = 0; i < ticks.length; i++) {
      const v = ticks[i];
      const x = plotX + ((v - axis.min) / (axis.max - axis.min)) * plotW;
      // 값 눈금 (가로) — classic 은 바깥 그대로
      if (dir.x !== 'none') {
        const sgn = dir.x === 'in' ? -1 : 1;
        ctx.lineWidth = look.tick;
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(x, plotY + plotH);
        ctx.lineTo(x, plotY + plotH + sgn * look.tickLen);
        ctx.stroke();
      }
      ctx.fillText(formatTick(v), x, plotY + plotH + 10);
      if (i === ticks.length - 1) lastTickHalfW = ctx.measureText(formatTick(v)).width / 2;

      if (i > 0 && i < ticks.length - 1) {
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

    // 단위 — 기본은 축 오른쪽에 떨어뜨리고, unitAdjacent 면 마지막 눈금 숫자에 바로 붙인다
    ctx.font = textFont(options, 'unit', unitFs);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const unitX = unitAdjacent
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
          ctx.lineWidth = t.line.barStroke;
          ctx.strokeRect(bx, cy - barH / 2, bw, barH);

          if (options.showDataLabels && bw > options.fontSize.dataLabel * 2) {
            ctx.font = textFont(options, 'value', valueFs);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            inkText(ctx, String(val), bx + bw / 2, cy, undefined, isLightFill(s, t), t);
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
          ctx.lineWidth = t.line.barStroke;
          ctx.strokeRect(bx, by, bw, barH);

          if (options.showDataLabels && bw > options.fontSize.dataLabel * 2) {
            ctx.fillStyle = byStyle(options, { classic: isLightFill(s, t) ? '#000' : '#fff', exam: '#000' });
            ctx.font = textFont(options, 'value', valueFs);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(val), bx + bw + 4, by + barH / 2);
          }
        }
      }
    }
    ctx.restore(); // 클리핑 해제

    // 경계 눈금 (가로) — 범주 사이 경계에서 오른쪽(안쪽)으로
    if (look.catTicks && dir.y !== 'none') {
      const sgn = dir.y === 'in' ? 1 : -1;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = t.line.tick;
      for (let c = 1; c < n; c++) {
        const by = plotY + catArea * c;
        ctx.beginPath();
        ctx.moveTo(plotX, by);
        ctx.lineTo(plotX + sgn * t.line.tickLen, by);
        ctx.stroke();
      }
    }

    // Y축 라벨 (클리핑 밖에서)
    const catLabelX = hasGroups ? plotX - 12 : plotX - 10;
    for (let c = 0; c < n; c++) {
      ctx.fillStyle = '#000';
      ctx.font = textFont(options, catPlace, catFs);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.categories[c].label, catLabelX, centerY[c]);
    }

    // 바깥(2단) 라벨 — 그룹이 차지한 칸의 한가운데에 놓는다
    if (hasGroups) {
      ctx.font = textFont(options, 'symbol', groupFs);
      let first = 0;
      for (const g of data.groups!) {
        const cy = plotY + catArea * first + (catArea * g.span) / 2;
        ctx.fillText(g.label, catLabelX - catLabelW - 14, cy);
        first += g.span;
      }
    }
  }

  // 제목
  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });

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
      fontSize: inLegFs,
      font: textFont(options, 'legend', inLegFs, { role: options.fontFamily ?? 'serif' }),
      fonts: options,
      avoid: barRects,
    });
  } else if (showLegend) {
    const items = data.seriesLabels.map((label, i) => ({
      type: 'rect' as const,
      // 막대와 같은 채움을 쓴다 — seriesFills 를 준 경우 범례도 그 색이어야 한다
      fillStyle: fillOf(i),
      bordered: data.seriesFills?.[i] ? isLightFillValue(data.seriesFills[i]) : isLightFill(i, t),
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
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel, canvasWidth: w });
}

function formatTick(val: number): string {
  if (Number.isInteger(val)) return val.toString();
  return val.toFixed(1);
}
