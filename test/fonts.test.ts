// © 2026 김용현
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ensureFonts, resetFontsForTest } from '../src/fonts';

interface FakeLink { id: string; rel: string; href: string }

function installFakeDom() {
  const appended: FakeLink[] = [];
  const loaded: string[] = [];
  const doc = {
    getElementById: (id: string) => appended.find((l) => l.id === id) ?? null,
    createElement: () => ({ id: '', rel: '', href: '' }) as FakeLink,
    head: { appendChild: (l: FakeLink) => void appended.push(l) },
    fonts: {
      load: (spec: string) => {
        loaded.push(spec);
        return Promise.resolve([]);
      },
    },
  };
  vi.stubGlobal('document', doc);
  return { appended, loaded };
}

beforeEach(() => resetFontsForTest());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ensureFonts', () => {
  it('Node(문서 없음)에서는 아무 일도 하지 않고 false 를 돌려준다', async () => {
    vi.stubGlobal('document', undefined);
    await expect(ensureFonts()).resolves.toBe(false);
  });

  it('스타일시트를 한 번만 넣는다', async () => {
    const { appended } = installFakeDom();
    await ensureFonts();
    resetFontsForTest();
    await ensureFonts();
    expect(appended).toHaveLength(1);
    expect(appended[0].id).toBe('csat-chart-fonts');
    expect(appended[0].href).toContain('Noto+Serif+KR');
  });

  it('두 글꼴을 굵기 둘씩 불러온다', async () => {
    const { loaded } = installFakeDom();
    await expect(ensureFonts()).resolves.toBe(true);
    expect(loaded).toEqual([
      '400 16px "Noto Serif KR"',
      '700 16px "Noto Serif KR"',
      '400 16px "Noto Sans KR"',
      '700 16px "Noto Sans KR"',
    ]);
  });

  it('href 를 바꿔 사내망 주소를 쓸 수 있다', async () => {
    const { appended } = installFakeDom();
    await ensureFonts({ href: 'https://intranet.example/fonts.css' });
    expect(appended[0].href).toBe('https://intranet.example/fonts.css');
  });

  it('두 번 불러도 한 번만 일한다', async () => {
    const { appended } = installFakeDom();
    const [a, b] = await Promise.all([ensureFonts(), ensureFonts()]);
    expect(a).toBe(b);
    expect(appended).toHaveLength(1);
  });

  it('글꼴을 못 받아도 던지지 않고 false 를 돌려준다', () => {
    // 문서가 «던지지 않는다» 고 약속한다. 네트워크가 막히면 fonts.load 가
    // reject 하는데, 그게 그대로 새어 나가면 약속이 깨진다.
    vi.stubGlobal('document', {
      getElementById: () => null,
      createElement: () => ({ id: '', rel: '', href: '' }) as FakeLink,
      head: { appendChild: () => {} },
      fonts: { load: () => Promise.reject(new Error('네트워크 오류')) },
    });
    return expect(ensureFonts()).resolves.toBe(false);
  });

  it('시간 안에 못 받으면 false 를 돌려준다', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('document', {
      getElementById: () => null,
      createElement: () => ({ id: '', rel: '', href: '' }) as FakeLink,
      head: { appendChild: () => {} },
      fonts: { load: () => new Promise(() => {}) }, // 영원히 끝나지 않는다
    });
    const p = ensureFonts({ timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    await expect(p).resolves.toBe(false);
  });

  it('성공한 뒤에 타임아웃 타이머를 남기지 않는다', async () => {
    // 남기면 Node 에서 5초 동안 프로세스가 안 끝난다.
    vi.useFakeTimers();
    installFakeDom();
    await ensureFonts();
    expect(vi.getTimerCount()).toBe(0);
  });
});
