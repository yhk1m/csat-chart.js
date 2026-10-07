# 시험지 양식 2단계 — 구현 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** csat-chart.js 의 기본 그림을 평가원 시험지 실물(실측 명세 §1·§2)과 같은 글꼴·굵기·선·회색으로 바꾸고(2.0.0), 1.7.0 모양은 `style: 'classic'` 으로 바이트 그대로 남긴다.

**Architecture:** 먼저 렌더러 17종과 공통 캔버스 도우미에 박힌 굵기·선 굵기·점선·회색·눈금·범례 치수를 `src/core/canvas/style.ts` 의 두 토큰 묶음(`classicStyle` = 1.7.0 값, `examStyle` = 실측 값)으로 옮긴다 — 이 단계의 증거는 «`classic` 골든 42장 바이트 동일». 그다음 글꼴 자리 `numeral` 과 시험지 글꼴 순서를 더하고, 기본값을 `exam` 으로 바꾼 뒤 토큰으로 못 하는 구조 변화(눈금 방향·범주 경계 눈금·열린 틀·세로 쌓기 축 이름·어두운 칸 글자)를 더한다. 끝으로 `exam` 골든 42장을 새로 만들고, 시험지 표본과 나란히·겹쳐 보는 검증을 거쳐 사용자 승인 뒤에 굳힌다.

**Tech Stack:** TypeScript 5 · vitest 4 · @napi-rs/canvas 1.0.3 · tsup 8 · Python 3.12(PyMuPDF·Pillow·numpy, `unittest`) — 실측 도구 쪽만

설계: `planning/specs/2026-10-07-exam-style-design.md` · 실측: `planning/specs/2026-10-07-exam-style-measurements.md`(§3 = 고칠 곳 47가지, §4 끝 = 사용자 결정 다섯) · 1단계 계획: `planning/plans/2026-10-07-exam-style-phase1-measure.md`

---

## 지켜야 할 것

- 브랜치 `exam-style` 에서 그대로 일한다(새 브랜치·worktree 를 만들지 않는다).
- **`git add -A` 금지.** 파일을 이름으로 더한다. 커밋 메시지 끝에 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 커밋 메시지·주석은 저장소 말투(한국어, 짧게, «…다» 체). 예: `refactor(style): 축·눈금 굵기를 토큰으로 옮긴다`.
- 새 `.ts` 파일 첫 줄은 `// © 2026 김용현`, `.py` 는 `# © 2026 김용현`(Write 훅이 넣어 주면 지우지 않는다).
- **이 PC 의 한글 경로에서 Node 재귀 fs(`cpSync`/`rmSync`/`mkdirSync` 의 `recursive`)는 깨진다.** 새 코드에서 쓰지 않는다. 폴더는 Bash 의 `mkdir -p` 로 만들거나 부모가 있는 한 칸짜리 `mkdirSync(dir)` 로 만든다.
- 통사랑 폴더 `C:\Users\김용현\Desktop\vibecoding\tongsarang` 는 **읽기만**. GeoGrapher·geotester 는 건드리지 않는다.
- Python 은 `python -I`. `-I` 는 스크립트 폴더를 `sys.path` 에 넣지 않으므로 스크립트 안에서 `sys.path.insert(0, str(Path(__file__).resolve().parent))` 를 한다(기존 `compare.py` 와 같다). 시험은 `python -I -m unittest discover -s planning/tools/exam-measure -t planning/tools/exam-measure`.
- 푸시·태그·npm 발행·GitHub Release 는 **하지 않는다**(사용자가 나중에 정한다).
- 이 계획의 줄 번호는 커밋 `23e70db` 기준이다. 앞 작업이 같은 파일을 고쳤으면 줄이 밀린다 — **줄 번호가 아니라 «지금 코드» 칸의 글을 찾아** 바꾼다.

## 시작 상태 (2026-10-07 확인)

```
$ npx vitest run
 Test Files  19 passed (19)
      Tests  746 passed (746)
```

골든 42장(`test/core/__snapshots__/*.png`)이 이 PC 에서 바이트 그대로 통과한다. 작업 1 이 원그래프 한 장을 더해 43장(86건)이 되고, 이것이 단계 A(토큰화)의 기준이다.

## 용어

- **classic** — 1.7.0 모양. `style: 'classic'`.
- **exam** — 시험지 모양. 2.0.0 기본값.
- **토큰** — `StyleTokens` 의 칸 하나. 렌더러는 숫자·굵기를 직접 쓰지 않고 토큰을 읽는다.
- **자리(TextPlace)** — 글꼴·굵기·크기가 시험지에서 갈리는 글자 단위(눈금 숫자, 단위, 항목 이름 …).
- **px 환산** — 1pt = 4.85px (단일 그래프 폭 165pt → 800px, 실측 명세 §3 머리).

## 파일 구조

| 파일 | 할 일 | 작업 |
|---|---|---|
| `src/core/canvas/style.ts` | **새 파일.** `TextPlace`·`StyleTokens`, `classicStyle`·`examStyle`, `styleOf`·`byStyle`·`tickDirOf`·`labelPlace`, 글꼴 순서 상수, `DEFAULT_STYLE` | 2, 14, 17 |
| `src/core/canvas/renderer.ts` | `FontOptions.style`, `textSize`·`textFont`(자리 → 글꼴 문자열), `fontStackOf` 의 `numeral`·양식별 순서 | 2, 14 |
| `src/core/types/common.ts` | `StyleName`·`TickDirection`, `GraphOptions.style`·`tickDirection`, `FontRole` 에 `'numeral'`, `FontStack.numeral`, `createDefaultGraphOptions(style)` | 1, 14, 16 |
| `src/core/types/line.ts` | `LineGraphData.frame`, 주석 | 7, 20 |
| `src/core/canvas/axes.ts` | 축·눈금·격자 토큰, 눈금 방향·부호 | 3, 18 |
| `src/core/canvas/labels.ts` | 제목·출처·각주·연도 글꼴·색, 각주 표, 출처 자리 기본값, 채움 위 글자 `inkText` | 3, 11 |
| `src/core/canvas/legend.ts` | 범례 글꼴·상자·견본 치수 | 4 |
| `src/core/canvas/patterns.ts` | 채움 순서·빗금 토큰 | 4 |
| `src/core/graphs/*.ts` (17) | 박힌 값 → 토큰, 종류별 값은 파일 안 `LOOK` 표 / exam 구조 | 4–11 / 19–23 |
| `src/chart.ts` | 옵션을 «받은 조각 누적 → 양식 기본값 위에 덮기» 로 | 16 |
| `src/validate.ts` | `assertOptionValues` (style·tickDirection) | 16 |
| `src/index.ts`, `src/core/index.ts` | 새 타입·도우미 내보내기 | 2, 14, 29 |
| `test/core/fixtures.ts` | 원그래프 골든 케이스 `stackedPie` | 1 |
| `test/core/style.test.ts` | **새 파일.** 토큰 선택·글꼴 자리 풀기·글꼴 순서 | 2, 14, 17 |
| `test/core/style-audit.test.ts` | **새 파일.** 렌더러에 박힌 `'bold'`·선 굵기 숫자가 남지 않았는지 | 12 |
| `test/core/font-fallback.test.ts` | **새 파일.** 한 글줄 안 글꼴 섞임(괄호 세리프 + 한글 고딕) | 15 |
| `test/core/axes-ticks.test.ts` | **새 파일.** 눈금 방향 | 18 |
| `test/core/exam-structure.test.ts` | **새 파일.** exam 구조(눈금 유무·열린 틀) | 19, 20 |
| `test/core/golden.test.ts` | classic 고정 → 양식 둘 × 43장, `__snapshots__/exam/` | 1, 16, 25 |
| `test/core/exam-overlay.test.ts`, `test/core/exam-overlay-cases.ts` | **새 파일.** 시험지 자료 4장 그리기(환경 변수가 있을 때만 PNG) | 27 |
| `planning/tools/exam-measure/numerals.py` | **새 파일.** 숫자 글꼴 후보 대조 | 13 |
| `planning/tools/exam-measure/overlay.py` | **새 파일.** 표본 위에 결과 겹치기 | 27 |
| `planning/tools/exam-measure/compare.py` | 세 칸 대조 시트(표본 · exam · classic) | 26 |
| `package.json`, `CHANGELOG.md`, `README.md`, `docs/ai-reference.md` | 2.0.0 준비 | 29 |
| `docs/index.html`, `docs/lib/csat-chart.umd.min.js` | 데모 양식 전환, 빌드 산출물 | 12, 30 |

## 단계와 작업 목록

| 단계 | 작업 | 관문 |
|---|---|---|
| A 토큰화 | 1 골든 고정(+원그래프 골든) · 2 토큰 모듈 · 3 축·제목·출처 · 4 범례·채움 · 5 막대 둘 · 6 피라미드·기후·편차 · 7 꺾은선·범주 점·하이서 · 8 방사·정육면체·삼각 · 9 산점 · 10 경제 · 11 표·트리맵·원 · 12 감사 | `classic` 골든 43장 바이트 동일 |
| B 글꼴 | 13 숫자 글꼴 고르기 · 14 `numeral` 자리·시험지 글꼴 순서 · 15 섞인 글줄 확인 | 단위 시험 + 브라우저 확인 |
| C 전환 | 16 옵션 검사·누적 · 17 기본값 exam · 18 눈금 방향 · 19 막대 구조 · 20 꺾은선 틀·눈금 · 21 피라미드·편차·기후·범주 점 · 22 산점·삼각·하이서·방사·정육면체 · 23 표 · 24 넘침 · 25 exam 골든 | 전체 시험 통과, classic 43장 그대로 |
| D 검증 | 26 대조 시트 · 27 겹침 비교 · 28 **사용자 검토** | 사용자 승인 |
| E 내보내기 준비 | 29 판 번호·문서 · 30 데모·빌드·최종 확인 | `npm run verify` |

---

## 토큰 설계 (작업 2 가 이 코드를 그대로 만든다)

렌더러 쪽 규칙은 셋이다.

1. **글꼴은 자리로 묻는다.** `getFont(size, options, 'bold')` 대신 `textFont(options, '<자리>', size)`.
   1.7.0 이 그 자리에서 `'normal'` 이나 특정 자리(`'sans'`)를 썼으면 `textFont(options, 자리, size, { weight: 'normal' })` / `{ role: 'sans' }` — 이 넷째 인자(**legacy**)는 classic 에서만 읽힌다.
2. **글자 크기도 자리로 묻는다.** `options.fontSize.dataLabel * 0.85 + 5` 같은 1.7.0 식은 지우지 않고 `textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5)` 로 감싼다. classic 은 그 식 값 그대로, exam 은 자리 규칙(예: 범례 = `fs.tick`).
3. **선·색은 토큰, 종류 하나에만 있는 값은 그 파일의 `LOOK` 표.**
   ```ts
   const LOOK = {
     classic: { arrow: 2.5 },
     exam: { arrow: 1.9 },
   } as const;
   // render 함수 첫머리:
   const t = styleOf(options);
   const look = byStyle(options, LOOK);
   ```

classic 값이 렌더러마다 다른 자리는 토큰 이름을 나눴다 — 예: 축 격자 `grid`(`#ccc` 0.5 `[4,4]`) 와 막대 격자 `barGrid`(`#ddd` 0.5 `[3,3]`). exam 에서는 둘 다 같은 값이다.

---

### Task 1: 골든을 classic 으로 못박고 옵션 타입을 연다

기본값이 나중에 exam 으로 바뀌어도 지금 42장이 classic 으로 비교되게 한다. 이 작업은 그림을 바꾸지 않는다.

**Files:**
- Modify: `src/core/types/common.ts:41-47` (타입 추가), `:72-112` (`GraphOptions`)
- Modify: `test/core/golden.test.ts:28-64`

- [ ] **Step 1: 타입을 더한다**

`src/core/types/common.ts` 의 `export type FontRole = 'serif' | 'sans' | 'custom';` 바로 아래에:

```ts
/**
 * 그림 양식.
 *
 * - `'exam'` — 평가원 시험지 실물에 맞춘 글꼴·굵기·선 (2.0.0 기본)
 * - `'classic'` — 1.7.x 모양 그대로 (굵은 글자, 2px 축, 회색 점선 격자)
 */
export type StyleName = 'exam' | 'classic';

/** 눈금 표시 방향. 주지 않으면 양식·종류마다 시험지 다수결을 따른다. */
export type TickDirection = 'in' | 'out';
```

`GraphOptions` 의 `fontStack?: FontStack;` 아래에:

```ts
  /**
   * 그림 양식. 미지정이면 기본 양식(2.0.0 부터 `'exam'`).
   * 1.7.x 와 같은 그림이 필요하면 `'classic'`.
   */
  style?: StyleName;
  /**
   * 눈금 표시 방향을 모든 축에 한 번에 정한다.
   * 미지정이면 classic 은 늘 바깥, exam 은 종류마다 시험지 다수결.
   */
  tickDirection?: TickDirection;
```

- [ ] **Step 2: 골든 시험이 classic 을 명시하게 한다**

`test/core/golden.test.ts` 의 `optionsFor` 첫 줄을 바꾼다:

```ts
function optionsFor(name: string) {
  // 이 42장은 1.7.0 모양의 증거다 — 기본 양식이 바뀌어도 classic 으로 비교한다
  const base = { ...createDefaultGraphOptions(), style: 'classic' as const };
```

(함수의 나머지는 그대로 — 모든 갈래가 `...base` 를 펼치므로 `style` 이 따라간다.)

같은 함수의 `if (name === 'lineEndExam') { … }` 블록 바로 아래에 한 갈래를 더한다 — 원그래프는 값 라벨을 켜야 조각 위 글자(어두운 조각의 흰 글자)를 그린다:

```ts
  // 원그래프 — 조각 안 값 라벨(어두운 조각은 흰 글자)까지 감시한다
  if (name === 'stackedPie') return { ...base, showDataLabels: true };
```

- [ ] **Step 3: 원그래프 골든을 하나 더한다 (토큰화 전에)**

지금 골든 42장에는 `displayMode: 'pie'` 가 하나도 없다 — 원그래프 쪽 토큰화가 classic 을 깨도 잡을 수 없다. **코드를 고치기 전에** 1.7.0 그대로의 기준을 만든다.

`test/core/fixtures.ts` 의 `stackedExam` 정의(165–179) 바로 아래에:

```ts
/** 원그래프 셋 — 조각 경계·테두리·조각 안 값(어두운 조각의 흰 글자)을 감시한다 */
const stackedPie = () => {
  const d = createDefaultStackedData();
  d.displayMode = 'pie';
  d.seriesLabels = ['항목1', '항목2', '항목3', '항목4'];
  d.categories = [
    { label: '(가)', values: [45, 25, 20, 10] },
    { label: '(나)', values: [30, 30, 25, 15] },
    { label: '(다)', values: [20, 15, 40, 25] },
  ];
  return d;
};
```

`CASES` 의 `['stackedExam', …]` 줄 아래에:

```ts
  ['stackedPie', renderStackedGraph as Renderer, stackedPie],
```

Run: `npx vitest run test/core/golden.test.ts`
Expected: `Tests  86 passed (86)` — 새 `test/core/__snapshots__/stackedPie.png` 가 생긴다(처음 만드는 기준은 통과로 친다). 그 PNG 를 Read 로 열어 원 셋·조각 안 숫자가 보이는지 눈으로 확인한다.

같은 명령을 한 번 더 돌려 `86 passed` 가 그대로인지(새 기준과 바이트 비교) 확인한다.

- [ ] **Step 4: 타입 검사와 골든**

Run: `npm run typecheck && npx vitest run`
Expected: 타입 오류 없음, 전체 PASS (746 + 2 = 748).

이 계획에서 «classic 골든» 은 이제 **43장**(86건 = 비교 43 + 빈 캔버스 아님 43)이다.

- [ ] **Step 5: 커밋**

```bash
git add src/core/types/common.ts test/core/golden.test.ts test/core/fixtures.ts test/core/__snapshots__/stackedPie.png
git commit -m "feat(style): style·tickDirection 옵션 자리를 연다 — 골든은 classic 으로 못박는다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 토큰 모듈과 자리 → 글꼴 풀기 (TDD)

**Files:**
- Create: `src/core/canvas/style.ts`
- Modify: `src/core/canvas/renderer.ts:1-70`
- Modify: `src/core/index.ts:24-29`
- Test: `test/core/style.test.ts`

- [ ] **Step 1: 실패하는 시험을 쓴다**

`test/core/style.test.ts`:

```ts
// © 2026 김용현
// 양식 토큰 — classic 은 1.7.0 의 글꼴 문자열을 한 글자도 다르지 않게 내야 한다.
import { describe, it, expect } from 'vitest';
import {
  classicStyle, examStyle, styleOf, byStyle, tickDirOf, labelPlace, type TextPlace,
} from '../../src/core/canvas/style';
import { getFont, sansFont, textFont, textSize } from '../../src/core/canvas/renderer';
import { createDefaultGraphOptions } from '../../src/core/index';

const AXIS_PLACES: TextPlace[] = ['tick', 'unit', 'axisName', 'axisNameV', 'category', 'region', 'symbol', 'value'];
const SANS_PLACES: TextPlace[] = ['legend', 'title', 'source', 'year'];

describe('styleOf', () => {
  it('이름대로 고른다', () => {
    expect(styleOf({ style: 'classic' })).toBe(classicStyle);
    expect(styleOf({ style: 'exam' })).toBe(examStyle);
  });

  it('모르는 이름은 기본 양식으로 본다', () => {
    expect(styleOf({ style: 'zzz' as never })).toBe(styleOf({}));
  });
});

describe('classic 글꼴은 1.7.0 과 같다', () => {
  for (const fontFamily of ['serif', 'sans'] as const) {
    it.each(AXIS_PLACES)(`축 쪽 자리 %s (fontFamily ${fontFamily}) = getFont(…, 'bold')`, (place) => {
      const o = { ...createDefaultGraphOptions(), style: 'classic' as const, fontFamily };
      expect(textFont(o, place, 26)).toBe(getFont(26, o, 'bold'));
    });
  }

  it.each(SANS_PLACES)('고딕 자리 %s = bold + sansFont', (place) => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const };
    expect(textFont(o, place, 20)).toBe(`bold 20px ${sansFont(o)}`);
  });

  it('각주는 보통 굵기 고딕', () => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const };
    expect(textFont(o, 'footnote', 18)).toBe(`normal 18px ${sansFont(o)}`);
  });

  it('legacy 굵기·자리를 그대로 따른다', () => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const };
    expect(textFont(o, 'tick', 20, { weight: 'normal' })).toBe(getFont(20, o, 'normal'));
    expect(textFont(o, 'region', 20, { role: 'sans' })).toBe(getFont(20, o, 'bold', 'sans'));
  });

  it('custom 은 customFont 로 간다', () => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const, fontFamily: 'custom' as const, customFont: "'내글꼴'" };
    expect(textFont(o, 'tick', 20)).toBe("bold 20px '내글꼴'");
  });

  it('textSize 는 받은 1.7.0 식 값을 그대로 돌려준다', () => {
    const o = { ...createDefaultGraphOptions(), style: 'classic' as const };
    expect(textSize(o, 'legend', 23.7)).toBe(23.7);
    expect(textSize(o, 'footnote', 19.8)).toBe(19.8);
  });
});

describe('exam 글꼴', () => {
  const o = { ...createDefaultGraphOptions(), style: 'exam' as const };

  it('굵은 글자가 없다', () => {
    for (const place of [...AXIS_PLACES, ...SANS_PLACES, 'footnote' as const]) {
      expect(textFont(o, place, 30).startsWith('normal ')).toBe(true);
    }
  });

  it('legacy 를 읽지 않는다', () => {
    expect(textFont(o, 'tick', 30, { weight: 'bold', role: 'sans' })).toBe(textFont(o, 'tick', 30));
  });

  it('지명·단위·범례·출처·각주는 고딕, 항목 이름은 명조', () => {
    expect(textFont(o, 'region', 30)).toContain(sansFont(o));
    expect(textFont(o, 'unit', 30)).toContain(sansFont(o));
    expect(textFont(o, 'legend', 30)).toContain(sansFont(o));
    expect(textFont(o, 'category', 30)).toBe(getFont(30, o, 'normal', 'serif'));
  });

  it('fontFamily 를 고르면 축 쪽 자리가 그 자리를 따른다', () => {
    const custom = { ...o, fontFamily: 'custom' as const, customFont: "'내글꼴'" };
    expect(textFont(custom, 'tick', 30)).toBe("normal 30px '내글꼴'");
    expect(textFont(custom, 'legend', 30)).toContain(sansFont(custom));
  });

  it('크기는 자리 규칙 — 단위·범례·출처는 눈금 크기, 항목 이름은 ×1.37', () => {
    const fs = { title: 40, axisLabel: 39, tick: 35, dataLabel: 40 };
    const e = { ...o, fontSize: fs };
    expect(textSize(e, 'unit', 999)).toBe(35);
    expect(textSize(e, 'legend', 999)).toBe(35);
    expect(textSize(e, 'source', 999)).toBe(35);
    expect(textSize(e, 'category', 999)).toBeCloseTo(47.95, 2);
    expect(textSize(e, 'region', 999)).toBe(39);
    expect(textSize(e, 'footnote', 999)).toBeCloseTo(33.95, 2);
    // 식을 따르는 자리 — 1.7.0 식에 exam fontSize 가 들어간 값 그대로
    expect(textSize(e, 'value', 32)).toBe(32);
  });
});

describe('labelPlace', () => {
  it('괄호 기호는 항목, 한글은 지명, 나머지는 기호', () => {
    expect(labelPlace('(가)')).toBe('category');
    expect(labelPlace('전국')).toBe('region');
    expect(labelPlace('S_1')).toBe('symbol');
    expect(labelPlace('A')).toBe('symbol');
  });
});

describe('byStyle·tickDirOf', () => {
  it('byStyle 은 양식 이름으로 표를 고른다', () => {
    const table = { classic: 1, exam: 2 };
    expect(byStyle({ style: 'classic' }, table)).toBe(1);
    expect(byStyle({ style: 'exam' }, table)).toBe(2);
  });

  it('classic 은 늘 바깥', () => {
    expect(tickDirOf({ style: 'classic' }, { x: 'in', y: 'none' })).toEqual({ x: 'out', y: 'out' });
  });

  it('exam 은 종류 기본값', () => {
    expect(tickDirOf({ style: 'exam' }, { x: 'in', y: 'none' })).toEqual({ x: 'in', y: 'none' });
  });

  it('tickDirection 을 주면 양식과 상관없이 두 축 모두 그쪽', () => {
    expect(tickDirOf({ style: 'exam', tickDirection: 'out' }, { x: 'in', y: 'none' })).toEqual({ x: 'out', y: 'out' });
    expect(tickDirOf({ style: 'classic', tickDirection: 'in' }, { x: 'out', y: 'out' })).toEqual({ x: 'in', y: 'in' });
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run test/core/style.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/core/canvas/style"`.

- [ ] **Step 3: `src/core/canvas/style.ts` 를 만든다**

```ts
// © 2026 김용현
// 양식 토큰 — 시험지(exam)와 1.7.x(classic) 의 굵기·선·회색·범례 치수를 한 곳에 둔다.
//
// 렌더러는 이 표만 읽는다. 두 양식 사이에 if 문을 두지 않는다 — 갈리는 자리는 전부
// 이 표의 칸이다. 한 종류에서만 갈리는 값은 그 렌더러 안의 LOOK 표에 둔다.
//
// exam 값의 근거: planning/specs/2026-10-07-exam-style-measurements.md §1·§3.
// 1pt = 4.85px (단일 그래프 폭 165pt 를 800px 캔버스로).
//
// ⚠️ 이 파일은 renderer.ts 를 import 하지 않는다 — renderer.ts 가 이 파일을 쓴다.
import type { FontRole, GraphOptions, StyleName, TickDirection } from '../types/common';
import { LINE_DASH, type LineStyle } from '../types/line';

/** 눈금 하나가 축에서 어디로 뻗는가. `cross` 는 축을 가로지른다(방사형·편차 B). */
export type TickDir = TickDirection | 'none' | 'cross';

/** 글자 자리 — 시험지에서 글꼴·굵기·크기가 갈리는 단위 */
export type TextPlace =
  | 'tick'      // 눈금 숫자
  | 'unit'      // 축 단위 (만 명)·(%)
  | 'axisName'  // 축 이름
  | 'axisNameV' // 세로 축 이름 (한 자씩 쌓는 것)
  | 'category'  // 항목 이름 (가)·(나) — 명조
  | 'region'    // 지명·범주 글자 세계·서울·1위 — 고딕
  | 'symbol'    // 라틴 기호 A·B·S₁
  | 'value'     // 자료값 라벨
  | 'legend'    // 범례 글자
  | 'title'     // 제목 〈…〉
  | 'source'    // 출처 (통계청)
  | 'footnote'  // 각주
  | 'year';     // 연도 (2023) — sourceLeft

type FontSizes = GraphOptions['fontSize'];

export interface TextToken {
  weight: 'bold' | 'normal';
  /** 이 자리의 글꼴 자리. null 이면 options.fontFamily 를 따른다(1.7.0 의 축 쪽 글자). */
  role: FontRole | null;
  /** 축 쪽 글자인가 — 사용자가 fontFamily 를 serif 밖으로 고르면 exam 에서도 그것을 따른다 */
  axisSide: boolean;
  /** 글자 크기. classicPx = 1.7.0 이 그 자리에 쓰던 식의 값 */
  size: (fs: FontSizes, classicPx: number) => number;
}

export interface StyleTokens {
  name: StyleName;
  /** textFont 의 legacy 인자(1.7.0 의 자리별 예외)를 읽는가 */
  honorsLegacy: boolean;
  /** 기본 글자 크기 — createDefaultGraphOptions 가 쓴다 */
  fontSize: FontSizes;
  text: Record<TextPlace, TextToken>;
  ink: { source: string; footnote: string };
  line: {
    /** 축·바깥 틀 */
    axis: number;
    /** 눈금 표시 굵기·길이 */
    tick: number;
    tickLen: number;
    /** 축 도우미(axes.ts)·꺾은선·방사형 격자 */
    grid: number;
    gridDash: number[];
    gridColor: string;
    /** 막대류 격자 (1.7.0 은 축 격자와 값이 달랐다) */
    barGrid: number;
    barGridDash: number[];
    barGridColor: string;
    /** 막대·면 테두리 */
    barStroke: number;
    /** 계열 선 기본 굵기 */
    series: number;
    /** 강조 계열 선 (기후·편차의 기온선) */
    seriesStrong: number;
    /** 0 기준선 */
    zero: number;
    /** 표 바깥·안쪽 선 */
    tableOuter: number;
    tableInner: number;
  };
  legend: {
    /** 아래·오른쪽 범례 상자 테두리 */
    boxLine: number;
    boxColor: string;
    /** 플롯 안 범례 상자 테두리 */
    insideBoxLine: number;
    /** 아래·오른쪽 범례 상자 안 여백 (1.7.0 BOX_PADDING) */
    pad: number;
    /** 사각 견본 한 변 (1.7.0 16) */
    swatch: number;
    /** 선 견본 길이 (1.7.0 LINE_ICON_SIZE 36) */
    lineIcon: number;
    /** 견본과 글자 사이 (1.7.0 ICON_GAP 10) */
    iconGap: number;
    /** 플롯 안 범례 사각 견본 = 글자 크기 × 이 값 (1.7.0 0.95) */
    insideSwatchRatio: number;
  };
  marker: { r: number; stroke: number };
  seriesDash: Record<LineStyle, number[]>;
  /** 누적 채움 순서. 'pattern:<이름>' 은 패턴 */
  fills: string[];
  /** fills 를 다 쓰면 이 자리부터 되풀이한다 */
  fillsCycleFrom: number;
  /** 사선 빗금 타일 한 변·선 굵기 (선 사이 수직 간격 = tile / √2) */
  hatch: { tile: number; width: number };
  /** 어두운 칸 위 글자 — 흰 글자 / 검은 글자 + 흰 테두리 */
  darkLabel: 'white' | 'halo';
  haloWidth: number;
  /** i 번째 각주 앞 표 */
  footnoteMark: (i: number) => string;
  /** sourceInline 을 주지 않았을 때의 기본값 */
  sourceInline: boolean;
  /** 눈금 방향을 종류별 기본값으로 정하는가 (false 면 늘 바깥) */
  ticksByType: boolean;
}

const same = (_fs: FontSizes, classicPx: number) => classicPx;

/** classic 의 글자 자리 — 축 쪽은 bold + fontFamily, 고딕 자리는 bold + sans, 각주만 보통 */
const axisClassic = (): TextToken => ({ weight: 'bold', role: null, axisSide: true, size: same });
const sansClassic = (): TextToken => ({ weight: 'bold', role: 'sans', axisSide: false, size: same });

export const classicStyle: StyleTokens = {
  name: 'classic',
  honorsLegacy: true,
  fontSize: { title: 36, axisLabel: 28, tick: 26, dataLabel: 22 },
  text: {
    tick: axisClassic(),
    unit: axisClassic(),
    axisName: axisClassic(),
    axisNameV: axisClassic(),
    category: axisClassic(),
    region: axisClassic(),
    symbol: axisClassic(),
    value: axisClassic(),
    legend: sansClassic(),
    title: sansClassic(),
    source: sansClassic(),
    year: sansClassic(),
    footnote: { weight: 'normal', role: 'sans', axisSide: false, size: same },
  },
  ink: { source: '#555', footnote: '#555' },
  line: {
    axis: 2,
    tick: 1.5,
    tickLen: 6,
    grid: 0.5,
    gridDash: [4, 4],
    gridColor: '#ccc',
    barGrid: 0.5,
    barGridDash: [3, 3],
    barGridColor: '#ddd',
    barStroke: 0.8,
    series: 2,
    seriesStrong: 2.5,
    zero: 1,
    tableOuter: 2,
    tableInner: 1,
  },
  legend: {
    boxLine: 1.5,
    boxColor: '#888',
    insideBoxLine: 1,
    pad: 12,
    swatch: 16,
    lineIcon: 36,
    iconGap: 10,
    insideSwatchRatio: 0.95,
  },
  marker: { r: 4.5, stroke: 1.5 },
  seriesDash: LINE_DASH,
  fills: [
    '#333', '#999', '#666', '#fff',
    'pattern:diagonal', 'pattern:grid', 'pattern:diagonalGrid', 'pattern:dot',
    'pattern:dotReverse', 'pattern:vertical', 'pattern:horizontal',
  ],
  fillsCycleFrom: 4,
  hatch: { tile: 10, width: 1.5 },
  darkLabel: 'white',
  haloWidth: 3,
  footnoteMark: () => '* ',
  sourceInline: false,
  ticksByType: false,
};

/** 시험지 글자 — 굵은 글자는 표본 어디에도 없다(실측 §1.1) */
const examText = (role: FontRole, axisSide: boolean, size: TextToken['size']): TextToken =>
  ({ weight: 'normal', role, axisSide, size });

export const examStyle: StyleTokens = {
  name: 'exam',
  honorsLegacy: false,
  // 눈금 7.3pt·축 이름 8.0pt·제목 8.2pt·자료값 8.2pt (실측 §1.1) × 4.85
  fontSize: { title: 40, axisLabel: 39, tick: 35, dataLabel: 40 },
  text: {
    // 작업 14 에서 tick·symbol·value·year 의 자리를 'numeral' 로 바꾼다
    tick: examText('serif', true, same),
    unit: examText('sans', true, (fs) => fs.tick),
    axisName: examText('sans', true, (fs) => fs.axisLabel),
    axisNameV: examText('sans', true, (fs) => fs.tick * 0.93),
    category: examText('serif', true, (fs) => fs.tick * 1.37),
    region: examText('sans', true, (fs) => fs.axisLabel),
    symbol: examText('serif', true, same),
    value: examText('serif', true, same),
    legend: examText('sans', false, (fs) => fs.tick),
    title: examText('sans', false, same),
    source: examText('sans', false, (fs) => fs.tick),
    year: examText('serif', false, (fs) => fs.tick),
    footnote: examText('sans', false, (fs) => fs.tick * 0.97),
  },
  ink: { source: '#000', footnote: '#000' },
  line: {
    axis: 1.9,          // 0.39pt
    tick: 1.9,          // 0.39pt
    tickLen: 12,        // 2.5pt
    grid: 1.45,         // 0.30pt
    gridDash: [7.6, 4.7], // 1.56/0.96pt
    gridColor: '#000',
    barGrid: 1.45,
    barGridDash: [7.6, 4.7],
    barGridColor: '#000',
    barStroke: 1.75,    // 0.36pt
    series: 3.9,        // 0.81pt
    seriesStrong: 3.9,  // 기후·편차 기온선도 계열 선 0.81pt (실측 §2 deviation-a)
    zero: 1.75,         // 0.34–0.39pt
    tableOuter: 1.9,    // 0.39pt
    tableInner: 1.45,   // 0.30pt
  },
  legend: {
    boxLine: 1.7,       // 0.30–0.39pt
    boxColor: '#000',
    insideBoxLine: 1.7,
    pad: 15,            // 왼 2.7–4.0pt · 위 2.3–3.2pt 의 가운데
    swatch: 30,         // 6.2pt
    lineIcon: 112,      // 23pt
    iconGap: 14,        // 1.9–3.7pt
    insideSwatchRatio: 0.86, // 6.2 / 7.2
  },
  marker: { r: 6.8, stroke: 1.75 }, // 지름 2.8pt, 외곽 0.36pt
  seriesDash: {
    solid: [],
    dashed: [15, 6.8],             // 3.1/1.4pt
    dotted: [9.7, 4.9],            // 2.0/1.0pt (짧은 점선)
    dashdot: [41, 4.9, 5.3, 4.9],  // 8.5/1.0/1.1/1.0pt
  },
  // 연회색 217 → 진회색 127 → 빗금 → 흰색 (absbar 2026_11), 그다음 5단계 회색
  fills: [
    '#d9d9d9', '#7f7f7f', 'pattern:diagonal', '#ffffff',
    '#b2b2b2', '#3f3f3f', '#e5e5e5', '#999999', '#cbcbcb',
    'pattern:grid', 'pattern:dot', 'pattern:vertical', 'pattern:horizontal',
  ],
  fillsCycleFrom: 9,
  hatch: { tile: 15, width: 2 }, // 수직 간격 10.6px = 2.2pt, 선 0.42pt
  darkLabel: 'halo',
  haloWidth: 8,                  // strokeText 는 획 가운데로 그린다 — 한쪽 4px = 0.8pt (실측 0.7–1.0pt)
  footnoteMark: (i) => '* '.repeat(i + 1),
  sourceInline: true,
  ticksByType: true,
};

const STYLES: Record<StyleName, StyleTokens> = { classic: classicStyle, exam: examStyle };

/** 양식을 적지 않은 옵션이 받는 양식. 작업 17 에서 'exam' 으로 바꾼다. */
export const DEFAULT_STYLE: StyleName = 'classic';

export function styleOf(o: { style?: StyleName }): StyleTokens {
  return STYLES[o.style as StyleName] ?? STYLES[DEFAULT_STYLE];
}

/** 한 종류에서만 갈리는 값 — 렌더러 안의 LOOK 표에서 고른다 */
export function byStyle<T>(o: { style?: StyleName }, table: Record<StyleName, T>): T {
  return table[styleOf(o).name];
}

/**
 * 눈금 방향. `tickDirection` 을 주면 두 축 모두 그쪽, 아니면 classic 은 늘 바깥,
 * exam 은 종류별 시험지 다수결(`byType`).
 */
export function tickDirOf(
  o: { style?: StyleName; tickDirection?: TickDirection },
  byType: { x: TickDir; y: TickDir },
): { x: TickDir; y: TickDir } {
  if (o.tickDirection === 'in' || o.tickDirection === 'out') {
    return { x: o.tickDirection, y: o.tickDirection };
  }
  return styleOf(o).ticksByType ? byType : { x: 'out', y: 'out' };
}

/**
 * 한 호출로 `(가)`·`전국`·`A` 를 다 그리는 자리(산점 점 이름, 경제 선 이름)에서
 * 글자를 보고 자리를 고른다. classic 에서는 셋 다 같은 글꼴이라 그림이 같다.
 */
export function labelPlace(text: string): TextPlace {
  const s = text.trim();
  if (/^\(.+\)$/.test(s)) return 'category';
  return /[가-힣]/.test(s) ? 'region' : 'symbol';
}
```

- [ ] **Step 4: `renderer.ts` 에 자리 풀기를 더한다**

`src/core/canvas/renderer.ts` 맨 위 import 를 바꾼다:

```ts
import type { FontRole, FontStack, GraphOptions, StyleName } from '../types/common';
import { styleOf, type TextPlace } from './style';
```

`FontOptions` 에 칸 하나를 더한다:

```ts
export interface FontOptions {
  fontFamily?: FontRole;
  customFont?: string;
  fontStack?: FontStack;
  /** 양식 — 자리마다 굵기·글꼴을 고른다. `styleOf` 참고 */
  style?: StyleName;
}
```

`getFont` 함수 바로 아래에:

```ts
/** 1.7.0 이 그 자리에서 쓰던 굵기·자리. classic 에서만 읽힌다. */
export interface Legacy {
  weight?: 'bold' | 'normal';
  role?: FontRole;
}

/**
 * 글자 자리의 크기(px).
 *
 * `classicPx` 는 1.7.0 이 그 자리에 쓰던 식의 값이다. classic 은 그대로 쓰고,
 * exam 은 자리 규칙(실측 §1.1 의 «비»)으로 정한다. fontSize 가 없는 옵션
 * (손으로 만든 FontOptions)은 classicPx 를 그대로 돌려준다.
 */
export function textSize(
  o: FontOptions & { fontSize?: GraphOptions['fontSize'] },
  place: TextPlace,
  classicPx: number,
): number {
  return o.fontSize ? styleOf(o).text[place].size(o.fontSize, classicPx) : classicPx;
}

/**
 * 글자 자리의 글꼴 문자열 `${weight} ${size}px ${stack}`.
 *
 * 렌더러는 굵기와 글꼴 자리를 직접 고르지 않는다 — 그 자리가 무엇인지만 말한다.
 * `legacy` 는 1.7.0 이 그 호출에서 쓰던 예외(보통 굵기·특정 자리)이고 classic
 * 에서만 읽힌다. 그래야 classic 그림이 한 픽셀도 달라지지 않는다.
 */
export function textFont(o: FontOptions, place: TextPlace, size: number, legacy: Legacy = {}): string {
  const t = styleOf(o);
  const tok = t.text[place];
  const chosen = o.fontFamily && o.fontFamily !== 'serif' && tok.axisSide
    ? o.fontFamily
    : (tok.role ?? o.fontFamily ?? 'serif');
  const weight = (t.honorsLegacy && legacy.weight) || tok.weight;
  const role = (t.honorsLegacy && legacy.role) || chosen;
  return getFont(size, o, weight, role);
}
```

- [ ] **Step 5: core 공개 표면에 더한다**

`src/core/index.ts` 의 «공용 유틸» 블록을 바꾼다:

```ts
export {
  getFont, fontStackOf, sansFont, textFont, textSize, clearCanvas, niceStep, autoRange,
  DEFAULT_SERIF_STACK, DEFAULT_SANS_STACK,
} from './canvas/renderer';
export type { Padding, CanvasSize, FontOptions, Legacy } from './canvas/renderer';
export { classicStyle, examStyle, styleOf, byStyle, tickDirOf, labelPlace } from './canvas/style';
export type { StyleTokens, TextPlace, TickDir } from './canvas/style';
```

- [ ] **Step 6: 시험 통과 확인**

Run: `npx vitest run test/core/style.test.ts && npm run typecheck`
Expected: style.test.ts 전부 PASS, 타입 오류 없음.

- [ ] **Step 7: 전체 시험 — 아직 아무 그림도 안 바뀌었다**

Run: `npx vitest run`
Expected: 기존 746 + 새 style 시험 전부 PASS.

- [ ] **Step 8: 커밋**

```bash
git add src/core/canvas/style.ts src/core/canvas/renderer.ts src/core/index.ts test/core/style.test.ts
git commit -m "feat(style): 양식 토큰과 글자 자리 풀기 — classic 은 1.7.0 글꼴 문자열 그대로

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 축 도우미·제목·출처·각주를 토큰으로

**Files:**
- Modify: `src/core/canvas/axes.ts` (전부 152–331 줄 범위 — 아래 표)
- Modify: `src/core/canvas/labels.ts:1-178`

이 작업은 classic 그림을 바꾸지 않는다. 증거는 골든 86건(43장).

- [ ] **Step 1: `axes.ts` — 아래 표대로 바꾼다**

맨 위 import 에 `textFont, textSize` 와 `styleOf` 를 더한다:

```ts
import { type Padding, type FontOptions, textFont, textSize } from './renderer';
import { styleOf } from './style';
```

`YAxisParams` 의 두 칸 설명을 고친다:

```ts
  /** 격자선 색 — 미지정이면 양식의 격자 색 (classic #ccc) */
  gridColor?: string;
  /** 격자선 굵기(px) — 미지정이면 양식의 격자 굵기 (classic 0.5) */
  gridWidth?: number;
```

`drawYAxis` 서명과 몸통:

| 지금 코드 (axes.ts) | 바꿀 코드 |
|---|---|
| `gridColor = '#ccc',` / `gridWidth = 0.5,` (구조 분해 기본값, 198–199) | `gridColor,` / `gridWidth,` |
| 함수 첫 줄 `const plot = plotArea(padding, width, height);` 다음 | `const t = styleOf(fonts);` 한 줄 추가, 이어서 `const tickLen = t.line.tickLen;` `const tickGap = tickLen + 6;` |
| `ctx.lineWidth = 2;` (205) | `ctx.lineWidth = t.line.axis;` |
| `// 눈금 — 모두 bold` / `ctx.font = getFont(tickFontSize, fonts, 'bold');` (211–213) | `// 눈금 숫자` / `ctx.font = textFont(fonts, 'tick', tickFontSize);` |
| `ctx.lineWidth = 1.5;` (233) | `ctx.lineWidth = t.line.tick;` |
| `ctx.moveTo(x - 6, y);` (236) | `ctx.moveTo(x - tickLen, y);` |
| `ctx.lineTo(x + 6, y);` (240) | `ctx.lineTo(x + tickLen, y);` |
| `ctx.strokeStyle = gridColor;` `ctx.lineWidth = gridWidth;` `ctx.setLineDash([4, 4]);` (247–249) | `ctx.strokeStyle = gridColor ?? t.line.gridColor;` `ctx.lineWidth = gridWidth ?? t.line.grid;` `ctx.setLineDash(t.line.gridDash);` |
| `const tx = side === 'left' ? x - 12 : x + 12;` (259) | `const tx = side === 'left' ? x - tickGap : x + tickGap;` |
| `const makeFont = (size: number) => getFont(size, fonts, 'bold');` (272) | `const makeFont = (size: number) => textFont(fonts, 'unit', size);` |
| `ctx.font = makeFont(shrinkToWidth(ctx, [label], labelFontSize, width - EDGE * 2, makeFont));` (277) | 위 줄에 `const unitSize = textSize(fonts, 'unit', labelFontSize);` 를 두고 `ctx.font = makeFont(shrinkToWidth(ctx, [label], unitSize, width - EDGE * 2, makeFont));` |
| `const labelX = side === 'left' ? x - 12 : x + 12;` (278) | `const labelX = side === 'left' ? x - tickGap : x + tickGap;` |

⚠️ `textSize` 는 `fontSize` 가 있는 옵션에서만 exam 규칙을 쓴다. `AxisOptions.fonts` 의 타입을 `FontOptions & { fontSize?: GraphOptions['fontSize'] }` 로 넓힌다 — 렌더러는 모두 `fonts: options` 를 넘기므로 그대로 맞는다. import 에 `import type { GraphOptions } from '../types/common';` 추가. (2026-10-08 임시 worktree 에서 작업 1–3 을 이 계획대로 적용해 typecheck·골든 86건·font-stack·overflow 통과를 확인했다.)

`drawXAxis`:

| 지금 코드 | 바꿀 코드 |
|---|---|
| 첫 줄 다음 | `const t = styleOf(fonts);` |
| `ctx.lineWidth = 2;` (294) | `ctx.lineWidth = t.line.axis;` |
| `ctx.font = getFont(tickFontSize, fonts, 'bold');` (301) | `ctx.font = textFont(fonts, 'tick', tickFontSize);` |
| `ctx.lineWidth = 1.5;` (316) | `ctx.lineWidth = t.line.tick;` |
| `ctx.lineTo(cx, y + 6);` (319) | `ctx.lineTo(cx, y + t.line.tickLen);` |
| `ctx.fillText(labels[i], cx, y + 12);` (323) | `ctx.fillText(labels[i], cx, y + t.line.tickLen + 6);` |

`getFont` import 가 더 안 쓰이면 지운다(린트가 잡는다).

- [ ] **Step 2: `labels.ts` — 제목·출처·각주**

import 를 바꾼다:

```ts
import { textFont, textSize, type FontOptions } from './renderer';
import { styleOf } from './style';
import type { GraphOptions } from '../types/common';

/** 출처·각주 도우미가 받는 옵션 — 렌더러는 options 를 통째로 넘긴다 */
type LabelFonts = FontOptions & { fontSize?: GraphOptions['fontSize'] };
```

`TitleParams.fonts` 와 `SourceFootnoteParams.fonts` 의 타입을 `LabelFonts` 로 바꾼다.

`drawTitle`:

| 지금 (labels.ts) | 바꿀 코드 |
|---|---|
| `const labelFont = sansFont(fonts);` `const makeFont = (size: number) => \`bold ${size}px ${labelFont}\`;` (50–51) | `const makeFont = (size: number) => textFont(fonts, 'title', size);` |

`drawSourceAndFootnote` 몸통을 이렇게 바꾼다(88–178 줄 전체 교체 — 배치 논리는 같고, 크기·글꼴·색·각주 표·출처 자리 기본값만 토큰을 읽는다):

```ts
export function drawSourceAndFootnote({
  ctx, plotX, plotW, height, source, sourceLeft, sourceInline, footnotes, fontSize, fonts, canvasWidth,
}: SourceFootnoteParams) {
  ctx.save();
  const t = styleOf(fonts);
  const srcSize = textSize(fonts, 'source', fontSize);
  const noteSize = textSize(fonts, 'footnote', fontSize * 0.9);
  const yearSize = textSize(fonts, 'year', fontSize);

  // 출처·연도는 오른쪽 **끝**, 각주는 왼쪽 **끝**에 붙인다 (2026-08-04 사용자 결정).
  // 예전에는 플롯 영역에 맞춰 안쪽으로 들여써서 그림 가운데에 뜬 것처럼 보였다.
  let leftX = plotX;
  let rightX = plotX + plotW;
  if (canvasWidth != null) {
    leftX = EDGE_MARGIN;
    rightX = canvasWidth - EDGE_MARGIN;
  }

  // 위에서 아래로: 출처 → 각주들.
  // 단 sourceLeft 를 주면 순서가 뒤집힌다 — 각주 아래에 "(연도) ... (출처)" 한 줄.
  const filtered = footnotes.filter((f) => f.trim());
  const totalFootnoteH = filtered.length * (noteSize + 4);
  const sourceBelow = !!sourceLeft;
  // 시험지 관습 — 출처를 마지막 각주와 **같은 줄** 오른쪽 끝에 둔다.
  // 주지 않으면 양식의 기본값(exam 은 켜짐). 각주가 없으면 놓을 줄이 없으므로 기존 배치.
  const inlineSource = !!(sourceInline ?? t.sourceInline) && !!source && !sourceBelow && filtered.length > 0;
  const sourceH = (source || sourceLeft) && !inlineSource ? srcSize + 4 : 0;
  let y = height - 6 - totalFootnoteH - (sourceBelow ? sourceH : 0);

  // 각주는 왼쪽 끝에서 시작해 오른쪽으로 흐른다. 캔버스를 넘으면 잘리므로
  // 쓸 수 있는 폭을 미리 재 두고, 넘치는 글은 글꼴을 줄여 맞춘다.
  const rightEdge = canvasWidth != null ? rightX : plotX + plotW;
  const available = Math.max(0, rightEdge - leftX);

  const sourceFont = (size: number) => textFont(fonts, 'source', size);

  if (source && !sourceBelow && !inlineSource) {
    ctx.fillStyle = t.ink.source;
    const size = fitFontSize(ctx, source, srcSize, available, sourceFont);
    ctx.font = sourceFont(size);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(source, rightX, y, available > 0 ? available : undefined);
    y += sourceH;
  }

  // 같은 줄에 출처가 들어오면 각주가 쓸 수 있는 폭이 그만큼 줄어든다
  ctx.font = sourceFont(srcSize);
  const inlineSourceW = inlineSource ? ctx.measureText(source).width + 16 : 0;
  const footnoteAvailable = Math.max(0, available - inlineSourceW);

  let lastFootnoteY = y;
  for (let i = 0; i < filtered.length; i++) {
    const text = t.footnoteMark(i) + filtered[i];
    ctx.fillStyle = t.ink.footnote;
    const makeFont = (size: number) => textFont(fonts, 'footnote', size);
    const size = fitFontSize(ctx, text, noteSize, footnoteAvailable, makeFont);
    ctx.font = makeFont(size);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, leftX, y, footnoteAvailable > 0 ? footnoteAvailable : undefined);
    lastFootnoteY = y;
    y += noteSize + 4;
  }

  // 마지막 각주와 같은 줄, 오른쪽 끝
  if (inlineSource) {
    ctx.fillStyle = t.ink.source;
    const size = fitFontSize(ctx, source, srcSize, inlineSourceW, sourceFont);
    ctx.font = sourceFont(size);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(source, rightX, lastFootnoteY, inlineSourceW > 0 ? inlineSourceW : undefined);
  }

  // 각주 아래 출처 줄 — 왼쪽에 자료 연도, 오른쪽에 출처 기관
  if (sourceBelow) {
    const yearFont = (size: number) => textFont(fonts, 'year', size);
    const half = available > 0 ? available / 2 : 0;
    ctx.fillStyle = t.ink.source;
    ctx.textBaseline = 'bottom';

    ctx.font = yearFont(fitFontSize(ctx, sourceLeft!, yearSize, half, yearFont));
    ctx.textAlign = 'left';
    ctx.fillText(sourceLeft!, leftX, height - 6, half > 0 ? half : undefined);

    if (source) {
      ctx.font = sourceFont(fitFontSize(ctx, source, srcSize, half, sourceFont));
      ctx.textAlign = 'right';
      ctx.fillText(source, rightX, height - 6, half > 0 ? half : undefined);
    }
  }

  ctx.restore();
}
```

classic 이 같다는 근거: `srcSize = fontSize`, `noteSize = fontSize * 0.9`, `yearSize = fontSize`, `footnoteMark → '* '`, 색 `#555`, `sourceInline ?? false`. 각주 글꼴은 1.7.0 의 `` `${size}px …` `` 가 `normal ${size}px …` 로 바뀌는데 그리는 픽셀은 같다(굵기 생략 = normal).

`sansFont` import 가 더 안 쓰이면 지운다.

- [ ] **Step 3: 골든·글꼴 시험**

Run: `npm run typecheck && npx vitest run test/core/golden.test.ts test/core/font-stack.test.ts test/core/overflow.test.ts`
Expected: 전부 PASS (골든 86건 포함).

- [ ] **Step 4: 커밋**

```bash
git add src/core/canvas/axes.ts src/core/canvas/labels.ts
git commit -m "refactor(style): 축·눈금·격자·제목·출처·각주를 토큰으로 옮긴다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 범례·채움 패턴을 토큰으로

**Files:**
- Modify: `src/core/canvas/legend.ts` (아래 표)
- Modify: `src/core/canvas/patterns.ts:13-215`
- Modify: `src/core/graphs/AbsBarGraph.ts:104,168,197,332,361,419`, `src/core/graphs/StackedBarPie.ts:438,444` (패턴 함수 서명이 바뀌는 호출부)

- [ ] **Step 1: `legend.ts`**

import 를 바꾼다:

```ts
import { textFont, type FontOptions } from './renderer';
import { styleOf } from './style';
```

| 지금 (legend.ts) | 바꿀 코드 |
|---|---|
| `ctx.strokeStyle = '#000';` `ctx.lineWidth = 1;` (118–119, 플롯 안 상자) | `ctx.strokeStyle = '#000';` `ctx.lineWidth = styleOf(fonts).legend.insideBoxLine;` — 이를 위해 `InsideLegendParams` 에 `fonts: FontOptions;` 를 **필수**로 더하고 호출부 3곳(`AbsBarGraph.ts:405-413`, `DeviationAGraph.ts:236-244`, `EconPlane.ts:625-635`, `ScatterBubble` 의 `drawInsideLegend` 호출이 있으면 그것까지 — `grep -n "drawInsideLegend(" src/core/graphs/*.ts` 로 전부)에 `fonts: options,` 를 넣는다 |
| `const swatch = fs * 0.95;` (84) | `const swatch = fs * styleOf(fonts).legend.insideSwatchRatio;` |
| `const LINE_ICON_SIZE = 36;` (176) | 지운다 |
| `ctx.font = \`bold ${fontSize}px ${sansFont(fonts)}\`;` (measureLegendWidth, 227) | `ctx.font = textFont(fonts, 'legend', fontSize);` |
| `const iconSize = iconType === 'line' ? LINE_ICON_SIZE : 16;` `const iconGap = 10;` `const padding = 12;` (228–230) | `const lg = styleOf(fonts).legend;` `const iconSize = iconType === 'line' ? lg.lineIcon : lg.swatch;` `const iconGap = lg.iconGap;` `const padding = lg.pad;` |
| `layoutBottomLegend`: `const iconGap = opts.iconGap ?? ICON_GAP;` `const padding = opts.padding ?? BOX_PADDING;` (274–275) | `const lg = styleOf(fonts).legend;` `const iconGap = opts.iconGap ?? lg.iconGap;` `const padding = opts.padding ?? lg.pad;` |
| `const legendFont = sansFont(fonts);` `const fontOf = (fs: number) => (opts.font ? withFontSize(opts.font, fs) : \`bold ${fs}px ${legendFont}\`);` (277–278) | `const fontOf = (fs: number) => (opts.font ? withFontSize(opts.font, fs) : textFont(fonts, 'legend', fs));` |
| `measureBottomLegend`: `const sizeOf = (t: …) => (t === 'line' ? LINE_ICON_SIZE : 16);` (337) | `const lg = styleOf(fonts).legend;` `const sizeOf = (k: 'rect' \| 'circle' \| 'line') => (k === 'line' ? lg.lineIcon : lg.swatch);` |
| `drawLegend`: `const legendFont = sansFont(fonts);` … `ctx.font = \`bold ${fontSize}px ${legendFont}\`;` (354–356) | `const lg = styleOf(fonts).legend;` `ctx.font = textFont(fonts, 'legend', fontSize);` |
| `const iconGap = ICON_GAP;` `const padding = BOX_PADDING;` (358–359) | `const iconGap = lg.iconGap;` `const padding = lg.pad;` |
| `const iconWidthOf = (item: LegendItem) => (item.type === 'line' ? LINE_ICON_SIZE : 16);` (361) | `const iconWidthOf = (item: LegendItem) => (item.type === 'line' ? lg.lineIcon : lg.swatch);` |
| 아래 상자 `ctx.strokeStyle = '#888';` `ctx.lineWidth = 1.5;` (378–379) | `ctx.strokeStyle = lg.boxColor;` `ctx.lineWidth = lg.boxLine;` |
| `ctx.font = \`bold ${layout.fontSize}px ${legendFont}\`;` (396) | `ctx.font = textFont(fonts, 'legend', layout.fontSize);` |
| 오른쪽 상자 `ctx.strokeStyle = '#888';` `ctx.lineWidth = 1.5;` (417–418) | `ctx.strokeStyle = lg.boxColor;` `ctx.lineWidth = lg.boxLine;` |
| `ctx.font = \`bold ${fontSize}px ${legendFont}\`;` (431) | `ctx.font = textFont(fonts, 'legend', fontSize);` |

`ICON_GAP`·`BOX_PADDING` 상수는 `layoutBottomLegend` 의 기본값으로 더 안 쓰이면 지운다(`ITEM_SPACING`·`ROW_GAP` 은 남긴다 — 실측 없음).

⚠️ `drawIcon` 의 원 지름 `size / 2.5`·선 견본 가운데 점 3.5 는 classic 값 그대로 둔다. exam 에서 사각 견본은 `swatch` 30px, 선 견본 길이는 `lineIcon` 112px 가 된다.

- [ ] **Step 2: `patterns.ts` — 채움 순서와 빗금을 토큰에서**

파일 머리 import:

```ts
import type { StyleTokens } from './style';
```

`makeTile`·`createPatternCanvas` 를 타일 크기를 받게 바꾸고, 사선만 토큰을 읽는다:

```ts
function makeTile(
  ctx: CanvasRenderingContext2D,
  size: number,
  draw: (pctx: CanvasRenderingContext2D, s: number) => void
): HTMLCanvasElement {
  const c = createTileCanvas(ctx, size);
  const p = c.getContext('2d')!;
  // 기본 흰색 배경
  p.fillStyle = '#fff';
  p.fillRect(0, 0, size, size);
  draw(p, size);
  return c;
}

function createPatternCanvas(ctx: CanvasRenderingContext2D, type: PatternType, t: StyleTokens): HTMLCanvasElement {
  switch (type) {
    case 'diagonal':
      // 시험지 빗금은 선 사이 수직 간격 2.2pt·선 0.42pt (실측 §1.3) — 양식이 정한다
      return makeTile(ctx, t.hatch.tile, (p, s) => {
        p.strokeStyle = '#000';
        p.lineWidth = t.hatch.width;
        p.beginPath();
        // 사선 (/) 패턴 — 타일 이음새 처리
        p.moveTo(0, s);
        p.lineTo(s, 0);
        p.moveTo(-s * 0.5, s * 0.5);
        p.lineTo(s * 0.5, -s * 0.5);
        p.moveTo(s * 0.5, s * 1.5);
        p.lineTo(s * 1.5, s * 0.5);
        p.stroke();
      });
    case 'grid':
      return makeTile(ctx, TILE, (p, s) => { /* 기존 그대로 */ });
    // diagonalGrid · dot · dotReverse · vertical · horizontal — 모두 makeTile(ctx, TILE, …) 로, 몸통은 기존 그대로
  }
}
```

(위 주석 «기존 그대로» 자리는 지금 파일 51–125 줄의 몸통을 한 글자도 바꾸지 않고 옮긴다. 바뀌는 것은 `makeTile` 둘째 인자와 `diagonal` 의 `p.lineWidth` 뿐.)

채움 순서 부분(129–215 줄)을 바꾼다:

```ts
// ── 누적 차트 채움 시스템 ─────────────────────────────
//
// 순서는 양식 토큰(`fills`)이 정한다. classic: 단색 회색 셋 → 흰색 → 패턴 일곱.
// exam: 연회색 217 → 진회색 127 → 빗금 → 흰색 → 회색 다섯 단계 → 패턴 (실측 §1.3).

const PATTERN_ORDER: PatternType[] = [
  'diagonal', 'grid', 'diagonalGrid', 'dot', 'dotReverse', 'vertical', 'horizontal',
];

// 컨텍스트별 패턴 캐시 — 같은 이름이라도 양식마다 타일이 다르다
const cache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>();

function getCached(ctx: CanvasRenderingContext2D, type: PatternType, t: StyleTokens): CanvasPattern {
  let m = cache.get(ctx);
  if (!m) {
    m = new Map();
    cache.set(ctx, m);
  }
  const key = `${t.name}:${type}`;
  let pat = m.get(key);
  if (!pat) {
    pat = ctx.createPattern(createPatternCanvas(ctx, type, t), 'repeat')!;
    m.set(key, pat);
  }
  return pat;
}

/** index 번째 계열의 채움 지정값(문자열) — 토큰 순서를 다 쓰면 fillsCycleFrom 부터 되풀이 */
export function stackedFillValue(index: number, t: StyleTokens): string {
  const { fills, fillsCycleFrom } = t;
  if (index < fills.length) return fills[index];
  const span = fills.length - fillsCycleFrom;
  return fills[fillsCycleFrom + ((index - fills.length) % span)];
}

/** 누적 차트의 index번째 항목 채움값 반환 */
export function getStackedFill(
  ctx: CanvasRenderingContext2D,
  index: number,
  t: StyleTokens,
): string | CanvasPattern {
  return resolveFill(ctx, stackedFillValue(index, t), t);
}

/** 채움 지정값에서 패턴을 가리키는 접두사 — 예: `'pattern:diagonal'` */
export const PATTERN_FILL_PREFIX = 'pattern:';

/**
 * 채움 지정값(문자열)을 실제 채움으로 바꾼다.
 *
 * `'pattern:diagonal'` 이면 사선 빗금 패턴을, 그 밖에는 색 문자열을 그대로 쓴다.
 * 색과 패턴을 한 문자열 타입으로 다루는 이유는 프로젝트 저장(JSON)에 그대로
 * 실려야 하기 때문이다 — CanvasPattern 은 직렬화할 수 없다.
 */
export function resolveFill(
  ctx: CanvasRenderingContext2D,
  value: string,
  t: StyleTokens,
): string | CanvasPattern {
  if (!value.startsWith(PATTERN_FILL_PREFIX)) return value;
  const type = value.slice(PATTERN_FILL_PREFIX.length) as PatternType;
  return PATTERN_ORDER.includes(type) ? getCached(ctx, type, t) : value;
}

/** 그 채움이 밝아서 테두리를 그려야 하는가 (흰색·빗금 등) */
export function isLightFillValue(value: string): boolean {
  // … 기존 몸통 그대로 (191–203 줄) …
}

/** 밝은 채움인지 (흰색/패턴) — 테두리·라벨색 결정용 */
export function isLightFill(index: number, t: StyleTokens): boolean {
  return isLightFillValue(stackedFillValue(index, t));
}
```

`SOLID_FILLS`·`isDarkPattern` 은 지운다. classic 이 같다는 근거: `#333`·`#999`·`#666` 은 밝기 51·153·102 로 180 이하 → 어둡다, `#fff` 와 `dotReverse` 를 뺀 패턴은 밝다 — 1.7.0 의 `index >= 3 && !isDarkPattern` 과 같은 답이다.

- [ ] **Step 3: 서명이 바뀐 호출부**

`src/core/graphs/AbsBarGraph.ts` 렌더 함수 첫머리(`clearCanvas` 다음 줄)에 `const t = styleOf(options);` 를 두고(import: `import { styleOf } from '../canvas/style';`):

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 104 | `getStackedFill(ctx, i) : resolveFill(ctx, v)` | `getStackedFill(ctx, i, t) : resolveFill(ctx, v, t)` |
| 168, 197, 332, 361 | `isLightFill(s)` | `isLightFill(s, t)` |
| 419 | `isLightFill(i)` | `isLightFill(i, t)` |

`src/core/graphs/StackedBarPie.ts`:

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 438 | `getStackedFill(ctx, i) : resolveFill(ctx, v)` | `getStackedFill(ctx, i, styleOf(options)) : resolveFill(ctx, v, styleOf(options))` — 이 도우미 함수가 `options` 를 받지 않으면 `t: StyleTokens` 인자를 하나 더 받게 하고 호출부에 `styleOf(options)` 를 넘긴다 |
| 444 | `isLightFill(i)` | `isLightFill(i, t)` (같은 방식) |

`grep -rn "getStackedFill\|isLightFill(\|resolveFill(" src` 가 위 자리 말고 다른 곳을 보이면 같은 방식으로 고친다.

- [ ] **Step 4: 시험**

Run: `npm run typecheck && npx vitest run`
Expected: 전부 PASS — 골든 86건 바이트 동일.

- [ ] **Step 5: 커밋**

```bash
git add src/core/canvas/legend.ts src/core/canvas/patterns.ts src/core/graphs/AbsBarGraph.ts src/core/graphs/StackedBarPie.ts src/core/graphs/DeviationAGraph.ts src/core/graphs/EconPlane.ts src/core/graphs/ScatterBubble.ts
git commit -m "refactor(style): 범례 치수·채움 순서·빗금을 토큰으로 옮긴다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git status` 로 실제로 바뀐 렌더러만 더한다 — 위 목록 중 안 바뀐 파일은 빼도 된다.)

---

### Task 5: 막대 둘(절댓값·누적 막대) 토큰화

**Files:**
- Modify: `src/core/graphs/AbsBarGraph.ts`, `src/core/graphs/StackedBarPie.ts:1-258,432-445` (원그래프 260–418·`drawSegmentLabel` 453–489 는 Task 11)

렌더러 작업(5–11) 공통 규칙:
- import: `import { textFont, textSize } from '../canvas/renderer';` + `import { styleOf, byStyle, tickDirOf, labelPlace, type TextPlace, type StyleTokens } from '../canvas/style';` (쓰는 것만). `getFont`·`sansFont` 는 더 안 쓰면 import 에서 지운다.
- render 함수 첫머리(`clearCanvas(...)` 다음 줄): `const t = styleOf(options);`, 파일에 `LOOK` 표가 있으면 `const look = byStyle(options, LOOK);`. Task 4 에서 이미 `t` 를 두었으면 다시 두지 않는다.
- 범례 크기 식은 한 번만 계산한다: `const legendFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5);`
- **classic 은 한 픽셀도 바뀌면 안 된다.** 표의 «바꿀 코드» 는 classic 에서 1.7.0 과 같은 값·같은 글꼴 문자열을 내도록 골랐다. 표에 없는 박힌 숫자(글자 여백 등)는 배치 값이라 그대로 둔다.
- `LOOK` 표에는 이 단계에서 안 읽는 구조 칸(`catTicks` 등)도 함께 적는다 — 작업 19–24 가 읽는다. 지금 안 쓰는 칸 때문에 린트가 막히지는 않는다(객체 속성).
- 관문: `npm run typecheck && npm run lint && npx vitest run` → 전부 PASS, 골든 86건. 하나라도 다르면 그 파일의 바뀐 줄을 하나씩 되돌려 원인을 찾는다(`UPDATE_GOLDEN` 금지).

- [ ] **Step 1: `AbsBarGraph.ts`**

```ts
const LOOK = {
  // 눈금 0.39pt·2.5pt (§3 #24), 0 기준선 0.34–0.39pt, 범주 경계 눈금 (#25)
  classic: { tick: 1, tickLen: 5, zero: 1.5, catTicks: false, unitAdjacent: false },
  exam: { tick: 1.9, tickLen: 12, zero: 1.75, catTicks: true, unitAdjacent: true },
};
```

`hasGroups`(29) 정의 다음에:

```ts
  const tickFs = textSize(options, 'tick', options.fontSize.tick);
  const unitFs = textSize(options, 'unit', options.fontSize.axisLabel);
  const valueFs = textSize(options, 'value', options.fontSize.dataLabel * 0.8);
  // 범주 이름은 대개 (가) — 2단 가로 막대에서는 1990년 같은 글자다
  const catPlace: TextPlace = hasGroups ? 'region' : 'category';
  const catFs = textSize(options, catPlace, options.fontSize.tick);
  // groups[].label 은 A·B
  const groupFs = textSize(options, 'symbol', options.fontSize.tick);
  const inLegFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.9);
```

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 21 | `? measureLegendWidth(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5, options)` | `? measureLegendWidth(ctx, data.seriesLabels, legendFs, options)` |
| 35 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` | 지운다. 37 줄(그룹 이름 재기) 앞에 `ctx.font = textFont(options, 'symbol', groupFs);`, 38 줄(범주 이름 재기) 앞에 `ctx.font = textFont(options, catPlace, catFs);` |
| 40 | `ctx.font = getFont(options.fontSize.axisLabel, options, 'bold');` | `ctx.font = textFont(options, 'unit', unitFs);` |
| 53 | `? measureBottomLegend(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5, w - padLeft - padRight, options)` | `? measureBottomLegend(ctx, data.seriesLabels, legendFs, w - padLeft - padRight, options)` |
| 114 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 164, 193, 328, 357 | `ctx.lineWidth = 0.8;` | `ctx.lineWidth = t.line.barStroke;` |
| 169, 198, 333, 362 | `ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');` | `ctx.font = textFont(options, 'value', valueFs);` |
| 211 | `ctx.lineWidth = 1.5;` (0 기준선) | `ctx.lineWidth = look.zero;` |
| 223, 376 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` (범주 이름) | `ctx.font = textFont(options, catPlace, catFs);` |
| 383 | `if (hasGroups) {` 블록 첫 줄 | `ctx.font = textFont(options, 'symbol', groupFs);` 를 더한다(지금은 376 글꼴을 물려받는다 — classic 문자열이 같다) |
| 252 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` (값 눈금) | `ctx.font = textFont(options, 'tick', tickFs);` |
| 260 | `ctx.lineWidth = 1;` | `ctx.lineWidth = look.tick;` |
| 264 | `ctx.lineTo(x, plotY + plotH + 5);` | `ctx.lineTo(x, plotY + plotH + look.tickLen);` |
| 271–273 | `ctx.strokeStyle = '#ddd';` `ctx.lineWidth = 0.5;` `ctx.setLineDash([3, 3]);` | `ctx.strokeStyle = t.line.barGridColor;` `ctx.lineWidth = t.line.barGrid;` `ctx.setLineDash(t.line.barGridDash);` |
| 283 | `ctx.font = getFont(options.fontSize.axisLabel, options, 'bold');` | `ctx.font = textFont(options, 'unit', unitFs);` |
| 410 | `fontSize: options.fontSize.dataLabel * 0.9,` | `fontSize: inLegFs,` |
| 411 | `font: getFont(options.fontSize.dataLabel * 0.9, options, 'bold'),` | `font: textFont(options, 'legend', inLegFs, { role: options.fontFamily ?? 'serif' }),` (1.7.0 의 안쪽 범례는 명조) |
| 426 | `fontSize: options.fontSize.dataLabel * 0.85 + 5,` | `fontSize: legendFs,` |

(104·168·197·332·361·419 의 패턴 함수 인자는 Task 4 에서 이미 바꿨다.)

- [ ] **Step 2: `StackedBarPie.ts` 막대 쪽**

```ts
const LOOK = {
  classic: { tick: 1, tickLen: 5, catTicks: false, unitAdjacent: false },
  exam: { tick: 1.9, tickLen: 12, catTicks: true, unitAdjacent: true }, // §3 #24·#25
};
```

`renderStackedBar` 첫머리에 `t`·`look`·`legendFs` 와:

```ts
  const tickFs = textSize(options, 'tick', options.fontSize.tick);
  const unitFs = textSize(options, 'unit', options.fontSize.axisLabel);
  const valueFs = textSize(options, 'value', options.fontSize.dataLabel * 0.8);
  const catFs = textSize(options, 'category', options.fontSize.tick);
```

`fillOf(ctx, data, i)`(432–439)·`lightAt(data, i)`(442–445)에 마지막 인자 `t: StyleTokens` 를 더한다(Task 4 에서 이미 했으면 건너뛴다). 호출부 130·212·244·334·381(`fillOf`), 137·139·219·245·349·382(`lightAt`)에 `t` 를 넘긴다 — 원그래프 함수(334·349·381·382)에도 `const t = styleOf(options);` 가 필요하다.

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 34 | `? measureLegendWidth(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5, options)` | `? measureLegendWidth(ctx, data.seriesLabels, legendFs, options)` |
| 41 | `? measureBottomLegend(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5,` | `? measureBottomLegend(ctx, data.seriesLabels, legendFs,` |
| 68 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 82, 167 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` (값 눈금) | `ctx.font = textFont(options, 'tick', tickFs);` |
| 88, 173 | `ctx.lineWidth = 1;` | `ctx.lineWidth = look.tick;` |
| 90 | `ctx.moveTo(plotX - 5, y);` | `ctx.moveTo(plotX - look.tickLen, y);` |
| 176 | `ctx.lineTo(x, plotY + plotH + 5);` | `ctx.lineTo(x, plotY + plotH + look.tickLen);` |
| 97 | `ctx.strokeStyle = data.gridColor ?? '#ddd';` | `ctx.strokeStyle = data.gridColor ?? t.line.barGridColor;` |
| 182 | `ctx.strokeStyle = '#ddd';` | `ctx.strokeStyle = t.line.barGridColor;` (가로 막대는 지금도 `data.gridColor` 를 안 읽는다 — 그대로) |
| 98, 183 | `ctx.lineWidth = 0.5;` | `ctx.lineWidth = t.line.barGrid;` |
| 99, 184 | `ctx.setLineDash([3, 3]);` | `ctx.setLineDash(t.line.barGridDash);` |
| 109, 194 | `ctx.font = getFont(options.fontSize.axisLabel, options, 'bold');` | `ctx.font = textFont(options, 'unit', unitFs);` |
| 133, 215 | `ctx.lineWidth = 0.8;` | `ctx.lineWidth = t.line.barStroke;` |
| 140, 220 | `ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');` | `ctx.font = textFont(options, 'value', valueFs);` |
| 150, 230 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` (범주 이름) | `ctx.font = textFont(options, 'category', catFs);` |
| 252 | `fontSize: options.fontSize.dataLabel * 0.85 + 5,` | `fontSize: legendFs,` |

- [ ] **Step 3: 관문** — 위 공통 규칙의 명령. `absbar*` 5장·`stacked`·`stackedExam`·`abs-bar-zero-baseline.test.ts` 가 민감하다.

- [ ] **Step 4: 커밋**

```bash
git add src/core/graphs/AbsBarGraph.ts src/core/graphs/StackedBarPie.ts
git commit -m "refactor(style): 절댓값·누적 막대를 토큰으로 옮긴다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 피라미드·기후·편차 둘 토큰화

**Files:**
- Modify: `src/core/graphs/PopulationPyramid.ts`, `src/core/graphs/ClimateGraph.ts`, `src/core/graphs/DeviationAGraph.ts`, `src/core/graphs/DeviationBGraph.ts`

공통 규칙은 Task 5 머리 참고. 기후·편차의 기온선(1.7.0 2.5px)은 시험지에서 계열 선과 같은 0.81pt 라 공유 토큰 `t.line.seriesStrong`(classic 2.5 · exam 3.9)을 쓴다.

- [ ] **Step 1: `PopulationPyramid.ts`**

```ts
const LOOK = {
  // 남 203·여 흰색·테두리 #000 0.39pt (§3 #43), 눈금 안쪽 가로 2.3pt·세로 2.4pt 를 5세마다 (#44, §2 pyramid), 막대 사이 틈 없음
  classic: {
    tick: 1, tickLen: 5, ageTickLen: 6, ageTickEvery: 20, grid: '#aaa',
    male: '#666', maleStroke: '#444', female: '#BBB', femaleStroke: '#888', barStroke: 0.5,
    barGapRatio: 0.1, barGapPx: 2, sexBelow: false, unitInline: false,
  },
  exam: {
    tick: 1.9, tickLen: 11.2, ageTickLen: 11.6, ageTickEvery: 5, grid: '#000',
    male: '#cbcbcb', maleStroke: '#000', female: '#ffffff', femaleStroke: '#000', barStroke: 1.9,
    barGapRatio: 0, barGapPx: 0, sexBelow: true, unitInline: true,
  },
};
```

render 첫머리에 `t`·`look`·`legendFs` 와 `const tickFs = textSize(options, 'tick', options.fontSize.tick);`.

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 70 | `? measureLegendWidth(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5, options)` | `? measureLegendWidth(ctx, legendLabels, legendFs, options)` |
| 75 | `? measureBottomLegend(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5,` | `? measureBottomLegend(ctx, legendLabels, legendFs,` |
| 129 | `const barGap = barH * 0.1;` | `const barGap = barH * look.barGapRatio;` |
| 130 | `const actualBarH = barH - barGap - 2;` | `const actualBarH = barH - barGap - look.barGapPx;` |
| 135 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 174, 226, 245, 266, 334 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` | `ctx.font = textFont(options, 'tick', tickFs);` (174 은 눈금 간격을 재는 글꼴 — 266 과 같아야 한다) |
| 182 | `ctx.strokeStyle = '#aaa';` | `ctx.strokeStyle = look.grid;` |
| 183 | `ctx.lineWidth = 0.5;` | `ctx.lineWidth = t.line.barGrid;` |
| 184 | `ctx.setLineDash([3, 3]);` | `ctx.setLineDash(t.line.barGridDash);` |
| 205 | `ctx.fillStyle = data.sexFills?.[0] ?? '#666';` | `ctx.fillStyle = data.sexFills?.[0] ?? look.male;` |
| 207 | `ctx.strokeStyle = data.sexFills ? '#000' : '#444';` | `ctx.strokeStyle = data.sexFills ? '#000' : look.maleStroke;` |
| 208, 215 | `ctx.lineWidth = 0.5;` (막대 테두리) | `ctx.lineWidth = look.barStroke;` |
| 212 | `ctx.fillStyle = data.sexFills?.[1] ?? '#BBB';` | `ctx.fillStyle = data.sexFills?.[1] ?? look.female;` |
| 214 | `ctx.strokeStyle = data.sexFills ? '#000' : '#888';` | `ctx.strokeStyle = data.sexFills ? '#000' : look.femaleStroke;` |
| 232, 295, 308 | `ctx.lineWidth = 1;` | `ctx.lineWidth = look.tick;` |
| 235 | `ctx.moveTo(plotX - 6, y);` | `ctx.moveTo(plotX - look.ageTickLen, y);` |
| 298 | `ctx.lineTo(lx, plotY + plotH + 5);` | `ctx.lineTo(lx, plotY + plotH + look.tickLen);` |
| 311 | `ctx.lineTo(rx, plotY + plotH + 5);` | `ctx.lineTo(rx, plotY + plotH + look.tickLen);` |
| 243–244 | `drawFloatingLabel(ctx, data.ageUnit, plotX + 4, plotY - 8, w, h, options.fontSize.tick, (size) => getFont(size, options, 'bold'));` | `drawFloatingLabel(ctx, data.ageUnit, plotX + 4, plotY - 8, w, h, textSize(options, 'unit', options.fontSize.tick), (size) => textFont(options, 'unit', size));` |
| 249 | `ctx.font = getFont(options.fontSize.tick * 0.75, options, 'bold');` | `ctx.font = textFont(options, 'tick', textSize(options, 'tick', options.fontSize.tick * 0.75));` |
| 320 | `ctx.font = getFont(options.fontSize.axisLabel, options, 'bold');` (남·여) | `ctx.font = textFont(options, 'region', textSize(options, 'legend', options.fontSize.axisLabel));` — 시험지 `남`·`여` 는 고딕 7.1pt(범례 크기) |
| 338–339 | `drawFloatingLabel(ctx, data.axisLabel, …, w, h, options.fontSize.tick, (size) => getFont(size, options, 'bold'));` | `… w, h, textSize(options, 'unit', options.fontSize.tick), (size) => textFont(options, 'unit', size));` |
| 341 | `ctx.font = getFont(options.fontSize.axisLabel * 0.85, options, 'bold');` | `ctx.font = textFont(options, 'unit', textSize(options, 'unit', options.fontSize.axisLabel * 0.85));` |
| 342 | `const unitY = plotY + plotH + 10 + options.fontSize.tick + 22;` | `const unitY = plotY + plotH + 10 + tickFs + 22;` |
| 344–345 | `drawFloatingLabel(ctx, data.axisLabel, plotX + plotW + 4, unitY, w, h, options.fontSize.axisLabel * 0.85, (size) => getFont(size, options, 'bold'));` | `… unitY, w, h, textSize(options, 'unit', options.fontSize.axisLabel * 0.85), (size) => textFont(options, 'unit', size));` |
| 351 | `ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');` | `ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel * 0.8));` |
| 380 | `{ type: 'rect', fillStyle: '#666', strokeStyle: '#444', label: legendLabels[0] },` | `{ type: 'rect', fillStyle: look.male, strokeStyle: look.maleStroke, label: legendLabels[0] },` |
| 381 | `{ type: 'rect', fillStyle: '#BBB', strokeStyle: '#888', label: legendLabels[1] },` | `{ type: 'rect', fillStyle: look.female, strokeStyle: look.femaleStroke, label: legendLabels[1] },` |
| 386 | `fontSize: options.fontSize.dataLabel * 0.85 + 5,` | `fontSize: legendFs,` |

- [ ] **Step 2: `ClimateGraph.ts`** (시험지 표본 없음 — §2 climate: deviation-a 를 따른다)

```ts
const LOOK = {
  // 강수 막대 229 + 테두리 0.34pt, 기온 ■ (§2 climate). deviation-a 표본에 격자 없음(≈)
  classic: { barFill: '#AAAAAA', barStrokeColor: '#444', legendFill: '#AAA', legendStroke: '#666', barStroke: 1, markerR: 5, marker: 'circle', grid: true },
  exam: { barFill: '#e5e5e5', barStrokeColor: '#000', legendFill: '#e5e5e5', legendStroke: '#000', barStroke: 1.65, markerR: 6.8, marker: 'square', grid: false },
};
```

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 32 | `? measureLegendWidth(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5, options)` | `? measureLegendWidth(ctx, legendLabels, legendFs, options)` |
| 37 | `? measureBottomLegend(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5,` | `? measureBottomLegend(ctx, legendLabels, legendFs,` |
| 92 | `drawGrid: true,` | `drawGrid: look.grid,` |
| 135 | `ctx.fillStyle = '#AAAAAA';` | `ctx.fillStyle = look.barFill;` |
| 146 | `ctx.strokeStyle = '#444';` | `ctx.strokeStyle = look.barStrokeColor;` |
| 147 | `ctx.lineWidth = 1;` | `ctx.lineWidth = look.barStroke;` |
| 154, 196 | `ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');` | `ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel));` |
| 171 | `ctx.lineWidth = 2.5;` | `ctx.lineWidth = t.line.seriesStrong;` |
| 190–192 | `ctx.beginPath();` `ctx.arc(cx, y, 5, 0, Math.PI * 2);` `ctx.fill();` | `if (look.marker === 'square') { ctx.fillRect(cx - look.markerR, y - look.markerR, look.markerR * 2, look.markerR * 2); } else { ctx.beginPath(); ctx.arc(cx, y, look.markerR, 0, Math.PI * 2); ctx.fill(); }` |
| 199 | `ctx.fillText(String(data.months[i].temp), cx, y - 8);` | `ctx.fillText(String(data.months[i].temp), cx, y - look.markerR - 3);` |
| 208 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` (`(월)`) | `ctx.font = textFont(options, 'unit', textSize(options, 'unit', options.fontSize.tick));` |
| 219 | `{ type: 'rect', fillStyle: '#AAA', strokeStyle: '#666', label: legendLabels[0] },` | `{ type: 'rect', fillStyle: look.legendFill, strokeStyle: look.legendStroke, label: legendLabels[0] },` |
| 225 | `fontSize: options.fontSize.dataLabel * 0.85 + 5,` | `fontSize: legendFs,` |

- [ ] **Step 3: `DeviationAGraph.ts`**

```ts
const LOOK = {
  // 막대 229 + 테두리 0.34pt, 0 선 0.34pt, ■ 지름 2.8pt (§3 #46·#32, §2 deviation-a)
  classic: {
    zero: 1.5, barPos: '#666', barNeg: '#CCC', barStrokeColor: '#444', barStroke: 1, legendBar: '#888',
    markerR: 5, marker: 'circle' as 'circle' | 'square', xTicks: false, unitAdjacent: false,
    insideLegend: undefined as undefined | 'bottom-right', frame: false,
  },
  exam: {
    zero: 1.65, barPos: '#e5e5e5', barNeg: '#e5e5e5', barStrokeColor: '#000', barStroke: 1.65, legendBar: '#e5e5e5',
    markerR: 6.8, marker: 'square' as 'circle' | 'square', xTicks: true, unitAdjacent: true,
    insideLegend: 'bottom-right' as undefined | 'bottom-right', frame: true,
  },
};
```

render 첫머리에 `t`·`look`·`legendFs` 와:

```ts
  const tickFs = textSize(options, 'tick', options.fontSize.tick);
  const nameFs = textSize(options, 'axisNameV', options.fontSize.axisLabel);
  const inLegFs = textSize(options, 'legend', options.fontSize.dataLabel * 0.9);
```

도우미 서명을 바꾼다 — `drawDeviationYAxis(…, label: string, fonts: FontOptions, fontSize: { tick: number; axisLabel: number })`(274–284) → `(…, label: string, o: GraphOptions)` 로 줄이고 몸통 첫 줄 `const t = styleOf(o);`. `drawVerticalAxisName(…, fontSize: number, fonts: FontOptions)`(355–364)는 마지막 인자 이름만 `o` 로.

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 33 | `? measureLegendWidth(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5, options)` | `? measureLegendWidth(ctx, legendLabels, legendFs, options)` |
| 40 | `ctx.font = getFont(options.fontSize.axisLabel, options, 'bold');` | `ctx.font = textFont(options, 'axisNameV', nameFs);` |
| 49 | `? measureBottomLegend(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5,` | `? measureBottomLegend(ctx, legendLabels, legendFs,` |
| 108, 109 | `drawDeviationYAxis(…, options, options.fontSize);` | `drawDeviationYAxis(…, options);` |
| 116 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 131 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` (달 이름) | `ctx.font = textFont(options, 'tick', tickFs);` |
| 142 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = look.zero;` |
| 162 | `ctx.fillStyle = data.barFill ?? (val >= 0 ? '#666' : '#CCC');` | `ctx.fillStyle = data.barFill ?? (val >= 0 ? look.barPos : look.barNeg);` |
| 166 | `ctx.strokeStyle = data.barStroke ?? '#444';` | `ctx.strokeStyle = data.barStroke ?? look.barStrokeColor;` |
| 167 | `ctx.lineWidth = 1;` | `ctx.lineWidth = look.barStroke;` |
| 175 | `ctx.lineWidth = 2.5;` | `ctx.lineWidth = t.line.seriesStrong;` |
| 201 | `if (data.markerShape === 'square') {` | `if ((data.markerShape ?? look.marker) === 'square') {` |
| 202 | `ctx.fillRect(cx - 5, y - 5, 10, 10);` | `ctx.fillRect(cx - look.markerR, y - look.markerR, look.markerR * 2, look.markerR * 2);` |
| 205 | `ctx.arc(cx, y, 5, 0, Math.PI * 2);` | `ctx.arc(cx, y, look.markerR, 0, Math.PI * 2);` |
| 208 | `inkRects.push({ x0: cx - 6, y0: y - 6, x1: cx + 6, y1: y + 6 });` | `{ const m = look.markerR + 1; inkRects.push({ x0: cx - m, y0: y - m, x1: cx + m, y1: y + m }); }` |
| 213 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` (`(월)`) | `ctx.font = textFont(options, 'unit', textSize(options, 'unit', options.fontSize.tick));` |
| 228 | `marker: data.markerShape ?? 'circle',` | `marker: data.markerShape ?? look.marker,` |
| 233 | `fillStyle: data.barFill ?? '#888',` | `fillStyle: data.barFill ?? look.legendBar,` |
| 234 | `strokeStyle: data.barStroke ?? '#444',` | `strokeStyle: data.barStroke ?? look.barStrokeColor,` |
| 241 | `fontSize: options.fontSize.dataLabel * 0.9,` | `fontSize: inLegFs,` |
| 242 | `font: getFont(options.fontSize.dataLabel * 0.9, options, 'bold'),` | `font: textFont(options, 'legend', inLegFs, { role: options.fontFamily ?? 'serif' }),` |
| 249 | `{ type: 'rect', fillStyle: '#888', strokeStyle: '#444', label: legendLabels[0] },` | `{ type: 'rect', fillStyle: look.legendBar, strokeStyle: look.barStrokeColor, label: legendLabels[0] },` |
| 255 | `fontSize: options.fontSize.dataLabel * 0.85 + 5,` | `fontSize: legendFs,` |
| 262–263, 266–267 | `drawVerticalAxisName(…, h, options.fontSize.axisLabel, options);` | `drawVerticalAxisName(…, h, nameFs, options);` |
| 292 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 299 | `ctx.font = getFont(fontSize.tick, fonts, 'bold');` | `ctx.font = textFont(o, 'tick', textSize(o, 'tick', o.fontSize.tick));` |
| 309 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = t.line.tick;` |
| 312 / 316 | `ctx.moveTo(x - 6, y);` / `ctx.lineTo(x + 6, y);` | `ctx.moveTo(x - t.line.tickLen, y);` / `ctx.lineTo(x + t.line.tickLen, y);` |
| 320, 335 | `side === 'left' ? x - 12 : x + 12` | `side === 'left' ? x - (t.line.tickLen + 6) : x + (t.line.tickLen + 6)` |
| 330 | `const makeFont = (size: number) => getFont(size, fonts, 'bold');` | `const makeFont = (size: number) => textFont(o, 'unit', size);` |
| 334 | `ctx.font = makeFont(shrinkToWidth(ctx, [label], fontSize.axisLabel, width - EDGE * 2, makeFont));` | `ctx.font = makeFont(shrinkToWidth(ctx, [label], textSize(o, 'unit', o.fontSize.axisLabel), width - EDGE * 2, makeFont));` |
| 376 | `ctx.font = getFont(size, fonts, 'bold');` | `ctx.font = textFont(o, 'axisNameV', size);` |

`GraphOptions` import 가 없으면 `import type { GraphOptions } from '../types/common';` 를 더한다.

- [ ] **Step 4: `DeviationBGraph.ts`**

```ts
const LOOK = {
  // 막대 흰색·127, 테두리 0.30pt, 0 선, 범주 경계 눈금이 0 선을 가로지른다 3.2pt (§2 deviation-b)
  classic: { zero: 1.5, barPos: '#888', barNeg: '#CCC', barStrokeColor: '#444', barStroke: 1, markerR: 7, crossTicks: false, crossLen: 0, labelAtZero: false, frame: false },
  exam: { zero: 1.75, barPos: '#7f7f7f', barNeg: '#ffffff', barStrokeColor: '#000', barStroke: 1.45, markerR: 6.8, crossTicks: true, crossLen: 15.5, labelAtZero: true, frame: true },
};
```

render 첫머리에 `t`·`look`·`legendFs` 와 `const regionFs = textSize(options, 'symbol', options.fontSize.tick * 1.2);` (지역 이름은 `A`·`B`). `drawDevBYAxis(…, label: string, fonts: FontOptions, fontSize: {…})`(188–198) → `(…, label: string, o: GraphOptions)` + 몸통 첫 줄 `const t = styleOf(o);`.

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 25 | `? measureLegendWidth(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5, options)` | `? measureLegendWidth(ctx, legendLabels, legendFs, options)` |
| 30 | `? measureBottomLegend(ctx, legendLabels, options.fontSize.dataLabel * 0.85 + 5,` | `? measureBottomLegend(ctx, legendLabels, legendFs,` |
| 85, 86 | `drawDevBYAxis(…, options, options.fontSize);` | `drawDevBYAxis(…, options);` |
| 90 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 99 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = look.zero;` |
| 111 | `ctx.font = getFont(options.fontSize.tick * 1.2, options, 'bold');` | `ctx.font = textFont(options, 'symbol', regionFs);` |
| 116 | `const regionFont = (size: number) => getFont(size, options, 'bold');` | `const regionFont = (size: number) => textFont(options, 'symbol', size);` |
| 119–120 | `drawFloatingLabel(…, options.fontSize.tick * 1.2, regionFont);` | `drawFloatingLabel(…, regionFs, regionFont);` |
| 130 | `ctx.fillStyle = val >= 0 ? '#888' : '#CCC';` | `ctx.fillStyle = val >= 0 ? look.barPos : look.barNeg;` |
| 134 | `ctx.strokeStyle = '#444';` | `ctx.strokeStyle = look.barStrokeColor;` |
| 135 | `ctx.lineWidth = 1;` | `ctx.lineWidth = look.barStroke;` |
| 145 | `ctx.arc(cx, y, 7, 0, Math.PI * 2);` | `ctx.arc(cx, y, look.markerR, 0, Math.PI * 2);` |
| 151 | `ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');` | `ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel));` |
| 163 | `ctx.fillText(String(tVal), cx, tY - 10);` | `ctx.fillText(String(tVal), cx, tY - look.markerR - 3);` |
| 173 | `{ type: 'rect', fillStyle: '#888', strokeStyle: '#444', label: legendLabels[0] },` | `{ type: 'rect', fillStyle: look.barPos, strokeStyle: look.barStrokeColor, label: legendLabels[0] },` |
| 179 | `fontSize: options.fontSize.dataLabel * 0.85 + 5,` | `fontSize: legendFs,` |
| 206 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 213 | `ctx.font = getFont(fontSize.tick, fonts, 'bold');` | `ctx.font = textFont(o, 'tick', textSize(o, 'tick', o.fontSize.tick));` |
| 222 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = t.line.tick;` |
| 225 / 229 | `ctx.moveTo(x - 6, y);` / `ctx.lineTo(x + 6, y);` | `ctx.moveTo(x - t.line.tickLen, y);` / `ctx.lineTo(x + t.line.tickLen, y);` |
| 233, 242 | `side === 'left' ? x - 12 : x + 12` | `side === 'left' ? x - (t.line.tickLen + 6) : x + (t.line.tickLen + 6)` |
| 239 | `ctx.font = getFont(fontSize.axisLabel, fonts, 'bold');` | `ctx.font = textFont(o, 'unit', textSize(o, 'unit', o.fontSize.axisLabel));` |

- [ ] **Step 5: 관문** — Task 5 공통 규칙의 명령. `pyramid*` 3장·`climate`·`deviationA*` 2장·`deviationB`, `auto-range.test.ts` 가 민감하다.

- [ ] **Step 6: 커밋**

```bash
git add src/core/graphs/PopulationPyramid.ts src/core/graphs/ClimateGraph.ts src/core/graphs/DeviationAGraph.ts src/core/graphs/DeviationBGraph.ts
git commit -m "refactor(style): 피라미드·기후·편차 그래프를 토큰으로 옮긴다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 꺾은선·범주 점·하이서그래프 토큰화

**Files:**
- Modify: `src/core/graphs/LineGraph.ts`, `src/core/graphs/CategoryDotGraph.ts`, `src/core/graphs/Hythergraph.ts`
- Modify: `src/core/types/line.ts:50-53,90-93` (주석만)

공통 규칙은 Task 5 머리 참고(import·`t`/`look` 두 줄·classic 바이트·관문 명령).

- [ ] **Step 1: `LineGraph.ts`**

⚠️ 364 줄 근처 유도선 블록에 지역 변수 `const t = Math.min(…)` 이 있다(374–375 에서 씀). **먼저 그 이름을 `hit` 으로 바꾼다** — 그래야 `t = styleOf(options)` 와 겹치지 않는다.

파일 위(import 아래)에:

```ts
/** 꺾은선에서만 쓰는 값 */
const LOOK = {
  classic: { leaderW: 1 },
  exam: { leaderW: 1.45 }, // 유도선 0.3pt 쯤 (실측 §2 line)
} as const;
```

`drawMarker(ctx, marker, cx, cy, r, hollow)` 에 마지막 인자 `stroke: number` 를 더한다.

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 62 | `ctx.lineWidth = 1.5;` (drawMarker) | `ctx.lineWidth = stroke;` |
| 80 | `measureLegendWidth(ctx, data.series.map((s) => s.label), options.fontSize.dataLabel * 0.85 + 5, options, 'line')` | `measureLegendWidth(ctx, data.series.map((s) => s.label), textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5), options, 'line')` |
| 84 | `ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');` | `const endSize = textSize(options, 'category', options.fontSize.dataLabel);` 다음 줄 `ctx.font = textFont(options, 'category', endSize);` |
| 91 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` | `const tickSize = textSize(options, 'tick', options.fontSize.tick);` 다음 줄 `ctx.font = textFont(options, 'tick', tickSize);` |
| 100 | `options.fontSize.dataLabel * 0.85, w - 130 - padRight, options, 'line')` | `textSize(options, 'legend', options.fontSize.dataLabel * 0.85), w - 130 - padRight, options, 'line')` |
| 145 | `const gridColor = data.gridColor ?? '#ccc';` | `const gridColor = data.gridColor ?? t.line.gridColor;` |
| 146 | `const gridWidth = data.gridWidth ?? 0.5;` | `const gridWidth = data.gridWidth ?? t.line.grid;` |
| 150 | `ctx.lineWidth = 2;` (틀) | `ctx.lineWidth = t.line.axis;` |
| 182 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` | `ctx.font = textFont(options, 'tick', tickSize);` |
| 196 | `ctx.setLineDash([4, 4]);` (세로 격자) | `ctx.setLineDash(t.line.gridDash);` |
| 211 | `ctx.lineWidth = 1;` (0 기준선) | `ctx.lineWidth = t.line.zero;` |
| 212 | `ctx.setLineDash([4, 4]);` (0 기준선) | `ctx.setLineDash(t.line.gridDash);` |
| 271 | `ctx.lineWidth = s.lineWidth ?? 2;` | `ctx.lineWidth = s.lineWidth ?? t.line.series;` |
| 272 | `ctx.setLineDash(LINE_DASH[style]);` | `ctx.setLineDash(t.seriesDash[style]);` |
| 292 | `drawMarker(ctx, marker, toX(i), toY(v), 4.5, s.hollowMarker ?? false);` | `drawMarker(ctx, marker, toX(i), toY(v), t.marker.r, s.hollowMarker ?? false, t.marker.stroke);` |
| 302 | `ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');` | `ctx.font = textFont(options, 'category', endSize);` |
| 304 | `const lineHeight = options.fontSize.dataLabel * 1.1;` | `const lineHeight = endSize * 1.1;` |
| 335 | `ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');` | `ctx.font = textFont(options, 'category', endSize);` |
| 339 | `const lineH = options.fontSize.dataLabel;` | `const lineH = endSize;` |
| 371 | `ctx.lineWidth = 1;` (유도선) | `ctx.lineWidth = look.leaderW;` |
| 385 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` | `ctx.font = textFont(options, 'tick', tickSize);` |
| 396–398 | 마지막 눈금 반폭을 재고 `ctx.fillText(data.xUnit, …)` | 반폭은 지금처럼 눈금 글꼴로 재고, `fillText(data.xUnit …)` **바로 앞**에 `ctx.font = textFont(options, 'unit', textSize(options, 'unit', options.fontSize.tick));` 한 줄 |
| 408 | `ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');` | `const inSize = textSize(options, 'legend', options.fontSize.dataLabel * 0.8);` 다음 줄 `ctx.font = textFont(options, 'legend', inSize, { role: options.fontFamily ?? 'serif' });` (1.7.0 은 이 범례를 명조로 그렸다) |
| 417 | `ctx.lineWidth = 1;` (안쪽 범례 상자) | `ctx.lineWidth = t.legend.insideBoxLine;` |
| 438 | `lineWidth: s.lineWidth ?? 2,` | `lineWidth: s.lineWidth ?? t.line.series,` |
| 440 | `dash: LINE_DASH[s.lineStyle ?? LINE_STYLE_ORDER[si % LINE_STYLE_ORDER.length]],` | `dash: t.seriesDash[s.lineStyle ?? LINE_STYLE_ORDER[si % LINE_STYLE_ORDER.length]],` |
| 446 | `fontSize: options.fontSize.dataLabel * 0.85,` | `fontSize: textSize(options, 'legend', options.fontSize.dataLabel * 0.85),` |
| 12 | `LINE_DASH,` (import) | 지운다 |

80 줄(`+ 5`)과 446 줄(없음)의 어긋남은 1.7.0 그대로 둔다.

`src/core/types/line.ts` 주석: 52 `/** 선 굵기(px). 미지정이면 2 */` → `/** 선 굵기(px). 미지정이면 양식의 계열 굵기 (classic 2 · exam 3.9) */`, 90–93 의 `#ccc`·`0.5` 설명 → `미지정이면 양식의 격자 (classic #ccc·0.5)`.

- [ ] **Step 2: `CategoryDotGraph.ts`**

```ts
const LOOK = {
  classic: { zeroW: 1.5, zeroDash: [] as number[] },
  exam: { zeroW: 1.45, zeroDash: [41, 4.9, 5.3, 4.9] }, // 0 선 일점쇄선 0.30pt (실측 §3 #45)
};
```

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 68 | `measureLegendWidth(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5, options, 'circle')` | `measureLegendWidth(ctx, data.seriesLabels, textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5), options, 'circle')` |
| 73 | `measureBottomLegend(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85, …` | `measureBottomLegend(ctx, data.seriesLabels, textSize(options, 'legend', options.fontSize.dataLabel * 0.85), …` |
| 110 | `ctx.lineWidth = 2;` (틀) | `ctx.lineWidth = t.line.axis;` |
| 159 | `ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');` | `ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel * 0.8));` |
| 168–180 | 0 선 블록 | 블록을 `ctx.save()` … `ctx.restore()` 로 감싸고, 173 `ctx.lineWidth = 1.5;` → `ctx.lineWidth = look.zeroW;`, 174 `ctx.setLineDash([]);` → `ctx.setLineDash(look.zeroDash);` |
| 184 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` | `ctx.font = textFont(options, 'symbol', textSize(options, 'symbol', options.fontSize.tick));` |
| 209 | `fontSize: options.fontSize.dataLabel * 0.85,` | `fontSize: textSize(options, 'legend', options.fontSize.dataLabel * 0.85),` |

- [ ] **Step 3: `Hythergraph.ts`**

```ts
/** 시험지 일점쇄선(짧은) 5.0/0.84/1.0/0.84pt — 다섯째 계열 */
const EXAM_DASHDOT_SHORT = [24.3, 4.1, 4.9, 4.1];
const LOOK = {
  classic: { tickW: 1, markerR: 5, haloR: 7, iconGap: 8 },
  exam: { tickW: 1.9, markerR: 6.8, haloR: 8.8, iconGap: 14 }, // 꺾은선 기호(§3 #32)·눈금(#24)
};
```

render 함수 첫머리에 계열 무늬 표:

```ts
  const dashes = byStyle(options, {
    classic: LINE_STYLES.map((s) => s.dash),
    exam: [t.seriesDash.solid, t.seriesDash.dashed, t.seriesDash.dotted, t.seriesDash.dashdot, EXAM_DASHDOT_SHORT],
  });
  const lfSize = textSize(options, 'legend', fs.dataLabel * 0.85 + 5);
```

`drawMarker(ctx, type, cx, cy, size)` 에 마지막 인자 `stroke: number`, `drawMarkerLegendIcon(ctx, type, cx, cy)` 에 `r: number, stroke: number` 를 더하고 안에서 `drawMarker(ctx, type, cx, cy, r, stroke)`.

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 28 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = stroke;` |
| 84 | `measureLegendWidth(ctx, legendLabels, fs.dataLabel * 0.85 + 5, options)` | `measureLegendWidth(ctx, legendLabels, lfSize, options)` |
| 90–91 | `layoutBottomLegend(ctx, legendLabels, data.series.map(() => 36), fs.dataLabel * 0.85 + 5, w - 80 - (80 + legendW), options, { iconGap: 8 })` | `layoutBottomLegend(ctx, legendLabels, data.series.map(() => t.legend.lineIcon), lfSize, w - 80 - (80 + legendW), options, { iconGap: look.iconGap })` |
| 130–132 | `ctx.strokeStyle = '#ddd';` `ctx.lineWidth = 0.5;` `ctx.setLineDash([3, 3]);` | `ctx.strokeStyle = t.line.barGridColor;` `ctx.lineWidth = t.line.barGrid;` `ctx.setLineDash(t.line.barGridDash);` |
| 151 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 160 | `ctx.font = getFont(fs.tick, options, 'bold');` | `ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick));` |
| 165, 181 | `ctx.lineWidth = 1;` (눈금) | `ctx.lineWidth = look.tickW;` |
| 168 | `ctx.lineTo(x, plotY + plotH + 6);` | `ctx.lineTo(x, plotY + plotH + t.line.tickLen);` |
| 183 | `ctx.moveTo(plotX - 6, y);` | `ctx.moveTo(plotX - t.line.tickLen, y);` |
| 193 | `ctx.font = getFont(fs.axisLabel, options, 'bold');` | `const unitSize = textSize(options, 'unit', fs.axisLabel);` 다음 줄 `ctx.font = textFont(options, 'unit', unitSize);` |
| 197 | `const unitFont = (size: number) => getFont(size, options, 'bold');` | `const unitFont = (size: number) => textFont(options, 'unit', size);` |
| 201, 206 | `drawFloatingLabel(…, fs.axisLabel, unitFont);` | `drawFloatingLabel(…, unitSize, unitFont);` |
| 222–223 | `ctx.lineWidth = style.width;` `ctx.setLineDash(style.dash);` | `ctx.lineWidth = t.line.series;` `ctx.setLineDash(dashes[si % dashes.length]);` (216 줄 `style` 지역 변수가 안 쓰이면 지운다) |
| 243 | `ctx.arc(cx, cy, 7, 0, Math.PI * 2);` | `ctx.arc(cx, cy, look.haloR, 0, Math.PI * 2);` |
| 247 | `drawMarker(ctx, marker, cx, cy, 5);` | `drawMarker(ctx, marker, cx, cy, look.markerR, t.marker.stroke);` |
| 252 | `ctx.font = getFont(fs.dataLabel, options, 'bold');` | `ctx.font = textFont(options, 'value', textSize(options, 'value', fs.dataLabel));` |
| 255 | `ctx.fillText(mLabels[i], cx + 9, cy - 5);` | `ctx.fillText(mLabels[i], cx + look.markerR + 4, cy - look.markerR);` |
| 263, 265 | `const lfSize = …;` `const LEGEND_FONT = sansFont(options);` | 둘 다 지운다(위로 올렸다) |
| 267, 354 | `` ctx.font = `bold ${lfSize}px ${LEGEND_FONT}`; `` | `ctx.font = textFont(options, 'legend', lfSize);` |
| 269 | `const iconW = 36;` | `const iconW = t.legend.lineIcon;` |
| 270 | `const iconGap = 8;` | `const iconGap = look.iconGap;` |
| 271 | `const pad = 12;` | `const pad = t.legend.pad;` |
| 287–288, 330–331 | `ctx.strokeStyle = '#888';` `ctx.lineWidth = 1.5;` | `ctx.strokeStyle = t.legend.boxColor;` `ctx.lineWidth = t.legend.boxLine;` |
| 304–305, 344–345 | `ctx.lineWidth = style.width;` `ctx.setLineDash(style.dash);` | `ctx.lineWidth = t.line.series;` `ctx.setLineDash(dashes[i % dashes.length]);` |
| 312 | `drawMarkerLegendIcon(ctx, MARKERS[i % MARKERS.length], cx + iconW / 2, cy);` | `drawMarkerLegendIcon(ctx, MARKERS[i % MARKERS.length], cx + iconW / 2, cy, look.markerR, t.marker.stroke);` |
| 314 | `` ctx.font = `bold ${layout.fontSize}px ${LEGEND_FONT}`; `` | `ctx.font = textFont(options, 'legend', layout.fontSize);` |
| 352 | `drawMarkerLegendIcon(…, ix + iconW / 2, cy);` | `drawMarkerLegendIcon(…, ix + iconW / 2, cy, look.markerR, t.marker.stroke);` |

`LINE_STYLES` 의 `width` 는 모두 2 = `classicStyle.line.series` 라 classic 이 같다.

- [ ] **Step 4: 관문**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: 전부 PASS, 골든 86건.

- [ ] **Step 5: 커밋**

```bash
git add src/core/graphs/LineGraph.ts src/core/graphs/CategoryDotGraph.ts src/core/graphs/Hythergraph.ts src/core/types/line.ts
git commit -m "refactor(style): 꺾은선·범주 점·하이서그래프를 토큰으로 옮긴다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 방사형·정육면체·삼각 그래프 토큰화

**Files:**
- Modify: `src/core/graphs/RadarChart.ts`, `src/core/graphs/CubeGraph.ts`, `src/core/graphs/TernaryDiagram.ts`

공통 규칙은 Task 5 머리 참고.

- [ ] **Step 1: `RadarChart.ts`**

```ts
const LOOK = {
  classic: { grid: { w: 0.8, color: '#ccc' }, axis: { w: 1, color: '#999' }, tickInk: '#888', dotHalo: 5, dotR: 3.5 },
  // 축 0.30pt (실측 §3 #38). 꼭짓점 점은 표본에 없다 — 0 이면 안 그린다
  exam: { grid: { w: 1.45, color: '#000' }, axis: { w: 1.45, color: '#000' }, tickInk: '#000', dotHalo: 0, dotR: 0 },
};
```

render 함수 첫머리에 계열 표(지금 `LINE_STYLES`(9–15)·`GRAY_SHADES`(17) 둘을 한데 묶는다 — 둘 다 다섯 칸):

```ts
  const SERIES = byStyle(options, {
    classic: LINE_STYLES.map((s, i) => ({ dash: s.dash, width: s.width, color: GRAY_SHADES[i] })),
    exam: [
      { dash: [] as number[], width: 4.8, color: '#000' }, // 굵은 실선 0.98pt
      { dash: [] as number[], width: 1.9, color: '#000' }, // 가는 실선 0.40pt
      { dash: t.seriesDash.dashed, width: 2.5, color: '#000' }, // 점선 0.51pt
      { dash: t.seriesDash.dashdot, width: 1.9, color: '#000' }, // ≈ 넷째부터 실측 없음
      { dash: t.seriesDash.dotted, width: 1.9, color: '#000' },
    ],
  });
  const legendSize = textSize(options, 'legend', fs.dataLabel * 0.85 + 5);
```

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 36 | `measureLegendWidth(ctx, legendLabels, fs.dataLabel * 0.85 + 5, options, 'line')` | `measureLegendWidth(ctx, legendLabels, legendSize, options, 'line')` |
| 47 | `ctx, legendLabels, fs.dataLabel * 0.85 + 5, w - leftPad - rightPad, options, 'line', 30));` | `ctx, legendLabels, legendSize, w - leftPad - rightPad, options, 'line', 30));` |
| 65 | `const labelFontSize = fs.axisLabel * 0.85;` | `const labelFontSize = textSize(options, 'axisName', fs.axisLabel * 0.85);` |
| 66 | `const makeLabelFont = (size: number) => getFont(size, options, 'bold');` | `const makeLabelFont = (size: number) => textFont(options, 'axisName', size);` |
| 84–85 | `ctx.strokeStyle = '#ccc';` `ctx.lineWidth = 0.8;` | `ctx.strokeStyle = look.grid.color;` `ctx.lineWidth = look.grid.w;` |
| 99–100 | `ctx.strokeStyle = '#999';` `ctx.lineWidth = 1;` | `ctx.strokeStyle = look.axis.color;` `ctx.lineWidth = look.axis.w;` |
| 110 | `ctx.fillStyle = '#888';` | `ctx.fillStyle = look.tickInk;` |
| 111 | `ctx.font = getFont(fs.tick * 0.8, options, 'normal');` | `ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick * 0.8), { weight: 'normal' });` |
| 143 | `const color = GRAY_SHADES[si % GRAY_SHADES.length];` | `const color = SERIES[si % SERIES.length].color;` |
| 161–162 | `const style = LINE_STYLES[si % …];` `const color = GRAY_SHADES[si % …];` | `const style = SERIES[si % SERIES.length];` `const color = style.color;` |
| 179–189 | 꼭짓점 점 두 겹(흰 5 · 색 3.5) | 블록을 `if (look.dotR > 0) { … }` 로 감싸고 183 `5` → `look.dotHalo`, 187 `3.5` → `look.dotR` |
| 200 | `const style = LINE_STYLES[i % LINE_STYLES.length];` | `const style = SERIES[i % SERIES.length];` |
| 203 | `fillStyle: GRAY_SHADES[i % GRAY_SHADES.length],` | `fillStyle: style.color,` |
| 213 | `fontSize: fs.dataLabel * 0.85 + 5,` | `fontSize: legendSize,` |

145–147 의 채움 색 풀이는 `#RGB` 를 기대한다 — exam `'#000'` 도 그 꼴이라 그대로 된다.

- [ ] **Step 2: `CubeGraph.ts`**

⚠️ 이 파일은 `drawAxes`(382)·`fits`(297) 안에 지역 변수 `t` 가 이미 있다. 토큰은 **`tk`** 라는 이름으로 받는다: `const tk = styleOf(options);`.

```ts
const LOOK = {
  classic: { axisW: 1.5, head: 10, backW: 1.5, backColor: '#999', backDash: [6, 5], leaderW: 1.2, pointR: 14, pointFill: '#000', pointStroke: 0 },
  // 굵은 축 0.99pt + 화살촉, 상자 0.39pt, 꼭짓점 회색 공 + 테두리 (실측 §2 cube). 촉 크기·공 크기·회색은 ≈
  exam: { axisW: 4.8, head: 22, backW: 1.9, backColor: '#000', backDash: [7.6, 4.7], leaderW: 1.45, pointR: 14, pointFill: '#7f7f7f', pointStroke: 1.75 },
};
```

`drawArrow(ctx, x1, y1, x2, y2)` 에 `headLen: number` 인자를 더하고 197 `const headLen = 10;` 을 지운다.

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 94–96 | `ctx.strokeStyle = '#999';` `ctx.lineWidth = 1.5;` `ctx.setLineDash([6, 5]);` | `ctx.strokeStyle = look.backColor;` `ctx.lineWidth = look.backW;` `ctx.setLineDash(look.backDash);` |
| 108 | `ctx.lineWidth = 2;` | `ctx.lineWidth = tk.line.axis;` |
| 129–132 | `ctx.fillStyle = '#000';` … `ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill();` | `ctx.fillStyle = look.pointFill;` `ctx.beginPath();` `ctx.arc(px, py, look.pointR, 0, Math.PI * 2);` `ctx.fill();` `if (look.pointStroke > 0) { ctx.strokeStyle = '#000'; ctx.lineWidth = look.pointStroke; ctx.stroke(); }` |
| 148 | `ctx.font = getFont(fs.dataLabel + 10, options, 'bold');` | `ctx.font = textFont(options, 'region', textSize(options, 'region', fs.dataLabel + 10));` |
| 157 | `ctx.lineWidth = 1.2;` | `ctx.lineWidth = look.leaderW;` |
| 178 | `const titleFont = sansFont(options);` | `const titleSize = textSize(options, 'title', fs.title);` |
| 181 | `` ctx.font = `bold ${fs.title}px ${titleFont}`; `` | `ctx.font = textFont(options, 'title', titleSize);` |
| 185–186 | `drawFloatingLabel(ctx, options.title, w / 2, yAxisTop[1] - 50, w, h, fs.title, (size) => \`bold ${size}px ${titleFont}\`);` | `drawFloatingLabel(ctx, options.title, w / 2, yAxisTop[1] - 50, w, h, titleSize, (size) => textFont(options, 'title', size));` |
| 290 | `let nameSize = fs.axisLabel;` | `let nameSize = textSize(options, 'axisName', fs.axisLabel);` |
| 291 | `const makeNameFont = (size: number) => getFont(size, options, 'bold');` | `const makeNameFont = (size: number) => textFont(options, 'axisName', size);` |
| 292, 377 | `const dirFont = getFont(fs.axisLabel * 0.9, options, 'normal');` | `const dirFont = textFont(options, 'axisName', textSize(options, 'axisName', fs.axisLabel * 0.9), { weight: 'normal' });` |
| 331 | `nameSize = fs.axisLabel * MIN_SCALE;` | `nameSize = textSize(options, 'axisName', fs.axisLabel) * MIN_SCALE;` |
| 359 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = look.axisW;` |
| 364, 369, 374 | `drawArrow(ctx, xStart[0], xStart[1], xEnd[0], xEnd[1]);` (y·z 도) | 끝에 `, look.head` 를 더한다 |
| 376 | `const nameFont = getFont(nameSize, options, 'bold');` | `const nameFont = textFont(options, 'axisName', nameSize);` |

`drawAxes` 가 `options` 를 받으므로 그 안에서 `const look = byStyle(options, LOOK); const tk = styleOf(options);` 를 다시 둔다.

- [ ] **Step 3: `TernaryDiagram.ts`**

```ts
const LOOK = {
  // classic 격자는 실선이다 — 공유 토큰(grid [4,4])과 달라 여기 둔다
  classic: { gridDash: [] as number[], tickLen: 12, dotR: 6, valueInk: '#555' },
  exam: { gridDash: [7.6, 4.7], tickLen: 12, dotR: 7, valueInk: '#000' }, // 산점을 따른다(실측 §2 ternary)
};
```

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 40 | `const tickSpace = 12 + options.fontSize.tick + 10;` | `const tickSpace = look.tickLen + textSize(options, 'tick', options.fontSize.tick) + 10;` |
| 41 | `const axisLabelSpace = options.fontSize.axisLabel * 1.3 + 30;` | 그대로(여백 계산) |
| 85–86 | `ctx.strokeStyle = '#ccc';` `ctx.lineWidth = 0.5;` | `ctx.strokeStyle = t.line.gridColor;` `ctx.lineWidth = t.line.grid;` `ctx.setLineDash(look.gridDash);` |
| 117 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 134 | `const tickLen = 12;` | `const tickLen = look.tickLen;` |
| 144 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` | `ctx.font = textFont(options, 'tick', textSize(options, 'tick', options.fontSize.tick));` |
| 146 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = t.line.tick;` |
| 187 | `ctx.font = getFont(nameFit.fontSize, options, 'bold');` | `ctx.font = textFont(options, 'axisName', nameFit.fontSize);` |
| 206 | `ctx.arc(x, y, 6, 0, Math.PI * 2);` | `ctx.arc(x, y, look.dotR, 0, Math.PI * 2);` |
| 212 | `ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');` | `const lp = labelPlace(p.label);` 다음 줄 `ctx.font = textFont(options, lp, textSize(options, lp, options.fontSize.dataLabel));` |
| 215 | `ctx.fillText(p.label, x + 10, y - 4);` | `ctx.fillText(p.label, x + look.dotR + 4, y - 4);` |
| 220 | `ctx.fillStyle = '#555';` | `ctx.fillStyle = look.valueInk;` |
| 221 | `ctx.font = getFont(options.fontSize.dataLabel * 0.8, options);` | `ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel * 0.8), { weight: 'normal' });` |
| 224 | `ctx.fillText(…, x + 10, y + 4);` | `ctx.fillText(\`(${p.a}, ${p.b}, ${p.c})\`, x + look.dotR + 4, y + 4);` |
| 284 | `const makeFont = (size: number) => getFont(size, options, 'bold');` | `const makeFont = (size: number) => textFont(options, 'axisName', size);` |
| 285 | `let fontSize = options.fontSize.axisLabel * 1.3;` | `let fontSize = textSize(options, 'axisName', options.fontSize.axisLabel * 1.3);` |
| 324 | `fontSize = options.fontSize.axisLabel * 1.3 * MIN_SCALE;` | `fontSize = textSize(options, 'axisName', options.fontSize.axisLabel * 1.3) * MIN_SCALE;` |

격자는 84 `save()` ~ 113 `restore()` 사이라 점선이 틀로 새지 않는다.

- [ ] **Step 4: 관문** — Task 5 공통 규칙의 명령.

- [ ] **Step 5: 커밋**

```bash
git add src/core/graphs/RadarChart.ts src/core/graphs/CubeGraph.ts src/core/graphs/TernaryDiagram.ts
git commit -m "refactor(style): 방사형·정육면체·삼각 그래프를 토큰으로 옮긴다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 산점도 토큰화

**Files:**
- Modify: `src/core/graphs/ScatterBubble.ts`

`data.examFrame`(94 줄 `const exam = data.examFrame === true`)는 **자료 선택**이라 그대로 둔다. classic + `examFrame: true` 의 진한 격자는 `LOOK.frameGrid` 로 옮겨 바이트를 지킨다. `data.showFrame`(323)도 그대로.

- [ ] **Step 1: LOOK 표와 머리**

```ts
const LOOK = {
  classic: {
    frameGrid: { color: '#333', width: 1, dash: [5, 4] }, // examFrame:true 의 격자
    tickW: 1,
    crossW: 1.5,          // 편차 모드 0 십자선
    dotR: 4,
    bubbleW: 1.5, bubbleStroke: '#333', bubbleFill: 'rgba(80,80,80,0.3)',
    valueInk: '#555',
    legendBox: { color: '#666', width: 1.5, radius: 4 },
    leader: { color: '#666', width: 1, dash: [3, 2] },
    boxedLabelW: 1.2,
  },
  exam: {
    frameGrid: { color: '#000', width: 1.45, dash: [7.6, 4.7] },
    tickW: 1.9,
    crossW: 1.75,
    dotR: 7,              // 지름 2.9pt (§3 #40)
    bubbleW: 4.0, bubbleStroke: '#000', bubbleFill: 'transparent', // 원 테두리 0.83pt, 채움 없음 (#39)
    valueInk: '#000',
    legendBox: { color: '#000', width: 1.45, radius: 0 },
    leader: { color: '#000', width: 1.45, dash: [7.6, 4.7] },
    boxedLabelW: 1.45,
  },
};
```

`renderNormal`·`renderDeviation` 첫머리에 `const t = styleOf(options); const look = byStyle(options, LOOK);`, `renderNormal` 에는 이어서 `const tickPx = textSize(options, 'tick', fs.tick); const axisPx = textSize(options, 'axisName', fs.axisLabel);`. `drawPoints`·범례 도우미들도 `options` 를 받으므로 그 안에서 같은 두 줄을 다시 둔다. `bubbleRects` 는 `options` 를 안 받는다 — `dotR: number` 인자를 더하고 호출부(236, 449)에서 `look.dotR` 를 넘긴다.

- [ ] **Step 2: 표대로 바꾼다**

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 47 | `ctx.font = getFont(fs.tick, options, 'bold');` | `ctx.font = textFont(options, 'unit', textSize(options, 'unit', fs.tick));` |
| 96 | `ctx.strokeStyle = exam ? '#333' : '#ddd';` | `ctx.strokeStyle = exam ? look.frameGrid.color : t.line.barGridColor;` |
| 97 | `ctx.lineWidth = exam ? 1 : 0.5;` | `ctx.lineWidth = exam ? look.frameGrid.width : t.line.barGrid;` |
| 98 | `ctx.setLineDash(exam ? [5, 4] : [3, 3]);` | `ctx.setLineDash(exam ? look.frameGrid.dash : t.line.barGridDash);` |
| 117, 322 | `ctx.lineWidth = 2;` | `ctx.lineWidth = t.line.axis;` |
| 130 | `ctx.font = getFont(fs.tick, options, 'bold');` | `ctx.font = textFont(options, 'tick', tickPx);` |
| 146, 169, 368, 386 | `ctx.lineWidth = 1;` (눈금) | `ctx.lineWidth = look.tickW;` |
| 149 | `ctx.lineTo(x, plotY + plotH + 6);` | `ctx.lineTo(x, plotY + plotH + t.line.tickLen);` |
| 163 | `labelStride(…, fs.tick * 1.1)` | `labelStride(plotH / Math.max(1, yTicks.length - 1), tickPx * 1.1)` |
| 171 | `ctx.moveTo(plotX - 6, y);` | `ctx.moveTo(plotX - t.line.tickLen, y);` |
| 178, 185, 196, 219 | `ctx.font = getFont(fs.axisLabel, options, 'bold');` | `ctx.font = textFont(options, 'axisName', axisPx);` |
| 183–184 | `drawFloatingLabel(ctx, data.xLabel, …, fs.axisLabel, (size) => getFont(size, options, 'bold'));` | `drawFloatingLabel(ctx, data.xLabel, plotX + plotW / 2, plotY + plotH + 40, w, h, axisPx, (size) => textFont(options, 'axisName', size));` |
| 191 | `ctx.font = getFont(fs.tick, options, 'bold');` | `ctx.font = textFont(options, 'unit', textSize(options, 'unit', fs.tick));` |
| 198 (앞에 끼움) | else 갈래가 185 의 축 이름 글꼴로 xUnit 을 그린다 | else 블록 첫 줄에 `ctx.font = textFont(options, 'unit', textSize(options, 'unit', fs.axisLabel));` (classic 문자열은 185 와 같다) |
| 208–209 | `drawFloatingLabel(ctx, data.yUnit, plotX - 10, plotY - 16, w, h, fs.axisLabel, (size) => getFont(size, options, 'bold'));` | `drawFloatingLabel(ctx, data.yUnit, plotX - 10, plotY - 16, w, h, textSize(options, 'unit', fs.axisLabel), (size) => textFont(options, 'unit', size));` |
| 213 | `ctx.font = getFont(yName.size, options, 'bold');` | `ctx.font = textFont(options, 'axisNameV', yName.size);` |
| 299–301 | `ctx.strokeStyle = '#ddd';` `ctx.lineWidth = 0.5;` `ctx.setLineDash([3, 3]);` | `ctx.strokeStyle = t.line.barGridColor;` `ctx.lineWidth = t.line.barGrid;` `ctx.setLineDash(t.line.barGridDash);` |
| 335 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = look.crossW;` |
| 347 | `ctx.font = getFont(fs.tick, options, 'bold');` | `ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick));` |
| 371 | `ctx.lineTo(x, xTickBase + 6);` | `ctx.lineTo(x, xTickBase + t.line.tickLen);` |
| 381 | `… fs.tick * 1.1)` | `… textSize(options, 'tick', fs.tick) * 1.1)` |
| 388 | `ctx.moveTo(yTickBase - 6, y);` | `ctx.moveTo(yTickBase - t.line.tickLen, y);` |
| 395 | `ctx.font = getFont(fs.axisLabel, options, 'bold');` | `ctx.font = textFont(options, 'axisName', textSize(options, 'axisName', fs.axisLabel));` |
| 407 (앞에 끼움) | xUnit(410)·yUnit(420) 이 395 글꼴을 쓴다 | `if (data.xUnit)` 앞에 `ctx.font = textFont(options, 'unit', textSize(options, 'unit', fs.axisLabel));` — 433 줄이 이 글꼴로 `data.xUnit` 을 재므로 433 까지 유지한다 |
| 431, 434 | `drawBoxedLabel(ctx, data.yLabel, originX, 10, fs.axisLabel, 'below');` · `…'right');` | 433 다음·두 호출 앞에 `ctx.font = textFont(options, 'axisName', textSize(options, 'axisName', fs.axisLabel));`, `fontSize` 인자는 `textSize(options, 'axisName', fs.axisLabel)`, 끝에 `look.boxedLabelW` 를 넘긴다 |
| 439 | `fillTextMultiline(ctx, data.yLabel, yTickBase - 18 - yTickTextW, plotY + plotH / 2, fs.axisLabel * 1.3);` | 앞 줄에 `ctx.font = textFont(options, 'axisNameV', textSize(options, 'axisNameV', fs.axisLabel));`, 마지막 인자 `textSize(options, 'axisNameV', fs.axisLabel) * 1.3` |
| 477 | `… ? (pt.size / maxSize) * data.bubbleScale : 4;` | `… : look.dotR;` |
| 497 | `ctx.fillStyle = pt.fill ?? 'rgba(80,80,80,0.3)';` | `ctx.fillStyle = pt.fill ?? look.bubbleFill;` |
| 501–502 | `ctx.strokeStyle = '#333';` `ctx.lineWidth = 1.5;` | `ctx.strokeStyle = look.bubbleStroke;` `ctx.lineWidth = look.bubbleW;` |
| 508 | `ctx.arc(cx, cy, 4, 0, Math.PI * 2);` | `ctx.arc(cx, cy, look.dotR, 0, Math.PI * 2);` |
| 515 | `ctx.font = getFont(fs.dataLabel, options, 'bold');` | `const lp = labelPlace(pt.label);` `const lpx = textSize(options, lp, fs.dataLabel);` `ctx.font = textFont(options, lp, lpx);` |
| 518, 542 | `: 8;` | `: look.dotR + 4;` |
| 523 | `lineHeight: fs.dataLabel * 1.1,` | `lineHeight: lpx * 1.1,` |
| 536 | `ctx.fillStyle = '#555';` | `ctx.fillStyle = look.valueInk;` |
| 537 | `ctx.font = getFont(fs.dataLabel * 0.8, options, 'normal');` | `ctx.font = textFont(options, 'value', textSize(options, 'value', fs.dataLabel * 0.8), { weight: 'normal' });` |
| 595 | `ctx.font = getFont(fs.tick, options, 'bold');` | `ctx.font = textFont(options, 'tick', textSize(options, 'tick', fs.tick));` |
| 600 | `const makeFont = (size: number) => getFont(size, options, 'bold');` | `const makeFont = (size: number) => textFont(options, 'axisNameV', size);` |
| 601, 606, 608 | `makeFont(fs.axisLabel)` · `let size = fs.axisLabel;` · `shrinkToWidth(ctx, lines, fs.axisLabel, budget, makeFont)` | 앞에 `const base = textSize(options, 'axisNameV', fs.axisLabel);` 두고 셋 다 `base` |
| 628 | `const r = … : 4;` | `… : dotR;` (새 인자) |
| 697 | `const fontSize = fs.dataLabel * 0.8;` | `const fontSize = textSize(options, 'legend', fs.dataLabel * 0.8);` |
| 699, 919 | `ctx.font = getFont(fontSize, options, 'bold');` | `ctx.font = textFont(options, 'legend', fontSize, { role: options.fontFamily ?? 'serif' });` |
| 756 | `const labelFontSize = fs.dataLabel * 0.85;` | `const labelFontSize = textSize(options, 'value', fs.dataLabel * 0.85);` |
| 758, 823 | `ctx.font = getFont(labelFontSize / m.labelFontSize, options, 'bold');` | `ctx.font = textFont(options, 'value', labelFontSize);` / `textFont(options, 'value', m.labelFontSize)` |
| 791–792 | `ctx.strokeStyle = '#666';` `ctx.lineWidth = 1.5;` | `ctx.strokeStyle = look.legendBox.color;` `ctx.lineWidth = look.legendBox.width;` |
| 794 | `ctx.roundRect(boxX, boxY, m.boxW, m.boxH, 4);` | `ctx.roundRect(boxX, boxY, m.boxW, m.boxH, look.legendBox.radius);` |
| 805–806 | `ctx.strokeStyle = '#333';` `ctx.lineWidth = 1.5;` | `ctx.strokeStyle = look.bubbleStroke;` `ctx.lineWidth = look.bubbleW;` |
| 812–814 | `ctx.strokeStyle = '#666';` `ctx.lineWidth = 1;` `ctx.setLineDash([3, 2]);` | `ctx.strokeStyle = look.leader.color;` `ctx.lineWidth = look.leader.width;` `ctx.setLineDash(look.leader.dash);` |
| 886 | `ctx.lineWidth = 1.2;` (drawBoxedLabel) | `ctx.lineWidth = lineW;` — `drawBoxedLabel` 에 마지막 인자 `lineW: number` |
| 917 | `const fontSize = fs.dataLabel * 0.8;` | `const fontSize = textSize(options, 'legend', fs.dataLabel * 0.8);` |
| 926–927 | `ctx.strokeStyle = '#666';` `ctx.lineWidth = 1.5;` | `ctx.strokeStyle = look.legendBox.color;` `ctx.lineWidth = look.legendBox.width;` |
| 944 | `ctx.lineWidth = 0.8;` | `ctx.lineWidth = t.line.barStroke;` |

글자 여백 숫자(10·16·18·40, 유도선 12/16 등)는 그대로.

- [ ] **Step 3: 관문** — Task 5 공통 규칙의 명령. 산점 골든 6장(`scatter*`)과 `font-stack` 이 특히 민감하다.

- [ ] **Step 4: 커밋**

```bash
git add src/core/graphs/ScatterBubble.ts
git commit -m "refactor(style): 산점도를 토큰으로 옮긴다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 경제 좌표평면 토큰화

**Files:**
- Modify: `src/core/graphs/EconPlane.ts`

`src/core/canvas/subscript.ts` 는 글꼴을 스스로 만들지 않는다 — 모든 함수가 `makeFont` 를 받는다. 고칠 것은 호출부가 넘기는 `makeFont` 뿐이고, **잴 때와 그릴 때 같은 makeFont** 를 넘겨야 한다.

- [ ] **Step 1: 상수를 LOOK 표로**

30–39 의 `AXIS_W`·`LINE_W`·`GUIDE_W`·`ARROW_W`·`DOT_R`, 49–52 의 점선 표, 61 의 `THICK_DASH` 를 지우고:

```ts
const LOOK = {
  classic: {
    axis: 2.5, line: 3, guide: 1.5, arrow: 2.5, dotR: 6,
    markerR: 6, markerStroke: 2, breakW: 1.6, legendLine: 2.5,
    thickDash: [12, 8],
    dash: { dashed: [7, 5], dotted: [1.5, 4] } as Record<'dashed' | 'dotted', number[]>,
  },
  exam: {
    axis: 1.9,        // 0.39pt (§3 #35)
    line: 4.0,        // 0.83pt (#34)
    guide: 1.45,      // 0.30pt (#36)
    arrow: 1.9,       // ≈ 축 굵기를 따름
    dotR: 10,         // 지름 4.1pt (#37)
    markerR: 6.8,     // 계열 기호 — 꺾은선 (#32)
    markerStroke: 1.75,
    breakW: 1.9,      // ≈
    legendLine: 4.0,
    thickDash: [15, 6.8], // ≈ 꺾은선 점선 3.1/1.4pt
    dash: { dashed: [7.6, 4.7], dotted: [1.5, 4] } as Record<'dashed' | 'dotted', number[]>,
  },
};
```

`ARROW_EXT`·`HEAD_LEN`·`HEAD_HALF`·`LABEL_GAP`·`NAME_LINE_H` 는 그대로(실측 없음).

render 함수에서 235–236 의 `nameFont`·`tickFont` 를 이것으로 바꾼다:

```ts
  const t = styleOf(options);
  const look = byStyle(options, LOOK);
  // 1.7.0 은 이 그림의 글자를 전부 보통 굵기로 그렸다 — legacy 로 지킨다
  const N = { weight: 'normal' } as const;
  const fontOf = (place: TextPlace) => (size: number) => textFont(options, place, size, N);
  const axisFont = fontOf('axisName');
  const tickFontOf = fontOf('tick');
  /** 선·점·화살표 이름 — S₁·D·E 는 기호, 공급·수요 는 지명 자리 */
  const labelFont = (s: string) => fontOf(labelPlace(s) === 'region' ? 'region' : 'symbol');
  const tickPx = textSize(options, 'tick', fs.tick);
  const axisPx = textSize(options, 'axisName', fs.axisLabel);
  const labelPx = (s: string) => textSize(options, labelPlace(s) === 'region' ? 'region' : 'symbol', fs.axisLabel);
  const tickFont = tickFontOf(tickPx);
```

(`TextPlace` 는 `import type { TextPlace } from '../canvas/style';`. `t` 가 안 쓰이면 지운다.)

- [ ] **Step 2: 표대로 바꾼다**

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 136–153 | `drawSeriesMarker(ctx, s, cx, cy)` 안 `DOT_R`(143·144)·`ctx.lineWidth = 2;`(149) | 서명 `drawSeriesMarker(ctx, s, cx, cy, r: number, strokeW: number)`, 143 `ctx.rect(cx - r, cy - r, r * 2, r * 2)`, 144 `ctx.arc(cx, cy, r, 0, Math.PI * 2)`, 149 `ctx.lineWidth = strokeW;` |
| 201·213 | `drawBreakMark(ctx, x, y, vertical)` · `ctx.lineWidth = 1.6;` | 인자 `lineW: number` 추가, `ctx.lineWidth = lineW;` |
| 245 | `richWidth(ctx, tickText(data.yAxis, i), fs.tick, nameFont)` | `richWidth(ctx, tickText(data.yAxis, i), tickPx, tickFontOf)` |
| 248 | `ctx.font = nameFont(fs.axisLabel);` | `ctx.font = axisFont(axisPx);` |
| 253, 255 | `richWidth(ctx, …, fs.axisLabel, nameFont)` (축 이름) | `richWidth(ctx, …, axisPx, axisFont)` |
| 258 | `richWidth(ctx, l.label, fs.axisLabel, nameFont)` | `richWidth(ctx, l.label, labelPx(l.label), labelFont(l.label))` |
| 274 | `(yNameLines.length - 1) * fs.axisLabel * NAME_LINE_H` | `(yNameLines.length - 1) * axisPx * NAME_LINE_H` |
| 277 | `… + fs.axisLabel + yNameExtra + 10 + ARROW_EXT` | `… + axisPx + yNameExtra + 10 + ARROW_EXT` |
| 288 | `bottom: fs.tick + 24 + bottomText,` | `bottom: tickPx + 24 + bottomText,` |
| 303 | `const dash = DASH_PATTERN[data.dash] ?? DASH_PATTERN.dashed;` | `const dash = look.dash[data.dash] ?? look.dash.dashed;` |
| 313, 337 | `ctx.lineWidth = GUIDE_W;` | `ctx.lineWidth = look.guide;` |
| 380 | `ctx.lineWidth = AXIS_W;` | `ctx.lineWidth = look.axis;` |
| 409 / 416 | `drawBreakMark(ctx, x, axY, false);` / `drawBreakMark(ctx, axX, y, true);` | 끝에 `, look.breakW` |
| 426, 440 | `ctx.lineWidth = LINE_W;` | `ctx.lineWidth = look.line;` |
| 429, 444 | `ctx.setLineDash(… ? THICK_DASH : []);` | `ctx.setLineDash(… ? look.thickDash : []);` |
| 465 | `const ly = Math.min(raw, axY - 6 - fs.axisLabel * 0.5);` | `const ly = Math.min(raw, axY - 6 - labelPx(line.label) * 0.5);` |
| 466 | `drawFloatingRich(ctx, line.label, lx, ly, w, h, fs.axisLabel, nameFont);` | `drawFloatingRich(ctx, line.label, lx, ly, w, h, labelPx(line.label), labelFont(line.label));` |
| 474 | `ctx.lineWidth = ARROW_W;` | `ctx.lineWidth = look.arrow;` |
| 503 | `drawFloatingRich(ctx, a.label, …, fs.axisLabel, nameFont);` | `… labelPx(a.label), labelFont(a.label));` |
| 516 | `ctx.arc(px, py, DOT_R, 0, Math.PI * 2);` | `ctx.arc(px, py, look.dotR, 0, Math.PI * 2);` |
| 520 | `const at = anchorOf(p.labelPos, DOT_R + LABEL_GAP);` | `const at = anchorOf(p.labelPos, look.dotR + LABEL_GAP);` |
| 523 | `drawFloatingRich(ctx, p.label, …, fs.axisLabel, nameFont);` | `… labelPx(p.label), labelFont(p.label));` |
| 530 | `drawSeriesMarker(ctx, s, toX(p.x), toY(p.y));` | `drawSeriesMarker(ctx, s, toX(p.x), toY(p.y), look.markerR, look.markerStroke);` |
| 541, 550 | `richWidth(ctx, text, fs.tick, nameFont)` · `fillRich(ctx, text, x, y, fs.tick, nameFont)` | `tickPx, tickFontOf` |
| 543, 547 | `fs.tick * 0.5` · `fs.tick + 4` | `tickPx * 0.5` · `tickPx + 4` |
| 561, 570 | `nudgeRichInside(…, fs.tick, nameFont)` | `nudgeRichInside(…, tickPx, tickFontOf)` |
| 586 | `drawFloatingRich(ctx, data.xAxis.label, xRight + 10, axY + fs.tick * 0.6, w, h, fs.axisLabel, nameFont);` | `drawFloatingRich(ctx, data.xAxis.label, xRight + 10, axY + tickPx * 0.6, w, h, axisPx, axisFont);` |
| 594, 604 | `drawFloatingRich(…, fs.axisLabel, nameFont);` (축 이름) | `… axisPx, axisFont);` |
| 599 | `const lh = fs.axisLabel * NAME_LINE_H;` | `const lh = axisPx * NAME_LINE_H;` |
| 621 | `dash: s.dashed ? THICK_DASH : [],` | `dash: s.dashed ? look.thickDash : [],` |
| 622 | `lineWidth: 2.5,` | `lineWidth: look.legendLine,` |
| 632 | `fontSize: fs.axisLabel * 0.8,` | `fontSize: textSize(options, 'legend', fs.axisLabel * 0.8),` |
| 633 | `font: nameFont(fs.axisLabel * 0.8),` | `font: textFont(options, 'legend', textSize(options, 'legend', fs.axisLabel * 0.8), { weight: 'normal', role: options.fontFamily ?? 'serif' }),` |
| 636–637 | `toX(p.x) - DOT_R` 등 넷 | `DOT_R` → `look.markerR` |

`fonts: options` 는 Task 4 에서 `drawInsideLegend` 호출에 이미 더했다.

- [ ] **Step 3: 관문** — Task 5 공통 규칙의 명령. 경제 골든 9장, `econ-broken-at.test.ts`, `subscript.test.ts` 가 민감하다.

- [ ] **Step 4: 커밋**

```bash
git add src/core/graphs/EconPlane.ts
git commit -m "refactor(style): 경제 좌표평면을 토큰으로 옮긴다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 표 둘·트리맵·원그래프 토큰화 + 채움 위 글자 도우미

**Files:**
- Modify: `src/core/canvas/labels.ts` (도우미 `inkText` 추가)
- Modify: `src/core/graphs/DataTable.ts`, `src/core/graphs/MatrixTable.ts`, `src/core/graphs/TreemapGraph.ts`, `src/core/graphs/StackedBarPie.ts:260-489`

표 칸 글자는 `base = options.fontSize.tick × fit` 으로 캔버스에 맞춰 줄인다. 그 크기를 `textSize` 로 감싸면 맞춤이 깨지므로 **표 안 글자는 지금 크기 식을 그대로 `textFont` 에 넘긴다.** `textSize` 는 맞춤을 안 타는 자리(행렬 단위·트리맵 이름·원 글자)에만 쓴다.

- [ ] **Step 1: `labels.ts` 에 채움 위 글자 도우미**

파일 끝에:

```ts
/**
 * 채움 위 글자. `light` 는 «검은 글자가 읽히는 바탕» 이다.
 *
 * 어두운 바탕에서 classic 은 흰 글자, exam 은 검은 글자 + 흰 테두리다(실측 §1.3).
 * `haloOnLight` 를 주면 밝은 바탕에도 흰 테두리를 두른다 — 1.7.0 누적 막대의
 * 빗금·점무늬 칸 글자가 그랬다.
 */
export function inkText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number | undefined,
  light: boolean,
  st: StyleTokens,
  haloOnLight = false,
): void {
  const halo = light ? haloOnLight : st.darkLabel === 'halo';
  if (!light && !halo) {
    ctx.fillStyle = '#fff';
    put(ctx, 'fill', text, x, y, maxW);
    return;
  }
  if (halo) {
    ctx.save();
    ctx.lineWidth = st.haloWidth;
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    put(ctx, 'stroke', text, x, y, maxW);
    ctx.restore();
  }
  ctx.fillStyle = '#000';
  put(ctx, 'fill', text, x, y, maxW);
}

/** maxW 가 없으면 넷째 인자를 아예 넘기지 않는다 — undefined 를 넘기면 백엔드에 따라 안 그려진다 */
function put(ctx: CanvasRenderingContext2D, kind: 'fill' | 'stroke', text: string, x: number, y: number, maxW?: number) {
  if (kind === 'fill') {
    if (maxW === undefined) ctx.fillText(text, x, y);
    else ctx.fillText(text, x, y, maxW);
  } else if (maxW === undefined) ctx.strokeText(text, x, y);
  else ctx.strokeText(text, x, y, maxW);
}
```

import 에 `import type { StyleTokens } from './style';` (이미 `styleOf` 를 import 했으면 같은 줄에).

⚠️ 지금 `StackedBarPie.drawSegmentLabel`(476–488)은 `ctx.fillText(text, cx, cy, maxW)` 를 maxW 가 undefined 일 수 있는 채로 부른다. 그 경로의 classic 바이트를 지키려면 **그 호출이 실제로 maxW 를 넘기는지** 먼저 본다 — 늘 숫자라면 위 `put` 과 같고, undefined 가 올 수 있으면 `inkText` 호출에 `maxW` 를 그대로 넘겨도 `put` 이 3인자 호출로 바꾼다. 골든 `stackedExam` 이 다르게 나오면 `put` 대신 원래처럼 4인자로 부르는 갈래를 시험해 본다.

- [ ] **Step 2: `DataTable.ts`**

```ts
const LOOK = {
  classic: { unitRatio: 0.8 },
  exam: { unitRatio: 0.9 }, // 단위 7.2pt ÷ 값 8.2pt
};
```

`const UNIT_RATIO = 0.8;`(19)을 지우고 render 첫머리에 `const look = byStyle(options, LOOK);`. `rowLabelWidth`·`drawRowLabel` 에 마지막 인자 `unitRatio: number` 를 더하고 호출부(41, 108)에서 `look.unitRatio` 를 넘긴다.

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 38 | `ctx.font = getFont(base, options, 'bold');` | `ctx.font = textFont(options, 'value', base);` |
| 94 | `ctx.font = getFont(cellFontSize, options, 'bold');` | `ctx.font = textFont(options, 'region', cellFontSize);` |
| 99 | `const family = data.columnIsSymbol && !data.columnIsSymbol[j] ? 'sans' : font;` | `const isSymbol = !data.columnIsSymbol \|\| data.columnIsSymbol[j];` `const family = isSymbol ? font : 'sans';` |
| 100 | `ctx.font = getFont(cellFontSize, options, 'bold', family);` | `ctx.font = textFont(options, isSymbol ? 'category' : 'region', cellFontSize, { role: family });` |
| 110 | `ctx.font = getFont(cellFontSize, options, 'bold');` | `ctx.font = textFont(options, 'value', cellFontSize);` |
| 128 | `ctx.lineWidth = 1;` | `ctx.lineWidth = styleOf(options).line.tableInner;` |
| 139 | `ctx.lineWidth = 2;` | `ctx.lineWidth = styleOf(options).line.tableOuter;` |
| 164, 182, 196 | `ctx.font = getFont(size, options, 'bold');` | `ctx.font = textFont(options, 'region', size);` |
| 167, 191, 198 | `ctx.font = getFont(size * UNIT_RATIO, options, 'bold');` | `ctx.font = textFont(options, 'unit', size * unitRatio);` |

`font` 이 `undefined`(fontFamily 미지정)여도 `textFont` 는 legacy.role 이 비면 «자리 기본값» 으로 가므로 1.7.0 의 `getFont(…, undefined)` 와 같다.

- [ ] **Step 3: `MatrixTable.ts`**

```ts
const LOOK = {
  classic: { cellLine: 1.2 },
  exam: { cellLine: 1.9 }, // 떨어진 상자 꼴(세계지리) 0.39pt — 이어진 계단표(한국지리 0.45pt)는 열린 질문
};
```

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 33 | `ctx.font = getFont(base, options, 'bold');` | `ctx.font = textFont(options, 'value', base);` |
| 40 | `const unitH = data.unit ? options.fontSize.dataLabel * 1.6 : 0;` | `const unitSize = textSize(options, 'unit', options.fontSize.dataLabel);` `const unitH = data.unit ? unitSize * 1.6 : 0;` |
| 74 | `ctx.font = getFont(options.fontSize.dataLabel, options, 'bold');` | `ctx.font = textFont(options, 'unit', unitSize);` |
| 92 | `ctx.lineWidth = 1.2;` | `ctx.lineWidth = look.cellLine;` |
| 98 | `const family = data.nameIsSymbol && !data.nameIsSymbol[i] ? 'sans' : font;` | `const isSymbol = !data.nameIsSymbol \|\| data.nameIsSymbol[i];` `const family = isSymbol ? font : 'sans';` |
| 99 | `ctx.font = getFont(cellFontSize, options, 'bold', family);` | `ctx.font = textFont(options, isSymbol ? 'category' : 'region', cellFontSize, { role: family });` |
| 104 | `ctx.font = getFont(cellFontSize, options, 'bold');` | `ctx.font = textFont(options, 'value', cellFontSize);` |

머리 칸 회색 `#d9d9d9`(`HEADER_FILL`·`NAME_FILL`)는 시험지 217 과 같아 두 양식 모두 그대로(§3 #42).

- [ ] **Step 4: `TreemapGraph.ts`**

```ts
const LOOK = {
  classic: { cellLine: 1 },
  exam: { cellLine: 1.9 }, // 칸 경계 검은 선 0.39pt (§3 #47 한국지리 꼴)
};
```

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 348 | `const labelSize = data.labelFontSize ?? options.fontSize.tick;` | `const labelSize = data.labelFontSize ?? textSize(options, 'region', options.fontSize.tick);` |
| 354 | `ctx.lineWidth = 1;` | `ctx.lineWidth = byStyle(options, LOOK).cellLine;` |
| 365, 370, 396 | `ctx.font = getFont(labelSize, options);` | `ctx.font = textFont(options, 'region', labelSize, { weight: 'normal' });` |
| 382 | `ctx.font = getFont(drawSize, options);` | `ctx.font = textFont(options, 'region', drawSize, { weight: 'normal' });` |
| 401 | `ctx.lineWidth = 2;` | `ctx.lineWidth = styleOf(options).line.axis;` |

트리맵에는 지금 칸 채움·값 줄·흰 테두리가 **없다**. 시험지 트리맵의 «어두운 칸 + 두 줄(이름·값)» 은 새 자료 칸이 필요해 이 계획 밖이다(끝의 «열린 질문»).

- [ ] **Step 5: `StackedBarPie.ts` — 원그래프와 막대 칸 글자**

원 쪽 표(`renderPieChart` 260–418). 함수 첫머리(266 다음)에:

```ts
  const st = styleOf(options);
  const look = byStyle(options, PIE_LOOK);
  const catSize = textSize(options, 'category', options.fontSize.tick);
```

파일 위에:

```ts
const PIE_LOOK = {
  classic: { sliceLine: 1, rimLine: 1.5 },
  exam: { sliceLine: 1.9, rimLine: 1.9 }, // 원 테두리·조각 경계 0.39pt (실측 §2 stacked 원)
};
```

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 270 | `measureLegendWidth(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5, options)` | `measureLegendWidth(ctx, data.seriesLabels, textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5), options)` |
| 275 | `measureBottomLegend(ctx, data.seriesLabels, options.fontSize.dataLabel * 0.85 + 5,` | `measureBottomLegend(ctx, data.seriesLabels, textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5),` |
| 304 | `const labelSpace = options.fontSize.tick + 16;` | `const labelSpace = catSize + 16;` |
| 341 | `ctx.lineWidth = 1;` | `ctx.lineWidth = look.sliceLine;` |
| 349–353 | `ctx.fillStyle = lightAt(data, s) ? '#000' : '#fff';` … `ctx.font = getFont(options.fontSize.dataLabel * 0.8, options, 'bold');` … `ctx.fillText(String(val), lx, ly);` | `const light = lightAt(data, s);` `ctx.font = textFont(options, 'value', textSize(options, 'value', options.fontSize.dataLabel * 0.8));` (정렬 두 줄은 그대로) `inkText(ctx, String(val), lx, ly, undefined, light, st);` |
| 361 | `ctx.lineWidth = 1.5;` | `ctx.lineWidth = look.rimLine;` |
| 368 | `ctx.font = getFont(options.fontSize.tick, options, 'bold');` | `ctx.font = textFont(options, 'category', catSize);` |
| 392, 404 | `const pieBottom = lastCy + maxR + 12 + options.fontSize.tick;` | `const pieBottom = lastCy + maxR + 12 + catSize;` |
| 398, 410 | `fontSize: options.fontSize.dataLabel * 0.85 + 5,` | `fontSize: textSize(options, 'legend', options.fontSize.dataLabel * 0.85 + 5),` |

막대 칸 글자(`drawSegmentLabel` 453–489):

| 줄 | 지금 | 바꿀 코드 |
|---|---|---|
| 465 | `const size = options.fontSize.dataLabel * 0.9;` | 470 줄 뒤로 옮겨 `const isSymbol = !data.seriesIsSymbol \|\| data.seriesIsSymbol[s];` `const size = textSize(options, isSymbol ? 'symbol' : 'region', options.fontSize.dataLabel * 0.9);` (467 의 `barH < size * 1.1` 이 이 값을 쓰므로 그 위에 둔다) |
| 470 | `const family = data.seriesIsSymbol && !data.seriesIsSymbol[s] ? 'sans' : options.fontFamily;` | `const family = isSymbol ? options.fontFamily : 'sans';` |
| 471 | `ctx.font = getFont(size, options, 'bold', family);` | `ctx.font = textFont(options, isSymbol ? 'symbol' : 'region', size, { role: family });` |
| 476–488 | `if (light) { …strokeText… ctx.fillStyle = '#000'; } else { ctx.fillStyle = '#fff'; } ctx.fillText(text, cx, cy, maxW);` | `inkText(ctx, text, cx, cy, maxW, light, styleOf(options), true);` |

막대 쪽 범례 크기 식(34·40 근처·252)은 Task 5 에서 바꾼다.

- [ ] **Step 6: 관문** — Task 5 공통 규칙의 명령. `dataTable`·`matrixTable`·`treemap*`·`stacked*`·`stackedPie` 골든이 민감하다.

- [ ] **Step 7: 커밋**

```bash
git add src/core/canvas/labels.ts src/core/graphs/DataTable.ts src/core/graphs/MatrixTable.ts src/core/graphs/TreemapGraph.ts src/core/graphs/StackedBarPie.ts
git commit -m "refactor(style): 표·트리맵·원그래프를 토큰으로 옮긴다 — 채움 위 글자 도우미

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 토큰화 감사 — 박힌 굵기·선 굵기가 남지 않았다 (단계 A 관문)

**Files:**
- Create: `test/core/style-audit.test.ts`

- [ ] **Step 1: 감사 시험을 쓴다**

```ts
// © 2026 김용현
// 렌더러에 굵기·선 굵기·점선을 다시 박지 못하게 한다.
//
// 양식(exam·classic)이 갈리는 값은 전부 style.ts 토큰이나 파일 안 LOOK 표에 있어야
// 한다. 숫자를 그 자리에 바로 쓰면 그 자리는 양식을 바꿔도 안 바뀐다 — 2.0.0 의
// 토큰화가 막으려던 결함이다. (한 칸짜리 readdirSync 만 쓴다 — 한글 경로)
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = [join(__dirname, '../../src/core/graphs'), join(__dirname, '../../src/core/canvas')];
const FILES = DIRS.flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.ts')).map((f) => join(d, f)));

/** 이 파일들은 토큰을 정의하는 쪽이다 */
const DEFINERS = ['style.ts'];
/** 양식과 상관없는 그림 — 패턴 타일(흰 배경 위 검은 무늬)과 글자 테두리 도우미 */
const ALLOWED_LINE_WIDTH = /patterns\.ts$/;

const RULES: [string, RegExp][] = [
  ["getFont(…, 'bold')", /getFont\([^)]*'bold'/],
  ['`bold ${…}px` 글꼴 문자열', /`bold \$\{/],
  ['ctx.lineWidth = <숫자>', /\.lineWidth\s*=\s*\d/],
  ['setLineDash([<숫자>…])', /setLineDash\(\[\s*\d/],
];

describe('렌더러에 양식 값이 박혀 있지 않다', () => {
  for (const file of FILES) {
    const name = file.split(/[\\/]/).pop()!;
    if (DEFINERS.includes(name)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const [label, re] of RULES) {
      if (label.startsWith('ctx.lineWidth') && ALLOWED_LINE_WIDTH.test(file)) continue;
      it(`${name} — ${label}`, () => {
        const hits = lines
          .map((l, i) => [i + 1, l] as const)
          .filter(([, l]) => re.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*'));
        expect(hits.map(([n, l]) => `${n}: ${l.trim()}`)).toEqual([]);
      });
    }
  }
});
```

- [ ] **Step 2: 돌려 본다**

Run: `npx vitest run test/core/style-audit.test.ts`
Expected: 작업 3–11 을 빠짐없이 했다면 PASS. FAIL 이면 메시지에 «파일: 줄 번호: 코드» 가 나온다 — 그 줄을 같은 작업의 표 규칙대로 토큰·LOOK 으로 바꾼다(classic 값은 그대로 LOOK.classic 에).

- [ ] **Step 3: 단계 A 관문 — 전체 시험·린트·빌드**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run build`
Expected: 전부 PASS. 골든 86건(classic 43장) 바이트 동일. `git status` 에서 `test/core/__snapshots__/` 아래가 **하나도 안 바뀌었다**.

`docs/lib/csat-chart.umd.min.js` 가 바뀌었으면 이 커밋에 함께 넣는다(CI 가 낡은 산출물을 막는다).

- [ ] **Step 4: 커밋**

```bash
git add test/core/style-audit.test.ts docs/lib/csat-chart.umd.min.js
git commit -m "test(style): 렌더러에 굵기·선 굵기를 다시 박지 못하게 감사한다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Step 2 에서 고친 렌더러가 있으면 그 파일도 이름으로 더한다.)

---

## 단계 B — 글꼴

### Task 13: 숫자 글꼴 고르기 — 본문 «한양신명조» 숫자와 꼴 대조

실측 §1.1·§4 결정 1: 시험지 숫자는 본문 `한양신명조` 숫자와 같고, 설치된 `HY신명조` 숫자는 다르다(탈락). 이 작업은 **한글 글꼴이 없는 세리프** 후보들의 숫자를 본문 숫자와 견줘 순위를 매긴다. 한글이 없어야 «숫자 글꼴을 앞에 두면 한 글줄 안에서 숫자·괄호만 그 글꼴, 한글은 뒤 글꼴» 이 된다(작업 14).

**Files:**
- Create: `planning/tools/exam-measure/numerals.py`
- Modify: `planning/tools/exam-measure/test_measure.py` (시험 추가)
- Modify: `planning/specs/2026-10-07-exam-style-measurements.md` (§4 결정 아래에 결과)

- [ ] **Step 1: 실패하는 시험을 더한다**

`test_measure.py` 맨 위 import 다음 줄에 `from numerals import normalize, iou, aspect, N` 을 더하고, 파일 끝에:

```python
class Numerals(unittest.TestCase):
    def test_normalize_fits_height(self):
        m = np.zeros((40, 100), dtype=bool)
        m[10:30, 20:30] = True              # 20 높이 × 10 폭
        out = normalize(m)
        self.assertEqual(out.shape, (N, N))
        ys, xs = np.nonzero(out)
        self.assertEqual(ys.max() - ys.min() + 1, N)
        self.assertAlmostEqual((xs.max() - xs.min() + 1) / N, 0.5, delta=0.05)

    def test_iou_same_and_disjoint(self):
        a = np.zeros((N, N), dtype=bool); a[:, :10] = True
        b = np.zeros((N, N), dtype=bool); b[:, 20:30] = True
        self.assertEqual(iou(a, a), 1.0)
        self.assertEqual(iou(a, b), 0.0)

    def test_aspect(self):
        m = np.zeros((50, 50), dtype=bool); m[5:25, 5:15] = True
        self.assertAlmostEqual(aspect(m), 0.5)
```

Run: `python -I -m unittest discover -s planning/tools/exam-measure -t planning/tools/exam-measure`
Expected: FAIL — `ModuleNotFoundError: No module named 'numerals'`.

- [ ] **Step 2: `numerals.py`**

```python
# © 2026 김용현
"""숫자 글꼴 후보 대조 — 본문 «한양신명조» 숫자와 후보 글꼴 숫자의 꼴을 견준다.
-> exam-samples/_work/numerals.png (줄마다 글꼴 하나), numerals.csv (점수 순)

점수 = 숫자 10개의 평균 IoU(높이를 맞춘 잉크 겹침) − 0.5 × 평균 |폭/높이 비 차이|.
한글 글자가 있는 글꼴은 숫자 자리 앞에 둘 수 없으므로 «쓸 수 없음» 으로 표시한다."""
import csv
import sys
from pathlib import Path

import fitz
import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import WORK, font_name, utf8_stdout
from crop import pdf_path

N = 64
DIGITS = "0123456789"
REF_EXAM = "2026_11_korgeo"
FONTS = Path(r"C:\Windows\Fonts")
# (이름, 파일, ttc 번호, Windows 기본 탑재 여부). Office 가 깔아 주는 것은 False.
CANDIDATES = [
    ("Times New Roman", "times.ttf", 0, True),
    ("Georgia", "georgia.ttf", 0, True),
    ("Cambria", "cambria.ttc", 0, True),
    ("Constantia", "constan.ttf", 0, True),
    ("Palatino Linotype", "pala.ttf", 0, True),
    ("Book Antiqua", "BKANT.TTF", 0, False),
    ("Century", "CENTURY.TTF", 0, False),
    ("Bookman Old Style", "BOOKOS.TTF", 0, False),
    ("Garamond", "GARA.TTF", 0, False),
    ("HY신명조", "H2MJSM.TTF", 0, False),  # 기준 — 실측 §4 에서 이미 탈락
]


def normalize(mask):
    """잉크 상자로 잘라 높이 N 에 맞추고 N×N 가운데 놓는다 (bool 배열)."""
    ys, xs = np.nonzero(mask)
    out = np.zeros((N, N), dtype=bool)
    if len(ys) == 0:
        return out
    m = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    nw = max(1, min(N, round(w * N / h)))
    img = Image.fromarray((m * 255).astype(np.uint8)).resize((nw, N), Image.BILINEAR)
    x0 = (N - nw) // 2
    out[:, x0:x0 + nw] = np.array(img) >= 128
    return out


def iou(a, b):
    u = np.logical_or(a, b).sum()
    return float(np.logical_and(a, b).sum() / u) if u else 0.0


def aspect(mask):
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return 0.0
    return (xs.max() - xs.min() + 1) / (ys.max() - ys.min() + 1)


def reference_digits(zoom=12):
    """본문 벡터 글자에서 «한양신명조» 숫자 하나씩 (잉크 bool 배열)."""
    got = {}
    doc = fitz.open(pdf_path(REF_EXAM))
    for page in doc:
        for b in page.get_text("rawdict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if "한양신명조" not in font_name(s["font"]):
                        continue
                    for ch in s["chars"]:
                        c = ch["c"]
                        if c in DIGITS and c not in got:
                            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom),
                                                  clip=fitz.Rect(ch["bbox"]), colorspace=fitz.csGRAY)
                            a = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width)
                            got[c] = a < 128
        if len(got) == len(DIGITS):
            return got
    raise SystemExit(f"본문에서 못 찾은 숫자: {''.join(sorted(set(DIGITS) - set(got)))}")


def has_hangul(path, index):
    font = TTFont(str(path), fontNumber=index, lazy=True)
    return 0xAC00 in font.getBestCmap()


def render_digit(path, index, c, size=200):
    f = ImageFont.truetype(str(path), size, index=index)
    im = Image.new("L", (size * 2, size * 2), 255)
    ImageDraw.Draw(im).text((size // 2, size // 4), c, font=f, fill=0)
    return np.array(im) < 128


def main():
    utf8_stdout()
    ref = {c: normalize(m) for c, m in reference_digits().items()}
    ref_aspect = {c: aspect(m) for c, m in ref.items()}
    rows, strips = [], [("본문 한양신명조", [ref[c] for c in DIGITS])]
    for name, file, index, stock in CANDIDATES:
        path = FONTS / file
        if not path.exists():
            print(f"{name:20s} 없음 ({file})")
            continue
        glyphs = {c: normalize(render_digit(path, index, c)) for c in DIGITS}
        ious = [iou(ref[c], glyphs[c]) for c in DIGITS]
        adiff = [abs(aspect(glyphs[c]) - ref_aspect[c]) for c in DIGITS]
        score = float(np.mean(ious) - 0.5 * np.mean(adiff))
        usable = not has_hangul(path, index)
        rows.append({"font": name, "file": file, "stock_windows": stock, "usable": usable,
                     "score": round(score, 4), "iou": round(float(np.mean(ious)), 4),
                     "aspect_diff": round(float(np.mean(adiff)), 4)})
        strips.append((name, [glyphs[c] for c in DIGITS]))
    rows.sort(key=lambda r: (not r["usable"], -r["score"]))
    WORK.mkdir(parents=True, exist_ok=True)
    with open(WORK / "numerals.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    for r in rows:
        print(f"{r['font']:20s} 점수 {r['score']:.4f}  IoU {r['iou']:.4f}  비 차이 {r['aspect_diff']:.4f}"
              f"  {'Windows 기본' if r['stock_windows'] else '        '}  {'' if r['usable'] else '한글 있음 — 쓸 수 없음'}")
    sheet = Image.new("L", (N * len(DIGITS) + 8 * len(DIGITS), (N + 8) * len(strips)), 255)
    for k, (_, gs) in enumerate(strips):
        for j, g in enumerate(gs):
            sheet.paste(Image.fromarray(np.where(g, 0, 255).astype(np.uint8)), (j * (N + 8), k * (N + 8)))
    sheet.save(WORK / "numerals.png")
    print("->", WORK / "numerals.png", "(줄 순서: 본문, 그다음 CANDIDATES 순)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: 시험 통과**

Run: `python -I -m unittest discover -s planning/tools/exam-measure -t planning/tools/exam-measure`
Expected: `OK` (기존 7 + 새 3).

- [ ] **Step 4: 돌려서 고른다**

Run: `python -I planning/tools/exam-measure/numerals.py`
Expected: 후보마다 점수 한 줄, `numerals.png`·`numerals.csv` 생성. `numerals.png` 를 Read 로 열어 첫 줄(본문)과 각 줄의 `2`(공 꼬리)·`7`(굽은 기둥)·`4`(닫힌 머리)·`1`(깃발)을 눈으로 견준다.

고르는 규칙:
1. `usable` 이 아닌 글꼴은 뺀다.
2. 숫자 글꼴 순서 = [Windows 기본 탑재 중 1등] → [전체 1등(앞과 다르면)] → `'Times New Roman'`(macOS 에도 있다, 이미 들어 있으면 생략).
3. 눈으로 본 꼴이 점수와 크게 어긋나면(예: `7` 기둥이 곧은 글꼴이 1등) 점수 2등을 올리고 그 이유를 적는다.

결과 문자열 예: `"'Book Antiqua', 'Palatino Linotype', 'Times New Roman'"` — 이것이 작업 14 의 `EXAM_NUMERAL_STACK` 이다.

- [ ] **Step 5: 명세에 남긴다**

`planning/specs/2026-10-07-exam-style-measurements.md` 맨 끝(«결정» 목록 다음)에:

```markdown
### 숫자 글꼴 대조 (2026-10-07, 2단계 작업 13)

`planning/tools/exam-measure/numerals.py` — 본문 «한양신명조» 숫자(2026_11_korgeo)와 후보의 숫자 10개를
높이를 맞춰 겹친 IoU − 0.5 × 폭/높이 비 차이.

| 순위 | 글꼴 | 점수 | IoU | 비 차이 | Windows 기본 | 한글 |
|---|---|---|---|---|---|---|
| (numerals.csv 의 줄을 그대로) | | | | | | |

→ `EXAM_NUMERAL_STACK = "<고른 문자열>"`. 사용자 검토(작업 28)에서 바뀔 수 있다.
```

표의 줄은 `numerals.csv` 를 그대로 옮긴다(값을 지어내지 않는다).

- [ ] **Step 6: 커밋**

```bash
git add planning/tools/exam-measure/numerals.py planning/tools/exam-measure/test_measure.py planning/specs/2026-10-07-exam-style-measurements.md
git commit -m "docs(measure): 숫자 글꼴 후보를 본문 한양신명조 숫자와 대조해 고른다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: `numeral` 글꼴 자리와 시험지 글꼴 순서 (TDD)

**Files:**
- Modify: `src/core/types/common.ts:46-70` (`FontRole`, `FontStack`)
- Modify: `src/core/canvas/style.ts` (글꼴 순서 상수, `stack` 칸, exam 자리)
- Modify: `src/core/canvas/renderer.ts:16-45` (상수 이전, `fontStackOf`)
- Modify: `src/core/index.ts` (내보내기)
- Test: `test/core/style.test.ts`

- [ ] **Step 1: 실패하는 시험을 더한다**

`test/core/style.test.ts` 의 import 두 줄을 넓힌다 — `../../src/core/canvas/style` 쪽에 `DEFAULT_SERIF_STACK, DEFAULT_SANS_STACK, EXAM_SERIF_STACK, EXAM_SANS_STACK, EXAM_NUMERAL_STACK`, `../../src/core/canvas/renderer` 쪽에 `fontStackOf`. 그리고 파일 끝에:

```ts
describe('글꼴 순서', () => {
  it('classic 은 1.7.0 그대로 — 숫자 글꼴을 붙이지 않는다', () => {
    expect(fontStackOf({ style: 'classic' }, 'serif')).toBe(DEFAULT_SERIF_STACK);
    expect(fontStackOf({ style: 'classic' }, 'sans')).toBe(DEFAULT_SANS_STACK);
    expect(fontStackOf({ style: 'classic' }, 'numeral')).toBe(DEFAULT_SERIF_STACK);
  });

  it('exam 은 숫자 글꼴을 앞에 둔다 — 숫자·괄호는 세리프, 한글은 뒤 글꼴', () => {
    expect(fontStackOf({ style: 'exam' }, 'numeral')).toBe(`${EXAM_NUMERAL_STACK}, ${EXAM_SERIF_STACK}`);
    expect(fontStackOf({ style: 'exam' }, 'serif')).toBe(`${EXAM_NUMERAL_STACK}, ${EXAM_SERIF_STACK}`);
    expect(fontStackOf({ style: 'exam' }, 'sans')).toBe(`${EXAM_NUMERAL_STACK}, ${EXAM_SANS_STACK}`);
  });

  it('시험지 고딕 1순위는 HY중고딕, 명조는 신명 별칭 다음 HY신명조', () => {
    expect(EXAM_SANS_STACK.startsWith("'HY중고딕', 'HYGothic-Medium'")).toBe(true);
    expect(EXAM_SANS_STACK.endsWith("'Noto Sans KR', sans-serif")).toBe(true);
    expect(EXAM_SERIF_STACK).toContain("'HY신명조', 'HYSinMyeongJo-Medium', 'Noto Serif KR', serif");
  });

  it('숫자 글꼴 목록에 Noto 가 없다 — 사용자가 두 자리를 다 주면 Noto 가 한 번도 안 쓰여야 한다', () => {
    expect(EXAM_NUMERAL_STACK).not.toContain('Noto');
  });

  it('자리를 직접 준 사람의 글꼴에는 숫자 글꼴을 붙이지 않는다', () => {
    expect(fontStackOf({ style: 'exam', fontStack: { sans: "'내고딕'" } }, 'sans')).toBe("'내고딕'");
    expect(fontStackOf({ style: 'exam', fontStack: { serif: "'내명조'" } }, 'serif')).toBe("'내명조'");
    // 숫자 자리는 직접 준 명조를 뒤에 둔다
    expect(fontStackOf({ style: 'exam', fontStack: { serif: "'내명조'" } }, 'numeral'))
      .toBe(`${EXAM_NUMERAL_STACK}, '내명조'`);
  });

  it('숫자 글꼴을 직접 주면 그것이 기본 명조·고딕 앞에 선다', () => {
    const o = { style: 'exam' as const, fontStack: { numeral: "'내숫자'" } };
    expect(fontStackOf(o, 'sans')).toBe(`'내숫자', ${EXAM_SANS_STACK}`);
    expect(fontStackOf(o, 'numeral')).toBe(`'내숫자', ${EXAM_SERIF_STACK}`);
  });

  it('exam 눈금·기호·자료값·연도는 숫자 자리', () => {
    const o = { ...createDefaultGraphOptions(), style: 'exam' as const };
    for (const place of ['tick', 'symbol', 'value', 'year'] as const) {
      expect(textFont(o, place, 30)).toBe(`normal 30px ${EXAM_NUMERAL_STACK}, ${EXAM_SERIF_STACK}`);
    }
  });
});
```

Run: `npx vitest run test/core/style.test.ts`
Expected: FAIL — `EXAM_SERIF_STACK` 등이 style.ts 에 없다.

- [ ] **Step 2: 타입**

`src/core/types/common.ts`:

```ts
/**
 * 글꼴 자리. 시험지는 명조·고딕 자리가 갈리고, 숫자·라틴 문자는 따로 세리프다.
 * - `numeral` — 눈금 숫자·연도·자료값·라틴 기호 `A`·`S₁` (2.0.0)
 */
export type FontRole = 'serif' | 'sans' | 'numeral' | 'custom';
```

`FontStack` 에 칸 하나:

```ts
  /**
   * 숫자 자리 — 눈금·연도·자료값·라틴 기호. 한글이 **없는** 세리프 글꼴을 준다.
   * 이 글꼴은 명조·고딕 기본 순서 앞에도 붙어, 한 글줄 안에서 숫자·괄호만
   * 이 글꼴로, 한글은 뒤 글꼴로 그려진다. 기본은 양식이 정한다(classic 없음).
   */
  numeral?: string;
```

- [ ] **Step 3: `style.ts` — 글꼴 순서**

파일 머리 import 아래에:

```ts
/** 1.7.x 명조 자리 — 축 이름·눈금·자료값 */
export const DEFAULT_SERIF_STACK = "'Noto Serif KR', 'NanumMyeongjo', serif";
/** 1.7.x 고딕 자리 — 제목·출처·각주·범례 */
export const DEFAULT_SANS_STACK = "'Noto Sans KR', sans-serif";
/**
 * 시험지 명조 — 신명 중명조(상용, 설치된 PC 에서만) → HY신명조 → Noto.
 * 신명의 정확한 family 이름은 설치해 봐야 안다(설계 §4) — 별칭을 여럿 둔다.
 */
export const EXAM_SERIF_STACK =
  "'신명 중명조', '신명-중명조', '신명중명조', 'HY신명조', 'HYSinMyeongJo-Medium', 'Noto Serif KR', serif";
/** 시험지 고딕 — 그림 속 고딕은 HY중고딕과 꼴·굵기가 맞는다(실측 §4 결정 2) */
export const EXAM_SANS_STACK =
  "'HY중고딕', 'HYGothic-Medium', '돋움', 'Dotum', 'Noto Sans KR', sans-serif";
/**
 * 시험지 숫자 — 본문 «한양신명조» 숫자와 꼴이 가장 가까운, 한글이 없는 세리프.
 * 작업 13(numerals.py)의 결과다 — 실측 명세 «숫자 글꼴 대조» 참고.
 */
export const EXAM_NUMERAL_STACK = "'Times New Roman'";
```

`EXAM_NUMERAL_STACK` 의 값은 **작업 13 Step 4 에서 고른 문자열**로 바꾼다(위 `'Times New Roman'` 은 그 결과가 Times 하나일 때의 모양이다).

`StyleTokens` 에 칸을 더한다:

```ts
  /** 글꼴 순서 — numeral 이 비어 있지 않으면 명조·고딕 기본 순서 앞에 붙는다 */
  stack: { serif: string; sans: string; numeral: string };
```

`classicStyle` 에 `stack: { serif: DEFAULT_SERIF_STACK, sans: DEFAULT_SANS_STACK, numeral: '' },`, `examStyle` 에 `stack: { serif: EXAM_SERIF_STACK, sans: EXAM_SANS_STACK, numeral: EXAM_NUMERAL_STACK },`.

`examStyle.text` 에서 네 자리의 글꼴 자리를 `'numeral'` 로 바꾸고 «작업 14 에서 …» 주석을 지운다:

```ts
    tick: examText('numeral', true, same),
    symbol: examText('numeral', true, same),
    value: examText('numeral', true, same),
    year: examText('numeral', false, (fs) => fs.tick),
```

- [ ] **Step 4: `renderer.ts` — `fontStackOf`**

17–20 줄의 두 상수 정의를 지우고 style.ts 에서 가져와 다시 내보낸다:

```ts
import { styleOf, DEFAULT_SERIF_STACK, DEFAULT_SANS_STACK, type TextPlace } from './style';
export { DEFAULT_SERIF_STACK, DEFAULT_SANS_STACK };
```

`fontStackOf` 를 바꾼다:

```ts
/** 자리 이름 하나를 실제 글꼴 문자열로 푼다 */
export function fontStackOf(fonts: FontOptions, role: FontRole): string {
  if (role === 'custom') return fonts.customFont || CUSTOM_FALLBACK_STACK;
  const t = styleOf(fonts);
  const given = fonts.fontStack ?? {};
  const serif = given.serif || t.stack.serif;
  const sans = given.sans || t.stack.sans;
  const numeral = given.numeral || t.stack.numeral;
  if (role === 'numeral') return numeral ? `${numeral}, ${serif}` : serif;
  const base = role === 'sans' ? sans : serif;
  const own = role === 'sans' ? given.sans : given.serif;
  // 시험지의 숫자·괄호는 어느 자리에서나 세리프다. 숫자 글꼴에는 한글이 없으므로
  // 앞에 두면 한 글줄 안에서 숫자·괄호만 그 글꼴로, 한글은 뒤 글꼴로 넘어간다.
  // 자리를 직접 준 사람의 글꼴에는 붙이지 않는다 — 준 그대로 쓴다.
  return numeral && !own ? `${numeral}, ${base}` : base;
}
```

`src/core/index.ts` 의 공용 유틸 블록에 `EXAM_SERIF_STACK, EXAM_SANS_STACK, EXAM_NUMERAL_STACK` 를 `./canvas/style` 내보내기 줄에 더한다.

- [ ] **Step 5: 시험**

Run: `npx vitest run test/core/style.test.ts test/core/font-stack.test.ts && npm run typecheck`
Expected: PASS. 아직 기본 양식이 classic 이라 font-stack.test 는 그대로 통과한다.

- [ ] **Step 6: 전체 + 골든**

Run: `npx vitest run`
Expected: 전부 PASS — classic 골든 86건 그대로(classic 의 `stack.numeral` 은 빈 문자열이라 글꼴 문자열이 1.7.0 과 같다).

- [ ] **Step 7: 커밋**

```bash
git add src/core/types/common.ts src/core/canvas/style.ts src/core/canvas/renderer.ts src/core/index.ts test/core/style.test.ts
git commit -m "feat(fonts): numeral 글꼴 자리와 시험지 글꼴 순서 — HY중고딕 1순위, 숫자 글꼴 앞세우기

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: 한 글줄 안 글꼴 섞임 확인 — `(통계청)` = 세리프 괄호 + 고딕 한글

`(통계청)`·`(만 명)` 은 괄호만 세리프, 한글은 고딕이어야 한다(실측 §4 결정 3). 작업 14 는 이것을 «숫자 글꼴(한글 없음)을 앞에 둔 글꼴 목록» 으로 푼다 — 캔버스가 **글자마다** 다음 글꼴로 넘어가야 성립한다. CSS 글꼴 대체 규칙상 브라우저는 글자 단위로 넘어간다. Node(@napi-rs/canvas)는 이 PC 에서 2026-10-07 에 확인했다: `'Times New Roman', 'HYGothic-Medium'` 로 잰 `(통계청)` 폭 109.98 = `()` Times 19.98 + `통계청` HY중고딕 90.00 (HY중고딕만으로는 114.96).

**Files:**
- Create: `test/core/font-fallback.test.ts`
- Create(커밋 안 함): `planning/specs/exam-samples/_work/fallback.html`

- [ ] **Step 1: Node 쪽 시험**

```ts
// © 2026 김용현
// 한 글줄 안에서 글꼴이 글자마다 넘어가는가 — 시험지의 «세리프 괄호 + 고딕 한글».
//
// 두 글꼴이 깔린 기계에서만 뜻이 있다(CI 우분투에는 없다) — 없으면 건너뛴다.
import { describe, it, expect } from 'vitest';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import { textFont, createDefaultGraphOptions } from '../../src/core/index';
import { EXAM_NUMERAL_STACK } from '../../src/core/canvas/style';

const has = (f: string) => GlobalFonts.families.some((x) => x.family === f);
const NUM = EXAM_NUMERAL_STACK.split(',')[0].trim().replace(/'/g, '');
const ready = has(NUM) && has('HYGothic-Medium');

describe.runIf(ready)('한 글줄 안 글꼴 섞임 (@napi-rs/canvas)', () => {
  const ctx = createCanvas(10, 10).getContext('2d');
  const width = (font: string, s: string) => {
    ctx.font = font;
    return ctx.measureText(s).width;
  };

  it('괄호는 숫자 글꼴, 한글은 다음 글꼴에서 가져온다', () => {
    const mixed = width(`30px '${NUM}', 'HYGothic-Medium'`, '(통계청)');
    const parts = width(`30px '${NUM}'`, '()') + width(`30px 'HYGothic-Medium'`, '통계청');
    expect(mixed).toBeCloseTo(parts, 0);
    expect(Math.abs(mixed - width(`30px 'HYGothic-Medium'`, '(통계청)'))).toBeGreaterThan(1);
  });

  it('exam 의 출처 글꼴 문자열이 그렇게 섞인다', () => {
    const o = { ...createDefaultGraphOptions('exam'), style: 'exam' as const };
    const mixed = width(textFont(o, 'source', 30), '(통계청)');
    const parts = width(`30px '${NUM}'`, '()') + width(`30px 'HYGothic-Medium'`, '통계청');
    expect(mixed).toBeCloseTo(parts, 0);
  });
});
```

(`createDefaultGraphOptions('exam')` 은 작업 16 에서 생긴다. 이 작업을 16 보다 먼저 하면 둘째 시험의 `o` 를 `{ ...createDefaultGraphOptions(), style: 'exam' as const }` 로 쓰고, 작업 16 에서 고친다.)

Run: `npx vitest run test/core/font-fallback.test.ts`
Expected: 이 PC 에서 2 passed. (건너뛰어지면 `GlobalFonts.families` 에 두 이름이 있는지부터 본다.)

- [ ] **Step 2: 브라우저 확인 (Chrome·Edge, 있으면 Firefox)**

`planning/specs/exam-samples/_work/fallback.html` (gitignore 된 폴더):

```html
<!doctype html><meta charset="utf-8"><title>글꼴 섞임</title>
<canvas id="c" width="900" height="260" style="border:1px solid #ccc"></canvas>
<pre id="out"></pre>
<script>
const NUM = "'Times New Roman'"; // EXAM_NUMERAL_STACK 의 첫 글꼴로 바꾼다
const ctx = document.getElementById('c').getContext('2d');
const w = (f, s) => { ctx.font = f; return ctx.measureText(s).width; };
const lines = [
  ['섞음', `40px ${NUM}, 'HY중고딕', 'HYGothic-Medium'`],
  ['숫자 글꼴만', `40px ${NUM}`],
  ['고딕만', `40px 'HY중고딕', 'HYGothic-Medium'`],
];
let y = 60;
for (const [name, font] of lines) { ctx.font = font; ctx.fillText(`${name}: (통계청) (만 명) 2023`, 10, y); y += 70; }
const mixed = w(lines[0][1], '(통계청)');
const parts = w(lines[1][1], '()') + w(lines[2][1], '통계청');
document.getElementById('out').textContent =
  `섞음 ${mixed.toFixed(2)} / 괄호+한글 ${parts.toFixed(2)} → ${Math.abs(mixed - parts) < 1 ? '글자마다 넘어간다 ✔' : '안 넘어간다 ✘'}`;
</script>
```

Chrome·Edge(가능하면 Firefox)에서 `file:///` 로 열어 아래 줄이 `✔` 인지, 첫 줄의 괄호가 둘째 줄 괄호와 같은 꼴인지 본다. 결과를 실측 명세 «숫자 글꼴 대조» 절 아래에 한 줄씩 적는다(브라우저 이름·판·✔/✘).

- [ ] **Step 3: ✘ 가 하나라도 나오면 — 글자 단위 나눠 그리기로 바꾼다**

(✔ 만 나오면 이 단계를 건너뛴다.) `src/core/canvas/renderer.ts` 에 글줄을 «한글 덩어리 / 나머지» 로 나눠 그리는 도우미를 두고, exam 에서 `source`·`unit`·`footnote`·`legend`·`category` 자리 `fillText` 를 이것으로 바꾼다:

```ts
const HANGUL_RUN = /([\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]+)/;

/** 한글 덩어리는 korean 글꼴, 나머지는 latin 글꼴로 이어 그린다 (textAlign 은 left 로 바꿔 계산한다) */
export function fillMixed(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, latin: string, korean: string): void {
  const parts = text.split(HANGUL_RUN).filter(Boolean);
  const widths = parts.map((p) => { ctx.font = HANGUL_RUN.test(p) ? korean : latin; return ctx.measureText(p).width; });
  const total = widths.reduce((a, b) => a + b, 0);
  const align = ctx.textAlign;
  let cx = align === 'center' ? x - total / 2 : align === 'right' || align === 'end' ? x - total : x;
  ctx.textAlign = 'left';
  parts.forEach((p, i) => { ctx.font = HANGUL_RUN.test(p) ? korean : latin; ctx.fillText(p, cx, y); cx += widths[i]; });
  ctx.textAlign = align;
}
```

이 갈래를 택하면 실측 명세에 «브라우저 X 는 글자 단위 대체를 안 한다 → fillMixed» 를 적고, 작업 25 의 exam 골든은 이 도우미가 들어간 뒤에 만든다.

- [ ] **Step 4: 커밋**

```bash
git add test/core/font-fallback.test.ts planning/specs/2026-10-07-exam-style-measurements.md
git commit -m "test(fonts): 한 글줄 안 세리프 괄호 + 고딕 한글 섞임을 확인한다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 단계 C — exam 으로 전환

### Task 16: 옵션 검사와 «받은 조각 누적» (TDD)

양식마다 기본 글자 크기가 다르다(classic 26/28/22/36, exam 35/39/40/40). `update({ options: { style: 'exam' } })` 가 글자 크기까지 exam 기본으로 가려면, 차트가 «사용자가 준 조각» 을 따로 들고 있다가 양식의 기본값 위에 다시 덮어야 한다.

**Files:**
- Modify: `src/validate.ts` (끝에 함수 추가)
- Modify: `src/chart.ts:55-147`
- Modify: `src/core/types/common.ts:122-142` (`createDefaultGraphOptions`)
- Modify: `test/core/golden.test.ts` (`optionsFor` 첫 줄)
- Test: `test/validate.test.ts`, `test/chart.test.ts`

- [ ] **Step 1: 실패하는 시험**

`test/validate.test.ts` 의 import 에 `assertOptionValues` 를 더하고 끝에:

```ts
describe('assertOptionValues', () => {
  it('아는 값·빈 값은 통과시킨다', () => {
    expect(() => assertOptionValues(undefined)).not.toThrow();
    expect(() => assertOptionValues({})).not.toThrow();
    expect(() => assertOptionValues({ style: 'exam', tickDirection: 'in' })).not.toThrow();
    expect(() => assertOptionValues({ style: 'classic', tickDirection: 'out' })).not.toThrow();
  });

  it('모르는 style 을 한국어로 거부한다', () => {
    expect(() => assertOptionValues({ style: 'fancy' }))
      .toThrow(/options\.style 은 'exam'·'classic' 중 하나여야 합니다 \(지금 "fancy"\)/);
  });

  it('모르는 tickDirection 을 거부한다', () => {
    expect(() => assertOptionValues({ tickDirection: 'up' }))
      .toThrow(/options\.tickDirection 은 'in'·'out' 중 하나여야 합니다/);
  });
});
```

`test/chart.test.ts` 의 `describe('CsatChart', …)` 안 끝에:

```ts
  it('style 을 바꾸면 그 양식의 기본 글자 크기로 다시 그린다', () => {
    const a = canvas();
    const chart = new CsatChart(a, { type: 'ternary', data: createDefaultTernaryData(), options: { style: 'classic' } });
    chart.update({ options: { style: 'exam' } });
    const b = canvas();
    new CsatChart(b, { type: 'ternary', data: createDefaultTernaryData(), options: { style: 'exam' } });
    expect(nonWhitePixels(a)).toBeGreaterThan(50);
    expect(a.toDataURL!()).toBe(b.toDataURL!());
  });

  it('준 fontSize 는 양식을 바꿔도 남는다', () => {
    const a = canvas();
    const chart = new CsatChart(a, { type: 'ternary', data: createDefaultTernaryData(), options: { style: 'classic', fontSize: { title: 44 } } });
    chart.update({ options: { style: 'exam' } });
    const b = canvas();
    new CsatChart(b, { type: 'ternary', data: createDefaultTernaryData(), options: { style: 'exam', fontSize: { title: 44 } } });
    expect(a.toDataURL!()).toBe(b.toDataURL!());
  });

  it('어긋난 style 은 생성 때 거부하고, update 에서는 이전 상태를 지킨다', () => {
    expect(() => new CsatChart(canvas(), { type: 'ternary', data: createDefaultTernaryData(), options: { style: 'fancy' as never } }))
      .toThrow(CsatChartError);
    const c = canvas();
    const chart = new CsatChart(c, { type: 'ternary', data: createDefaultTernaryData() });
    const before = c.toDataURL!();
    expect(() => chart.update({ options: { tickDirection: 'up' as never } })).toThrow(/tickDirection/);
    chart.resize(800, 600);
    expect(c.toDataURL!()).toBe(before);
  });
```

Run: `npx vitest run test/validate.test.ts test/chart.test.ts`
Expected: FAIL — `assertOptionValues` 없음, 양식 전환 픽셀이 다름.

- [ ] **Step 2: `validate.ts`**

파일 끝에:

```ts
const STYLE_NAMES = ['exam', 'classic'];
const TICK_DIRECTIONS = ['in', 'out'];

function oneOf(key: string, value: unknown, allowed: string[]): void {
  if (value === undefined || allowed.includes(value as string)) return;
  throw new CsatChartError(
    `options.${key} 은 ${allowed.map((v) => `'${v}'`).join('·')} 중 하나여야 합니다 (지금 ${JSON.stringify(value)})`,
  );
}

/**
 * 옵션 중 «정해진 낱말만 받는» 칸을 본다. 모양 검사(assertConfigShape)와 달리
 * 값을 본다 — 모르는 양식 이름은 조용히 기본 양식으로 그려져, 오타를 낸 사람이
 * 무엇이 틀렸는지 알 수 없기 때문이다.
 */
export function assertOptionValues(options: unknown): void {
  if (typeof options !== 'object' || options === null) return;
  const o = options as { style?: unknown; tickDirection?: unknown };
  oneOf('style', o.style, STYLE_NAMES);
  oneOf('tickDirection', o.tickDirection, TICK_DIRECTIONS);
}
```

- [ ] **Step 3: `createDefaultGraphOptions(style)`**

`src/core/types/common.ts` 머리에 `import { DEFAULT_STYLE, styleOf } from '../canvas/style';` (style.ts 는 common.ts 를 type 으로만 import 하므로 순환이 값에 닿지 않는다). 함수를 바꾼다:

```ts
/** 양식의 기본 옵션. 글자 크기가 양식마다 다르다 — 미지정이면 기본 양식 */
export function createDefaultGraphOptions(style: StyleName = DEFAULT_STYLE): GraphOptions {
  const t = styleOf({ style });
  return {
    title: '',
    source: '',
    footnotes: [''],
    fontFamily: 'serif',
    customFont: '',
    fontStack: {},
    style: t.name,
    fontSize: { ...t.fontSize },
    showDataLabels: false,
    showLegend: true,
    legendPosition: 'bottom',
    legendLabel1: '',
    legendLabel2: '',
  };
}
```

`test/core/golden.test.ts` 의 `optionsFor` 첫 줄을 바꾼다(기본 양식이 바뀌어도 글자 크기까지 classic 으로):

```ts
  const base = createDefaultGraphOptions('classic');
```

- [ ] **Step 4: `chart.ts` — 받은 조각 누적**

import 에 `assertOptionValues` 추가. `mergeOptions` 아래에:

```ts
/** 받은 조각 둘을 겹친다 — 나중 것이 이긴다. fontSize·fontStack 은 한 겹 더 깊게. */
function mergePatch(base: PartialGraphOptions, next?: PartialGraphOptions): PartialGraphOptions {
  const out: PartialGraphOptions = { ...base, ...next };
  if (base.fontSize || next?.fontSize) out.fontSize = { ...base.fontSize, ...next?.fontSize };
  if (base.fontStack || next?.fontStack) out.fontStack = { ...base.fontStack, ...next?.fontStack };
  const notes = next?.footnotes ?? base.footnotes;
  if (notes) out.footnotes = [...notes];
  return out;
}

/** 받은 조각을 그 양식의 기본값 위에 덮는다 */
function resolveOptions(patch: PartialGraphOptions): GraphOptions {
  return mergeOptions(createDefaultGraphOptions(patch.style), patch);
}
```

클래스에 필드 `private patch: PartialGraphOptions;` 를 `options` 옆에 두고:

| 자리 | 지금 | 바꿀 코드 |
|---|---|---|
| 생성자 `assertConfigShape(config);` 다음 | — | `assertOptionValues(config.options);` |
| 생성자 `this.options = mergeOptions(createDefaultGraphOptions(), config.options);` | — | `this.patch = mergePatch({}, config.options);` `this.options = resolveOptions(this.patch);` |
| `update` 의 `if (next.options !== undefined) { this.options = mergeOptions(this.options, next.options); }` | — | `if (next.options !== undefined) { assertOptionValues(next.options); this.patch = mergePatch(this.patch, next.options); this.options = resolveOptions(this.patch); }` — 검사를 `next.data` 검사보다 **먼저** 둔다(둘 중 하나가 던지면 아무것도 안 바뀌게) |

`mergeOptions` 의 주석은 그대로 둔다.

- [ ] **Step 5: 통과 확인**

Run: `npm run typecheck && npx vitest run`
Expected: 전부 PASS (기본 양식은 아직 classic).

- [ ] **Step 6: 커밋**

```bash
git add src/validate.ts src/chart.ts src/core/types/common.ts test/validate.test.ts test/chart.test.ts test/core/golden.test.ts
git commit -m "feat(style): 양식별 기본값 위에 받은 옵션을 덮는다 — style·tickDirection 값 검사

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: 기본 양식을 exam 으로

**Files:**
- Modify: `src/core/canvas/style.ts` (`DEFAULT_STYLE`)
- Modify: `test/core/font-stack.test.ts`, `test/chart.test.ts:344`, 그 밖에 classic 기하를 전제한 시험

- [ ] **Step 1: 바꾼다**

`src/core/canvas/style.ts`: `export const DEFAULT_STYLE: StyleName = 'exam';` 와 주석 `/** 양식을 적지 않은 옵션이 받는 양식 — 2.0.0 부터 시험지 */`.

`test/core/style.test.ts` 의 `styleOf` 묶음에:

```ts
  it('적지 않으면 시험지 양식이다 (2.0.0)', () => {
    expect(styleOf({})).toBe(examStyle);
  });
```

- [ ] **Step 2: 깨지는 시험을 본다**

Run: `npx vitest run 2>&1 | tail -60`
Expected: 골든(classic 고정)은 통과, 아래가 실패할 수 있다 — font-stack.test 의 기본 글꼴 기대값, chart.test 344, overflow(작업 24 에서 다룬다), 기하 시험 몇.

고치는 규칙:
- **1.7.0 상수를 확인하는 시험**(기본 글꼴 문자열, 명시 fontSize 와 같은 픽셀)은 `style: 'classic'` 을 붙이거나 exam 값으로 바꾼다 — 아래 Step 3·4.
- **기하 불변식 시험**(0 선이 있다, 점이 안 잘린다, 물결 자리를 찾는다: `category-dot.test.ts`·`abs-bar-zero-baseline.test.ts`·`econ-broken-at.test.ts`)이 exam 에서 깨지면 **시험이 아니라 렌더러를 의심한다.** 시험의 상수(여백 `PAD` 등)가 classic 배치 값이면 그 시험의 옵션에 `style: 'classic'` 을 붙이고, 같은 시험을 exam 으로 한 번 더 도는 `it` 을 더해 불변식만 확인한다(`superpowers:systematic-debugging`).
- `overflow.test.ts` 는 작업 24 에서 양식 둘로 돈다 — 여기서는 실패 목록만 적어 둔다.

- [ ] **Step 3: `font-stack.test.ts`**

import 에 `styleOf` 를 더하고(`../../src/core/index`), 파일 위에 `const DEFAULT = styleOf({}).stack;` (기본 양식의 글꼴 순서).

| 자리 | 바꿀 코드 |
|---|---|
| `describe('글꼴 자리 풀기')` 의 앞 세 `it`(69–91) | 옵션마다 `style: 'classic'` 을 넣는다 — 예: `const o = createDefaultGraphOptions('classic');`, `fontStackOf({ style: 'classic' }, 'serif')`, `{ style: 'classic' as const, fontStack: { serif: SERIF_MARK } }`, `fontStackOf({ style: 'classic', fontStack: { serif: '' } }, 'serif')` |
| `'%s — 고딕 자리만 갈아도 명조 자리는 그대로다'` (128–133) | `DEFAULT_SERIF_STACK` → `DEFAULT.serif`, `DEFAULT_SANS_STACK` → `DEFAULT.sans` |
| `'한 자리를 undefined 로 주면 …'` (178–186) | `DEFAULT_SANS_STACK` → `DEFAULT.sans` |

(«두 자리를 다 주면 Noto 가 안 쓰인다» 는 exam 에서도 그대로 통과해야 한다 — 숫자 글꼴 목록에 Noto 가 없다. 실패하면 `EXAM_NUMERAL_STACK` 을 본다.)

- [ ] **Step 4: `chart.test.ts:344`**

`options: { fontSize: { title: 44, axisLabel: 28, tick: 26, dataLabel: 22 } },` → `options: { fontSize: { title: 44, axisLabel: 39, tick: 35, dataLabel: 40 } },` (나머지 셋 = exam 기본값).

- [ ] **Step 5: 통과 확인**

Run: `npm run typecheck && npx vitest run --exclude test/core/overflow.test.ts`
Expected: 전부 PASS, classic 골든 86건 그대로.

- [ ] **Step 6: 커밋**

```bash
git add src/core/canvas/style.ts test/core/style.test.ts test/core/font-stack.test.ts test/chart.test.ts
git commit -m "feat(style)!: 기본 양식을 시험지(exam)로 — 옛 모양은 style: 'classic'

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Step 2 의 규칙으로 고친 시험 파일도 이름으로 더한다.)

---

### Task 18: 눈금 방향 — 축 도우미 (TDD)

**Files:**
- Modify: `src/core/canvas/axes.ts` (`YAxisParams`·`XAxisParams`, 눈금 긋기, 부호 붙은 눈금)
- Test: `test/core/axes-ticks.test.ts`

- [ ] **Step 1: 실패하는 시험**

```ts
// © 2026 김용현
// 눈금 표시 방향 — 바깥·안쪽·없음·가로지름이 실제로 그 자리에 잉크를 남기는가.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { drawYAxis } from '../../src/core/canvas/axes';
import { clearCanvas, createDefaultGraphOptions } from '../../src/core/index';
import type { TickDir } from '../../src/core/canvas/style';

const W = 400;
const H = 300;
const PAD = { top: 40, right: 40, bottom: 40, left: 100 };

/** 축 x=100 에서 왼쪽(바깥)·오른쪽(안쪽) 4px 지점, 눈금 y 에 잉크가 있는가 */
function inkAt(dir: TickDir) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  clearCanvas(ctx, W, H);
  drawYAxis({
    ctx, padding: PAD, width: W, height: H, min: 0, max: 10, step: 5, label: '', side: 'left',
    fonts: createDefaultGraphOptions('exam'), tickFontSize: 20, labelFontSize: 20, tickDir: dir,
  });
  const y = PAD.top + (H - PAD.top - PAD.bottom) / 2; // 값 5 의 눈금
  const dark = (x: number) => (c.getContext('2d').getImageData(x, Math.round(y), 1, 1).data[0] < 128);
  return { out: dark(PAD.left - 4), in: dark(PAD.left + 4) };
}

describe('세로축 눈금 방향', () => {
  it('바깥', () => expect(inkAt('out')).toEqual({ out: true, in: false }));
  it('안쪽', () => expect(inkAt('in')).toEqual({ out: false, in: true }));
  it('없음', () => expect(inkAt('none')).toEqual({ out: false, in: false }));
  it('가로지름', () => expect(inkAt('cross')).toEqual({ out: true, in: true }));
});
```

Run: `npx vitest run test/core/axes-ticks.test.ts`
Expected: FAIL — `tickDir` 이 `YAxisParams` 에 없다(타입), 그리고 '안쪽'·'없음' 이 틀린다.

- [ ] **Step 2: `axes.ts`**

import 에 `type TickDir` 추가. `YAxisParams` 에:

```ts
  /** 눈금 표시 방향 — 미지정이면 바깥(1.7.0). 렌더러는 tickDirOf 로 정해 넘긴다 */
  tickDir?: TickDir;
  /** 눈금 숫자에 부호를 붙인다 (+4 · −4) — 범주 점 그래프 시험지 꼴 */
  signed?: boolean;
```

`XAxisParams` 에도 `tickDir?: TickDir;`.

`drawYAxis` 의 구조 분해에 `tickDir = 'out', signed = false,` 를 더하고, `tickGap` 을 방향에 맞춘다:

```ts
  const tickGap = (tickDir === 'out' ? tickLen : tickDir === 'cross' ? tickLen / 2 : 0) + 6;
```

눈금 선 블록(지금 `ctx.lineWidth = t.line.tick;` ~ `ctx.stroke();`)을 바꾼다:

```ts
    // 눈금 선 — 바깥은 1.7.0 과 같은 순서로 긋는다(classic 바이트)
    if (tickDir !== 'none') {
      ctx.lineWidth = t.line.tick;
      ctx.beginPath();
      if (tickDir === 'out') {
        if (side === 'left') { ctx.moveTo(x - tickLen, y); ctx.lineTo(x, y); }
        else { ctx.moveTo(x, y); ctx.lineTo(x + tickLen, y); }
      } else if (tickDir === 'in') {
        const s = side === 'left' ? 1 : -1;
        ctx.moveTo(x, y); ctx.lineTo(x + s * tickLen, y);
      } else {
        ctx.moveTo(x - tickLen / 2, y); ctx.lineTo(x + tickLen / 2, y);
      }
      ctx.stroke();
    }
```

숫자 글: `ctx.fillText(formatTick(val), tx, y);` → `ctx.fillText(signed ? signedTick(val) : formatTick(val), tx, y);` 그리고 파일 끝에:

```ts
/** +4 · 0 · −4 (빼기는 U+2212 — 시험지 꼴) */
function signedTick(val: number): string {
  const s = formatTick(Math.abs(val));
  return val > 0 ? `+${s}` : val < 0 ? `\u2212${s}` : s;
}
```

`drawXAxis` 도 같은 방식: 구조 분해 `tickDir = 'out'`, 눈금 블록을

```ts
    if (tickDir !== 'none') {
      ctx.lineWidth = t.line.tick;
      ctx.beginPath();
      if (tickDir === 'out') { ctx.moveTo(cx, y); ctx.lineTo(cx, y + t.line.tickLen); }
      else if (tickDir === 'in') { ctx.moveTo(cx, y); ctx.lineTo(cx, y - t.line.tickLen); }
      else { ctx.moveTo(cx, y - t.line.tickLen / 2); ctx.lineTo(cx, y + t.line.tickLen / 2); }
      ctx.stroke();
    }
```

글자 자리 `y + t.line.tickLen + 6` → `y + (tickDir === 'out' ? t.line.tickLen : tickDir === 'cross' ? t.line.tickLen / 2 : 0) + 6`.

- [ ] **Step 3: 통과 + classic 그대로**

Run: `npx vitest run test/core/axes-ticks.test.ts test/core/golden.test.ts`
Expected: 4 passed + 골든 86건(호출부가 아직 `tickDir` 을 안 넘겨 바깥 그대로).

- [ ] **Step 4: 커밋**

```bash
git add src/core/canvas/axes.ts test/core/axes-ticks.test.ts
git commit -m "feat(axes): 눈금 방향(바깥·안쪽·없음·가로지름)과 부호 붙은 눈금

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: 막대 둘의 시험지 구조 — 세로축 눈금 없음, 범주 경계 안쪽 눈금, 끝 단위, 어두운 칸 글자

실측 §2 absbar·stacked, §3 #25·#29. 이 작업부터 exam 그림이 바뀐다 — classic 골든 86건은 계속 그대로여야 한다.

**Files:**
- Modify: `src/core/graphs/AbsBarGraph.ts`, `src/core/graphs/StackedBarPie.ts`
- Test: `test/core/exam-structure.test.ts` (새 파일 — 작업 19–23 이 함께 쓴다)

- [ ] **Step 1: 실패하는 시험**

```ts
// © 2026 김용현
// 시험지 양식의 구조 — 토큰 값이 아니라 «무엇을 그리고 무엇을 안 그리는가».
// 픽셀 몇 개로 본다. classic 쪽은 골든이 지킨다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import {
  renderAbsBarGraph, createDefaultAbsBarData, createDefaultGraphOptions, clearCanvas,
  type GraphOptions,
} from '../../src/core/index';

export const W = 800;
export const H = 600;

export function draw(
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number, d: never, o: GraphOptions) => void,
  data: unknown,
  patch: Partial<GraphOptions> = {},
) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  clearCanvas(ctx, W, H);
  // 기록용 — 그리기 호출의 좌표를 모은다
  const lines: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const origMove = ctx.moveTo.bind(ctx);
  const origLine = ctx.lineTo.bind(ctx);
  let last = { x: 0, y: 0 };
  ctx.moveTo = (x: number, y: number) => { last = { x, y }; origMove(x, y); };
  ctx.lineTo = (x: number, y: number) => { lines.push({ x0: last.x, y0: last.y, x1: x, y1: y }); last = { x, y }; origLine(x, y); };
  fn(ctx, W, H, data as never, { ...createDefaultGraphOptions('exam'), ...patch });
  return { c, lines };
}

describe('절댓값 막대 — exam', () => {
  it('세로 막대의 세로축에는 눈금 표시가 없다 (격자가 대신한다)', () => {
    const { lines } = draw(renderAbsBarGraph as never, createDefaultAbsBarData());
    // 왼쪽 축 선(가장 긴 세로선)의 x
    const axisX = lines.filter((l) => l.x0 === l.x1).sort((a, b) => Math.abs(b.y1 - b.y0) - Math.abs(a.y1 - a.y0))[0].x0;
    const ticks = lines.filter((l) => l.y0 === l.y1 && Math.min(l.x0, l.x1) < axisX && Math.max(l.x0, l.x1) <= axisX + 0.5
      && Math.abs(l.x1 - l.x0) <= 13);
    expect(ticks).toEqual([]);
  });

  it('범주 경계에 안쪽(위) 눈금이 있다 — 범주 셋이면 둘', () => {
    const { lines } = draw(renderAbsBarGraph as never, createDefaultAbsBarData());
    const bottom = Math.max(...lines.filter((l) => l.y0 === l.y1).map((l) => l.y0));
    const up = lines.filter((l) => l.x0 === l.x1 && Math.max(l.y0, l.y1) === bottom && Math.abs(l.y1 - l.y0) === 12);
    expect(up.length).toBe(2);
  });

  it('tickDirection: out 이면 세로축 눈금이 바깥에 생긴다', () => {
    const { lines } = draw(renderAbsBarGraph as never, createDefaultAbsBarData(), { tickDirection: 'out' });
    const axisX = lines.filter((l) => l.x0 === l.x1).sort((a, b) => Math.abs(b.y1 - b.y0) - Math.abs(a.y1 - a.y0))[0].x0;
    const ticks = lines.filter((l) => l.y0 === l.y1 && Math.min(l.x0, l.x1) === axisX - 12);
    expect(ticks.length).toBeGreaterThan(0);
  });
});
```

Run: `npx vitest run test/core/exam-structure.test.ts`
Expected: FAIL — 지금은 세로축 바깥 눈금이 있고 범주 경계 눈금이 없다.

- [ ] **Step 2: `AbsBarGraph.ts`**

축 그리기(113 줄 근처, `ctx.lineWidth = t.line.axis;` 앞)에:

```ts
  // 시험지: 세로 막대는 세로축 눈금 없이 격자가 대신하고, 범주 경계에 안쪽 눈금 (실측 §2 absbar)
  const dir = tickDirOf(options, isVertical ? { x: 'in', y: 'none' } : { x: 'none', y: 'in' });
```

(`isVertical` 이 파일에 없으면 `const isVertical = data.barDirection !== 'horizontal';` 로 둔다.)

| 자리 | 바꿀 코드 |
|---|---|
| `drawYAxis({ … drawGrid: true, })` (127–136) | 인자에 `tickDir: dir.y,` 추가 |
| 세로 막대 범주 이름 그리기 직전(217 줄 뒤) | 아래 «경계 눈금 (세로)» 블록 |
| 가로 막대 값 눈금(260–265) `ctx.lineWidth = look.tick; … ctx.lineTo(x, plotY + plotH + look.tickLen); ctx.stroke();` | 아래 «값 눈금 (가로)» 블록으로 바꾼다 |
| 가로 막대 범주 이름 뒤(370 줄 clip restore 다음) | 아래 «경계 눈금 (가로)» 블록 |

```ts
  // 경계 눈금 (세로) — 범주 사이 경계에서 위로
  if (look.catTicks && dir.x !== 'none') {
    const s = dir.x === 'in' ? -1 : 1;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    for (let c = 1; c < n; c++) {
      const bx = plotX + catArea * c;
      ctx.beginPath();
      ctx.moveTo(bx, plotY + plotH);
      ctx.lineTo(bx, plotY + plotH + s * t.line.tickLen);
      ctx.stroke();
    }
  }
```

```ts
      // 값 눈금 (가로) — classic 은 바깥 그대로
      if (dir.x !== 'none') {
        const s = dir.x === 'in' ? -1 : 1;
        ctx.lineWidth = look.tick;
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(x, plotY + plotH);
        ctx.lineTo(x, plotY + plotH + s * look.tickLen);
        ctx.stroke();
      }
```

```ts
  // 경계 눈금 (가로) — 범주 사이 경계에서 오른쪽(안쪽)으로
  if (look.catTicks && dir.y !== 'none') {
    const s = dir.y === 'in' ? 1 : -1;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    for (let c = 1; c < n; c++) {
      const by = plotY + catArea * c;
      ctx.beginPath();
      ctx.moveTo(plotX, by);
      ctx.lineTo(plotX + s * t.line.tickLen, by);
      ctx.stroke();
    }
  }
```

(`n`·`catArea` 는 그 자리의 범주 수·범주 칸 폭을 가리키는 지금 변수 이름을 쓴다 — 파일에서 `catArea` 로 grep. 이름이 다르면 그 이름으로.)

classic 이 같다는 근거: `tickDirOf` 가 classic 에서 `{x:'out', y:'out'}` 를 주고 `look.catTicks` 가 false — 가로 막대 값 눈금은 `s = 1` 로 1.7.0 과 같은 선을 같은 순서로 긋는다.

어두운 칸 글자(§3 #29). import 에 `inkText` (`../canvas/labels`).

| 줄(작업 5 전 기준) | 지금 | 바꿀 코드 |
|---|---|---|
| 168–172, 332–336 (막대 **안** 값) | `ctx.fillStyle = isLightFill(s, t) ? '#000' : '#fff';` … `ctx.fillText(String(val), …)` | 정렬 줄은 두고 `inkText(ctx, String(val), <그 x>, <그 y>, undefined, isLightFill(s, t), t);` |
| 197, 361 (막대 **밖** 값) | `ctx.fillStyle = isLightFill(s, t) ? '#000' : '#fff';` | `ctx.fillStyle = byStyle(options, { classic: isLightFill(s, t) ? '#000' : '#fff', exam: '#000' });` — 1.7.0 의 «어두운 계열 값이 흰 바탕에 흰 글자» 결함은 classic 바이트를 위해 남긴다(CHANGELOG 에 적는다) |

가로 막대 단위를 마지막 눈금에 붙인다(실측 §1.4 `15(%)`): 33·47·287 줄 근처에서 `data.unitAdjacent` 를 읽는 세 곳을 `const unitAdjacent = data.unitAdjacent ?? look.unitAdjacent;` 로 바꾸고 그 변수를 쓴다.

- [ ] **Step 3: `StackedBarPie.ts` 막대**

`renderStackedBar` 의 축 그리기 앞에 `const dir = tickDirOf(options, isVertical ? { x: 'in', y: 'none' } : { x: 'none', y: 'in' });` (`isVertical` 은 `data.barDirection !== 'horizontal'`).

| 자리 | 바꿀 코드 |
|---|---|
| 세로 막대 값 눈금 88–92 (`ctx.lineWidth = look.tick;` … `ctx.moveTo(plotX - look.tickLen, y); ctx.lineTo(plotX, y); ctx.stroke();`) | `if (dir.y !== 'none') { const s = dir.y === 'in' ? 1 : -1; ctx.lineWidth = look.tick; ctx.beginPath(); ctx.moveTo(plotX + s * look.tickLen, y); ctx.lineTo(plotX, y); ctx.stroke(); }` — `s=-1` 이 1.7.0 과 같은 선 |
| 세로 막대 루프 뒤(154 다음) | AbsBar 의 «경계 눈금 (세로)» 블록, `catArea` 대신 이 파일의 막대 칸 폭 변수(`barArea`) |
| 가로 막대 값 눈금 173–177 | AbsBar 의 «값 눈금 (가로)» 블록 |
| 가로 막대 범주 이름 뒤(234 다음) | AbsBar 의 «경계 눈금 (가로)» 블록(`barArea`) |
| 가로 막대 단위 197 `ctx.fillText(data.unit, plotX + plotW + 30, plotY + plotH + 10);` | 아래 |
| 막대 안 값 139–143, 219–223 | `inkText(ctx, String(val), <x>, <y>, undefined, lightAt(data, s, t), t);` |

```ts
    // 마지막 눈금에 단위를 붙인다 — 100(%) (실측 §2 stacked)
    if (look.unitAdjacent) {
      ctx.font = textFont(options, 'tick', tickFs);
      const half = ctx.measureText('100').width / 2;
      ctx.font = textFont(options, 'unit', unitFs);
      ctx.textAlign = 'left';
      ctx.fillText(data.unit, plotX + plotW + half + 2, plotY + plotH + 10);
    } else {
      ctx.fillText(data.unit, plotX + plotW + 30, plotY + plotH + 10);
    }
```

`drawSegmentLabel` 은 작업 11 에서 `inkText(…, true)` 로 바꿨다 — exam 의 어두운 칸은 토큰(`darkLabel: 'halo'`)으로 이미 검은 글자 + 흰 테두리다.

- [ ] **Step 4: 통과 + classic 그대로**

Run: `npm run typecheck && npx vitest run test/core/exam-structure.test.ts test/core/golden.test.ts test/core/abs-bar-zero-baseline.test.ts`
Expected: 구조 시험 3 passed, 골든 86건 그대로.

- [ ] **Step 5: 커밋**

```bash
git add src/core/graphs/AbsBarGraph.ts src/core/graphs/StackedBarPie.ts test/core/exam-structure.test.ts
git commit -m "feat(exam): 막대 그래프 — 세로축 눈금 없이 격자, 범주 경계 안쪽 눈금, 끝 단위, 어두운 칸 검은 글자

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: 꺾은선 — 열린 틀(`frame: 'open'`), 안쪽 눈금, 가로축 눈금

결정 4·5(실측 §4): 꺾은선 기본은 닫힌 틀, `frame: 'open'` 이면 L자. 눈금은 안쪽이 2:1 다수.

**Files:**
- Modify: `src/core/types/line.ts` (`frame`)
- Modify: `src/core/graphs/LineGraph.ts:148-158,160-171,384-398`
- Test: `test/core/exam-structure.test.ts`

- [ ] **Step 1: 실패하는 시험** — `exam-structure.test.ts` 에 더한다(import 에 `renderLineGraph, createDefaultLineData`):

```ts
describe('꺾은선', () => {
  const right = (lines: { x0: number; y0: number; x1: number; y1: number }[]) =>
    Math.max(...lines.map((l) => Math.max(l.x0, l.x1)));

  it("frame: 'open' 이면 위·오른쪽 틀선이 없다", () => {
    const d = { ...createDefaultLineData(), frame: 'open' as const };
    const { lines } = draw(renderLineGraph as never, d);
    const plotTop = Math.min(...lines.filter((l) => l.x0 === l.x1).map((l) => Math.min(l.y0, l.y1)));
    const topEdges = lines.filter((l) => l.y0 === plotTop && l.y1 === plotTop && Math.abs(l.x1 - l.x0) > 100);
    expect(topEdges).toEqual([]);
  });

  it('기본은 닫힌 틀이다', () => {
    const { lines } = draw(renderLineGraph as never, createDefaultLineData());
    const plotTop = Math.min(...lines.filter((l) => l.x0 === l.x1).map((l) => Math.min(l.y0, l.y1)));
    expect(lines.some((l) => l.y0 === plotTop && l.y1 === plotTop && Math.abs(l.x1 - l.x0) > 100)).toBe(true);
    expect(right(lines)).toBeGreaterThan(0);
  });

  it('exam 은 가로축 눈금을 안쪽(위)으로 긋는다', () => {
    const { lines } = draw(renderLineGraph as never, createDefaultLineData());
    const bottom = Math.max(...lines.filter((l) => l.y0 === l.y1 && Math.abs(l.x1 - l.x0) > 100).map((l) => l.y0));
    const up = lines.filter((l) => l.x0 === l.x1 && l.y0 === bottom && l.y1 === bottom - 12);
    expect(up.length).toBeGreaterThan(0);
  });
});
```

Run: `npx vitest run test/core/exam-structure.test.ts`
Expected: 새 셋 중 «open» 과 «가로축 눈금» FAIL.

- [ ] **Step 2: 타입** — `src/core/types/line.ts` 의 `gridWidth?: number;` 아래에:

```ts
  /**
   * 틀 모양. `'closed'`(기본) — 사각 틀, `'open'` — 왼쪽·아래 선만(L자).
   * 시험지는 닫힌 틀이 다수이고, 열린 L자는 2026학년도 수능 세계지리 10번 꼴이다.
   */
  frame?: 'closed' | 'open';
```

- [ ] **Step 3: `LineGraph.ts`**

틀(148–158)을 바꾼다:

```ts
  // 틀 — 기본 닫힌 사각, frame: 'open' 이면 L자
  ctx.strokeStyle = '#000';
  ctx.lineWidth = t.line.axis;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  if (data.frame !== 'open') {
    ctx.lineTo(plotX + plotW, plotY);
    ctx.lineTo(plotX, plotY);
  }
  ctx.stroke();
```

틀 앞에 방향을 정한다:

```ts
  // 시험지: 안쪽 2 : 바깥 1 (실측 §2 line). classic 은 가로축 눈금을 안 그렸다
  const dir = tickDirOf(options, { x: 'in', y: 'in' });
  const xTick = byStyle(options, { classic: 'none' as TickDir, exam: dir.x });
```

(`TickDir` 은 `import type { TickDir } from '../canvas/style';`.)

`drawYAxis({ … })`(160–171)에 `tickDir: dir.y,` 를 더한다 — classic 은 `'out'` 이라 그대로.

세로 격자 블록(192–205) 뒤에 가로축 눈금:

```ts
  // 가로축 눈금 — 이름이 있는 자리에만
  if (xTick !== 'none') {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    ctx.setLineDash([]);
    const y0 = plotY + plotH;
    const L = t.line.tickLen;
    for (let i = 0; i < n; i++) {
      if (!labelShown(i)) continue;
      ctx.beginPath();
      if (xTick === 'in') { ctx.moveTo(toX(i), y0); ctx.lineTo(toX(i), y0 - L); }
      else if (xTick === 'out') { ctx.moveTo(toX(i), y0); ctx.lineTo(toX(i), y0 + L); }
      else { ctx.moveTo(toX(i), y0 - L / 2); ctx.lineTo(toX(i), y0 + L / 2); }
      ctx.stroke();
    }
    ctx.restore();
  }
```

가로 이름·단위의 y(390·398 줄의 `plotY + plotH + 10`)를 `plotY + plotH + (xTick === 'out' ? t.line.tickLen : 0) + 10` 으로 — classic 은 `'none'` 이라 +10 그대로.

- [ ] **Step 4: 통과 + classic 그대로**

Run: `npm run typecheck && npx vitest run test/core/exam-structure.test.ts test/core/golden.test.ts`
Expected: PASS, 골든 86건 그대로.

- [ ] **Step 5: 커밋**

```bash
git add src/core/types/line.ts src/core/graphs/LineGraph.ts test/core/exam-structure.test.ts
git commit -m "feat(line): frame: 'open'(L자 틀)과 시험지 안쪽 눈금

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: 피라미드·편차 둘·기후·범주 점의 시험지 구조

**Files:**
- Modify: `src/core/graphs/PopulationPyramid.ts`, `src/core/graphs/DeviationAGraph.ts`, `src/core/graphs/DeviationBGraph.ts`, `src/core/graphs/ClimateGraph.ts`, `src/core/graphs/CategoryDotGraph.ts`

모두 작업 6·7 의 `LOOK` 구조 칸을 읽는다. classic 칸이 1.7.0 과 같은 길로 가게 짰다 — 각 단계 뒤 골든 86건이 그대로인지 본다.

- [ ] **Step 1: 피라미드 — 두 축 안쪽 눈금, 5세 눈금, 남·여 아래, `(%)` 끝** (실측 §2 pyramid, §3 #43·#44)

171 줄 앞에:

```ts
  const dir = tickDirOf(options, { x: 'in', y: 'in' });
  const xs = dir.x === 'in' ? -1 : 1;
```

나이 눈금 루프(230–239)를 바꾼다:

```ts
    for (let age = 0; age <= topAge; age += look.ageTickEvery) {
      const y = plotY + plotH - (age / topAge) * plotH;
      ctx.lineWidth = look.tick;
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      if (dir.y === 'in') { ctx.moveTo(plotX, y); ctx.lineTo(plotX + look.ageTickLen, y); }
      else { ctx.moveTo(plotX - look.ageTickLen, y); ctx.lineTo(plotX, y); }
      ctx.stroke();
      if (age % ageStep === 0) ctx.fillText(String(age), plotX - 10, y);
    }
```

(classic 은 `ageTickEvery`(20)가 `ageStep` 과 같아 1.7.0 과 같은 선·글자. 지금 루프의 변수 이름(`topAge`·`ageStep`)이 다르면 그 이름으로.)

298·311 줄 `ctx.lineTo(lx, plotY + plotH + look.tickLen);` → `ctx.lineTo(lx, plotY + plotH + xs * look.tickLen);` (`rx` 도).

남·여 자리(319–325):

```ts
  const sexY = look.sexBelow ? plotY + plotH + 10 + tickFs + 8 : plotY - 16;
  ctx.textBaseline = look.sexBelow ? 'top' : 'bottom';
  ctx.fillText(data.maleLabel, plotX + halfW / 2, sexY);
  ctx.fillText(data.femaleLabel, centerX + halfW / 2, sexY);
```

(지금 코드의 `halfW`·`centerX` 이름을 확인해 맞춘다. classic 은 `plotY - 16`·`'bottom'` — 지금 값과 다르면 지금 값을 classic 쪽에 쓴다.)

330 줄 `if (data.axisLabelInline) {` → `if (data.axisLabelInline ?? look.unitInline) {`.

- [ ] **Step 2: 편차 A — 가로축 바깥 눈금, `(월)` 끝, 안쪽 범례·닫힌 틀 기본** (§2 deviation-a)

137 줄 뒤:

```ts
  if (look.xTicks) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    for (let s = 0; s <= totalSlots; s++) {
      const bx = plotX + slotW * s;
      ctx.beginPath();
      ctx.moveTo(bx, plotY + plotH);
      ctx.lineTo(bx, plotY + plotH + t.line.tickLen);
      ctx.stroke();
    }
  }
```

136 줄 달 이름 y 를 `plotY + plotH + (look.xTicks ? t.line.tickLen + 6 : 12)` 로.

212–216 의 `(월)`:

```ts
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  const unitFont = textFont(options, 'unit', textSize(options, 'unit', options.fontSize.tick));
  if (look.unitAdjacent) {
    const lastCx = plotX + slotW * (totalSlots - 1) + slotW / 2;
    ctx.font = textFont(options, 'tick', tickFs);
    const half = ctx.measureText(MONTH_LABELS[indices[totalSlots - 1]]).width / 2;
    ctx.font = unitFont;
    ctx.textAlign = 'left';
    ctx.fillText('(월)', lastCx + half, plotY + plotH + (look.xTicks ? t.line.tickLen + 6 : 12));
  } else {
    ctx.font = unitFont;
    ctx.textAlign = 'center';
    ctx.fillText('(월)', plotX + plotW + 30, plotY + plotH + 12);
  }
```

(else 갈래는 지금 212–216 코드를 그대로 옮긴 것이어야 한다 — 다르면 지금 코드를 쓴다.)

`const insideLegend = data.insideLegend ?? look.insideLegend;` 를 두고 32·48·59·220·238 줄의 `data.insideLegend` 를 바꾼다. 123 줄 `if (data.showFrame)` → `if (data.showFrame ?? look.frame)`.

- [ ] **Step 3: 편차 B — 0 선을 가로지르는 경계 눈금, 범주 이름 0 선 아래, 위 틀** (§2 deviation-b)

107 줄 뒤:

```ts
  if (look.crossTicks) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    for (let c = 1; c < n; c++) {
      const bx = plotX + slotW * c;
      ctx.beginPath();
      ctx.moveTo(bx, zeroYPrecip - look.crossLen / 2);
      ctx.lineTo(bx, zeroYPrecip + look.crossLen / 2);
      ctx.stroke();
    }
  }
```

117 줄 앞 `const labelY = look.labelAtZero && precipDiffs.every((v) => v >= 0) ? zeroYPrecip + look.crossLen / 2 + 4 : plotY + plotH + 12;` 를 두고 119 의 y 를 `labelY` 로(음수 막대가 있으면 아래로 — 글자가 막대를 덮지 않게). (`zeroYPrecip`·`precipDiffs`·`slotW` 이름은 파일의 것을 쓴다.)

94 줄 뒤 `if (look.frame) { ctx.lineWidth = t.line.axis; ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX + plotW, plotY); ctx.stroke(); }`.

- [ ] **Step 4: 기후 — `(월)` 끝** (§2 climate = deviation-a)

207–211 줄을 Step 2 와 같은 꼴로(마지막 칸 x 는 12 달이면 `slotX(11)`, 아니면 `slotX(indices.length - 1)` — 파일의 x 계산 함수 이름을 쓴다). LOOK 에 `unitAdjacent: false / true` 를 더한다. drawYAxis·drawXAxis 두 번씩은 `tickDir` 을 안 넘긴다(바깥 = deviation-a).

- [ ] **Step 5: 범주 점 — 경계 세로 점선, 안쪽 보조 눈금, 부호 붙은 눈금** (§2 category-dot)

LOOK 에 칸을 더한다: classic `catGrid: false, minorTickLen: 0, signed: false`, exam `catGrid: true, minorTickLen: 17, signed: true` (보조 눈금 3.5pt).

`catArea`(142)·`valToY`(143) 정의를 `drawYAxis` 호출 위로 올리고, `drawYAxis({ … })` 에 `tickDir: tickDirOf(options, { x: 'none', y: 'in' }).y, signed: look.signed,` 를 더한다. 그 뒤에:

```ts
  if (look.catGrid) {
    ctx.save();
    ctx.strokeStyle = t.line.gridColor;
    ctx.lineWidth = t.line.grid;
    ctx.setLineDash(t.line.gridDash);
    for (let c = 1; c < n; c++) {
      const x = plotX + catArea * c;
      ctx.beginPath(); ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH); ctx.stroke();
    }
    ctx.restore();
  }
  if (look.minorTickLen > 0) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = t.line.tick;
    ctx.setLineDash([]);
    for (let v = axis.min + axis.step / 2; v < axis.max; v += axis.step) {
      const y = valToY(v);
      ctx.beginPath(); ctx.moveTo(plotX, y); ctx.lineTo(plotX + look.minorTickLen, y); ctx.stroke();
    }
    ctx.restore();
  }
```

- [ ] **Step 6: 관문**

Run: `npm run typecheck && npm run lint && npx vitest run --exclude test/core/overflow.test.ts`
Expected: PASS, 골든 86건 그대로. `category-dot.test.ts`·`auto-range.test.ts` 통과.

- [ ] **Step 7: 커밋**

```bash
git add src/core/graphs/PopulationPyramid.ts src/core/graphs/DeviationAGraph.ts src/core/graphs/DeviationBGraph.ts src/core/graphs/ClimateGraph.ts src/core/graphs/CategoryDotGraph.ts
git commit -m "feat(exam): 피라미드·편차·기후·범주 점 — 시험지 눈금 방향과 단위·이름 자리

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: 산점·삼각·하이서그래프·방사형·정육면체의 시험지 구조

**Files:**
- Modify: `src/core/graphs/ScatterBubble.ts`, `src/core/graphs/TernaryDiagram.ts`, `src/core/graphs/Hythergraph.ts`, `src/core/graphs/RadarChart.ts`, `src/core/graphs/CubeGraph.ts`

- [ ] **Step 1: 산점 — 닫힌 틀 기본, 눈금 없음, 세로 축 이름 한 자씩** (§1.4, §2 scatter. 표본 셋 모두 눈금 표시가 없다 — 격자가 닫힌 틀까지 온다)

LOOK 에 칸: classic `closedFrame: false, stackYName: false`, exam `closedFrame: true, stackYName: true`.

118 줄 `if (exam) {`(틀) → `if (exam || look.closedFrame) {`. 45·70·190 줄의 `exam`(단위 자리·오른쪽 여백) → `const examLayout = exam || look.closedFrame;` 를 두고 그것으로.

눈금(146–150 가로, 169–173 세로)을 방향으로 감싼다. `renderNormal` 첫머리:

```ts
  const dir = tickDirOf(options, { x: 'none', y: 'none' });
  const seg = (d: TickDir): [number, number] =>
    d === 'out' ? [0, t.line.tickLen] : d === 'in' ? [-t.line.tickLen, 0] : d === 'cross' ? [-t.line.tickLen / 2, t.line.tickLen / 2] : [0, 0];
```

가로 눈금:

```ts
      const [a, b] = seg(dir.x);
      if (a !== b) {
        ctx.lineWidth = look.tickW;
        ctx.beginPath();
        ctx.moveTo(x, plotY + plotH + a);
        ctx.lineTo(x, plotY + plotH + b);
        ctx.stroke();
      }
```

세로 눈금은 `ctx.moveTo(plotX - b, y); ctx.lineTo(plotX - a, y);` 꼴(classic out: `plotX - 6 → plotX`, 1.7.0 과 같은 순서). 눈금 숫자 자리(153 `+ 10`)는 그대로 둔다. 편차 모드(365–392)도 같은 `seg` 로.

세로 축 이름 한 자씩 — `measureYAxisName`(583–616)의 603 줄 뒤에:

```ts
  if (look.stackYName) {
    // 한 자씩 쌓는다. 공백은 빈 줄로 둔다 — 시험지 「폭염 일수」 꼴
    const chars = Array.from((data.yLabel || '').split('\\n').join(''));
    const lines = chars.map((ch) => (ch === ' ' ? '' : ch));
    const size = textSize(options, 'axisNameV', fs.axisLabel);
    ctx.font = makeFont(size);
    const nameW = Math.max(0, ...lines.filter(Boolean).map((l) => ctx.measureText(l).width));
    ctx.restore();
    return { lines, size, tickW, reserve: 18 + tickW + nameW + 12, nameW };
  }
```

(반환 모양에 `nameW` 를 더하고 기존 갈래도 `nameW` 를 돌려주게 한다. `look` 은 이 함수가 `options` 를 받으므로 안에서 `byStyle(options, LOOK)`.) 그리는 자리(214)에서 `ctx.textAlign = look.stackYName ? 'center' : 'right'`, x 는 쌓을 때 `plotX - 18 - yTickTextW - yName.nameW / 2`. 편차 모드(439)의 `fillTextMultiline` 도 쌓을 때는 같은 줄 배열을 `fillLines` 로.

- [ ] **Step 2: 삼각 그래프** — 눈금은 값 읽는 방향이라 바깥 그대로(`tickDirOf(options, { x: 'out', y: 'out' })`), `dir.x === 'none'` 이면 153–156·163–166·173–176 의 `stroke()` 셋을 건너뛰고 글자 자리용 `tickLen` 을 0 으로.

- [ ] **Step 3: 하이서그래프 — 닫힌 틀, 안쪽 눈금** (§2: line 의 선·기호 + scatter 의 틀·격자)

LOOK 에 `closedFrame: false / true`. 149–156 틀:

```ts
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  if (look.closedFrame) {
    ctx.lineTo(plotX + plotW, plotY);
    ctx.closePath();
  }
  ctx.stroke();
```

(지금 L자가 `moveTo(plotX, plotY)` 로 시작하지 않으면 지금 순서를 classic 갈래에 그대로 둔다.)

163–190 눈금: `const dir = tickDirOf(options, { x: 'in', y: 'in' }); const L = t.line.tickLen;` 가로는 `in` → `moveTo(x, plotY + plotH); lineTo(x, plotY + plotH - L)`, `out` → 지금 코드, `none` → 안 그림. 글자 y 는 `plotY + plotH + (dir.x === 'out' ? L : 0) + 4`(classic 6+4=10). 세로도 같은 꼴, 글자 x `plotX - (dir.y === 'out' ? L : 0) - 4`.

- [ ] **Step 4: 방사형 — 축을 가로지르는 눈금** (§2 radar 3.6pt 전체 = 17.5px)

LOOK 에 `crossTick: 0 / 17.5`. 축 루프(107 줄) 뒤:

```ts
  if (look.crossTick > 0) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = look.axis.w;
    ctx.setLineDash([]);
    const half = look.crossTick / 2;
    for (let i = 0; i < n; i++) {
      const nx = -Math.sin(angles[i]);
      const ny = Math.cos(angles[i]); // 축에 수직
      for (let step = 1; step <= data.gridSteps; step++) {
        const [px, py] = toXY(angles[i], (step / data.gridSteps) * radius);
        ctx.beginPath();
        ctx.moveTo(px - nx * half, py - ny * half);
        ctx.lineTo(px + nx * half, py + ny * half);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
```

(`angles`·`toXY`·`radius`·`gridSteps` 는 파일의 이름을 쓴다.) 눈금 값 x(117 `cx + 4`)를 `cx + byStyle(options, { classic: 4, exam: look.crossTick / 2 + 3 })` 로.

- [ ] **Step 5: 정육면체 — 굵은 축의 촉 밑에서 선을 멈춘다**

`drawArrow(ctx, x1, y1, x2, y2, headLen)` 에 인자 `stopAtHead: boolean` 을 더하고:

```ts
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const back = stopAtHead ? headLen * Math.cos(0.4) : 0;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - back * Math.cos(angle), y2 - back * Math.sin(angle));
  ctx.stroke();
```

(촉 각도가 0.4 가 아니면 파일의 각도를 쓴다.) 호출 셋에 `byStyle(options, { classic: false, exam: true })` 를 넘긴다 — 4.8px 선이 촉 옆으로 삐져나오지 않게.

- [ ] **Step 6: 관문** — 작업 21 Step 6 과 같다.

- [ ] **Step 7: 커밋**

```bash
git add src/core/graphs/ScatterBubble.ts src/core/graphs/TernaryDiagram.ts src/core/graphs/Hythergraph.ts src/core/graphs/RadarChart.ts src/core/graphs/CubeGraph.ts
git commit -m "feat(exam): 산점·삼각·하이서·방사·정육면체 — 시험지 틀·눈금·세로 축 이름

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: 표 — 자리별 폭 재기와 값 정렬

exam 에서는 지명(고딕)·기호(명조)·값(숫자 글꼴)의 글꼴이 다르다. 한 글꼴로 재면 칸 폭이 틀린다.

**Files:**
- Modify: `src/core/graphs/DataTable.ts:35-49,111-121`, `src/core/graphs/MatrixTable.ts:29-37`

- [ ] **Step 1: `DataTable.ts`**

LOOK 에 칸: classic `measurePerPlace: false, valueAlign: 'right' as CanvasTextAlign`, exam `measurePerPlace: true, valueAlign: 'center' as CanvasTextAlign` (§2 data-table: 값 가운데 정렬).

38–49 줄의 폭 재기를 `if (look.measurePerPlace) { … } else { 지금 코드 }` 로 나눈다. 새 갈래:

```ts
    ctx.font = textFont(options, 'region', base);
    const labelTextW = Math.max(
      ctx.measureText(data.cornerLabel).width,
      ...data.rows.map((r) => rowLabelWidth(ctx, r, base, options, look.unitRatio)),
    );
    const colTextW = data.columns.map((c, j) => {
      const isSymbol = !data.columnIsSymbol || data.columnIsSymbol[j];
      ctx.font = textFont(options, isSymbol ? 'category' : 'region', base, { role: isSymbol ? font : 'sans' });
      return ctx.measureText(c).width;
    });
    ctx.font = textFont(options, 'value', base);
    const valueTextW = Math.max(
      ...colTextW,
      ...data.rows.flatMap((r) => r.values.map((v) => ctx.measureText(formatValue(v, r.decimals, data.groupThousands)).width)),
    );
```

(지금 코드가 이 세 값을 어떤 이름으로 쓰는지 보고 같은 이름으로 내보낸다.) classic 은 else 갈래라 1.7.0 그대로 — `columnIsSymbol[j] === false` 인 열을 명조로 재고 고딕으로 그리던 어긋남도 남는다.

값 그리기(111–121):

```ts
      ctx.textAlign = look.valueAlign;
      const vx = look.valueAlign === 'right' ? columnX(j) + valueW - pad : columnX(j) + valueW / 2;
      ctx.fillText(formatValue(v, row.decimals, data.groupThousands), vx, y + cellH / 2, valueW - pad * 2);
```

(`columnX`·`valueW`·`pad` 는 파일의 이름. 지금 오른쪽 정렬 식과 같으면 classic 이 그대로다.)

- [ ] **Step 2: `MatrixTable.ts`** — 33–37 줄 폭 재기를 같은 방식으로 나눈다(이름 칸: `nameIsSymbol` 로 category/region, 값: value). 값 정렬은 오른쪽 그대로(세계지리 떨어진 상자 꼴, §2 matrix-table).

- [ ] **Step 3: 관문·커밋**

Run: `npm run typecheck && npx vitest run --exclude test/core/overflow.test.ts`
Expected: PASS, 골든 86건 그대로.

```bash
git add src/core/graphs/DataTable.ts src/core/graphs/MatrixTable.ts
git commit -m "feat(exam): 표 — 자리별 글꼴로 칸 폭을 재고 값은 가운데

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: 넘침 시험을 두 양식으로

exam 은 글자가 크다(눈금 26 → 35px). 글자가 캔버스를 넘지 않는다는 1.2.0 의 약속을 exam 에서도 지킨다.

**Files:**
- Modify: `test/core/overflow.test.ts`
- Modify: 넘치는 렌더러(진단 결과에 따라)

- [ ] **Step 1: 양식 둘로 돈다**

`grep -n "fontSize" test/core/overflow-cases.ts` 로 케이스가 `fontSize` 를 따로 주지 않는지 본다(2026-10-07 에는 없다). `overflow.test.ts` 에서 케이스를 그리는 줄(269 근처 `c.render(ctx, W, H, c.data() as never, c.options());`)을 양식 인자를 받게 바꾸고, 케이스 루프를 `describe.each(['classic', 'exam'] as const)('%s', (style) => { … })` 로 감싼다. 그리는 옵션:

```ts
  const opts = { ...c.options(), style, fontSize: createDefaultGraphOptions(style).fontSize };
  c.render(ctx, W, H, c.data() as never, opts);
```

(`createDefaultGraphOptions` import. 시험 이름에 양식이 붙어 실패 목록에서 갈린다.)

- [ ] **Step 2: 실패 목록**

Run: `OVERFLOW_REPORT=planning/specs/exam-samples/_work/overflow-exam.txt npx vitest run test/core/overflow.test.ts 2>&1 | tail -40`
Expected: classic 은 전부 PASS. exam 실패가 있으면 보고서에 «종류·케이스·넘친 글자·몇 px» 가 남는다.

- [ ] **Step 3: 하나씩 고친다** (`superpowers:systematic-debugging`)

고치는 방향 — 이 저장소의 기존 약속을 따른다:
- 여백을 **상수**로 잡은 자리(예: `left: 130`, `bottom: 70`, 범례 `+ 60`)는 글자 크기에서 계산하게 바꾼다 — `textSize(options, '<자리>', …)` 로 잰 값 + 기존 간격. classic 에서 같은 값이 나오게 `byStyle(options, { classic: <지금 상수>, exam: <계산식> })` 로 둔다.
- 떠 있는 글자(단위·축 이름)는 `nudgeInside`·`drawFloatingLabel`·`shrinkToWidth`(`src/core/canvas/fit.ts`)를 쓴다 — 이미 있는 도우미다.
- 이름을 줄임표로 자르지 않는다(legend.ts 머리 주석의 약속).

고칠 때마다 `npx vitest run test/core/overflow.test.ts test/core/golden.test.ts` — classic 골든 86건이 그대로여야 한다.

- [ ] **Step 4: 관문·커밋**

Run: `npx vitest run`
Expected: 전부 PASS.

```bash
git add test/core/overflow.test.ts
git commit -m "test(overflow): 넘침 시험을 classic·exam 두 양식으로 돈다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Step 3 에서 고친 렌더러는 따로 `fix(exam): <종류> 글자가 캔버스를 넘지 않게` 로 커밋한다.)

---

### Task 25: exam 골든 43장

**Files:**
- Modify: `test/core/golden.test.ts`
- Create: `test/core/__snapshots__/exam/*.png` (43장)

- [ ] **Step 1: 시험을 양식 둘로**

`test/core/golden.test.ts` 를 바꾼다:

```ts
import type { StyleName } from '../../src/core/index';

const SNAP_DIR = join(__dirname, '__snapshots__');
/** classic 43장은 1.7.0 모양의 증거로 그대로, exam 43장은 2.0.0 기본 모양 */
const SETS: [StyleName, string][] = [
  ['classic', SNAP_DIR],
  ['exam', join(SNAP_DIR, 'exam')],
];

/**
 * 기준 이미지를 새로 쓰려면: UPDATE_GOLDEN=exam npx vitest run test/core/golden.test.ts
 * (UPDATE_GOLDEN=1 은 두 벌 다 다시 쓴다 — classic 은 바뀌면 안 되므로 쓰지 않는다)
 */
const UPDATE = process.env.UPDATE_GOLDEN;
const updates = (style: StyleName) => UPDATE === '1' || UPDATE === style;
```

`optionsFor(name)` → `optionsFor(name: string, style: StyleName)`, 첫 줄 `const base = { ...createDefaultGraphOptions(style), style };`. `render(fn, data, name)` 에 `style` 인자를 더해 `optionsFor(name, style)` 로.

`describe('골든 이미지', …)` 를 `describe.each(SETS)('골든 이미지 — %s', (style, dir) => { … })` 로 감싸고 안에서 `snapPath = join(dir, \`${name}.png\`)`, 기준 쓰기 조건 `!existsSync(snapPath) || updates(style)`, 폴더 만들기는 한 칸만:

```ts
        // 한 칸만 만든다 — 이 PC 의 한글 경로에서 recursive 는 깨진다
        if (!existsSync(dir)) mkdirSync(dir);
```

«빈 캔버스가 아니다» `it.each` 도 같은 `describe` 안으로 옮겨 `optionsFor(_name, style)` 를 쓴다. 실패 메시지의 `CHANGES.md` 를 `CHANGELOG.md` 로, 갱신 안내를 `UPDATE_GOLDEN=${style}` 로.

- [ ] **Step 2: exam 기준을 만든다**

```bash
mkdir -p test/core/__snapshots__/exam
UPDATE_GOLDEN=exam npx vitest run test/core/golden.test.ts
npx vitest run test/core/golden.test.ts
git status --short test/core/__snapshots__
```

Expected: 첫 실행 통과(기준 작성), 둘째 실행 `172 passed`(43×2×2). `git status` 에는 `?? test/core/__snapshots__/exam/` 만 — classic `*.png` 는 **하나도 안 바뀌었다**.

- [ ] **Step 3: 눈으로 본다**

43장 중 최소 `absbarStacked`·`stackedExam`·`stackedPie`·`line`·`lineEndExam`·`pyramidExam`·`scatterExamFrame`·`deviationAExam`·`dataTable`·`econPlane` 을 Read 로 연다. 확인할 것: 굵은 글자 없음, 축 1.9px·격자 검은 점선, 단위·범례 고딕, 눈금 숫자 세리프, 넘친 글자 없음. 이상하면 원인을 고치고 Step 2 를 다시 한다. 이 기준은 **임시**다 — 작업 28 의 사용자 승인 뒤에 굳힌다.

- [ ] **Step 4: 커밋**

```bash
git add test/core/golden.test.ts test/core/__snapshots__/exam
git commit -m "test(golden): exam 기준 43장 — classic 43장은 바이트 그대로

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 단계 D — 검증

### Task 26: 대조 시트 — 시험지 | 새 exam | 1.7.0

**Files:**
- Modify: `planning/tools/exam-measure/compare.py`
- Modify: `planning/tools/exam-measure/test_measure.py`

- [ ] **Step 1: 실패하는 시험** — `test_measure.py` 에:

```python
import tempfile
from pathlib import Path as _P
from compare import goldens_for


class Compare(unittest.TestCase):
    def test_goldens_for_matches_type_prefix(self):
        with tempfile.TemporaryDirectory() as d:
            snap = _P(d)
            for n in ("absbar.png", "absbarStacked.png", "deviationA.png", "deviationAExam.png", "deviationB.png"):
                (snap / n).write_bytes(b"")
            self.assertEqual([p.name for p in goldens_for("absbar", snap)], ["absbar.png", "absbarStacked.png"])
            self.assertEqual([p.name for p in goldens_for("deviation-a", snap)], ["deviationA.png", "deviationAExam.png"])
            self.assertEqual(goldens_for("cube", snap), [])
```

Run: `python -I -m unittest discover -s planning/tools/exam-measure -t planning/tools/exam-measure`
Expected: FAIL — `cannot import name 'goldens_for'`.

- [ ] **Step 2: `compare.py` 를 세 칸으로**

```python
# © 2026 김용현
"""시험지 표본 | 2.0.0 exam 골든 | 1.7.0 classic 골든 을 나란히 → exam-samples/_work/compare.html
겹침 그림(overlay.py 결과)이 있으면 종류 아래에 함께 놓는다."""
import html
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import REPO, SAMPLES, WORK, utf8_stdout

SNAP = REPO / "test" / "core" / "__snapshots__"
SNAP_EXAM = SNAP / "exam"
OVERLAY = WORK / "overlay"


def goldens_for(type_dir, snap_dir):
    """표본 폴더 이름(kebab)과 같은 머리로 시작하는 골든 PNG — 'deviation-a' → deviationA*"""
    key = type_dir.replace("-", "").lower()
    return sorted((p for p in Path(snap_dir).glob("*.png") if p.stem.lower().startswith(key)), key=lambda p: p.name)


def figs(paths):
    return "".join(f'<figure><img src="{p.as_uri()}"><figcaption>{html.escape(p.stem)}</figcaption></figure>' for p in paths)


def main():
    utf8_stdout()
    WORK.mkdir(parents=True, exist_ok=True)
    rows = []
    for d in sorted(p for p in SAMPLES.iterdir() if p.is_dir() and not p.name.startswith("_")):
        samples = sorted(d.glob("*.png"))
        overlays = sorted(OVERLAY.glob(f"{d.name}*.png")) if OVERLAY.exists() else []
        rows.append(
            f"<section><h2>{d.name}</h2><div class=row>"
            f"<div>{figs(samples) or '표본 없음'}</div>"
            f"<div>{figs(goldens_for(d.name, SNAP_EXAM)) or '—'}</div>"
            f"<div>{figs(goldens_for(d.name, SNAP)) or '—'}</div></div>"
            + (f"<h3>겹침</h3><div class=ov>{figs(overlays)}</div>" if overlays else "")
            + "</section>")
    page = f"""<!doctype html><meta charset=utf-8><title>시험지 대조</title>
<style>body{{font:14px sans-serif;margin:16px;background:#fff}}.row{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}}
.ov{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}img{{max-width:100%;border:1px solid #ccc}}figure{{margin:0 0 8px}}
h2{{border-top:2px solid #333;padding-top:8px}}</style>
<h1>시험지 표본 | 2.0.0 exam | 1.7.0 classic</h1>{''.join(rows)}"""
    out = WORK / "compare.html"
    out.write_text(page, encoding="utf-8")
    print("->", out)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: 통과·만들기**

Run: `python -I -m unittest discover -s planning/tools/exam-measure -t planning/tools/exam-measure && python -I planning/tools/exam-measure/compare.py`
Expected: 시험 OK, `-> …\_work\compare.html`.

- [ ] **Step 4: 커밋**

```bash
git add planning/tools/exam-measure/compare.py planning/tools/exam-measure/test_measure.py
git commit -m "chore(measure): 대조 시트를 표본·exam·classic 세 칸으로

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 27: 겹침 비교 — 시험지 자료를 다시 넣어 그리고 원본 위에 겹친다

네 장: 절댓값 누적 막대(2026_11_korgeo q11), 꺾은선(2026_11_wgeo q10 왼쪽 패널), 100% 누적 막대(2027_09_korgeo q14), 인구 피라미드(2026_09_wgeo q10 첫째 패널). 값은 표본 그림의 픽셀에서 읽었다(2026-10-07, 눈금 두 개로 px/단위를 잡고 막대 끝·점 중심을 읽음 — ±0.05 단위쯤).

**Files:**
- Create: `test/core/exam-overlay-cases.ts`, `test/core/exam-overlay.test.ts`
- Create: `planning/tools/exam-measure/overlay.py`
- Modify: `planning/tools/exam-measure/test_measure.py`

- [ ] **Step 1: 자료**

`test/core/exam-overlay-cases.ts`:

```ts
// © 2026 김용현
// 시험지 표본 네 장의 자료를 그림에서 읽어 다시 넣은 것 — 겹침 비교용.
// 값은 표본 PNG(planning/specs/exam-samples/)의 픽셀에서 읽었다(±0.05 단위).
import {
  renderAbsBarGraph, renderLineGraph, renderStackedGraph, renderPyramidGraph,
  createDefaultAbsBarData, createDefaultLineData, createDefaultStackedData, createDefaultPyramidData,
  type GraphOptions,
} from '../../src/core/index';

type Render = (ctx: CanvasRenderingContext2D, w: number, h: number, data: never, o: GraphOptions) => void;

export interface OverlayCase {
  /** 표본 폴더와 파일 — planning/specs/exam-samples/<dir>/<sample>.png */
  dir: string;
  sample: string;
  render: Render;
  data: () => unknown;
  options: Partial<GraphOptions>;
}

const FOREIGN = ['외국인 근로자', '결혼 이민자', '유학생', '기타'];

export const OVERLAY_CASES: OverlayCase[] = [
  {
    dir: 'absbar',
    sample: '2026_11_korgeo-q11',
    render: renderAbsBarGraph as unknown as Render,
    data: () => ({
      ...createDefaultAbsBarData(),
      stacked: true,
      seriesLabels: FOREIGN,
      // 연회색 217 → 진회색 127 → 빗금 → 흰색 = exam 기본 채움 순서 그대로
      categories: [
        { label: '(가)', values: [2.57, 0.63, 0.45, 2.58] },
        { label: '(나)', values: [0.89, 0.55, 0.80, 2.05] },
        { label: '(다)', values: [1.00, 0.33, 0.16, 1.67] },
      ],
      unit: '(만 명)',
      yRange: { min: 0, max: 7, auto: false, step: 1 },
    }),
    options: {
      footnotes: ['외국인 주민은 한국 국적을 가지지 않은 자만 고려함.'],
      sourceLeft: '(2023)',
      source: '(통계청)',
    },
  },
  {
    dir: 'line',
    sample: '2026_11_wgeo-q10',
    render: renderLineGraph as unknown as Render,
    data: () => ({
      ...createDefaultLineData(),
      xLabels: ['1970', '', '1980', '', '1990', '', '2000', '', '2010', '', '2020'],
      xUnit: '(년)',
      yUnit: '(천만 명)',
      yRange: { min: 0, max: 14, auto: false, step: 2 },
      frame: 'open',
      labelPlacement: 'lineEnd',
      showMarkers: true,
      series: [
        { label: '(가)', marker: 'circle', hollowMarker: true, lineStyle: 'solid',
          values: [4.4, 4.9, 5.6, 6.5, 7.5, 8.4, 9.3, 10.2, 11.1, 12.1, 13.1] },
        { label: '(나)', marker: 'triangle', hollowMarker: true, lineStyle: 'solid',
          values: [4.2, 4.2, 4.2, 4.1, 3.9, 3.6, 3.3, 3.2, 3.1, 2.9, 2.8] },
        // 표본은 회색(178) 네모 — 기호 회색 채움은 아직 없다(열린 질문), 빈 네모로 둔다
        { label: '(다)', marker: 'square', hollowMarker: true, lineStyle: 'solid',
          values: [2.2, 2.2, 2.1, 2.1, 2.1, 2.1, 2.0, 1.9, 1.8, 1.8, 1.8] },
        { label: '(라)', marker: 'circle', lineStyle: 'solid',
          values: [0.3, 0.33, 0.35, 0.4, 0.45, 0.53, 0.63, 0.76, 0.91, 1.06, 1.21] },
      ],
    }),
    options: { title: '〈촌락 인구 변화〉' },
  },
  {
    dir: 'stacked',
    sample: '2027_09_korgeo-q14',
    render: renderStackedGraph as unknown as Render,
    data: () => ({
      ...createDefaultStackedData(),
      seriesLabels: FOREIGN,
      seriesFills: ['#3f3f3f', '#999999', 'pattern:diagonal', '#ffffff'],
      unit: '(%)',
      categories: [
        { label: '(가)', values: [55.0, 5.2, 1.9, 37.9] },
        { label: '(나)', values: [22.1, 18.4, 0.3, 59.2] },
        { label: '(다)', values: [13.4, 3.9, 50.4, 32.3] },
      ],
    }),
    options: {
      footnotes: ['외국인 주민은 한국 국적을 가지지 않은 사람만 해당함.'],
      sourceLeft: '(2024)',
      source: '(행정안전부)',
    },
  },
  {
    dir: 'pyramid',
    sample: '2026_09_wgeo-q10',
    render: renderPyramidGraph as unknown as Render,
    data: () => ({
      ...createDefaultPyramidData(),
      numericAgeAxis: true,
      ageUnit: '(세)',
      axisLabel: '(%)',
      range: { max: 12, auto: false },
      // 0-4 … 80-84, 85+(85~90) — 18구간. 첫째 패널
      ages: [
        [2.7, 2.8], [2.95, 2.8], [2.6, 2.6], [2.55, 2.6], [5.3, 3.5], [9.4, 4.15], [10.7, 4.55],
        [9.0, 4.4], [6.65, 3.2], [4.7, 2.0], [3.2, 1.55], [2.2, 1.3], [1.1, 0.65], [0.45, 0.35],
        [0.3, 0.3], [0.15, 0.2], [0.05, 0.1], [0.05, 0.05],
      ].map(([male, female]) => ({ male, female })),
    }),
    options: { footnotes: ['85세 이상은 85~90세로 처리함.'] },
  },
];
```

⚠️ 꺾은선 `(라)` 계열 등 값과 피라미드 구간 순서(아래 → 위)는 `createDefaultPyramidData().ages[0]` 이 `0-4` 인지 확인하고 맞춘다(`AGE_GROUPS` 첫 칸이 `'0-4'`).

- [ ] **Step 2: 그리기 (환경 변수가 있을 때만)**

`test/core/exam-overlay.test.ts`:

```ts
// © 2026 김용현
// 겹침 비교용 그림 — EXAM_OVERLAY_OUT=<폴더> 일 때만 PNG 를 쓴다. 평소에는 «그려진다» 만 본다.
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clearCanvas, createDefaultGraphOptions } from '../../src/core/index';
import { OVERLAY_CASES } from './exam-overlay-cases';

const OUT = process.env.EXAM_OVERLAY_OUT;

describe('시험지 자료 다시 그리기', () => {
  it.each(OVERLAY_CASES.map((c) => [c.sample, c] as const))('%s', (_n, c) => {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    clearCanvas(ctx, 800, 600);
    c.render(ctx, 800, 600, c.data() as never, { ...createDefaultGraphOptions('exam'), ...c.options });
    const png = canvas.toBuffer('image/png');
    expect(png.length).toBeGreaterThan(1000);
    if (OUT) {
      if (!existsSync(OUT)) mkdirSync(OUT); // 한 칸만 — 한글 경로
      writeFileSync(join(OUT, `${c.dir}-${c.sample}.png`), png);
    }
  });
});
```

Run:

```bash
mkdir -p planning/specs/exam-samples/_work
EXAM_OVERLAY_OUT=planning/specs/exam-samples/_work/rendered npx vitest run test/core/exam-overlay.test.ts
```

Expected: 4 passed, `_work/rendered/` 에 PNG 넷.

- [ ] **Step 3: 겹치는 도구 — 시험부터**

`test_measure.py` 에:

```python
from overlay import axis_frame


class Overlay(unittest.TestCase):
    def test_axis_frame_skips_long_box_edge(self):
        a = blank(260, 300)
        a[150:153, 40:260] = 0      # 가로축
        a[20:153, 40:43] = 0        # 세로축
        a[220, 40:260] = 0          # 범례 상자 아랫변 — 길이가 같다
        a[200:221, 40] = 0          # 범례 상자 왼변 (짧다)
        self.assertEqual(axis_frame(a)[3], 152)

    def test_axis_frame_finds_l_shape(self):
        a = blank(200, 300)
        a[150:153, 40:260] = 0      # 가로축 (y 150~152)
        a[20:153, 40:43] = 0        # 세로축 (x 40~42)
        x0, x1, y_top, y_base = axis_frame(a)
        self.assertEqual((x0, x1), (40, 259))
        self.assertEqual(y_base, 152)   # 가로축 맨 아래 줄
        self.assertEqual(y_top, 20)
```

Run: 시험 명령 → FAIL(`No module named 'overlay'`).

`planning/tools/exam-measure/overlay.py`:

```python
# © 2026 김용현
"""시험지 표본 위에 다시 그린 그림을 겹친다 → exam-samples/_work/overlay/<type>-<sample>.png
두 그림의 축 틀(가장 긴 가로선 = 가로축, 그 왼쪽 끝에서 위로 = 세로축)을 찾아 맞춘다.
표본 = 빨강, 다시 그린 것 = 파랑, 겹친 잉크 = 검정."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import SAMPLES, WORK, utf8_stdout

INK = 128
# (표본 폴더, 위에서 아래로 이어 붙일 표본 이름들, 가로로 잘라 쓸 비율) — exam-overlay-cases.ts 와 같다
PAIRS = [
    ("absbar", ["2026_11_korgeo-q11"], None),
    ("line", ["2026_11_wgeo-q10"], (0.0, 0.5)),                           # 패널 둘 중 왼쪽
    ("stacked", ["2027_09_korgeo-q14"], None),
    ("pyramid", ["2026_09_wgeo-q10", "2026_09_wgeo-q10-1"], (0.0, 0.34)),  # 가로축이 둘째 그림에 있다 · 패널 셋 중 첫째
]


def axis_frame(a):
    """(x0, x1, y_top, y_base) — 가로축 줄의 잉크 시작·끝 x, 세로축 맨 위 y, 가로축 맨 아래 줄 y.

    길이가 가로축만 한 줄(닫힌 틀의 윗변, 범례 상자의 변)이 여럿일 수 있다 — 그 왼쪽 끝에서
    위로 이어진 잉크(세로축)가 가장 긴 줄을 가로축으로 친다."""
    ink = a < INK
    counts = ink.sum(axis=1)
    best = None
    for y in np.nonzero(counts >= counts.max() * 0.8)[0]:
        xs = np.nonzero(ink[y])[0]
        x0 = int(xs.min())
        top = int(y)
        while top > 0 and ink[top - 1, x0]:
            top -= 1
        run = int(y) - top
        if best is None or run > best[0]:
            best = (run, int(y), x0, int(xs.max()), top)
    _, y_base, x0, x1, y_top = best
    return x0, x1, y_top, y_base


def load_sample(d, names, xfrac):
    """표본 조각들을 위아래로 이어 붙이고(같은 폭으로), 필요하면 가로로 잘라 낸다."""
    parts = [gray(SAMPLES / d / f"{n}.png") for n in names]
    w = min(p.shape[1] for p in parts)
    a = np.vstack([p[:, :w] for p in parts])
    if xfrac:
        a = a[:, int(w * xfrac[0]): int(w * xfrac[1])]
    return a


def gray(path):
    return np.array(Image.open(path).convert("L"))


def overlay(s, rendered_png, out_png):
    r = gray(rendered_png)
    sx0, sx1, sy0, sy1 = axis_frame(s)
    rx0, rx1, ry0, ry1 = axis_frame(r)
    kx = (sx1 - sx0) / max(1, rx1 - rx0)
    ky = (sy1 - sy0) / max(1, ry1 - ry0)
    r2 = Image.fromarray(r).resize((max(1, round(r.shape[1] * kx)), max(1, round(r.shape[0] * ky))), Image.BILINEAR)
    canvas = Image.new("L", (s.shape[1], s.shape[0]), 255)
    canvas.paste(r2, (round(sx0 - rx0 * kx), round(sy0 - ry0 * ky)))
    rr = np.array(canvas)
    out = np.full(s.shape + (3,), 255, np.uint8)
    si, ri = s < INK, rr < INK
    out[si & ~ri] = (220, 0, 0)
    out[ri & ~si] = (0, 90, 255)
    out[si & ri] = (0, 0, 0)
    Image.fromarray(out).save(out_png)
    return kx, ky


def main(rendered_dir):
    utf8_stdout()
    out_dir = WORK / "overlay"
    out_dir.mkdir(parents=True, exist_ok=True)
    for d, names, xfrac in PAIRS:
        name = names[0]
        rendered = Path(rendered_dir) / f"{d}-{name}.png"
        kx, ky = overlay(load_sample(d, names, xfrac), rendered, out_dir / f"{d}-{name}.png")
        print(f"{d:8s} {name}: 배율 가로 {kx:.3f} 세로 {ky:.3f}")
    print("->", out_dir)


if __name__ == "__main__":
    main(sys.argv[1])
```

Run: 시험 명령 → OK.

- [ ] **Step 4: 겹치고 본다**

```bash
python -I planning/tools/exam-measure/overlay.py planning/specs/exam-samples/_work/rendered
python -I planning/tools/exam-measure/compare.py
```

Expected: `_work/overlay/` 에 넷. 넷 모두 Read 로 열어 본다 — 빨강(표본)과 파랑(새 그림)이 **선 굵기·격자 점선 간격·막대 테두리·채움 회색·글자 꼴**에서 얼마나 맞는지. 맞지 않는 자리를 «종류 · 자리 · 차이» 로 `planning/specs/exam-samples/_work/overlay-notes.md`(커밋 안 함)에 적는다 — 작업 28 에 가져간다. 축 틀이 엉뚱하게 잡히면(배율이 0.5 밑·2 위) 그 표본과 그림의 `axis_frame` 결과를 찍어 본다 — `PAIRS` 의 자르는 비율(꺾은선 왼쪽 절반, 피라미드 왼쪽 1/3)이 패널 경계에 맞는지가 첫 의심 자리다.

- [ ] **Step 5: 커밋**

```bash
git add test/core/exam-overlay-cases.ts test/core/exam-overlay.test.ts planning/tools/exam-measure/overlay.py planning/tools/exam-measure/test_measure.py
git commit -m "test(exam): 시험지 자료 네 장을 다시 그려 원본 위에 겹친다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 28: 사용자 검토 (관문)

**이 작업은 사람이 한다.** 승인 전에는 단계 E 로 가지 않는다.

- [ ] **Step 1: 사용자에게 보인다**

보일 것(경로를 그대로 준다):
- `planning/specs/exam-samples/_work/compare.html` — 17종 «시험지 | exam | classic»
- `planning/specs/exam-samples/_work/overlay/*.png` — 겹침 넷과 `overlay-notes.md` 의 차이 목록
- `planning/specs/exam-samples/_work/numerals.png` — 숫자 글꼴 후보(작업 13 의 선택)
- 아래 «열린 질문» 표

묻는 것: (1) 전체 인상 — 시험지와 같아 보이는가, (2) 숫자 글꼴 선택, (3) 열린 질문 각각의 결정, (4) 고칠 자리.

- [ ] **Step 2: 받은 대로 고친다**

값 조정은 `style.ts` 의 `examStyle` 또는 렌더러의 `LOOK.exam` 만 고친다(classic 은 손대지 않는다). 고친 뒤:

```bash
npx vitest run
UPDATE_GOLDEN=exam npx vitest run test/core/golden.test.ts
EXAM_OVERLAY_OUT=planning/specs/exam-samples/_work/rendered npx vitest run test/core/exam-overlay.test.ts
python -I planning/tools/exam-measure/overlay.py planning/specs/exam-samples/_work/rendered
python -I planning/tools/exam-measure/compare.py
```

다시 보인다. 승인까지 되풀이.

- [ ] **Step 3: 결정을 남기고 골든을 굳힌다**

실측 명세 끝에 `### 2단계 검토 결정 (YYYY-MM-DD, 사용자)` 절을 두고 결정을 번호로 적는다. 그다음:

```bash
git add planning/specs/2026-10-07-exam-style-measurements.md test/core/__snapshots__/exam src/core
git status --short   # 의도한 파일만 있는지 확인 — 다른 사람의 미완성 파일이 섞이지 않게
git commit -m "feat(exam): 사용자 검토를 반영하고 exam 기준 이미지를 굳힌다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git add src/core` 대신 실제로 고친 파일을 이름으로 적는다.)

---

## 단계 E — 2.0.0 준비

### Task 29: 판 번호·CHANGELOG·README·AI 참고서

**Files:**
- Modify: `package.json`, `package-lock.json` (판 번호)
- Modify: `CHANGELOG.md` (맨 위), `README.md:212-247,248-299,520-550`, `docs/ai-reference.md`
- Modify: `src/index.ts` (공개 타입)

- [ ] **Step 1: 판 번호**

Run: `npm version 2.0.0 --no-git-tag-version`
Expected: `v2.0.0` — package.json·package-lock.json 두 곳.

- [ ] **Step 2: 공개 타입**

`src/index.ts` 의 `export type { GraphOptions, FontRole, FontStack, …` 목록에 `StyleName, TickDirection,` 을 더한다. `npm run typecheck && npx vitest run test/index.test.ts` 통과.

- [ ] **Step 3: CHANGELOG** — 맨 위(제목 다음)에:

~~~markdown
## 2.0.0 — YYYY-MM-DD

**기본 그림이 평가원 시험지 양식이 됐다.** 수능·모의평가 31개 시험지에서 그래프
17종의 글꼴·굵기·선·점선·회색·범례를 재어(`planning/specs/2026-10-07-exam-style-measurements.md`)
그대로 옮겼다. 1.7.0 의 그림이 필요하면 옵션 하나로 돌아간다 — **바이트까지 같다**
(기준 이미지 43장이 증거다).

```js
new CsatChart(canvas, { type: 'absbar', data, options: { style: 'classic' } });
```

### 바뀐 모양 (기본 = `style: 'exam'`)

| 자리 | 1.7.0 | 2.0.0 |
|---|---|---|
| 글자 굵기 | 거의 전부 굵게 | 전부 보통 (시험지에 굵은 글자가 없다) |
| 눈금 숫자·연도·자료값·`A` | Noto Serif KR | 숫자 글꼴(본문 한양신명조와 꼴이 가까운 세리프) — 새 자리 `numeral` |
| 단위·축 이름·지명·범례·출처·각주 | 명조 또는 굵은 고딕 | 고딕(HY중고딕 1순위), 괄호·숫자는 세리프 |
| 항목 이름 `(가)` | 눈금 크기 굵은 명조 | 명조 보통, 눈금의 1.37배 |
| 글자 크기 기본 | 제목 36·축 28·눈금 26·값 22 | 40·39·35·40 |
| 축·틀 | 2px | 1.9px (0.39pt) |
| 격자 | 회색 `#ccc`/`#ddd` 0.5px 점선 | 검정 1.45px 점선 `[7.6, 4.7]` |
| 눈금 | 바깥 6px | 2.5pt(12px), 방향은 종류별 다수결 — 막대는 세로축 눈금 없이 범주 경계 안쪽, 꺾은선·피라미드 안쪽, 편차 A 바깥, 산점 없음 |
| 막대 테두리 | 0.8px | 1.75px |
| 누적 채움 순서 | `#333`·`#999`·`#666`·흰색·패턴 | 연회색 217 → 진회색 127 → 빗금 → 흰색 → 회색 다섯 단계 |
| 빗금 | 선 간격 7px·1.5px | 2.2pt(10.6px)·0.42pt(2px) |
| 어두운 칸 위 글자 | 흰 글자 | 검은 글자 + 흰 테두리 |
| 계열 선 | 2px, 점선 `[10,6]` 등 | 3.9px, 시험지 점선 무늬 |
| 꼭짓점 기호 | 지름 9px | 지름 13.6px |
| 범례 상자 | `#888` 1.5px, 견본 16px | 검정 1.7px, 견본 30px, 선 견본 112px |
| 출처·각주 색 | `#555` | 검정, 출처는 마지막 각주 줄 오른쪽 끝(기본), 둘째 각주는 `* *` |
| 피라미드 | 남 `#666`·여 `#BBB` | 남 회색 203·여 흰색, 테두리 검정, 막대 사이 틈 없음, 남·여 이름은 가로축 아래 |
| 경제 좌표평면 | 선 3px·축 2.5px·점 지름 12px | 4px·1.9px·20px |
| 방사형 | 회색 다섯 단계 계열 | 검정 굵은 실선·가는 실선·점선, 축을 가로지르는 눈금 |

(전체 47가지는 실측 명세 §3.)

### 새 옵션

| 칸 | 값 | 하는 일 |
|---|---|---|
| `style` | `'exam'`(기본)·`'classic'` | 양식. classic = 1.7.0 그대로 |
| `tickDirection` | `'in'`·`'out'` | 모든 축 눈금 방향을 한 번에. 미지정이면 종류별 기본 |
| `fontStack.numeral` | CSS 글꼴 목록 | 숫자 자리 글꼴. 한글이 없는 글꼴을 준다 — 명조·고딕 기본 순서 앞에도 붙는다 |
| line `data.frame` | `'closed'`(기본)·`'open'` | 꺾은선 틀. open = 왼쪽·아래만(L자) |

`createDefaultGraphOptions(style?)` 가 양식을 받는다(글자 크기 기본값이 양식마다 다르다).
`FontRole` 에 `'numeral'` 이 생겼다.

### 깨지는 것

- **기본 그림이 바뀌었다.** 1.x 그림을 그대로 쓰려면 `style: 'classic'`.
- 기본 글자 크기가 커졌다 — 같은 캔버스에서 플롯이 조금 좁아진다.
- `update({ options: { style } })` 는 그 양식의 기본 글자 크기로 다시 그린다. 직접 준 `fontSize` 는 남는다.
- 글꼴: exam 은 HY중고딕·HY신명조(한컴·MS 오피스가 깐다)를 먼저 찾고 없으면 Noto 로 간다. `ensureFonts()` 는 지금처럼 Noto 만 받는다. 신명 글꼴은 상용이라 넣지 않는다 — 깔린 PC 라면 별칭으로 잡힌다.

### 그대로인 것

- classic 기준 이미지 43장(1.7.0 의 42장 + 원그래프 1장) **바이트 동일**. exam 기준 43장은 `test/core/__snapshots__/exam/`.
- 1.7.0 의 알려진 모양 결함(어두운 계열의 막대 **밖** 값이 흰 글자로 안 보이던 것 등)은 classic 에 그대로 남겼다 — 바이트 동일이 약속이기 때문이다. exam 에서는 고쳤다.
~~~

(날짜는 작업하는 날. 표의 숫자가 작업 28 결정으로 바뀌었으면 그 값으로.)

- [ ] **Step 4: README**

| 자리 | 바꿀 것 |
|---|---|
| 첫 소개 문단(13 줄 「시작하기」 위) | 한 줄 더한다: «기본 그림은 평가원 시험지 양식(2.0.0)입니다. 1.x 의 그림은 `options.style: 'classic'`.» |
| 「옵션」 표(212–232) | `14개` → `16개`; `fontSize` 기본값 `{ title: 40, axisLabel: 39, tick: 35, dataLabel: 40 }`(classic 은 1.x 값); 행 둘 추가: `` | `style` | `'exam'` | 그림 양식. `'classic'` 은 1.7.0 그대로 | `` 와 `` | `tickDirection` | 없음(종류별) | 눈금 방향 `'in'`·`'out'` — 모든 축 | ``; `fontStack` 설명 `{ serif, sans, numeral }`; `sourceInline` 기본: «exam 은 켜짐» |
| 「내 글꼴로 그리기」(248–299) 끝 | 새 소절 «### 시험지 글꼴» — exam 의 글꼴 순서 세 줄(명조·고딕·숫자, `EXAM_*_STACK` 값 그대로)과 «숫자 글꼴을 앞에 두는 이유(괄호·숫자는 세리프, 한글은 고딕)», `fontStack.numeral` 예시 `{ numeral: "'Times New Roman'" }`, 한컴·MS 오피스가 없는 PC 는 Noto 로 그려진다는 것 |
| 「기여」 539–549 문단 | 아래로 바꾼다 |

「기여」 마지막 문단 교체(«`src/core/**` 는 …» 부터 «… 리뷰가 빨라집니다.» 까지):

```markdown
렌더러는 양식 토큰(`src/core/canvas/style.ts`)만 읽습니다 — 굵기·선 굵기·점선·회색을
렌더러에 숫자로 쓰지 마세요(`test/core/style-audit.test.ts` 가 막습니다). 양식에 따라
갈리는 새 값은 `classicStyle`·`examStyle` 에, 한 종류에서만 갈리는 값은 그 렌더러의
`LOOK` 표에 둡니다. classic 의 값은 1.7.0 과 바이트까지 같아야 합니다.

기준 이미지는 두 벌입니다 — `test/core/__snapshots__/*.png`(classic, 바뀌면 안 됨)와
`test/core/__snapshots__/exam/*.png`. exam 만 다시 쓸 때는
`UPDATE_GOLDEN=exam npx vitest run test/core/golden.test.ts`. 골든은 시스템 글꼴 대체 결과에
의존해 기계마다 다를 수 있어 CI 는 `SKIP_GOLDEN=1` 로 건너뜁니다 — 렌더러를 바꾸는 PR 이면
로컬에서 골든 비교까지 통과한 결과를 함께 적어 주세요. `src/core/**` 는 지금도 ESLint
대상에서 빠져 있습니다(`eslint.config.mjs`).
```

(«1.0.0 은 원본 렌더러를 한 글자도 고치지 않고 옮긴 판…» 같은 이관층 설명은 이 교체로 사라진다.)

- [ ] **Step 5: `docs/ai-reference.md`** — 옵션 목록에 `style`·`tickDirection`·`fontStack.numeral`·line `frame` 을 README 와 같은 말로 더하고, `fontSize` 기본값을 고친다(`grep -n "fontSize\|fontStack" docs/ai-reference.md` 로 자리를 찾는다).

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json CHANGELOG.md README.md docs/ai-reference.md src/index.ts
git commit -m "docs: 2.0.0 — 시험지 양식 기본, style: 'classic' 안내

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 30: 데모 양식 전환 단추·빌드·최종 확인

**Files:**
- Modify: `docs/index.html:769-790,1585-1598`
- Modify: `docs/lib/csat-chart.umd.min.js` (빌드 산출물)

- [ ] **Step 1: 데모**

`docs/index.html`:
- `OPTION_DEFAULTS`(769) 에 `'style': 'exam',` 을 `'fontFamily'` 앞에.
- `OPTION_ORDER`(789) 에 `'style'` 을 `'fontFamily'` 앞에.
- 글꼴 선택(1593–1597, `selectParts.push('<div class="field">' + … data-opt="fontFamily"`) **앞에**:

```js
  selectParts.push('<div class="field">' +
    '<label class="field-label" for="' + uid('style') + '">양식</label>' +
    '<select id="' + uid('style') + '" data-opt="style">' +
      '<option value="exam">시험지 (2.0)</option><option value="classic">옛 모양 (1.7)</option>' +
    '</select></div>');
```

`data-opt` 조작칸은 1990–2010 의 공통 처리기가 `state.options[key] = c.value` 로 받아 `chart.update` 한다 — 따로 이을 것이 없다. 761–768 의 «빼는 것» 주석 위에 `· style — 양식 전환. 데모는 두 양식을 나란히 비교하라고 낸다.` 한 줄을 «내는 것» 쪽 주석에 더한다(그런 목록이 없으면 OPTION_DEFAULTS 위 주석에).

- [ ] **Step 2: 빌드·전체 확인**

```bash
npm run verify
git status --short
```

Expected: typecheck·lint·build·test 전부 통과. `docs/lib/csat-chart.umd.min.js` 가 바뀌어 있다(빌드가 다시 썼다). classic 골든은 바뀌지 않았다.

- [ ] **Step 3: 데모를 브라우저로 본다**

`docs/index.html` 을 `file:///` 로 열어(또는 `npx serve docs`) 카드 셋에서 «양식» 을 바꿔 그림이 즉시 바뀌는지, 코드 스니펫에 `style` 이 나오는지, 콘솔 오류가 없는지 본다.

- [ ] **Step 4: 커밋**

```bash
git add docs/index.html docs/lib/csat-chart.umd.min.js
git commit -m "feat(docs): 데모에 양식 전환(시험지·옛 모양)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

푸시·태그·npm 발행·GitHub Release 는 하지 않는다 — 사용자가 정한다.

---

## 열린 질문 (작업 28 에서 사용자에게 묻는다)

| # | 질문 | 이 계획의 기본 |
|---|---|---|
| 1 | 숫자 글꼴 — 작업 13 의 1등을 쓸까 | 점수 1등(Windows 기본 탑재 우선) |
| 2 | 범례 선 견본 112px(23pt) — 실측 그대로면 길다 | 실측 그대로 |
| 3 | 점선 이름 짝 — `dashed`=3.1/1.4pt, `dotted`=2.0/1.0pt(짧은 점선), 긴 점선 10.1/2.0pt 는 이름이 없다 | 셋만, 긴 점선은 안 더함 |
| 4 | 꺾은선 기호 회색 채움(178·127), 강조 계열 1.2pt 를 옵션으로 둘까 | 안 둠 — `lineWidth` 로 이미 된다 |
| 5 | 트리맵 칸 채움·값 두 줄·흰 틈 변형, 원그래프 도넛·조각 이름 두 줄 | 이 계획 밖(새 자료 칸 필요) |
| 6 | 행렬표 한국지리 꼴(이어진 계단표 0.45pt·가운데 정렬) | 세계지리 떨어진 상자 꼴만 |
| 7 | 편차 B: 양수 127·음수 흰색 짝, 범주 이름 0 선 아래 | 그렇게 |
| 8 | 방사형 동심 다각형 격자 — exam 에서 끌까 | 둔다(표본에 없는지 불확실) |
| 9 | 피라미드: exam 기본을 숫자 나이 축·왼쪽으로 할까 | 안 바꿈(자료 칸 그대로) |
| 10 | 산점 원점 `0` 하나를 두 축이 함께 쓰기 | 안 함 |
