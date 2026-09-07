# csat-chart.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수능 형식 그래프 렌더러 16종을 npm·CDN 양쪽으로 쓸 수 있는 독립 오픈소스 패키지로 낸다.

**Architecture:** `geo-graph` 밀봉 폴더를 `src/core/`로 **무수정 이관**하고(골든 이미지 31장이 이식의 증거), 그 위에 레지스트리·검증·파사드·글꼴 헬퍼를 얹는다. `src/index.ts`가 유일한 공개 표면이며 `export *`를 쓰지 않는다.

**Tech Stack:** TypeScript 5 · tsup(esbuild) · vitest 4 · @napi-rs/canvas(테스트 전용) · ESLint 9. **런타임 의존성 0.**

**설계 문서:** `docs/superpowers/specs/2026-09-07-csat-chart-js-design.md`

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

**원본 경로 (읽기 전용):**
`C:/Users/김용현/Desktop/vibecoding/geotester-v2/src/lib/geo-graph`
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
    "build": "tsup",
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
SRC="/c/Users/김용현/Desktop/vibecoding/geotester-v2/src/lib/geo-graph"
DEST="/c/Users/김용현/Desktop/vibecoding/csat-chart.js/src/core"
mkdir -p "$DEST"
cp -r "$SRC/canvas" "$SRC/graphs" "$SRC/types" "$DEST/"
cp "$SRC/index.ts" "$DEST/index.ts"
```

`__tests__`·`README.md`·`CHANGES.md`는 복사하지 않는다. 테스트는 Task 3에서
`test/core/`로 따로 옮기고, 두 문서는 Task 10에서 CHANGELOG로 흡수한다.

- [ ] **Step 2: `export.ts` 를 지운다**

```bash
rm "/c/Users/김용현/Desktop/vibecoding/csat-chart.js/src/core/canvas/export.ts"
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
SRC="/c/Users/김용현/Desktop/vibecoding/geotester-v2/src/lib/geo-graph/__tests__"
DEST="/c/Users/김용현/Desktop/vibecoding/csat-chart.js/test/core"
mkdir -p "$DEST"
cp "$SRC"/*.ts "$DEST/"
cp -r "$SRC/__snapshots__" "$DEST/"
ls "$DEST/__snapshots__"/*.png | wc -l    # 31 이어야 한다
```

- [ ] **Step 2: import 경로를 고친다**

테스트 파일들은 `'../index'`·`'../graphs/…'`를 참조한다. `test/core/`에서는
`src/core/`를 가리켜야 한다.

```bash
cd "/c/Users/김용현/Desktop/vibecoding/csat-chart.js/test/core"
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

  it('isCsatChartType 이 아는 키만 통과시킨다', () => {
    expect(isCsatChartType('pyramid')).toBe(true);
    expect(isCsatChartType('piramid')).toBe(false);
    expect(isCsatChartType(42)).toBe(false);
    expect(isCsatChartType(undefined)).toBe(false);
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

/** 한 종류의 설정. `type` 을 적으면 `data` 가 그 종류로 좁혀진다. */
export interface ConfigFor<T extends CsatChartType> {
  type: T;
  data: ChartDataMap[T];
  options?: Partial<GraphOptions>;
}

/** 16종을 모은 판별 유니온. */
export type CsatChartConfig = { [K in CsatChartType]: ConfigFor<K> }[CsatChartType];

/** 한 종류의 부분 갱신. 준 것만 덮는다. */
export interface UpdateFor<T extends CsatChartType> {
  data?: ChartDataMap[T];
  options?: Partial<GraphOptions>;
}

export type CsatChartUpdate = { [K in CsatChartType]: UpdateFor<K> }[CsatChartType];
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
 */
export const CHART_TYPES: readonly CsatChartType[] = Object.freeze(
  (Object.keys(REGISTRY) as CsatChartType[]).sort(),
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
afterEach(() => vi.unstubAllGlobals());

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
  /** 글꼴 CSS 주소. 기본은 Google Fonts. 사내망·오프라인이면 바꾼다. */
  href?: string;
  /** 확인할 글꼴 이름. 기본은 Noto Serif KR, Noto Sans KR */
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
 * 여러 번 불러도 실제 작업은 한 번만 한다.
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

  if (!document.getElementById(LINK_ID)) {
    const link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
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

  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), timeoutMs);
  });

  return Promise.race([work, timeout]);
}
```

굵기를 순서대로(`for … await`) 부르는 이유는 테스트가 호출 순서를 확인하기
때문만이 아니라, 실패한 글꼴 하나가 나머지를 가리지 않게 하기 위해서다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run test/fonts.test.ts`
Expected: PASS — 5건

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

function nonWhitePixels(c: CanvasLike): number {
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  const raw = ctx.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < raw.length; i += 4) {
    if (raw[i] !== 255 || raw[i + 1] !== 255 || raw[i + 2] !== 255) n++;
  }
  return n;
}

afterEach(() => vi.unstubAllGlobals());

describe('CsatChart', () => {
  it('만들자마자 그린다', () => {
    const c = canvas();
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(nonWhitePixels(c)).toBeGreaterThan(50);
  });

  it('크기가 없는 캔버스에는 800×600 을 넣는다', () => {
    const c = createCanvas(1, 1) as unknown as CanvasLike;
    c.width = 0;
    c.height = 0;
    new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    expect(c.width).toBe(800);
    expect(c.height).toBe(600);
  });

  it('알 수 없는 type 을 거부한다', () => {
    expect(
      () => new CsatChart(canvas(), { type: 'piramid' as never, data: {} }),
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

  it('destroy 뒤에는 쓰지 못한다', () => {
    const chart = new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData() });
    chart.destroy();
    expect(() => chart.resize(400, 300)).toThrow(/이미 destroy\(\) 된 차트입니다/);
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

  it('ensureFonts 를 정적 메서드로 노출한다', () => {
    expect(typeof CsatChart.ensureFonts).toBe('function');
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
```

`instanceof HTMLCanvasElement` 대신 `tagName` 을 보는 이유: `HTMLCanvasElement` 는
Node 에 없어서 참조하는 순간 터진다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run test/chart.test.ts`
Expected: PASS — 17건

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
import { CHART_TYPES } from '../src/registry';

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

  it('축 계산 유틸을 내보낸다', () => {
    expect(lib.niceStep(100, 5)).toBeGreaterThan(0);
    expect(lib.autoRange([1, 2, 3]).step).toBeGreaterThan(0);
  });

  it.each(EXCLUDED)('GeoGrapher 전용 %s 는 내보내지 않는다', (name) => {
    expect(name in lib).toBe(false);
  });

  it('테스트 전용 헬퍼를 내보내지 않는다', () => {
    expect('resetFontsForTest' in lib).toBe(false);
    expect('REGISTRY' in lib).toBe(false);
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
  CsatChartUpdate,
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
export {
  AGE_GROUPS,
  DOT_MARKER_ORDER,
  LINE_DASH,
  LINE_MARKER_ORDER,
  LINE_STYLE_ORDER,
  MONTH_LABELS_EN,
  MONTH_LABELS_NUM,
} from './core/index';

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
Expected: PASS — 41건

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
- Create: `tsup.config.ts`
- Test: `test/bundle.test.ts`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`test/bundle.test.ts`:

```ts
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

describe('번들 산출물', () => {
  it.each(ARTIFACTS)('%s 가 만들어졌다', (name) => {
    expect(existsSync(join(DIST, name))).toBe(true);
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run test/bundle.test.ts`
Expected: FAIL — `dist/csat-chart.mjs 가 만들어졌다` 등이 false

- [ ] **Step 3: `tsup.config.ts` 를 쓴다**

```ts
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
    outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
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
```

- [ ] **Step 4: 빌드하고 통과를 확인한다**

Run: `npm run build`
Expected: `dist/` 에 5개 산출물, `docs/lib/csat-chart.umd.min.js` 생성

Run: `npx vitest run test/bundle.test.ts`
Expected: PASS — 8건

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
    branches: [main]
  pull_request:

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

## 완료 기준

- [ ] `npm run verify` 가 전부 통과한다 (타입·린트·테스트·빌드)
- [ ] 골든 이미지 31장이 원본과 픽셀 단위로 같다
- [ ] `dist/` 에 ESM·CJS·UMD·타입 선언이 있다
- [ ] 데모 페이지에서 16종이 명조 글꼴로 그려진다
- [ ] `npm pack --dry-run` 에 `src/`·`test/` 가 없다
- [ ] `geotester-v2` 와 `GeoGrapher` 에 **변경이 하나도 없다** —
      `cd ../geotester-v2 && git status --porcelain` 이 비어 있고,
      `cd ../GeoGrapher && git status --porcelain` 도 비어 있다
