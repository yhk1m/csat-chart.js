// © 2026 김용현
// `installRoundRectPolyfill()` 를 실제 캔버스 렌더링으로 검증한다.
//
// 이 폴리필의 존재 이유는 «Chrome 99 아래에서 `ctx.roundRect` 가 없어 여덟
// 종류가 흰 캔버스만 남는다» 는 실패다. 그 실패를 그대로 재현한 뒤 폴리필이
// 고치는지 보는 것이 스텁 흉내보다 훨씬 강한 증거다. `@napi-rs/canvas` 의
// 컨텍스트 프로토타입은 실제로 지우고 되심을 수 있다(아래 테스트가 그 자체로
// 증거) — 그래서 «네이티브 roundRect 로 그린 그림» 과 «지운 뒤 폴리필로 그린
// 그림» 을 픽셀 단위로 비교하는, 스펙이 요구한 더 강한 검증까지 한다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { installRoundRectPolyfill } from '../src/roundrect';
import {
  clearCanvas,
  createDefaultClimateData,
  createDefaultGraphOptions,
  renderClimateGraph,
} from '../src/core/index';

const W = 800;
const H = 600;

/** `roundRect` 를 실제로 거치는 여덟 종류 중 하나. 두 계열 범례 박스가 이걸 부른다. */
function renderClimate(ctx: CanvasRenderingContext2D): void {
  clearCanvas(ctx, W, H);
  renderClimateGraph(ctx, W, H, createDefaultClimateData(), createDefaultGraphOptions());
}

/** `@napi-rs/canvas` 의 컨텍스트가 실제로 물고 있는 클래스. 전역이 아니다 — 직접 찾는다. */
function nativeCtxCtor(): { prototype: CanvasRenderingContext2D & { roundRect?: unknown } } {
  const probe = createCanvas(1, 1).getContext('2d') as unknown as CanvasRenderingContext2D;
  return Object.getPrototypeOf(probe).constructor as {
    prototype: CanvasRenderingContext2D & { roundRect?: unknown };
  };
}

describe('installRoundRectPolyfill', () => {
  it('Node 에는 전역 CanvasRenderingContext2D 가 없다 — 심지 않고 false', () => {
    expect(typeof (globalThis as { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D).toBe(
      'undefined',
    );
    expect(installRoundRectPolyfill()).toBe(false);
  });

  it('roundRect 가 이미 있으면(네이티브) 심지 않고 false', () => {
    const Ctor = nativeCtxCtor();
    expect(typeof Ctor.prototype.roundRect).toBe('function');
    (globalThis as { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D = Ctor;
    try {
      expect(installRoundRectPolyfill()).toBe(false);
    } finally {
      delete (globalThis as { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D;
    }
  });

  it(
    '지운 roundRect 를 심으면, 그린 결과가 네이티브 roundRect 로 그린 것과 픽셀 단위로 같다',
    () => {
      // 1) 네이티브 roundRect 로 기준 그림을 먼저 그려 둔다.
      const nativeCanvas = createCanvas(W, H);
      const nativeCtx = nativeCanvas.getContext('2d') as unknown as CanvasRenderingContext2D;
      renderClimate(nativeCtx);
      const nativePixels = Buffer.from(nativeCtx.getImageData(0, 0, W, H).data);
      // 뭔가 그려졌다는 것부터 못박는다 — 안 그러면 두 빈 캔버스가 "같다"며
      // 이 테스트가 아무것도 증명하지 않고 통과해 버린다.
      expect(nativePixels.some((v, i) => i % 4 !== 3 && v !== 255)).toBe(true);

      const Ctor = nativeCtxCtor();
      const native = Ctor.prototype.roundRect;
      expect(typeof native).toBe('function');

      try {
        // 2) 리뷰가 한 것과 같은 일을 한다 — 프로토타입에서 roundRect 를 지운다.
        delete Ctor.prototype.roundRect;

        // 3) 지운 상태로는 정말 던진다는 것을 먼저 확인한다 — 그래야 아래
        // "폴리필이 고쳤다"는 주장에 뜻이 생긴다.
        const brokenCtx = createCanvas(W, H).getContext('2d') as unknown as CanvasRenderingContext2D;
        expect(() => renderClimate(brokenCtx)).toThrow(/roundRect/);

        // 4) 전역에 임시로 노출한 뒤(Node 라 원래 없다) 폴리필을 심는다.
        (globalThis as { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D = Ctor;
        expect(installRoundRectPolyfill()).toBe(true);
        // 두 번째 호출은 이미 있으니 다시 심지 않는다.
        expect(installRoundRectPolyfill()).toBe(false);

        // 5) 폴리필이 심어진 뒤 같은 그래프를 새 캔버스에 그린다.
        const polyfilledCanvas = createCanvas(W, H);
        const polyfilledCtx = polyfilledCanvas.getContext('2d') as unknown as CanvasRenderingContext2D;
        expect(() => renderClimate(polyfilledCtx)).not.toThrow();
        const polyfilledPixels = Buffer.from(polyfilledCtx.getImageData(0, 0, W, H).data);

        // 6) 네이티브 기준 그림과 바이트 단위로 비교한다.
        expect(polyfilledPixels.length).toBe(nativePixels.length);
        expect(polyfilledPixels.equals(nativePixels)).toBe(true);
      } finally {
        // 지운 네이티브 구현을 되돌린다 — 다른 테스트 파일(골든 이미지 등)이
        // 이 클래스를 계속 공유해서 쓴다.
        Ctor.prototype.roundRect = native as CanvasRenderingContext2D['roundRect'];
        delete (globalThis as { CanvasRenderingContext2D?: unknown }).CanvasRenderingContext2D;
      }
    },
  );
});
