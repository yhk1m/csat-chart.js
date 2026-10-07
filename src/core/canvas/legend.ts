// © 2026 김용현
// 공통 범례 렌더링
import { type LegendPosition, type InsideLegendCorner } from '../types/index';
import { textFont, type FontOptions } from './renderer';
import { styleOf, byStyle, type StyleTokens } from './style';
import type { StyleName } from '../types/common';

/**
 * 1.7.0 범례 선 견본이 계열 선·표지 토큰과 달랐던 값 — classic 에서만 둔다.
 * exam 은 비워 두어 `t.line.series`·`t.marker.r` 를 그대로 쓴다(견본 = 그림 속 계열).
 */
const LOOK: Record<StyleName, { lineW?: number; insideLineW?: number; dotR?: number; rightMaxRatio: number; belowPlot: number }> = {
  classic: { lineW: 2.5, insideLineW: 2, dotR: 3.5, rightMaxRatio: Infinity, belowPlot: 50 },
  // 오른쪽 범례는 캔버스 폭의 40% 까지 — 넘는 이름은 글꼴을 줄여 담는다 (exam 글자가 커서 플롯이 사라졌다)
  // 아래 범례 상자는 플롯 바닥에서 belowPlot 만큼 — exam 의 큰 「(가)」 괄호가 상자 윗변에 닿아 8 더 내린다
  exam: { rightMaxRatio: 0.4, belowPlot: 58 },
};

export interface LegendItem {
  type: 'rect' | 'circle' | 'line';
  fillStyle: string | CanvasPattern;
  strokeStyle?: string;
  label: string;
  /** 밝은 채움일 때 아이콘에 검정 테두리 표시 */
  bordered?: boolean;
  /** 선 아이콘(line)의 대시 패턴 — 미지정 시 실선 */
  dash?: number[];
  /** 선 아이콘(line)의 굵기 — 미지정 시 양식의 계열 선 굵기 (classic 2.5) */
  lineWidth?: number;
  /** 선 아이콘 가운데 점의 모양 — 미지정 시 원 */
  marker?: 'circle' | 'square';
  /**
   * 선 아이콘 가운데 점의 속을 비운다 (흰색 채움 + 검정 테두리).
   *
   * 흑백 시험지가 계열 둘을 가르는 방법이다 — 실선·빈 네모와 파선·찬 동그라미
   * (2027학년도 6월 경제 16번). 플롯 «안쪽» 범례에서만 쓴다.
   */
  hollow?: boolean;
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
  /** 글꼴·양식 옵션. `options` 를 그대로 넘긴다 — 상자 선·견본 비율을 양식에서 읽는다 */
  fonts: FontOptions;
  /** 이 사각형들과 겹치는 모서리는 피한다 (막대·점 등이 가려지면 안 된다) */
  avoid?: { x0: number; y0: number; x1: number; y1: number }[];
  /** 상자 왼쪽 위를 이 자리로 못 박는다 — 부르는 쪽이 빈자리를 이미 골랐을 때 (corner·avoid 는 안 본다) */
  at?: { x: number; y: number };
}

/** 플롯 안 범례 상자의 모서리와 플롯 사이 */
const INSIDE_MARGIN = 8;

/**
 * 플롯 안 범례 상자의 크기. 상자가 플롯보다 넓어지면 이름을 자르는 대신 글꼴을 줄여
 * 폭을 맞춘다 — 그 줄인 글꼴(`font`·`fontSize`)도 함께 돌려준다.
 */
export function insideLegendSize(
  ctx: CanvasRenderingContext2D, items: LegendItem[], fontSize: number, font: string, fonts: FontOptions, plotW: number,
): { boxW: number; boxH: number; fontSize: number; font: string; swatch: number; maxIconW: number; rowH: number } {
  const padX = 8;
  ctx.save();
  const sizeOf = (fs: number) => {
    // 줄이지 않은 경우엔 받은 글꼴 문자열을 그대로 쓴다 (같은 값을 다시 조립하지 않는다)
    ctx.font = fs === fontSize ? font : withFontSize(font, fs);
    const swatch = fs * styleOf(fonts).legend.insideSwatchRatio;
    const maxIconW = Math.max(...items.map((i) => (i.type === 'line' ? swatch * 2 : swatch)));
    const maxLabelW = Math.max(...items.map((i) => ctx.measureText(i.label).width));
    return { swatch, maxIconW, boxW: padX * 2 + maxIconW + 8 + maxLabelW, rowH: fs * 1.5 };
  };
  let fs = fontSize;
  let size = sizeOf(fs);
  const avail = plotW - INSIDE_MARGIN * 2;
  while (fs > MIN_LEGEND_FONT && size.boxW > avail) {
    fs = Math.max(MIN_LEGEND_FONT, fs - 0.5);
    size = sizeOf(fs);
  }
  ctx.restore();
  return { ...size, boxH: size.rowH * items.length + 8, fontSize: fs, font: fs === fontSize ? font : withFontSize(font, fs) };
}

/** 플롯 안 모서리 자리 — 상자 왼쪽 위 */
export function insideLegendSpot(
  c: InsideLegendCorner, plotX: number, plotY: number, plotW: number, plotH: number, boxW: number, boxH: number,
): { x: number; y: number } {
  return {
    x: c.endsWith('right') ? plotX + plotW - boxW - INSIDE_MARGIN : plotX + INSIDE_MARGIN,
    y: c.startsWith('top') ? plotY + INSIDE_MARGIN : plotY + plotH - boxH - INSIDE_MARGIN,
  };
}

/** 1순위 모서리부터 네 모서리 */
export function cornerOrder(corner: InsideLegendCorner): InsideLegendCorner[] {
  const others: InsideLegendCorner[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
  return [corner, ...others.filter((c) => c !== corner)];
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
  ctx, items, corner, plotX, plotY, plotW, plotH, canvasW, canvasH, fontSize, font, fonts, avoid = [], at,
}: InsideLegendParams): void {
  if (items.length === 0) return;

  const padX = 8;
  // 상자가 플롯보다 넓어지면 그 자리에서 시작점이 플롯 밖으로 밀려난다.
  // 이름을 자르는 대신 글꼴을 줄여 폭을 맞춘다 (insideLegendSize).
  const size = insideLegendSize(ctx, items, fontSize, font, fonts, plotW);
  ctx.save();
  ctx.font = size.font;
  const { swatch, maxIconW, boxW, rowH, boxH } = size;

  const spots = cornerOrder(corner).map((c) => insideLegendSpot(c, plotX, plotY, plotW, plotH, boxW, boxH));
  const clear = (s: { x: number; y: number }) => !avoid.some(
    (b) => b.x0 < s.x + boxW && b.x1 > s.x && b.y0 < s.y + boxH && b.y1 > s.y
  );
  const picked = at ?? spots.find(clear) ?? spots[0];
  // 글꼴을 바닥까지 줄여도 안 들어가는 경우가 남는다 — 그때도 캔버스 밖으로는 안 내보낸다
  const spot = {
    x: Math.max(1, Math.min(picked.x, canvasW - boxW - 1)),
    y: Math.max(1, Math.min(picked.y, canvasH - boxH - 1)),
  };

  ctx.fillStyle = '#fff';
  ctx.fillRect(spot.x, spot.y, boxW, boxH);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = styleOf(fonts).legend.insideBoxLine;
  ctx.setLineDash([]);
  ctx.strokeRect(spot.x, spot.y, boxW, boxH);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cy = spot.y + 4 + rowH * (i + 0.5);
    drawInsideIcon(ctx, item, spot.x + padX, cy, swatch, styleOf(fonts), byStyle(fonts, LOOK));
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
  size: number,
  t: StyleTokens,
  look: (typeof LOOK)[StyleName],
) {
  if (item.type === 'line') {
    const w = size * 2;
    ctx.strokeStyle = typeof item.fillStyle === 'string' ? item.fillStyle : '#000';
    ctx.lineWidth = item.lineWidth ?? look.insideLineW ?? t.line.series;
    ctx.setLineDash(item.dash && item.dash.length > 0 ? item.dash : []);
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = item.hollow ? '#fff' : item.fillStyle;
    if (item.hollow) ctx.lineWidth = t.marker.stroke;
    const r = size * 0.3;
    if (item.marker === 'square') {
      ctx.fillRect(x + w / 2 - r, cy - r, r * 2, r * 2);
      if (item.hollow) ctx.strokeRect(x + w / 2 - r, cy - r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.arc(x + w / 2, cy, r, 0, Math.PI * 2);
      ctx.fill();
      if (item.hollow) ctx.stroke();
    }
    return;
  }

  ctx.fillStyle = item.fillStyle;
  ctx.fillRect(x, cy - size / 2, size, size);
  ctx.strokeStyle = item.strokeStyle ?? '#000';
  ctx.lineWidth = t.legend.swatchLine;
  ctx.strokeRect(x, cy - size / 2, size, size);
}

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
  /**
   * 글꼴 옵션. `options` 를 그대로 넘긴다.
   *
   * 바깥 범례는 언제나 **고딕 자리**다(시험지 원본이 그렇다). 그 자리에 무슨
   * 글꼴을 쓸지는 `options.fontStack.sans` 가 정한다. 선택 항목으로 두지
   * 않는다 — 빠뜨린 호출부를 컴파일러가 잡아야 한다.
   */
  fonts: FontOptions;
  /** 하단 범례의 plotH 아래 오프셋 (기본 50) */
  bottomOffset?: number;
  /** 우측 범례의 plotW 오른쪽 간격 (기본 20) */
  rightGap?: number;
}

const ITEM_SPACING = 30;
/** 오른쪽 범례 글꼴을 이보다 작게 줄이지는 않는다 */
const MIN_RIGHT_SCALE = 0.5;
/** 두 줄 이상일 때 줄 사이 간격 */
const ROW_GAP = 6;

/** 우측 범례일 때 필요한 추가 너비를 계산 */
export function measureLegendWidth(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  fontSize: number,
  /**
   * 글꼴 옵션. `options` 를 그대로 넘긴다.
   *
   * 선택 인자 **앞**에 둔 이유가 있다. 뒤에 붙이면 `iconType` 자리에 있던
   * `'circle'` 이 그대로 밀려 들어가도 컴파일이 통과한다. 앞에 두면 자리를
   * 빠뜨린 호출부가 전부 타입 오류가 된다.
   */
  fonts: FontOptions,
  iconType: 'rect' | 'circle' | 'line' = 'rect',
  /** 캔버스 폭 — 주면 양식의 상한(exam 40%)을 넘지 않는다. drawLegend 가 그 폭에 맞춰 글꼴을 줄인다 */
  canvasW?: number,
): number {
  ctx.save();
  ctx.font = textFont(fonts, 'legend', fontSize);
  const lg = styleOf(fonts).legend;
  const iconSize = iconType === 'line' ? lg.lineIcon : lg.swatch;
  const iconGap = lg.iconGap;
  const padding = lg.pad;
  const maxW = Math.max(...labels.map((l) => iconSize + iconGap + ctx.measureText(l).width));
  ctx.restore();
  const cap = canvasW != null ? canvasW * byStyle(fonts, LOOK).rightMaxRatio : Infinity;
  return Math.min(maxW + padding * 2 + 30, cap); // 박스 + 간격
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
  /** 글꼴 옵션. `options` 를 그대로 넘긴다 (선택 인자 앞에 둔 이유는 위 참고). */
  fonts: FontOptions,
  opts: { iconGap?: number; padding?: number; spacing?: number; font?: string } = {},
): BottomLegendLayout {
  const lg = styleOf(fonts).legend;
  const iconGap = opts.iconGap ?? lg.iconGap;
  const padding = opts.padding ?? lg.pad;
  const spacing = opts.spacing ?? ITEM_SPACING;
  const fontOf = (fs: number) => (opts.font ? withFontSize(opts.font, fs) : textFont(fonts, 'legend', fs));
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
  /** 글꼴 옵션. `options` 를 그대로 넘긴다 (선택 인자 앞에 둔 이유는 위 참고). */
  fonts: FontOptions,
  iconType: 'rect' | 'circle' | 'line' | ('rect' | 'circle' | 'line')[] = 'rect',
  bottomOffset = byStyle(fonts, LOOK).belowPlot,
): number {
  if (labels.length === 0) return 0;
  const lg = styleOf(fonts).legend;
  const sizeOf = (k: 'rect' | 'circle' | 'line') => (k === 'line' ? lg.lineIcon : lg.swatch);
  const iconWidths = labels.map((_, i) =>
    sizeOf(Array.isArray(iconType) ? (iconType[i] ?? 'rect') : iconType));
  const { boxH } = layoutBottomLegend(ctx, labels, iconWidths, fontSize, plotW, fonts);
  return bottomOffset + boxH + 2;
}

export function drawLegend({
  ctx, items, position,
  plotX, plotY, plotW, plotH,
  canvasW, canvasH,
  fontSize, fonts,
  bottomOffset = byStyle(fonts, LOOK).belowPlot,
  rightGap = 20,
}: LegendParams): number {
  if (items.length === 0) return 0;

  const t = styleOf(fonts);
  const lg = t.legend;
  const look = byStyle(fonts, LOOK);
  ctx.save();
  ctx.font = textFont(fonts, 'legend', fontSize);

  const iconGap = lg.iconGap;
  const padding = lg.pad;
  const lineHeight = fontSize + 8;
  const iconWidthOf = (item: LegendItem) => (item.type === 'line' ? lg.lineIcon : lg.swatch);

  // 각 아이템 텍스트 너비 측정
  const itemWidths = items.map((item) => iconWidthOf(item) + iconGap + ctx.measureText(item.label).width);

  if (position === 'bottom') {
    // 하단: 그래프 너비 박스, 아이템 가운데 모아서 배치.
    // 한 줄에 다 못 넣으면 줄을 늘린다 (이름은 자르지 않는다).
    const boxW = plotW;
    const layout = layoutBottomLegend(
      ctx, items.map((i) => i.label), items.map(iconWidthOf), fontSize, boxW, fonts);
    const boxH = layout.boxH;
    const boxX = plotX;
    // 호출부가 잡아 둔 아래 여백이 모자라도 캔버스 밖으로는 내보내지 않는다
    const boxY = Math.max(0, Math.min(plotY + plotH + bottomOffset, canvasH - boxH - 1));

    // 박스
    ctx.strokeStyle = lg.boxColor;
    ctx.lineWidth = lg.boxLine;
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
        drawIcon(ctx, item, cx, cy, iSize, t, look);
        ctx.font = textFont(fonts, 'legend', layout.fontSize);
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
    let maxItemW = Math.max(...itemWidths);
    // 이름이 남은 폭보다 길면 (exam) 글꼴을 줄여 담는다 — 이름은 자르지 않는다
    const room = canvasW - 1 - (plotX + plotW + rightGap) - padding * 2;
    if (Number.isFinite(look.rightMaxRatio) && room > 0 && maxItemW > room) {
      const iconW = Math.max(...items.map(iconWidthOf)) + iconGap;
      const textW = maxItemW - iconW;
      const scale = Math.max(MIN_RIGHT_SCALE, (room - iconW) / textW);
      fontSize *= scale;
      ctx.font = textFont(fonts, 'legend', fontSize);
      maxItemW = Math.max(...items.map((item) => iconWidthOf(item) + iconGap + ctx.measureText(item.label).width));
    }
    const lineHeight = fontSize + 8;
    const boxW = maxItemW + padding * 2;
    const boxH = lineHeight * items.length + itemGap * (items.length - 1) + padding * 2;
    // 호출부가 잡아 둔 오른쪽 여백이 모자라도 캔버스 밖으로는 내보내지 않는다
    const boxX = Math.max(0, Math.min(plotX + plotW + rightGap, canvasW - boxW - 1));
    const boxY = Math.max(0, Math.min(plotY + plotH - boxH, canvasH - boxH - 1));

    // 박스
    ctx.strokeStyle = lg.boxColor;
    ctx.lineWidth = lg.boxLine;
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
      drawIcon(ctx, item, ix, cy, iSize, t, look);
      ctx.font = textFont(fonts, 'legend', fontSize);
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
  size: number,
  t: StyleTokens,
  look: (typeof LOOK)[StyleName],
) {
  const swatchLine = t.legend.swatchLine;
  if (item.type === 'rect') {
    ctx.fillStyle = item.fillStyle;
    ctx.fillRect(x, cy - size / 2, size, size);
    if (item.bordered) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = swatchLine;
      ctx.strokeRect(x, cy - size / 2, size, size);
    } else if (item.strokeStyle) {
      ctx.strokeStyle = item.strokeStyle;
      ctx.lineWidth = swatchLine;
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
    ctx.lineWidth = item.lineWidth ?? look.lineW ?? t.line.series;
    if (item.dash && item.dash.length > 0) ctx.setLineDash(item.dash);
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + size, cy);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = item.fillStyle;
    ctx.beginPath();
    ctx.arc(x + size / 2, cy, look.dotR ?? t.marker.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
