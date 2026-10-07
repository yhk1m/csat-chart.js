// © 2026 김용현
// Canvas 패턴 생성 유틸리티
import type { StyleTokens } from './style';

export type PatternType =
  | 'diagonal'
  | 'grid'
  | 'diagonalGrid'
  | 'dot'
  | 'dotReverse'
  | 'vertical'
  | 'horizontal';

const TILE = 10;

/**
 * 패턴 타일용 작은 캔버스를 만든다.
 *
 * 브라우저면 `document`로 만들고, 없으면(서버 렌더·테스트) 지금 그리고 있는
 * 캔버스와 **같은 종류**를 하나 더 만든다. `ctx.createPattern`은 같은 백엔드의
 * 캔버스만 받으므로 이렇게 해야 어느 쪽에서든 패턴이 나온다.
 */
function createTileCanvas(ctx: CanvasRenderingContext2D, size: number): HTMLCanvasElement {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return c;
  }
  const Ctor = (ctx.canvas as unknown as {
    constructor: new (w: number, h: number) => HTMLCanvasElement;
  }).constructor;
  return new Ctor(size, size);
}

function makeTile(
  ctx: CanvasRenderingContext2D,
  size: number,
  draw: (pctx: CanvasRenderingContext2D, s: number) => void
): HTMLCanvasElement {
  const c = createTileCanvas(ctx, size);
  const p = c.getContext('2d')!;
  // 기본 흰색 배경
  p.fillStyle = '#fff';
  p.fillRect(0, 0, size, size);
  draw(p, size);
  return c;
}

function createPatternCanvas(ctx: CanvasRenderingContext2D, type: PatternType, t: StyleTokens): HTMLCanvasElement {
  switch (type) {
    case 'diagonal':
      // 시험지 빗금은 선 사이 수직 간격 2.2pt·선 0.42pt (실측 §1.3) — 양식이 정한다
      return makeTile(ctx, t.hatch.tile, (p, s) => {
        p.strokeStyle = '#000';
        p.lineWidth = t.hatch.width;
        p.beginPath();
        // 사선 (/) 패턴 — 타일 이음새 처리
        p.moveTo(0, s);
        p.lineTo(s, 0);
        p.moveTo(-s * 0.5, s * 0.5);
        p.lineTo(s * 0.5, -s * 0.5);
        p.moveTo(s * 0.5, s * 1.5);
        p.lineTo(s * 1.5, s * 0.5);
        p.stroke();
      });

    case 'grid':
      return makeTile(ctx, TILE, (p, s) => {
        p.strokeStyle = '#000';
        p.lineWidth = t.patternLine.grid;
        p.beginPath();
        p.moveTo(s / 2, 0);
        p.lineTo(s / 2, s);
        p.moveTo(0, s / 2);
        p.lineTo(s, s / 2);
        p.stroke();
      });

    case 'diagonalGrid':
      return makeTile(ctx, TILE, (p, s) => {
        p.strokeStyle = '#000';
        p.lineWidth = t.patternLine.grid;
        p.beginPath();
        p.moveTo(0, 0);
        p.lineTo(s, s);
        p.moveTo(s, 0);
        p.lineTo(0, s);
        p.stroke();
      });

    case 'dot':
      return makeTile(ctx, TILE, (p, s) => {
        p.fillStyle = '#000';
        p.beginPath();
        p.arc(s / 2, s / 2, 1.8, 0, Math.PI * 2);
        p.fill();
      });

    case 'dotReverse':
      return makeTile(ctx, TILE, (p, s) => {
        p.fillStyle = '#333';
        p.fillRect(0, 0, s, s);
        p.fillStyle = '#fff';
        p.beginPath();
        p.arc(s / 2, s / 2, 1.8, 0, Math.PI * 2);
        p.fill();
      });

    case 'vertical':
      return makeTile(ctx, TILE, (p, s) => {
        p.strokeStyle = '#000';
        p.lineWidth = t.patternLine.stripe;
        p.beginPath();
        p.moveTo(s / 2, 0);
        p.lineTo(s / 2, s);
        p.stroke();
      });

    case 'horizontal':
      return makeTile(ctx, TILE, (p, s) => {
        p.strokeStyle = '#000';
        p.lineWidth = t.patternLine.stripe;
        p.beginPath();
        p.moveTo(0, s / 2);
        p.lineTo(s, s / 2);
        p.stroke();
      });
  }
}

// ── 누적 차트 채움 시스템 ─────────────────────────────
//
// 순서는 양식 토큰(`fills`)이 정한다. classic: 단색 회색 셋 → 흰색 → 패턴 일곱.
// exam: 연회색 217 → 진회색 127 → 빗금 → 흰색 → 회색 다섯 단계 → 패턴 (실측 §1.3).

const PATTERN_ORDER: PatternType[] = [
  'diagonal', 'grid', 'diagonalGrid', 'dot', 'dotReverse', 'vertical', 'horizontal',
];

// 컨텍스트별 패턴 캐시 — 같은 이름이라도 양식마다 타일이 다르다
const cache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>();

function getCached(ctx: CanvasRenderingContext2D, type: PatternType, t: StyleTokens): CanvasPattern {
  let m = cache.get(ctx);
  if (!m) {
    m = new Map();
    cache.set(ctx, m);
  }
  const key = `${t.name}:${type}`;
  let pat = m.get(key);
  if (!pat) {
    pat = ctx.createPattern(createPatternCanvas(ctx, type, t), 'repeat')!;
    m.set(key, pat);
  }
  return pat;
}

/** index 번째 계열의 채움 지정값(문자열) — 토큰 순서를 다 쓰면 fillsCycleFrom 부터 되풀이 */
export function stackedFillValue(index: number, t: StyleTokens): string {
  const { fills, fillsCycleFrom } = t;
  if (index < fills.length) return fills[index];
  const span = fills.length - fillsCycleFrom;
  return fills[fillsCycleFrom + ((index - fills.length) % span)];
}

/** 누적 차트의 index번째 항목 채움값 반환 */
export function getStackedFill(
  ctx: CanvasRenderingContext2D,
  index: number,
  t: StyleTokens,
): string | CanvasPattern {
  return resolveFill(ctx, stackedFillValue(index, t), t);
}

/** 채움 지정값에서 패턴을 가리키는 접두사 — 예: `'pattern:diagonal'` */
export const PATTERN_FILL_PREFIX = 'pattern:';

/**
 * 채움 지정값(문자열)을 실제 채움으로 바꾼다.
 *
 * `'pattern:diagonal'` 이면 사선 빗금 패턴을, 그 밖에는 색 문자열을 그대로 쓴다.
 * 색과 패턴을 한 문자열 타입으로 다루는 이유는 프로젝트 저장(JSON)에 그대로
 * 실려야 하기 때문이다 — CanvasPattern 은 직렬화할 수 없다.
 */
export function resolveFill(
  ctx: CanvasRenderingContext2D,
  value: string,
  t: StyleTokens,
): string | CanvasPattern {
  if (!value.startsWith(PATTERN_FILL_PREFIX)) return value;
  const type = value.slice(PATTERN_FILL_PREFIX.length) as PatternType;
  return PATTERN_ORDER.includes(type) ? getCached(ctx, type, t) : value;
}

/** 그 채움이 밝아서 테두리를 그려야 하는가 (흰색·빗금 등) */
export function isLightFillValue(value: string): boolean {
  if (value.startsWith(PATTERN_FILL_PREFIX)) {
    return value.slice(PATTERN_FILL_PREFIX.length) !== 'dotReverse';
  }
  const hex = value.replace('#', '');
  if (hex.length !== 3 && hex.length !== 6) return false;
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

/** 밝은 채움인지 (흰색/패턴) — 테두리·라벨색 결정용 */
export function isLightFill(index: number, t: StyleTokens): boolean {
  return isLightFillValue(stackedFillValue(index, t));
}
