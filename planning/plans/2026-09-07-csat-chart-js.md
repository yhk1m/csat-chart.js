# csat-chart.js Implementation Plan

> **기록물 안내:** 이 문서는 csat-chart.js 1.0.0 을 어떻게 만들었는지 남긴 이력이다.
> 작업 당시 세션에서 단계별 진행 상황을 추적하려고 아래 체크박스(`- [ ]`)를 썼을
> 뿐이며, 지금은 전부 끝난 일이다 — 다시 체크하지 않는다. 남은 할 일 목록이
> 아니라 «어떻게 만들었는가» 의 기록으로 읽는다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수능 형식 그래프 렌더러 16종을 npm·CDN 양쪽으로 쓸 수 있는 독립 오픈소스 패키지로 낸다.

**Architecture:** `geo-graph` 밀봉 폴더를 `src/core/`로 **무수정 이관**하고(골든 이미지 31장이 이식의 증거), 그 위에 레지스트리·검증·파사드·글꼴 헬퍼를 얹는다. `src/index.ts`가 유일한 공개 표면이며 `export *`를 쓰지 않는다.

**Tech Stack:** TypeScript 5 · tsup(esbuild) · vitest 4 · @napi-rs/canvas(테스트 전용) · ESLint 9. **런타임 의존성 0.**

**설계 문서:** `planning/specs/2026-09-07-csat-chart-js-design.md`

---

## 반드시 지킬 것

1. **`src/core/`를 고치지 않는다.** 이관 후 그 안의 코드에 손대는 순간 골든 이미지가
   «똑같이 그려진다»의 증거가 되기를 멈춘다. 새 기능은 언제나 `core/` 바깥에 얹는다.
2. **`geotester-v2`와 `GeoGrapher`를 고치지 않는다.** 읽기 전용 참조다. 파일을
   복사해 올 뿐이다.
3. **재귀 복사에 Node `fs`를 쓰지 않는다.** 이 PC의 한글 경로에서 Node의
   `cpSync(..., {recursive:true})`·`rmSync(..., {recursive:true})`가 크래시한다.
   셸의 `cp -r`을 쓴다.
4. 커밋 메시지는 한국어. 각 태스크 끝에서 커밋한다.
5. **셸 명령은 Bash 도구로 돌린다.** `SKIP_GOLDEN=1 npm test` 같은 환경변수 접두사와
   `cp -r`·`sed -i` 는 PowerShell 에서 동작하지 않는다. PowerShell 을 써야 한다면
   `$env:SKIP_GOLDEN='1'; npm test` 로 바꿔 쓴다.

**원본 경로 (읽기 전용, 이 저장소와 같은 작업 폴더의 형제 저장소):**
`../geotester-v2/src/lib/geo-graph`
아래에서 `$SRC`로 줄여 쓴다.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/core/**` | **이관층.** ctx·크기·데이터를 받아 그린다. 그 외 아무것도 모른다 |
| `src/types.ts` | 종류 → 데이터 타입 지도. 판별 유니온의 출처 |
| `src/registry.ts` | 문자열 키 16개 → 렌더러·기본 데이터 |
| `src/validate.ts` | 데이터 모양 검사와 한국어 오류 메시지 |
| `src/chart.ts` | 파사드 `CsatChart` — 캔버스 획득·다시 그리기·PNG |
| `src/fonts.ts` | `ensureFonts()` — 브라우저 글꼴 확보 |
| `src/index.ts` | 공개 표면. 이름을 하나씩 적는다 |
| `test/core/**` | 이관된 골든 31장 + 단위 테스트 5종 |
| `test/*.test.ts` | 새 계층의 테스트 |
| `docs/index.html` | GitHub Pages 데모 |

---

### Task 1: 저장소 뼈대

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `LICENSE`
- Test: `test/scaffold.test.ts`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`test/scaffold.test.ts`:

```ts
// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';

describe('개발 환경', () => {
  it('vitest 가 돈다', () => {
    expect(1 + 1).toBe(2);
  });

  it('@napi-rs/canvas 로 PNG 버퍼를 만든다', () => {
    const canvas = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 20, 20);
    const buf = canvas.toBuffer('image/png');
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run`
Expected: FAIL — vitest 가 설치돼 있지 않음 (`npx` 가 설치를 시도하거나 모듈을 못 찾음)

- [ ] **Step 3: `package.json` 을 만든다**

```json
{
  "name": "csat-chart.js",
  "version": "0.0.0",
  "description": "수능·모의고사 시험지 양식의 그래프를 Canvas 2D로 그리는 라이브러리",
  "license": "MIT",
  "author": "김용현",
  "repository": { "type": "git", "url": "git+https://github.com/yhk1m/csat-chart.js.git" },
  "homepage": "https://yhk1m.github.io/csat-chart.js/",
  "keywords": ["chart", "canvas", "korea", "csat", "수능", "지리", "geography", "exam"],
  "type": "module",
  "types": "./dist/csat-chart.d.cts",
  "main": "./dist/csat-chart.cjs",
  "module": "./dist/csat-chart.mjs",
  "unpkg": "./dist/csat-chart.umd.min.js",
  "jsdelivr": "./dist/csat-chart.umd.min.js",
  "exports": {
    ".": {
      "import": { "types": "./dist/csat-chart.d.mts", "default": "./dist/csat-chart.mjs" },
      "require": { "types": "./dist/csat-chart.d.cts", "default": "./dist/csat-chart.cjs" }
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup && node scripts/fix-esm-dts-ext.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint --no-error-on-unmatched-pattern src test",
    "verify": "npm run typecheck && npm run lint && npm run build && npm run test",
    "prepublishOnly": "npm run verify"
  },
  "devDependencies": {
    "@eslint/js": "^9",
    "@napi-rs/canvas": "1.0.3",
    "@types/node": "^20",
    "eslint": "^9",
    "tsup": "^8",
    "typescript": "^5",
    "typescript-eslint": "^8",
    "vitest": "^4.1.10"
  }
}
```

두 스크립트에 주의할 점이 있다.

- `verify` 는 **`build` 를 `test` 보다 먼저** 돌린다. Task 9 의 `test/bundle.test.ts`
  가 `dist/` 를 읽기 때문이다. 순서를 뒤집으면 `prepublishOnly`(= `npm publish`)가
  깨끗한 체크아웃에서 실패한다.
- `lint` 에 `--no-error-on-unmatched-pattern` 이 붙는다. `src/` 가 아직 없는 동안
  (Task 1~2 사이)과 `src/` 가 전부 `src/core/**` 라서 통째로 무시되는 동안
  (Task 2~4 사이) ESLint 9 가 exit 2 로 크래시하기 때문이다.

`@napi-rs/canvas` 는 **범위가 아니라 정확히 `1.0.3`** 으로 고정한다. 골든 이미지를
만든 geotester-v2 에 깔린 것이 1.0.3 이고, 캔버스 구현이 바뀌면 래스터화가 달라져
골든이 어긋난다. 그러면 «이식이 틀린 건지 캔버스가 바뀐 건지» 구분할 수 없게 되어
Task 3 의 검증이 무의미해진다. 이식이 확인된 뒤에 범위를 넓힐지 따로 판단한다.

- [ ] **Step 4: `tsconfig.json` 을 만든다**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": ["src", "test", "tsup.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 5: `vitest.config.ts` 를 만든다**

```ts
// © 2026 김용현
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: `eslint.config.mjs` 를 만든다**

```js
// © 2026 김용현
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // src/core 는 이관층이다. 원본을 한 글자도 고치지 않는 것이 원칙이므로
  // 이 저장소의 lint 규칙을 들이대지 않는다. 그쪽의 검증 수단은 골든 이미지다.
  { ignores: ['dist/**', 'docs/**', 'src/core/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
```

- [ ] **Step 7: `LICENSE` 를 만든다 (MIT)**

```
MIT License

Copyright (c) 2026 김용현

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 8: 설치하고 테스트를 통과시킨다**

Run: `npm install`
Run: `npx vitest run`
Expected: PASS — `개발 환경 > vitest 가 돈다`, `@napi-rs/canvas 로 PNG 버퍼를 만든다` 2건 통과

- [ ] **Step 9: 커밋**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts eslint.config.mjs LICENSE test/scaffold.test.ts
git commit -m "chore: 저장소 뼈대 — tsup·vitest·eslint·MIT 라이선스"
```

---

### Task 2: core 무수정 이관

**Files:**
- Create: `src/core/` (원본 복사)

- [ ] **Step 1: 원본을 통째로 복사한다**

Bash 도구로 실행한다. **Node `fs`의 재귀 복사를 쓰지 않는다** (한글 경로 크래시).

```bash
SRC="../geotester-v2/src/lib/geo-graph"
DEST="src/core"
mkdir -p "$DEST"
cp -r "$SRC/canvas" "$SRC/graphs" "$SRC/types" "$DEST/"
cp "$SRC/index.ts" "$DEST/index.ts"
```

`__tests__`·`README.md`·`CHANGES.md`는 복사하지 않는다. 테스트는 Task 3에서
`test/core/`로 따로 옮기고, 두 문서는 Task 10에서 CHANGELOG로 흡수한다.

- [ ] **Step 2: `export.ts` 를 지운다**

```bash
rm "src/core/canvas/export.ts"
```

이유: GeoGrapher 전용이다. 파일명을 `GeoGrapher_*.png`로 짓고, 공개 표면에서
제외하기로 한 `ExportSettings`·`GraphType`에 의존하며, geotester-v2 안에서도
아무도 import 하지 않는 죽은 코드다. 같은 역할은 Task 7의 파사드가 대신한다.
**이것이 `core/` 무수정 원칙의 유일한 예외다.**

- [ ] **Step 3: 아무것도 `export.ts` 를 참조하지 않는지 확인한다**

Run: `grep -rn "canvas/export\|exportCanvasToPNG" src/`
Expected: 출력 없음

- [ ] **Step 4: 파일 수를 확인한다**

Run: `find src/core -name "*.ts" | wc -l`
Expected: `38` (canvas 5 + graphs 16 + types 16 + index 1)

원본 `canvas/` 는 6개지만 `export.ts` 를 지우므로 5개가 된다.

- [ ] **Step 5: 타입이 통과하는지 확인한다**

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add src/core
git commit -m "feat: geo-graph 이관 — 렌더러 16종 무수정 복사

geotester-v2/src/lib/geo-graph 의 2026-09-07 스냅샷.
canvas/export.ts 만 제외했다 (GeoGrapher 전용 죽은 코드)."
```

---

### Task 3: 골든·단위 테스트 이관 — 이식 검증 관문

이 태스크가 통과하면 «똑같이 그려진다»가 기계로 증명된 것이다. 이후 모든 작업의
안전망이다.

**Files:**
- Create: `test/core/` — `.ts` 8개(`fixtures.ts` + `golden.test.ts` + 단위 테스트 6종:
  abs-bar-zero-baseline · auto-range · canvas-backend · category-dot ·
  pyramid-tick-step · treemap-layout) + `__snapshots__/*.png` 31장

- [ ] **Step 1: 테스트와 기준 이미지를 복사한다**

```bash
SRC="../geotester-v2/src/lib/geo-graph/__tests__"
DEST="test/core"
mkdir -p "$DEST"
cp "$SRC"/*.ts "$DEST/"
cp -r "$SRC/__snapshots__" "$DEST/"
ls "$DEST/__snapshots__"/*.png | wc -l    # 31 이어야 한다
```

- [ ] **Step 2: import 경로를 고친다**

테스트 파일들은 `'../index'`·`'../graphs/…'`를 참조한다. `test/core/`에서는
`src/core/`를 가리켜야 한다.

```bash
cd "test/core"
sed -i "s|from '\.\./index'|from '../../src/core/index'|g" *.ts
sed -i "s|from '\.\./graphs/|from '../../src/core/graphs/|g" *.ts
grep -n "from '\.\." *.ts
```

Expected: 모든 import 가 `'../../src/core/…'` 로 바뀜

- [ ] **Step 3: 골든 테스트를 CI 에서 건너뛸 수 있게 한다**

`test/core/golden.test.ts` 에 두 곳을 고친다.

(가) `const UPDATE = process.env.UPDATE_GOLDEN === '1';` 바로 아래에 넣는다:

```ts
/**
 * 기준 이미지는 **글꼴 대체 결과에 의존한다.** @napi-rs/canvas 는 등록된 글꼴이
 * 없으면 시스템 기본 글꼴로 그리므로, 기계가 바뀌면 픽셀이 달라진다.
 * 그래서 CI 에서는 건너뛴다 (`SKIP_GOLDEN=1`). 이식 검증은 저자 기계에서 한다.
 * 글꼴과 무관한 «빈 캔버스가 아니다» 검사는 늘 돌린다.
 */
const SKIP_GOLDEN = process.env.SKIP_GOLDEN === '1';
```

(나) 첫 번째 케이스 블록의 첫 줄만 바꾼다. 본문은 건드리지 않는다.

바꾸기 전:

```ts
  it.each(CASES)('%s 렌더 결과가 기준 이미지와 같다', (name, fn, makeData) => {
```

바꾼 뒤:

```ts
  (SKIP_GOLDEN ? it.skip : it).each(CASES)(
    '%s 렌더 결과가 기준 이미지와 같다',
    (name, fn, makeData) => {
```

블록 끝의 `});` 를 `},
  );` 로 맞춰 닫는다.

(다) **두 번째 블록의 검사를 실제로 실패할 수 있게 만든다.**

`createCanvas` 가 준 캔버스는 흰색이 아니라 **투명한 검정**이다. 그런데 검사는
«흰색이 아닌 픽셀» 을 세므로, 렌더러가 아무것도 안 그려도 480,000 이 나와 통과한다.
렌더러 16종이 스스로 `clearCanvas` 로 흰 배경을 칠하기 때문에 지금은 우연히 뜻이
맞아 보이지만, **렌더러가 통째로 no-op 이 되어도 이 검사는 통과한다.**
`SKIP_GOLDEN=1` 인 CI 에서 이것이 유일하게 남는 렌더링 검사이므로 고친다.

import 에 `clearCanvas` 를 더하고,

```ts
import { clearCanvas, createDefaultGraphOptions } from '../../src/core/index';
```

두 번째 블록에서 `fn(...)` **앞에** 한 줄을 넣는다:

```ts
    // 새 캔버스는 투명 검정이다. 흰색으로 채워야 «흰색이 아닌 픽셀» 이 뜻을 가진다.
    clearCanvas(ctx, W, H);
    fn(ctx, W, H, makeData() as never, optionsFor(_name));
```

이것이 이 파일의 **세 번째이자 마지막** 의도된 수정이다.

- [ ] **Step 4: 테스트를 돌린다**

Run: `npx vitest run`
Expected: PASS — 파일 8개, 128건. 골든 31 + 빈캔버스 31 + canvas-backend 8 +
auto-range 21 + abs-bar-zero-baseline 4 + category-dot 2 + pyramid-tick-step 8 +
treemap-layout 26 + scaffold 2. **실패 0건.**

골든이 하나라도 어긋나면 **멈추고 원인을 밝힌다.** `UPDATE_GOLDEN=1` 로 덮어쓰지
않는다 — 이 단계에서 기준을 갱신하면 이식 검증 자체가 무의미해진다.

- [ ] **Step 5: CI 건너뛰기가 동작하는지 본다**

Run: `SKIP_GOLDEN=1 npx vitest run test/core/golden.test.ts`
Expected: 31건 skipped, 31건(빈 캔버스) passed

- [ ] **Step 6: 커밋**

```bash
git add test/core
git commit -m "test: 골든 이미지 31장과 단위 테스트 이관

이식이 픽셀 단위로 동일함을 확인했다.
골든은 글꼴 대체 결과에 의존하므로 SKIP_GOLDEN=1 로 CI에서 건너뛴다."
```

- [ ] **Step 7: `.gitattributes` 로 기준 이미지를 이진 파일로 못박는다**

```
* text=auto eol=lf

*.png binary
```

**순서가 중요하다 — 뒤에 오는 규칙이 이긴다.** `*.png binary` 를 위에 두면
포괄 규칙이 덮어써서 아무 효과가 없다.

없어도 지금은 동작한다. git 이 첫 8000바이트에서 NUL 을 찾아 이진 파일로
알아서 판정하기 때문이다. 하지만 그건 그림 내용에 기댄 추론이라, 앞으로
아주 단순한 그림이 기준으로 들어오면 조건을 벗어나 CRLF 변환으로 조용히
망가질 수 있다. `git check-attr text diff -- test/core/__snapshots__/absbar.png`
가 둘 다 `unset` 을 돌려주는지로 확인한다.

---

### Task 4: 종류 지도와 레지스트리

**Files:**
- Create: `src/types.ts`, `src/registry.ts`
- Test: `test/registry.test.ts`

`src/types.ts` 가 «어떤 종류에 어떤 데이터가 오는가»의 유일한 출처다. 여기서
`CsatChartType` 과 판별 유니온이 함께 도출되므로 둘이 어긋날 수 없다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`test/registry.test.ts`:

```ts
// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { REGISTRY, CHART_TYPES, isCsatChartType } from '../src/registry';
import { clearCanvas, createDefaultGraphOptions } from '../src/core/index';

describe('레지스트리', () => {
  it('16종을 담는다', () => {
    expect(CHART_TYPES).toHaveLength(16);
  });

  it('키가 정확히 이 16개다', () => {
    // ChartDataMap 과 REGISTRY 의 키가 어긋나면 tsc 가 먼저 막는다.
    // 이 테스트가 잡는 건 다른 것이다 — 오타 난 키가 양쪽에 똑같이 들어간 경우.
    expect([...CHART_TYPES]).toEqual([
      'absbar', 'category-dot', 'climate', 'cube', 'data-table',
      'deviation-a', 'deviation-b', 'hythergraph', 'line', 'matrix-table',
      'pyramid', 'radar', 'scatter', 'stacked', 'ternary', 'treemap',
    ]);
  });

  it('프로토타입 속성 이름을 종류로 착각하지 않는다', () => {
    // REGISTRY 는 객체 리터럴이라 프로토타입을 물고 있다. `in` 으로 판정하면
    // 아래가 전부 통과하고, 곧이어 REGISTRY['constructor'].render 에서 터진다.
    expect(isCsatChartType('constructor')).toBe(false);
    expect(isCsatChartType('__proto__')).toBe(false);
    expect(isCsatChartType('toString')).toBe(false);
    expect(isCsatChartType('hasOwnProperty')).toBe(false);
  });

  it('CHART_TYPES 는 얼어 있다', () => {
    // readonly 는 타입에만 있다. 타입 검사가 없는 CDN 사용자가 제자리에서
    // 뒤집으면 오류 메시지가 조용히 망가진다.
    expect(Object.isFrozen(CHART_TYPES)).toBe(true);
  });

  it('isCsatChartType 이 아는 키만 통과시킨다', () => {
    expect(isCsatChartType('pyramid')).toBe(true);
    expect(isCsatChartType('piramid')).toBe(false);
    expect(isCsatChartType(42)).toBe(false);
    expect(isCsatChartType(undefined)).toBe(false);
  });

  it.each(CHART_TYPES)('%s 를 기본 데이터로 그리면 빈 캔버스가 아니다', (type) => {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    // 새 캔버스는 흰색이 아니라 **투명한 검정**이다. 흰색으로 채우지 않으면
    // 렌더러가 아무것도 안 그려도 «흰색이 아닌 픽셀» 이 480,000 개 세어져
    // 이 검사가 영원히 통과한다.
    clearCanvas(ctx, 800, 600);
    const entry = REGISTRY[type];
    entry.render(ctx, 800, 600, entry.createDefaultData() as never, createDefaultGraphOptions());

    const raw = canvas.getContext('2d').getImageData(0, 0, 800, 600).data;
    let nonWhite = 0;
    for (let i = 0; i < raw.length; i += 4) {
      if (raw[i] !== 255 || raw[i + 1] !== 255 || raw[i + 2] !== 255) nonWhite++;
    }
    expect(nonWhite).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run test/registry.test.ts`
Expected: FAIL — `Failed to resolve import "../src/registry"`

- [ ] **Step 3: `src/types.ts` 를 쓴다**

```ts
// © 2026 김용현
// 종류 → 데이터 타입 지도.
//
// 이 파일이 «어떤 종류에 어떤 데이터가 오는가»의 유일한 출처다. CsatChartType 과
// 판별 유니온이 모두 여기서 도출되므로 둘이 어긋날 수 없고, 레지스트리에 종류를
// 더하거나 빼면 컴파일이 막힌다.
import type {
  AbsBarGraphData,
  CategoryDotGraphData,
  ClimateGraphData,
  CubeGraphData,
  DataTableData,
  DeviationAData,
  DeviationBData,
  GraphOptions,
  HythergraphData,
  LineGraphData,
  MatrixTableData,
  PyramidGraphData,
  RadarGraphData,
  ScatterGraphData,
  StackedGraphData,
  TernaryGraphData,
  TreemapGraphData,
} from './core/index';

export interface ChartDataMap {
  absbar: AbsBarGraphData;
  'category-dot': CategoryDotGraphData;
  climate: ClimateGraphData;
  cube: CubeGraphData;
  'data-table': DataTableData;
  'deviation-a': DeviationAData;
  'deviation-b': DeviationBData;
  hythergraph: HythergraphData;
  line: LineGraphData;
  'matrix-table': MatrixTableData;
  pyramid: PyramidGraphData;
  radar: RadarGraphData;
  scatter: ScatterGraphData;
  stacked: StackedGraphData;
  ternary: TernaryGraphData;
  treemap: TreemapGraphData;
}

/** 그릴 수 있는 그래프 종류. 여러 낱말은 kebab-case, 한 낱말은 그대로. */
export type CsatChartType = keyof ChartDataMap;

/**
 * 부분 지정을 허용하는 옵션.
 *
 * `Partial` 은 맨 위 칸만 선택으로 만든다. 그래서 `fontSize` 는 넷을 다 적어야
 * 했다 — 런타임은 하나만 줘도 받는데 타입이 막는, 거꾸로 된 어긋남이다.
 * 한 겹 더 풀어 준다.
 */
export type PartialGraphOptions = Omit<Partial<GraphOptions>, 'fontSize'> & {
  fontSize?: Partial<GraphOptions['fontSize']>;
};

/** 한 종류의 설정. `type` 을 적으면 `data` 가 그 종류로 좁혀진다. */
export interface ConfigFor<T extends CsatChartType> {
  type: T;
  data: ChartDataMap[T];
  options?: PartialGraphOptions;
}

/** 16종을 모은 판별 유니온. */
export type CsatChartConfig = { [K in CsatChartType]: ConfigFor<K> }[CsatChartType];

/** 한 종류의 부분 갱신. 준 것만 덮는다. */
export interface UpdateFor<T extends CsatChartType> {
  data?: ChartDataMap[T];
  options?: PartialGraphOptions;
}
```

- [ ] **Step 4: `src/registry.ts` 를 쓴다**

```ts
// © 2026 김용현
// 문자열 키 하나로 16종을 고르게 한다. 렌더러와 기본 데이터를 짝지어 두는 곳.
import {
  renderAbsBarGraph,
  renderCategoryDotGraph,
  renderClimateGraph,
  renderCubeGraph,
  renderDataTable,
  renderDeviationAGraph,
  renderDeviationBGraph,
  renderHythergraph,
  renderLineGraph,
  renderMatrixTable,
  renderPyramidGraph,
  renderRadarChart,
  renderScatterGraph,
  renderStackedGraph,
  renderTernaryGraph,
  renderTreemapGraph,
  createDefaultAbsBarData,
  createDefaultCategoryDotData,
  createDefaultClimateData,
  createDefaultCubeData,
  createDefaultDataTableData,
  createDefaultDeviationAData,
  createDefaultDeviationBData,
  createDefaultHythergraphData,
  createDefaultLineData,
  createDefaultMatrixTableData,
  createDefaultPyramidData,
  createDefaultRadarData,
  createDefaultScatterData,
  createDefaultStackedData,
  createDefaultTernaryData,
  createDefaultTreemapData,
  type GraphOptions,
} from './core/index';
import type { ChartDataMap, CsatChartType } from './types';

/**
 * 한 종류의 렌더러와 기본 데이터.
 *
 * **키마다 제네릭을 따로 두는 이유가 있다.** 하나로 뭉뚱그리면(`data: never` 같은)
 * 항목을 엉뚱하게 이어도 컴파일과 테스트가 모두 통과한다 — `radar` 를 산점도
 * 렌더러에 연결해도 그림은 나오고 픽셀도 찍히기 때문이다. 이렇게 두면 잘못
 * 이을 수 있는 480가지 중 478가지가 컴파일 오류가 되고, 항목마다 붙던
 * `as` 캐스팅 16개가 사라진다.
 */
export interface RegistryEntry<T extends CsatChartType> {
  render: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: ChartDataMap[T],
    options: GraphOptions,
  ) => void;
  createDefaultData: () => ChartDataMap[T];
}

export const REGISTRY: { [K in CsatChartType]: RegistryEntry<K> } = {
  absbar: { render: renderAbsBarGraph, createDefaultData: createDefaultAbsBarData },
  'category-dot': { render: renderCategoryDotGraph, createDefaultData: createDefaultCategoryDotData },
  // 컴파일러가 갈라주지 못하는 **유일한** 짝이 climate 와 deviation-a 다.
  // DeviationAData 가 ClimateGraphData 의 구조적 상위집합이기 때문이다
  // (같은 6필드 + baseMonths + 선택 필드). 한쪽 칸만 바꾼 오배선 두 가지가 통과한다:
  //   · climate 의 기본값만 createDefaultDeviationAData 로 바꾼 경우
  //   · deviation-a 의 렌더러만 renderClimateGraph 로 바꾼 경우
  // 렌더러와 기본값을 둘 다 바꿔 끼우면 어느 쪽이든 잡힌다.
  climate: { render: renderClimateGraph, createDefaultData: createDefaultClimateData },
  cube: { render: renderCubeGraph, createDefaultData: createDefaultCubeData },
  'data-table': { render: renderDataTable, createDefaultData: createDefaultDataTableData },
  // 위 climate 주석 참고 — 이 칸의 렌더러만 바꾼 오배선은 컴파일러가 잡지 못한다.
  'deviation-a': { render: renderDeviationAGraph, createDefaultData: createDefaultDeviationAData },
  'deviation-b': { render: renderDeviationBGraph, createDefaultData: createDefaultDeviationBData },
  hythergraph: { render: renderHythergraph, createDefaultData: createDefaultHythergraphData },
  line: { render: renderLineGraph, createDefaultData: createDefaultLineData },
  'matrix-table': { render: renderMatrixTable, createDefaultData: createDefaultMatrixTableData },
  pyramid: { render: renderPyramidGraph, createDefaultData: createDefaultPyramidData },
  radar: { render: renderRadarChart, createDefaultData: createDefaultRadarData },
  scatter: { render: renderScatterGraph, createDefaultData: createDefaultScatterData },
  stacked: { render: renderStackedGraph, createDefaultData: createDefaultStackedData },
  ternary: { render: renderTernaryGraph, createDefaultData: createDefaultTernaryData },
  treemap: { render: renderTreemapGraph, createDefaultData: createDefaultTreemapData },
};

/**
 * 사전순으로 정렬된 전체 종류 목록. 오류 메시지와 데모가 이 순서를 쓴다.
 *
 * `Object.freeze` 를 쓰는 까닭: `readonly` 는 타입에만 있고 런타임에는 없다.
 * 이 패키지는 타입 검사를 받지 않는 CDN 사용자를 겨냥하므로, 얼려 두지 않으면
 * `CsatChart.CHART_TYPES.reverse()` 한 번에 오류 메시지가 조용히 망가진다.
 *
 * 인자 없는 `sort()` 는 로캘을 보지 않고 UTF-16 코드 단위로 비교한다(명세).
 * 리눅스 CI 의 small-icu 빌드에서도 같은 순서가 나온다.
 *
 * 아래 세 PURE 주석을 지우지 말 것. `Object.freeze`·`.sort()`·`Object.keys`
 * 모두 이 모듈 맨 위에서 실행되는 함수 호출이다 — 번들러는 함수 호출에
 * 부작용이 있을 수 있다고 보수적으로 가정하므로, 표시가 없으면 `CHART_TYPES`
 * 를 아무도 안 써도 이 문장을 지우지 못하고, 그 문장이 붙들고 있는
 * `REGISTRY`(=16종 렌더러 전부)까지 함께 남는다. **셋 중 하나라도 빠지면**
 * 나머지 호출이 여전히 `REGISTRY` 를 읽으므로 소용이 없다 — 실제로 겪은
 * 문제다(`Object.freeze` 하나만 표시했을 때는 번들이 전혀 줄지 않았다).
 * 표시를 지우면 저수준 렌더러 하나만 가져와도 번들이 줄지 않는 문제가
 * 조용히 되돌아온다.
 */
export const CHART_TYPES: readonly CsatChartType[] = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ (/* @__PURE__ */ Object.keys(REGISTRY) as CsatChartType[]).sort(),
);

/**
 * 아는 키인지 본다.
 *
 * **`v in REGISTRY` 로 바꾸지 말 것.** REGISTRY 는 객체 리터럴이라 프로토타입을
 * 물고 있어서 `'constructor'`·`'__proto__'`·`'toString'` 이 전부 통과하고,
 * 곧이어 `REGISTRY['constructor'].render` 에서 터진다.
 */
export function isCsatChartType(v: unknown): v is CsatChartType {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(REGISTRY, v);
}
```

- [ ] **Step 5: 통과를 확인한다**

Run: `npx vitest run test/registry.test.ts`
Expected: PASS — 21건 (16 + 5)

Run: `npx tsc --noEmit`
Expected: 오류 없음. 매핑 타입이라 `ChartDataMap` 의 종류를 빠뜨리면 `TS2741` 로
막히고, 렌더러를 엉뚱한 키에 이으면 `TS2322` 로 막힌다. 둘 다 직접 확인할 것.

- [ ] **Step 6: 커밋**

```bash
git add src/types.ts src/registry.ts test/registry.test.ts
git commit -m "feat: 종류 지도와 레지스트리 — 판별 유니온의 출처를 한곳에 둔다"
```

---

### Task 5: 데이터 검증

**Files:**
- Create: `src/validate.ts`
- Test: `test/validate.test.ts`

기대 모양을 손으로 적지 않는다. **`createDefault*Data()`가 곧 정답 모양이다** —
그 객체에 있는 키는 필수, 없는 키는 선택. 그래서 `core/`가 바뀌면 검증도 따라간다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`test/validate.test.ts`:

```ts
// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { CsatChartError, assertChartType, assertChartData } from '../src/validate';
import { CHART_TYPES, REGISTRY } from '../src/registry';

describe('assertChartType', () => {
  it('아는 키는 통과시킨다', () => {
    expect(() => assertChartType('pyramid')).not.toThrow();
  });

  it('가까운 오타에는 후보를 제안한다', () => {
    expect(() => assertChartType('piramid')).toThrow(/혹시 "pyramid"\?/);
  });

  it('전혀 다른 값에는 전체 목록을 보여준다', () => {
    expect(() => assertChartType('zzzzzzzz')).toThrow(/쓸 수 있는 값: absbar, category-dot/);
  });

  it('문자열이 아니면 거부한다', () => {
    expect(() => assertChartType(7)).toThrow(CsatChartError);
  });
});

describe('assertChartData', () => {
  it.each(CHART_TYPES)('%s 의 기본 데이터는 통과한다', (type) => {
    expect(() => assertChartData(type, REGISTRY[type].createDefaultData())).not.toThrow();
  });

  it('객체가 아니면 거부한다', () => {
    expect(() => assertChartData('ternary', [])).toThrow(/data 는 객체여야 합니다 \(지금 배열\)/);
    expect(() => assertChartData('ternary', null)).toThrow(/지금 null/);
  });

  it('필수 키가 빠지면 그 이름을 말한다', () => {
    const data = { ...REGISTRY.pyramid.createDefaultData() } as Record<string, unknown>;
    delete data.ages;
    expect(() => assertChartData('pyramid', data)).toThrow(
      /type "pyramid" 의 data 에 ages 항목이 없습니다/,
    );
  });

  it('키의 종류가 다르면 무엇이어야 하는지 말한다', () => {
    const data = { ...REGISTRY.ternary.createDefaultData(), points: 3 };
    expect(() => assertChartData('ternary', data)).toThrow(
      /data\.points: 배열이어야 합니다 \(지금 숫자\)/,
    );
  });

  it('받침에 따라 «이어야»와 «여야»를 가른다', () => {
    // 조사를 하나로 고정하면 «배열여야»·«문자열여야» 같은 문장이 나온다.
    const t = REGISTRY.ternary.createDefaultData() as { axisLabels: string[] };
    expect(() => assertChartData('ternary', { ...t, axisLabels: 3 })).toThrow(
      /배열이어야 합니다/,
    );
    const c = REGISTRY.climate.createDefaultData() as { tempLabel: string };
    expect(() => assertChartData('climate', { ...c, tempLabel: [] })).toThrow(
      /문자열이어야 합니다/,
    );
    expect(() => assertChartData('ternary', 3)).toThrow(/객체여야 합니다/);
  });

  it('길이가 고정된 배열은 길이도 본다', () => {
    const data = REGISTRY.climate.createDefaultData() as { months: unknown[] };
    expect(() =>
      assertChartData('climate', { ...data, months: data.months.slice(0, 11) }),
    ).toThrow(/data\.months: 12개여야 합니다 \(지금 11개\)/);

    const t = REGISTRY.ternary.createDefaultData() as { axisLabels: string[] };
    expect(() => assertChartData('ternary', { ...t, axisLabels: ['A', 'B'] })).toThrow(
      /data\.axisLabels: 3개여야 합니다 \(지금 2개\)/,
    );
  });

  it('배열 원소의 종류가 다르면 몇 번째인지 말한다', () => {
    // 열두 달 자료를 «숫자 12개» 로 납작하게 붙여넣는 실수. 배열도 맞고 길이도
    // 12라 겉모양만 보면 통과하는데, 그대로 그리면 브라우저에서는 빈 그림이 되고
    // Node 캔버스에서는 네이티브 프로세스가 죽는다.
    const c = REGISTRY.climate.createDefaultData() as { months: unknown[] };
    expect(() =>
      assertChartData('climate', { ...c, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }),
    ).toThrow(/data\.months\[0\]: 객체여야 합니다 \(지금 숫자\)/);
  });

  it('선택 필드를 더 준 것은 통과한다', () => {
    const data = { ...REGISTRY.pyramid.createDefaultData(), numericAgeAxis: true };
    expect(() => assertChartData('pyramid', data)).not.toThrow();
  });

  it('메시지가 모두 csat-chart 로 시작한다', () => {
    expect(() => assertChartData('ternary', null)).toThrow(/^csat-chart: /);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run test/validate.test.ts`
Expected: FAIL — `Failed to resolve import "../src/validate"`

- [ ] **Step 3: `src/validate.ts` 를 쓴다**

```ts
// © 2026 김용현
// 타입이 없는 자바스크립트 사용자를 위한 얕은 모양 검사.
// 값의 타당성은 보지 않는다 — 모양만 본다.
import { CHART_TYPES, REGISTRY, isCsatChartType } from './registry';
import type { CsatChartType } from './types';

export class CsatChartError extends Error {
  constructor(message: string) {
    super(`csat-chart: ${message}`);
    this.name = 'CsatChartError';
  }
}

/**
 * 길이가 고정된 배열 필드. 기본 데이터에서 «몇 개여야 하는가»를 도출할 수 없어
 * (산점도의 점 개수처럼 자유로운 배열과 구별되지 않는다) 확인된 것만 여기 적는다.
 *
 * `scatter.quadrantLabels` 는 타입에 `[string, string, string, string]` 튜플로
 * 박혀 있어 ternary.axisLabels 와 같은 근거로 추가했다 — 렌더러가 아직 이
 * 필드를 읽지 않지만(포팅 원본을 그대로 둔 필드), 타입 계약은 4개를 요구한다.
 */
const FIXED_LENGTHS: Partial<Record<CsatChartType, Record<string, number>>> = {
  climate: { months: 12 },
  'deviation-a': { baseMonths: 12, months: 12 },
  ternary: { axisLabels: 3 },
  // ⚠️ quadrantLabels 는 지금 어느 렌더러도 읽지 않는다 — 이식해 온 죽은 필드다.
  // 그래도 검사한다. 타입이 4-튜플이라 TypeScript 사용자는 이미 4개를 강요받고,
  // 기본 데이터에 있으니 필수 키 검사도 이미 걸린다. 여기서만 빼면
  // «기본 데이터가 곧 정답 모양» 이라는 규칙에 예외가 하나 생길 뿐이다.
  scatter: { quadrantLabels: 4 },
};

const KIND_NAMES: Record<string, string> = {
  object: '객체',
  number: '숫자',
  string: '문자열',
  boolean: '불리언',
  undefined: 'undefined',
  function: '함수',
};

function kindOf(v: unknown): string {
  if (Array.isArray(v)) return '배열';
  if (v === null) return 'null';
  return KIND_NAMES[typeof v] ?? typeof v;
}

/**
 * «…이어야 합니다» / «…여야 합니다» 를 받침에 따라 고른다.
 *
 * 하나로 고정하면 «배열여야»·«문자열여야» 같은 문장이 나온다. 한글 음절은
 * (코드 − 0xAC00) % 28 로 받침 유무를 알 수 있고, 한글이 아니면(`null` 처럼)
 * 받침이 있는 것으로 친다 — 개발 문서에서 흔히 쓰는 «null이어야» 쪽이다.
 */
function shouldBe(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasFinal = isHangul ? (last - 0xac00) % 28 !== 0 : true;
  return `${word}${hasFinal ? '이어야' : '여야'} 합니다`;
}

/** 두 문자열의 편집 거리 (Levenshtein) */
function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

function nearestType(input: string): CsatChartType | null {
  let best: CsatChartType | null = null;
  let bestD = Infinity;
  for (const t of CHART_TYPES) {
    const d = distance(input.toLowerCase(), t);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return bestD <= 3 ? best : null;
}

export function assertChartType(type: unknown): asserts type is CsatChartType {
  if (isCsatChartType(type)) return;
  const near = typeof type === 'string' ? nearestType(type) : null;
  throw new CsatChartError(
    `알 수 없는 type ${JSON.stringify(type)}` +
      (near ? ` — 혹시 "${near}"?` : ` — 쓸 수 있는 값: ${CHART_TYPES.join(', ')}`),
  );
}

export function assertChartData(type: CsatChartType, data: unknown): void {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new CsatChartError(
      `type "${type}" 의 data 는 ${shouldBe('객체')} (지금 ${kindOf(data)})`,
    );
  }

  const given = data as Record<string, unknown>;
  // 매핑 타입이라 반환값이 16종의 유니온이다. Record 로 바로 못 좁히므로
  // unknown 을 거친다. 키와 종류만 훑을 것이므로 안전하다.
  const shape = REGISTRY[type].createDefaultData() as unknown as Record<string, unknown>;
  const lengths = FIXED_LENGTHS[type] ?? {};

  for (const key of Object.keys(shape)) {
    if (!(key in given)) {
      // 키 이름 뒤에 «이/가» 를 붙이면 영문 식별자마다 조사가 어긋난다.
      // «항목이» 를 세우면 어떤 키가 와도 문장이 성립한다.
      throw new CsatChartError(`type "${type}" 의 data 에 ${key} 항목이 없습니다`);
    }

    const want = kindOf(shape[key]);
    const got = kindOf(given[key]);
    if (want !== got) {
      // 키 이름 뒤는 «는/은» 대신 콜론을 쓴다 — 영문 식별자에 조사를 붙이지 않는다.
      throw new CsatChartError(
        `type "${type}" 의 data.${key}: ${shouldBe(want)} (지금 ${got})`,
      );
    }

    const n = lengths[key];
    if (n !== undefined) {
      const len = (given[key] as unknown[]).length;
      if (len !== n) {
        throw new CsatChartError(
          `type "${type}" 의 data.${key}: ${n}개여야 합니다 (지금 ${len}개)`,
        );
      }
    }

    // 배열이면 원소의 종류까지 한 겹 더 본다.
    //
    // 여기까지만 검사하면 열두 달 자료를 «숫자 12개» 로 납작하게 붙여넣은 실수가
    // 그대로 통과한다 — 배열도 맞고 길이도 12이기 때문이다. 그런데 그 상태로
    // 그리면 브라우저에서는 좌표가 NaN 이 되어 **조용히 빈 그림**이 나오고
    // (Canvas2D 명세상 비유한 좌표는 무시된다), Node 캔버스에서는 네이티브
    // 프로세스가 통째로 죽는다. 이 검증 계층이 막으려던 바로 그 실패다.
    //
    // 기본 데이터의 첫 원소를 본보기로 삼는다. 한 겹만 본다 — 원소의 속속까지
    // 파고들지 않는 것이 이 파일의 «얕은 검사» 규칙이다.
    const sample = shape[key];
    if (want === '배열' && Array.isArray(sample) && sample.length > 0) {
      const sampleKind = kindOf(sample[0]);
      const arr = given[key] as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const elemKind = kindOf(arr[i]);
        if (elemKind !== sampleKind) {
          throw new CsatChartError(
            `type "${type}" 의 data.${key}[${i}]: ${shouldBe(sampleKind)} (지금 ${elemKind})`,
          );
        }
      }
    }
  }
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run test/validate.test.ts`
Expected: PASS — 28건 (assertChartType 4 + 종류별 16 + assertChartData 8)

- [ ] **Step 5: 커밋**

```bash
git add src/validate.ts test/validate.test.ts
git commit -m "feat: 데이터 검증 — 기본값에서 기대 모양을 도출하고 한국어로 알린다"
```

---

### Task 6: 글꼴 헬퍼

**Files:**
- Create: `src/fonts.ts`
- Test: `test/fonts.test.ts`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`test/fonts.test.ts`:

```ts
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

  it('head 가 아직 없어도 던지지 않는다', () => {
    // 문서 파싱 도중에 부르면 head 가 없을 수 있다.
    vi.stubGlobal('document', {
      getElementById: () => null,
      createElement: () => ({ id: '', rel: '', href: '' }) as FakeLink,
      fonts: { load: () => Promise.resolve([]) },
    });
    return expect(ensureFonts()).resolves.toBe(false);
  });

  it('createElement 가 막혀 있어도 던지지 않는다', () => {
    // 엄격한 CSP·샌드박스에서 일어난다.
    vi.stubGlobal('document', {
      getElementById: () => null,
      createElement: () => {
        throw new Error('막힘');
      },
      head: { appendChild: () => {} },
      fonts: { load: () => Promise.resolve([]) },
    });
    return expect(ensureFonts()).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run test/fonts.test.ts`
Expected: FAIL — `Failed to resolve import "../src/fonts"`

- [ ] **Step 3: `src/fonts.ts` 를 쓴다**

```ts
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
```

굵기를 순서대로(`for … await`) 부르는 이유는 테스트가 호출 순서를 확인하기
때문만이 아니라, 실패한 글꼴 하나가 나머지를 가리지 않게 하기 위해서다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run test/fonts.test.ts`
Expected: PASS — 10건

- [ ] **Step 5: 커밋**

```bash
git add src/fonts.ts test/fonts.test.ts
git commit -m "feat: ensureFonts() — 시험지 글꼴을 선택적으로 불러온다"
```

---

### Task 7: 파사드 `CsatChart`

**Files:**
- Create: `src/chart.ts`
- Test: `test/chart.test.ts`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`test/chart.test.ts`:

```ts
// © 2026 김용현
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { CsatChart, type CanvasLike } from '../src/chart';
import { CsatChartError } from '../src/validate';
import type { CsatChartConfig } from '../src/types';
import { createDefaultTernaryData, createDefaultPyramidData } from '../src/core/index';

function canvas(w = 800, h = 600) {
  return createCanvas(w, h) as unknown as CanvasLike;
}

/**
 * width/height 가 0(또는 아예 없는) 캔버스를 흉내낸다.
 *
 * `@napi-rs/canvas` 는 `width`/`height` 를 0 으로 두는 것을 허락하지 않는다 —
 * `createCanvas(0, 0)` 이든 생성 뒤 `c.width = 0` 이든, 네이티브 세터가 즉시
 * HTML 캔버스 규격의 기본값(350×150)으로 되튄다. 그래서 실제 caniOS 캔버스로는
 * "크기 없는 캔버스" 상황 자체를 만들 수 없다. `CanvasLike` 는 덕타이핑
 * 인터페이스일 뿐이므로, 평범한 객체 리터럴로 `width`/`height` 를 흉내내고
 * `getContext`/`toDataURL` 만 진짜 캔버스에 위임한다 — 그리기는 여전히 실제
 * Canvas 2D 구현을 거친다(좌표가 실제 저장소 크기를 넘어가면 그냥 잘릴 뿐,
 * 던지지 않는다).
 */
function zeroSizeCanvas(): CanvasLike {
  const real = createCanvas(1, 1);
  return {
    width: 0,
    height: 0,
    getContext: (id: '2d') => real.getContext(id),
    toDataURL: (type?: string) => real.toDataURL(type as never),
  };
}

/**
 * 흰색이 아닌(=그려진) 픽셀 수를 센다.
 *
 * 갓 만든 캔버스는 «투명한 검정» 이다(r=g=b=0, a=0). 알파를 보지 않으면 그
 * 투명한 픽셀도 «흰색이 아니다» 로 잡혀, 렌더러가 통째로 사라져도(예: draw() 를
 * 빈 함수로 바꿔치기) 이 검사를 통과한다. 렌더러는 항상 clearCanvas 로 불투명한
 * 흰 바탕을 먼저 칠하므로, 알파가 255 인 픽셀만 세면 «실제로 그렸는가» 를 묻게 된다.
 */
function nonWhitePixels(c: CanvasLike): number {
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  const raw = ctx.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < raw.length; i += 4) {
    if (raw[i + 3] !== 255) continue; // 투명 = 아무것도 그리지 않은 것
    if (raw[i] !== 255 || raw[i + 1] !== 255 || raw[i + 2] !== 255) n++;
  }
  return n;
}

/** data URL(PNG) 의 실제 픽셀 크기를 IHDR 청크에서 읽는다. 새 의존성 없이. */
function pngDimensions(dataUrl: string): { width: number; height: number } {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const buf = Buffer.from(base64, 'base64');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

afterEach(() => vi.unstubAllGlobals());

describe('CsatChart', () => {
  it('만들자마자 그린다', () => {
    const c = canvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it('크기가 없는 캔버스에는 800×600 을 넣는다', () => {
    // 실제 @napi-rs/canvas 는 width/height 를 0 으로 두지 못한다(위 zeroSizeCanvas
    // 참고) — 그래서 덕타이핑 CanvasLike 를 직접 만들어 «크기 없음» 을 흉내낸다.
    const c = zeroSizeCanvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(800);
    expect(c.height).toBe(600);
  });

  /**
   * 속성 없는 브라우저 `<canvas>` 를 흉내낸다 — 크기는 300×150(HTML 기본값)이고
   * `getAttribute('width'/'height')` 가 `null` 이다. 이 조합이 «크기를 정하지
   * 않았다» 는 신호다 — 300 은 0 이 아니라서 falsy 검사로는 잡히지 않는다.
   */
  function attrlessCanvas(
    w = 300,
    h = 150,
    attrs: Record<string, string | null> = {},
  ): CanvasLike {
    const real = createCanvas(Math.max(1, w), Math.max(1, h));
    return {
      width: w,
      height: h,
      getAttribute: (name: string) => attrs[name] ?? null,
      getContext: (id: '2d') => real.getContext(id),
    } as CanvasLike;
  }

  it('width/height 를 적지 않은 <canvas> 는 800×600 으로 본다', () => {
    // 300×150 은 «작성자가 고른 크기» 가 아니라 HTML 이 넣어 준 기본값이다.
    const c = attrlessCanvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(800);
    expect(c.height).toBe(600);
  });

  it('300×150 을 직접 적었으면 그대로 둔다', () => {
    const c = attrlessCanvas(300, 150, { width: '300', height: '150' });
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(300);
    expect(c.height).toBe(150);
  });

  it('스크립트로 정한 크기는 그대로 둔다', () => {
    const c = attrlessCanvas(1200, 900);
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(1200);
    expect(c.height).toBe(900);
  });

  it('알 수 없는 type 을 거부한다', () => {
    // type 을 never 로 캐스팅하면 T 도 never 로 추론되어 data 까지 never 가 된다.
    // 둘 다 캐스팅해야 컴파일된다 — 여기서 보려는 건 런타임 검증이다.
    expect(
      () => new CsatChart(canvas(), { type: 'piramid' as never, data: {} as never }),
    ).toThrow(/혹시 "pyramid"\?/);
  });

  it('어긋난 data 를 거부한다', () => {
    expect(
      // 런타임 검증을 보는 테스트다. 컴파일 시점 검사는 아래 «타입» 항목에서 본다.
      () => new CsatChart(canvas(), { type: 'ternary', data: { points: [] } as never }),
    ).toThrow(CsatChartError);
  });

  it('update(data) 가 다시 그린다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    const before = nonWhitePixels(c);
    chart.update({
      data: {
        ...createDefaultTernaryData(),
        points: [
          { a: 80, b: 10, c: 10, label: '(가)' },
          { a: 10, b: 80, c: 10, label: '(나)' },
        ],
      },
    });
    expect(nonWhitePixels(c)).not.toBe(before);
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it('update(options) 로 제목만 바꿀 수 있다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    const before = nonWhitePixels(c);
    chart.update({ options: { title: '토지 이용 구성' } });
    expect(nonWhitePixels(c)).toBeGreaterThan(before);
  });

  it('update 의 어긋난 data 는 거부하고 이전 상태를 지킨다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'pyramid', data: createDefaultPyramidData() });
    const before = nonWhitePixels(c);
    expect(() => chart.update({ data: { unit: 'percent' } as never })).toThrow(CsatChartError);
    expect(nonWhitePixels(c)).toBe(before);
  });

  it('resize 가 캔버스 크기를 바꾸고 다시 그린다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    chart.resize(400, 300);
    expect(c.width).toBe(400);
    expect(c.height).toBe(300);
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it('resize 는 0 이하를 거부한다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    expect(() => chart.resize(0, 300)).toThrow(/크기는 0보다 커야 합니다/);
  });

  it('toDataURL 이 PNG 를 돌려준다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    expect(chart.toDataURL().startsWith('data:image/png;base64,')).toBe(true);
  });

  it('scale 이 2 면 PNG 픽셀 크기도 정확히 두 배다', () => {
    const chart = new CsatChart(canvas(800, 600), {
      type: 'ternary',
      data: createDefaultTernaryData(),
    });
    const { width, height } = pngDimensions(chart.toDataURL({ scale: 2 }));
    expect(width).toBe(1600);
    expect(height).toBe(1200);
  });

  it('scale 로 내보낸 뒤 화면 캔버스는 원래 크기로 돌아오고 다시 그려진다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    chart.toDataURL({ scale: 2 });
    expect(c.width).toBe(800);
    expect(c.height).toBe(600);
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it.each([0, -1, NaN, Infinity])('scale %s 는 거부한다', (scale) => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    expect(() => chart.toDataURL({ scale })).toThrow(CsatChartError);
  });

  it('scale 1 은 인자 없을 때와 같다', () => {
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    // 먼저 «뭔가 그려졌다» 를 못박는다 — 안 그러면 draw() 가 아무 일도 하지 않는
    // 뮤턴트에서도 두 빈 PNG 가 «같다» 며 이 테스트가 그냥 통과해 버린다.
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
    expect(chart.toDataURL({ scale: 1 })).toBe(chart.toDataURL());
  });

  it('destroy 뒤에는 쓰지 못한다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    chart.destroy();
    const destroyedMsg = /이미 destroy\(\) 된 차트입니다/;
    expect(() => chart.resize(400, 300)).toThrow(destroyedMsg);
    expect(() => chart.update({})).toThrow(destroyedMsg);
    expect(() => chart.toDataURL()).toThrow(destroyedMsg);
    expect(() => chart.download()).toThrow(destroyedMsg);
    expect(() => chart.destroy()).not.toThrow();
  });

  it('Node 에서 download() 는 안내하며 거부한다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    expect(() => chart.download()).toThrow(/브라우저에서만 씁니다/);
  });

  it('Node 에서 id 문자열은 안내하며 거부한다', () => {
    expect(
      () => new CsatChart('c', { type: 'ternary', data: createDefaultTernaryData() }),
    ).toThrow(/id 문자열은 브라우저에서만 씁니다/);
  });

  it('id 로 찾은 요소가 없으면 그 id 를 말한다', () => {
    vi.stubGlobal('document', { getElementById: () => null });
    expect(
      () => new CsatChart('none', { type: 'ternary', data: createDefaultTernaryData() }),
    ).toThrow(/id "none" 인 요소를 찾지 못했습니다/);
  });

  it('id 로 찾은 요소가 캔버스가 아니면 그렇게 말한다', () => {
    // <div id="c"> 에 그리려는 흔한 실수.
    vi.stubGlobal('document', { getElementById: () => ({ tagName: 'DIV' }) });
    expect(
      () => new CsatChart('c', { type: 'ternary', data: createDefaultTernaryData() }),
    ).toThrow(/id "c" 인 요소는 <canvas> 가 아닙니다/);
  });

  it('XHTML 문서의 소문자 tagName 도 <canvas> 로 인정한다', () => {
    const real = createCanvas(800, 600);
    vi.stubGlobal('document', {
      getElementById: () => ({ tagName: 'canvas', getContext: (id: '2d') => real.getContext(id) }),
    });
    expect(
      () => new CsatChart('c', { type: 'ternary', data: createDefaultTernaryData() }),
    ).not.toThrow();
  });

  it('첫 인자가 null 이면 그렇게 말한다', () => {
    // document.getElementById 가 못 찾은 값을 그대로 넘기는 실수를 잡는다.
    expect(
      () => new CsatChart(null as never, { type: 'ternary', data: createDefaultTernaryData() }),
    ).toThrow(/첫 인자는 <canvas> 요소이거나 id 문자열이어야 합니다/);
  });

  it('첫 인자가 캔버스가 아닌 객체면 그렇게 말한다', () => {
    // <div> 를 그대로 넘기는 흔한 실수 — getElementById 가 아니라 querySelector 로
    // <div> 를 골랐을 때도 벌어진다.
    expect(
      () =>
        new CsatChart({ tagName: 'DIV' } as never, {
          type: 'ternary',
          data: createDefaultTernaryData(),
        }),
    ).toThrow(/getContext 가 없습니다/);
  });

  it('ensureFonts 를 정적 메서드로 노출한다', () => {
    expect(typeof CsatChart.ensureFonts).toBe('function');
  });

  it('fontSize 를 하나만 줘도 나머지는 기본값을 쓴다', () => {
    // 얕게 덮으면 axisLabel/tick/dataLabel 이 undefined 가 되어 Node 에서는
    // ctx.font 대입이 "is not valid font style" 로 던진다.
    // `fontSize: { title: 44 }` 는 캐스팅 없이 그대로 컴파일된다 — PartialGraphOptions
    // 가 fontSize 안쪽까지 한 겹 더 풀어 주기 때문이다(아래 «타입» 항목 참고).
    const c1 = canvas();
    expect(
      () =>
        new CsatChart(c1, {
          type: 'ternary',
          data: createDefaultTernaryData(),
          options: { fontSize: { title: 44 } },
        }),
    ).not.toThrow();

    // 나머지 셋을 기본값 그대로 명시한 것과 픽셀이 같아야 «정말 기본값을 썼다» 가 된다.
    const c2 = canvas();
    new CsatChart(c2, {
      type: 'ternary',
      data: createDefaultTernaryData(),
      options: { fontSize: { title: 44, axisLabel: 28, tick: 26, dataLabel: 22 } },
    });

    // 먼저 «뭔가 그려졌다» 를 못박는다 — 안 그러면 draw() 가 아무 일도 하지 않는
    // 뮤턴트에서도 두 빈 캔버스가 «같다» 며 이 테스트가 그냥 통과해 버린다.
    expect(nonWhitePixels(c1)).toBeGreaterThan(50);
    expect(nonWhitePixels(c1)).toBe(nonWhitePixels(c2));
  });

  it('footnotes 로 넘긴 배열을 그대로 붙들지 않는다', () => {
    const c = canvas();
    const footnotes = ['각주 1'];
    const chart = new CsatChart(c, {
      type: 'ternary',
      data: createDefaultTernaryData(),
      options: { footnotes },
    });
    const before = nonWhitePixels(c);
    // 먼저 «뭔가 그려졌다» 를 못박는다 — 안 그러면 draw() 가 아무 일도 하지 않는
    // 뮤턴트에서도 두 빈 캔버스가 «같다» 며 이 테스트가 그냥 통과해 버린다.
    expect(before).toBeGreaterThan(50);

    // 호출자가 생성 뒤에 자기 배열을 건드린다.
    footnotes.push('각주 2');
    // 크기를 그대로 둔 채 다시 그리기만 시킨다 — footnotes 를 참조로 붙들고
    // 있었다면 각주가 하나 더 그려져 픽셀 수가 달라진다.
    chart.resize(800, 600);

    expect(nonWhitePixels(c)).toBe(before);
  });

  it('글꼴이 늦게 도착하면 한 번 다시 그린다', async () => {
    let settle!: () => void;
    const ready = new Promise<void>((r) => {
      settle = r;
    });
    vi.stubGlobal('document', { fonts: { ready } });

    const c = canvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });

    // 그려 놓은 것을 지운다 — 다시 그리는지 보려는 것이다.
    const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    expect(nonWhitePixels(c)).toBe(0);

    settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it('destroy 된 뒤에 글꼴이 도착하면 다시 그리지 않는다', async () => {
    let settle!: () => void;
    const ready = new Promise<void>((r) => {
      settle = r;
    });
    vi.stubGlobal('document', { fonts: { ready } });

    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    chart.destroy();
    expect(nonWhitePixels(c)).toBe(0);

    settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(nonWhitePixels(c)).toBe(0);
  });
});

describe('타입', () => {
  // 아래 @ts-expect-error 들은 `npm run typecheck` 가 검사한다.
  // 오류가 «나지 않으면» 그 자체로 실패한다 — 판별 유니온이 죽었다는 뜻이다.

  it('type 에 맞지 않는 data 는 컴파일 시점에 걸린다', () => {
    // @ts-expect-error ternary 에 pyramid 데이터를 줄 수 없다
    const bad: CsatChartConfig = { type: 'ternary', data: createDefaultPyramidData() };
    expect(bad.type).toBe('ternary');
  });

  it('fontSize 는 부분 지정이 컴파일된다 — 정확히 한 겹만 풀렸다', () => {
    // PartialGraphOptions 가 fontSize 안쪽까지 선택으로 풀어 주므로 title 하나만
    // 줘도 컴파일된다. 캐스팅이 없다 — 있으면 이 테스트가 증명하는 게 없어진다.
    const ok: CsatChartConfig = {
      type: 'ternary',
      data: createDefaultTernaryData(),
      options: { fontSize: { title: 44 } },
    };
    expect(ok.options?.fontSize?.title).toBe(44);

    // 풀어준 건 «있는 네 칸을 부분 지정» 까지다. 없는 칸을 적으면 여전히 막혀야
    // 한다 — 안 그러면 오타를 조용히 삼키는 객체가 된다.
    const bad: CsatChartConfig = {
      type: 'ternary',
      data: createDefaultTernaryData(),
      // @ts-expect-error fontSize 에 없는 칸이다(오타 등) — 여전히 막혀야 한다
      options: { fontSize: { titel: 44 } },
    };
    expect(bad.type).toBe('ternary');
  });

  it('update 의 data 도 생성 때의 종류로 좁혀진다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    // @ts-expect-error 삼각 그래프에 피라미드 데이터를 줄 수 없다
    expect(() => chart.update({ data: createDefaultPyramidData() })).toThrow(CsatChartError);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run test/chart.test.ts`
Expected: FAIL — `Failed to resolve import "../src/chart"`

- [ ] **Step 3: `src/chart.ts` 를 쓴다**

```ts
// © 2026 김용현
// 캔버스 획득·다시 그리기·PNG 추출의 수명주기를 관리하는 파사드.
import { REGISTRY } from './registry';
import { CsatChartError, assertChartData, assertChartType } from './validate';
import { ensureFonts, type EnsureFontsOptions } from './fonts';
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
 * `data`·`fontSize`·`footnotes` 를 안전하게 덮는다.
 *
 * `{ ...base, ...patch }` 로 얕게만 덮으면 두 가지가 새어 나간다.
 *   · `fontSize` 를 하나만 준 순간(CDN 사용자가 흔히 그런다: `{ title: 44 }`)
 *     나머지 세 값이 `undefined` 가 되어, Node 에서는 `ctx.font` 대입이
 *     던지고 브라우저에서는 명세상 조용히 무시된다 — 어느 쪽이든 사고다.
 *   · `footnotes` 는 배열이다. 호출자가 쥔 배열을 그대로 붙들면, 나중에 그
 *     배열에 `push` 한 것이 다음 그리기에 몰래 새어 들어온다.
 */
function mergeOptions(base: GraphOptions, patch?: PartialGraphOptions): GraphOptions {
  return {
    ...base,
    ...patch,
    fontSize: { ...base.fontSize, ...patch?.fontSize },
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

    assertChartType(config.type);
    assertChartData(config.type, config.data);

    this.type = config.type;
    this.data = config.data;
    this.options = mergeOptions(createDefaultGraphOptions(), config.options);

    if (isUnsized(this.canvas, 'width', HTML_DEFAULT_WIDTH)) this.canvas.width = DEFAULT_WIDTH;
    if (isUnsized(this.canvas, 'height', HTML_DEFAULT_HEIGHT)) this.canvas.height = DEFAULT_HEIGHT;

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
```

`instanceof HTMLCanvasElement` 대신 `tagName` 을 보는 이유: `HTMLCanvasElement` 는
Node 에 없어서 참조하는 순간 터진다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run test/chart.test.ts`
Expected: PASS — 36건

Run: `npx tsc --noEmit`
Expected: 오류 없음. `@ts-expect-error` 두 줄이 «실제로 오류인» 곳을 가리켜야 한다 —
판별 유니온이 무너지면 `Unused '@ts-expect-error' directive` 로 여기서 잡힌다.

- [ ] **Step 5: 커밋**

```bash
git add src/chart.ts test/chart.test.ts
git commit -m "feat: CsatChart 파사드 — type 하나로 16종을 그리고 PNG로 뽑는다"
```

---

### Task 8: 공개 표면

**Files:**
- Create: `src/index.ts`
- Test: `test/index.test.ts`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`test/index.test.ts`:

```ts
// © 2026 김용현
import { describe, it, expect } from 'vitest';
import * as lib from '../src/index';
import { CHART_TYPES, REGISTRY } from '../src/registry';

const RENDERERS = [
  'renderAbsBarGraph', 'renderCategoryDotGraph', 'renderClimateGraph', 'renderCubeGraph',
  'renderDataTable', 'renderDeviationAGraph', 'renderDeviationBGraph', 'renderHythergraph',
  'renderLineGraph', 'renderMatrixTable', 'renderPyramidGraph', 'renderRadarChart',
  'renderScatterGraph', 'renderStackedGraph', 'renderTernaryGraph', 'renderTreemapGraph',
];

const DEFAULT_FACTORIES = [
  'createDefaultGraphOptions', 'createDefaultAbsBarData', 'createDefaultCategoryDotData',
  'createDefaultClimateData', 'createDefaultCubeData', 'createDefaultDataTableData',
  'createDefaultDeviationAData', 'createDefaultDeviationBData', 'createDefaultHythergraphData',
  'createDefaultLineData', 'createDefaultMatrixTableData', 'createDefaultPyramidData',
  'createDefaultRadarData', 'createDefaultScatterData', 'createDefaultStackedData',
  'createDefaultTernaryData', 'createDefaultTreemapData',
];

/** GeoGrapher UI 의 관심사여서 일부러 내보내지 않는 것들 */
const EXCLUDED = [
  'GRAPH_LABELS', 'MAP_GRAPH_TYPES', 'isMapGraphType', 'createDefaultExportSettings',
];

describe('공개 표면', () => {
  it('파사드와 레지스트리를 내보낸다', () => {
    expect(typeof lib.CsatChart).toBe('function');
    expect(typeof lib.ensureFonts).toBe('function');
    expect(typeof lib.isCsatChartType).toBe('function');
    expect(lib.CHART_TYPES).toEqual(CHART_TYPES);
  });

  it.each(RENDERERS)('저수준 렌더러 %s 를 내보낸다', (name) => {
    expect(typeof (lib as Record<string, unknown>)[name]).toBe('function');
  });

  it.each(DEFAULT_FACTORIES)('기본값 생성기 %s 를 내보낸다', (name) => {
    expect(typeof (lib as Record<string, unknown>)[name]).toBe('function');
  });

  it('REGISTRY 의 모든 렌더러와 기본값 생성기가 공개 표면에 있다', () => {
    // 손으로 적은 목록은 «빠뜨린 것» 을 못 잡는다. 레지스트리에서 끌어와 센다.
    const exported = new Set(Object.values(lib as Record<string, unknown>));
    for (const type of CHART_TYPES) {
      const entry = REGISTRY[type];
      expect(exported.has(entry.render), `${type} 의 렌더러`).toBe(true);
      expect(exported.has(entry.createDefaultData), `${type} 의 기본값 생성기`).toBe(true);
    }
  });

  it('축 계산 유틸을 내보낸다', () => {
    expect(lib.niceStep(100, 5)).toBeGreaterThan(0);
    expect(lib.autoRange([1, 2, 3]).step).toBeGreaterThan(0);
  });

  it('상수를 얼려서 내보낸다', () => {
    expect(lib.AGE_GROUPS).toHaveLength(17);
    expect(lib.DOT_MARKER_ORDER).toHaveLength(4);
    expect(lib.LINE_MARKER_ORDER).toHaveLength(4);
    expect(lib.LINE_STYLE_ORDER).toHaveLength(4);
    expect(lib.MONTH_LABELS_EN).toHaveLength(12);
    expect(lib.MONTH_LABELS_NUM).toHaveLength(12);
    expect(Array.isArray(lib.LINE_DASH.solid)).toBe(true);

    for (const c of [
      lib.AGE_GROUPS, lib.DOT_MARKER_ORDER, lib.LINE_MARKER_ORDER,
      lib.LINE_STYLE_ORDER, lib.MONTH_LABELS_EN, lib.MONTH_LABELS_NUM,
      lib.LINE_DASH, lib.LINE_DASH.solid,
    ]) {
      expect(Object.isFrozen(c)).toBe(true);
    }
  });

  it.each(EXCLUDED)('GeoGrapher 전용 %s 는 내보내지 않는다', (name) => {
    expect(name in lib).toBe(false);
  });

  it('테스트 전용 헬퍼를 내보내지 않는다', () => {
    expect('resetFontsForTest' in lib).toBe(false);
    expect('REGISTRY' in lib).toBe(false);
  });
});

describe('타입 표면', () => {
  // 타입은 런타임에 남지 않으므로 `in lib` 로는 확인할 수 없다.
  // 여기서 실제로 써 보는 것 자체가 «내보내지고 있다» 의 증거이고,
  // `npm run typecheck` 가 그것을 검사한다.
  it('설정 타입을 공개한다', () => {
    const cfg: lib.CsatChartConfig = {
      type: 'ternary',
      data: lib.createDefaultTernaryData(),
    };
    const one: lib.ConfigFor<'climate'> = {
      type: 'climate',
      data: lib.createDefaultClimateData(),
    };
    const patch: lib.UpdateFor<'climate'> = { options: { title: '제목' } };
    const opts: lib.PartialGraphOptions = { fontSize: { title: 44 } };
    const t: lib.CsatChartType = 'pyramid';
    const map: lib.ChartDataMap['radar'] = lib.createDefaultRadarData();

    expect([cfg.type, one.type, t]).toEqual(['ternary', 'climate', 'pyramid']);
    expect(patch.options?.title).toBe('제목');
    expect(opts.fontSize?.title).toBe(44);
    expect(map).toBeTypeOf('object');
  });

  it('데이터 타입과 오류 타입을 공개한다', () => {
    const data: lib.ClimateGraphData = lib.createDefaultClimateData();
    const err: lib.CsatChartError = new lib.CsatChartError('시험');
    expect(data.months).toHaveLength(12);
    expect(err.name).toBe('CsatChartError');
  });

  it('GeoGrapher UI 의 타입은 공개 표면에 없다', () => {
    // 이름을 만들지 않는 꼴로 쓴다. `type _X = …` 로 적으면 쓰이지 않는 이름이
    // 생겨 lint 를 따로 눌러야 한다. 아래는 선언이 아니라서 누를 것이 없다.
    // @ts-expect-error GraphType 은 지도 4종과 'guide' 를 담은 메뉴 목록이다
    void (null as unknown as lib.GraphType);
    // @ts-expect-error ExportSettings 는 GeoGrapher 내보내기 대화상자의 상태다
    void (null as unknown as lib.ExportSettings);
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run test/index.test.ts`
Expected: FAIL — `Failed to resolve import "../src/index"`

- [ ] **Step 3: `src/index.ts` 를 쓴다**

```ts
// © 2026 김용현
// csat-chart.js 공개 표면.
//
// `export *` 를 쓰지 않는다 — core 에는 GeoGrapher UI 의 관심사(지도 4종을 담은
// GraphType, 내보내기 대화상자의 ExportSettings)가 섞여 있어서, 몰아 내보내면
// 이 패키지에 없는 기능이 딸려 나간다. 이름을 하나씩 적는다.

// ── 파사드 ─────────────────────────────────────────────
export { CsatChart } from './chart';
export type { CanvasLike } from './chart';

// ── 종류와 설정 ────────────────────────────────────────
export { CHART_TYPES, isCsatChartType } from './registry';
export type {
  ChartDataMap,
  ConfigFor,
  CsatChartConfig,
  CsatChartType,
  PartialGraphOptions,
  UpdateFor,
} from './types';

// ── 오류 ───────────────────────────────────────────────
export { CsatChartError } from './validate';

// ── 글꼴 ───────────────────────────────────────────────
export { ensureFonts } from './fonts';
export type { EnsureFontsOptions } from './fonts';

// ── 저수준 렌더러 16종 ─────────────────────────────────
export {
  renderAbsBarGraph,
  renderCategoryDotGraph,
  renderClimateGraph,
  renderCubeGraph,
  renderDataTable,
  renderDeviationAGraph,
  renderDeviationBGraph,
  renderHythergraph,
  renderLineGraph,
  renderMatrixTable,
  renderPyramidGraph,
  renderRadarChart,
  renderScatterGraph,
  renderStackedGraph,
  renderTernaryGraph,
  renderTreemapGraph,
} from './core/index';

// ── 축 계산 유틸 ───────────────────────────────────────
export { niceStep, autoRange } from './core/index';

// ── 기본값 생성기 ──────────────────────────────────────
export {
  createDefaultGraphOptions,
  createDefaultAbsBarData,
  createDefaultCategoryDotData,
  createDefaultClimateData,
  createDefaultCubeData,
  createDefaultDataTableData,
  createDefaultDeviationAData,
  createDefaultDeviationBData,
  createDefaultHythergraphData,
  createDefaultLineData,
  createDefaultMatrixTableData,
  createDefaultPyramidData,
  createDefaultRadarData,
  createDefaultScatterData,
  createDefaultStackedData,
  createDefaultTernaryData,
  createDefaultTreemapData,
} from './core/index';

// ── 상수 ───────────────────────────────────────────────
import {
  AGE_GROUPS as coreAgeGroups,
  DOT_MARKER_ORDER as coreDotMarkerOrder,
  LINE_DASH as coreLineDash,
  LINE_MARKER_ORDER as coreLineMarkerOrder,
  LINE_STYLE_ORDER as coreLineStyleOrder,
  MONTH_LABELS_EN as coreMonthLabelsEn,
  MONTH_LABELS_NUM as coreMonthLabelsNum,
} from './core/index';

/**
 * 상수는 얼려서 내보낸다.
 *
 * 여기서 내보내는 것은 렌더러가 기본값으로 읽는 **바로 그 객체**다. 얼리지 않으면
 * `CsatChart.DOT_MARKER_ORDER.reverse()` 한 번에 이후 모든 그림의 기호 배정이
 * 조용히 어긋난다. 타입 검사를 받지 않는 CDN 사용자를 겨냥한 패키지라 특히 그렇다.
 * `CHART_TYPES` 를 얼린 것과 같은 이유다.
 *
 * 각 `Object.freeze` 앞의 PURE 주석을 지우지 말 것. 함수 호출은 번들러가
 * 부작용이 있을 수 있다고 보수적으로 가정하는 대상이라, 표시가 없으면 이
 * 상수들을 아무도 안 써도 문장 자체가 안 지워진다 — 여기서는 값이 각각
 * `core` 배열 하나씩만 가리키므로 결과가 이 파일 안에서 끝나 심각하지 않지만,
 * `registry.ts` 의 `CHART_TYPES` 는 같은 문제가 16종 렌더러 전체를 붙드는
 * 문제로 번진다. 그 사례를 따라 여기도 표시해 둔다.
 */
export const AGE_GROUPS = /* @__PURE__ */ Object.freeze(coreAgeGroups);
export const DOT_MARKER_ORDER = /* @__PURE__ */ Object.freeze(coreDotMarkerOrder);
export const LINE_MARKER_ORDER = /* @__PURE__ */ Object.freeze(coreLineMarkerOrder);
export const LINE_STYLE_ORDER = /* @__PURE__ */ Object.freeze(coreLineStyleOrder);
export const MONTH_LABELS_EN = /* @__PURE__ */ Object.freeze(coreMonthLabelsEn);
export const MONTH_LABELS_NUM = /* @__PURE__ */ Object.freeze(coreMonthLabelsNum);

// LINE_DASH 는 Record<LineStyle, number[]> 다. 얕게 얼리면 LINE_DASH.dashed 를
// 갈아 끼우는 것만 막고, LINE_DASH.dashed.push(1) 은 그대로 통한다.
export const LINE_DASH = /* @__PURE__ */ Object.freeze({
  solid: /* @__PURE__ */ Object.freeze(coreLineDash.solid),
  dashed: /* @__PURE__ */ Object.freeze(coreLineDash.dashed),
  dotted: /* @__PURE__ */ Object.freeze(coreLineDash.dotted),
  dashdot: /* @__PURE__ */ Object.freeze(coreLineDash.dashdot),
});

// ── 타입 ───────────────────────────────────────────────
export type {
  GraphOptions,
  LegendPosition,
  InsideLegendCorner,
  AbsBarCategory,
  AbsBarDirection,
  AbsBarGraphData,
  CategoryDotCategory,
  CategoryDotGraphData,
  DotMarker,
  ClimateGraphData,
  ClimateMode,
  ClimateMonthData,
  MonthInterval,
  DeviationAData,
  DeviationBData,
  DeviationBRegion,
  CubeAxisConfig,
  CubeGraphData,
  CubePoint,
  LabelOffset,
  DataTableData,
  DataTableRow,
  HythergraphData,
  HythergraphMode,
  HythergraphSeries,
  MonthLabelStyle,
  LineGraphData,
  LineLabelPlacement,
  LineMarker,
  LineSeries,
  LineStyle,
  MatrixTableData,
  AgeLabelSide,
  PyramidAgeData,
  PyramidGraphData,
  PyramidUnit,
  RadarGraphData,
  RadarSeries,
  BubbleLegendPosition,
  ScatterGraphData,
  ScatterMode,
  ScatterPoint,
  StackedBarDirection,
  StackedCategory,
  StackedDisplayMode,
  StackedGraphData,
  TernaryGraphData,
  TernaryGridInterval,
  TernaryPoint,
  TreemapCell,
  TreemapGraphData,
} from './core/index';
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run test/index.test.ts`
Expected: PASS — 45건

- [ ] **Step 5: 전체 검사를 돌린다**

Run: `npm run typecheck`
Expected: 오류 없음

Run: `npm run lint`
Expected: 오류 없음 (`src/core/**` 는 무시 대상)

Run: `npm test`
Expected: 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/index.ts test/index.test.ts
git commit -m "feat: 공개 표면 — 이름을 하나씩 적어 GeoGrapher UI 관심사를 걸러낸다"
```

---

### Task 9: 번들

**Files:**
- Create: `tsup.config.ts`, `scripts/fix-esm-dts-ext.mjs`
- Test: `test/bundle.test.ts`

⚠️ **tsup 만으로는 `package.json` 의 약속을 지킬 수 없다.** `dts: true` 는 선언
파일 번들링을 워커 스레드에서 돌리는데, 함수는 구조화 복제가 안 되므로 tsup 이
`outExtension` 을 통째로 버린다. 그러면 내부 기본값이 쓰이고, `"type": "module"`
인 패키지에서는 cjs 만 `.d.cts` 가 되고 esm 은 `.d.ts` 로 남는다. `exports` 가
가리키는 `.d.mts` 는 영영 안 나온다. 그래서 빌드 뒤에 이름을 바꾸는 단계가 붙는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`test/bundle.test.ts`:

```ts
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
// 바이트 수는 실제 빌드 크기(mjs 189KB, cjs 192KB, umd 94KB, dts 각
// 35KB)의 1/4~1/7 수준으로 잡았다 — 앞으로 export 가 늘거나 줄어도
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run test/bundle.test.ts`
Expected: FAIL — `dist/csat-chart.mjs 가 만들어졌다` 등이 false

- [ ] **Step 3: `tsup.config.ts` 를 쓴다**

```ts
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
```

- [ ] **Step 3b: `scripts/fix-esm-dts-ext.mjs` 를 쓴다**

```js
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
```

- [ ] **Step 4: 빌드하고 통과를 확인한다**

Run: `npm run build`
Expected: `dist/` 에 5개 산출물, `docs/lib/csat-chart.umd.min.js` 생성

Run: `npx vitest run test/bundle.test.ts`
Expected: PASS — 10건

`package.json` 이 가리키는 다섯 파일이 그 이름 그대로 있는지 직접 확인한다.
특히 `dist/csat-chart.d.mts` 는 후처리 단계가 없으면 나오지 않는다.

빌드 산출물의 크기를 확인한다.

Run: `ls -la dist/`
Expected: `csat-chart.umd.min.js` 가 200KB 미만 (런타임 의존성이 0이므로)

- [ ] **Step 5: `.gitignore` 를 손본다**

`docs/lib/` 는 GitHub Pages 가 그대로 서빙해야 하므로 **커밋한다.**
`.gitignore` 에 `dist/` 만 있는지 확인하고, `docs/lib` 가 무시되지 않게 한다.

Run: `git check-ignore -v docs/lib/csat-chart.umd.min.js`
Expected: 출력 없음 (무시되지 않음)

- [ ] **Step 6: 커밋**

```bash
git add tsup.config.ts test/bundle.test.ts docs/lib
git commit -m "build: tsup — ESM·CJS·UMD 세 산출물과 데모용 사본"
```

---

### Task 10: README 와 CHANGELOG

**Files:**
- Create: `README.md`, `CHANGELOG.md`

- [ ] **Step 1: `README.md` 를 쓴다**

````markdown
# csat-chart.js

수능·모의고사 시험지 양식의 그래프를 Canvas 2D로 그리는 라이브러리.
축·범례·각주·출처의 배치, 명조 글꼴, 흑백 인쇄를 전제한 해칭 패턴까지
시험지 관습을 그대로 따른다. **런타임 의존성이 없다.**

- 데모: https://yhk1m.github.io/csat-chart.js/
- 라이선스: MIT

## 시작하기

### 브라우저 (스크립트 한 줄)

```html
<script src="https://cdn.jsdelivr.net/npm/csat-chart.js"></script>
<canvas id="c" width="800" height="600"></canvas>
<script>
  CsatChart.ensureFonts().then(function () {
    new CsatChart('c', {
      type: 'ternary',
      data: CsatChart.createDefaultTernaryData(),
      options: { title: '토지 이용 구성', source: '통계청' },
    });
  });
</script>
```

`ensureFonts()` 를 부르지 않으면 대체 글꼴로 그려져 시험지 양식이 재현되지 않는다.

### 번들러

```bash
npm install csat-chart.js
```

```ts
import { CsatChart, createDefaultClimateData } from 'csat-chart.js';

await CsatChart.ensureFonts();

const chart = new CsatChart(document.querySelector('canvas'), {
  type: 'climate',
  data: createDefaultClimateData(),
  options: { title: '서울의 기후', source: '기상청', sourceInline: true },
});

chart.update({ options: { title: '부산의 기후' } });
chart.download('부산기후.png');
```

### Node.js에서 PNG 뽑기

캔버스 구현체는 직접 고른다. 이 패키지의 의존성이 아니다.

```bash
npm install @napi-rs/canvas
```

```js
import { writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { renderClimateGraph, createDefaultClimateData, createDefaultGraphOptions } from 'csat-chart.js';

const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');
renderClimateGraph(ctx, 800, 600, createDefaultClimateData(), createDefaultGraphOptions());
writeFileSync('out.png', canvas.toBuffer('image/png'));
```

## 그래프 16종

| `type` | 그래프 | 데이터 타입 |
|---|---|---|
| `absbar` | 절댓값 막대 | `AbsBarGraphData` |
| `category-dot` | 범주 점 | `CategoryDotGraphData` |
| `climate` | 기후 그래프 | `ClimateGraphData` |
| `cube` | 정육면체 | `CubeGraphData` |
| `data-table` | 항목×지역 표 | `DataTableData` |
| `deviation-a` | 월별 편차 | `DeviationAData` |
| `deviation-b` | 지역별 편차 | `DeviationBData` |
| `hythergraph` | 하이서그래프 | `HythergraphData` |
| `line` | 꺾은선 | `LineGraphData` |
| `matrix-table` | 계단식 행렬표 | `MatrixTableData` |
| `pyramid` | 인구 피라미드 | `PyramidGraphData` |
| `radar` | 방사형 | `RadarGraphData` |
| `scatter` | 산점도·버블 | `ScatterGraphData` |
| `stacked` | 100% 막대·원 | `StackedGraphData` |
| `ternary` | 삼각 그래프 | `TernaryGraphData` |
| `treemap` | 트리맵 | `TreemapGraphData` |

각 종류의 기본 데이터는 `createDefault○○Data()` 로 얻어 고쳐 쓰는 것이 가장 빠르다.

## API

### `new CsatChart(target, config)`

`target` 은 캔버스 요소 또는 그 `id` 문자열. `config` 는 `{ type, data, options? }`.
TypeScript 에서는 `type` 을 적는 순간 `data` 타입이 좁혀진다.

| 메서드 | 하는 일 |
|---|---|
| `update({ data?, options? })` | 준 것만 덮고 다시 그린다 |
| `resize(width, height)` | 캔버스 크기를 바꾸고 다시 그린다 |
| `toDataURL()` | PNG data URL |
| `download(filename?)` | 내려받기 (브라우저 전용) |
| `destroy()` | 캔버스를 비우고 더는 쓰지 못하게 한다 |

### `CsatChart.ensureFonts(options?)`

`Noto Serif KR`·`Noto Sans KR` 을 확보한다. 준비되면 `true`, 못 받거나 Node 이면
`false` 를 돌려준다. **던지지 않는다.** 사내망이면 `{ href }` 로 출처를 바꾼다.

### 오류 가려내기

데이터가 어긋나면 `CsatChartError` 를 던진다. 가려낼 때는 `instanceof` 말고
**`err.name` 을 본다.**

```js
try { new CsatChart(c, { type, data }); }
catch (err) { if (err.name === 'CsatChartError') showHint(err.message); }
```

같은 페이지에 ESM 판과 CDN 판이 함께 올라오면 클래스가 두 벌이 되어
`instanceof` 가 조용히 `false` 가 된다. `name` 은 그런 일이 없다.

### 저수준 렌더러

파사드를 거치지 않고 직접 그릴 수 있다. 모두 같은 꼴이다.

```ts
render○○(ctx, width, height, data, options): void
```

**번들 크기를 아껴야 한다면 이쪽을 쓴다.** `CsatChart` 는 종류를 문자열로 고르므로
16종을 모두 물고 간다 — 번들러가 어느 것이 쓰일지 미리 알 수 없기 때문이다.
실측(esbuild, minify):

| 무엇을 가져오나 | 크기 |
|---|---|
| 전부 | 95.8 KB |
| `CsatChart` 만 | 94.4 KB |
| `renderClimateGraph` 만 | **9.8 KB** |

기후 그래프 하나만 필요한 앱이라면 저수준 렌더러를 직접 부르는 편이
열 배 가볍다. CDN 으로 쓰는 경우에는 어차피 한 벌을 통째로 받으므로
이 이야기가 해당하지 않는다.

## 만든 배경

지리 교사가 수업·평가 자료를 만들려고 쓰던 렌더러를 떼어내 공개한 것이다.
[GeoTester](https://geotester-v2.vercel.app) 와 GeoGrapher 에서 쓰이던 코드다.

## 기여

버그 제보와 새 그래프 종류 제안을 환영한다. 렌더 결과를 바꾸는 변경은
골든 이미지 기준을 함께 갱신해야 한다.

```bash
npm install
npm run verify          # 타입·린트·테스트·빌드
UPDATE_GOLDEN=1 npx vitest run test/core/golden.test.ts   # 기준 갱신
```

골든 이미지는 시스템 글꼴 대체 결과에 의존하므로 기계마다 다를 수 있다.
CI 에서는 `SKIP_GOLDEN=1` 로 건너뛴다.

## 라이선스

MIT © 2026 김용현
````

- [ ] **Step 2: `CHANGELOG.md` 를 쓴다**

```markdown
# 변경 기록

## [1.0.0] — 2026-09-07

첫 공개. GeoTester 의 `src/lib/geo-graph` 밀봉 폴더를 독립 패키지로 떼어냈다.

### 담긴 것

- Canvas 렌더러 16종 (기후·인구 피라미드·삼각·100% 막대/원·절댓값 막대·산점도/버블·
  하이서그래프·정육면체·방사형·편차 A/B·꺾은선·범주점·트리맵·계단식 행렬표·항목×지역 표)
- 파사드 `CsatChart` — `type` 문자열 하나로 16종을 그린다
- `ensureFonts()` — 시험지 글꼴을 선택적으로 불러온다
- ESM·CJS·UMD 세 산출물, 런타임 의존성 0

### 원본과 다른 점

- **`canvas/export.ts` 를 이관하지 않았다.** GeoGrapher 전용이다. 파일명을
  `GeoGrapher_*.png` 로 짓고, 이 패키지가 공개하지 않는 `ExportSettings`·`GraphType`
  에 의존하며, 원본 앱에서도 아무도 부르지 않는 죽은 코드였다. 같은 역할은
  `CsatChart.toDataURL()`·`download()` 가 대신한다.
- **공개 표면에서 GeoGrapher UI 의 관심사를 뺐다.** `GraphType`(지도 4종과 `guide`
  를 담은 메뉴 목록)·`GRAPH_LABELS`·`MAP_GRAPH_TYPES`·`isMapGraphType`·
  `ExportSettings`·`createDefaultExportSettings` 는 내보내지 않는다. 그리는 코드는
  그대로 있으므로 렌더 결과는 같다.
- 렌더러 파일 자체는 **한 글자도 고치지 않았다.** 골든 이미지 31장이 그 증거다.

### 이관 시점의 갈래

원본 `geo-graph` 는 GeoGrapher(`vibecoding/GeoGrapher`) 에서 이식된 것이고,
`graphs/PopulationPyramid.ts` 하나가 일부러 갈라져 있었다(`pickTickStep` 도입).
이 패키지는 **갈라진 쪽**, 즉 `geo-graph` 판을 가져왔다.
```

- [ ] **Step 3: README 의 예제가 실제로 도는지 확인한다**

Run:
```bash
node -e "
const {writeFileSync}=require('node:fs');
const {createCanvas}=require('@napi-rs/canvas');
const L=require('./dist/csat-chart.cjs');
const c=createCanvas(800,600);
L.renderClimateGraph(c.getContext('2d'),800,600,L.createDefaultClimateData(),L.createDefaultGraphOptions());
writeFileSync('readme-check.png',c.toBuffer('image/png'));
console.log('ok');
"
```
Expected: `ok` 출력, `readme-check.png` 생성

Run: `rm readme-check.png`

- [ ] **Step 4: 커밋**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: README 와 CHANGELOG — 원본과 다른 점을 명시했다"
```

---

### Task 11: 데모 페이지

**Files:**
- Create: `docs/index.html`

이모지를 쓰지 않는다. 아이콘이 필요하면 선 SVG 로 그린다.

- [ ] **Step 1: `docs/index.html` 을 쓴다**

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>csat-chart.js — 수능 형식 그래프 라이브러리</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;700&display=swap">
<style>
  :root { --line:#d8d4cc; --ink:#1c1a17; --muted:#6b655c; --bg:#faf9f6; --accent:#1f4b8e; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font-family:'Noto Sans KR', system-ui, sans-serif; line-height:1.65; }
  header { border-bottom:1px solid var(--line); padding:48px 24px 32px; }
  .wrap { max-width:1040px; margin:0 auto; }
  h1 { font-family:'Noto Serif KR', serif; font-size:32px; margin:0 0 8px; letter-spacing:-0.02em; }
  .lede { color:var(--muted); margin:0 0 20px; max-width:60ch; }
  .start { background:#fff; border:1px solid var(--line); border-radius:4px; padding:16px 18px; }
  pre { margin:0; overflow-x:auto; font-size:13px; line-height:1.6;
        font-family:ui-monospace, 'Cascadia Mono', Consolas, monospace; }
  main { padding:32px 24px 80px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:4px;
          margin-bottom:28px; overflow:hidden; }
  .card > h2 { font-size:16px; margin:0; padding:14px 18px; border-bottom:1px solid var(--line);
               display:flex; align-items:center; gap:10px; }
  .key { font-family:ui-monospace, Consolas, monospace; font-size:12px; color:var(--accent);
         border:1px solid var(--line); border-radius:3px; padding:1px 6px; }
  .body { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,380px); gap:18px; padding:18px; }
  @media (max-width:860px) { .body { grid-template-columns:1fr; } }
  canvas { width:100%; height:auto; border:1px solid var(--line); background:#fff; }
  textarea { width:100%; height:190px; font-family:ui-monospace, Consolas, monospace;
             font-size:12px; border:1px solid var(--line); border-radius:3px; padding:10px;
             resize:vertical; background:#fdfdfb; color:var(--ink); }
  .row { display:flex; gap:8px; margin-top:8px; align-items:center; }
  button { font:inherit; font-size:13px; padding:6px 12px; border:1px solid var(--line);
           background:#fff; border-radius:3px; cursor:pointer; display:inline-flex;
           align-items:center; gap:6px; }
  button:hover { border-color:var(--accent); color:var(--accent); }
  .err { color:#a4262c; font-size:12px; min-height:1.2em; }
  footer { border-top:1px solid var(--line); padding:24px; color:var(--muted); font-size:13px; }
</style>
</head>
<body>
<header>
  <div class="wrap">
    <h1>csat-chart.js</h1>
    <p class="lede">수능·모의고사 시험지 양식의 그래프를 Canvas 2D로 그립니다.
      런타임 의존성이 없고, 스크립트 한 줄로 시작합니다.</p>
    <div class="start"><pre>&lt;script src="https://cdn.jsdelivr.net/npm/csat-chart.js"&gt;&lt;/script&gt;
&lt;canvas id="c" width="800" height="600"&gt;&lt;/canvas&gt;
&lt;script&gt;
  CsatChart.ensureFonts().then(function () {
    new CsatChart('c', { type: 'ternary', data: CsatChart.createDefaultTernaryData() });
  });
&lt;/script&gt;</pre></div>
  </div>
</header>

<main class="wrap" id="gallery"></main>

<footer class="wrap">
  MIT © 2026 김용현 ·
  <a href="https://github.com/yhk1m/csat-chart.js">GitHub</a>
</footer>

<script src="./lib/csat-chart.umd.min.js"></script>
<script>
const LABELS = {
  'absbar': '절댓값 막대', 'category-dot': '범주 점', 'climate': '기후 그래프',
  'cube': '정육면체', 'data-table': '항목×지역 표', 'deviation-a': '월별 편차',
  'deviation-b': '지역별 편차', 'hythergraph': '하이서그래프', 'line': '꺾은선',
  'matrix-table': '계단식 행렬표', 'pyramid': '인구 피라미드', 'radar': '방사형',
  'scatter': '산점도·버블', 'stacked': '100% 막대·원', 'ternary': '삼각 그래프',
  'treemap': '트리맵',
};

const FACTORY = {
  'absbar': 'createDefaultAbsBarData', 'category-dot': 'createDefaultCategoryDotData',
  'climate': 'createDefaultClimateData', 'cube': 'createDefaultCubeData',
  'data-table': 'createDefaultDataTableData', 'deviation-a': 'createDefaultDeviationAData',
  'deviation-b': 'createDefaultDeviationBData', 'hythergraph': 'createDefaultHythergraphData',
  'line': 'createDefaultLineData', 'matrix-table': 'createDefaultMatrixTableData',
  'pyramid': 'createDefaultPyramidData', 'radar': 'createDefaultRadarData',
  'scatter': 'createDefaultScatterData', 'stacked': 'createDefaultStackedData',
  'ternary': 'createDefaultTernaryData', 'treemap': 'createDefaultTreemapData',
};

const ICON_DOWNLOAD =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"' +
  ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M8 2v8M4.5 7L8 10.5 11.5 7M2.5 13h11"/></svg>';

const ICON_RESET =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"' +
  ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M13 8a5 5 0 1 1-1.6-3.7M13 2v3h-3"/></svg>';

function card(type) {
  const el = document.createElement('section');
  el.className = 'card';
  el.innerHTML =
    '<h2>' + LABELS[type] + ' <span class="key">' + type + '</span></h2>' +
    '<div class="body">' +
      '<div><canvas width="800" height="600"></canvas></div>' +
      '<div>' +
        '<textarea spellcheck="false"></textarea>' +
        '<p class="err"></p>' +
        '<div class="row">' +
          '<button data-act="reset">' + ICON_RESET + '되돌리기</button>' +
          '<button data-act="png">' + ICON_DOWNLOAD + 'PNG</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  const canvas = el.querySelector('canvas');
  const area = el.querySelector('textarea');
  const err = el.querySelector('.err');
  const fresh = () => CsatChart[FACTORY[type]]();

  let chart = new CsatChart(canvas, { type: type, data: fresh() });
  area.value = JSON.stringify(fresh(), null, 2);

  area.addEventListener('input', function () {
    try {
      chart.update({ data: JSON.parse(area.value) });
      err.textContent = '';
    } catch (e) {
      err.textContent = e.message;
    }
  });

  el.querySelector('[data-act=reset]').addEventListener('click', function () {
    area.value = JSON.stringify(fresh(), null, 2);
    chart.update({ data: fresh() });
    err.textContent = '';
  });

  el.querySelector('[data-act=png]').addEventListener('click', function () {
    chart.download(type + '.png');
  });

  return el;
}

CsatChart.ensureFonts().then(function () {
  const gallery = document.getElementById('gallery');
  CsatChart.CHART_TYPES.forEach(function (t) { gallery.appendChild(card(t)); });
});
</script>
</body>
</html>
```

- [ ] **Step 2: 브라우저에서 확인한다**

Run: `npx http-server docs -p 8080 -c-1` (또는 `python -m http.server 8080 -d docs`)

브라우저로 `http://localhost:8080` 을 연다. 확인할 것:

1. 카드 16장이 모두 나오고 각 캔버스에 그림이 그려졌는가
2. 명조 글꼴(Noto Serif KR)로 제목·눈금이 그려졌는가 — 고딕으로 보이면
   `ensureFonts()` 가 동작하지 않은 것이다
3. 텍스트를 고치면 즉시 다시 그려지는가
4. JSON 을 일부러 깨뜨리면 빨간 글씨로 안내가 나오는가
5. 필수 키를 지우면 `csat-chart:` 로 시작하는 한국어 메시지가 나오는가
6. PNG 버튼이 파일을 내려받는가

- [ ] **Step 3: 커밋**

```bash
git add docs/index.html
git commit -m "docs: 데모 페이지 — 16종을 실제로 그리고 데이터를 즉석에서 고친다"
```

---

### Task 12: CI 와 배포 준비

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 워크플로를 쓴다**

```yaml
name: CI

on:
  push:
    # 기본 브랜치 이름이 확정되기 전이라 둘 다 받는다.
    branches: [main, master]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - run: npm test
        env:
          # 골든 이미지는 시스템 글꼴 대체 결과에 의존해 기계마다 다르다.
          # 이식 검증은 저자 기계에서 하고, CI 에서는 «빈 캔버스가 아니다» 만 본다.
          SKIP_GOLDEN: '1'
      # docs/lib 는 커밋된 빌드 산출물이다. 누가 src 를 고치고 다시 빌드하는 걸
      # 잊으면 데모 페이지가 실제 라이브러리와 어긋난 채 배포된다. 방금 돌린
      # build 결과와 커밋된 것이 같은지 본다 — 이 파일은 sourcemap 주석이 없어
      # 바이트 단위로 같아야 한다.
      # 선언 파일은 크기 하한만 검사한다 — 렌더 테스트로 뒷받침되는 mjs·cjs·umd 와
      # 달리, 커도 망가진 .d.ts 는 통과한다. 실제 소비자처럼 타입 검사를 한 번 돌려
      # 그 빈틈을 막는다. dts 를 만드는 워커가 이미 한 번 말썽을 부린 적이 있다.
      # ⚠️ `.d.mts` 를 직접 import 하면 `TS2846: A declaration file cannot be
      # imported without 'import type'` 로 막힌다. 구현 파일 `.mjs` 를 가리켜야
      # TypeScript 가 옆의 `.d.mts` 를 찾아 쓴다 — 실제 소비자가 겪는 경로와도 같다.
      # 검사 파일은 작업 폴더 안에 둔다. /tmp 에 두면 상대 경로가 저장소를 벗어난다.
      - name: 만들어진 선언 파일이 실제로 쓰이는지 확인
        run: |
          mkdir -p .dtscheck
          cat > .dtscheck/use.ts <<'EOF'
          import { CsatChart, createDefaultTernaryData } from '../dist/csat-chart.mjs';
          const cfg = { type: 'ternary' as const, data: createDefaultTernaryData() };
          export const ok: typeof CsatChart = CsatChart;
          export const t = cfg.type;
          EOF
          npx tsc --noEmit --strict --moduleResolution bundler --module esnext             --target es2020 --lib es2020,dom .dtscheck/use.ts
          rm -rf .dtscheck

      - name: docs/lib 가 최신인지 확인
        run: |
          git diff --exit-code -- docs/lib/csat-chart.umd.min.js             || (echo "docs/lib/csat-chart.umd.min.js 가 낡았습니다 — npm run build 후 커밋하세요" && exit 1)
```

`npm test` 를 `npm run build` 뒤에 두는 이유: `test/bundle.test.ts` 가 `dist/` 를 읽는다.

- [ ] **Step 2: 로컬에서 CI 와 같은 순서를 돌린다**

Run: `npm run typecheck && npm run lint && npm run build && SKIP_GOLDEN=1 npm test`
Expected: 전부 통과

- [ ] **Step 3: 골든까지 포함한 전체 검사를 돌린다**

Run: `npm run verify`
Expected: 전부 통과 (골든 31장 포함)

- [ ] **Step 4: 배포 내용물을 확인한다**

Run: `npm pack --dry-run`
Expected: `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`, `package.json` 만 포함.
`src/`·`test/`·`docs/` 가 들어가면 `files` 필드를 고친다.

- [ ] **Step 5: 버전을 올리고 커밋**

```bash
npm version 1.0.0 --no-git-tag-version
git add .github/workflows/ci.yml package.json package-lock.json
git commit -m "ci: 검증 워크플로와 1.0.0 버전"
```

- [ ] **Step 6: 사용자에게 넘길 것을 정리한다**

여기서 멈추고 사용자에게 알린다. 아래 셋은 **사용자의 계정이 필요해 대신 할 수 없다.**

1. GitHub 저장소 `yhk1m/csat-chart.js` 를 만들고 `git push -u origin main`
2. 저장소 Settings → Pages → Source 를 `main` 브랜치의 `/docs` 로 지정
3. `npm login` 후 `npm publish --access public`

---

## 이 계획 밖으로 남기는 것

작업 중에 드러났지만 이번 범위에서 고치지 않기로 한 것들이다.

**`sourceInline`·`sourceLeft` 가 16종 중 2종에서만 동작한다.** 둘 다 공통
`GraphOptions` 에 있고 공통 유틸 `drawSourceAndFootnote` 가 제대로 구현하고 있는데,
정작 그 옵션을 넘기는 렌더러가 `ScatterBubble`(sourceInline)과 `StackedBarPie`
(sourceLeft) 둘뿐이다. `common.ts` 의 `sourceInline` 주석이 드는 예가 하필 기후
그래프인데 기후에서는 동작하지 않는다 — 의도한 제한이 아니라 이식이 덜 끝난
자리로 보인다.

**고치려면 `src/core/` 를 건드려야 하고, 그러면 골든 이미지 31장을 다시 만들어야
한다.** 그 순간 «똑같이 그려진다» 의 증거가 사라진다. 그래서 이번에는 README 와
CHANGELOG 에 정확히 적어 두기만 했다. 나중에 손댄다면 골든 갱신을 포함한 별도
작업으로, 갱신 전후를 사람이 눈으로 대조하는 단계를 넣어야 한다.

**화면 캔버스의 devicePixelRatio 를 다루지 않는다.** 레티나에서 조금 흐릿하다.
`toDataURL({ scale })` 로 또렷한 PNG 를 뽑는 길은 있고 README 가 안내한다.
파사드에 `pixelRatio` 옵션을 더하는 것은 같은 `drawScaled` 내부를 쓰므로 나중에
막히지 않는다.

---

## 완료 기준

- [ ] `npm run verify` 가 전부 통과한다 (타입·린트·테스트·빌드)
- [ ] 골든 이미지 31장이 원본과 픽셀 단위로 같다
- [ ] `dist/` 에 ESM·CJS·UMD·타입 선언이 있다
- [ ] 데모 페이지에서 16종이 명조 글꼴로 그려진다
- [ ] `npm pack --dry-run` 에 `src/`·`test/` 가 없다
- [ ] `geotester-v2` 와 `GeoGrapher` 에 **변경이 하나도 없다** —
      `cd ../geotester-v2 && git status --porcelain` 이 비어 있고,
      `cd ../GeoGrapher && git status --porcelain` 도 비어 있다
