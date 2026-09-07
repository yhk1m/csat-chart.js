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
던지지는 않는다 — 못 받아도, 시간이 지나도 조용히 `false` 로 끝난다.

### 캔버스 크기

`width`/`height` 를 적지 않은 `<canvas>` 는 HTML 기본값인 300×150 대신 800×600 으로
자동 지정된다. 300×150 그대로 두면 여백·글자 크기가 절대 픽셀로 박혀 있는 이
라이브러리 특성상 플롯 영역이 음수가 되어 제목·눈금·각주가 한 덩어리로 겹친
읽을 수 없는 그림이 나온다. 그래서 `<canvas id="c"></canvas>` 라고만 써도 된다.

명시적으로 크기를 준 경우(위 예제의 800×600 처럼)는 작성자의 선택으로 보고
그대로 둔다 — 다만 대략 **500×400보다 작아지면 같은 이유로 다시 읽기 어려워진다.**
특별한 사정이 없다면 기본값인 800×600 안팎을 유지하는 편이 안전하다.

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

Node 에는 `document` 가 없으므로 `ensureFonts()` 를 불러도 아무 일도 하지 않고
`false` 만 돌아온다 — 시스템에 깔린 대체 글꼴로 그려진다. 시험지 서체가 꼭
필요하면 그 글꼴을 서버에 직접 설치한다.

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
데이터 모양이 어긋나면 만들 때든 `update()` 할 때든 한국어 메시지로 알려준다 —
아래 [오류 가려내기](#오류-가려내기) 참고.

## API

### `new CsatChart(target, config)`

`target` 은 `<canvas>` 요소 또는 그 `id` 문자열. `config` 는 `{ type, data, options? }`.
TypeScript 에서는 `type` 을 적는 순간 `data` 타입이 그 종류로 좁혀진다 — 다른 종류의
데이터를 넣으면 컴파일이 막힌다.

`target` 이 잘못돼도 알아보기 쉬운 한국어 오류를 던진다. 특히 `id` 를 잘못 적어
`document.getElementById()` 가 `null` 을 돌려준 경우 — 브라우저 콘솔을 잘 열지
않는 사용자를 겨냥해, «그 id 를 찾지 못한 것은 아닌지 보라» 는 안내까지 붙는다.

| 메서드 | 하는 일 |
|---|---|
| `update(next: UpdateFor<T>)` | `data`·`options` 중 준 것만 덮고 다시 그린다. 어긋나면 던지고 이전 상태를 지킨다 |
| `resize(width, height)` | 캔버스 픽셀 크기를 바꾸고 다시 그린다. 둘 다 0보다 커야 한다 |
| `toDataURL(options?: { scale?: number })` | PNG data URL |
| `download(filename?, options?: { scale?: number })` | 내려받기 (브라우저 전용) |
| `destroy()` | 흰 화면으로 지우고 더는 그리지 못하게 한다 |

`update()`·`resize()` 는 `this` 를 돌려주므로 이어 쓸 수 있다. `chart.canvas` 로
넘겨준 캔버스 자체에도 접근할 수 있다.

### 인쇄용 고해상도로 뽑기

`toDataURL()`·`download()` 의 `scale` 은 **글자·선까지 함께 키우는** 배율이다.
캔버스만 키우는 `resize(1600, 1200)` 과는 다르다 — 이 라이브러리의 글꼴 크기와
여백이 절대 픽셀이라서, 캔버스를 두 배로 하면 «두 배로 선명한 같은 그림» 이 아니라
**«글자가 절반으로 작아진 다른 그림»** 이 나온다. 인쇄용으로 뽑을 때는 이렇게 쓴다.

```js
const printUrl = chart.toDataURL({ scale: 2 });   // 화면과 같은 구도, 두 배 해상도
chart.download('시험지그림.png', { scale: 2 });
```

화면에 그려지는 캔버스 자체는 항상 1배다 — `devicePixelRatio` 를 따로 다루지
않으므로, 레티나 디스플레이에서 화면에 걸어 두는 용도로는 그대로 써도 되지만
확대해서 인쇄·투사할 계획이면 `scale` 을 쓴다.

### `options.fontSize` 부분 지정

`fontSize` 는 `{ title, axisLabel, tick, dataLabel }` 넷을 가진 객체이지만,
바꾸고 싶은 것만 적어도 된다 — TypeScript·JavaScript 모두 마찬가지다.

```js
chart.update({ options: { fontSize: { title: 44 } } });
```

나머지 세 값은 그대로 유지된다(얕게 덮지 않는다). TypeScript 에서 이 모양의
옵션 타입 이름은 `PartialGraphOptions`, 한 종류의 부분 갱신 전체는 `UpdateFor<T>` 다.

### `CsatChart.ensureFonts(options?)`

`Noto Serif KR`·`Noto Sans KR` 을 확보한다. 준비되면 `true`, 못 받거나 Node 이면
`false` 를 돌려준다. **던지지 않는다.** 사내망이면 `{ href }` 로 출처를 바꾼다.

### 오류 가려내기

데이터가 어긋나면 `CsatChartError` 를 던진다. 가려낼 때는 `instanceof` 말고
**`err.name` 을 본다.**

```js
try {
  new CsatChart(c, { type, data });
} catch (err) {
  if (err.name === 'CsatChartError') showHint(err.message);
}
```

같은 페이지에 ESM 판과 CDN 판이 함께 올라오면 클래스가 두 벌이 되어
`instanceof` 가 조용히 `false` 가 된다. `name` 은 그런 일이 없다.

메시지는 무엇이 왜 잘못됐는지까지 말해 준다. 필수 항목이 빠졌으면 그 이름을,
종류가 다르면 무엇이었어야 하는지를, `type` 을 잘못 적었으면 가까운 후보를 댄다.

```
csat-chart: 알 수 없는 type "climat" — 혹시 "climate"?
csat-chart: type "pyramid" 의 data 에 ages 항목이 없습니다
csat-chart: type "climate" 의 data.months[0]: 객체여야 합니다 (지금 숫자)
```

마지막 예는 흔한 실수 하나를 잡는다 — 열두 달 자료를 `months: [1, 2, …, 12]`
처럼 숫자만 있는 배열로 납작하게 붙여넣는 것. 배열이고 길이도 12라 겉모양만
보면 통과할 법하지만, 그 상태로 그리면 브라우저에서는 좌표가 어긋나 빈 그림이
나오고 Node 캔버스에서는 프로세스가 죽는다. 배열의 첫 원소까지 한 겹 더 보고
막는다.

### 상수

기호·눈금 순서를 정하는 값 7개 — `AGE_GROUPS`·`DOT_MARKER_ORDER`·
`LINE_MARKER_ORDER`·`LINE_STYLE_ORDER`·`MONTH_LABELS_EN`·`MONTH_LABELS_NUM`·
`LINE_DASH` — 를 내보낸다. 모두 **얼려서** 내보낸다. 렌더러가 기본값으로 읽는
바로 그 객체라서, 얼지 않으면 `DOT_MARKER_ORDER.reverse()` 한 번에 이후 모든
그림의 기호 배정이 조용히 어긋난다. `CHART_TYPES`(그래프 16종 목록)도 같은
이유로 따로 얼려서 내보낸다.

ESM/CJS 로 쓸 때는 각각 이름으로 가져온다.

```ts
import { CHART_TYPES, AGE_GROUPS } from 'csat-chart.js';
```

CDN 판에서는 전역 `CsatChart` 에도 같이 붙어 있어 `CsatChart.CHART_TYPES` 로도
쓸 수 있다 — 둘은 별개의 붙는 방식이라, 번들러로 쓸 때 `CsatChart.CHART_TYPES`
라고 쓰면 `undefined` 다.

### 저수준 렌더러

파사드를 거치지 않고 그래프 하나만 직접 그릴 수 있다. 모두 같은 꼴이다.

```ts
render○○(ctx, width, height, data, options): void
```

`CsatChart` 는 종류를 문자열로 고르므로 16종 렌더러를 전부 물고 있다 — 어느
것이 실제로 쓰일지 번들러가 미리 알 수 없기 때문이다. `render○○Graph` 하나만
가져오면 이 문제를 피할 수 있을 것 같지만, **지금 배포되는 `dist/csat-chart.mjs`
로는 실제로 번들이 줄지 않는다.** 실측(esbuild 0.27.7, `--bundle --minify
--format=esm`, `csat-chart.js` 를 패키지로 설치한 상태 기준):

| 무엇을 가져오나 | 크기 |
|---|---|
| 라이브러리 전부 | 95.9 KB |
| `CsatChart` 만 | 94.7 KB |
| `renderClimateGraph` 만 | 94.7 KB |

원인은 `CHART_TYPES`(16종 이름을 사전순으로 늘어놓은 목록)를 만드는 코드가
모듈 맨 위에서 `Object.keys(REGISTRY).sort()` 를 실제로 호출한다는 데 있다.
번들러는 함수 호출을 부작용이 없다고 함부로 가정하지 않으므로, 이 한 줄 때문에
16종 렌더러를 전부 담은 `REGISTRY` 가 무엇을 가져오든 계속 붙들려 있다.

그래서 저수준 렌더러는 **번들 크기를 아끼는 수단이 아니라**, `CsatChart` 의
수명주기(캔버스 자동 크기 보정, 글꼴이 늦게 도착했을 때 다시 그리기)가 필요
없을 때 쓰는 것이 맞다 — 위 [Node 레시피](#nodejs에서-png-뽑기)처럼 한 번 그리고
끝내는 스크립트가 그런 경우다. CDN 으로 쓰는 경우는 애초에 한 벌을 통째로
받으므로 이 이야기가 전혀 해당하지 않는다.

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
