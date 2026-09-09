// © 2026 김용현
import { type RadarGraphData, type GraphOptions } from '../types/index';
import { clearCanvas, getFont } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawLegend, measureLegendWidth, measureBottomLegend } from '../canvas/legend';
import { EDGE, MIN_SCALE, fillLines, largestFitting, textExtent, wrapToWidth } from '../canvas/fit';

// 계열별 선 스타일
const LINE_STYLES: { dash: number[]; width: number }[] = [
  { dash: [], width: 2 },
  { dash: [8, 4], width: 2 },
  { dash: [2, 3], width: 2 },
  { dash: [8, 3, 2, 3], width: 2 },
  { dash: [12, 4, 2, 4, 2, 4], width: 2 },
];

const GRAY_SHADES = ['#000', '#444', '#777', '#AAA', '#CCC'];

export function renderRadarChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: RadarGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const fs = options.fontSize;
  const n = data.axisLabels.length;
  if (n < 3) return;

  const showLegend = options.showLegend && data.series.length > 1;
  const legendPos = options.legendPosition;
  const legendLabels = data.series.map((s) => s.label);
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, legendLabels, fs.dataLabel * 0.85 + 5, options, 'line')
    : 0;

  const topPad = options.title ? 60 : 10;
  const rightPad = 60 + legendW;
  const leftPad = 60;
  let bottomPad = 10;
  if (showLegend && legendPos === 'bottom') {
    bottomPad += 70;
    // 상수 70 은 한 줄짜리 상자(높이 55.7)에도 모자랐다 — 실제 높이를 재서 잡는다
    bottomPad = Math.max(bottomPad, measureBottomLegend(
      ctx, legendLabels, fs.dataLabel * 0.85 + 5, w - leftPad - rightPad, options, 'line', 30));
  }
  if (options.source) bottomPad += 25;
  bottomPad += options.footnotes.filter(f => f.trim()).length * 22;

  const availW = w - leftPad - rightPad;
  const availH = h - topPad - bottomPad;
  const cx = leftPad + availW / 2;
  const cy = topPad + availH / 2;

  // 각 축의 각도 (12시 방향부터 시계 방향)
  const angles = Array.from({ length: n }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / n);

  // 축 이름은 꼭짓점 **바깥**(반지름 + 20)에 놓인다. 상수 40 은 「축1」 정도만
  // 감당해서, 「주간 인구 지수」 같은 이름은 왼쪽으로 59.7px 이 캔버스 밖이었다.
  // 세워 놓은 이름이 아니므로 여백을 넓히면 되지만 여기서 여백을 넓히는 것은
  // 곧 **반지름을 줄이는 것**이다 (범례 때 플롯이 줄어든 것과 같은 손해다).
  // 다만 그림이 5분의 1 넘게 줄어들 판이면 줄이기 전에 이름을 접는다.
  const labelFontSize = fs.axisLabel * 0.85;
  const makeLabelFont = (size: number) => getFont(size, options, 'bold');
  const { radius, labelLines, labelSize } = fitAxisLabels(
    ctx, data.axisLabels, angles, cx, cy, w, h,
    Math.min(availW, availH) / 2 - 40, labelFontSize, makeLabelFont,
  );

  // 최대값
  const allValues = data.series.flatMap((s) => s.values);
  const dataMax = allValues.length > 0 ? Math.max(...allValues, 1) : 100;
  const maxVal = data.autoMax ? Math.ceil(dataMax / data.gridSteps) * data.gridSteps : data.maxValue;

  const toXY = (angle: number, r: number): [number, number] => [
    cx + Math.cos(angle) * r,
    cy + Math.sin(angle) * r,
  ];

  // 동심 다각형 격자
  ctx.save();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.8;
  for (let step = 1; step <= data.gridSteps; step++) {
    const r = (step / data.gridSteps) * radius;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [px, py] = toXY(angles[i % n], r);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 축 선
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const [px, py] = toXY(angles[i], radius);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  // 눈금값
  ctx.fillStyle = '#888';
  ctx.font = getFont(fs.tick * 0.8, options, 'normal');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let step = 1; step <= data.gridSteps; step++) {
    const val = (maxVal / data.gridSteps) * step;
    const r = (step / data.gridSteps) * radius;
    ctx.fillText(formatTick(val), cx + 4, cy - r - 2);
  }

  // 축 라벨
  ctx.fillStyle = '#000';
  ctx.font = makeLabelFont(labelSize);
  for (let i = 0; i < n; i++) {
    const [px, py] = toXY(angles[i], radius + 20);
    setLabelAlign(ctx, angles[i]);
    fillLines(ctx, labelLines[i], px, py, labelSize * LABEL_LINE_RATIO);
  }

  // 계열별 포인트 좌표 사전 계산
  const allPts = data.series.map((series) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const val = series.values[i] || 0;
      const r = (val / maxVal) * radius;
      pts.push(toXY(angles[i], r));
    }
    return pts;
  });

  // 1단계: 채움 먼저 전부 그리기
  if (data.showFill) {
    for (let si = 0; si < data.series.length; si++) {
      const color = GRAY_SHADES[si % GRAY_SHADES.length];
      const pts = allPts[si];
      const r = parseInt(color.slice(1, 2), 16) * 17;
      const g = parseInt(color.slice(2, 3), 16) * 17;
      const b = parseInt(color.slice(3, 4), 16) * 17;
      ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const [px, py] = pts[i % n];
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.fill();
    }
  }

  // 2단계: 선과 포인트를 채움 위에 그리기
  for (let si = 0; si < data.series.length; si++) {
    const style = LINE_STYLES[si % LINE_STYLES.length];
    const color = GRAY_SHADES[si % GRAY_SHADES.length];
    const pts = allPts[si];

    // 다각형 선
    ctx.strokeStyle = color;
    ctx.lineWidth = style.width;
    ctx.setLineDash(style.dash);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [px, py] = pts[i % n];
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 데이터 포인트
    for (let i = 0; i < n; i++) {
      const [px, py] = pts[i];
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 범례
  if (showLegend) {
    const plotX = leftPad;
    const plotY = topPad;
    const plotW = availW;
    const plotH = availH;

    const items = data.series.map((s, i) => {
      const style = LINE_STYLES[i % LINE_STYLES.length];
      return {
        type: 'line' as const,
        fillStyle: GRAY_SHADES[i % GRAY_SHADES.length],
        label: s.label,
        dash: style.dash,
        lineWidth: style.width,
      };
    });
    drawLegend({
      ctx, fonts: options, items, position: legendPos,
      plotX, plotY, plotW, plotH,
      canvasW: w, canvasH: h,
      fontSize: fs.dataLabel * 0.85 + 5,
      bottomOffset: 30,
    });
  }

  const plotX = leftPad;
  const plotW = availW;
  drawTitle({ ctx, fonts: options, plotX, plotW, title: options.title, fontSize: fs.title, canvasWidth: w });
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: fs.dataLabel, canvasWidth: w });
}

function formatTick(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
}

/** 접힌 축 이름의 줄 간격 (글꼴 크기 대비) */
const LABEL_LINE_RATIO = 1.25;

/** 이름을 접느니 반지름을 줄이겠다고 보는 한계 — 이보다 작아지면 접는다 */
const SHRINK_LIMIT = 0.8;

/** 축 이름은 바깥쪽을 보게 정렬한다 — 재는 쪽과 그리는 쪽이 같아야 한다 */
function setLabelAlign(ctx: CanvasRenderingContext2D, angle: number) {
  if (Math.abs(Math.cos(angle)) < 0.1) ctx.textAlign = 'center';
  else if (Math.cos(angle) > 0) ctx.textAlign = 'left';
  else ctx.textAlign = 'right';

  if (Math.abs(Math.sin(angle)) < 0.1) ctx.textBaseline = 'middle';
  else if (Math.sin(angle) > 0) ctx.textBaseline = 'top';
  else ctx.textBaseline = 'bottom';
}

/**
 * 축 이름이 캔버스 안에 들어가는 가장 큰 반지름을 찾는다.
 *
 * 반지름을 키우면 이름이 바깥으로 나가므로 «들어가는가» 는 반지름에 대해
 * 단조롭다 — 이분 탐색이 맞는다. 예전 반지름에서 이미 들어가면 **그 값을
 * 그대로** 돌려주므로 멀쩡한 그림은 한 픽셀도 움직이지 않는다.
 *
 * 순서는 (1) 반지름을 줄여 자리를 낸다, (2) 그림이 5분의 1 넘게 줄어들 판이면
 * 이름을 여러 줄로 접고 다시 잰다, (3) 그래도 모자라면 이름 글꼴을 줄인다.
 * 어느 단계에서도 이름을 잘라 내지 않는다.
 */
function fitAxisLabels(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  angles: number[],
  cx: number,
  cy: number,
  w: number,
  h: number,
  maxRadius: number,
  fontSize: number,
  makeFont: (size: number) => string,
): { radius: number; labelLines: string[][]; labelSize: number } {
  ctx.save();

  let size = fontSize;
  let lines = labels.map((l) => [l]);

  /** 반지름 r 에서 i 번째 이름이 놓이는 자리 */
  const boxOf = (r: number, i: number) => {
    const px = cx + Math.cos(angles[i]) * (r + 20);
    const py = cy + Math.sin(angles[i]) * (r + 20);
    setLabelAlign(ctx, angles[i]);
    const es = lines[i].map((l) => textExtent(ctx, l));
    const half = ((lines[i].length - 1) * size * LABEL_LINE_RATIO) / 2;
    return {
      x0: px - Math.max(...es.map((e) => e.left)),
      x1: px + Math.max(...es.map((e) => e.right)),
      y0: py - half - Math.max(...es.map((e) => e.up)),
      y1: py + half + Math.max(...es.map((e) => e.down)),
    };
  };

  const fits = (r: number) => labels.every((_, i) => {
    const b = boxOf(r, i);
    return b.x0 >= EDGE && b.x1 <= w - EDGE && b.y0 >= EDGE && b.y1 <= h - EDGE;
  });

  ctx.font = makeFont(size);
  let radius = largestFitting(10, maxRadius, fits);

  if (radius < maxRadius * SHRINK_LIMIT) {
    // 예전 반지름에서 각 이름이 가로로 쓸 수 있는 몫만큼 접는다
    lines = labels.map((label, i) => {
      const px = cx + Math.cos(angles[i]) * (maxRadius + 20);
      setLabelAlign(ctx, angles[i]);
      const room = ctx.textAlign === 'left' ? w - EDGE - px
        : ctx.textAlign === 'right' ? px - EDGE
          : 2 * Math.min(px - EDGE, w - EDGE - px);
      return wrapToWidth(ctx, label, Math.max(20, room));
    });
    radius = largestFitting(10, maxRadius, fits);
  }

  if (radius <= 10) {
    // 반지름을 바닥까지 줄여도 안 들어간다 — 이름 글꼴을 줄여 본다
    size = fontSize * MIN_SCALE;
    ctx.font = makeFont(size);
    lines = lines.map((ls) => ls.flatMap((l) => wrapToWidth(ctx, l, Math.max(20, w / 3))));
    radius = largestFitting(10, maxRadius, fits);
  }

  ctx.restore();
  return { radius, labelLines: lines, labelSize: size };
}
