# csat-chart.js 설계

작성일: 2026-09-07

## 1. 배경

수능·모의고사 지리 문항에 실리는 그래프는 일반 차트 라이브러리로 그려지지 않는다.
축·범례·각주·출처의 배치, 명조 글꼴, 흑백 인쇄를 전제한 해칭 패턴이 시험지 관습을
따르기 때문이다. 이 관습을 그대로 재현하는 Canvas 렌더러 16종이 이미 존재한다.

| 위치 | 성격 |
|---|---|
| `vibecoding/GeoGrapher` (npm명 `geographer`) | React+Vite 앱. Canvas 렌더러 11종 + D3 지도 4종 |
| `vibecoding/geotester-v2/src/lib/geo-graph` | 위 11종의 이식본 + 신규 5종 = **16종, 약 7,600줄** |

`geo-graph`는 처음부터 떼어낼 것을 전제로 **밀봉**되어 있다. 외부 의존성 0,
`react`/`next`/앱 내부 모듈 import 금지가 ESLint로 강제되고, 골든 이미지 테스트
30여 장이 붙어 있다. 이 문서는 그것을 독립 오픈소스 패키지로 내는 설계다.

## 2. 목적

수능 형식 그래프를 **종류별로** 그릴 수 있는 오픈소스 라이브러리를 공개한다.
개발자는 npm으로, 교사는 CDN 스크립트 한 줄로 쓴다.

## 3. 확정된 결정

| 항목 | 결정 |
|---|---|
| npm 패키지명 | `csat-chart.js` (Chart.js 선례: npm `chart.js`, 전역 `Chart`) |
| UMD 전역 이름 | `CsatChart` |
| 저장소 | `yhk1m/csat-chart.js` |
| 라이선스 | MIT |
| 배포 형태 | ESM + CJS + UMD 번들 (코어는 하나) |
| 범위 | Canvas 렌더러 16종. **D3 지도 4종은 제외** |
| 데이터 형식 | 그래프별 전용 형식 유지 + TypeScript 판별 유니온 |
| 문서·데모 | GitHub Pages 단일 페이지 |
| Node 렌더링 | 공식 지원 (canvas 구현체는 사용자가 고름) |
| 글꼴 | 선택적 자동 로딩 헬퍼 `ensureFonts()` |
| 기존 두 프로젝트 | **수정하지 않는다.** 읽기 전용 참조 |

npm 이름 `csat-chart` · `csat-chart.js` · `csatchart` · `csat-charts` 는
2026-09-07 기준 모두 비어 있음(레지스트리 404).

## 4. 원본과의 관계 — 세 벌 체제

`csat-chart.js`는 `geo-graph`의 **2026-09-07 시점 스냅샷**에서 출발한다.
그 뒤로 세 벌이 각자 살아간다.

```
GeoGrapher (읽기 전용)
   └─ geo-graph (geotester-v2 안, 손대지 않음)
        └─ csat-chart.js (이 저장소, 이제부터 독립)
```

사용자의 명시적 요청이다: **이 라이브러리 개발로 geotester-v2와 GeoGrapher를
수정하지 않는다.** 두 프로젝트는 프로덕션에서 돌고 있고 그대로 두고 싶다는 판단이다.

알려진 대가: 그래프 코드를 고치면 세 곳이 갈라진다. `geo-graph`와 GeoGrapher는
이미 `PopulationPyramid.ts` 하나에서 갈라져 있고(`verify:port`의 `DIVERGED`),
이제 그 관리 지점이 한 칸 늘어난다. 되돌릴 수 있는 선택이다 — 나중에 geotester-v2를
이 패키지에 의존시키면 3벌이 1벌로 줄어든다. 그 전환은 **이 프로젝트의 범위 밖**이다.

이식 시점의 사실 하나: `geo-graph/PopulationPyramid.ts`는 GeoGrapher 원본과 일부러
다르다(`pickTickStep` 도입). csat-chart.js는 **갈라진 쪽**을 가져간다.
`geo-graph/CHANGES.md`의 내용은 이 저장소 CHANGELOG의 첫 항목으로 흡수한다.

## 5. 범위 — 렌더러 16종

| 레지스트리 키 | 렌더러 | 데이터 타입 |
|---|---|---|
| `climate` | `renderClimateGraph` | `ClimateGraphData` |
| `deviation-a` | `renderDeviationAGraph` | `DeviationAData` |
| `deviation-b` | `renderDeviationBGraph` | `DeviationBData` |
| `pyramid` | `renderPyramidGraph` | `PyramidGraphData` |
| `ternary` | `renderTernaryGraph` | `TernaryGraphData` |
| `stacked` | `renderStackedGraph` | `StackedGraphData` |
| `absbar` | `renderAbsBarGraph` | `AbsBarGraphData` |
| `scatter` | `renderScatterGraph` | `ScatterGraphData` |
| `hythergraph` | `renderHythergraph` | `HythergraphData` |
| `cube` | `renderCubeGraph` | `CubeGraphData` |
| `radar` | `renderRadarChart` | `RadarGraphData` |
| `line` | `renderLineGraph` | `LineGraphData` |
| `category-dot` | `renderCategoryDotGraph` | `CategoryDotGraphData` |
| `treemap` | `renderTreemapGraph` | `TreemapGraphData` |
| `matrix-table` | `renderMatrixTable` | `MatrixTableData` |
| `data-table` | `renderDataTable` | `DataTableData` |

여러 낱말은 kebab-case, 한 낱말은 그대로 쓴다.

`core/types/common.ts`에 있는 기존 `GraphType`(`'guide'`·`'choropleth'`·`'symbolmap'`·
`'isoline'`·`'flowmap'` 포함)은 **GeoGrapher UI의 메뉴 목록**이지 렌더러 목록이 아니다.
csat-chart.js는 위 16개만 담은 `CsatChartType`을 새로 정의한다.

`core/types`는 `export *`로 타입을 몰아 내보내지만, 공개 표면에서는 다음을
**의도적으로 제외**한다. 이 패키지에 존재하지 않는 기능을 가리키거나 앱 UI의
관심사이기 때문이다. 호환을 지켜야 할 기존 사용자가 아직 없으므로 지금 정리한다.

- `GraphType` · `GRAPH_LABELS` · `MAP_GRAPH_TYPES` · `isMapGraphType` — 지도 4종과
  `'guide'`를 포함한 GeoGrapher 메뉴 목록
- `ExportSettings` · `createDefaultExportSettings` — `mode: 'exam' | 'custom'` 같은
  GeoGrapher 내보내기 대화상자의 상태

`index.ts`는 `export *`가 아니라 **내보낼 이름을 하나씩 적는다.** 그래야 공개 표면이
실수로 넓어지지 않는다.

지도 4종은 d3 패키지 5개와 GeoJSON 동봉이 필요해 성격이 다르다. 훗날 별도
패키지(`csat-chart-maps` 가칭)로 검토한다.

## 6. 구조 — 3계층

```
csat-chart.js/
  src/
    core/                 ← geo-graph 무수정 이관층
      canvas/             axes · labels · legend · patterns · renderer
      graphs/             렌더러 16종
      types/              데이터 타입 + GraphOptions
    registry.ts           키 → 렌더러·기본 데이터 매핑
    validate.ts           런타임 검증 (한국어 메시지)
    chart.ts              파사드 CsatChart 클래스
    fonts.ts              ensureFonts()
    index.ts              공개 API
  test/
    __snapshots__/        골든 이미지 30여 장
  docs/index.html         GitHub Pages 데모
```

**`core/`는 손대지 않는 층이다.** 무수정이어야 골든 이미지가 이식 성공의 증거로
작동한다. 새 기능은 언제나 `core/` 바깥에 얹는다. `core/`를 고쳐야 하는 상황이
생기면 그 자체를 별도 판단 지점으로 삼고 CHANGELOG에 남긴다.

각 층의 책임:

- `core/` — ctx와 크기와 데이터를 받아 그린다. 그 외 아무것도 모른다.
- `registry.ts` — 문자열 키 하나로 16종을 고르게 한다. 렌더러와 기본값을 짝짓는다.
- `validate.ts` — 타입이 없는 사용자를 위해 데이터 모양을 얕게 검사한다.
- `chart.ts` — 캔버스 획득·크기·다시 그리기·PNG 추출의 수명주기를 관리한다.
- `fonts.ts` — 브라우저에서 글꼴을 확보한다. 다른 층은 글꼴을 모른다.

## 7. 공개 API

### 7.1 파사드

```ts
const chart = new CsatChart(canvasOrId, {
  type: 'pyramid',
  data: {
    ages: [{ male: 2.1, female: 2.0 }, /* …17개 연령대 */],
    unit: 'percent',
    maleLabel: '남', femaleLabel: '여',
    axisLabel: '(%)',
    range: { max: 10, auto: true },
    ageLabelSide: 'center',
  },
  options: { title: '○○국 인구 구조', source: 'UN' },   // 선택
});

chart.update({ data: nextData });   // data·options 중 준 것만 덮고 다시 그림
chart.update({ options: { title: '바뀐 제목' } });
chart.resize(800, 600);
chart.toDataURL();                  // 'data:image/png;base64,…'
chart.download('그림.png');          // 브라우저 전용
chart.destroy();
```

첫 인자는 `HTMLCanvasElement` 또는 그 `id` 문자열. 크기는 캔버스의 `width`/`height`
속성을 쓰고, 없으면 800×600을 기본값으로 잡는다.

`options`를 생략하면 `createDefaultGraphOptions()` 결과를 쓴다. 부분 지정도
받는다 — 준 필드만 기본값 위에 덮는다.

### 7.2 저수준

기존 시그니처를 **그대로** 공개한다. 이 층이 있어야 기존 코드가 그대로 옮겨온다.

```ts
import { renderPyramidGraph, createDefaultGraphOptions } from 'csat-chart.js';
renderPyramidGraph(ctx, 800, 600, data, createDefaultGraphOptions());
```

모든 렌더러가 같은 꼴이다: `render○○(ctx, width, height, data, options): void`

### 7.3 타입

```ts
export type CsatChartConfig =
  | { type: 'climate';   data: ClimateGraphData;   options?: Partial<GraphOptions> }
  | { type: 'pyramid';   data: PyramidGraphData;   options?: Partial<GraphOptions> }
  | …16종
```

판별 유니온이므로 `type`을 적는 순간 `data`가 좁혀지고, 어긋나면 컴파일 시점에
잡힌다. 데이터 타입과 `createDefault*Data()` 기본값 생성기도 전부 내보낸다.

### 7.4 런타임 검증

타입이 없는 자바스크립트 사용자를 위해 `chart.ts`가 그리기 전에 얕은 검사를 한다.
검사는 **모양**만 본다. 값의 타당성은 보지 않는다.

기대 모양을 손으로 적지 않는다. **`createDefault*Data()`가 곧 정답 모양이다** —
그 객체에 있는 키는 필수, 없는 키는 선택(핵심 타입의 `?` 필드들이 여기 해당한다).
그래서 `core/`가 바뀌면 검증도 저절로 따라간다.

규칙:

1. `type`이 레지스트리에 없으면 — 편집 거리로 가장 가까운 키를 제안한다
2. `data`가 객체가 아니면 — 오류
3. 기본 데이터의 키 중 빠진 것이 있으면 — 오류
4. 주어진 키의 종류(배열·객체·숫자·문자열·불리언)가 기본값과 다르면 — 오류
5. 길이가 고정된 배열은 길이도 본다 — 확인된 것만 표로 둔다:
   `climate.months` 12, `deviation-a.baseMonths` 12, `deviation-a.months` 12,
   `ternary.axisLabels` 3

실패하면 한국어로 무엇이 어떻게 어긋났는지 던진다.

```
csat-chart: type "climate" 의 data.months: 12개여야 합니다 (지금 11개)
csat-chart: type "pyramid" 의 data 에 ages 항목이 없습니다
csat-chart: 알 수 없는 type "piramid" — 혹시 "pyramid"?
```

## 8. 배포 산출물

| 파일 | 용도 |
|---|---|
| `dist/csat-chart.mjs` | ESM — 번들러 |
| `dist/csat-chart.cjs` | CJS — Node `require` |
| `dist/csat-chart.umd.min.js` | CDN `<script>`, 전역 `CsatChart` |
| `dist/index.d.ts` | 타입 선언 |

빌드는 **tsup**(esbuild 기반). 외부 의존성이 0이라 설정이 짧다.
`package.json`의 `exports` 필드로 세 진입점을 갈라 준다.

UMD 번들에는 브라우저 전용 코드가 포함되고, Node 대상 진입점에서는 `download()`가
사용 불가임을 명확한 오류로 알린다.

## 9. 글꼴

렌더러는 `Noto Serif KR`(기본)과 `Noto Sans KR`을 쓴다. 글꼴이 없으면 대체 글꼴로
그려져 시험지 양식이 재현되지 않는다. 이것이 CDN 사용의 가장 흔한 함정이다.

```js
await CsatChart.ensureFonts();
new CsatChart('c', { type: 'climate', data });
```

`ensureFonts()`는 `FontFace`로 글꼴을 받아 `document.fonts`에 등록하고 Promise를
돌려준다. 이미 등록돼 있으면 즉시 resolve 한다. 사내망·오프라인을 위해 `urls`
옵션으로 출처를 바꿀 수 있다. 브라우저에만 존재하며 Node에서는 아무 일도 하지 않는다.

**번들에 글꼴을 넣지 않는다.** 한글 글꼴은 서브셋해도 수백 KB라 모든 사용자에게
비용을 지우게 된다. 부르는 사람만 무거워지도록 한다.

## 10. Node 렌더링

라이브러리는 `CanvasRenderingContext2D`만 받으므로 Node canvas 구현체에서도 돌아간다.
구현체(`@napi-rs/canvas` 등)는 **사용자가 고르고 설치한다.** 이 패키지의 의존성이
아니다.

```js
import { createCanvas } from '@napi-rs/canvas';
import { renderClimateGraph, setCanvasFactory } from 'csat-chart.js';

setCanvasFactory((w, h) => createCanvas(w, h));
const cv = createCanvas(800, 600);
renderClimateGraph(cv.getContext('2d'), 800, 600, data, options);
fs.writeFileSync('out.png', cv.toBuffer('image/png'));
```

브레인스토밍 단계에서 이 부분을 잘못 짚었다. 코드를 실제로 확인한 결과는 다음과 같다.

- `core/canvas/patterns.ts` — **이미 Node에서 돌아간다.** `document`가 없으면 지금
  그리고 있는 캔버스의 생성자(`ctx.canvas.constructor`)로 타일 캔버스를 만든다.
  `ctx.createPattern`이 같은 백엔드의 캔버스만 받기 때문에 그렇게 짜여 있다.
  기존 골든 테스트 31장이 `@napi-rs/canvas`로 돌면서 해칭까지 그려내고 있는 것이
  그 증거다. **`setCanvasFactory()`는 필요 없다 — 만들지 않는다.**
- `core/canvas/export.ts` — **이관하지 않는다.** GeoGrapher 전용이다. 파일명을
  `GeoGrapher_*.png`로 짓고, 공개 표면에서 제외하기로 한 `ExportSettings`·`GraphType`에
  의존한다. geotester-v2 안에서도 아무도 import 하지 않는 죽은 코드다.
  같은 역할은 파사드의 `toDataURL()`·`download()`가 대신한다.

`export.ts`를 빼는 것이 `core/` 무수정 원칙의 **유일한 예외**다. 파일을 지우는 것뿐
내용을 고치지 않으며, 이유를 CHANGELOG에 명시한다.

## 11. 테스트

| 대상 | 방법 | 통과 기준 |
|---|---|---|
| `core/` 이식 | 골든 이미지 비교 | 픽셀이 기존과 같음 |
| 레지스트리 | 단위 테스트 | 16종 전부 디스패치되고 기본 데이터로 그려짐 |
| 검증 | 단위 테스트 | 어긋난 데이터마다 지정된 문구가 나옴 |
| 파사드 | 단위 테스트 | update·resize·destroy 후 상태가 맞음 |
| 번들 | 스모크 | 세 산출물 각각을 실제로 불러 한 장 그림 |

골든 이미지는 `geo-graph/__tests__/__snapshots__`에서 그대로 가져온다. 기준 데이터도
`fixtures.ts`를 그대로 쓴다 — **난수를 쓰지 않는다.** 기준 이미지가 매번 달라진다.

기존에 밝혀진 함정 하나를 회귀 테스트로 유지한다: **눈금 간격이 0이 되면 동기 루프가
멎는다.** `niceStep`·`autoRange`·피라미드 `pickTickStep`·트리맵 `squarify`에 가드와
테스트가 이미 있다. 눈금 간격을 새로 계산하는 코드를 쓸 때는 `maxVal <= 0` 가드를
먼저 넣는다.

## 12. 데모 (GitHub Pages)

`docs/index.html` 한 장. UMD 번들을 불러 16종을 **실제로** 그린다.

각 그래프마다:
- 캔버스 (실제 렌더 결과)
- 복사 가능한 최소 코드
- 데이터 편집창 — 고치면 즉시 다시 그림
- PNG 내려받기 버튼

맨 위에 «스크립트 한 줄 + 캔버스 하나» 시작 예제를 둔다.
UI에 이모지를 쓰지 않는다. 아이콘이 필요하면 선 SVG로 그린다.

## 13. 하지 않을 것

- 애니메이션·전환 효과 — 목적이 정지된 시험지 그림이다
- 툴팁·마우스 상호작용 — 같은 이유
- 반응형 리사이즈 관찰 — 크기는 호출자가 정한다
- 테마·다크모드 — 시험지는 흑백 인쇄가 기준이다
- 지도 4종 — 성격이 다르다. 별도 패키지로 검토
- React/Vue/Svelte 래퍼 — canvas ref 한 줄이면 충분하다
- `{labels, datasets}` 통일 어댑터 — 삼각·하이서·정육면체가 그 꼴에 안 맞는다
- geotester-v2 / GeoGrapher 전환 — 사용자가 명시적으로 범위 밖으로 두었다

## 14. 구현 단계

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| 0 | 저장소 뼈대 — tsup·vitest·tsconfig·ESLint·LICENSE | `npm run build`가 빈 진입점을 묶음 |
| 1 | `core/` 무수정 이관 + 골든 이관 | 골든 30여 장 전부 통과 |
| 2 | `registry.ts` + `validate.ts` | 16종 디스패치·검증 문구 테스트 통과 |
| 3 | `chart.ts` 파사드 | update·resize·toDataURL·destroy 테스트 통과 |
| 4 | `fonts.ts` | 글꼴 등록·중복 호출 테스트 통과 |
| 5 | 번들 3종 + `exports` + 타입 선언 | 세 산출물 스모크 통과 |
| 6 | README + CHANGELOG | 시작 예제가 복붙으로 동작 |
| 7 | `docs/index.html` 데모 | 16종이 실제로 그려짐 |
| 8 | npm publish v1.0.0 | 설치본으로 스모크 통과 |

## 15. 위험과 대응

| 위험 | 대응 |
|---|---|
| 이관 중 렌더 결과가 미묘하게 달라짐 | 골든 이미지가 관문. 무수정 이관이 원칙인 이유 |
| 골든 이미지가 기계마다 다름 (글꼴 대체가 환경마다 다르다) | 골든은 이식 검증용이므로 저자 기계에서 돌린다. CI에서는 `RUN_GOLDEN` 없이 건너뛰고, 글꼴과 무관한 «빈 캔버스가 아니다» 검사는 늘 돌린다 |
| CDN 사용자가 글꼴 없이 써서 «모양이 다르다» 문의 | 데모 첫 예제와 README 첫 단락에 `ensureFonts()` 노출 |
| 세 벌이 갈라짐 | 이 저장소가 이제 그래프의 정본. 고칠 일이 생기면 여기서 고치고, 다른 두 곳으로 옮길지는 그때 각각 판단 |
