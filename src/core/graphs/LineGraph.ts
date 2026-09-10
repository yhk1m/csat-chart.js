// © 2026 김용현
// 꺾은선 그래프 — 연도·월별 추이. 계열은 선 종류·굵기·회색과 기호로 구분한다.
//
// 1.6.0 에서 시험지 두 장(2027-06 한지 17번, 2026-09 한지 13번)에 맞춰 넓혔다 —
// 유도선 라벨·계열별 굵기/색·세로 격자·빈 x 라벨. 새 필드는 전부 선택이고 기본값이 예전 동작이다.
// 축·틀·격자는 AbsBarGraph·CategoryDotGraph 와 같은 구조를 쓴다.
// 한 문항에서 나란히 놓이는 경우가 있어 모양이 어긋나면 안 된다.
import {
  type LineGraphData,
  type LineMarker,
  type GraphOptions,
  LINE_DASH,
  LINE_STYLE_ORDER,
  LINE_MARKER_ORDER,
  defaultLineLeader,
} from '../types/index';
import { type Padding, clearCanvas, autoRange, getFont } from '../canvas/renderer';
import { drawYAxis } from '../canvas/axes';
import {
  drawTitle,
  drawSourceAndFootnote,
  LabelPlacer,
  labelStride,
  widestLabel,
} from '../canvas/labels';
import { drawLegend, measureLegendWidth, measureBottomLegend, type LegendItem } from '../canvas/legend';

/** 꼭짓점 기호 하나 */
function drawMarker(
  ctx: CanvasRenderingContext2D,
  marker: LineMarker,
  cx: number,
  cy: number,
  r: number,
  hollow: boolean
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
  ctx.fillStyle = hollow ? '#fff' : '#000';
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();
}

export function renderLineGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: LineGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const n = data.xLabels.length;
  const useLegend = data.labelPlacement === 'legend' && options.showLegend;
  const legendPos = options.legendPosition;
  const legendW = (useLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, data.series.map((s) => s.label), options.fontSize.dataLabel * 0.85 + 5, options, 'line')
    : 0;

  // 선 끝에 이름을 붙이면 오른쪽에 자리가 필요하다
  ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');
  const endLabelW = data.labelPlacement === 'lineEnd'
    ? widestLabel(ctx, data.series.map((s) => s.label)) + 16
    : 0;

  // x축 단위((년) 등)도 마지막 눈금 오른쪽에 놓이므로 그만큼 자리를 비워 둔다.
  // 안 그러면 좁은 패널에서 잘린다.
  ctx.font = getFont(options.fontSize.tick, options, 'bold');
  const xUnitW = data.xUnit
    ? ctx.measureText(data.xUnit).width + ctx.measureText(data.xLabels[n - 1] ?? '').width / 2 + 12
    : 0;

  const padRight = 24 + legendW + Math.max(endLabelW, xUnitW);
  // 범례가 몇 줄이 될지 먼저 재야 그만큼 아래 여백을 잡을 수 있다
  const legendReserve = (useLegend && legendPos === 'bottom' && !data.insideLegend)
    ? measureBottomLegend(ctx, data.series.map((s) => s.label),
        options.fontSize.dataLabel * 0.85, w - 130 - padRight, options, 'line')
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: padRight,
    bottom: (() => {
      let b = 70;
      // 범례를 플롯 **안쪽**에 두면 아래에 자리를 비울 필요가 없다.
      // 예전에는 그래도 60을 비워, 연도 눈금 밑에 빈 띠가 남고 플롯만 눌렸다.
      if (useLegend && legendPos === 'bottom' && !data.insideLegend) b += 60;
      b = Math.max(b, legendReserve);
      const notes = options.footnotes.filter((f) => f.trim()).length;
      // 출처를 각주와 같은 줄에 두면(sourceInline) 줄이 하나 줄어든다
      if (options.source && !(options.sourceInline && notes > 0)) b += 30;
      b += notes * 22;
      return b;
    })(),
    left: 130,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  // 축 범위.
  // 누적이면 각 x 위치의 합이 최댓값이므로 개별 값이 아니라 합을 봐야 한다.
  const allValues = data.stacked
    ? data.xLabels.map((_, i) =>
        data.series.reduce((sum, s) => {
          const v = s.values[i];
          return sum + (v !== null && Number.isFinite(v) ? v : 0);
        }, 0))
    : data.series
        .flatMap((s) => s.values)
        .filter((v): v is number => v !== null && Number.isFinite(v));
  const axis = data.yRange.auto
    ? autoRange(allValues.length > 0 ? allValues : [0, 100], 6)
    : {
        min: data.yRange.min,
        max: data.yRange.max,
        step: data.yRange.step || Math.max(1, Math.round((data.yRange.max - data.yRange.min) / 6)),
      };

  const gridColor = data.gridColor ?? '#ccc';
  const gridWidth = data.gridWidth ?? 0.5;

  // 사각 테두리
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY);
  ctx.lineTo(plotX, plotY);
  ctx.stroke();

  drawYAxis({
    ctx, padding, width: w, height: h,
    min: axis.min, max: axis.max, step: axis.step,
    label: data.yUnit,
    side: 'left',
    fonts: options,
    tickFontSize: options.fontSize.tick,
    labelFontSize: options.fontSize.axisLabel,
    drawGrid: true,
    gridColor,
    gridWidth,
  });

  // x 위치 — 첫 점과 마지막 점이 좌우 끝에 오도록 나눈다
  const stepX = n > 1 ? plotW / (n - 1) : 0;
  const toX = (i: number) => plotX + stepX * i;
  const toY = (v: number) => plotY + plotH - ((v - axis.min) / (axis.max - axis.min)) * plotH;

  // x 라벨을 어느 자리에 그리는가 — 빈 이름은 건너뛰고, 이름끼리 서로 붙으면 몇 개 걸러 그린다.
  // 걸러내기는 **이름이 있는 자리들 사이의 간격**으로 판단한다. 칸 간격으로 재면 빈
  // 이름이 섞인 5년 자료·10년 라벨에서 이름 있는 자리까지 엉뚱하게 빠진다.
  // 세로 격자도 **같은 자리**에만 긋는다 (라벨과 격자가 늘 함께 간다).
  ctx.font = getFont(options.fontSize.tick, options, 'bold');
  const named = data.xLabels.flatMap((l, i) => (l.trim() !== '' ? [i] : []));
  const namedGap = named.length > 1
    ? Math.min(...named.slice(1).map((v, k) => v - named[k]))
    : 1;
  const xStride = labelStride(stepX * namedGap, widestLabel(ctx, data.xLabels));
  const shownSet = new Set(named.filter((_, k) => k % xStride === 0));
  const labelShown = (i: number) => shownSet.has(i);

  // 세로 격자 — 선보다 먼저 그려야 선이 위에 남는다
  if (data.xGrid) {
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = gridWidth;
    ctx.setLineDash([4, 4]);
    for (let i = 1; i < n - 1; i++) {
      if (!labelShown(i)) continue;
      ctx.beginPath();
      ctx.moveTo(toX(i), plotY);
      ctx.lineTo(toX(i), plotY + plotH);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 0 기준선 (편차 그래프)
  if (data.zeroBaseline && axis.min < 0 && axis.max > 0) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(plotX, toY(0));
    ctx.lineTo(plotX + plotW, toY(0));
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 계열별로 실제로 그릴 y값.
   * 누적이면 아래 계열들의 합을 얹은 "그때까지의 합"이 된다.
   * 아래 경계(baseline)는 면적을 채울 때 쓴다.
   */
  const tops: (number | null)[][] = [];
  const bases: number[][] = [];
  {
    const running = data.xLabels.map(() => 0);
    for (const s of data.series) {
      const base = [...running];
      const top = s.values.map((v, i) => {
        if (v === null || !Number.isFinite(v)) return null;
        if (!data.stacked) return v;
        running[i] += v;
        return running[i];
      });
      tops.push(top);
      bases.push(base);
    }
  }

  // 면적 채움 — 선보다 먼저 그려야 선이 위에 남는다
  data.series.forEach((s, si) => {
    if (!s.areaFill) return;
    const top = tops[si];
    const base = bases[si];
    ctx.save();
    ctx.fillStyle = s.areaFill;
    // 값이 끊기면 구간을 나눠 채운다
    let i = 0;
    while (i < top.length) {
      if (top[i] === null) { i++; continue; }
      let j = i;
      while (j + 1 < top.length && top[j + 1] !== null) j++;

      ctx.beginPath();
      for (let k = i; k <= j; k++) ctx.lineTo(toX(k), toY(top[k] as number));
      for (let k = j; k >= i; k--) ctx.lineTo(toX(k), toY(data.stacked ? base[k] : axis.min));
      ctx.closePath();
      ctx.fill();
      i = j + 1;
    }
    ctx.restore();
  });

  // 선 — 계열마다 종류·굵기·색이 다를 수 있다
  data.series.forEach((s, si) => {
    const style = s.lineStyle ?? LINE_STYLE_ORDER[si % LINE_STYLE_ORDER.length];
    ctx.save();
    ctx.strokeStyle = s.stroke ?? '#000';
    ctx.lineWidth = s.lineWidth ?? 2;
    ctx.setLineDash(LINE_DASH[style]);
    ctx.beginPath();
    let started = false;
    tops[si].forEach((v, i) => {
      if (v === null) { started = false; return; }
      const x = toX(i);
      const y = toY(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  });

  // 꼭짓점 기호 — 선 위에 얹는다
  if (data.showMarkers) {
    data.series.forEach((s, si) => {
      const marker = s.marker ?? LINE_MARKER_ORDER[si % LINE_MARKER_ORDER.length];
      tops[si].forEach((v, i) => {
        if (v === null) return;
        drawMarker(ctx, marker, toX(i), toY(v), 4.5, s.hollowMarker ?? false);
      });
    });
  }

  // 계열 이름 — 선 끝에 붙인다.
  // 이름들이 세로 한 줄로 나란해야 하므로 x 는 고정하고 위아래로만 민다
  // (8방향 배치는 가로 위치가 흐트러져 어긋나 보인다).
  if (data.labelPlacement === 'lineEnd') {
    ctx.fillStyle = '#000';
    ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');
    const placer = new LabelPlacer();
    const lineHeight = options.fontSize.dataLabel * 1.1;
    const columnX = plotX + plotW + 10;
    const bounds = {
      left: columnX,
      right: w - 4,
      top: 4,
      bottom: h - 4,
    };
    data.series.forEach((s, si) => {
      // 값이 있는 마지막 점을 찾는다
      const top = tops[si];
      let last = -1;
      for (let i = top.length - 1; i >= 0; i--) {
        if (top[i] !== null) { last = i; break; }
      }
      if (last < 0) return;
      placer.placeInColumn(
        ctx,
        s.label,
        columnX,
        toY(top[last] as number) - lineHeight / 2,
        { lineHeight, bounds },
      );
    });
  }

  // 계열 이름 — 유도선. 라벨을 점에서 (dx, dy) 떨어진 곳에 쓰고,
  // 라벨 상자 가장자리에서 점을 향해 가는 실선을 점 3px 앞까지 긋는다.
  // 상자가 점을 덮으면 선은 생략한다.
  if (data.labelPlacement === 'leader') {
    ctx.save();
    ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineH = options.fontSize.dataLabel;
    data.series.forEach((s, si) => {
      const top = tops[si];
      const leader = s.leader ?? defaultLineLeader(n);
      // 가리킬 점 번호가 범위를 벗어나면(행을 지운 뒤 등) 끝으로 당기고,
      // 그 점에 값이 없으면 값이 있는 가장 가까운 점으로 옮긴다
      const start = Math.min(n - 1, Math.max(0, Math.round(leader.at)));
      let at = -1;
      for (let d = 0; d < n && at < 0; d++) {
        for (const k of [start - d, start + d]) {
          if (k >= 0 && k < n && top[k] !== null) { at = k; break; }
        }
      }
      if (at < 0) return;

      const px = toX(at);
      const py = toY(top[at] as number);
      const lx = px + leader.dx;
      const ly = py + leader.dy;
      const halfW = ctx.measureText(s.label).width / 2 + 2;
      const halfH = lineH / 2 + 2;

      // 라벨 중심→점 선분이 상자 경계와 만나는 매개변수 t (t < 1 이면 점이 상자 밖)
      const vx = px - lx;
      const vy = py - ly;
      const t = Math.min(
        vx !== 0 ? halfW / Math.abs(vx) : Infinity,
        vy !== 0 ? halfH / Math.abs(vy) : Infinity,
      );
      const dist = Math.hypot(vx, vy);
      if (Number.isFinite(t) && t < 1 && dist > 3) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(lx + vx * t, ly + vy * t);
        ctx.lineTo(px - (vx / dist) * 3, py - (vy / dist) * 3);
        ctx.stroke();
      }
      ctx.fillText(s.label, lx, ly);
    });
    ctx.restore();
  }

  // X축 눈금 이름 — 빈 이름은 건너뛴다
  ctx.fillStyle = '#000';
  ctx.font = getFont(options.fontSize.tick, options, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  data.xLabels.forEach((label, i) => {
    if (!labelShown(i)) return;
    ctx.fillText(label, toX(i), plotY + plotH + 10);
  });

  // X축 단위 — 마지막 눈금 이름 오른쪽.
  // 마지막 이름은 가운데 정렬이라 절반이 축 밖으로 나온다. 그만큼 더 띄운다.
  if (data.xUnit) {
    const lastLabelHalf = ctx.measureText(data.xLabels[n - 1] ?? '').width / 2;
    ctx.textAlign = 'left';
    ctx.fillText(data.xUnit, plotX + plotW + lastLabelHalf + 6, plotY + plotH + 10);
  }

  if (options.title) {
    drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });
  }

  if (useLegend && data.insideLegend) {
    // 시험지 누적 면적 그래프는 범례를 플롯 안쪽 왼쪽 위에 작은 상자로 둔다
    ctx.save();
    ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');
    const rowH = options.fontSize.dataLabel * 1.15;
    const swatch = rowH * 0.75;
    const boxW = swatch + 6 + widestLabel(ctx, data.series.map((s) => s.label)) + 10;
    let ly = plotY + 6;
    for (const s of data.series) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(plotX + 6, ly, boxW, rowH);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(plotX + 6, ly, boxW, rowH);

      ctx.fillStyle = s.areaFill ?? '#000';
      ctx.fillRect(plotX + 10, ly + (rowH - swatch) / 2, swatch, swatch);
      ctx.strokeRect(plotX + 10, ly + (rowH - swatch) / 2, swatch, swatch);

      ctx.fillStyle = '#000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, plotX + 10 + swatch + 5, ly + rowH / 2);
      ly += rowH;
    }
    ctx.restore();
  } else if (useLegend) {
    // 범례 아이콘도 선과 같은 색·굵기·대시로
    const items: LegendItem[] = data.series.map((s, si) => ({
      type: 'line',
      fillStyle: s.stroke ?? '#000',
      strokeStyle: s.stroke ?? '#000',
      lineWidth: s.lineWidth ?? 2,
      label: s.label,
      dash: LINE_DASH[s.lineStyle ?? LINE_STYLE_ORDER[si % LINE_STYLE_ORDER.length]],
    }));
    drawLegend({
      ctx, fonts: options, items, position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: options.fontSize.dataLabel * 0.85,
    });
  }

  drawSourceAndFootnote({
    ctx, fonts: options, plotX, plotW, height: h, canvasWidth: w,
    source: options.source,
    sourceInline: options.sourceInline,
    footnotes: options.footnotes,
    fontSize: options.fontSize.dataLabel * 0.85,
  });
}
