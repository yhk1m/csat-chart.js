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
  /** 캔버스 너비 — 상자를 여기 안에 가둔다 */
  canvasW: number;
  /** 캔버스 높이 — 상자를 여기 안에 가둔다 */
  canvasH: number;
  fontSize: number;
  /** 글꼴 문자열 — 그래프 글꼴을 그대로 쓰라고 호출부가 넘긴다 */
  font: string;
  /** 이 사각형들과 겹치는 모서리는 피한다 (막대·점 등이 가려지면 안 된다) */
  avoid?: { x0: number; y0: number; x1: number; y1: number }[];
}

/**
 * 범례 글꼴을 줄일 수 있는 바닥.
 *
 * 이름을 줄임표로 자르는 선택지는 **없다**. 시험지 그림에서 「서울특별시」와
 * 「서울특별시 강남구」가 같은 「서울특별…」로 보이면 문항 자체가 틀린다.
 * 그래서 자리가 모자라면 (1) 줄을 늘리고 (2) 글꼴을 이 값까지 줄인다.
 */
const MIN_LEGEND_FONT = 11;

/** 글꼴 문자열의 px 크기만 바꾼다 (`bold 20px "명조"` → `bold 16px "명조"`) */
function withFontSize(font: string, size: number): string {
  return font.replace(/(\d*\.?\d+)px/, `${Math.round(size * 100) / 100}px`);
}

/**
 * 범례를 플롯 **안쪽** 모서리에 작은 상자로 그린다.
 *
 * 시험지 그래프는 범례를 그림 바깥이 아니라 빈 구석에 넣는 경우가 많다.
 * `avoid`를 주면 자료를 덮지 않는 모서리를 골라 쓴다 — 어떤 값이 들어와도
 * 막대나 점이 가려지면 안 되기 때문이다.
 */
export function drawInsideLegend({
  ctx, items, corner, plotX, plotY, plotW, plotH, canvasW, canvasH, fontSize, font, avoid = [],
}: InsideLegendParams): void {
  if (items.length === 0) return;

  ctx.save();
  ctx.font = font;

  const padX = 8;
  const margin = 8;
  // 상자가 플롯보다 넓어지면 그 자리에서 시작점이 플롯 밖으로 밀려난다.
  // 이름을 자르는 대신 글꼴을 줄여 폭을 맞춘다.
  const sizeOf = (fs: number) => {
    // 줄이지 않은 경우엔 받은 글꼴 문자열을 그대로 쓴다 (같은 값을 다시 조립하지 않는다)
    ctx.font = fs === fontSize ? font : withFontSize(font, fs);
    const swatch = fs * 0.95;
    const maxIconW = Math.max(...items.map((i) => (i.type === 'line' ? swatch * 2 : swatch)));
    const maxLabelW = Math.max(...items.map((i) => ctx.measureText(i.label).width));
    return { swatch, maxIconW, boxW: padX * 2 + maxIconW + 8 + maxLabelW, rowH: fs * 1.5 };
  };
  let fs = fontSize;
  let size = sizeOf(fs);
  const avail = plotW - margin * 2;
  while (fs > MIN_LEGEND_FONT && size.boxW > avail) {
    fs = Math.max(MIN_LEGEND_FONT, fs - 0.5);
    size = sizeOf(fs);
  }
  const { swatch, maxIconW, boxW, rowH } = size;
  const boxH = rowH * items.length + 8;

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
  const picked = spots.find(clear) ?? spots[0];
  // 글꼴을 바닥까지 줄여도 안 들어가는 경우가 남는다 — 그때도 캔버스 밖으로는 안 내보낸다
  const spot = {
    x: Math.max(1, Math.min(picked.x, canvasW - boxW - 1)),
    y: Math.max(1, Math.min(picked.y, canvasH - boxH - 1)),
  };

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
  /** 캔버스 너비 — 상자를 여기 안에 가둔다 */
  canvasW: number;
  /** 캔버스 높이 — 상자를 여기 안에 가둔다 */
  canvasH: number;
  fontSize: number;
  /** 하단 범례의 plotH 아래 오프셋 (기본 50) */
  bottomOffset?: number;
  /** 우측 범례의 plotW 오른쪽 간격 (기본 20) */
  rightGap?: number;
}

const LEGEND_FONT = "'Noto Sans KR', sans-serif";
const ICON_GAP = 10;
const BOX_PADDING = 12;
const ITEM_SPACING = 30;
/** 두 줄 이상일 때 줄 사이 간격 */
const ROW_GAP = 6;

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

export interface BottomLegendRow {
  /** items 안에서의 자리 */
  index: number;
  width: number;
}

export interface BottomLegendLayout {
  /** 실제로 쓸 글꼴 크기 — 항목 하나가 한 줄보다 넓을 때만 요청값보다 작아진다 */
  fontSize: number;
  lineHeight: number;
  /** 줄 사이 간격 */
  rowGap: number;
  boxH: number;
  rows: BottomLegendRow[][];
}

/**
 * 하단 범례를 상자 너비에 맞춰 **여러 줄로 접는다.**
 *
 * 예전에는 무조건 한 줄에 늘어놓고 가운데로 모았다. 항목이 상자보다 넓으면
 * 그 줄이 좌우로 똑같이 삐져나가 캔버스 밖에서 잘렸다 — 지명 두 개짜리
 * 방사형 그래프에서 실제로 그랬다. 이름을 줄임표로 자르는 선택지는 없으므로
 * (시험지에서 「서울특별시」와 「서울특별시 강남구」가 같아 보이면 안 된다)
 * 줄을 늘리고, 항목 하나가 통째로 한 줄보다 넓을 때만 글꼴을 줄인다.
 *
 * 한 줄로 끝나는 경우의 결과값은 예전 배치와 **정확히 같다** — 줄 간격과
 * 상자 높이가 줄 수에만 붙어 있기 때문이다.
 */
export function layoutBottomLegend(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  iconWidths: number[],
  fontSize: number,
  boxW: number,
  opts: { iconGap?: number; padding?: number; spacing?: number; font?: string } = {},
): BottomLegendLayout {
  const iconGap = opts.iconGap ?? ICON_GAP;
  const padding = opts.padding ?? BOX_PADDING;
  const spacing = opts.spacing ?? ITEM_SPACING;
  const fontOf = (fs: number) => (opts.font ? withFontSize(opts.font, fs) : `bold ${fs}px ${LEGEND_FONT}`);
  const inner = Math.max(1, boxW - padding * 2);

  ctx.save();
  const widthsAt = (fs: number) => {
    ctx.font = fontOf(fs);
    return labels.map((l, i) => iconWidths[i] + iconGap + ctx.measureText(l).width);
  };
  let fs = fontSize;
  let widths = widthsAt(fs);
  while (fs > MIN_LEGEND_FONT && Math.max(...widths) > inner) {
    fs = Math.max(MIN_LEGEND_FONT, fs - 0.5);
    widths = widthsAt(fs);
  }
  ctx.restore();

  const rows: BottomLegendRow[][] = [];
  let row: BottomLegendRow[] = [];
  let rowW = 0;
  for (let i = 0; i < labels.length; i++) {
    const add = row.length === 0 ? widths[i] : spacing + widths[i];
    if (row.length > 0 && rowW + add > inner) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push({ index: i, width: widths[i] });
    rowW += row.length === 1 ? widths[i] : spacing + widths[i];
  }
  if (row.length > 0) rows.push(row);

  const lineHeight = fs + 8;
  return {
    fontSize: fs,
    lineHeight,
    rowGap: ROW_GAP,
    rows,
    boxH: rows.length * lineHeight + (rows.length - 1) * ROW_GAP + padding * 2,
  };
}

/**
 * 하단 범례가 플롯 아래로 실제로 차지하는 높이 (오프셋 포함).
 *
 * 여백을 잡는 쪽이 이 값을 **미리** 물어봐야 한다. 범례 상자의 높이는 줄
 * 수에 따라 달라지는데, 여백을 상수로 잡아 두면 줄이 늘어난 만큼 상자가
 * 캔버스 밖으로 밀려나기 때문이다.
 */
export function measureBottomLegend(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  fontSize: number,
  plotW: number,
  iconType: 'rect' | 'circle' | 'line' | ('rect' | 'circle' | 'line')[] = 'rect',
  bottomOffset = 50,
): number {
  if (labels.length === 0) return 0;
  const sizeOf = (t: 'rect' | 'circle' | 'line') => (t === 'line' ? LINE_ICON_SIZE : 16);
  const iconWidths = labels.map((_, i) =>
    sizeOf(Array.isArray(iconType) ? (iconType[i] ?? 'rect') : iconType));
  const { boxH } = layoutBottomLegend(ctx, labels, iconWidths, fontSize, plotW);
  return bottomOffset + boxH + 2;
}

export function drawLegend({
  ctx, items, position,
  plotX, plotY, plotW, plotH,
  canvasW, canvasH,
  fontSize,
  bottomOffset = 50,
  rightGap = 20,
}: LegendParams): number {
  if (items.length === 0) return 0;

  ctx.save();
  ctx.font = `bold ${fontSize}px ${LEGEND_FONT}`;

  const iconGap = ICON_GAP;
  const padding = BOX_PADDING;
  const lineHeight = fontSize + 8;
  const iconWidthOf = (item: LegendItem) => (item.type === 'line' ? LINE_ICON_SIZE : 16);

  // 각 아이템 텍스트 너비 측정
  const itemWidths = items.map((item) => iconWidthOf(item) + iconGap + ctx.measureText(item.label).width);

  if (position === 'bottom') {
    // 하단: 그래프 너비 박스, 아이템 가운데 모아서 배치.
    // 한 줄에 다 못 넣으면 줄을 늘린다 (이름은 자르지 않는다).
    const boxW = plotW;
    const layout = layoutBottomLegend(
      ctx, items.map((i) => i.label), items.map(iconWidthOf), fontSize, boxW);
    const boxH = layout.boxH;
    const boxX = plotX;
    // 호출부가 잡아 둔 아래 여백이 모자라도 캔버스 밖으로는 내보내지 않는다
    const boxY = Math.max(0, Math.min(plotY + plotH + bottomOffset, canvasH - boxH - 1));

    // 박스
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 0);
    ctx.fill();
    ctx.stroke();

    // 아이템들 — 줄마다 가운데 정렬
    for (let r = 0; r < layout.rows.length; r++) {
      const row = layout.rows[r];
      const rowW = row.reduce((a, it) => a + it.width, 0) + ITEM_SPACING * (row.length - 1);
      let cx = boxX + (boxW - rowW) / 2;
      const cy = boxY + padding + r * (layout.lineHeight + layout.rowGap) + layout.lineHeight / 2;
      for (const { index, width } of row) {
        const item = items[index];
        const iSize = iconWidthOf(item);
        drawIcon(ctx, item, cx, cy, iSize);
        ctx.font = `bold ${layout.fontSize}px ${LEGEND_FONT}`;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, cx + iSize + iconGap, cy);
        cx += width + ITEM_SPACING;
      }
    }
    ctx.restore();
    return boxY + boxH;
  } else {
    // 우측: 그래프 바로 옆, 하단 정렬
    const itemGap = 10;
    const maxItemW = Math.max(...itemWidths);
    const boxW = maxItemW + padding * 2;
    const boxH = lineHeight * items.length + itemGap * (items.length - 1) + padding * 2;
    // 호출부가 잡아 둔 오른쪽 여백이 모자라도 캔버스 밖으로는 내보내지 않는다
    const boxX = Math.max(0, Math.min(plotX + plotW + rightGap, canvasW - boxW - 1));
    const boxY = Math.max(0, Math.min(plotY + plotH - boxH, canvasH - boxH - 1));

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
