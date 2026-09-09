// © 2026 김용현
// 캔버스 획득·다시 그리기·PNG 추출의 수명주기를 관리하는 파사드.
import { REGISTRY } from './registry';
import { CsatChartError, assertChartData, assertChartType, assertConfigShape } from './validate';
import { ensureFonts, type EnsureFontsOptions } from './fonts';
import { installRoundRectPolyfill } from './roundrect';
import { clearCanvas, createDefaultGraphOptions, type GraphOptions } from './core/index';
import type { ChartDataMap, ConfigFor, CsatChartType, PartialGraphOptions, UpdateFor } from './types';

/**
 * 브라우저의 `HTMLCanvasElement` 와 Node 캔버스 구현체가 함께 만족하는 최소 모양.
 * 라이브러리는 이 이상을 요구하지 않는다.
 */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(id: '2d'): unknown;
  toDataURL?(type?: string): string;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * 속성을 적지 않은 `<canvas>` 가 갖는 크기 (HTML 명세). **0 이 아니라 300×150 이다.**
 * 그래서 `if (!canvas.width)` 로는 «작성자가 크기를 적지 않았다» 를 알아낼 수 없다.
 */
const HTML_DEFAULT_WIDTH = 300;
const HTML_DEFAULT_HEIGHT = 150;

/**
 * 이 축의 크기를 작성자가 «정하지 않았는가».
 *
 * 렌더러의 여백과 글자 크기는 800×600 에 맞춰 절대 픽셀로 박혀 있다. 300×150
 * 에서는 플롯 영역의 높이가 음수가 되어 제목·눈금·각주가 한 덩어리로 겹친
 * 읽을 수 없는 그림이 나온다. `<canvas id="c"></canvas>` 라고만 쓰는 실수는
 * 아주 흔한데, 그 결과가 조용한 오작동이어서는 안 된다.
 *
 * 세 가지를 구별한다.
 *   · 크기가 0·없음      → 정하지 않았다 (평범한 객체·OffscreenCanvas 흉내)
 *   · 크기가 300/150 이고 그 속성이 없다 → 정하지 않았다 (`<canvas>` 만 쓴 경우)
 *   · 그 밖의 모든 경우   → 작성자가 고른 크기다. 건드리지 않는다
 *
 * 두 번째 판정에만 `getAttribute` 가 필요한데 `CanvasLike` 에는 없다. 있으면
 * 쓰고 없으면 «작성자가 골랐다» 로 본다 — 덕타이핑이므로 이것이 안전한 쪽이다.
 */
function isUnsized(canvas: CanvasLike, dim: 'width' | 'height', htmlDefault: number): boolean {
  const current = canvas[dim];
  if (!current) return true;
  if (current !== htmlDefault) return false;
  const el = canvas as { getAttribute?: (name: string) => string | null };
  return typeof el.getAttribute === 'function' && el.getAttribute(dim) === null;
}

/**
 * `data`·`fontSize`·`fontStack`·`footnotes` 를 안전하게 덮는다.
 *
 * `{ ...base, ...patch }` 로 얕게만 덮으면 세 가지가 새어 나간다.
 *   · `fontSize` 를 하나만 준 순간(CDN 사용자가 흔히 그런다: `{ title: 44 }`)
 *     나머지 세 값이 `undefined` 가 되어, Node 에서는 `ctx.font` 대입이
 *     던지고 브라우저에서는 명세상 조용히 무시된다 — 어느 쪽이든 사고다.
 *   · `fontStack` 도 같은 꼴의 중첩 객체다. `update({ options: { fontStack:
 *     { sans: … } } })` 한 번에 앞서 정해 둔 `serif` 가 사라지면, 축만
 *     기본 글꼴로 돌아간 그림이 조용히 나온다.
 *   · `footnotes` 는 배열이다. 호출자가 쥔 배열을 그대로 붙들면, 나중에 그
 *     배열에 `push` 한 것이 다음 그리기에 몰래 새어 들어온다.
 */
function mergeOptions(base: GraphOptions, patch?: PartialGraphOptions): GraphOptions {
  return {
    ...base,
    ...patch,
    fontSize: { ...base.fontSize, ...patch?.fontSize },
    fontStack: { ...base.fontStack, ...patch?.fontStack },
    footnotes: [...(patch?.footnotes ?? base.footnotes)],
  };
}

/**
 * 종류 하나를 붙들고 사는 차트.
 *
 * `T` 는 생성자의 `config.type` 에서 추론된다. 그래서 `update()` 의 `data` 도
 * 같은 종류로 좁혀지고, 다른 종류의 데이터를 넣으면 컴파일 시점에 걸린다.
 */
export class CsatChart<T extends CsatChartType = CsatChartType> {
  /**
   * 시험지 글꼴을 확보한다. 자세한 것은 `ensureFonts` 참고.
   *
   * 필드가 아니라 **메서드**로 둔다. `static readonly ensureFonts = ensureFonts`
   * 로 적으면 ES2020 로 낮출 때 클래스 «뒤» 의 대입문이 되는데, 그것은 지울 수
   * 없는 부수효과라 이 클래스와 레지스트리와 렌더러 16종이 모든 번들에 박힌다.
   * 메서드는 클래스 본문의 일부라 어느 목표에서도 그런 일이 없다 — 실제로
   * 겪은 문제이고, `test/bundle.test.ts` 가 이걸 회귀로 잡지는 않으니 여기
   * 적어 둔다.
   */
  static ensureFonts(options?: EnsureFontsOptions): Promise<boolean> {
    return ensureFonts(options);
  }

  readonly canvas: CanvasLike;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly type: T;
  private data: ChartDataMap[T];
  private options: GraphOptions;
  private destroyed = false;

  constructor(target: CanvasLike | string, config: ConfigFor<T>) {
    this.canvas = resolveCanvas(target);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new CsatChartError('캔버스에서 2d 컨텍스트를 얻지 못했습니다');
    this.ctx = ctx as CanvasRenderingContext2D;

    assertConfigShape(config);
    assertChartType(config.type);
    assertChartData(config.type, config.data);

    this.type = config.type;
    this.data = config.data;
    this.options = mergeOptions(createDefaultGraphOptions(), config.options);

    if (isUnsized(this.canvas, 'width', HTML_DEFAULT_WIDTH)) this.canvas.width = DEFAULT_WIDTH;
    if (isUnsized(this.canvas, 'height', HTML_DEFAULT_HEIGHT)) this.canvas.height = DEFAULT_HEIGHT;

    // 여덟 종류(범례 박스가 있는 climate·deviation-a/b·pyramid·absbar·stacked·
    // hythergraph·scatter)는 그리는 도중 `ctx.roundRect()` 를 부른다. Chrome 99·
    // Firefox 112·Safari 16.4 아래에서는 그 메서드가 없어 `draw()` 가 던진다 —
    // 아래 `draw()` 보다 먼저 심어 둔다. 자세한 사정은 `./roundrect` 참고.
    installRoundRectPolyfill();

    this.draw();
    this.redrawWhenFontsArrive();
  }

  /** `data`·`options` 중 준 것만 덮고 다시 그린다. 어긋나면 던지고 이전 상태를 지킨다. */
  update(next: UpdateFor<T>): this {
    this.assertAlive();
    if (next.data !== undefined) {
      assertChartData(this.type, next.data);
      this.data = next.data;
    }
    if (next.options !== undefined) {
      this.options = mergeOptions(this.options, next.options);
    }
    this.draw();
    return this;
  }

  resize(width: number, height: number): this {
    this.assertAlive();
    if (!(width > 0) || !(height > 0)) {
      throw new CsatChartError(`크기는 0보다 커야 합니다 (지금 ${width}×${height})`);
    }
    this.canvas.width = width;
    this.canvas.height = height;
    this.draw();
    return this;
  }

  /**
   * PNG data URL 을 돌려준다.
   *
   * `scale` 은 **글자·선까지 함께 키우는** 배율이다. 캔버스만 키우는
   * `resize(1600, 1200)` 과 다르다 — 이 라이브러리의 글꼴 크기와 여백은 절대
   * 픽셀이라, 캔버스를 두 배로 하면 «두 배로 선명한 같은 그림» 이 아니라
   * «글자가 절반으로 작아진 다른 그림» 이 나온다. 인쇄용으로 뽑으려면 이쪽을 쓴다.
   */
  toDataURL(options: { scale?: number } = {}): string {
    this.assertAlive();
    if (typeof this.canvas.toDataURL !== 'function') {
      throw new CsatChartError('이 캔버스는 toDataURL 을 지원하지 않습니다');
    }
    const scale = options.scale ?? 1;
    if (!(Number.isFinite(scale) && scale > 0)) {
      throw new CsatChartError(`scale 은 0보다 큰 유한한 수여야 합니다 (지금 ${scale})`);
    }
    if (scale === 1) return this.canvas.toDataURL('image/png');

    const w = this.canvas.width;
    const h = this.canvas.height;
    try {
      this.canvas.width = Math.round(w * scale);
      this.canvas.height = Math.round(h * scale);
      this.drawScaled(scale, w, h);
      return this.canvas.toDataURL('image/png');
    } finally {
      // 화면에 붙어 있는 캔버스다. 원래 크기로 돌리고 다시 그려 둔다.
      this.canvas.width = w;
      this.canvas.height = h;
      this.draw();
    }
  }

  /** 브라우저 전용. Node 에서는 `toDataURL()` 이나 캔버스의 버퍼를 쓴다. */
  download(filename = 'csat-chart.png', options: { scale?: number } = {}): void {
    this.assertAlive();
    if (typeof document === 'undefined') {
      throw new CsatChartError(
        'download() 는 브라우저에서만 씁니다. Node 에서는 toDataURL() 이나 캔버스의 버퍼를 쓰세요',
      );
    }
    const a = document.createElement('a');
    a.href = this.toDataURL(options);
    a.download = filename;
    a.click();
  }

  destroy(): void {
    if (this.destroyed) return;
    // 불투명한 흰 바탕으로 지운다 — 시험지 원고를 다루는 라이브러리라, 반투명
    // «지워진 상태» 보다 «빈 답안지» 처럼 보이는 쪽이 낫다. 생성자나 resize()
    // 가 바꿔 둔 캔버스 크기는 되돌리지 않는다 — destroy() 는 그리기만 멈춘다.
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);
    this.destroyed = true;
  }

  /**
   * 글꼴이 늦게 도착하면 한 번 다시 그린다.
   *
   * `await CsatChart.ensureFonts()` 를 빠뜨리는 실수가 이 라이브러리에서 가장
   * 흔할 실패다. 그런데 증상이 조용하고 영구적이다 — 대체 글꼴로 «멀쩡히»
   * 그려지고, 잠시 뒤 글꼴이 도착해도 아무도 다시 그리지 않는다. 시험지 서체를
   * 모르는 사람은 무엇이 잘못됐는지조차 알 수 없다. 빌드 도구도 타입 검사도
   * 없는 사용자에게 그 책임을 문서로만 지울 수는 없다.
   *
   * ⚠️ 만능이 아니다. `document.fonts.ready` 는 **부르는 시점에** 로딩 중인
   * 것이 끝나면 이행한다. 그래서 차트를 먼저 만들고 `ensureFonts()` 를 나중에
   * 부르면 이 약속은 이미 이행된 뒤라 도움이 안 된다. 순서를 지켜 부르거나,
   * 그냥 `await` 하는 것이 여전히 옳다.
   */
  private redrawWhenFontsArrive(): void {
    if (typeof document === 'undefined') return;
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (!fonts?.ready) return;
    void Promise.resolve(fonts.ready)
      .then(() => {
        if (!this.destroyed) this.draw();
      })
      .catch(() => {
        // 글꼴 때문에 그림이 멈추면 안 된다.
      });
  }

  private draw(): void {
    const { width, height } = this.canvas;
    clearCanvas(this.ctx, width, height);
    // 캐스팅이 없다. RegistryEntry<T> 의 data 가 곧 ChartDataMap[T] 이므로
    // 엉뚱한 값을 넘기면 여기서 컴파일이 막힌다.
    REGISTRY[this.type].render(this.ctx, width, height, this.data, this.options);
  }

  /**
   * 논리 크기는 `width`×`height` 로 두고 픽셀만 `scale` 배로 그린다.
   *
   * 렌더러들은 변환 행렬을 전혀 건드리지 않으므로(`grep setTransform src/core` →
   * 없음) 여기서 한 번 걸어 두면 그림 전체가 그대로 확대된다.
   */
  private drawScaled(scale: number, width: number, height: number): void {
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    try {
      clearCanvas(this.ctx, width, height);
      REGISTRY[this.type].render(this.ctx, width, height, this.data, this.options);
    } finally {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  private assertAlive(): void {
    if (this.destroyed) throw new CsatChartError('이미 destroy() 된 차트입니다');
  }
}

function resolveCanvas(target: CanvasLike | string): CanvasLike {
  if (typeof target === 'string') {
    if (typeof document === 'undefined') {
      throw new CsatChartError(`id 문자열은 브라우저에서만 씁니다 ("${target}")`);
    }
    const el = document.getElementById(target);
    if (!el) throw new CsatChartError(`id "${target}" 인 요소를 찾지 못했습니다`);
    // XHTML(application/xhtml+xml) 문서에서는 tagName 이 대문자로 바뀌지 않는다.
    // 대소문자를 맞춰 보지 않으면 멀쩡한 <canvas> 를 «캔버스가 아니다» 라고 막는다.
    if (el.tagName.toUpperCase() !== 'CANVAS') {
      throw new CsatChartError(`id "${target}" 인 요소는 <canvas> 가 아닙니다`);
    }
    return el as unknown as CanvasLike;
  }

  // 가장 흔한 사용법은 `new CsatChart(document.getElementById('c'), …)` 다.
  // id 를 잘못 적으면 여기로 null 이 들어오는데, 그냥 두면 아래에서
  // «Cannot read properties of null (reading 'getContext')» 라는 영문 TypeError 로
  // 끝난다. 개발자 도구를 열지 않는 사용자를 겨냥한 라이브러리에서, 문자열
  // 경로에는 친절한 안내가 있는데 요소 경로만 그러면 앞뒤가 맞지 않는다.
  if (target === null || typeof target !== 'object') {
    throw new CsatChartError(
      `첫 인자는 <canvas> 요소이거나 id 문자열이어야 합니다 (지금 ${target === null ? 'null' : typeof target})` +
        (target === null ? ' — getElementById 가 그 id 를 찾지 못한 것은 아닌지 보세요' : ''),
    );
  }
  if (typeof (target as { getContext?: unknown }).getContext !== 'function') {
    throw new CsatChartError('첫 인자에 getContext 가 없습니다 — <canvas> 요소가 맞는지 보세요');
  }
  return target;
}
