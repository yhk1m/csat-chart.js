// © 2026 김용현
// 범례 띠 — 그래프 여러 장 아래에 한 번만 다는 범례 상자 + 출처·각주 (2.4.0~)
//
// 상자는 항목 폭에 맞추고 띠 가운데에 둔다(시험지 모양). 각주·출처는 다른 그래프와 같은
// 규칙(drawSourceAndFootnote)으로 띠 아래쪽에 적는다.
import { type GraphOptions, type LegendStripData } from '../types/index';
import { clearCanvas, textSize } from '../canvas/renderer';
import { textCtx } from '../canvas/parens';
import { drawSourceAndFootnote } from '../canvas/labels';
import { drawLegend, layoutBottomLegend, type LegendItem } from '../canvas/legend';
import { styleOf } from '../canvas/style';

/** drawLegend 의 항목 사이 간격과 같다 */
const ITEM_SPACING = 30;

export function renderLegendStrip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: LegendStripData,
  options: GraphOptions,
) {
  ctx = textCtx(ctx, options);
  clearCanvas(ctx, w, h);
  const items: LegendItem[] = data.items.map((it) => ({
    type: it.type,
    label: it.label,
    fillStyle: it.fill ?? (it.type === 'rect' ? '#e5e5e5' : '#000'),
    strokeStyle: it.type === 'rect' ? (it.stroke ?? '#000') : it.stroke,
    dash: it.dash,
  }));

  if (items.length > 0) {
    // 다른 그래프의 아래 범례와 같은 글자 크기
    const fontSize = textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5);
    const lg = styleOf(options).legend;
    const iconW = items.map((it) => (it.type === 'line' ? lg.lineIcon : lg.swatch));
    // 한 줄에 놓았을 때의 폭을 재서 상자를 거기 맞춘다. 띠보다 넓으면 띠 폭으로 접는다
    const one = layoutBottomLegend(ctx, items.map((i) => i.label), iconW, fontSize, Infinity, options);
    const rowW = one.rows[0].reduce((a, r) => a + r.width, 0) + ITEM_SPACING * (one.rows[0].length - 1);
    const boxW = Math.min(w - 2, Math.ceil(rowW + lg.pad * 2 + 24));
    drawLegend({
      ctx, fonts: options, items,
      position: 'bottom',
      plotX: Math.round((w - boxW) / 2), plotY: 0, plotW: boxW, plotH: 0,
      canvasW: w, canvasH: h,
      fontSize,
      bottomOffset: data.top ?? 8,
    });
  }

  drawSourceAndFootnote({
    ctx, fonts: options, plotX: 0, plotW: w, height: h,
    source: options.source, sourceLeft: options.sourceLeft, footnotes: options.footnotes,
    fontSize: options.fontSize.dataLabel, canvasWidth: w,
  });
}
