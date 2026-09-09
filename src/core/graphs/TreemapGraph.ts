// © 2026 김용현
// 트리맵 — 값의 비율만큼 넓이를 나눈 사각형들.
//
// 이 렌더러는 GeoGrapher 원본에 없다. GeoTester 에서 새로 만든 것이라
// `verify:port` 대조 대상이 아니다. (CHANGES.md 참조)
//
// 배치는 squarified treemap 이다 — 칸이 정사각형에 가깝게 나와야 라벨이 들어가고,
// 원본 시험지(2024학년도 수능 세계지리 18번)의 모양과도 맞는다.
import { type TreemapGraphData, type GraphOptions } from '../types/index';
import { clearCanvas, getFont } from '../canvas/renderer';
import { drawTitle, drawSourceAndFootnote } from '../canvas/labels';

export interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 칸 안쪽 라벨 여백 (글자 크기 기준) */
const PAD_RATIO = 0.4;
/** 라벨을 적을 최소 칸 너비 기본값(px) */
const MIN_LABEL_W = 34;
/**
 * 라벨을 그릴지 말지 가르는 최소 배율(= 최소로 읽을 수 있는 글자 크기 / 기준 크기).
 * `pickLabelLayout`이 고른 자연스러운 배율(`layout.scale`)이 이보다 낮으면
 * 그 칸은 라벨을 아예 생략한다 — 억지로 하한까지 올려 그리지 않는다
 * (2026-08-18, 아래 「하한으로 올려 잡지 않는다」 참고).
 *
 * **값 0.4의 근거** (실측, `world_energy_consumption.csv` 2024년 `topN:6`,
 * 340×400 패널, `@napi-rs/canvas`로 실제 글꼴 측정):
 * 천연가스 패널의 `사우디아라비아`(r.w=95.9, r.h=25.5) 칸이 사용자가 다시
 * 보이게 해 달라고 지목한 칸인데, 그 칸의 자연스러운 배율이 **0.4729**로
 * 나왔다(과거 하한이던 0.5보다 낮다 — 그래서 예전엔 0.5로 밀어 올려져 눌렸다).
 * 0.4는 그보다 약간 낮게 잡아, 뜬 부동소수 오차로 이 칸이 실수로 생략되지
 * 않을 여유를 두면서도(약 15% 여유), 이미 검증된 하한(0.5 = 24px 기준
 * 12px, 예전 주석 "여전히 읽을 수 있다")보다 그리 멀지 않은 값이다(24px
 * 기준 9.6px). 실제 세 패널을 통틀어 이보다 낮은 자연 배율은 나타나지
 * 않았다(다음으로 낮은 값은 석유 패널 `일본`의 0.4955 — 이건 폭이 아니라
 * 칸 높이가 좁아 나온 값이고, 아래에서 보듯 이 값 자체가 이번 변경으로
 * 새로 보이게 된다).
 */
const MIN_LEGIBLE_SCALE = 0.4;
/** `pickLabelLayout`이 시도해 보는 줄 수 후보의 상한. 라벨 글자 수보다 많이 시도하지 않는다. */
const MAX_LABEL_LINES = 4;

/**
 * 한 줄의 가장 나쁜 가로세로비. 작을수록 정사각형에 가깝다.
 * (Bruls·Huizing·van Wijk, "Squarified Treemaps")
 */
function worstRatio(row: number[], sum: number, side: number): number {
  if (row.length === 0 || sum <= 0 || side <= 0) return Infinity;
  const max = Math.max(...row);
  const min = Math.min(...row);
  if (min <= 0) return Infinity;
  const s2 = sum * sum;
  const w2 = side * side;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

/**
 * 값 하나를 쓸 수 있는 넓이로 바꾼다. 유한한 양수가 아니면 0 이다.
 *
 * ⚠️ `Math.max(0, NaN)` 은 `NaN` 이라 이 걸음이 없으면 값 하나가 NaN·Infinity 인
 * 것만으로 합계가 NaN 이 되고, `NaN <= 0` 은 `false` 라 아래 조기 반환이
 * 잡아내지 못한다. 그러면 **모든** 칸의 너비가 NaN 으로 나오는데, 캔버스는
 * 유한하지 않은 인자를 조용히 무시하므로 아무 것도 안 그려진 채 넘어간다.
 */
const clean = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

/**
 * 값들을 넓이 비율대로 사각형으로 나눈다. 돌려주는 순서는 넣은 순서와 같다.
 *
 * ⚠️ 동기 루프다. 0 나눗셈으로 두께가 Infinity 가 되면 배치가 무너지고
 * 탭이 멎을 수 있다 — 짧은 변이 0 이거나 합이 0 이면 **일찍 빠져나간다.**
 * `__tests__/treemap-layout.test.ts` 가 지킨다.
 */
export function squarify(values: number[], rect: TreemapRect): TreemapRect[] {
  const out: TreemapRect[] = values.map(() => ({ x: rect.x, y: rect.y, w: 0, h: 0 }));
  const total = values.reduce((a, b) => a + clean(b), 0);
  if (values.length === 0 || total <= 0 || rect.w <= 0 || rect.h <= 0) return out;

  // 값을 넓이로 바꿔 두면 아래 계산이 전부 넓이 단위로 통일된다
  const areas = values.map((v) => (clean(v) / total) * rect.w * rect.h);

  let free = { ...rect };
  let i = 0;

  while (i < areas.length) {
    const side = Math.min(free.w, free.h);
    // 남은 틀이 납작해지면 더 나눌 수 없다. 남은 칸은 0 넓이로 둔다.
    if (side <= 0) break;

    // 가로세로비가 나빠지기 직전까지 한 줄에 담는다.
    // ⚠️ 첫 바퀴(count === 0)는 절대 break 하지 않으므로 count 는 반드시 1 이상이다
    //    — 그래야 아래 `i += count` 가 늘 나아가고 바깥 루프가 멎는다.
    let count = 0;
    let sum = 0;
    while (i + count < areas.length) {
      const next = areas[i + count];
      const cur = areas.slice(i, i + count);
      // ⚠️ `sum <= 0` 을 빼면 안 된다. 0 인 값이 줄의 **첫** 칸이 되면
      //    (첫 바퀴는 break 하지 않으므로 막을 수 없다) 이후 비교가 늘
      //    `Infinity > Infinity` = false 가 되어 **남은 값이 전부 한 줄로
      //    쓸려 들어간다.** 0 칸 자신은 넓이가 없어 안 보이지만 형제 칸의
      //    가로세로비가 15:1 까지 망가진다. 넓이가 없는 줄은 바로 닫는다.
      if (count > 0 && (sum <= 0 || worstRatio([...cur, next], sum + next, side) > worstRatio(cur, sum, side))) break;
      sum += next;
      count++;
    }

    const row = areas.slice(i, i + count);
    const thickness = sum / side;
    // 틀의 긴 변이 가로면 줄은 세로로 선 '열'이 된다
    const vertical = free.w >= free.h;

    let offset = 0;
    for (let k = 0; k < row.length; k++) {
      const len = thickness > 0 ? row[k] / thickness : 0;
      out[i + k] = vertical
        ? { x: free.x, y: free.y + offset, w: thickness, h: len }
        : { x: free.x + offset, y: free.y, w: len, h: thickness };
      offset += len;
    }

    // 남은 틀은 음수가 될 수 없다. 부동소수 오차로 -5.7e-14 같은 값이 남으면
    // 위의 `side <= 0` 이 한 줄 일찍 터진다 — 0 으로 눌러 둔다.
    // (`side <= 0` 쪽에 오차 여유를 주는 건 오히려 나쁘다. 정말 작지만
    //  멀쩡한 나머지까지 함께 버리게 된다.)
    free = vertical
      ? { x: free.x + thickness, y: free.y, w: Math.max(0, free.w - thickness), h: free.h }
      : { x: free.x, y: free.y + thickness, w: free.w, h: Math.max(0, free.h - thickness) };
    i += count;
  }

  return out;
}

/**
 * 라벨을 글자 수로 정확히 `n`줄(글자 수가 모자라면 그보다 적게)로 고르게 나눈다.
 * 한글 지명은 띄어쓰기가 없는 편이라 단어 단위로 자를 수 없어 글자 수로 나눈다.
 *
 * `wrapLabel`과 `pickLabelLayout`이 공유하는 가장 낮은 층의 도우미다 —
 * 실제로 몇 조각이 나오는지는 `text.length`와 `n`의 나눗셈에 달려 있어
 * (예: 5자를 4줄 요청해도 `ceil(5/4)=2`자씩 잘라 3조각만 나온다) 두 함수가
 * 서로 다르게 자르면 같은 라벨이 호출부에 따라 다르게 보이게 된다.
 */
function splitIntoLines(text: string, n: number): string[] {
  const lineCount = Math.min(Math.max(n, 1), text.length);
  if (lineCount <= 1) return [text];
  const perLine = Math.ceil(text.length / lineCount);
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += perLine) lines.push(text.slice(i, i + perLine));
  return lines;
}

/**
 * 칸에 들어가게 라벨을 필요한 만큼(최대 `maxLines`줄) 나눈다.
 *
 * `renderTreemapGraph`는 이제 이 함수를 직접 부르지 않는다 — 아래
 * `pickLabelLayout`이 줄 수와 글꼴 크기를 함께 고르기 때문이다(이유는
 * 그 함수의 설명 참고). 이 함수는 "칸 높이가 감당하는 줄 수(`maxLines`)가
 * 이미 정해져 있고, 폭 기준으로 필요한 줄 수만 고르면 되는" 경우를 위해
 * 공개 유틸로 남겨 둔다(패키지 추출 후 외부에서 같은 문제를 풀 수도 있다).
 * 예전 동작(글자 수로 필요한 줄 수를 어림잡고 자름)은 그대로다.
 */
export function wrapLabel(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  if (ctx.measureText(text).width <= maxW || text.length < 2 || maxLines <= 1) return [text];
  // 전체 폭이 칸 폭의 몇 배인지로 필요한 줄 수를 어림잡고, 칸 높이가 감당할
  // 수 있는 줄 수(maxLines)와 글자 수를 넘지 않게 자른다.
  const fullWidth = ctx.measureText(text).width;
  const needed = Math.ceil(fullWidth / Math.max(maxW, 1));
  const lineCount = Math.min(Math.max(needed, 2), maxLines, text.length);
  return splitIntoLines(text, lineCount);
}

export interface LabelLayout {
  /** 실제로 그릴 줄들 */
  lines: string[];
  /**
   * 기준 글자 크기(`labelSize`)에 곱할 배율. 1을 넘지 않는다.
   *
   * ⚠️ 호출부는 이 값을 하한으로 올려 잡지 않는다(2026-08-18) — 그리로 밀어
   * 올리면 `byWidth`·`byHeight`가 세워 둔 "칸에 맞는다"는 보장이 깨진다.
   * 대신 `shouldOmitLayout`으로 너무 작은 경우(`MIN_LEGIBLE_SCALE` 미만)만
   * 걸러 아예 그리지 않는다 — 자세한 이유는 `pickLabelLayout` 설명 참고.
   */
  scale: number;
}

/**
 * 줄 수와 글꼴 크기를 **함께** 고른다.
 *
 * 예전 방식은 순서로 매겼다 — 칸 높이만 보고 줄 수(`maxLines`)를 먼저 정한
 * 뒤(그것도 하한 크기를 가정해서), 그 줄 수 안에서만 `wrapLabel`이 폭을
 * 맞췄다. 둘은 사실 서로 의존하는 값인데 순서를 매기면 좁고 낮은 칸에서
 * 못 푼다: 340×400 패널의 `인도네시아`·`러시아`(행 높이 30px 안팎)는
 * `r.h / (24 * 0.5 * 1.2) ≈ 1.7~2`로 내림해 1줄로 굳어 버리는데, 2줄이면
 * 하한(0.5)보다 살짝 낮은 배율로도 칸에 들어갈 수 있는데도 시도조차 못 했다.
 *
 * 그래서 줄 수 후보 `n`(1~`maxN`, 라벨 글자 수도 넘지 않는다)마다 실제로
 * 몇 조각이 되는지 나눠 보고, 그 조각들이 칸 너비·높이 각각에 맞으려면
 * 기준 크기(`labelSize`)에서 몇 배(`byWidth`·`byHeight`)로 줄여야 하는지
 * 재서 **더 작은 쪽**(`Math.min(1, byWidth, byHeight)`)을 그 줄 수의 배율로
 * 삼는다. 배율이 가장 큰(=글자가 가장 큰) 줄 수를 고른다 — 같으면 줄이
 * 적은 쪽이 읽기 편하므로 먼저 본 `n`(더 작은 쪽)을 그대로 쓴다(`>`로만
 * 교체하므로 자동으로 그렇게 된다).
 *
 * `byWidth`·`byHeight`를 각각 재서 더 작은 쪽을 쓰기 때문에, 이 함수가
 * 돌려주는 `scale`로 그리면 **폭·높이 둘 다 저절로 칸에 맞는다** — 증명:
 * `scale <= byWidth = avail / widest` 이므로 `widest * scale <= avail`
 * (그린 줄의 폭이 여유 폭을 넘지 않는다), `scale <= byHeight = cellH /
 * (n * labelSize * 1.2)` 이므로 `n * labelSize * scale * 1.2 <= cellH`
 * (그린 블록의 세로 높이가 칸을 넘지 않는다). 호출부는 이제 이 `scale`을
 * **그대로** 쓴다(2026-08-18 이전에는 하한(`MIN_LABEL_SHRINK`, 0.5)보다
 * 작으면 그 하한으로 밀어 올렸는데, 그러면 방금 세운 두 부등식이 깨져
 * 가로로는 `maxWidth`가 글자를 눌러 찍고 세로로는 그대로 넘쳤다 — 아래
 * `shouldOmitLayout` 참고). `fillText`의 `maxWidth` 인자는 그래도 남겨
 * 둔다 — 부동소수 오차에 대한 최후의 안전장치일 뿐, 정상 경로에서는
 * 이제 실제로 걸리지 않는다.
 */
export function pickLabelLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  avail: number,
  cellH: number,
  labelSize: number,
  maxN: number = MAX_LABEL_LINES,
): LabelLayout {
  const cap = Math.max(1, Math.min(maxN, text.length));
  const layoutFor = (n: number): LabelLayout => {
    const lines = splitIntoLines(text, n);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    // 글자가 없거나 너비가 0이면 폭은 제약이 아니다 — Infinity 로 두면 아래
    // Math.min 에서 자연히 빠진다.
    const byWidth = widest > 0 ? avail / widest : Infinity;
    const byHeight = cellH / (lines.length * labelSize * 1.2);
    return { lines, scale: Math.min(1, byWidth, byHeight) };
  };

  let best = layoutFor(1);
  for (let n = 2; n <= cap; n++) {
    const candidate = layoutFor(n);
    if (candidate.scale > best.scale) best = candidate;
  }
  return best;
}

/**
 * 칸이 라벨을 그리기에 너무 작은지, 텍스트를 보기도 전에 **칸 크기만으로**
 * 값싸게 미리 거르는 판정이다(`ctx.measureText`도, 라벨 글자도 필요 없다).
 *
 * 너비 쪽(`minLabelW`)은 실제 하한이다 — `renderTreemapGraph`가 그대로 쓰는
 * `data.minLabelWidth` 값이고, 이보다 좁으면 글자가 옆 칸을 밟는다.
 *
 * 높이 쪽은 "가장 작게 그릴 수 있는 크기(`MIN_LEGIBLE_SCALE`)로 한 줄만
 * 그려도 칸에 안 들어가면, 몇 줄로 나누든(더 나누면 오히려 세로로 더
 * 필요해진다) 어차피 못 그린다"는 최선의 경우로 잰다 — 그래서
 * `pickLabelLayout`을 실제로 부르기 전에 이 칸을 걸러도 안전하다. **다만
 * 이 판정을 통과했다고 반드시 그려지는 건 아니다** — 라벨이 길어 폭 쪽이
 * 배율을 더 깎으면 실제 배율이 `MIN_LEGIBLE_SCALE` 밑으로 떨어질 수 있고,
 * 그건 텍스트를 알아야(`pickLabelLayout`을 불러야) 잴 수 있다. 그 마무리
 * 판정은 `shouldOmitLayout`이 한다.
 *
 * (예전 기록: 이 높이 기준은 처음엔 축소 전 `labelSize`를 그대로 썼다가
 * (`r.h < labelSize * 1.2`), 그다음엔 옛 클램프 하한이던 `MIN_LABEL_SHRINK`
 * (0.5)로 낮췄다 — 그때마다 340×400 패널의 짧은 칸(천연가스의 `캐나다`·
 * `사우디아라비아` 등)이 부당하게 생략되고 있던 것을 하나씩 고쳤다. 이제는
 * 클램프 자체가 없어져 그 하한이 곧 "이 배율 밑이면 아예 안 그린다"는
 * 진짜 기준(`MIN_LEGIBLE_SCALE`)과 같아졌으므로, 두 상수를 하나로 합쳤다.)
 */
export function shouldOmitLabel(r: TreemapRect, minLabelW: number, labelSize: number): boolean {
  return r.w < minLabelW || r.h < labelSize * MIN_LEGIBLE_SCALE * 1.2;
}

/**
 * `pickLabelLayout`이 고른 배율이 너무 작아 그려도 못 읽을 지경인지 판정한다.
 *
 * `shouldOmitLabel`과 짝을 이룬다 — 저쪽은 칸 크기만으로(텍스트를 보기 전에)
 * 미리 거르는 값싼 관문이고, 이쪽은 실제 라벨 텍스트로 `pickLabelLayout`을
 * 부른 **뒤** 그 결과(`layout.scale`)로 최종 판정한다. 라벨이 길어 폭이
 * 배율을 깎는 경우는 텍스트를 몰라선 알 수 없어 `shouldOmitLabel` 혼자로는
 * 못 잡는다 — 예: 칸은 넉넉해 보여도(`minLabelW`·높이 기준을 둘 다 통과)
 * 라벨이 아주 길면 `pickLabelLayout`이 고르는 최선의 배율이 그래도 낮을 수
 * 있다.
 *
 * 2026-08-18 이전에는 이런 칸도 그냥 하한(`MIN_LABEL_SHRINK`)까지 밀어
 * 올려 그렸다(→ 가로 눌림·세로 넘침, `TreemapGraph.ts` 파일 머리말 참고).
 * 이제는 밀어 올리는 대신 아예 생략한다 — 아주 좁은 칸에서 라벨을 생략하는
 * 것과 같은 종류의 판단이다(사용자 결정, 2026-08-18).
 */
export function shouldOmitLayout(layout: LabelLayout, minScale: number = MIN_LEGIBLE_SCALE): boolean {
  return layout.scale < minScale;
}

/**
 * 실제로 그릴 글자 크기를 정한다.
 *
 * `pickLabelLayout`이 고른 배율(`layout.scale`)을 **그대로** 곱할 뿐, 하한으로
 * 밀어 올리지 않는다(2026-08-18) — 밀어 올리면 `pickLabelLayout`이 세워 둔
 * "칸에 맞는다"는 보장이 깨져 가로 눌림·세로 넘침이 함께 생긴다(파일
 * 머리말·`pickLabelLayout`·`LabelLayout.scale` 설명 참고). 너무 작아 아예
 * 그리지 말아야 하는 경우는 이 함수가 아니라 `shouldOmitLayout`이 미리
 * 걸러낸다는 전제다 — 이 함수는 "그릴 값이 이미 정해졌을 때 크기가 얼마냐"만
 * 답한다.
 *
 * 별도 함수로 뽑아 둔 이유: 이전에는 이 한 줄(`Math.max(하한, …)`)이
 * `renderTreemapGraph` 안에 인라인으로 있어 캔버스 없이는 검증할 수 없었다
 * (골든 이미지는 800×600 한 장이라 이 결함이 걸리는 실제 340px 패널 크기의
 * 좁은 칸을 못 지난다). 함수로 뽑으면 `pickLabelLayout`이 이미 검증한
 * `scale`을 받아 결과만 재는 단위 테스트가 가능해, 클램프가 다시 들어와도
 * (`Math.max`로 되돌려도) 실패로 잡아낸다.
 */
export function resolveDrawSize(labelSize: number, layout: LabelLayout): number {
  return labelSize * layout.scale;
}

export function renderTreemapGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: TreemapGraphData,
  options: GraphOptions
) {
  clearCanvas(ctx, w, h);
  if (data.cells.length === 0) return;

  const top = options.title ? 100 : 30;
  // 각주 블록은 마지막 줄의 글자 높이만큼 위로 더 올라간다 (drawSourceAndFootnote).
  // 그 몫을 안 빼면 마지막 칸과 겹친다. (DataTable 과 같은 계산)
  const footCount = options.footnotes.filter((f) => f.trim()).length;
  // reserveSourceSpace 이면 출처 글이 없어도 한 줄만큼 비워 둔다 — 패널을
  // 나란히 놓을 때 출처가 있는 패널만 상자가 짧아지는 것을 막는다.
  const hasSourceLine = !!options.source || !!data.reserveSourceSpace;
  const footH =
    (footCount > 0 ? footCount * 22 + options.fontSize.dataLabel + 12 : 0) +
    (hasSourceLine ? options.fontSize.dataLabel + 4 : 0);

  const frame: TreemapRect = {
    x: 20,
    y: top,
    w: Math.max(0, w - 40),
    h: Math.max(0, h - top - footH - 10),
  };

  const rects = squarify(data.cells.map((c) => c.value), frame);

  const labelSize = data.labelFontSize ?? options.fontSize.tick;
  const minLabelW = data.minLabelWidth ?? MIN_LABEL_W;
  const pad = labelSize * PAD_RATIO;

  // ── 칸 ──────────────────────────────────────────────
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  rects.forEach((r) => {
    if (r.w <= 0 || r.h <= 0) return;
    // 원본 시험지는 칸을 칠하지 않는다 — 흰 바탕에 선만 있다
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });

  // ── 라벨 ────────────────────────────────────────────
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = getFont(labelSize, options);

  rects.forEach((r, i) => {
    if (shouldOmitLabel(r, minLabelW, labelSize)) return;
    const avail = r.w - pad * 2;
    ctx.font = getFont(labelSize, options);
    // 줄 수와 글꼴 크기를 함께 고른다 — 칸 너비·높이를 둘 다 만족하는 가장 큰
    // 배율을 주는 줄 수를 찾는다(순서로 매기면 좁고 낮은 칸을 못 푼다,
    // `pickLabelLayout` 설명 참고).
    const layout = pickLabelLayout(ctx, data.cells[i].label, avail, r.h, labelSize);
    // 배율이 너무 작으면(=글자가 너무 작아 못 읽을 지경이면) 아예 그리지
    // 않는다 — 하한으로 밀어 올리지 않는다(2026-08-18). 밀어 올리면
    // `pickLabelLayout`이 세워 둔 "칸에 맞는다"는 보장이 깨진다(파일
    // 머리말·`pickLabelLayout` 설명 참고).
    if (shouldOmitLayout(layout)) return;
    const drawSize = resolveDrawSize(labelSize, layout);
    if (drawSize !== labelSize) {
      ctx.font = getFont(drawSize, options);
    }

    const startY = r.y + r.h / 2 - ((layout.lines.length - 1) * drawSize * 1.2) / 2;
    layout.lines.forEach((line, k) => {
      // maxWidth는 순수한 안전장치다 — drawSize가 그 위 pickLabelLayout의
      // scale을 그대로 쓰므로(더는 하한으로 밀어 올리지 않으므로) 정상
      // 경로에서는 이제 실제로 걸리지 않는다. 그래도 남겨 두는 이유는
      // 부동소수 오차 같은 극단적인 경우의 마지막 방어선이기 때문이다.
      ctx.fillText(line, r.x + r.w / 2, startY + k * drawSize * 1.2, avail);
    });

    // 다음 칸의 pickLabelLayout 측정이 기준 크기를 쓰도록 되돌린다
    if (drawSize !== labelSize) {
      ctx.font = getFont(labelSize, options);
    }
  });

  // 바깥 테두리는 굵게 — 원본 시험지가 그렇다
  ctx.lineWidth = 2;
  ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);

  drawTitle({
    ctx, fonts: options, plotX: frame.x, plotW: frame.w, title: options.title,
    fontSize: options.fontSize.title, canvasWidth: w,
  });
  drawSourceAndFootnote({
    ctx, fonts: options, plotX: frame.x, plotW: frame.w, height: h,
    source: options.source, footnotes: options.footnotes,
    fontSize: options.fontSize.dataLabel, canvasWidth: w,
  });
}
