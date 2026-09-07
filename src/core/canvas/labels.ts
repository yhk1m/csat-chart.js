// © 2026 김용현
const LABEL_FONT = "'Noto Sans KR', sans-serif";

interface TitleParams {
  ctx: CanvasRenderingContext2D;
  plotX: number;
  plotW: number;
  title: string;
  fontSize: number;
  /** 캔버스 전체 너비. 주면 제목이 넘칠 때 글자를 줄여 맞춘다. */
  canvasWidth?: number;
}

/** 최소 이만큼까지는 줄인다. 더 줄이면 읽기 어렵다. */
const MIN_SHRINK = 0.6;

/**
 * 주어진 폭에 들어가도록 글꼴 크기를 줄인다.
 * 그래도 안 들어가면 마지막 수단으로 fillText 의 maxWidth 로 눌러 담는다.
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  available: number,
  makeFont: (size: number) => string
): number {
  if (available <= 0) return fontSize;
  ctx.font = makeFont(fontSize);
  const w = ctx.measureText(text).width;
  if (w <= available) return fontSize;
  const scaled = Math.max(fontSize * MIN_SHRINK, fontSize * (available / w));
  return Math.floor(scaled);
}

export function drawTitle({ ctx, plotX, plotW, title, fontSize, canvasWidth }: TitleParams) {
  if (!title) return;
  ctx.save();
  ctx.fillStyle = '#000';

  const makeFont = (size: number) => `bold ${size}px ${LABEL_FONT}`;
  // 제목은 그래프 가운데에 놓이므로 캔버스 양쪽으로 넘칠 수 있다.
  // 가운데를 기준으로 양쪽에서 좁은 쪽 × 2 가 실제로 쓸 수 있는 폭이다.
  const centerX = plotX + plotW / 2;
  const available = canvasWidth != null
    ? Math.max(0, Math.min(centerX, canvasWidth - centerX) * 2 - 12)
    : plotW;

  const size = fitFontSize(ctx, title, fontSize, available, makeFont);
  ctx.font = makeFont(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, centerX, 10, available > 0 ? available : undefined);
  ctx.restore();
}

interface SourceFootnoteParams {
  ctx: CanvasRenderingContext2D;
  plotX: number;
  plotW: number;
  height: number;
  source: string;
  /** 출처 줄 왼쪽에 함께 적는 글 (예: 자료 연도). 주면 출처 줄이 각주 아래로 내려간다. */
  sourceLeft?: string;
  /** 출처를 마지막 각주와 같은 줄 오른쪽 끝에 둔다 (시험지 관습) */
  sourceInline?: boolean;
  footnotes: string[];
  fontSize: number;
  canvasWidth?: number;
}

/** 출처·각주를 캔버스 좌우 끝에서 얼마나 띄울지 */
const EDGE_MARGIN = 10;

export function drawSourceAndFootnote({
  ctx, plotX, plotW, height, source, sourceLeft, sourceInline, footnotes, fontSize, canvasWidth,
}: SourceFootnoteParams) {
  ctx.save();

  // 출처·연도는 오른쪽 **끝**, 각주는 왼쪽 **끝**에 붙인다 (2026-08-04 사용자 결정).
  // 예전에는 플롯 영역에 맞춰 안쪽으로 들여써서 그림 가운데에 뜬 것처럼 보였다.
  let leftX = plotX;
  let rightX = plotX + plotW;
  if (canvasWidth != null) {
    leftX = EDGE_MARGIN;
    rightX = canvasWidth - EDGE_MARGIN;
  }

  // 위에서 아래로: 출처 → 각주들.
  // 단 sourceLeft 를 주면 순서가 뒤집힌다 — 각주 아래에 "(연도) ... (출처)" 한 줄.
  const filtered = footnotes.filter((f) => f.trim());
  const totalFootnoteH = filtered.length * (fontSize * 0.9 + 4);
  const sourceBelow = !!sourceLeft;
  // 시험지 관습 — 출처를 마지막 각주와 **같은 줄** 오른쪽 끝에 둔다.
  // 각주가 없으면 놓을 줄이 없으므로 기존 배치를 그대로 쓴다.
  const inlineSource = !!sourceInline && !!source && !sourceBelow && filtered.length > 0;
  const sourceH = (source || sourceLeft) && !inlineSource ? fontSize + 4 : 0;
  let y = height - 6 - totalFootnoteH - (sourceBelow ? sourceH : 0);

  // 각주는 왼쪽 끝에서 시작해 오른쪽으로 흐른다. 캔버스를 넘으면 잘리므로
  // 쓸 수 있는 폭을 미리 재 두고, 넘치는 글은 글꼴을 줄여 맞춘다.
  const rightEdge = canvasWidth != null ? rightX : plotX + plotW;
  const available = Math.max(0, rightEdge - leftX);

  const sourceFont = (size: number) => `bold ${size}px ${LABEL_FONT}`;

  if (source && !sourceBelow && !inlineSource) {
    ctx.fillStyle = '#555';
    const size = fitFontSize(ctx, source, fontSize, available, sourceFont);
    ctx.font = sourceFont(size);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(source, rightX, y, available > 0 ? available : undefined);
    y += sourceH;
  }

  // 같은 줄에 출처가 들어오면 각주가 쓸 수 있는 폭이 그만큼 줄어든다
  ctx.font = sourceFont(fontSize);
  const inlineSourceW = inlineSource ? ctx.measureText(source).width + 16 : 0;
  const footnoteAvailable = Math.max(0, available - inlineSourceW);

  let lastFootnoteY = y;
  for (let i = 0; i < filtered.length; i++) {
    const text = '* ' + filtered[i];
    ctx.fillStyle = '#555';
    const makeFont = (size: number) => `${size}px ${LABEL_FONT}`;
    const size = fitFontSize(ctx, text, fontSize * 0.9, footnoteAvailable, makeFont);
    ctx.font = makeFont(size);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, leftX, y, footnoteAvailable > 0 ? footnoteAvailable : undefined);
    lastFootnoteY = y;
    y += fontSize * 0.9 + 4;
  }

  // 마지막 각주와 같은 줄, 오른쪽 끝
  if (inlineSource) {
    ctx.fillStyle = '#555';
    const size = fitFontSize(ctx, source, fontSize, inlineSourceW, sourceFont);
    ctx.font = sourceFont(size);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(source, rightX, lastFootnoteY, inlineSourceW > 0 ? inlineSourceW : undefined);
  }

  // 각주 아래 출처 줄 — 왼쪽에 자료 연도, 오른쪽에 출처 기관
  if (sourceBelow) {
    const makeFont = (size: number) => `bold ${size}px ${LABEL_FONT}`;
    const half = available > 0 ? available / 2 : 0;
    ctx.fillStyle = '#555';
    ctx.textBaseline = 'bottom';

    ctx.font = makeFont(fitFontSize(ctx, sourceLeft!, fontSize, half, makeFont));
    ctx.textAlign = 'left';
    ctx.fillText(sourceLeft!, leftX, height - 6, half > 0 ? half : undefined);

    if (source) {
      ctx.font = makeFont(fitFontSize(ctx, source, fontSize, half, makeFont));
      ctx.textAlign = 'right';
      ctx.fillText(source, rightX, height - 6, half > 0 ? half : undefined);
    }
  }

  ctx.restore();
}

// ── 겹침 회피 라벨 배치 ─────────────────────────────────────
//
// 점이 붙어 있으면 라벨끼리, 또는 라벨과 점이 겹쳐 읽을 수 없게 된다.
// 후보 위치를 순서대로 시도해 빈 자리를 찾고, 어디에도 안 들어가면
// 가장 멀리 밀어낸 뒤 유도선을 그어 어느 점의 라벨인지 알 수 있게 한다.

export interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** 이미 자리를 차지한 영역들을 모아 두고 충돌을 판정한다 */
export class LabelPlacer {
  private used: LabelBox[] = [];

  /** 점 자체도 자리를 차지한다 — 라벨이 점 위에 얹히지 않게 미리 등록한다 */
  reserve(box: LabelBox) {
    this.used.push(box);
  }

  reserveCircle(cx: number, cy: number, r: number) {
    this.used.push({ left: cx - r, right: cx + r, top: cy - r, bottom: cy + r });
  }

  private overlaps(box: LabelBox): boolean {
    return this.used.some(
      (u) => !(box.right < u.left || box.left > u.right || box.bottom < u.top || box.top > u.bottom)
    );
  }

  /**
   * 라벨을 **정해진 x 열에** 놓고, 겹치면 위아래로만 민다.
   *
   * 선 끝 이름처럼 여러 라벨이 한 줄로 나란해야 하는 경우에 쓴다.
   * 일반 `place()` 는 8방향으로 움직여 가로 위치가 흐트러진다.
   *
   * @param x 라벨 왼쪽 끝 x (모든 라벨이 공유하는 열)
   * @param preferredY 원래 놓고 싶은 y (라벨 상단)
   */
  placeInColumn(
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    preferredY: number,
    opts: { lineHeight: number; bounds: LabelBox }
  ) {
    const w = ctx.measureText(label).width;
    const h = opts.lineHeight;
    const { bounds } = opts;
    const stepY = h + 2;

    // 원래 자리에서 시작해 위·아래로 번갈아 가며 빈 자리를 찾는다
    for (let k = 0; k < 40; k++) {
      const dy = Math.ceil(k / 2) * stepY * (k % 2 === 0 ? 1 : -1);
      const y = preferredY + dy;
      if (y < bounds.top || y + h > bounds.bottom) continue;

      const box = { left: x, right: x + w, top: y, bottom: y + h };
      if (!this.overlaps(box)) {
        this.used.push(box);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x, y);
        return;
      }
    }

    // 빈 자리를 못 찾으면 원래 자리에 그대로 둔다 (열은 유지)
    this.used.push({ left: x, right: x + w, top: preferredY, bottom: preferredY + h });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, preferredY);
  }

  /**
   * (cx, cy) 근처에 라벨을 놓는다.
   *
   * 가까운 후보부터 8방향으로 시도하고, 다 막히면 거리를 늘려 다시 돈다.
   * 그래도 안 되면 마지막 후보에 놓고 유도선을 긋는다.
   *
   * @param bounds 라벨이 벗어나면 안 되는 영역 (플롯 영역)
   */
  place(
    ctx: CanvasRenderingContext2D,
    label: string,
    cx: number,
    cy: number,
    opts: { gap: number; lineHeight: number; bounds: LabelBox }
  ) {
    const w = ctx.measureText(label).width;
    const h = opts.lineHeight;
    const { gap, bounds } = opts;

    // 가까운 곳부터 — 오른쪽 위를 먼저 본다(기존 기본 위치)
    const dirs: [number, number][] = [
      [1, -1], [1, 0], [0, -1], [-1, -1],
      [-1, 0], [0, 1], [1, 1], [-1, 1],
    ];

    let fallback: { x: number; y: number } | null = null;

    for (const dist of [gap, gap * 2, gap * 3.5]) {
      for (const [dx, dy] of dirs) {
        const x = cx + dx * dist - (dx < 0 ? w : dx === 0 ? w / 2 : 0);
        const y = cy + dy * dist - (dy > 0 ? 0 : dy === 0 ? h / 2 : h);
        const box = { left: x, right: x + w, top: y, bottom: y + h };

        if (box.left < bounds.left || box.right > bounds.right) continue;
        if (box.top < bounds.top || box.bottom > bounds.bottom) continue;

        if (!this.overlaps(box)) {
          this.used.push(box);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(label, x, y);
          return;
        }
        if (!fallback) fallback = { x, y };
      }
    }

    // 다 막혔다 — 가장 먼 자리에 놓고 유도선을 긋는다
    const far = fallback ?? { x: cx + gap, y: cy - h };
    const box = { left: far.x, right: far.x + w, top: far.y, bottom: far.y + h };
    this.used.push(box);

    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(far.x + w / 2, far.y + h / 2);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, far.x, far.y);
  }
}

// ── 눈금 라벨 겹침 방지 ─────────────────────────────────────

/**
 * 눈금 라벨을 몇 개 걸러 그릴지 정한다.
 *
 * 축 범위가 좁거나 칸이 많으면 숫자가 서로 붙어 읽을 수 없게 된다.
 * 라벨 크기와 눈금 간격을 재서, 겹치지 않는 최소 간격(stride)을 돌려준다.
 * 1이면 전부 그려도 된다는 뜻이다.
 *
 * 눈금 표시(작은 선)는 그대로 두고 숫자만 솎아낸다 — 축의 눈금 간격 자체는
 * 그래프가 읽히는 근거이므로 없애면 안 된다.
 *
 * @param spacing 이웃한 눈금 사이의 픽셀 거리
 * @param extent  라벨이 축 방향으로 차지하는 크기 (가로축이면 글자 너비, 세로축이면 줄 높이)
 */
export function labelStride(spacing: number, extent: number, minGap = 6): number {
  if (!Number.isFinite(spacing) || spacing <= 0) return 1;
  return Math.max(1, Math.ceil((extent + minGap) / spacing));
}

/** 눈금 라벨들 중 가장 넓은 글자 너비 */
export function widestLabel(ctx: CanvasRenderingContext2D, labels: string[]): number {
  if (labels.length === 0) return 0;
  return Math.max(...labels.map((l) => ctx.measureText(l).width));
}
