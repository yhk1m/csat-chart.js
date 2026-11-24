// © 2026 김용현
// 범례 띠 — 그래프 여러 장 아래에 한 번만 다는 범례 상자 + 출처·각주 (2.4.0~)
//
// 상자는 항목 폭에 맞추고 띠 가운데에 둔다(시험지 모양). 각주·출처는 다른 그래프와 같은
// 규칙(drawSourceAndFootnote)으로 띠 아래쪽에 적는다.
import { type GraphOptions, type LegendStripData } from '../types/index';
import { clearCanvas, textSize, setFontMeasurer } from '../canvas/renderer';
import { textCtx } from '../canvas/parens';
import { drawSourceAndFootnote, sourceFootnoteReserve, noteStep } from '../canvas/labels';
import { drawLegend, layoutBottomLegend, type LegendItem } from '../canvas/legend';
import { styleOf } from '../canvas/style';

/** drawLegend 의 항목 사이 간격과 같다 */
const ITEM_SPACING = 30;
/** 상자 밑변과 각주 사이 (다른 그래프의 exam 아래 범례와 같은 22, 2.4.1) */
const AFTER_BOX = 22;

function stripItems(data: LegendStripData): LegendItem[] {
  return data.items.map((it) => ({
    type: it.type,
    label: it.label,
    fillStyle: it.fill ?? (it.type === 'rect' ? '#e5e5e5' : '#000'),
    strokeStyle: it.type === 'rect' ? (it.stroke ?? '#000') : it.stroke,
    dash: it.dash,
  }));
}

/** 상자 크기 — 한 줄에 놓았을 때의 폭에 맞추고, 띠보다 넓으면 띠 폭으로 접는다 */
function stripBox(ctx: CanvasRenderingContext2D, w: number, items: LegendItem[], options: GraphOptions) {
  const fontSize = textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5);
  const lg = styleOf(options).legend;
  const iconW = items.map((it) => (it.type === 'line' ? lg.lineIcon : lg.swatch));
  const labels = items.map((i) => i.label);
  const one = layoutBottomLegend(ctx, labels, iconW, fontSize, Infinity, options);
  const rowW = one.rows[0].reduce((a, r) => a + r.width, 0) + ITEM_SPACING * (one.rows[0].length - 1);
  const boxW = Math.min(w - 2, Math.ceil(rowW + lg.pad * 2 + 24));
  const boxH = layoutBottomLegend(ctx, labels, iconW, fontSize, boxW, options).boxH;
  return { fontSize, boxW, boxH };
}

/**
 * 범례 띠가 글자끼리 붙지 않으려면 필요한 높이 (2.4.1~). 상자 + 상자 밑 16px + 각주·출처 묶음.
 * 띠 높이를 상수로 잡으면 각주 줄 수·글자 크기가 바뀔 때 각주가 상자에 올라탄다.
 */
export function measureLegendStrip(
  ctx: CanvasRenderingContext2D, w: number, data: LegendStripData, options: GraphOptions,
): number {
  ctx = textCtx(ctx, options);
  ctx.save();
  setFontMeasurer(ctx);
  const items = stripItems(data);
  const top = data.top ?? 8;
  const box = items.length > 0 ? stripBox(ctx, w, items, options).boxH : 0;
  ctx.restore();
  const foot = footBlock(options).height;
  return Math.ceil(top + box + (foot > 0 ? AFTER_BOX + foot : 2));
}

/**
 * 각주·출처 묶음의 높이 — 첫 각주 글자 윗변에서 캔버스 바닥까지.
 * sourceFootnoteReserve 는 묶음 위에 한 줄 몫의 여유(줄 높이 − 글자 크기)를 더 비우므로 그만큼 뺀다.
 */
function footBlock(options: GraphOptions): { height: number; drawPad: number } {
  const notes = options.footnotes.filter((f) => f.trim()).length;
  const hasSource = !!options.source || !!options.sourceLeft;
  if (!hasSource && notes === 0) return { height: 0, drawPad: 0 };
  const noteSize = textSize(options, 'footnote', options.fontSize.dataLabel * 0.9);
  const step = noteStep(options, noteSize);
  // 출처가 없으면 drawSourceAndFootnote 는 마지막 각주 밑에 빈 줄 하나(출처 자리)를 남긴다 —
  // 그 줄만큼 캔버스 바닥 아래로 내려 그려(drawPad) 띠 아래가 비지 않게 한다
  if (!hasSource) return { height: noteSize + (notes - 1) * step + 6, drawPad: step };
  const reserve = sourceFootnoteReserve(options, options.fontSize.dataLabel, 0, { sourceLeft: options.sourceLeft });
  return { height: Math.max(0, reserve - (step - noteSize)), drawPad: 0 };
}

export function renderLegendStrip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: LegendStripData,
  options: GraphOptions,
) {
  ctx = textCtx(ctx, options);
  clearCanvas(ctx, w, h);
  const items = stripItems(data);
  const top = data.top ?? 8;
  let boxBottom = top;

  if (items.length > 0) {
    // 다른 그래프의 아래 범례와 같은 글자 크기
    const { fontSize, boxW, boxH } = stripBox(ctx, w, items, options);
    boxBottom = top + boxH;
    drawLegend({
      ctx, fonts: options, items,
      position: 'bottom',
      plotX: Math.round((w - boxW) / 2), plotY: 0, plotW: boxW, plotH: 0,
      canvasW: w, canvasH: h,
      fontSize,
      bottomOffset: top,
    });
  }

  // 각주는 상자 바로 아래(16px)에 붙인다 — 띠가 높아도 상자와 각주 사이가 벌어지지 않게 (2.4.1)
  const foot = footBlock(options);
  const footBottom = foot.height > 0 ? Math.min(h, Math.ceil(boxBottom + AFTER_BOX + foot.height)) : h;
  drawSourceAndFootnote({
    ctx, fonts: options, plotX: 0, plotW: w, height: footBottom + foot.drawPad,
    source: options.source, sourceLeft: options.sourceLeft, footnotes: options.footnotes,
    fontSize: options.fontSize.dataLabel, canvasWidth: w,
  });
}
