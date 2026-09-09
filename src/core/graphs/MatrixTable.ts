// © 2026 김용현
// 계단식 행렬표 — 아래 삼각형만 남기고 대각선에 이름을 넣는다.
//
// 이 렌더러는 GeoGrapher 원본에 없다. GeoTester 에서 새로 만든 것이라
// `verify:port` 대조 대상이 아니다. (CHANGES.md 참조)
import { type MatrixTableData, type GraphOptions } from '../types/index';
import { clearCanvas, getFont } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';

const NAME_FILL = '#d9d9d9';
/** 칸은 서로 붙지 않는다 — 원본은 칸마다 떨어진 상자다 (글자 크기의 0.2배) */
const GAP_RATIO = 0.2;
const CELL_H_RATIO = 1.7;
/** 칸 안쪽 좌우 여백 (글자 크기 기준) */
const PAD_RATIO = 0.75;

export function renderMatrixTable(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: MatrixTableData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const n = data.names.length;
  if (n === 0) return;

  const font = options.fontFamily;

  // 칸 크기는 가장 긴 글자에 맞춘다 — 모든 칸이 같아야 계단이 반듯하다
  const base = options.fontSize.tick;
  ctx.font = getFont(base, options, 'bold');
  const widest = Math.max(
    ...data.names.map((t) => ctx.measureText(t).width),
    ...cellValues(data).map((v) => ctx.measureText(formatValue(v, data.groupThousands)).width),
  );

  const naturalW = widest + base * PAD_RATIO * 2;
  const unitH = data.unit ? options.fontSize.dataLabel * 1.6 : 0;
  // 각주 블록은 마지막 줄의 글자 높이만큼 위로 더 올라간다 (drawSourceAndFootnote).
  // 그 몫을 안 빼면 표 마지막 줄과 겹친다.
  const footCount = options.footnotes.filter((f) => f.trim()).length;
  const footH =
    (footCount > 0 ? footCount * 22 + options.fontSize.dataLabel + 12 : 0) +
    (options.source ? options.fontSize.dataLabel + 4 : 0);
  const top = options.title ? 100 : 30;

  // 이름을 가리지 않으면(실제 지명) 칸이 넓어져 캔버스를 넘는다.
  // 그럴 때는 표 전체를 줄여 넣는다 — 잘리는 것보다 작아지는 편이 낫다.
  const spanOf = (cell: number, gap: number) => cell * n + gap * (n - 1);
  const fit = Math.min(
    1,
    (w - 20) / spanOf(naturalW, naturalW * GAP_RATIO),
    (h - top - unitH - footH - 10) / spanOf(base * CELL_H_RATIO, base * GAP_RATIO),
  );

  const cellFontSize = base * fit;
  const cellW = naturalW * fit;
  const cellH = base * CELL_H_RATIO * fit;
  const gap = base * GAP_RATIO * fit;
  const pad = cellFontSize * PAD_RATIO;

  const tableW = spanOf(cellW, gap);
  const tableH = spanOf(cellH, gap);

  const tableX = Math.max(10, (w - tableW) / 2);
  const centered = top + unitH + Math.max(0, (h - top - unitH - footH - tableH) / 2);
  // 캔버스가 모자라도 각주 위로는 넘지 않는다
  const tableY = Math.max(top + unitH, Math.min(centered, h - footH - tableH));

  // 단위 — 표 오른쪽 끝에 맞춘다
  if (data.unit) {
    ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');
    ctx.fillStyle = '#000';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(data.unit, tableX + tableW, tableY - 10);
  }

  // 칸 — i번째 줄은 값 i개 다음에 이름 한 개다 (그래서 계단이 된다)
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const y = tableY + (cellH + gap) * i;
    for (let j = 0; j <= i; j++) {
      const x = tableX + (cellW + gap) * j;
      const isName = j === i;

      ctx.fillStyle = isName ? (data.nameFill ?? NAME_FILL) : '#fff';
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x, y, cellW, cellH);

      ctx.fillStyle = '#000';
      if (isName) {
        // 시험지 관습 — 기호((가)·A)는 명조, 실제 지명은 고딕이다
        const family = data.nameIsSymbol && !data.nameIsSymbol[i] ? 'sans' : font;
        ctx.font = getFont(cellFontSize, options, 'bold', family);
        ctx.textAlign = 'center';
        ctx.fillText(data.names[i], x + cellW / 2, y + cellH / 2);
      } else {
        // 값은 오른쪽 정렬 — 자릿수가 달라도 끝이 맞아야 읽힌다
        ctx.font = getFont(cellFontSize, options, 'bold');
        ctx.textAlign = 'right';
        ctx.fillText(
          formatValue(data.values[i]?.[j] ?? 0, data.groupThousands),
          x + cellW - pad,
          y + cellH / 2,
        );
      }
    }
  }

  drawTitle({ ctx, fonts: options, plotX: tableX, plotW: tableW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });
  drawSourceAndFootnote({
    ctx, fonts: options, plotX: tableX, plotW: tableW, height: h,
    source: options.source, footnotes: options.footnotes,
    fontSize: options.fontSize.dataLabel, canvasWidth: w,
  });
}

/** 실제로 그려지는 값들 (아래 삼각형) — 칸 너비를 재는 데 쓴다 */
function cellValues(data: MatrixTableData): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.names.length; i++) {
    for (let j = 0; j < i; j++) out.push(data.values[i]?.[j] ?? 0);
  }
  return out;
}

function formatValue(v: number, groupThousands = true): string {
  const rounded = Number.isInteger(v) ? v : Math.round(v);
  if (!groupThousands) return String(rounded);
  // toLocaleString 은 실행 환경의 로캘을 타므로 직접 끊는다 (서버·브라우저 동일해야 한다)
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
