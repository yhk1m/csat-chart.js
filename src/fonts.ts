// © 2026 김용현
// 렌더러는 Noto Serif KR(기본)·Noto Sans KR 을 쓴다. 글꼴이 없으면 대체 글꼴로
// 그려져 시험지 양식이 재현되지 않는다. 번들에 글꼴을 넣지 않는 대신, 부르는
// 사람만 내려받도록 이 헬퍼를 둔다.

export interface EnsureFontsOptions {
  /**
   * 글꼴 CSS 주소. 기본은 Google Fonts. 사내망·오프라인이면 바꾼다.
   *
   * `families` 와 짝이다. 한쪽만 바꾸면 어긋난다 — 예컨대 `families` 만
   * 바꾸면 기본 구글 스타일시트가 그 글꼴을 제공하지 않는데도 `true` 가
   * 나온다(아래 반환값 설명 참고).
   */
  href?: string;
  /** 확인할 글꼴 이름. 기본은 Noto Serif KR, Noto Sans KR. `href` 와 함께 바꾼다. */
  families?: string[];
  /** 이 시간(ms) 안에 준비되지 않으면 false 를 돌려주고 넘어간다. 기본 5000 */
  timeoutMs?: number;
}

const DEFAULT_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Noto+Sans+KR:wght@400;700' +
  '&family=Noto+Serif+KR:wght@400;700' +
  '&display=swap';

const DEFAULT_FAMILIES = ['Noto Serif KR', 'Noto Sans KR'];
const LINK_ID = 'csat-chart-fonts';

let pending: Promise<boolean> | null = null;

/**
 * 시험지 양식에 쓰이는 글꼴을 확보한다.
 *
 * 브라우저에서만 일한다. 준비되면 `true`, 시간 안에 못 받거나 Node 이거나
 * 브라우저가 `document.fonts` 를 모르면 `false` 를 돌려준다. **던지지 않는다** —
 * 글꼴이 없어도 그림은 대체 글꼴로 그려져야 하기 때문이다.
 *
 * ⚠️ `true` 가 «그 글꼴로 그려진다» 를 보장하지는 않는다. `document.fonts.load`
 * 는 페이지에 `@font-face` 가 없는 이름에 대해 거부하지 않고 **빈 배열로
 * 이행한다**. 그래서 `href` 없이 `families` 만 바꾸면 없는 글꼴에도 `true` 가
 * 나온다. 둘은 함께 바꾼다.
 *
 * ⚠️ 여러 번 불러도 실제 작업은 한 번만 하는데, **나중 호출의 옵션은 조용히
 * 버려진다.** 앞선 호출이 이미 시작했으면 그 약속을 그대로 돌려준다. 사내망
 * 주소를 쓸 것이라면 **가장 먼저** 그 옵션으로 부른다.
 *
 * ⚠️ «한 번만» 은 이 모듈 한 벌 기준이다. 한 페이지에 ESM 판과 CDN 판이 함께
 * 올라오면 각자 한 번씩 한다. `<link>` 는 id 로 걸러지므로 두 번 들어가지는
 * 않는다.
 */
export function ensureFonts(options: EnsureFontsOptions = {}): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
  pending ??= load(options);
  return pending;
}

/** 테스트 전용 — 다음 호출이 다시 일하도록 되돌린다. 공개 표면에 넣지 않는다. */
export function resetFontsForTest(): void {
  pending = null;
}

interface FontFaceSetLike {
  load(spec: string): Promise<unknown>;
}

async function load(o: EnsureFontsOptions): Promise<boolean> {
  const href = o.href ?? DEFAULT_HREF;
  const families = o.families ?? DEFAULT_FAMILIES;
  const timeoutMs = o.timeoutMs ?? 5000;

  // 이 구간까지 감싸야 «던지지 않는다» 가 완성된다. document 는 있는데 head 가
  // 아직 없거나(문서 파싱 도중), createElement 가 막힌 환경(엄격한 CSP·샌드박스)
  // 에서 여기서 던진다. load() 가 async 라 그 예외는 거부된 약속이 되어
  // ensureFonts() 호출부로 그대로 새어 나간다.
  try {
    if (!document.getElementById(LINK_ID)) {
      const link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  } catch {
    return false;
  }

  const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
  if (!fonts) return false;

  const work = (async () => {
    for (const family of families) {
      await fonts.load(`400 16px "${family}"`);
      await fonts.load(`700 16px "${family}"`);
    }
    return true;
  })();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });

  try {
    // `work.catch` 가 있어야 «던지지 않는다» 는 약속이 지켜진다. 네트워크가
    // 막히면 fonts.load 가 reject 하는데, 그게 새어 나가면 글꼴 하나 때문에
    // 그림 그리기 자체가 멈춘다.
    return await Promise.race([work.catch(() => false), timeout]);
  } finally {
    // 타이머를 지우지 않으면 일이 끝난 뒤에도 살아남아, Node 에서는
    // 프로세스가 timeoutMs 만큼 더 붙들린다.
    clearTimeout(timer);
  }
}
