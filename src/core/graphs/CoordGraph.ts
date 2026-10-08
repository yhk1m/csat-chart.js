// © 2026 김용현
// 경·위도 좌표 평면 — 2027학년도 9월 세계지리 19번 원본을 따른다. GeoTester 에서 올려 왔다(2.2.0).
//
// 틀은 가로:세로 = 2:1 (경도 360°, 위도 180°). 점선 격자, 0° 두 선은 실선.
// 경도 눈금 숫자는 적도 바로 아래, 위도 눈금 숫자는 본초 자오선 바로 왼쪽에
// 쓰고, 숫자 뒤를 흰 바탕으로 칠해 격자를 가린다. 끝 눈금만 방위를 붙인다
// (180°W·180°E·90°N·90°S). 눈금 간격은 상수라 0이 될 일이 없다.
//
// classic 은 GeoTester 의 그림과 바이트까지 같다. exam 은 다른 축 그림과 같은 토큰을 쓴다 —
// 격자는 축 격자 점선, 틀과 0° 선은 축 굵기, 눈금 숫자는 숫자 글꼴.
import type { GraphOptions } from '../types/index';
import type { CoordGraphData } from '../types/coord';
import { clearCanvas, textFont, textSize } from '../canvas/renderer';
import { textCtx } from '../canvas/parens';
import { drawTitle, drawSourceAndFootnote, sourceFootnoteReserve, LabelPlacer, type LabelBox } from '../canvas/labels';
import { EDGE, nudgeInside, textExtent } from '../canvas/fit';
import { styleOf, byStyle, labelPlace, type StyleTokens } from '../canvas/style';

const LON_STEP = 60;
const LAT_STEP = 30;

interface Look {
  grid: number;
  gridDash: number[];
  gridColor: string;
  /** 바깥 틀과 0° 두 선 */
  frame: number;
  /** 점 반지름 기본값 */
  dotR: number;
  /**
   * 점 이름을 LabelPlacer 로 눈금 숫자·점을 피해 놓고 흰 바탕을 까는가.
   * false 면 GeoTester 처럼 점 오른쪽 위에 그대로 쓴다.
   */
  placeLabels: boolean;
}

const LOOK: Record<'classic' | 'exam', (t: StyleTokens) => Look> = {
  classic: () => ({ grid: 1, gridDash: [5, 4], gridColor: '#555', frame: 1.5, dotR: 7, placeLabels: false }),
  // 2027_09 wgeo-q19: 격자는 가는 점선, 틀·0° 선은 같은 굵기의 실선 — 축 토큰을 따른다(≈, 따로 잰 적 없음).
  // 점은 꺾은선 점 기호와 같은 지름 2.8pt
  exam: (t) => ({
    grid: t.line.grid, gridDash: t.line.gridDash, gridColor: t.line.gridColor,
    frame: t.line.axis, dotR: t.marker.r, placeLabels: true,
  }),
};

export function renderCoordGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: CoordGraphData,
  options: GraphOptions,
) {
  // exam 은 괄호를 명조로 따로 찍는다 — 이 아래 모든 글자 그리기·재기가 이 ctx 를 거친다
  ctx = textCtx(ctx, options);
  clearCanvas(ctx, w, h);
  const t = styleOf(options);
  const look = byStyle(options, LOOK)(t);

  const footCount = options.footnotes.filter((f) => f.trim()).length;
  const footH = sourceFootnoteReserve(options, options.fontSize.dataLabel,
    (footCount > 0 ? footCount * 22 + options.fontSize.dataLabel + 12 : 0) +
    (options.source ? options.fontSize.dataLabel + 4 : 0));

  /** 눈금 글자 크기 s 로 잡은 틀 */
  const frameFor = (s: number) => {
    // classic 은 1.7.0 처럼 보통 굵기 — GeoTester 의 그림 그대로
    const font = textFont(options, 'tick', s, { weight: 'normal' });
    const top = (options.title ? 100 : 30) + s; // 위쪽 90°N 글자 몫
    const bottom = footH + s + 20; // 아래쪽 90°S 글자 몫
    // 180°W·180°E 는 틀 양 끝에 가운데 맞춤이라 글자 반쪽이 틀 밖으로 나간다.
    // 그 반쪽 너비 + 여유만큼만 비워 틀을 되도록 크게 잡는다.
    ctx.font = font;
    const endW = Math.max(ctx.measureText('180°W').width, ctx.measureText('180°E').width);
    const midW = ctx.measureText('120').width;
    const side = Math.ceil(endW / 2) + 16;
    // 2:1 비율로 들어가는 가장 큰 틀을 가운데 놓는다
    const availW = Math.max(0, w - side * 2);
    const availH = Math.max(0, h - top - bottom);
    const frameW = Math.min(availW, availH * 2);
    // 작은 캔버스에서 이웃한 눈금 숫자가 겹치면 그만큼 글자를 줄인다 (1 이하면 그대로)
    const crowd = frameW > 0
      ? Math.max((s + 2) / (frameW / 12), (endW / 2 + midW / 2 + 6) / (frameW / 6))
      : 1;
    return { s, font, top, availH, frameW, crowd };
  };
  let lay = frameFor(textSize(options, 'tick', options.fontSize.tick));
  for (let k = 0; k < 4 && lay.crowd > 1; k++) lay = frameFor(lay.s / lay.crowd);
  const { s: tick, font: tickFont, top, availH, frameW } = lay;
  const frameH = frameW / 2;
  const fx = (w - frameW) / 2;
  const fy = top + (availH - frameH) / 2;

  const xOf = (lon: number) => fx + ((lon + 180) / 360) * frameW;
  const yOf = (lat: number) => fy + ((90 - lat) / 180) * frameH;

  // ── 점선 격자 ─────────────────────────────────────
  ctx.strokeStyle = look.gridColor;
  ctx.lineWidth = look.grid;
  ctx.setLineDash(look.gridDash);
  ctx.beginPath();
  for (let lon = -180 + LON_STEP; lon < 180; lon += LON_STEP) {
    if (lon === 0) continue;
    ctx.moveTo(Math.round(xOf(lon)) + 0.5, fy);
    ctx.lineTo(Math.round(xOf(lon)) + 0.5, fy + frameH);
  }
  for (let lat = -90 + LAT_STEP; lat < 90; lat += LAT_STEP) {
    if (lat === 0) continue;
    ctx.moveTo(fx, Math.round(yOf(lat)) + 0.5);
    ctx.lineTo(fx + frameW, Math.round(yOf(lat)) + 0.5);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 0° 두 선과 테두리 ──────────────────────────────
  ctx.strokeStyle = '#000';
  ctx.lineWidth = look.frame;
  ctx.beginPath();
  ctx.moveTo(xOf(0), fy);
  ctx.lineTo(xOf(0), fy + frameH);
  ctx.moveTo(fx, yOf(0));
  ctx.lineTo(fx + frameW, yOf(0));
  ctx.stroke();
  ctx.strokeRect(fx, fy, frameW, frameH);

  // ── 눈금 숫자 (흰 바탕) ─────────────────────────────
  ctx.font = tickFont;
  ctx.fillStyle = '#000';
  /** 흰 바탕 상자 — exam 의 점 이름이 피해 갈 자리 */
  const taken: LabelBox[] = [];
  const label = (text: string, x: number, y: number, align: CanvasTextAlign, baseline: CanvasTextBaseline) => {
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    const m = ctx.measureText(text);
    const bw = m.width + 6;
    const bh = tick + 2;
    const bx = align === 'center' ? x - bw / 2 : align === 'right' ? x - bw + 3 : x - 3;
    const by = baseline === 'top' ? y - 1 : baseline === 'bottom' ? y - bh + 1 : y - bh / 2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#000';
    ctx.fillText(text, x, y);
    taken.push({ left: bx, right: bx + bw, top: by, bottom: by + bh });
  };

  const eqY = yOf(0) + 6;
  const pmX = xOf(0) - 6;
  for (let lon = -180; lon <= 180; lon += LON_STEP) {
    // 0 은 원본처럼 본초 자오선 왼쪽에 둔다 — 가운데 두면 흰 바탕이 자오선을 끊는다
    if (lon === 0) {
      label('0', pmX, eqY, 'right', 'top');
      continue;
    }
    const text = lon === -180 ? '180°W' : lon === 180 ? '180°E' : String(Math.abs(lon));
    label(text, xOf(lon), eqY, 'center', 'top');
  }
  for (let lat = -90 + LAT_STEP; lat < 90; lat += LAT_STEP) {
    if (lat === 0) continue;
    label(String(Math.abs(lat)), pmX, yOf(lat), 'right', 'middle');
  }
  label('90°N', xOf(0), fy, 'center', 'middle');
  label('90°S', xOf(0), fy + frameH, 'center', 'middle');

  // ── 점 ─────────────────────────────────────────────
  const r = data.pointRadius ?? look.dotR;
  /** 점 이름 글자 — 작은 캔버스에서 눈금 숫자를 줄였으면 같은 비율로 */
  const shrink = tick / textSize(options, 'tick', options.fontSize.tick);
  const nameFont = (name: string) => {
    const place = byStyle(options, { classic: 'tick' as const, exam: labelPlace(name) });
    const size = textSize(options, place, options.fontSize.tick) * shrink;
    return { font: textFont(options, place, size, { weight: 'normal' }), size };
  };
  const spots = data.points
    .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat))
    .map((p) => ({
      p,
      x: xOf(Math.max(-180, Math.min(180, p.lon))),
      y: yOf(Math.max(-90, Math.min(90, p.lat))),
    }));
  const dot = (x: number, y: number) => {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  if (look.placeLabels) {
    // exam: 점을 다 찍은 뒤 이름을 눈금 숫자·점을 피해 놓는다. 이름 뒤는 눈금 숫자처럼 흰 바탕
    spots.forEach(({ x, y }) => dot(x, y));
    if (data.showLabels) {
      const placer = new LabelPlacer(t.leader);
      taken.forEach((b) => placer.reserve(b));
      spots.forEach(({ x, y }) => placer.reserveCircle(x, y, r + 2));
      const backed = backdropCtx(ctx);
      spots.forEach(({ p, x, y }) => {
        if (!p.label) return;
        const { font, size } = nameFont(p.label);
        ctx.font = font;
        placer.place(backed, p.label, x, y, {
          gap: r + 4, lineHeight: size,
          bounds: { left: EDGE, right: w - EDGE, top: EDGE, bottom: h - EDGE },
        });
      });
    }
  } else {
    spots.forEach(({ p, x, y }) => {
      dot(x, y);
      if (!data.showLabels || !p.label) return;
      ctx.font = nameFont(p.label).font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      let lx = x + r + 2;
      const ly = y - r + 2;
      // 오른쪽 끝 점은 이름을 왼쪽에 쓴다 — 캔버스 밖으로 나가지 않게
      if (lx + textExtent(ctx, p.label).right > w - EDGE) {
        ctx.textAlign = 'right';
        lx = x - r - 2;
      }
      const at = nudgeInside(ctx, p.label, lx, ly, w, h);
      ctx.fillText(p.label, at.x, at.y);
    });
  }

  drawTitle({
    ctx, fonts: options, plotX: fx, plotW: frameW, title: options.title,
    fontSize: options.fontSize.title, canvasWidth: w,
  });
  drawSourceAndFootnote({
    ctx, fonts: options, plotX: fx, plotW: frameW, height: h,
    source: options.source, footnotes: options.footnotes,
    fontSize: options.fontSize.dataLabel, canvasWidth: w,
  });
}

/**
 * 글자를 쓰기 전에 그 자리를 흰 상자로 덮는 ctx — LabelPlacer 가 고른 자리(위 맞춤)에
 * 눈금 숫자와 같은 흰 바탕을 깐다. 격자 점선이 이름을 가로지르지 않게.
 */
function backdropCtx(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'fillText') {
        return (text: string, x: number, y: number) => {
          const e = textExtent(target, text);
          const fill = target.fillStyle;
          target.fillStyle = '#fff';
          target.fillRect(x - e.left - 3, y - e.up - 1, e.left + e.right + 6, e.up + e.down + 2);
          target.fillStyle = fill;
          target.fillText(text, x, y);
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value, target);
    },
  });
}
