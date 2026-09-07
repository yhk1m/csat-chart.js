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
//
// 이 스크립트는 두 번 돌아도, 그리고 언젠가 tsup 이 이 버그를 고쳐서
// `.d.mts` 를 직접 내도 안전해야 한다. 이름 바꾸기라 성공하면 `src`
// (`.d.ts`) 가 사라진다 — 그래서 다시 돌리면 `src` 가 없다. `dest`
// (`.d.mts`) 가 이미 있으면 "이미 끝났다"는 뜻이지 "빌드가 실패했다"는
// 뜻이 아니므로, 그때는 조용히 성공(exit 0)한다. tsup 이 나중에 고쳐서
// 처음부터 `.d.mts` 를 내는 날에도 마찬가지다 — `src` 는 애초에 없고
// `dest` 는 tsup 이 이미 만들어 뒀을 테니 이 스크립트는 할 일이 없다.
// `dest` 마저 없을 때만 진짜 오류(빌드를 먼저 돌리지 않음)로 본다.

import { renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const src = join(dist, 'csat-chart.d.ts');
const dest = join(dist, 'csat-chart.d.mts');

if (!existsSync(src)) {
  if (existsSync(dest)) {
    console.log(`[fix-esm-dts-ext] ${dest} 가 이미 있습니다 — 할 일이 없습니다.`);
    process.exit(0);
  }
  console.error(`[fix-esm-dts-ext] ${src} 가 없습니다 — tsup build 가 먼저 끝나야 합니다.`);
  process.exit(1);
}

renameSync(src, dest);
console.log(`[fix-esm-dts-ext] ${src} → ${dest}`);
