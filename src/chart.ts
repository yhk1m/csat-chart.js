// © 2026 김용현
// 캔버스 획득·다시 그리기·PNG 추출의 수명주기를 관리하는 파사드.
import { REGISTRY } from './registry';
import { CsatChartError, assertChartData, assertChartType } from './validate';
import { ensureFonts } from './fonts';
import { clearCanvas, createDefaultGraphOptions, type GraphOptions } from './core/index';
import type { ChartDataMap, ConfigFor, CsatChartType, UpdateFor } from './types';

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
 * 종류 하나를 붙들고 사는 차트.
 *
 * `T` 는 생성자의 `config.type` 에서 추론된다. 그래서 `update()` 의 `data` 도
 * 같은 종류로 좁혀지고, 다른 종류의 데이터를 넣으면 컴파일 시점에 걸린다.
 */
export class CsatChart<T extends CsatChartType = CsatChartType> {
  /** 시험지 글꼴을 확보한다. 자세한 것은 `ensureFonts` 참고. */
  static readonly ensureFonts = ensureFonts;

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

    assertChartType(config.type);
    assertChartData(config.type, config.data);

    this.type = config.type;
    this.data = config.data;
    this.options = { ...createDefaultGraphOptions(), ...config.options };

    if (!this.canvas.width) this.canvas.width = DEFAULT_WIDTH;
    if (!this.canvas.height) this.canvas.height = DEFAULT_HEIGHT;

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
      this.options = { ...this.options, ...next.options };
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

  toDataURL(): string {
    this.assertAlive();
    if (typeof this.canvas.toDataURL !== 'function') {
      throw new CsatChartError('이 캔버스는 toDataURL 을 지원하지 않습니다');
    }
    return this.canvas.toDataURL('image/png');
  }

  /** 브라우저 전용. Node 에서는 `toDataURL()` 이나 캔버스의 버퍼를 쓴다. */
  download(filename = 'csat-chart.png'): void {
    this.assertAlive();
    if (typeof document === 'undefined') {
      throw new CsatChartError(
        'download() 는 브라우저에서만 씁니다. Node 에서는 toDataURL() 이나 캔버스의 버퍼를 쓰세요',
      );
    }
    const a = document.createElement('a');
    a.href = this.toDataURL();
    a.download = filename;
    a.click();
  }

  destroy(): void {
    if (this.destroyed) return;
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

  private assertAlive(): void {
    if (this.destroyed) throw new CsatChartError('이미 destroy() 된 차트입니다');
  }
}

function resolveCanvas(target: CanvasLike | string): CanvasLike {
  if (typeof target !== 'string') return target;
  if (typeof document === 'undefined') {
    throw new CsatChartError(`id 문자열은 브라우저에서만 씁니다 ("${target}")`);
  }
  const el = document.getElementById(target);
  if (!el) throw new CsatChartError(`id "${target}" 인 요소를 찾지 못했습니다`);
  if (el.tagName !== 'CANVAS') {
    throw new CsatChartError(`id "${target}" 인 요소는 <canvas> 가 아닙니다`);
  }
  return el as unknown as CanvasLike;
}
