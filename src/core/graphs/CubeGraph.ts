// © 2026 김용현
import { type CubeGraphData, type GraphOptions } from '../types/index';
import { clearCanvas, textFont, textSize } from '../canvas/renderer';
import { textCtx } from '../canvas/parens';
import { drawSourceAndFootnote, sourceFootnoteReserve } from '../canvas/labels';
import { EDGE, MIN_SCALE, drawFloatingLabel, fillLines, largestFitting, nudgeInside, nudgeLinesInside, textExtent, wrapToWidth } from '../canvas/fit';
import { styleOf, byStyle, leaderOf } from '../canvas/style';
import { Obstacles, inflate } from '../canvas/avoid';
import type { LabelBox } from '../canvas/labels';

const LOOK = {
  classic: { axisW: 1.5, head: 10, backW: 1.5, backColor: '#999', backDash: [6, 5], pointR: 14, pointFill: '#000', pointStroke: 0 },
  // 굵은 축 0.99pt + 화살촉, 상자 0.39pt, 꼭짓점 회색 공 + 테두리 (실측 §2 cube). 촉 크기·공 크기·회색은 ≈
  exam: { axisW: 4.8, head: 22, backW: 1.9, backColor: '#000', backDash: [7.6, 4.7], pointR: 14, pointFill: '#7f7f7f', pointStroke: 1.75 },
};
/** 1.7.0 정육면체 유도선 굵기 — classic 에서만. exam 은 t.leader */
const CLASSIC_LEADER = { width: 1.2 };

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
  // exam 은 괄호를 명조로 따로 찍는다 — 이 아래 모든 글자 그리기·재기가 이 ctx 를 거친다
  ctx = textCtx(ctx, options);
  clearCanvas(ctx, w, h);
  // 이 파일은 지역 변수 t 를 여러 곳에서 쓴다 — 토큰은 tk 로 받는다
  const tk = styleOf(options);
  const look = byStyle(options, LOOK);

  const fs = options.fontSize;

  const topPad = options.title ? 100 : 60;
  let bottomPad = 40;
  bottomPad += sourceFootnoteReserve(options, fs.dataLabel, (options.source ? 30 : 0) + options.footnotes.filter(f => f.trim()).length * 22);

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
  ctx.strokeStyle = look.backColor;
  ctx.lineWidth = look.backW;
  ctx.setLineDash(look.backDash);
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
  ctx.lineWidth = tk.line.axis;
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
  for (const pt of data.points) {
    const { px, py, anchor, lx, ly } = pointLabelAt(ctx, pt, cx, cy, scale, w, h, options);

    // 포인트 (채운 원, 이전 크기)
    ctx.fillStyle = look.pointFill;
    ctx.beginPath();
    ctx.arc(px, py, look.pointR, 0, Math.PI * 2);
    ctx.fill();
    if (look.pointStroke > 0) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = look.pointStroke;
      ctx.stroke();
    }


    // 유도선
    ctx.strokeStyle = '#000';
    ctx.lineWidth = leaderOf(options, CLASSIC_LEADER).width;
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
    const titleSize = textSize(options, 'title', fs.title);
    const yAxisTop = project(0, 1.25, 0, cx, cy, scale);
    ctx.fillStyle = '#000';
    ctx.font = textFont(options, 'title', titleSize);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // 제목은 캔버스 가운데에 놓이므로 길면 양쪽으로 넘친다 — 줄여 담고 민다
    drawFloatingLabel(ctx, options.title, w / 2, yAxisTop[1] - 50, w, h, titleSize,
      (size) => textFont(options, 'title', size));
  }

  // Z축 이름/높음 라벨 아래 기준
  const zAxisEnd = project(1.25, 0, 0, cx, cy, scale);
  const zHighRef = project(1, 0, 0, cx, cy, scale);
  const labelBottom = Math.max(zAxisEnd[1] + 20 + fs.axisLabel, zHighRef[1] + 10 + fs.axisLabel * 0.9);
  // classic 은 라벨 아래 47px 를 묶음의 바닥으로 잡는다(1.7.0). 각주가 여러 줄이면 묶음이 위로
  // 자라 Z축 라벨을 덮으므로, exam 은 라벨 바로 아래를 묶음의 **위**로 잡고 캔버스 폭을 쓴다.
  const sourceY = byStyle(options, {
    classic: labelBottom + 47,
    exam: Math.min(h, labelBottom + 6 + sourceFootnoteReserve(options, fs.dataLabel, 0)),
  });
  drawSourceAndFootnote({
    ctx, fonts: options, plotX, plotW, height: sourceY, source: options.source, footnotes: options.footnotes,
    fontSize: fs.dataLabel, canvasWidth: byStyle(options, { classic: undefined, exam: w }),
  });
}

type CubePoint = CubeGraphData['points'][number];

/**
 * 점 이름 자리 — 유도선 방향은 자동(큐브 중심에서 바깥으로 40px) + 수동 오프셋.
 * 점 이름은 유도선 끝에 붙는다 — 캔버스를 넘으면 이름과 유도선 끝을
 * **함께** 안으로 민다. 유도선이 그대로 점을 가리키므로 어느 점의
 * 이름인지가 흐려지지 않는다. (「서울특별시 강남구」가 왼쪽으로 53.4px
 * 넘던 자리다. 들어가 있으면 좌표가 한 픽셀도 안 움직인다.)
 * 글꼴·정렬을 ctx 에 걸어 둔 채로 돌려준다.
 */
function pointLabelAt(
  ctx: CanvasRenderingContext2D, pt: CubePoint,
  cx: number, cy: number, scale: number, w: number, h: number, options: GraphOptions,
) {
  // 라벨 매핑: 사용자 X=오른쪽(project의 z), Z=깊이(project의 x)
  const [px, py] = project(pt.z, pt.y, pt.x, cx, cy, scale);
  const center = project(0.5, 0.5, 0.5, cx, cy, scale);
  let autoDx = px - center[0];
  let autoDy = py - center[1];
  const len = Math.sqrt(autoDx * autoDx + autoDy * autoDy) || 1;
  autoDx = (autoDx / len) * 40;
  autoDy = (autoDy / len) * 40;
  const dx = autoDx + pt.labelDx;
  const dy = autoDy + pt.labelDy;
  ctx.font = textFont(options, 'region', textSize(options, 'region', options.fontSize.dataLabel + 10));
  ctx.textAlign = dx >= 0 ? 'left' : 'right';
  ctx.textBaseline = 'middle';
  const anchor = nudgeInside(ctx, pt.label, px + dx + (dx >= 0 ? 4 : -4), py + dy, w, h);
  return { px, py, anchor, lx: anchor.x - (dx >= 0 ? 4 : -4), ly: anchor.y };
}

function drawArrow(
  ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, headLen: number,
  stopAtHead: boolean,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  // 굵은 축은 촉 밑에서 멈춘다 — 선 끝이 촉 옆으로 삐져나오지 않게
  const back = stopAtHead ? headLen * Math.cos(0.4) : 0;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - back * Math.cos(angle), y2 - back * Math.sin(angle));
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
  /** 첫 자리가 모서리·다른 글자에 걸리면 차례로 시도할 다른 자리 (exam) */
  alts?: Pick<AxisText, 'x' | 'y' | 'align' | 'baseline'>[];
  /** 어느 자리도 선을 못 피했다 — 글자 뒤를 흰 상자로 지운다 */
  knockout?: boolean;
}

/** 축 이름의 줄 간격 (글꼴 크기 대비) */
const NAME_LINE_RATIO = 1.2;

/** 이름을 접느니 큐브를 줄이겠다고 보는 한계 — 이보다 작아지면 접는다 */
const SHRINK_LIMIT = 0.8;

function axisTexts(
  data: CubeGraphData,
  cx: number, cy: number, scale: number,
  names: AxisNameLines,
  /** exam 은 원점 둘레 낮음 셋과 깊이축 높음을 겹치지 않게 벌린다 (글자가 classic 보다 40% 크다) */
  spread = false,
): AxisText[] {
  const ext = 1.25;
  const xEnd = project(ext, 0, 0, cx, cy, scale);
  const yEnd = project(0, ext, 0, cx, cy, scale);
  const zEnd = project(0, 0, ext, cx, cy, scale);
  const zHighPos = project(1, 0, 0, cx, cy, scale);
  const yHigh = project(0, 1, 0, cx, cy, scale);
  const zHigh = project(0, 0, 1, cx, cy, scale);
  const origin = project(0, 0, 0, cx, cy, scale);

  if (spread) {
    // 원점에서 세 모서리가 갈라진다 — 위(세로)·오른쪽(가로)·왼쪽 아래(깊이).
    // 높음은 그 축의 끝 꼭짓점 바로 곁, 낮음은 원점 바로 곁에 둔다(2026_06 korgeo q18:
    // 가로 높음은 꼭짓점 위 오른쪽, 깊이 높음은 앞 꼭짓점 아래 오른쪽, 낮음은 원점 아래 오른쪽).
    // 자리마다 후보를 몇 개 두고, 모서리·축·다른 글자에 안 걸리는 첫 후보를 placeAxisTexts 가 고른다.
    // 낮음 셋이 같은 글이면 시험지처럼 원점 오른쪽 아래에 하나만 둔다(2026_06 korgeo q18 «(낮음)»).
    const depthAt = project(0.3, 0, 0, cx, cy, scale);
    const lows = [data.xAxis.lowLabel, data.yAxis.lowLabel, data.zAxis.lowLabel];
    const shared = lows.every((l) => l === lows[0]);
    type Spot = Pick<AxisText, 'x' | 'y' | 'align' | 'baseline'>;
    const spot = (at: [number, number], off: { x: number; y: number }, dx: number, dy: number,
      align: CanvasTextAlign, baseline: CanvasTextBaseline): Spot =>
      ({ x: at[0] + dx + off.x, y: at[1] + dy + off.y, align, baseline });
    const dir = (label: string, spots: Spot[]): AxisText =>
      ({ lines: [label], ...spots[0], alts: spots.slice(1), kind: 'dir' });
    const lo = (off: { x: number; y: number }) => [
      spot(origin, off, 12, 8, 'left', 'top'),
      spot(origin, off, -10, -8, 'right', 'bottom'),
      spot(origin, off, 12, -8, 'left', 'bottom'),
    ];
    const lowTexts: AxisText[] = shared
      ? [dir(lows[0], lo(data.xAxis.lowOffset))]
      : [
        dir(data.xAxis.lowLabel, [spot(origin, data.xAxis.lowOffset, 16, 10, 'left', 'top'), spot(origin, data.xAxis.lowOffset, 16, -8, 'left', 'bottom')]),
        dir(data.yAxis.lowLabel, [spot(origin, data.yAxis.lowOffset, -10, -6, 'right', 'bottom'), spot(origin, data.yAxis.lowOffset, 10, -40, 'left', 'bottom')]),
        dir(data.zAxis.lowLabel, [spot(depthAt, data.zAxis.lowOffset, -30, 0, 'right', 'middle'), spot(depthAt, data.zAxis.lowOffset, 30, 12, 'left', 'middle')]),
      ];
    return [
      { lines: names.z, x: xEnd[0] - 6, y: xEnd[1] + 20, align: 'right', baseline: 'middle', kind: 'name' },
      { lines: names.y, x: yEnd[0], y: yEnd[1] - 10, align: 'center', baseline: 'bottom', kind: 'name' },
      { lines: names.x, x: zEnd[0] + 6, y: zEnd[1], align: 'left', baseline: 'middle', kind: 'name' },
      // 가로축 높음 — 끝 꼭짓점 위 오른쪽 (축과 세로 모서리 사이)
      dir(data.xAxis.highLabel, [
        spot(zHigh, data.xAxis.highOffset, 8, -8, 'left', 'bottom'),
        // 축 이름이 화살촉 바로 뒤에 붙어 첫 자리를 막으면 — 꼭짓점 왼쪽 위(뒷면 안), 조금 더 위
        spot(zHigh, data.xAxis.highOffset, -8, -8, 'right', 'bottom'),
        spot(zHigh, data.xAxis.highOffset, 8, -26, 'left', 'bottom'),
        spot(zHigh, data.xAxis.highOffset, 8, 10, 'left', 'top'),
        spot(zHigh, data.xAxis.highOffset, 0, 14, 'center', 'top'),
      ]),
      // 세로축 높음 — 끝 꼭짓점 위, 축 오른쪽
      dir(data.yAxis.highLabel, [
        spot(yHigh, data.yAxis.highOffset, 8, -6, 'left', 'bottom'),
        spot(yHigh, data.yAxis.highOffset, -8, -6, 'right', 'bottom'),
        spot(yHigh, data.yAxis.highOffset, 6, -20, 'left', 'middle'),
      ]),
      // 깊이축 높음 — 앞 꼭짓점 아래 오른쪽 (그 왼쪽에는 축 이름이 온다)
      dir(data.zAxis.highLabel, [
        spot(zHighPos, data.zAxis.highOffset, 14, 10, 'left', 'top'),
        spot(zHighPos, data.zAxis.highOffset, 14, -8, 'left', 'bottom'),
        spot(zHighPos, data.zAxis.highOffset, -12, -8, 'right', 'bottom'),
      ]),
      ...lowTexts,
    ];
  }

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
  options: GraphOptions,
): { scale: number; names: AxisNameLines; nameSize: number } {
  ctx.save();

  let nameSize = textSize(options, 'axisName', fs.axisLabel);
  const makeNameFont = (size: number) => textFont(options, 'axisName', size);
  const dirFont = textFont(options, 'axisName', textSize(options, 'axisName', fs.axisLabel * 0.9), { weight: 'normal' });
  let names: AxisNameLines = { x: [data.xAxis.name], y: [data.yAxis.name], z: [data.zAxis.name] };
  const spread = byStyle(options, { classic: false, exam: true });

  const fits = (s: number) => {
    const [cx, cy] = centerAt(w, topPad, availH, s);
    const texts = placeAxisTexts(ctx, data, cx, cy, s, names, spread, options,
      { name: makeNameFont(nameSize), dir: dirFont, lineH: nameSize * NAME_LINE_RATIO }, w, h);
    return texts.every((t) => {
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
    // 이름 자리 셋 — 두 양식 모두 z·y·x 순서다
    const at = axisTexts(data, cx, cy, maxScale, names, spread).filter((t) => t.kind === 'name');
    names = {
      z: wrapToWidth(ctx, data.zAxis.name, Math.max(30, room(at[0]))),
      y: wrapToWidth(ctx, data.yAxis.name, Math.max(30, room(at[1]))),
      x: wrapToWidth(ctx, data.xAxis.name, Math.max(30, room(at[2]))),
    };
    scale = largestFitting(20, maxScale, fits);
  }

  if (scale <= 20) {
    // 배율을 바닥까지 줄여도 안 들어간다 — 이름 글꼴을 줄여 본다
    nameSize = textSize(options, 'axisName', fs.axisLabel) * MIN_SCALE;
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
  options: GraphOptions,
  fs: GraphOptions['fontSize'],
  names: AxisNameLines,
  nameSize: number,
) {
  const ext = 1.25;
  const look = byStyle(options, LOOK);

  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = look.axisW;

  // X축 화살표 (깊이, 좌하): 꼭짓점 (1,0,0)에서 바깥으로
  const xStart = project(1, 0, 0, cx, cy, scale);
  const xEnd = project(ext, 0, 0, cx, cy, scale);
  const stopAtHead = byStyle(options, { classic: false, exam: true });
  drawArrow(ctx, xStart[0], xStart[1], xEnd[0], xEnd[1], look.head, stopAtHead);

  // Y축 화살표 (위): 꼭짓점 (0,1,0)에서 바깥으로
  const yStart = project(0, 1, 0, cx, cy, scale);
  const yEnd = project(0, ext, 0, cx, cy, scale);
  drawArrow(ctx, yStart[0], yStart[1], yEnd[0], yEnd[1], look.head, stopAtHead);

  // Z축 화살표 (오른쪽): 꼭짓점 (0,0,1)에서 바깥으로
  const zStart = project(0, 0, 1, cx, cy, scale);
  const zEnd = project(0, 0, ext, cx, cy, scale);
  drawArrow(ctx, zStart[0], zStart[1], zEnd[0], zEnd[1], look.head, stopAtHead);

  const nameFont = textFont(options, 'axisName', nameSize);
  const dirFont = textFont(options, 'axisName', textSize(options, 'axisName', fs.axisLabel * 0.9), { weight: 'normal' });

  // 배율을 이미 맞췄으므로 여기서 미는 일은 거의 없다. 사용자가 준 오프셋이
  // 캔버스 밖을 가리키는 경우를 위한 마지막 안전장치다.
  ctx.fillStyle = '#000';
  const lineH = nameSize * NAME_LINE_RATIO;
  const texts = placeAxisTexts(ctx, data, cx, cy, scale, names, byStyle(options, { classic: false, exam: true }),
    options, { name: nameFont, dir: dirFont, lineH }, w, h);
  for (const t of texts) {
    if (t.lines.every((l) => !l)) continue;
    ctx.font = t.kind === 'name' ? nameFont : dirFont;
    ctx.textAlign = t.align;
    ctx.textBaseline = t.baseline;
    const at = nudgeLinesInside(ctx, t.lines, t.x, t.y, lineH, w, h);
    if (t.knockout) {
      const b = inflate(textBox(ctx, { ...t, ...at }, lineH), 3);
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
      ctx.restore();
    }
    fillLines(ctx, t.lines, at.x, at.y, lineH);
  }
}

/** 글꼴을 걸어 둔 채로 부른다 — 글자 잉크 상자 */
function textBox(ctx: CanvasRenderingContext2D, t: AxisText, lineH: number): LabelBox {
  ctx.textAlign = t.align;
  ctx.textBaseline = t.baseline;
  const es = t.lines.map((l) => textExtent(ctx, l));
  const half = ((t.lines.length - 1) * lineH) / 2;
  return {
    left: t.x - Math.max(...es.map((e) => e.left)),
    right: t.x + Math.max(...es.map((e) => e.right)),
    top: t.y - half - Math.max(...es.map((e) => e.up)),
    bottom: t.y + half + Math.max(...es.map((e) => e.down)),
  };
}

/**
 * 축 둘레 글자의 최종 자리. exam 의 낮음·높음은 후보(`alts`) 가운데 모서리·축·점·
 * 다른 글자에 덜 걸리는 것을 고른다 — 앞 후보일수록 조금 낫게 친다. 어느 후보도
 * 선을 못 피하면 그 자리에 두고 글자 뒤를 흰 상자로 지운다(`knockout`).
 * classic 은 후보가 없어 axisTexts 그대로다.
 */
function placeAxisTexts(
  ctx: CanvasRenderingContext2D,
  data: CubeGraphData,
  cx: number, cy: number, scale: number,
  names: AxisNameLines,
  spread: boolean,
  options: GraphOptions,
  fonts: { name: string; dir: string; lineH: number },
  w: number, h: number,
): AxisText[] {
  const texts = axisTexts(data, cx, cy, scale, names, spread);
  if (!spread) return texts;
  ctx.save();
  const look = byStyle(options, LOOK);
  const ob = new Obstacles();
  const v2 = V.map(([vx, vy, vz]) => project(vx, vy, vz, cx, cy, scale));
  const edgePad = styleOf(options).line.axis / 2 + 3;
  for (const [a, b] of EDGES) ob.addSegment(v2[a][0], v2[a][1], v2[b][0], v2[b][1], edgePad);
  // 축 화살표 — 굵은 선 + 촉
  const ext = 1.25;
  const arrowPad = look.axisW / 2 + 3;
  for (const [s0, e0] of [
    [[1, 0, 0], [ext, 0, 0]], [[0, 1, 0], [0, ext, 0]], [[0, 0, 1], [0, 0, ext]],
  ] as [number, number, number][][]) {
    const a = project(s0[0], s0[1], s0[2], cx, cy, scale);
    const b = project(e0[0], e0[1], e0[2], cx, cy, scale);
    ob.addSegment(a[0], a[1], b[0], b[1], arrowPad);
    // 촉은 축보다 넓다 — 끝에 촉 크기만 한 상자
    const r = look.head * 0.45;
    ob.addBox({ left: b[0] - r, right: b[0] + r, top: b[1] - r, bottom: b[1] + r }, 2);
  }
  for (const pt of data.points) {
    const { px, py, anchor, lx, ly } = pointLabelAt(ctx, pt, cx, cy, scale, w, h, options);
    ob.addCircle(px, py, look.pointR + 3);
    // 점 이름과 유도선도 자리를 차지한다 — 점 이름은 이 뒤에 그려진다
    if (pt.label) ob.addBox(textBox(ctx, { lines: [pt.label], x: anchor.x, y: anchor.y, align: ctx.textAlign, baseline: 'middle', kind: 'dir' }, 0), 3);
    ob.addSegment(px, py, lx, ly, 3);
  }
  const boxOf = (t: AxisText) => {
    ctx.font = t.kind === 'name' ? fonts.name : fonts.dir;
    return textBox(ctx, t, fonts.lineH);
  };
  for (const t of texts) if (t.kind === 'name' && t.lines.some((l) => l)) ob.addBox(boxOf(t), 4);

  const out = texts.map((t) => {
    if (t.kind !== 'dir' || !t.alts || t.lines.every((l) => !l)) return t;
    let best = t;
    let bestCost = Infinity;
    let bestLines = 0;
    [t, ...t.alts].forEach((spot, i) => {
      const cand: AxisText = { ...t, ...spot };
      const b = boxOf(cand);
      const outside = b.left < EDGE || b.right > w - EDGE || b.top < EDGE || b.bottom > h - EDGE;
      const lines = ob.segmentHits(b);
      const cost = (outside ? 1000 : 0) + (lines + ob.boxHits(b)) * 100 + i;
      if (cost < bestCost) { bestCost = cost; best = cand; bestLines = lines; }
    });
    ob.addBox(boxOf(best), 4);
    return { ...best, alts: undefined, knockout: bestLines > 0 };
  });
  ctx.restore();
  return out;
}
