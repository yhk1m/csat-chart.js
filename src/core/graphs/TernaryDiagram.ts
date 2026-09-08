// © 2026 김용현
import { type TernaryGraphData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, getFont } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { EDGE, MIN_SCALE, fillLines, largestFitting, shrinkToWidth, textExtent, wrapToWidth } from '../canvas/fit';

// 삼각좌표 → 캔버스 좌표 변환
// a = 하단좌, b = 하단우, c = 상단
function ternaryToXY(
  a: number, b: number, c: number,
  cx: number, cy: number, size: number
): { x: number; y: number } {
  const total = a + b + c;
  if (total === 0) return { x: cx, y: cy };
  const na = a / total;
  const nb = b / total;
  const nc = c / total;
  // 꼭짓점: 상단(cx, cy - h), 좌하(cx - size/2, cy + h/3*?), 우하
  const h = size * Math.sqrt(3) / 2;
  // 상단 = C, 좌하 = A, 우하 = B
  const topX = cx, topY = cy - h * 2 / 3;
  const leftX = cx - size / 2, leftY = cy + h / 3;
  const rightX = cx + size / 2, rightY = cy + h / 3;

  const x = nc * topX + na * leftX + nb * rightX;
  const y = nc * topY + na * leftY + nb * rightY;
  return { x, y };
}

export function renderTernaryGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: TernaryGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  // 하단 여백: tick + 숫자 + 축라벨 + 출처/각주
  const tickSpace = 12 + options.fontSize.tick + 10;
  const axisLabelSpace = options.fontSize.axisLabel * 1.3 + 30;
  let bottomExtra = tickSpace + axisLabelSpace;
  if (options.source) bottomExtra += options.fontSize.dataLabel + 10;
  bottomExtra += options.footnotes.filter(f => f.trim()).length * 22;

  const padding: Padding = {
    top: options.title ? 80 : 50,
    right: 120,
    bottom: bottomExtra,
    left: 120,
  };

  const plotX = padding.left;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;
  // 삼각형 크기: plot 영역에 맞춤
  const triSizeByW = plotW * 0.9;
  const triSizeByH = plotH * 2 / Math.sqrt(3);

  // 축 이름은 삼각형 **바깥** 좌·우·아래에 52px 떨어져 붙는다. 이름이 길면
  // 삼각형을 줄여 자리를 낸다 — 방사형·정육면체와 같은 손해다. 다만 그림이
  // 5분의 1 넘게 줄어들 판이면 줄이기 전에 이름을 접는다.
  const nameFit = fitAxisNames(
    ctx, data.axisLabels, options, w, h, plotX + plotW / 2, padding.top,
    Math.min(triSizeByW, triSizeByH),
  );
  const triSize = nameFit.size;
  const triH = triSize * Math.sqrt(3) / 2;

  const cx = plotX + plotW / 2;
  // 상단 꼭짓점을 padding.top + 11에 배치
  const cy = padding.top + 11 + triH * 2 / 3;

  const font = options.fontFamily;
  const customFont = options.customFont;

  // 삼각형 꼭짓점
  const topPt = { x: cx, y: cy - triH * 2 / 3 };
  const leftPt = { x: cx - triSize / 2, y: cy + triH / 3 };
  const rightPt = { x: cx + triSize / 2, y: cy + triH / 3 };

  // 격자선
  const interval = data.gridInterval;
  const steps = 100 / interval;

  ctx.save();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < steps; i++) {
    const v = i * interval;
    // A축 평행선 (하변과 평행, 상수 c = v)
    const a1 = ternaryToXY(100 - v, 0, v, cx, cy, triSize);
    const a2 = ternaryToXY(0, 100 - v, v, cx, cy, triSize);
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.stroke();

    // B축 평행선 (우변과 평행, 상수 a = v)
    const b1 = ternaryToXY(v, 100 - v, 0, cx, cy, triSize);
    const b2 = ternaryToXY(v, 0, 100 - v, cx, cy, triSize);
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.stroke();

    // C축 평행선 (좌변과 평행, 상수 b = v)
    const c1 = ternaryToXY(0, v, 100 - v, cx, cy, triSize);
    const c2 = ternaryToXY(100 - v, v, 0, cx, cy, triSize);
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.stroke();
  }
  ctx.restore();

  // 삼각형 외곽선
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(topPt.x, topPt.y);
  ctx.lineTo(leftPt.x, leftPt.y);
  ctx.lineTo(rightPt.x, rightPt.y);
  ctx.closePath();
  ctx.stroke();

  // 축 눈금 tick mark + 숫자
  // tick 방향 = 격자선 방향의 연장 (삼각형 바깥으로)
  // A축(좌변) 격자선은 하변과 평행 → 수평 좌측으로 (180°, dx=-1, dy=0)
  // B축(하변) 격자선은 우변과 평행 → 60° 방향 아래로 (dx=cos(-60°), dy=sin(-60°)) = (0.5, 0.866)
  // C축(우변) 격자선은 좌변과 평행 → 수평 우측으로 (0°, dx=1, dy=0)
  // 아니... 정확히 생각하면:
  // 좌변의 tick은 좌변에서 바깥쪽, 격자선(하변 평행=수평) 방향 → 좌측 수평
  // 하변의 tick은 하변에서 바깥쪽, 격자선(좌변 평행=120°) 방향 → 60° 아래 좌측
  // 우변의 tick은 우변에서 바깥쪽, 격자선(하변 평행=수평) 방향 → 우측 수평
  const tickLen = 12;

  // A축(좌변) tick 방향: 수평 좌측 (-1, 0)
  const aTick = { x: -1, y: 0 };
  // B축(하변) tick 방향: 120° = (cos60°, sin60°) → 우하 방향
  const bTick = { x: Math.cos(Math.PI / 3), y: Math.sin(Math.PI / 3) };
  // C축(우변) tick 방향: 60° = (cos60°, -sin60°)
  const cTick = { x: Math.cos(Math.PI / 3), y: -Math.sin(Math.PI / 3) };

  ctx.fillStyle = '#000';
  ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;

  for (let i = 0; i <= steps; i++) {
    const val = i * interval;

    // A축 (좌변: bottom → top, 시계방향) — tick + 숫자
    const aPos = ternaryToXY(100 - val, 0, val, cx, cy, triSize);
    ctx.beginPath();
    ctx.moveTo(aPos.x, aPos.y);
    ctx.lineTo(aPos.x + aTick.x * tickLen, aPos.y + aTick.y * tickLen);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), aPos.x + aTick.x * tickLen - 4, aPos.y + aTick.y * tickLen);

    // B축 (하변: right → left, 시계방향) — tick + 숫자
    const bPos = ternaryToXY(val, 100 - val, 0, cx, cy, triSize);
    ctx.beginPath();
    ctx.moveTo(bPos.x, bPos.y);
    ctx.lineTo(bPos.x + bTick.x * tickLen, bPos.y + bTick.y * tickLen);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(val), bPos.x + bTick.x * tickLen, bPos.y + bTick.y * tickLen + 4);

    // C축 (우변: top → bottom, 시계방향) — tick + 숫자
    const cPos = ternaryToXY(0, val, 100 - val, cx, cy, triSize);
    ctx.beginPath();
    ctx.moveTo(cPos.x, cPos.y);
    ctx.lineTo(cPos.x + cTick.x * tickLen, cPos.y + cTick.y * tickLen);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const cLabel = val === 100 ? '100 (%)' : String(val);
    ctx.fillText(cLabel, cPos.x + cTick.x * tickLen + 4, cPos.y + cTick.y * tickLen);
  }

  // 축 라벨 — 자리는 재는 쪽(fitAxisNames)과 같은 계산을 쓴다
  ctx.font = getFont(nameFit.fontSize, font, customFont, 'bold');
  ctx.fillStyle = '#000';
  const labelLineH = nameFit.fontSize * 1.3;
  const spots = namePlaces(w, plotX + plotW / 2, padding.top, triSize, nameFit.lines, labelLineH);
  for (let i = 0; i < 3; i++) {
    ctx.textAlign = spots[i].align;
    ctx.textBaseline = spots[i].baseline;
    fillLines(ctx, nameFit.lines[i], spots[i].x, spots[i].y, labelLineH);
  }

  // 데이터 포인트
  for (let i = 0; i < data.points.length; i++) {
    const p = data.points[i];
    // 시계방향 좌표: user(a,b,c) → internal(b, c, a)
    const { x, y } = ternaryToXY(p.b, p.c, p.a, cx, cy, triSize);

    // 점
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // 라벨
    if (p.label) {
      ctx.fillStyle = '#000';
      ctx.font = getFont(options.fontSize.dataLabel, font, customFont, 'bold');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.label, x + 10, y - 4);
    }

    // 데이터 라벨 (값 표시)
    if (options.showDataLabels) {
      ctx.fillStyle = '#555';
      ctx.font = getFont(options.fontSize.dataLabel * 0.8, font, customFont);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`(${p.a}, ${p.b}, ${p.c})`, x + 10, y + 4);
    }
  }

  // 제목
  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });


  // 출처 + 각주 — 삼각형 좌우 범위 기준
  drawSourceAndFootnote({ ctx, plotX: leftPt.x, plotW: rightPt.x - leftPt.x, height: h, source: options.source, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel, canvasWidth: w });
}

// ── 축 이름 자리 잡기 ────────────────────────────────────────
//
// 세 이름은 삼각형 바깥에 붙으므로, 삼각형을 키우면 이름이 캔버스 밖으로
// 밀린다 — «들어가는가» 가 크기에 대해 단조로우니 이분 탐색이 맞는다.

/** 이름을 접느니 삼각형을 줄이겠다고 보는 한계 — 이보다 작아지면 접는다 */
const SHRINK_LIMIT = 0.8;

interface NameSpot {
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
}

/**
 * 삼각형 크기가 정해졌을 때 세 축 이름이 놓이는 자리.
 * `y` 는 **줄 묶음의 세로 가운데**다 (한 줄이면 예전 좌표와 정확히 같다).
 */
function namePlaces(
  _w: number, cx: number, padTop: number, triSize: number,
  lines: string[][], lineH: number,
): NameSpot[] {
  const triH = triSize * Math.sqrt(3) / 2;
  const cy = padTop + 11 + triH * 2 / 3;
  const topY = cy - triH * 2 / 3;
  const sideY = cy + triH / 3;
  const aMidX = cx - triSize / 4;
  const aMidY = (topY + sideY) / 2;
  const cMidX = cx + triSize / 4;
  // B 는 기준선이 top 이라 아래로 자란다 — 첫 줄이 예전 자리에 오도록 가운데를 내린다
  const bTop = sideY + 52;
  return [
    { x: aMidX - 52, y: aMidY, align: 'right', baseline: 'middle' },
    { x: cx, y: bTop + ((lines[1].length - 1) * lineH) / 2, align: 'center', baseline: 'top' },
    { x: cMidX + 52, y: aMidY, align: 'left', baseline: 'middle' },
  ];
}

function fitAxisNames(
  ctx: CanvasRenderingContext2D,
  labels: [string, string, string],
  options: GraphOptions,
  w: number, h: number,
  cx: number, padTop: number,
  maxSize: number,
): { size: number; lines: string[][]; fontSize: number } {
  ctx.save();
  const makeFont = (size: number) => getFont(size, options.fontFamily, options.customFont, 'bold');
  let fontSize = options.fontSize.axisLabel * 1.3;
  // 사용자가 손으로 나눈 줄(리터럴 \n)은 그대로 지킨다
  const given = labels.map((l) => (l || '').split('\\n'));
  let lines = given.map((g) => g.slice());

  const fits = (size: number) => {
    ctx.font = makeFont(fontSize);
    const lineH = fontSize * 1.3;
    const spots = namePlaces(w, cx, padTop, size, lines, lineH);
    return spots.every((sp, i) => {
      ctx.textAlign = sp.align;
      ctx.textBaseline = sp.baseline;
      const es = lines[i].map((l) => textExtent(ctx, l));
      const half = ((lines[i].length - 1) * lineH) / 2;
      return sp.x - Math.max(...es.map((e) => e.left)) >= EDGE
        && sp.x + Math.max(...es.map((e) => e.right)) <= w - EDGE
        && sp.y - half - Math.max(...es.map((e) => e.up)) >= EDGE
        && sp.y + half + Math.max(...es.map((e) => e.down)) <= h - EDGE;
    });
  };

  let size = largestFitting(40, maxSize, fits);

  if (size < maxSize * SHRINK_LIMIT) {
    ctx.font = makeFont(fontSize);
    const lineH = fontSize * 1.3;
    const spots = namePlaces(w, cx, padTop, maxSize, lines, lineH);
    lines = given.map((g, i) => {
      const sp = spots[i];
      const room = sp.align === 'left' ? w - EDGE - sp.x
        : sp.align === 'right' ? sp.x - EDGE
          : 2 * Math.min(sp.x - EDGE, w - EDGE - sp.x);
      return g.flatMap((l) => wrapToWidth(ctx, l, Math.max(30, room)));
    });
    size = largestFitting(40, maxSize, fits);
  }

  if (size <= 40) {
    // 삼각형을 바닥까지 줄여도 안 들어간다 — 이름 글꼴을 줄여 본다
    fontSize = options.fontSize.axisLabel * 1.3 * MIN_SCALE;
    ctx.font = makeFont(fontSize);
    lines = lines.map((ls) => ls.flatMap((l) => wrapToWidth(ctx, l, Math.max(30, w / 3))));
    size = largestFitting(40, maxSize, fits);
  }

  ctx.restore();
  return { size, lines, fontSize };
}
