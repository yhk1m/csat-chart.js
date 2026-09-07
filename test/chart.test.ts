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

/**
 * 흰색이 아닌(=그려진) 픽셀 수를 센다.
 *
 * 갓 만든 캔버스는 «투명한 검정» 이다(r=g=b=0, a=0). 알파를 보지 않으면 그
 * 투명한 픽셀도 «흰색이 아니다» 로 잡혀, 렌더러가 통째로 사라져도(예: draw() 를
 * 빈 함수로 바꿔치기) 이 검사를 통과한다. 렌더러는 항상 clearCanvas 로 불투명한
 * 흰 바탕을 먼저 칠하므로, 알파가 255 인 픽셀만 세면 «실제로 그렸는가» 를 묻게 된다.
 */
function nonWhitePixels(c: CanvasLike): number {
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  const raw = ctx.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < raw.length; i += 4) {
    if (raw[i + 3] !== 255) continue; // 투명 = 아무것도 그리지 않은 것
    if (raw[i] !== 255 || raw[i + 1] !== 255 || raw[i + 2] !== 255) n++;
  }
  return n;
}

/** data URL(PNG) 의 실제 픽셀 크기를 IHDR 청크에서 읽는다. 새 의존성 없이. */
function pngDimensions(dataUrl: string): { width: number; height: number } {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const buf = Buffer.from(base64, 'base64');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
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

  /**
   * 속성 없는 브라우저 `<canvas>` 를 흉내낸다 — 크기는 300×150(HTML 기본값)이고
   * `getAttribute('width'/'height')` 가 `null` 이다. 이 조합이 «크기를 정하지
   * 않았다» 는 신호다 — 300 은 0 이 아니라서 falsy 검사로는 잡히지 않는다.
   */
  function attrlessCanvas(
    w = 300,
    h = 150,
    attrs: Record<string, string | null> = {},
  ): CanvasLike {
    const real = createCanvas(Math.max(1, w), Math.max(1, h));
    return {
      width: w,
      height: h,
      getAttribute: (name: string) => attrs[name] ?? null,
      getContext: (id: '2d') => real.getContext(id),
    } as CanvasLike;
  }

  it('width/height 를 적지 않은 <canvas> 는 800×600 으로 본다', () => {
    // 300×150 은 «작성자가 고른 크기» 가 아니라 HTML 이 넣어 준 기본값이다.
    const c = attrlessCanvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(800);
    expect(c.height).toBe(600);
  });

  it('300×150 을 직접 적었으면 그대로 둔다', () => {
    const c = attrlessCanvas(300, 150, { width: '300', height: '150' });
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(300);
    expect(c.height).toBe(150);
  });

  it('스크립트로 정한 크기는 그대로 둔다', () => {
    const c = attrlessCanvas(1200, 900);
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(1200);
    expect(c.height).toBe(900);
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
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
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

  it('scale 이 2 면 PNG 픽셀 크기도 정확히 두 배다', () => {
    const chart = new CsatChart(canvas(800, 600), {
      type: 'ternary',
      data: createDefaultTernaryData(),
    });
    const { width, height } = pngDimensions(chart.toDataURL({ scale: 2 }));
    expect(width).toBe(1600);
    expect(height).toBe(1200);
  });

  it('scale 로 내보낸 뒤 화면 캔버스는 원래 크기로 돌아오고 다시 그려진다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    chart.toDataURL({ scale: 2 });
    expect(c.width).toBe(800);
    expect(c.height).toBe(600);
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it.each([0, -1, NaN, Infinity])('scale %s 는 거부한다', (scale) => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    expect(() => chart.toDataURL({ scale })).toThrow(CsatChartError);
  });

  it('scale 1 은 인자 없을 때와 같다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    // 먼저 «뭔가 그려졌다» 를 못박는다 — 안 그러면 draw() 가 아무 일도 하지 않는
    // 뮤턴트에서도 두 빈 PNG 가 «같다» 며 이 테스트가 그냥 통과해 버린다.
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
    expect(chart.toDataURL({ scale: 1 })).toBe(chart.toDataURL());
  });

  it('destroy 뒤에는 쓰지 못한다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    chart.destroy();
    const destroyedMsg = /이미 destroy\(\) 된 차트입니다/;
    expect(() => chart.resize(400, 300)).toThrow(destroyedMsg);
    expect(() => chart.update({})).toThrow(destroyedMsg);
    expect(() => chart.toDataURL()).toThrow(destroyedMsg);
    expect(() => chart.download()).toThrow(destroyedMsg);
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

  it('XHTML 문서의 소문자 tagName 도 <canvas> 로 인정한다', () => {
    const real = createCanvas(800, 600);
    vi.stubGlobal('document', {
      getElementById: () => ({ tagName: 'canvas', getContext: (id: '2d') => real.getContext(id) }),
    });
    expect(
      () => new CsatChart('c', { type: 'ternary', data: createDefaultTernaryData() }),
    ).not.toThrow();
  });

  it('첫 인자가 null 이면 그렇게 말한다', () => {
    // document.getElementById 가 못 찾은 값을 그대로 넘기는 실수를 잡는다.
    expect(
      () => new CsatChart(null as never, { type: 'ternary', data: createDefaultTernaryData() }),
    ).toThrow(/첫 인자는 <canvas> 요소이거나 id 문자열이어야 합니다/);
  });

  it('첫 인자가 캔버스가 아닌 객체면 그렇게 말한다', () => {
    // <div> 를 그대로 넘기는 흔한 실수 — getElementById 가 아니라 querySelector 로
    // <div> 를 골랐을 때도 벌어진다.
    expect(
      () =>
        new CsatChart({ tagName: 'DIV' } as never, {
          type: 'ternary',
          data: createDefaultTernaryData(),
        }),
    ).toThrow(/getContext 가 없습니다/);
  });

  it('ensureFonts 를 정적 메서드로 노출한다', () => {
    expect(typeof CsatChart.ensureFonts).toBe('function');
  });

  it('fontSize 를 하나만 줘도 나머지는 기본값을 쓴다', () => {
    // 얕게 덮으면 axisLabel/tick/dataLabel 이 undefined 가 되어 Node 에서는
    // ctx.font 대입이 "is not valid font style" 로 던진다.
    // `fontSize: { title: 44 }` 는 캐스팅 없이 그대로 컴파일된다 — PartialGraphOptions
    // 가 fontSize 안쪽까지 한 겹 더 풀어 주기 때문이다(아래 «타입» 항목 참고).
    const c1 = canvas();
    expect(
      () =>
        new CsatChart(c1, {
          type: 'ternary',
          data: createDefaultTernaryData(),
          options: { fontSize: { title: 44 } },
        }),
    ).not.toThrow();

    // 나머지 셋을 기본값 그대로 명시한 것과 픽셀이 같아야 «정말 기본값을 썼다» 가 된다.
    const c2 = canvas();
    new CsatChart(c2, {
      type: 'ternary',
      data: createDefaultTernaryData(),
      options: { fontSize: { title: 44, axisLabel: 28, tick: 26, dataLabel: 22 } },
    });

    // 먼저 «뭔가 그려졌다» 를 못박는다 — 안 그러면 draw() 가 아무 일도 하지 않는
    // 뮤턴트에서도 두 빈 캔버스가 «같다» 며 이 테스트가 그냥 통과해 버린다.
    expect(nonWhitePixels(c1)).toBeGreaterThan(50);
    expect(nonWhitePixels(c1)).toBe(nonWhitePixels(c2));
  });

  it('footnotes 로 넘긴 배열을 그대로 붙들지 않는다', () => {
    const c = canvas();
    const footnotes = ['각주 1'];
    const chart = new CsatChart(c, {
      type: 'ternary',
      data: createDefaultTernaryData(),
      options: { footnotes },
    });
    const before = nonWhitePixels(c);
    // 먼저 «뭔가 그려졌다» 를 못박는다 — 안 그러면 draw() 가 아무 일도 하지 않는
    // 뮤턴트에서도 두 빈 캔버스가 «같다» 며 이 테스트가 그냥 통과해 버린다.
    expect(before).toBeGreaterThan(50);

    // 호출자가 생성 뒤에 자기 배열을 건드린다.
    footnotes.push('각주 2');
    // 크기를 그대로 둔 채 다시 그리기만 시킨다 — footnotes 를 참조로 붙들고
    // 있었다면 각주가 하나 더 그려져 픽셀 수가 달라진다.
    chart.resize(800, 600);

    expect(nonWhitePixels(c)).toBe(before);
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

  it('fontSize 는 부분 지정이 컴파일된다 — 정확히 한 겹만 풀렸다', () => {
    // PartialGraphOptions 가 fontSize 안쪽까지 선택으로 풀어 주므로 title 하나만
    // 줘도 컴파일된다. 캐스팅이 없다 — 있으면 이 테스트가 증명하는 게 없어진다.
    const ok: CsatChartConfig = {
      type: 'ternary',
      data: createDefaultTernaryData(),
      options: { fontSize: { title: 44 } },
    };
    expect(ok.options?.fontSize?.title).toBe(44);

    // 풀어준 건 «있는 네 칸을 부분 지정» 까지다. 없는 칸을 적으면 여전히 막혀야
    // 한다 — 안 그러면 오타를 조용히 삼키는 객체가 된다.
    const bad: CsatChartConfig = {
      type: 'ternary',
      data: createDefaultTernaryData(),
      // @ts-expect-error fontSize 에 없는 칸이다(오타 등) — 여전히 막혀야 한다
      options: { fontSize: { titel: 44 } },
    };
    expect(bad.type).toBe('ternary');
  });

  it('update 의 data 도 생성 때의 종류로 좁혀진다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    // @ts-expect-error 삼각 그래프에 피라미드 데이터를 줄 수 없다
    expect(() => chart.update({ data: createDefaultPyramidData() })).toThrow(CsatChartError);
  });
});
