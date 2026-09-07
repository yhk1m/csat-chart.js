// © 2026 김용현
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { CsatChart, type CanvasLike } from '../src/chart';
import { CsatChartError } from '../src/validate';
import type { CsatChartConfig } from '../src/types';
import { createDefaultTernaryData, createDefaultPyramidData } from '../src/core/index';

function canvas(w = 800, h = 600) {
  return createCanvas(w, h) as unknown as CanvasLike;
}

/**
 * width/height 가 0(또는 아예 없는) 캔버스를 흉내낸다.
 *
 * `@napi-rs/canvas` 는 `width`/`height` 를 0 으로 두는 것을 허락하지 않는다 —
 * `createCanvas(0, 0)` 이든 생성 뒤 `c.width = 0` 이든, 네이티브 세터가 즉시
 * HTML 캔버스 규격의 기본값(350×150)으로 되튄다. 그래서 실제 caniOS 캔버스로는
 * "크기 없는 캔버스" 상황 자체를 만들 수 없다. `CanvasLike` 는 덕타이핑
 * 인터페이스일 뿐이므로, 평범한 객체 리터럴로 `width`/`height` 를 흉내내고
 * `getContext`/`toDataURL` 만 진짜 캔버스에 위임한다 — 그리기는 여전히 실제
 * Canvas 2D 구현을 거친다(좌표가 실제 저장소 크기를 넘어가면 그냥 잘릴 뿐,
 * 던지지 않는다).
 */
function zeroSizeCanvas(): CanvasLike {
  const real = createCanvas(1, 1);
  return {
    width: 0,
    height: 0,
    getContext: (id: '2d') => real.getContext(id),
    toDataURL: (type?: string) => real.toDataURL(type as never),
  };
}

function nonWhitePixels(c: CanvasLike): number {
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  const raw = ctx.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < raw.length; i += 4) {
    if (raw[i] !== 255 || raw[i + 1] !== 255 || raw[i + 2] !== 255) n++;
  }
  return n;
}

afterEach(() => vi.unstubAllGlobals());

describe('CsatChart', () => {
  it('만들자마자 그린다', () => {
    const c = canvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it('크기가 없는 캔버스에는 800×600 을 넣는다', () => {
    // 실제 @napi-rs/canvas 는 width/height 를 0 으로 두지 못한다(위 zeroSizeCanvas
    // 참고) — 그래서 덕타이핑 CanvasLike 를 직접 만들어 «크기 없음» 을 흉내낸다.
    const c = zeroSizeCanvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(800);
    expect(c.height).toBe(600);
  });

  it('알 수 없는 type 을 거부한다', () => {
    // type 을 never 로 캐스팅하면 T 도 never 로 추론되어 data 까지 never 가 된다.
    // 둘 다 캐스팅해야 컴파일된다 — 여기서 보려는 건 런타임 검증이다.
    expect(
      () => new CsatChart(canvas(), { type: 'piramid' as never, data: {} as never }),
    ).toThrow(/혹시 "pyramid"\?/);
  });

  it('어긋난 data 를 거부한다', () => {
    expect(
      // 런타임 검증을 보는 테스트다. 컴파일 시점 검사는 아래 «타입» 항목에서 본다.
      () => new CsatChart(canvas(), { type: 'ternary', data: { points: [] } as never }),
    ).toThrow(CsatChartError);
  });

  it('update(data) 가 다시 그린다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    const before = nonWhitePixels(c);
    chart.update({
      data: {
        ...createDefaultTernaryData(),
        points: [
          { a: 80, b: 10, c: 10, label: '(가)' },
          { a: 10, b: 80, c: 10, label: '(나)' },
        ],
      },
    });
    expect(nonWhitePixels(c)).not.toBe(before);
  });

  it('update(options) 로 제목만 바꿀 수 있다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    const before = nonWhitePixels(c);
    chart.update({ options: { title: '토지 이용 구성' } });
    expect(nonWhitePixels(c)).toBeGreaterThan(before);
  });

  it('update 의 어긋난 data 는 거부하고 이전 상태를 지킨다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'pyramid', data: createDefaultPyramidData() });
    const before = nonWhitePixels(c);
    expect(() => chart.update({ data: { unit: 'percent' } as never })).toThrow(CsatChartError);
    expect(nonWhitePixels(c)).toBe(before);
  });

  it('resize 가 캔버스 크기를 바꾸고 다시 그린다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    chart.resize(400, 300);
    expect(c.width).toBe(400);
    expect(c.height).toBe(300);
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it('resize 는 0 이하를 거부한다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    expect(() => chart.resize(0, 300)).toThrow(/크기는 0보다 커야 합니다/);
  });

  it('toDataURL 이 PNG 를 돌려준다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    expect(chart.toDataURL().startsWith('data:image/png;base64,')).toBe(true);
  });

  it('destroy 뒤에는 쓰지 못한다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    chart.destroy();
    expect(() => chart.resize(400, 300)).toThrow(/이미 destroy\(\) 된 차트입니다/);
    expect(() => chart.destroy()).not.toThrow();
  });

  it('Node 에서 download() 는 안내하며 거부한다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    expect(() => chart.download()).toThrow(/브라우저에서만 씁니다/);
  });

  it('Node 에서 id 문자열은 안내하며 거부한다', () => {
    expect(
      () => new CsatChart('c', { type: 'ternary', data: createDefaultTernaryData() }),
    ).toThrow(/id 문자열은 브라우저에서만 씁니다/);
  });

  it('id 로 찾은 요소가 없으면 그 id 를 말한다', () => {
    vi.stubGlobal('document', { getElementById: () => null });
    expect(
      () => new CsatChart('none', { type: 'ternary', data: createDefaultTernaryData() }),
    ).toThrow(/id "none" 인 요소를 찾지 못했습니다/);
  });

  it('id 로 찾은 요소가 캔버스가 아니면 그렇게 말한다', () => {
    // <div id="c"> 에 그리려는 흔한 실수.
    vi.stubGlobal('document', { getElementById: () => ({ tagName: 'DIV' }) });
    expect(
      () => new CsatChart('c', { type: 'ternary', data: createDefaultTernaryData() }),
    ).toThrow(/id "c" 인 요소는 <canvas> 가 아닙니다/);
  });

  it('ensureFonts 를 정적 메서드로 노출한다', () => {
    expect(typeof CsatChart.ensureFonts).toBe('function');
  });

  it('글꼴이 늦게 도착하면 한 번 다시 그린다', async () => {
    let settle!: () => void;
    const ready = new Promise<void>((r) => {
      settle = r;
    });
    vi.stubGlobal('document', { fonts: { ready } });

    const c = canvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });

    // 그려 놓은 것을 지운다 — 다시 그리는지 보려는 것이다.
    const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    expect(nonWhitePixels(c)).toBe(0);

    settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it('destroy 된 뒤에 글꼴이 도착하면 다시 그리지 않는다', async () => {
    let settle!: () => void;
    const ready = new Promise<void>((r) => {
      settle = r;
    });
    vi.stubGlobal('document', { fonts: { ready } });

    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    chart.destroy();
    expect(nonWhitePixels(c)).toBe(0);

    settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(nonWhitePixels(c)).toBe(0);
  });
});

describe('타입', () => {
  // 아래 @ts-expect-error 들은 `npm run typecheck` 가 검사한다.
  // 오류가 «나지 않으면» 그 자체로 실패한다 — 판별 유니온이 죽었다는 뜻이다.

  it('type 에 맞지 않는 data 는 컴파일 시점에 걸린다', () => {
    // @ts-expect-error ternary 에 pyramid 데이터를 줄 수 없다
    const bad: CsatChartConfig = { type: 'ternary', data: createDefaultPyramidData() };
    expect(bad.type).toBe('ternary');
  });

  it('update 의 data 도 생성 때의 종류로 좁혀진다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    // @ts-expect-error 삼각 그래프에 피라미드 데이터를 줄 수 없다
    expect(() => chart.update({ data: createDefaultPyramidData() })).toThrow(CsatChartError);
  });
});
