// © 2026 김용현
import { defineConfig } from 'tsup';

/**
 * IIFE 번들의 전역 이름 정리.
 *
 * esbuild 는 `globalName` 에 **모듈 네임스페이스 객체**를 넣는다. 그대로 두면
 * 사용자가 `CsatChart.CsatChart` 를 써야 한다. 그래서 임시 이름으로 받은 뒤
 * 클래스 자신에 나머지 export 를 얹어 전역 `CsatChart` 로 다시 놓는다.
 * 그러면 `new CsatChart(...)` 와 `CsatChart.ensureFonts()` 가 함께 된다.
 */
const UMD_FOOTER =
  'globalThis.CsatChart=Object.assign(__csat.CsatChart,__csat);';

export default defineConfig([
  {
    entry: { 'csat-chart': 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    // `package.json` 의 `"type": "module"` 때문에 tsup 기본값은 esm 쪽 dts 를
    // `.d.ts` 로 남겨 둔다(패키지 기본이 이미 모듈이라 보고). exports 맵은
    // `.d.mts`/`.d.cts` 를 명시하므로 dts 확장자도 js 와 나란히 지정해야 한다.
    outExtension: ({ format }) => ({
      js: format === 'esm' ? '.mjs' : '.cjs',
      dts: format === 'esm' ? '.d.mts' : '.d.cts',
    }),
  },
  {
    entry: { 'csat-chart.umd': 'src/index.ts' },
    format: ['iife'],
    globalName: '__csat',
    footer: { js: UMD_FOOTER },
    minify: true,
    sourcemap: true,
    outExtension: () => ({ js: '.min.js' }),
  },
  {
    // 데모 페이지가 CDN 없이도 돌도록 같은 번들을 docs/lib 에 한 벌 더 둔다.
    entry: { 'csat-chart.umd': 'src/index.ts' },
    format: ['iife'],
    globalName: '__csat',
    footer: { js: UMD_FOOTER },
    minify: true,
    outDir: 'docs/lib',
    outExtension: () => ({ js: '.min.js' }),
  },
]);
