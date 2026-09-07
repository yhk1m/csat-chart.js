// © 2026 김용현
//
// tsup 의 `dts: true` 는 선언 파일 번들링을 별도 워커 스레드에서 돌린다
// (rollup.js 를 worker_threads 로 띄운다). 워커로 옵션을 넘길 때 함수는
// 구조화 복제가 안 되므로 tsup 자신이 `outExtension` 을 지워 버린다
// (tsup/dist/index.js 의 `dtsTask` 참고, `outExtension: void 0`). 그 결과
// 실제로 쓰이는 것은 tsup 내부 `defaultOutExtension` 인데, 이 함수는
// `package.json` 의 `"type": "module"` 을 보고 "esm 은 이미 기본이니
// `.d.ts` 로 충분하다" 고 가정해서 cjs 쪽만 `.d.cts` 로 바꾸고 esm 쪽은
// `.d.ts` 그대로 남긴다. tsup.config.ts 에 dts 확장자를 지정해도 워커
// 단계에서 사라지므로 tsup.config.ts 만으로는 고칠 수 없다.
//
// 이 패키지는 번들이 하나로 말려 있어(dts:true, 상대 경로 import 없음)
// `csat-chart.d.ts` 와 `csat-chart.d.cts` 가 바이트 단위로 같다 — 실제로
// `diff dist/csat-chart.d.ts dist/csat-chart.d.cts` 로 확인했다. 그래서
// `.d.ts` 를 그대로 `.d.mts` 로 옮겨도 안전하다. `package.json` 의
// `exports["."].import.types` 가 요구하는 파일명을 맞추기 위한 빌드 후
// 처리 단계다. 복사가 아니라 이름 바꾸기(rename)로 처리하는 이유는,
// `package.json` 그 무엇도 `csat-chart.d.ts` 라는 이름을 가리키지 않아서
// (top-level `types` 는 `.d.cts`, `exports` 는 `.d.mts`/`.d.cts`) 그대로
// 두면 아무도 안 쓰는 파일이 `npm pack` 산출물에 죽은 채로 얹히기 때문이다.

import { renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const src = join(dist, 'csat-chart.d.ts');
const dest = join(dist, 'csat-chart.d.mts');

if (!existsSync(src)) {
  console.error(`[fix-esm-dts-ext] ${src} 가 없습니다 — tsup build 가 먼저 끝나야 합니다.`);
  process.exit(1);
}

renameSync(src, dest);
console.log(`[fix-esm-dts-ext] ${src} → ${dest}`);
