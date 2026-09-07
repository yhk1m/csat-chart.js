// © 2026 김용현
import { type PyramidGraphData, type GraphOptions, AGE_GROUPS } from '../types/index';
import { type Padding, clearCanvas, getFont, niceStep } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';
import { drawLegend, measureLegendWidth } from '../canvas/legend';
import { labelStride, widestLabel } from '../canvas/labels';

/** 눈금 숫자 서식 — 정수는 그대로, 아니면 소수 한 자리 */
function fmtTick(v: number): string {
  const r = Math.round(v * 1e10) / 1e10;
  return Number.isInteger(r) ? r.toString() : r.toFixed(1);
}

/** 이웃한 눈금 숫자 사이에 최소로 두는 빈틈 */
const TICK_LABEL_GAP = 6;

/** 아무리 넓어도 이보다 잘게 나누지는 않는다 */
const MAX_TICK_DIVISIONS = 12;

/**
 * 가로축 눈금 간격.
 *
 * **축 끝에 눈금이 놓이고 그 숫자가 적히도록** 고른다. 끝 숫자가 없으면 축이
 * 몇 %까지인지 읽을 수 없다 — `niceStep` 만 쓰면 최댓값이 9 일 때 눈금이
 * 0·2·4·6·8 에서 끊기고, 10 일 때는 끝 눈금이 숫자 솎기에 걸려 사라졌다
 * (2026-08-27 사용자 지적).
 *
 * 그래서 최댓값을 **정확히 나누는** 칸 수 중 숫자가 겹치지 않는 **가장 촘촘한**
 * 것을 쓴다. 간격 값은 정수를 먼저 보고, 없으면 0.5·0.1 단위까지 내려간다.
 * 12% 를 좁은 칸에 그리면 0·4·8·12 가 나오는데, 이게 원본 시험지 눈금이다.
 */
export function pickTickStep(maxVal: number, halfW: number, labelWidth: number): number {
  // ⚠️ 0 을 돌려주면 안 된다. 눈금은 `for (v = step; v <= max; v += step)` 꼴로
  // 그리므로 step 이 0 이면 동기 루프가 영원히 돈다 (vitest 타임아웃도 못 끊는다).
  // `niceStep` 이 갖고 있던 가드다 — 이 함수가 그 자리를 대신하니 함께 옮겨 왔다.
  // `auto-range.test.ts` 의 「수동 범위 최댓값이 0이어도 끝난다」 가 지킨다.
  if (!Number.isFinite(maxVal) || maxVal <= 0) return 1;

  const fits = Math.max(1, Math.floor(halfW / (labelWidth + TICK_LABEL_GAP)));
  const isMultipleOf = (v: number, unit: number) =>
    Math.abs(v / unit - Math.round(v / unit)) < 1e-9;

  for (const unit of [1, 0.5, 0.1]) {
    for (let d = Math.min(fits, MAX_TICK_DIVISIONS); d >= 2; d -= 1) {
      const step = maxVal / d;
      if (step > 0 && isMultipleOf(step, unit)) return step;
    }
  }
  // 어떤 칸 수로도 깔끔하게 안 나뉜다 — 0 과 끝만 남긴다
  return maxVal;
}

export function renderPyramidGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: PyramidGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);

  const showLegend = options.showLegend;
  const legendPos = options.legendPosition;
  const legendLabels = [
    options.legendLabel1 || data.maleLabel,
    options.legendLabel2 || data.femaleLabel,
  ];
  const legendW = (showLegend && legendPos === 'right')
    ? measureLegendWidth(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5)
    : 0;

  const padding: Padding = {
    top: options.title ? 100 : 50,
    right: 80 + legendW,
    bottom: (() => {
      let b = 90;
      if (showLegend && legendPos === 'bottom') b += 60;
      if (options.source) b += 30;
      b += options.footnotes.filter(f => f.trim()).length * 22;
      return b;
    })(),
    left: 60,
  };

  const plotX = padding.left;
  const plotY = padding.top;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const font = options.fontFamily;
  const customFont = options.customFont;

  // 입력값 그대로 사용
  const displayAges = data.ages;

  /**
   * 그릴 구간 수.
   *
   * 연령대 **이름**을 축에 쓰는 기본 모드는 이름표(`AGE_GROUPS`)가 17개뿐이라
   * 그 수에 묶인다. 나이 **수치** 눈금 모드는 이름표를 안 쓰므로 자료가 준
   * 만큼 그린다 — 시험지가 마지막 구간을 `85세 이상`처럼 합쳐 18구간을 주는
   * 경우가 있다. 자료가 비면 예전대로 이름표 수를 쓴다.
   */
  const n = data.numericAgeAxis && displayAges.length > 0
    ? displayAges.length
    : AGE_GROUPS.length;
  const isPercent = data.unit === 'percent';

  // 축 범위 계산
  const allVals = displayAges.flatMap((a) => [a.male, a.female]);
  let maxVal = data.range.auto
    ? Math.max(...allVals, 1)
    : data.range.max;
  // 올림 처리
  if (data.range.auto) {
    const step = niceStep(maxVal, 5);
    maxVal = Math.ceil(maxVal / step) * step;
  }

  const centerX = plotX + plotW / 2;
  const halfW = plotW / 2;
  const barH = plotH / n;
  const barGap = barH * 0.1;
  const actualBarH = barH - barGap - 2;

  // 외곽선 + 연령 라벨 위치 세로선
  const side = data.ageLabelSide;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;

  // 좌측 세로선
  if (side === 'left') {
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.stroke();
  }
  // 우측 세로선
  if (side === 'right') {
    ctx.beginPath();
    ctx.moveTo(plotX + plotW, plotY);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();
  }
  // 중앙 세로선
  if (side === 'center') {
    ctx.beginPath();
    ctx.moveTo(centerX, plotY);
    ctx.lineTo(centerX, plotY + plotH);
    ctx.stroke();
  }

  // 상단 가로선
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX + plotW, plotY);
  ctx.stroke();

  // 하단 가로선
  ctx.beginPath();
  ctx.moveTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();

  // 눈금 간격 — 격자선·눈금·숫자가 모두 이 값을 쓴다.
  // 숫자 폭을 재야 하므로 눈금 글꼴을 잠깐 걸어 둔다.
  ctx.save();
  ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
  const tickStep = pickTickStep(maxVal, halfW, ctx.measureText(fmtTick(maxVal)).width);
  ctx.restore();

  // 격자선 (막대 아래에 그리기 위해 먼저)
  for (let v = tickStep; v <= maxVal; v += tickStep) {
    const offset = (v / maxVal) * halfW;
    ctx.save();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    // 좌측
    ctx.beginPath();
    ctx.moveTo(centerX - offset, plotY);
    ctx.lineTo(centerX - offset, plotY + plotH);
    ctx.stroke();
    // 우측
    ctx.beginPath();
    ctx.moveTo(centerX + offset, plotY);
    ctx.lineTo(centerX + offset, plotY + plotH);
    ctx.stroke();
    ctx.restore();
  }

  // 막대 그리기
  for (let i = 0; i < n; i++) {
    const y = plotY + plotH - (i + 1) * barH + barGap / 2;
    const maleW = (displayAges[i].male / maxVal) * halfW;
    const femaleW = (displayAges[i].female / maxVal) * halfW;

    // 남성 (좌측) — 기본은 진한 회색, sexFills 를 주면 그 색
    ctx.fillStyle = data.sexFills?.[0] ?? '#666';
    ctx.fillRect(centerX - maleW, y, maleW, actualBarH);
    ctx.strokeStyle = data.sexFills ? '#000' : '#444';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(centerX - maleW, y, maleW, actualBarH);

    // 여성 (우측) — 기본은 연한 회색
    ctx.fillStyle = data.sexFills?.[1] ?? '#BBB';
    ctx.fillRect(centerX, y, femaleW, actualBarH);
    ctx.strokeStyle = data.sexFills ? '#000' : '#888';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(centerX, y, femaleW, actualBarH);
  }

  // 연령 축
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';

  if (data.numericAgeAxis) {
    // 시험지 방식 — 연령대 이름 대신 나이 수치 눈금을 왼쪽에 둔다.
    // 구간이 5세 단위라 i 번째 막대의 아래 경계가 i*5 세다.
    ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
    ctx.textAlign = 'right';
    const ageStep = 20;
    const topAge = n * 5; // 구간 × 5세 (17구간이면 85, 18구간이면 90)
    for (let age = 0; age <= topAge; age += ageStep) {
      const y = plotY + plotH - (age / topAge) * plotH;
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(plotX - 6, y);
      ctx.lineTo(plotX, y);
      ctx.stroke();
      ctx.fillText(String(age), plotX - 10, y);
    }
    if (data.ageUnit) {
      ctx.textBaseline = 'bottom';
      ctx.fillText(data.ageUnit, plotX + 4, plotY - 8);
      ctx.textBaseline = 'middle';
    }
  } else {
    ctx.font = getFont(options.fontSize.tick * 0.75, font, customFont, 'bold');
    for (let i = 0; i < n; i++) {
      const y = plotY + plotH - (i + 1) * barH + barH / 2;
      if (side === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(AGE_GROUPS[i], centerX, y);
      } else if (side === 'left') {
        ctx.textAlign = 'right';
        ctx.fillText(AGE_GROUPS[i], plotX - 8, y);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(AGE_GROUPS[i], plotX + plotW + 8, y);
      }
    }
  }

  // X축 눈금 (좌우 대칭)
  ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';

  // 좌우 대칭이라 숫자가 두 배로 들어간다 — 붙으면 몇 개 걸러 그린다
  const xTickValues: number[] = [];
  for (let v = 0; v <= maxVal + tickStep * 0.001; v += tickStep) {
    const rv = Math.round(v * 1e10) / 1e10;
    if (rv > maxVal) break;
    xTickValues.push(rv);
  }
  const divisions = Math.max(1, xTickValues.length - 1);
  let xStride = labelStride(
    halfW / divisions,
    widestLabel(ctx, xTickValues.map(fmtTick)),
  );
  // `pickTickStep` 이 이미 들어갈 만큼만 칸을 나눠서 보통 1 이 나온다.
  // 그래도 걸러야 한다면 **칸 수의 약수**로 올린다 — 그래야 0(한가운데)과
  // 축 끝이 둘 다 적히고, 남은 숫자도 고르게 놓인다.
  while (xStride < divisions && divisions % xStride !== 0) xStride += 1;

  for (let ti = 0; ti < xTickValues.length; ti++) {
    const rv = xTickValues[ti];
    const showNumber = ti % xStride === 0;
    const offset = (rv / maxVal) * halfW;

    // 좌측
    const lx = centerX - offset;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, plotY + plotH);
    ctx.lineTo(lx, plotY + plotH + 5);
    ctx.stroke();
    if (showNumber) {
      ctx.textAlign = 'center';
      ctx.fillText(fmtTick(rv), lx, plotY + plotH + 10);
    }

    // 우측
    const rx = centerX + offset;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, plotY + plotH);
    ctx.lineTo(rx, plotY + plotH + 5);
    ctx.stroke();
    if (rv > 0 && showNumber) {
      ctx.textAlign = 'center';
      ctx.fillText(fmtTick(rv), rx, plotY + plotH + 10);
    }
  }

  // 축 라벨 (좌: 남, 우: 여)
  ctx.font = getFont(options.fontSize.axisLabel, font, customFont, 'bold');
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText(data.maleLabel, plotX + halfW / 2, plotY - 16);
  ctx.fillText(data.femaleLabel, centerX + halfW / 2, plotY - 16);

  // 단위 라벨 — 축 오른쪽 바깥.
  // 기본은 X축 숫자 **아랫줄**, `axisLabelInline` 이면 숫자와 **같은 줄**(시험지 배치).
  ctx.save();
  if (data.axisLabelInline) {
    // 마지막 눈금 숫자는 축 끝에 가운데 정렬이라 절반이 플롯 밖으로 나온다.
    // 그만큼 더 밀어야 숫자와 붙지 않는다. 글자 크기도 숫자와 같게 맞춘다 —
    // 크기가 다르면 같은 줄에 놓아도 글줄이 어긋나 보인다.
    ctx.font = getFont(options.fontSize.tick, font, customFont, 'bold');
    const lastTickHalfW = ctx.measureText(fmtTick(maxVal)).width / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(data.axisLabel, plotX + plotW + lastTickHalfW + 8, plotY + plotH + 10);
  } else {
    ctx.font = getFont(options.fontSize.axisLabel * 0.85, font, customFont, 'bold');
    const unitY = plotY + plotH + 10 + options.fontSize.tick + 22;
    ctx.textAlign = 'left';
    ctx.fillText(data.axisLabel, plotX + plotW + 4, unitY);
  }
  ctx.restore();

  // 데이터 라벨
  if (options.showDataLabels) {
    ctx.font = getFont(options.fontSize.dataLabel * 0.8, font, customFont, 'bold');
    ctx.fillStyle = '#000';
    for (let i = 0; i < n; i++) {
      const y = plotY + plotH - (i + 1) * barH + barH / 2;
      const mW = (displayAges[i].male / maxVal) * halfW;
      const fW = (displayAges[i].female / maxVal) * halfW;
      const mLabel = isPercent ? displayAges[i].male.toFixed(1) : String(displayAges[i].male);
      const fLabel = isPercent ? displayAges[i].female.toFixed(1) : String(displayAges[i].female);

      if (displayAges[i].male > 0) {
        ctx.textAlign = 'right';
        ctx.fillText(mLabel, centerX - mW - 4, y);
      }
      if (displayAges[i].female > 0) {
        ctx.textAlign = 'left';
        ctx.fillText(fLabel, centerX + fW + 4, y);
      }
    }
  }

  // 제목
  drawTitle({ ctx, plotX, plotW, title: options.title, fontSize: options.fontSize.title, canvasWidth: w });

  // 범례

  if (showLegend) {
    drawLegend({
      ctx,
      items: [
        { type: 'rect', fillStyle: '#666', strokeStyle: '#444', label: legendLabels[0] },
        { type: 'rect', fillStyle: '#BBB', strokeStyle: '#888', label: legendLabels[1] },
      ],
      position: legendPos,
      plotX, plotY, plotW, plotH,
      fontSize: options.fontSize.dataLabel * 0.85 + 5,
    });
  }

  // 출처 + 각주
  drawSourceAndFootnote({ ctx, plotX, plotW, height: h, source: options.source, footnotes: options.footnotes, fontSize: options.fontSize.dataLabel, canvasWidth: w });
}
