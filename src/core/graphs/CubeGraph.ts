// © 2026 김용현
import { type CubeGraphData, type GraphOptions } from '../types/index';
import { clearCanvas, getFont, sansFont, type FontOptions } from '../canvas/renderer';
import { drawSourceAndFootnote } from '../canvas/labels';
import { EDGE, MIN_SCALE, drawFloatingLabel, fillLines, largestFitting, nudgeInside, nudgeLinesInside, textExtent, wrapToWidth } from '../canvas/fit';

// 사각 투영 (oblique / cabinet)
// 앞면: Z→오른쪽, Y→위 (직사각형)
// 깊이(X): 좌하 대각선
const DEPTH_ANGLE = 35 * Math.PI / 180;
const DEPTH_RATIO = 0.5;
const DEPTH_COS = Math.cos(DEPTH_ANGLE) * DEPTH_RATIO;
const DEPTH_SIN = Math.sin(DEPTH_ANGLE) * DEPTH_RATIO;

function project(
  x: number, y: number, z: number,
  cx: number, cy: number, scale: number
): [number, number] {
  // x=깊이(좌하), y=위, z=오른쪽
  const px = cx + z * scale - x * DEPTH_COS * scale;
  const py = cy - y * scale + x * DEPTH_SIN * scale;
  return [px, py];
}

// 꼭짓점
const V: [number, number, number][] = [
  [0, 0, 0], // 0: 앞-하-좌 (원점)
  [0, 0, 1], // 1: 앞-하-우
  [0, 1, 0], // 2: 앞-상-좌
  [0, 1, 1], // 3: 앞-상-우
  [1, 0, 0], // 4: 뒤-하-좌 (숨김 꼭짓점)
  [1, 0, 1], // 5: 뒤-하-우
  [1, 1, 0], // 6: 뒤-상-좌
  [1, 1, 1], // 7: 뒤-상-우
];

// 모서리: [시작, 끝, 숨김여부]
// vertex 4 (1,0,0) 에 연결된 3개가 뒤쪽(점선)
const EDGES: [number, number, boolean][] = [
  [4, 0, false],
  [4, 5, false],
  // 나머지 전부 실선
  [4, 6, false], // 뒤하좌 → 뒤상좌 (Y축 방향)
  // 앞면
  [0, 1, false],
  [0, 2, false],
  [1, 3, false],
  [2, 3, false],
  // 깊이 방향
  [1, 5, false],
  [2, 6, false],
  [3, 7, false],
  // 뒷면
  [5, 7, false],
  [6, 7, false],
];

export function renderCubeGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: CubeGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const fs = options.fontSize;

  const topPad = options.title ? 100 : 60;
  let bottomPad = 40;
  if (options.source) bottomPad += 30;
  bottomPad += options.footnotes.filter(f => f.trim()).length * 22;

  const availW = w - 240;
  const availH = h - topPad - bottomPad;

  // 240 은 축 이름 「X축」 몫으로 잡은 상수였다. 「1인당 지역내총생산」 같은
  // 이름은 오른쪽으로 58.1px 이 캔버스 밖이었다. 이름이 놓일 자리는 큐브
  // 배율에 딸려 있으므로, 여백을 넓히는 것이 곧 **배율을 줄이는 것**이다.
  const fit = fitCubeScale(ctx, data, w, h, topPad, availH,
    Math.min(availW * 0.5, availH * 0.55), fs, options);
  const scale = fit.scale;

  // 큐브 중심을 화면 중심에 맞추기
  const cubeCenter = project(0.5, 0.5, 0.5, 0, 0, scale);
  const cx = w / 2 - cubeCenter[0];
  const cy = topPad + availH / 2 - cubeCenter[1];

  // 꼭짓점 2D 좌표
  const v2 = V.map(([vx, vy, vz]) => project(vx, vy, vz, cx, cy, scale));

  // 뒤쪽 모서리 (점선)
  ctx.save();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  for (const [a, b, back] of EDGES) {
    if (!back) continue;
    ctx.beginPath();
    ctx.moveTo(v2[a][0], v2[a][1]);
    ctx.lineTo(v2[b][0], v2[b][1]);
    ctx.stroke();
  }
  ctx.restore();

  // 앞쪽 모서리 (실선)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  for (const [a, b, back] of EDGES) {
    if (back) continue;
    ctx.beginPath();
    ctx.moveTo(v2[a][0], v2[a][1]);
    ctx.lineTo(v2[b][0], v2[b][1]);
    ctx.stroke();
  }

  // 축 화살표 + 라벨
  drawAxes(ctx, data, cx, cy, scale, w, h, options, fs, fit.names, fit.nameSize);

  // 데이터 포인트
  // 큐브 중심 (2D)
  const cubeCenter2D = project(0.5, 0.5, 0.5, cx, cy, scale);

  for (const pt of data.points) {
    // 라벨 매핑: 사용자 X=오른쪽(project의 z), Z=깊이(project의 x)
    const [px, py] = project(pt.z, pt.y, pt.x, cx, cy, scale);

    // 포인트 (채운 원, 이전 크기)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();

    // 유도선 방향: 자동(큐브 중심에서 바깥으로) + 수동 오프셋
    let autoDx = px - cubeCenter2D[0];
    let autoDy = py - cubeCenter2D[1];
    const len = Math.sqrt(autoDx * autoDx + autoDy * autoDy) || 1;
    autoDx = (autoDx / len) * 40;
    autoDy = (autoDy / len) * 40;

    const dx = autoDx + pt.labelDx;
    const dy = autoDy + pt.labelDy;

    // 점 이름은 유도선 끝에 붙는다 — 캔버스를 넘으면 이름과 유도선 끝을
    // **함께** 안으로 민다. 유도선이 그대로 점을 가리키므로 어느 점의
    // 이름인지가 흐려지지 않는다. (「서울특별시 강남구」가 왼쪽으로 53.4px
    // 넘던 자리다. 들어가 있으면 좌표가 한 픽셀도 안 움직인다.)
    ctx.font = getFont(fs.dataLabel + 10, options, 'bold');
    ctx.textAlign = dx >= 0 ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    const anchor = nudgeInside(ctx, pt.label, px + dx + (dx >= 0 ? 4 : -4), py + dy, w, h);
    const lx = anchor.x - (dx >= 0 ? 4 : -4);
    const ly = anchor.y;

    // 유도선
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(lx, ly);
    ctx.stroke();

    // 라벨
    ctx.fillStyle = '#000';
    ctx.fillText(pt.label, anchor.x, anchor.y);
  }

  // 큐브 좌우 범위 기준으로 정렬
  const allX = v2.map(([vx]) => vx);
  const cubeLeft = Math.min(...allX) - 30;
  const cubeRight = Math.max(...allX) + 30;
  const plotX = cubeLeft;
  const plotW = cubeRight - cubeLeft;

  if (options.title) {
    // 제목은 고딕 자리다 — 다른 종류가 drawTitle 로 하는 일을 여기서 직접 한다
    // (정육면체는 제목 자리가 축 꼭대기에 매여 있어 공용 함수를 못 쓴다).
    const titleFont = sansFont(options);
    const yAxisTop = project(0, 1.25, 0, cx, cy, scale);
    ctx.fillStyle = '#000';
    ctx.font = `bold ${fs.title}px ${titleFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // 제목은 캔버스 가운데에 놓이므로 길면 양쪽으로 넘친다 — 줄여 담고 민다
    drawFloatingLabel(ctx, options.title, w / 2, yAxisTop[1] - 50, w, h, fs.title,
      (size) => `bold ${size}px ${titleFont}`);
  }

  // Z축 이름/높음 라벨 아래 기준
  const zAxisEnd = project(1.25, 0, 0, cx, cy, scale);
  const zHighRef = project(1, 0, 0, cx, cy, scale);
  const sourceY = Math.max(zAxisEnd[1] + 20 + fs.axisLabel, zHighRef[1] + 10 + fs.axisLabel * 0.9) + 47;
  drawSourceAndFootnote({ ctx, fonts: options, plotX, plotW, height: sourceY, source: options.source, footnotes: options.footnotes, fontSize: fs.dataLabel });
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const headLen = 10;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

/** 축 이름 세 개를 접은 결과 (접을 일이 없으면 한 줄짜리 그대로) */
interface AxisNameLines { x: string[]; y: string[]; z: string[] }

/** 축 둘레 글자가 놓이는 자리 — 재는 쪽과 그리는 쪽이 이 하나를 함께 쓴다 */
interface AxisText {
  lines: string[];
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  /** 축 이름인지(`name`) 낮음·높음 표시인지(`dir`) — 글꼴이 다르다 */
  kind: 'name' | 'dir';
}

/** 축 이름의 줄 간격 (글꼴 크기 대비) */
const NAME_LINE_RATIO = 1.2;

/** 이름을 접느니 큐브를 줄이겠다고 보는 한계 — 이보다 작아지면 접는다 */
const SHRINK_LIMIT = 0.8;

function axisTexts(
  data: CubeGraphData,
  cx: number, cy: number, scale: number,
  names: AxisNameLines,
): AxisText[] {
  const ext = 1.25;
  const xEnd = project(ext, 0, 0, cx, cy, scale);
  const yEnd = project(0, ext, 0, cx, cy, scale);
  const zEnd = project(0, 0, ext, cx, cy, scale);
  const zHighPos = project(1, 0, 0, cx, cy, scale);
  const yHigh = project(0, 1, 0, cx, cy, scale);
  const zHigh = project(0, 0, 1, cx, cy, scale);
  const origin = project(0, 0, 0, cx, cy, scale);

  return [
    // 좌하 깊이 → Z축 이름
    { lines: names.z, x: xEnd[0] - 6, y: xEnd[1] + 20, align: 'right', baseline: 'middle', kind: 'name' },
    { lines: [data.zAxis.highLabel], x: zHighPos[0] + 3 + data.zAxis.highOffset.x, y: zHighPos[1] + 10 + data.zAxis.highOffset.y, align: 'center', baseline: 'top', kind: 'dir' },
    // 위 → Y축 이름
    { lines: names.y, x: yEnd[0], y: yEnd[1] - 10, align: 'center', baseline: 'bottom', kind: 'name' },
    { lines: [data.yAxis.highLabel], x: yHigh[0] + 6 + data.yAxis.highOffset.x, y: yHigh[1] - 20 + data.yAxis.highOffset.y, align: 'left', baseline: 'middle', kind: 'dir' },
    // 오른쪽 → X축 이름
    { lines: names.x, x: zEnd[0] + 6, y: zEnd[1], align: 'left', baseline: 'middle', kind: 'name' },
    { lines: [data.xAxis.highLabel], x: zHigh[0] + data.xAxis.highOffset.x, y: zHigh[1] + 14 + data.xAxis.highOffset.y, align: 'center', baseline: 'top', kind: 'dir' },
    // 각 축 낮음 라벨 — 원점(0,0,0) 주변
    { lines: [data.xAxis.lowLabel], x: origin[0] + data.xAxis.lowOffset.x, y: origin[1] + 12 + data.xAxis.lowOffset.y, align: 'center', baseline: 'top', kind: 'dir' },
    { lines: [data.yAxis.lowLabel], x: origin[0] - 10 + data.yAxis.lowOffset.x, y: origin[1] - 4 + data.yAxis.lowOffset.y, align: 'right', baseline: 'bottom', kind: 'dir' },
    { lines: [data.zAxis.lowLabel], x: origin[0] + 10 + data.zAxis.lowOffset.x, y: origin[1] + 12 + data.zAxis.lowOffset.y, align: 'left', baseline: 'top', kind: 'dir' },
  ];
}

/** 배율 s 에서의 큐브 중심 좌표 */
function centerAt(w: number, topPad: number, availH: number, s: number): [number, number] {
  const c = project(0.5, 0.5, 0.5, 0, 0, s);
  return [w / 2 - c[0], topPad + availH / 2 - c[1]];
}

/**
 * 축 둘레 글자가 캔버스 안에 들어가는 가장 큰 배율을 찾는다.
 *
 * 배율을 키우면 축 끝이 바깥으로 밀리므로 «들어가는가» 는 배율에 대해
 * 단조롭다 — 이분 탐색이 맞는다. 예전 배율에서 이미 들어가면 **그 값을
 * 그대로** 돌려주므로 멀쩡한 그림은 한 픽셀도 움직이지 않는다.
 *
 * 순서는 (1) 배율을 줄여 자리를 낸다, (2) 큐브가 5분의 1 넘게 줄어들 판이면
 * 축 이름을 여러 줄로 접고 다시 잰다, (3) 그래도 모자라면 이름 글꼴을 줄인다.
 * 어느 단계에서도 이름을 잘라 내지 않는다.
 */
function fitCubeScale(
  ctx: CanvasRenderingContext2D,
  data: CubeGraphData,
  w: number, h: number,
  topPad: number, availH: number,
  maxScale: number,
  fs: GraphOptions['fontSize'],
  options: FontOptions,
): { scale: number; names: AxisNameLines; nameSize: number } {
  ctx.save();

  let nameSize = fs.axisLabel;
  const makeNameFont = (size: number) => getFont(size, options, 'bold');
  const dirFont = getFont(fs.axisLabel * 0.9, options, 'normal');
  let names: AxisNameLines = { x: [data.xAxis.name], y: [data.yAxis.name], z: [data.zAxis.name] };

  const fits = (s: number) => {
    const [cx, cy] = centerAt(w, topPad, availH, s);
    return axisTexts(data, cx, cy, s, names).every((t) => {
      ctx.font = t.kind === 'name' ? makeNameFont(nameSize) : dirFont;
      ctx.textAlign = t.align;
      ctx.textBaseline = t.baseline;
      const lineH = nameSize * NAME_LINE_RATIO;
      const es = t.lines.map((l) => textExtent(ctx, l));
      const half = ((t.lines.length - 1) * lineH) / 2;
      return t.x - Math.max(...es.map((e) => e.left)) >= EDGE
        && t.x + Math.max(...es.map((e) => e.right)) <= w - EDGE
        && t.y - half - Math.max(...es.map((e) => e.up)) >= EDGE
        && t.y + half + Math.max(...es.map((e) => e.down)) <= h - EDGE;
    });
  };

  let scale = largestFitting(20, maxScale, fits);

  if (scale < maxScale * SHRINK_LIMIT) {
    // 예전 배율에서 각 이름이 가로로 쓸 수 있는 몫만큼 접는다
    const [cx, cy] = centerAt(w, topPad, availH, maxScale);
    ctx.font = makeNameFont(nameSize);
    const room = (t: AxisText) => (t.align === 'left' ? w - EDGE - t.x
      : t.align === 'right' ? t.x - EDGE
        : 2 * Math.min(t.x - EDGE, w - EDGE - t.x));
    const at = axisTexts(data, cx, cy, maxScale, names);
    names = {
      z: wrapToWidth(ctx, data.zAxis.name, Math.max(30, room(at[0]))),
      y: wrapToWidth(ctx, data.yAxis.name, Math.max(30, room(at[2]))),
      x: wrapToWidth(ctx, data.xAxis.name, Math.max(30, room(at[4]))),
    };
    scale = largestFitting(20, maxScale, fits);
  }

  if (scale <= 20) {
    // 배율을 바닥까지 줄여도 안 들어간다 — 이름 글꼴을 줄여 본다
    nameSize = fs.axisLabel * MIN_SCALE;
    ctx.font = makeNameFont(nameSize);
    names = {
      x: names.x.flatMap((l) => wrapToWidth(ctx, l, Math.max(30, w / 3))),
      y: names.y.flatMap((l) => wrapToWidth(ctx, l, Math.max(30, w / 3))),
      z: names.z.flatMap((l) => wrapToWidth(ctx, l, Math.max(30, w / 3))),
    };
    scale = largestFitting(20, maxScale, fits);
  }

  ctx.restore();
  return { scale, names, nameSize };
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  data: CubeGraphData,
  cx: number, cy: number, scale: number,
  w: number, h: number,
  options: FontOptions,
  fs: GraphOptions['fontSize'],
  names: AxisNameLines,
  nameSize: number,
) {
  const ext = 1.25;

  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = 1.5;

  // X축 화살표 (깊이, 좌하): 꼭짓점 (1,0,0)에서 바깥으로
  const xStart = project(1, 0, 0, cx, cy, scale);
  const xEnd = project(ext, 0, 0, cx, cy, scale);
  drawArrow(ctx, xStart[0], xStart[1], xEnd[0], xEnd[1]);

  // Y축 화살표 (위): 꼭짓점 (0,1,0)에서 바깥으로
  const yStart = project(0, 1, 0, cx, cy, scale);
  const yEnd = project(0, ext, 0, cx, cy, scale);
  drawArrow(ctx, yStart[0], yStart[1], yEnd[0], yEnd[1]);

  // Z축 화살표 (오른쪽): 꼭짓점 (0,0,1)에서 바깥으로
  const zStart = project(0, 0, 1, cx, cy, scale);
  const zEnd = project(0, 0, ext, cx, cy, scale);
  drawArrow(ctx, zStart[0], zStart[1], zEnd[0], zEnd[1]);

  const nameFont = getFont(nameSize, options, 'bold');
  const dirFont = getFont(fs.axisLabel * 0.9, options, 'normal');

  // 배율을 이미 맞췄으므로 여기서 미는 일은 거의 없다. 사용자가 준 오프셋이
  // 캔버스 밖을 가리키는 경우를 위한 마지막 안전장치다.
  ctx.fillStyle = '#000';
  for (const t of axisTexts(data, cx, cy, scale, names)) {
    if (t.lines.every((l) => !l)) continue;
    ctx.font = t.kind === 'name' ? nameFont : dirFont;
    ctx.textAlign = t.align;
    ctx.textBaseline = t.baseline;
    const lineH = nameSize * NAME_LINE_RATIO;
    const at = nudgeLinesInside(ctx, t.lines, t.x, t.y, lineH, w, h);
    fillLines(ctx, t.lines, at.x, at.y, lineH);
  }
}
