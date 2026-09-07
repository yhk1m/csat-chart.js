// © 2026 김용현
import { defineConfig, type Format, type Options } from 'tsup';

/**
 * IIFE 를 함수 하나로 한 번 더 감싼다.
 *
 * esbuild 는 `globalName` 을 `var __csat = …` 로 낸다. 그대로 두면 그 이름이
 * 페이지의 전역으로 새어 나가 CsatChart 옆에 쓸모없는 전역이 하나 더 생긴다.
 * 나중에 지울 수도 없다 — 번들이 엄격 모드라 var 바인딩은 configurable 이
 * 아니어서 delete 가 던진다. 그래서 처음부터 함수 안에 가둔다: banner 로
 * 여는 괄호를, footer 로 닫는 괄호를 둘러, `var __csat` 선언 자체를 그
 * 함수의 지역 변수로 만든다. `globalThis.CsatChart = …` 대입문은 같은 함수
 * 안에서 실행되니 `__csat` 을 그대로 참조할 수 있고, 대입 결과만 진짜
 * 전역에 남는다.
 *
 * 주의: `Object.assign(__csat.CsatChart, __csat)` 은 export 이름이
 * `name` · `length` · `prototype` 중 하나와 겹치면 던진다 — 함수(클래스)의
 * 쓰기 불가 own property 라서다. 지금 46개 export 중엔 없지만, 나중에
 * export 이름을 추가할 때 이 셋은 피해야 한다.
 */
const UMD_BANNER = '(function(){';
const UMD_FOOTER =
  'globalThis.CsatChart=Object.assign(__csat.CsatChart,__csat);})();';

/**
 * UMD(dist)와 데모용 사본(docs/lib)의 공통 설정.
 *
 * 두 산출물은 `entry`·`format`·`globalName`·`banner`·`footer`·`minify`·
 * `outExtension` 이 완전히 같다 — 차이는 `outDir` 과 `sourcemap` 뿐이다.
 * (dist 쪽만 소스맵을 낸다. CDN 사용자는 devtools 를 열어야만 .map 을
 * 받으므로 트래픽에 얹히지 않고, docs/lib 쪽은 저장소에 커밋되는 산출물이라
 * 소스맵까지 얹을 필요가 없다.) 따로 적으면 하나만 고치고 다른 하나를
 * 빠뜨리기 쉬워서 베이스를 한 곳에 두고 겹쳐 쓴다.
 */
const UMD_BASE: Options = {
  entry: { 'csat-chart.umd': 'src/index.ts' },
  // `as const` 로 얻는 `readonly` 튜플은 tsup 의 `Options.format: Format[]`
  // (readonly 아님) 과 안 맞는다 — `Format[]` 로 단언한다.
  format: ['iife'] as Format[],
  globalName: '__csat',
  banner: { js: UMD_BANNER },
  footer: { js: UMD_FOOTER },
  minify: true,
  outExtension: () => ({ js: '.min.js' }),
};

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
    ...UMD_BASE,
    sourcemap: true,
  },
  {
    // 데모 페이지가 CDN 없이도 돌도록 같은 번들을 docs/lib 에 한 벌 더 둔다.
    ...UMD_BASE,
    outDir: 'docs/lib',
  },
]);
