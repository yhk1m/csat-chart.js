// © 2026 김용현
// 범주형 점 그래프 — x축은 범주(A·B·C·D), y축은 수치, 값은 점.
//
// ⚠️ GeoGrapher 원본에 없는 신규 렌더러다. CHANGES.md 참조.
// 축·틀·격자는 AbsBarGraph 와 같은 구조를 쓴다. 한 문항에서 둘을 나란히
// 놓는 경우(2024 수능 세계지리 19번)가 있어 모양이 어긋나면 안 된다.
import {
  type CategoryDotGraphData,
  type DotMarker,
  type GraphOptions,
  DOT_MARKER_ORDER,
} from '../types/index';
import { type Padding, clearCanvas, autoRange, textFont, textSize } from '../canvas/renderer';
import { drawYAxis } from '../canvas/axes';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawLegend, measureLegendWidth, measureBottomLegend, type LegendItem } from '../canvas/legend';
import { styleOf, byStyle, tickDirOf } from '../canvas/style';

const LOOK = {
  classic: { zeroW: 1.5, zeroDash: [] as number[], catGrid: false, minorTickLen: 0, signed: false },
  // 0 선 일점쇄선 0.30pt (실측 §3 #45), 범주 경계 세로 점선·안쪽 보조 눈금 3.5pt·부호 붙은 눈금 (§2 category-dot)
  exam: { zeroW: 1.45, zeroDash: [41, 4.9, 5.3, 4.9], catGrid: true, minorTickLen: 17, signed: true },
};

/** 기호 하나를 (cx, cy)에 그린다 */
function drawMarker(
  ctx: CanvasRenderingContext2D,
  marker: DotMarker,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  switch (marker) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.lineTo(cx - r, cy + r);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      break;
  }
  ctx.fill();
}

export function renderCategoryDotGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: CategoryDotGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);
  const t = styleOf(options);
  const look = byStyle(options, LOOK);

  const n = data.categories.length;
  const sCount = data.seriesLabels.length;
  const markers = data.seriesMarkers ?? DOT_MARKER_ORDER;

  // 계열이 하나뿐이면 범례가 의미 없다 (시험지도 안 넣는다)
  const showLegend = options.showLegend && sCount > 1;
  const legendPos = options.legendPosition;
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, data.seriesLabels, textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5), options, 'circle')
    : 0;

  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (showLegend && legendPos === 'bottom')
    ? measureBottomLegend(ctx, data.seriesLabels, textSize(options, 'legend', options.fontSize.dataLabel * 0.85), w - 130 - (60 + legendW), options, 'circle')
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: 60 + legendW,
    bottom: (() => {
      let b = 70;
      if (showLegend && legendPos === 'bottom') b += 60;
      b = Math.max(b, legendReserve);
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
      return b;
    })(),
    left: 130,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  // 축 범위 — 0을 항상 포함한다 (시험지 관습: 값 축이 0에서 시작)
  const allValues: number[] = [0];
  for (const cat of data.categories) allValues.push(...cat.values);
  if (allValues.length <= 1) allValues.push(100);

  const axis = data.yRange.auto
    ? autoRange(allValues, 6)
    : {
        min: data.yRange.min,
        max: data.yRange.max,
        step: data.yRange.step || Math.max(1, Math.round((data.yRange.max - data.yRange.min) / 6)),
      };

  // 사각 테두리
  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY);
  ctx.lineTo(plotX, plotY);
  ctx.stroke();

  const catArea = plotW / n;
  const valToY = (v: number) => plotY + plotH - ((v - axis.min) / (axis.max - axis.min)) * plotH;

  // Y축 눈금 + 격자
  drawYAxis({
    ctx, padding, width: w, height: h,
    min: axis.min, max: axis.max, step: axis.step,
    label: data.unit,
    side: 'left',
    fonts: options,
    tickFontSize: options.fontSize.tick,
    labelFontSize: options.fontSize.axisLabel,
    drawGrid: true,
    tickDir: tickDirOf(options, { x: 'none', y: 'in' }).y,
    signed: look.signed,
  });

  // 시험지는 범주 경계마다 세로 점선
  if (look.catGrid) {
    ctx.save();
    ctx.strokeStyle = t.line.gridColor;
    ctx.lineWidth = t.line.grid;
    ctx.setLineDash(t.line.gridDash);
    for (let c = 1; c < n; c++) {
      const x = plotX + catArea * c;
      ctx.beginPath(); ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH); ctx.stroke();
    }
    ctx.restore();
  }
  // 눈금 사이 안쪽 보조 눈금
  if (look.minorTickLen > 0) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    ctx.setLineDash([]);
    for (let v = axis.min + axis.step / 2; v < axis.max; v += axis.step) {
      const y = valToY(v);
      ctx.beginPath(); ctx.moveTo(plotX, y); ctx.lineTo(plotX + look.minorTickLen, y); ctx.stroke();
    }
    ctx.restore();
  }

  // 점 (플롯 영역 클리핑)
  //
  // 클리핑 범위를 점 반지름만큼 넓힌다. 막대는 바닥에서 자라니 딱 맞게 잘라도
  // 되지만, 점은 값 위치가 중심이라 최댓값 점이 위쪽 테두리에 놓이면 절반이
  // 잘려 나간다. 축 최댓값이 데이터 최댓값과 정확히 같을 때 항상 그렇다.
  const clipPad = data.dotRadius + 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plotX - clipPad, plotY - clipPad, plotW + clipPad * 2, plotH + clipPad * 2);
  ctx.clip();

  // 계열이 여럿이면 범주 안에서 좌우로 벌려 겹치지 않게 한다
  const seriesGap = sCount > 1 ? Math.min(catArea * 0.6, sCount * 24) / sCount : 0;

  for (let c = 0; c < n; c++) {
    const center = plotX + catArea * c + catArea / 2;
    for (let s = 0; s < sCount; s++) {
      const val = data.categories[c].values[s];
      if (val === undefined || Number.isNaN(val)) continue;
      const cx = center + (s - (sCount - 1) / 2) * seriesGap;
      const cy = valToY(val);

      ctx.fillStyle = '#000';
      drawMarker(ctx, markers[s % markers.length], cx, cy, data.dotRadius);

      if (options.showDataLabels) {
        ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel * 0.8));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(val), cx, cy - data.dotRadius - 4);
      }
    }
  }
  ctx.restore();

  // 0 기준선 — 점 위에 그어야 가려지지 않는다
  if (data.zeroBaseline) {
    const zeroY = valToY(0);
    if (zeroY > plotY && zeroY < plotY + plotH) {
      ctx.save();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = look.zeroW;
      ctx.setLineDash(look.zeroDash);
      ctx.beginPath();
      ctx.moveTo(plotX, zeroY);
      ctx.lineTo(plotX + plotW, zeroY);
      ctx.stroke();
      ctx.restore();
    }
  }

  // X축 범주 라벨 (클리핑 밖에서)
  ctx.fillStyle = '#000';
  ctx.font = textFont(options, 'symbol', textSize(options, 'symbol', options.fontSize.tick));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let c = 0; c < n; c++) {
    const cx = plotX + catArea * c + catArea / 2;
    ctx.fillText(data.categories[c].label, cx, plotY + plotH + 12);
  }

  if (options.title) {
    drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title });
  }

  if (showLegend) {
    // 알려진 한계: 범례 아이콘은 모두 원이다. LegendItem 에 기호 모양이 없어서인데,
    // 그걸 넣으려면 canvas/legend.ts 를 고쳐야 하고 그건 원본과의 텍스트 동일성
    // (verify:port)을 깨뜨린다. 필요해지면 원본에서 먼저 고칠 것.
    const items: LegendItem[] = data.seriesLabels.map((label) => ({
      type: 'circle',
      fillStyle: '#000',
      label,
    }));
    drawLegend({
      ctx, fonts: options, items, position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: textSize(options, 'legend', options.fontSize.dataLabel * 0.85),
    });
  }

  drawSourceAndFootnote({
    ctx, fonts: options, plotX, plotW, height: h, canvasWidth: w,
    source: options.source,
    footnotes: options.footnotes,
    fontSize: options.fontSize.dataLabel * 0.85,
  });
}
