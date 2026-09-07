// © 2026 김용현
import { type TernaryGraphData, type GraphOptions } from '../types/index';
import { type Padding, clearCanvas, getFont, fillTextMultiline } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';

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
  const triSize = Math.min(triSizeByW, triSizeByH);
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

  // 축 라벨
  ctx.font = getFont(options.fontSize.axisLabel * 1.3, font, customFont, 'bold');
  ctx.fillStyle = '#000';

  // A (좌변 중앙 — 바깥쪽)
  const aMidX = (topPt.x + leftPt.x) / 2;
  const aMidY = (topPt.y + leftPt.y) / 2;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const labelLineH = options.fontSize.axisLabel * 1.3 * 1.3;
  fillTextMultiline(ctx, data.axisLabels[0], aMidX - 52, aMidY, labelLineH);

  // B (하변 중앙 — 아래쪽)
  const bMidX = (leftPt.x + rightPt.x) / 2;
  const bMidY = (leftPt.y + rightPt.y) / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(data.axisLabels[1], bMidX, bMidY + 52);

  // C (우변 중앙 — 바깥쪽)
  const cMidX = (rightPt.x + topPt.x) / 2;
  const cMidY = (rightPt.y + topPt.y) / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fillTextMultiline(ctx, data.axisLabels[2], cMidX + 52, cMidY, labelLineH);

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
