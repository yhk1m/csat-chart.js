// © 2026 김용현
// 이 테스트는 dist/ 가 있어야 돈다. `npm run build` 뒤에 돌린다.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createContext, runInContext } from 'node:vm';
import { createCanvas } from '@napi-rs/canvas';

const DIST = join(__dirname, '..', 'dist');

// 존재만 확인하면 0 바이트로 잘린 파일도 통과한다 — 리뷰에서 실제로
// dist/csat-chart.cjs, .d.mts, .d.cts 를 0 바이트로 잘라도 기존 8 개
// 테스트가 전부 통과함을 확인했다. 그래서 최소 크기도 같이 본다. 아래
// 바이트 수는 실제 빌드 크기(mjs 188.2KB, cjs 191.4KB, umd 96.1KB, dts 각
// 37.8KB)의 1/4~1/7 수준으로 잡았다 — 앞으로 export 가 늘거나 줄어도
// 여유가 넉넉하되, 잘리거나 빈 파일은 반드시 걸러낸다.
const ARTIFACT_MIN_SIZES: [name: string, minBytes: number][] = [
  ['csat-chart.mjs', 50_000],
  ['csat-chart.cjs', 50_000],
  ['csat-chart.umd.min.js', 20_000],
  ['csat-chart.d.mts', 5_000],
  ['csat-chart.d.cts', 5_000],
];

const BUILD_HINT = 'dist/ 가 없습니다 — `npm run build` 를 먼저 돌리세요';

describe('번들 산출물', () => {
  it.each(ARTIFACT_MIN_SIZES)('%s 가 만들어졌고 잘리지 않았다 (>= %i 바이트)', (name, minBytes) => {
    const path = join(DIST, name);
    expect(existsSync(path), BUILD_HINT).toBe(true);
    const { size } = statSync(path);
    expect(size, `${name} 가 ${size} 바이트뿐입니다 — 잘렸을 수 있습니다`).toBeGreaterThanOrEqual(
      minBytes,
    );
  });

  it('ESM 번들로 차트를 그린다', async () => {
    const mod = await import(pathToFileURL(join(DIST, 'csat-chart.mjs')).href);
    const chart = new mod.CsatChart(createCanvas(800, 600), {
      type: 'ternary',
      data: mod.createDefaultTernaryData(),
    });
    expect(chart.toDataURL().startsWith('data:image/png;base64,')).toBe(true);
  });

  it('CJS 번들로 차트를 그린다', () => {
    // package.json 이 "type": "module" 이라 이 테스트 파일 안에서 top-level
    // require 를 못 쓴다 — createRequire 로 CJS 번들을 불러온다. dist/ 안에서
    // 기능으로 실제 검증되는 건 이 테스트뿐이다.
    const require = createRequire(import.meta.url);
    const mod = require(join(DIST, 'csat-chart.cjs'));
    const chart = new mod.CsatChart(createCanvas(800, 600), {
      type: 'ternary',
      data: mod.createDefaultTernaryData(),
    });
    expect(chart.toDataURL().startsWith('data:image/png;base64,')).toBe(true);
  });

  it('UMD 번들이 전역 CsatChart 를 만든다', () => {
    const code = readFileSync(join(DIST, 'csat-chart.umd.min.js'), 'utf8');
    const sandbox: Record<string, unknown> = {};
    createContext(sandbox);
    runInContext(code, sandbox);

    const G = sandbox.CsatChart as Record<string, unknown>;
    expect(typeof G).toBe('function');
    expect(typeof G.createDefaultTernaryData).toBe('function');
    expect(typeof G.ensureFonts).toBe('function');
    expect(Array.isArray(G.CHART_TYPES)).toBe(true);

    // 회귀 테스트: tsup.config.ts 의 banner/footer 가 IIFE 전체를 함수로
    // 한 번 더 감싸서, esbuild 가 globalName 으로 내는 `var __csat` 이
    // 페이지 전역으로 새지 않아야 한다.
    expect('__csat' in sandbox).toBe(false);
  });

  it('UMD 번들을 같은 sandbox 에 두 번 불러와도 던지지 않는다', () => {
    const code = readFileSync(join(DIST, 'csat-chart.umd.min.js'), 'utf8');
    const sandbox: Record<string, unknown> = {};
    createContext(sandbox);

    expect(() => {
      runInContext(code, sandbox);
      runInContext(code, sandbox);
    }).not.toThrow();
    expect(typeof sandbox.CsatChart).toBe('function');
    expect('__csat' in sandbox).toBe(false);
  });

  it('UMD 번들이 데모용으로도 복사된다', () => {
    const demoPath = join(__dirname, '..', 'docs', 'lib', 'csat-chart.umd.min.js');
    expect(existsSync(demoPath), 'docs/lib/csat-chart.umd.min.js 가 없습니다').toBe(true);

    // tsup.config.ts 의 dist 쪽 설정만 sourcemap:true 라서, 둘의 차이는
    // dist 번들 맨 끝의 `//# sourceMappingURL=...` 주석 한 줄뿐이다(실제로
    // diff 로 확인했다). 그 줄을 떼고 비교해 데모 사본이 최신 빌드와 같은
    // 내용인지 본다 — src 를 고치고 재빌드를 잊으면 이 테스트가 잡는다.
    const distCode = readFileSync(join(DIST, 'csat-chart.umd.min.js'), 'utf8');
    const demoCode = readFileSync(demoPath, 'utf8');
    const distWithoutSourceMapComment = distCode.replace(/\/\/# sourceMappingURL=[^\n]*$/, '');
    expect(demoCode).toBe(distWithoutSourceMapComment);
  });
});
