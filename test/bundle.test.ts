// © 2026 김용현
// 이 테스트는 dist/ 가 있어야 돈다. `npm run build` 뒤에 돌린다.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { createCanvas } from '@napi-rs/canvas';

const DIST = join(__dirname, '..', 'dist');
const ARTIFACTS = [
  'csat-chart.mjs',
  'csat-chart.cjs',
  'csat-chart.umd.min.js',
  'csat-chart.d.mts',
  'csat-chart.d.cts',
];

const BUILD_HINT = 'dist/ 가 없습니다 — `npm run build` 를 먼저 돌리세요';

describe('번들 산출물', () => {
  it.each(ARTIFACTS)('%s 가 만들어졌다', (name) => {
    expect(existsSync(join(DIST, name)), BUILD_HINT).toBe(true);
  });

  it('ESM 번들로 차트를 그린다', async () => {
    const mod = await import(pathToFileURL(join(DIST, 'csat-chart.mjs')).href);
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
  });

  it('UMD 번들이 데모용으로도 복사된다', () => {
    expect(existsSync(join(__dirname, '..', 'docs', 'lib', 'csat-chart.umd.min.js'))).toBe(true);
  });
});
