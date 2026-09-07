// © 2026 김용현
// `CanvasRenderingContext2D.prototype.roundRect` 폴리필.
//
// core 안에서 이 메서드를 부르는 곳은 딱 셋이다 — `src/core/canvas/legend.ts`
// (두 계열 범례 박스: `climate`·`deviation-a`·`deviation-b`·`pyramid`·`absbar`·
// `stacked` 여섯 종류가 이 공용 범례를 거친다), `src/core/graphs/Hythergraph.ts`
// (하이서그래프 자체 범례 박스), `src/core/graphs/ScatterBubble.ts`(산점도·버블
// 범례 박스). 이 **여덟 종류만** `roundRect` 를 실제로 부른다 — 나머지 여덟
// (`category-dot`·`cube`·`data-table`·`line`·`matrix-table`·`radar`·`ternary`·
// `treemap`)는 부르지 않는다. 세 파일 모두 반지름을 **숫자 하나**로만 준다
// (`ctx.roundRect(x, y, w, h, 0)` 아니면 `ctx.roundRect(x, y, w, h, 4)`) — 배열도
// `DOMPointInit` 도 어디서도 안 쓴다. 그래도 표준 `number | number[]` 두 형태는
// 함께 지원해 둔다 — 저수준 렌더러를 직접 부르는 사람이 다른 반지름 모양을
// 줘도 이 폴리필이 새 실패를 더하지 않게.
//
// `roundRect` 는 core 안의 유일한 최신 Canvas 2D API 다. 나머지는 전부 오래된
// 메서드라 README 가 약속하는 지원 환경(Chrome 80·Firefox 74·Safari 13.1)에서
// 이미 문제없이 그려진다. 그런데 `roundRect` 만은 **Chrome 99·Firefox 112·
// Safari 16.4(iOS 16.4)** 부터 있다 — 그 아래에서는 `ctx.roundRect is not a
// function` 이 던져지고, 위 여덟 종류는 흰 캔버스만 남는다.
//
// 이 라이브러리의 실제 관객이 바로 그 아래 버전을 쓴다. 학교 전산실 Chrome 은
// 몇 해씩 갱신되지 않는 경우가 흔하고, iPad 5세대·Air 2 는 iOS 15 에서 멈춘
// 기기라 iOS 16.4 를 영영 받을 수 없다. 콘솔을 열지 않는 교사·학생에게 이
// 실패는 «그냥 안 그려짐» 으로만 보인다 — README 가 Chrome 80 을 약속해 놓고.

/** 이 폴리필이 흉내 내는 반지름 표기. core 가 실제로 쓰는 건 숫자 하나뿐이다. */
type RoundRectRadii = number | number[];

interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

function normalizeRadii(radii: RoundRectRadii | undefined): Corners {
  if (radii === undefined) return { tl: 0, tr: 0, br: 0, bl: 0 };

  if (typeof radii === 'number') {
    if (!(radii >= 0)) throw new RangeError('roundRect: 반지름은 0 이상이어야 합니다');
    return { tl: radii, tr: radii, br: radii, bl: radii };
  }

  if (radii.some((r) => !(r >= 0))) {
    throw new RangeError('roundRect: 반지름은 0 이상이어야 합니다');
  }
  switch (radii.length) {
    case 1:
      return { tl: radii[0], tr: radii[0], br: radii[0], bl: radii[0] };
    case 2:
      return { tl: radii[0], br: radii[0], tr: radii[1], bl: radii[1] };
    case 3:
      return { tl: radii[0], tr: radii[1], bl: radii[1], br: radii[2] };
    case 4:
      return { tl: radii[0], tr: radii[1], br: radii[2], bl: radii[3] };
    default:
      throw new RangeError(`roundRect: 반지름 배열은 1~4개여야 합니다 (지금 ${radii.length}개)`);
  }
}

/**
 * 네 모서리 반지름의 합이 변의 길이를 넘지 않도록 축척을 맞춘다 — CSS
 * `border-radius`·Canvas 명세와 같은 보정이다. core 가 실제로 쓰는 4px 안팎의
 * 반지름에서는 사실상 아무 효과가 없지만, 저수준 렌더러를 직접 부르는 사람이
 * 박스보다 큰 반지름을 줘도 모양이 찌그러지지 않게 막아 둔다.
 */
function clampCorners(r: Corners, w: number, h: number): Corners {
  const scale = Math.min(
    1,
    w / (r.tl + r.tr) || Infinity,
    h / (r.tr + r.br) || Infinity,
    w / (r.bl + r.br) || Infinity,
    h / (r.tl + r.bl) || Infinity,
  );
  if (scale >= 1) return r;
  return { tl: r.tl * scale, tr: r.tr * scale, br: r.br * scale, bl: r.bl * scale };
}

/**
 * 네이티브 구현과 같은 방식으로 경로만 그린다 — `moveTo`/`lineTo`/`arcTo` 넷을
 * 돌아가며 잇는다. `beginPath()`·`fill()`·`stroke()` 는 호출자(core 렌더러)의
 * 몫이다. `roundRect` 자체가 그렇다 — 새 하위 경로를 여는 것 말고는 현재 경로에
 * 얹기만 한다.
 */
function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: RoundRectRadii | undefined,
): void {
  const r = clampCorners(normalizeRadii(radii), Math.abs(w), Math.abs(h));

  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  if (r.tr > 0) ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  if (r.br > 0) ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
  ctx.lineTo(x + r.bl, y + h);
  if (r.bl > 0) ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
  ctx.lineTo(x, y + r.tl);
  if (r.tl > 0) ctx.arcTo(x, y, x + r.tl, y, r.tl);
  ctx.closePath();
}

/**
 * `CanvasRenderingContext2D.prototype.roundRect` 가 없으면 심는다.
 *
 * - 브라우저가 아닌 곳(Node 등)에서는 아무 일도 하지 않는다 —
 *   `typeof CanvasRenderingContext2D === 'undefined'` 로 가려낸다.
 * - 이미 있으면(Chrome 99·Firefox 112·Safari 16.4 이상, 또는 이미 폴리필이
 *   설치된 두 번째 호출) 아무 일도 하지 않는다 — 네이티브 구현을 밀어내지 않는다.
 * - 그 아래에서만 심는다.
 *
 * `CsatChart` 생성자가 첫 렌더 전에 이 함수를 부르므로 파사드 사용자는 따로
 * 부를 필요가 없다. 저수준 렌더러(`renderClimateGraph` 등)를 파사드 없이 직접
 * 부르는 사람은 그리기 전에 `installRoundRectPolyfill()` 을 한 번 불러야
 * 한다 — 파사드를 거치지 않으므로 이 라이브러리가 대신 불러 줄 자리가 없다.
 *
 * @returns 실제로 심었으면 `true`. 심을 필요가 없었으면(Node 이거나 이미
 * 있음) `false`.
 */
export function installRoundRectPolyfill(): boolean {
  if (typeof CanvasRenderingContext2D === 'undefined') return false;

  const proto = CanvasRenderingContext2D.prototype;
  if (typeof proto.roundRect === 'function') return false;

  proto.roundRect = function (
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: RoundRectRadii,
  ): void {
    drawRoundRectPath(this, x, y, w, h, radii);
  } as CanvasRenderingContext2D['roundRect'];

  return true;
}
