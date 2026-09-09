// © 2026 김용현
// 항목 × 지역 데이터 표 — 머리글 행에 지역 기호, 왼쪽 열에 항목 이름.
//
// 이 렌더러는 GeoGrapher 원본에 없다. GeoTester 에서 새로 만든 것이라
// `verify:port` 대조 대상이 아니다. (CHANGES.md 참조)
//
// 계단식 행렬표(MatrixTable)와 달리 칸이 서로 붙어 있다. 원본 시험지의 표는
// 머리글 행만 회색이고, 항목 이름은 가운데, 값은 오른쪽으로 정렬한다.
import { type DataTableData, type DataTableRow, type GraphOptions } from '../types/index';
import { clearCanvas, getFont, type FontOptions } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';

const HEADER_FILL = '#d9d9d9';
/** 칸 높이 (글자 크기 기준) */
const CELL_H_RATIO = 1.7;
/** 칸 안쪽 좌우 여백 (글자 크기 기준) */
const PAD_RATIO = 0.75;
/** 항목 이름 뒤 괄호 단위는 이름보다 작게 쓴다 */
const UNIT_RATIO = 0.8;

export function renderDataTable(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: DataTableData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const cols = data.columns.length;
  const rows = data.rows.length;
  if (cols === 0 || rows === 0) return;

  const font = options.fontFamily;
  const base = options.fontSize.tick;

  // ── 자연스러운 칸 크기부터 잰다 ──────────────────────────
  ctx.font = getFont(base, options, 'bold');
  const labelTextW = Math.max(
    ctx.measureText(data.cornerLabel).width,
    ...data.rows.map((r) => rowLabelWidth(ctx, r, base, options))
  );
  // 값 열은 서로 폭이 같아야 표가 반듯하다 — 가장 넓은 글자에 맞춘다
  const valueTextW = Math.max(
    ...data.columns.map((c) => ctx.measureText(c).width),
    ...data.rows.flatMap((r) =>
      r.values.map((v) => ctx.measureText(formatValue(v, r.decimals, data.groupThousands)).width)
    )
  );

  const naturalLabelW = labelTextW + base * PAD_RATIO * 2;
  const naturalValueW = valueTextW + base * PAD_RATIO * 2;
  const naturalCellH = base * CELL_H_RATIO;

  const top = options.title ? 100 : 30;
  // 각주 블록은 마지막 줄의 글자 높이만큼 위로 더 올라간다 (drawSourceAndFootnote).
  // 그 몫을 안 빼면 표 마지막 줄과 겹친다.
  const footCount = options.footnotes.filter((f) => f.trim()).length;
  const footH =
    (footCount > 0 ? footCount * 22 + options.fontSize.dataLabel + 12 : 0) +
    (options.source ? options.fontSize.dataLabel + 4 : 0);

  // 항목 이름이 길면 표가 캔버스를 넘는다. 그럴 때는 표 전체를 줄여 넣는다 —
  // 잘리는 것보다 작아지는 편이 낫다. (MatrixTable 과 같은 규칙)
  const fit = Math.min(
    1,
    (w - 20) / (naturalLabelW + naturalValueW * cols),
    (h - top - footH - 10) / (naturalCellH * (rows + 1))
  );

  const cellFontSize = base * fit;
  const labelW = naturalLabelW * fit;
  const valueW = naturalValueW * fit;
  const cellH = naturalCellH * fit;
  const pad = cellFontSize * PAD_RATIO;

  const tableW = labelW + valueW * cols;
  const tableH = cellH * (rows + 1);

  const tableX = Math.max(10, (w - tableW) / 2);
  const centered = top + Math.max(0, (h - top - footH - tableH) / 2);
  // 캔버스가 모자라도 각주 위로는 넘지 않는다
  const tableY = Math.max(top, Math.min(centered, h - footH - tableH));

  const columnX = (j: number) => tableX + labelW + valueW * j;

  // ── 머리글 행 ────────────────────────────────────────
  ctx.fillStyle = data.headerFill ?? HEADER_FILL;
  ctx.fillRect(tableX, tableY, tableW, cellH);

  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = getFont(cellFontSize, options, 'bold');
  ctx.fillText(data.cornerLabel, tableX + labelW / 2, tableY + cellH / 2, labelW - pad * 2);

  data.columns.forEach((name, j) => {
    // 시험지 관습 — 기호((가)·A)는 명조, 실제 지명은 고딕이다
    const family = data.columnIsSymbol && !data.columnIsSymbol[j] ? 'sans' : font;
    ctx.font = getFont(cellFontSize, options, 'bold', family);
    ctx.fillText(name, columnX(j) + valueW / 2, tableY + cellH / 2, valueW - pad * 2);
  });

  // ── 값 행 ────────────────────────────────────────────
  data.rows.forEach((row, i) => {
    const y = tableY + cellH * (i + 1);

    drawRowLabel(ctx, row, tableX + labelW / 2, y + cellH / 2, cellFontSize, options);

    ctx.font = getFont(cellFontSize, options, 'bold');
    ctx.textAlign = 'right';
    for (let j = 0; j < cols; j++) {
      const v = row.values[j];
      if (v === undefined) continue;
      // 값은 오른쪽 정렬 — 자릿수가 달라도 끝이 맞아야 읽힌다
      ctx.fillText(
        formatValue(v, row.decimals, data.groupThousands),
        columnX(j) + valueW - pad,
        y + cellH / 2,
        valueW - pad * 2
      );
    }
    ctx.textAlign = 'center';
  });

  // ── 선 ───────────────────────────────────────────────
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for (let i = 1; i <= rows; i++) {
    const y = tableY + cellH * i;
    line(ctx, tableX, y, tableX + tableW, y);
  }
  line(ctx, tableX + labelW, tableY, tableX + labelW, tableY + tableH);
  for (let j = 1; j < cols; j++) {
    line(ctx, columnX(j), tableY, columnX(j), tableY + tableH);
  }

  // 바깥 테두리는 굵게 — 원본 시험지가 그렇다
  ctx.lineWidth = 2;
  ctx.strokeRect(tableX, tableY, tableW, tableH);

  drawTitle({ ctx, fonts: options, plotX: tableX, plotW: tableW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });
  drawSourceAndFootnote({
    ctx, fonts: options, plotX: tableX, plotW: tableW, height: h,
    source: options.source, footnotes: options.footnotes,
    fontSize: options.fontSize.dataLabel, canvasWidth: w,
  });
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** 이름 + 단위를 한 덩어리로 보고 잰 폭 */
function rowLabelWidth(
  ctx: CanvasRenderingContext2D,
  row: DataTableRow,
  size: number,
  options: FontOptions,
): number {
  ctx.font = getFont(size, options, 'bold');
  const labelW = ctx.measureText(row.label).width;
  if (!row.unit) return labelW;
  ctx.font = getFont(size * UNIT_RATIO, options, 'bold');
  return labelW + ctx.measureText(row.unit).width;
}

/** 이름과 단위를 한 덩어리로 가운데 정렬해 그린다 — 단위만 조금 작다 */
function drawRowLabel(
  ctx: CanvasRenderingContext2D,
  row: DataTableRow,
  cx: number,
  cy: number,
  size: number,
  options: FontOptions,
) {
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';
  ctx.font = getFont(size, options, 'bold');
  const labelW = ctx.measureText(row.label).width;

  if (!row.unit) {
    ctx.textAlign = 'center';
    ctx.fillText(row.label, cx, cy);
    return;
  }

  ctx.font = getFont(size * UNIT_RATIO, options, 'bold');
  const unitW = ctx.measureText(row.unit).width;
  const startX = cx - (labelW + unitW) / 2;

  ctx.textAlign = 'left';
  ctx.font = getFont(size, options, 'bold');
  ctx.fillText(row.label, startX, cy);
  ctx.font = getFont(size * UNIT_RATIO, options, 'bold');
  ctx.fillText(row.unit, startX + labelW, cy);
  ctx.textAlign = 'center';
}

/**
 * 값 하나를 표에 쓸 글자로 바꾼다.
 *
 * 시험지 표는 소수 한 자리가 기본이다(40.5·-21.4). 자릿수를 맞춰야 칸마다
 * 끝자리가 나란히 선다 — `3.8` 과 `4` 가 섞이면 표가 어수선해진다.
 */
function formatValue(v: number, decimals = 1, groupThousands = true): string {
  if (!Number.isFinite(v)) return '-';
  const fixed = v.toFixed(decimals);
  if (!groupThousands) return fixed;
  // toLocaleString 은 실행 환경의 로캘을 타므로 직접 끊는다 (서버·브라우저 동일해야 한다)
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}
