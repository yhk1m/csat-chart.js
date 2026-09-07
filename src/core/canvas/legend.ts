// © 2026 김용현
// 공통 범례 렌더링
import { type LegendPosition, type InsideLegendCorner } from '../types/index';

export interface LegendItem {
  type: 'rect' | 'circle' | 'line';
  fillStyle: string | CanvasPattern;
  strokeStyle?: string;
  label: string;
  /** 밝은 채움일 때 아이콘에 검정 테두리 표시 */
  bordered?: boolean;
  /** 선 아이콘(line)의 대시 패턴 — 미지정 시 실선 */
  dash?: number[];
  /** 선 아이콘(line)의 굵기 — 미지정 시 2.5 */
  lineWidth?: number;
  /** 선 아이콘 가운데 점의 모양 — 미지정 시 원 */
  marker?: 'circle' | 'square';
}

export interface InsideLegendParams {
  ctx: CanvasRenderingContext2D;
  items: LegendItem[];
  /** 1순위 모서리. 여기가 막히면 나머지 셋을 차례로 본다. */
  corner: InsideLegendCorner;
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  fontSize: number;
  /** 글꼴 문자열 — 그래프 글꼴을 그대로 쓰라고 호출부가 넘긴다 */
  font: string;
  /** 이 사각형들과 겹치는 모서리는 피한다 (막대·점 등이 가려지면 안 된다) */
  avoid?: { x0: number; y0: number; x1: number; y1: number }[];
}

/**
 * 범례를 플롯 **안쪽** 모서리에 작은 상자로 그린다.
 *
 * 시험지 그래프는 범례를 그림 바깥이 아니라 빈 구석에 넣는 경우가 많다.
 * `avoid`를 주면 자료를 덮지 않는 모서리를 골라 쓴다 — 어떤 값이 들어와도
 * 막대나 점이 가려지면 안 되기 때문이다.
 */
export function drawInsideLegend({
  ctx, items, corner, plotX, plotY, plotW, plotH, fontSize, font, avoid = [],
}: InsideLegendParams): void {
  if (items.length === 0) return;

  ctx.save();
  ctx.font = font;

  const rowH = fontSize * 1.5;
  const swatch = fontSize * 0.95;
  const padX = 8;
  const iconW = (item: LegendItem) => (item.type === 'line' ? swatch * 2 : swatch);
  const maxIconW = Math.max(...items.map(iconW));
  const maxLabelW = Math.max(...items.map((i) => ctx.measureText(i.label).width));
  const boxW = padX * 2 + maxIconW + 8 + maxLabelW;
  const boxH = rowH * items.length + 8;
  const margin = 8;

  const spotAt = (c: InsideLegendCorner) => ({
    x: c.endsWith('right') ? plotX + plotW - boxW - margin : plotX + margin,
    y: c.startsWith('top') ? plotY + margin : plotY + plotH - boxH - margin,
  });
  const others: InsideLegendCorner[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
  const order = [corner, ...others.filter((c) => c !== corner)];
  const spots = order.map(spotAt);
  const clear = (s: { x: number; y: number }) => !avoid.some(
    (b) => b.x0 < s.x + boxW && b.x1 > s.x && b.y0 < s.y + boxH && b.y1 > s.y
  );
  const spot = spots.find(clear) ?? spots[0];

  ctx.fillStyle = '#fff';
  ctx.fillRect(spot.x, spot.y, boxW, boxH);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeRect(spot.x, spot.y, boxW, boxH);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cy = spot.y + 4 + rowH * (i + 0.5);
    drawInsideIcon(ctx, item, spot.x + padX, cy, swatch);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, spot.x + padX + maxIconW + 8, cy);
  }
  ctx.restore();
}

/** 플롯 안 범례의 아이콘 — 상자 크기에 맞춰 그린다 (바깥 범례의 고정 크기와 다르다) */
function drawInsideIcon(
  ctx: CanvasRenderingContext2D,
  item: LegendItem,
  x: number,
  cy: number,
  size: number
) {
  if (item.type === 'line') {
    const w = size * 2;
    ctx.strokeStyle = typeof item.fillStyle === 'string' ? item.fillStyle : '#000';
    ctx.lineWidth = item.lineWidth ?? 2;
    ctx.setLineDash(item.dash && item.dash.length > 0 ? item.dash : []);
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = item.fillStyle;
    const r = size * 0.3;
    if (item.marker === 'square') {
      ctx.fillRect(x + w / 2 - r, cy - r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.arc(x + w / 2, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  ctx.fillStyle = item.fillStyle;
  ctx.fillRect(x, cy - size / 2, size, size);
  ctx.strokeStyle = item.strokeStyle ?? '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, cy - size / 2, size, size);
}

const LINE_ICON_SIZE = 36;

interface LegendParams {
  ctx: CanvasRenderingContext2D;
  items: LegendItem[];
  position: LegendPosition;
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  fontSize: number;
  /** 하단 범례의 plotH 아래 오프셋 (기본 50) */
  bottomOffset?: number;
  /** 우측 범례의 plotW 오른쪽 간격 (기본 20) */
  rightGap?: number;
}

const LEGEND_FONT = "'Noto Sans KR', sans-serif";

/** 우측 범례일 때 필요한 추가 너비를 계산 */
export function measureLegendWidth(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  fontSize: number,
  iconType: 'rect' | 'circle' | 'line' = 'rect'
): number {
  ctx.save();
  ctx.font = `bold ${fontSize}px ${LEGEND_FONT}`;
  const iconSize = iconType === 'line' ? LINE_ICON_SIZE : 16;
  const iconGap = 10;
  const padding = 12;
  const maxW = Math.max(...labels.map((l) => iconSize + iconGap + ctx.measureText(l).width));
  ctx.restore();
  return maxW + padding * 2 + 30; // 박스 + 간격
}

export function drawLegend({
  ctx, items, position,
  plotX, plotY, plotW, plotH,
  fontSize,
  bottomOffset = 50,
  rightGap = 20,
}: LegendParams): number {
  if (items.length === 0) return 0;

  ctx.save();
  ctx.font = `bold ${fontSize}px ${LEGEND_FONT}`;

  const iconGap = 10;
  const padding = 12;
  const lineHeight = fontSize + 8;
  const iconWidthOf = (item: LegendItem) => (item.type === 'line' ? LINE_ICON_SIZE : 16);

  // 각 아이템 텍스트 너비 측정
  const itemWidths = items.map((item) => iconWidthOf(item) + iconGap + ctx.measureText(item.label).width);

  if (position === 'bottom') {
    // 하단: 그래프 너비 박스, 아이템 가운데 모아서 배치
    const itemSpacing = 30;
    const totalItemW = itemWidths.reduce((a, b) => a + b, 0) + itemSpacing * (items.length - 1);
    const boxW = plotW;
    const boxH = lineHeight + padding * 2;
    const boxX = plotX;
    const boxY = plotY + plotH + bottomOffset;

    // 박스
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 0);
    ctx.fill();
    ctx.stroke();

    // 아이템들 — 가운데 정렬
    let cx = boxX + (boxW - totalItemW) / 2;
    const cy = boxY + boxH / 2;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const iSize = iconWidthOf(item);
      drawIcon(ctx, item, cx, cy, iSize);
      ctx.font = `bold ${fontSize}px ${LEGEND_FONT}`;
      ctx.fillStyle = '#000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, cx + iSize + iconGap, cy);
      cx += itemWidths[idx] + itemSpacing;
    }
    ctx.restore();
    return boxY + boxH;
  } else {
    // 우측: 그래프 바로 옆, 하단 정렬
    const itemGap = 10;
    const maxItemW = Math.max(...itemWidths);
    const boxW = maxItemW + padding * 2;
    const boxH = lineHeight * items.length + itemGap * (items.length - 1) + padding * 2;
    const boxX = plotX + plotW + rightGap;
    const boxY = plotY + plotH - boxH;

    // 박스
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 0);
    ctx.fill();
    ctx.stroke();

    // 아이템들
    let cy = boxY + padding + lineHeight / 2;
    for (const item of items) {
      const ix = boxX + padding;
      const iSize = iconWidthOf(item);
      drawIcon(ctx, item, ix, cy, iSize);
      ctx.font = `bold ${fontSize}px ${LEGEND_FONT}`;
      ctx.fillStyle = '#000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, ix + iSize + iconGap, cy);
      cy += lineHeight + itemGap;
    }
    ctx.restore();
    return 0;
  }
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  item: LegendItem,
  x: number,
  cy: number,
  size: number
) {
  if (item.type === 'rect') {
    ctx.fillStyle = item.fillStyle;
    ctx.fillRect(x, cy - size / 2, size, size);
    if (item.bordered) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, cy - size / 2, size, size);
    } else if (item.strokeStyle) {
      ctx.strokeStyle = item.strokeStyle;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, cy - size / 2, size, size);
    }
  } else if (item.type === 'circle') {
    ctx.fillStyle = item.fillStyle;
    ctx.beginPath();
    ctx.arc(x + size / 2, cy, size / 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'line') {
    ctx.save();
    ctx.strokeStyle = item.fillStyle;
    ctx.lineWidth = item.lineWidth ?? 2.5;
    if (item.dash && item.dash.length > 0) ctx.setLineDash(item.dash);
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + size, cy);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = item.fillStyle;
    ctx.beginPath();
    ctx.arc(x + size / 2, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
