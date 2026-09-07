# csat-chart.js

수능·모의고사 시험지 양식의 그래프를 Canvas 2D로 그리는 라이브러리.
축·범례·각주·출처의 배치, 명조 글꼴, 흑백 인쇄를 전제한 해칭 패턴까지
시험지 관습을 그대로 따른다. **런타임 의존성이 없다.**

- 데모: https://yhk1m.github.io/csat-chart.js/
- 라이선스: MIT

## 시작하기

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
던지지 않는다 — 글꼴을 못 받아도, 제한 시간(기본 5초)을 넘겨도 조용히 `false` 로
끝난다.

`<canvas id="c"></canvas>` 처럼 크기를 적지 않으면 800×600 으로 채운다. HTML
기본값인 300×150 으로 그리면 여백·글자 크기가 절대 픽셀이라 제목·눈금·각주가
한 덩어리로 겹친다. 크기를 직접 적었다면 그 크기를 그대로 쓴다. 다만 대략
500×400 보다 작으면 글자가 겹쳐 읽기 어려워진다.

## 내 자료 넣기

`createDefault○○Data()` 가 주는 것은 **뼈대**다. 기후·인구 피라미드처럼 값이 전부
0인 것도 있어서, 그대로 그리면 빈 그림이 나온다. 필요한 칸만 덮어 쓴다.

```html
<script>
  CsatChart.ensureFonts().then(function () {
    const data = CsatChart.createDefaultClimateData();
    // 1월부터 12월까지, 월마다 { temp, precip } 하나씩 — 열두 개를 다 채운다.
    data.months = [
      { temp: -1.9, precip: 16.8 }, { temp: 0.7, precip: 28.2 },
      { temp: 6.1, precip: 36.9 },  { temp: 12.6, precip: 72.9 },
      { temp: 18.2, precip: 103.6 },{ temp: 22.7, precip: 129.5 },
      { temp: 25.3, precip: 414.4 },{ temp: 26.1, precip: 348.2 },
      { temp: 21.2, precip: 141.5 },{ temp: 14.8, precip: 52.2 },
      { temp: 7.2, precip: 51.1 },  { temp: 0.4, precip: 22.6 },
    ];
    const chart = new CsatChart('c', {
      type: 'climate',
      data: data,
      options: { title: '서울의 기후', source: '기상청', footnotes: ['1991~2020년의 평년값임.'] },
    });
    // 인쇄용으로 뽑을 때는 아래 「인쇄용으로 뽑기」 처럼 chart.download(…) 를 쓴다.
  });
</script>
```

`tempRange`·`precipRange` 는 `auto: true` 라 값에 맞춰 알아서 잡힌다. 눈금을 고정하고
싶으면 `auto: false` 로 두고 `min`·`max` 를 적는다.

## 그래프 16종

| `type` | 그래프 | 기본 데이터 | 저수준 렌더러 | 데이터 타입 |
|---|---|---|---|---|
| `absbar` | 절댓값 막대 | `createDefaultAbsBarData()` | `renderAbsBarGraph` | `AbsBarGraphData` |
| `category-dot` | 범주 점 | `createDefaultCategoryDotData()` | `renderCategoryDotGraph` | `CategoryDotGraphData` |
| `climate` | 기후 그래프 | `createDefaultClimateData()` | `renderClimateGraph` | `ClimateGraphData` |
| `cube` | 정육면체 | `createDefaultCubeData()` | `renderCubeGraph` | `CubeGraphData` |
| `data-table` | 항목×지역 표 | `createDefaultDataTableData()` | `renderDataTable` | `DataTableData` |
| `deviation-a` | 월별 편차 | `createDefaultDeviationAData()` | `renderDeviationAGraph` | `DeviationAData` |
| `deviation-b` | 지역별 편차 | `createDefaultDeviationBData()` | `renderDeviationBGraph` | `DeviationBData` |
| `hythergraph` | 하이서그래프 | `createDefaultHythergraphData()` | `renderHythergraph` | `HythergraphData` |
| `line` | 꺾은선 | `createDefaultLineData()` | `renderLineGraph` | `LineGraphData` |
| `matrix-table` | 계단식 행렬표 | `createDefaultMatrixTableData()` | `renderMatrixTable` | `MatrixTableData` |
| `pyramid` | 인구 피라미드 | `createDefaultPyramidData()` | `renderPyramidGraph` | `PyramidGraphData` |
| `radar` | 방사형 | `createDefaultRadarData()` | `renderRadarChart` | `RadarGraphData` |
| `scatter` | 산점도·버블 | `createDefaultScatterData()` | `renderScatterGraph` | `ScatterGraphData` |
| `stacked` | 100% 막대·원 | `createDefaultStackedData()` | `renderStackedGraph` | `StackedGraphData` |
| `ternary` | 삼각 그래프 | `createDefaultTernaryData()` | `renderTernaryGraph` | `TernaryGraphData` |
| `treemap` | 트리맵 | `createDefaultTreemapData()` | `renderTreemapGraph` | `TreemapGraphData` |

기본 데이터는 표의 `createDefault○○Data()` 로 얻어 고쳐 쓴다 — 어느 종류든 이
이름 규칙을 따른다. 저수준 렌더러 이름은 그렇지 않다 — `renderDataTable`·
`renderHythergraph`·`renderMatrixTable`·`renderRadarChart` 넷은 `render○○Graph`
를 따르지 않으니 표에서 확인한다. 데이터 모양이 어긋나면 한국어 메시지로
알려준다 — [오류 가려내기](#오류-가려내기) 참고.

## 옵션

`options` 는 다음 13개 필드를 받는다. 필요한 것만 적으면 나머지는 기본값을 쓴다.

| 필드 | 기본값 | 하는 일 |
|---|---|---|
| `title` | `''` | 제목 |
| `source` | `''` | 출처. 각주 위(또는 `sourceInline` 이면 각주와 같은 줄)에 오른쪽 정렬로 적힌다 |
| `sourceLeft` | 없음 | 출처 줄 왼쪽에 함께 적을 글(예: 자료 연도 `(2024)`). **지금은 `stacked` 에서만 동작한다** |
| `sourceInline` | 없음(꺼짐) | 출처를 마지막 각주와 같은 줄 오른쪽 끝에 붙인다(시험지 관습). **지금은 `scatter` 에서만 동작한다** |
| `footnotes` | `['']` | 각주 목록. 앞에 `* ` 를 자동으로 붙이므로 직접 적지 않는다. 빈 문자열은 무시된다 |
| `fontFamily` | `'serif'` | `'serif'`(명조)·`'sans'`(고딕)·`'custom'` 중 하나 |
| `customFont` | `''` | `fontFamily` 가 `'custom'` 일 때 쓸 글꼴 이름 |
| `fontSize` | `{ title: 36, axisLabel: 28, tick: 26, dataLabel: 22 }` | 제목·축 이름·눈금·데이터 값 글자 크기(px). 각주·출처는 `dataLabel` 을 따른다 |
| `showDataLabels` | `false` | 막대·점에 값을 함께 표시할지 |
| `showLegend` | `true` | 범례를 보여줄지 |
| `legendPosition` | `'bottom'` | `'bottom'`(아래)·`'right'`(오른쪽) 중 하나 |
| `legendLabel1` | `''` | 두 계열을 쓰는 종류(기후·편차·인구 피라미드)의 첫 계열 범례 이름. 비워 두면 데이터가 준 이름을 쓴다 |
| `legendLabel2` | `''` | 같은 종류의 두 번째 계열 범례 이름 |

`fontSize` 는 하나만 부분 지정해도 된다 — TypeScript·JavaScript 모두 마찬가지다.

```js
chart.update({ options: { fontSize: { title: 44 } } });
```

나머지 세 값은 그대로 유지된다(준 항목만 갈아 끼운다). TypeScript 에서 이 모양의
옵션 타입 이름은 `PartialGraphOptions`, 한 종류의 부분 갱신 전체는 `UpdateFor<T>` 다.

## 그림이 이상할 때

| 증상 | 원인 | 할 일 |
|---|---|---|
| 글꼴이 시험지 같지 않다 | `ensureFonts()` 를 안 불렀거나, 차트를 만든 **뒤에** 불렀다 | `await CsatChart.ensureFonts()` 를 먼저 부르고 그 안에서 차트를 만든다 |
| 제목·눈금·각주가 한 덩어리로 겹친다 | 캔버스가 너무 작다 | 800×600 안팎으로. 500×400 아래로는 내려가지 않는다 |
| 축은 그려지는데 자료가 없다 | 기본 데이터를 그대로 썼다 (값이 전부 0인 종류가 있다) | [내 자료 넣기](#내-자료-넣기) |
| 레티나에서 흐릿하다 | 화면 캔버스는 1배다 | `toDataURL({ scale: 2 })` 로 뽑아 `<img>` 로 건다 |
| 아무것도 안 그려진다 | `CsatChartError` 가 던져졌다 | 브라우저 콘솔(F12)을 열면 한국어로 이유가 적혀 있다 |

## 인쇄용으로 뽑기

`toDataURL()`·`download()` 의 `scale` 은 **글자·선까지 함께 키우는** 배율이다.
캔버스만 키우는 `resize(1600, 1200)` 과는 다르다 — 이 라이브러리의 글꼴 크기와
여백이 절대 픽셀이라서, 캔버스를 두 배로 하면 «두 배로 선명한 같은 그림» 이 아니라
**«글자가 절반으로 작아진 다른 그림»** 이 나온다. 인쇄용으로 뽑을 때는 이렇게 쓴다.

```js
const printUrl = chart.toDataURL({ scale: 2 });   // 화면과 같은 구도, 두 배 해상도
chart.download('시험지그림.png', { scale: 2 });
```

화면에 그려지는 캔버스 자체는 항상 1배다. `devicePixelRatio` 를 따로 다루지
않으므로 **레티나 디스플레이에서는 글자와 선이 조금 흐릿하게 보인다.** 화면으로
훑어보는 데는 지장이 없지만, 또렷한 그림이 필요하면 `scale: 2` 로 뽑은 PNG 를
`<img>` 에 넣고 CSS 로 원래 크기까지 줄여 건다. 인쇄·투사도 같은 방법이다.

## 지원 환경

- Chrome 99, Firefox 112, Safari 16.4(iOS 16.4) 이상은 아무것도 하지 않아도
  16종 전부가 그대로 그려진다 (빌드 타깃 ES2020).
- 그 아래 — Chrome 80·Firefox 74·Safari 13.1 까지 — 도 그려진다. **다만
  `absbar`·`climate`·`deviation-a`·`deviation-b`·`hythergraph`·`pyramid`·
  `scatter`·`stacked` 여덟 종류는 범례 박스를 그릴 때 `ctx.roundRect()` 를
  쓰는데, 그 메서드가 Chrome 99·Firefox 112·Safari 16.4 미만에는 없다.** 이
  라이브러리는 그 자리를 폴리필로 메운다 — `new CsatChart(...)` 를 쓰면
  생성자가 첫 렌더 전에 자동으로 불러 주므로 신경 쓸 일이 없다. 저수준
  렌더러(`renderClimateGraph` 등)를 파사드 없이 직접 부른다면 그리기 전에
  `installRoundRectPolyfill()` 을 스스로 한 번 불러야 한다.
- 학교 PC·구형 iPad 가 이 라이브러리의 실제 관객이다. iPad 5세대·Air 2 처럼
  iOS 15 에서 멈춘 기기는 iOS 16.4 를 영영 받을 수 없어, 폴리필이 없으면
  위 여덟 종류가 흰 캔버스로만 보인다.
- 런타임 의존성 0. `<script>` 한 줄이면 된다
- Node 는 캔버스 구현체를 직접 고른다 (아래 「Node.js 에서 PNG 뽑기」)

## 번들러

```bash
npm install csat-chart.js
```

```ts
import { CsatChart, createDefaultClimateData } from 'csat-chart.js';

await CsatChart.ensureFonts();

// 기본 자료는 값이 전부 0이다 — 채우는 법은 위 「내 자료 넣기」.
const chart = new CsatChart(document.querySelector('canvas'), {
  type: 'climate',
  data: createDefaultClimateData(),
  options: { title: '기후 그래프', source: '기상청' },
});

chart.update({ options: { title: '부산의 기후' } });
chart.download('기후그래프.png');
```

## Node.js 에서 PNG 뽑기

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

## API 자세히

### `new CsatChart(target, config)`

`target` 은 `<canvas>` 요소 또는 그 `id` 문자열. `config` 는 `{ type, data, options? }`.
TypeScript 에서는 `type` 을 적는 순간 `data` 타입이 그 종류로 좁혀진다 — 다른 종류의
데이터를 넣으면 컴파일이 막힌다.

`target` 이 잘못되면 알아보기 쉬운 한국어 오류를 던진다. 특히 `id` 를 잘못 적어
`document.getElementById()` 가 `null` 을 돌려준 경우 — 브라우저 콘솔을 잘 열지
않는 사용자를 겨냥해, «그 id 를 찾지 못한 것은 아닌지 보라» 는 안내까지 붙는다.

| 메서드 | 하는 일 |
|---|---|
| `update(next: UpdateFor<T>)` | `data`·`options` 중 준 것만 덮고 다시 그린다. 어긋나면 던지고 이전 상태를 지킨다 |
| `resize(width, height)` | 캔버스 픽셀 크기를 바꾸고 다시 그린다. 둘 다 0보다 커야 한다 |
| `toDataURL(options?: { scale?: number })` | PNG data URL |
| `download(filename?, options?: { scale?: number })` | 내려받기 (브라우저 전용) |
| `destroy()` | 캔버스를 흰 바탕으로 지우고 더는 그리지 못하게 한다 |

`update()`·`resize()` 는 `this` 를 돌려주므로 이어 쓸 수 있다. `chart.canvas` 로
넘겨준 캔버스 자체에도 접근할 수 있다.

### `CsatChart.ensureFonts(options?)`

`Noto Serif KR`·`Noto Sans KR` 을 확보한다. 준비되면 `true`, 못 받거나 Node 이면
`false` 를 돌려준다. **던지지 않는다.**

한 페이지에서 여러 번 불러도 실제 작업은 한 번뿐이다. 그래서 **차트를 만들기 전에,
가장 먼저** 부른다 — 나중 호출에 넘긴 옵션은 조용히 버려지고, 차트를 먼저 만들면
늦게 도착한 글꼴이 반영되지 않을 수 있다.

옵션은 셋이다. `href`(글꼴 CSS 주소), `families`(확인할 글꼴 이름), `timeoutMs`
(기본 5000). 교내망·오프라인이라 `href` 를 바꾼다면 **`families` 도 함께 바꾼다**
— `href` 를 그대로 둔 채 `families` 만 바꾸면 그 글꼴이 없어도 `true` 가 나온다.

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
값의 자료형이 다르면 무엇이었어야 하는지를, `type` 을 잘못 적었으면 가까운
후보를 댄다.

```
csat-chart: 알 수 없는 type "climat" — 혹시 "climate"?
csat-chart: type "pyramid" 의 data 에 ages 항목이 없습니다
csat-chart: type "climate" 의 data.months[0]: 객체여야 합니다 (지금 숫자)
```

마지막 예는 흔한 실수 하나를 잡는다 — 열두 달 자료를 `months: [1, 2, …, 12]`
처럼 숫자만 늘어놓은 배열로 적는 것. 배열이고 길이도 12라 겉모양만 보면
통과할 법하지만, 그 상태로 그리면 브라우저에서는 좌표가 어긋나 빈 그림이
나오고 Node 캔버스에서는 프로세스가 죽는다. 배열의 첫 원소까지 한 겹 더 보고
막는다.

### 상수

기호·눈금 순서를 정하는 상수 7개를 내보낸다 — `AGE_GROUPS`·`DOT_MARKER_ORDER`·
`LINE_MARKER_ORDER`·`LINE_STYLE_ORDER`·`MONTH_LABELS_EN`·`MONTH_LABELS_NUM`·
`LINE_DASH`. 모두 **얼려서** 내보낸다. 렌더러가 기본값으로 읽는 바로 그 객체라서,
얼지 않으면 `DOT_MARKER_ORDER.reverse()` 한 번에 이후 모든 그림의 기호 배정이
조용히 어긋난다. `CHART_TYPES`(그래프 16종 목록)도 같은 이유로 따로 얼려서
내보낸다.

ESM/CJS 로 쓸 때는 각각 이름으로 가져온다.

```ts
import { CHART_TYPES, AGE_GROUPS } from 'csat-chart.js';
```

CDN 판에서는 전역 `CsatChart` 에도 같이 붙어 있어 `CsatChart.CHART_TYPES` 로도
쓸 수 있다 — UMD 번들이 전역 `CsatChart` 에 한 번 더 얹어 둔 것뿐이라, 번들러로
쓸 때 `CsatChart.CHART_TYPES` 라고 쓰면 `undefined` 다.

## 저수준 렌더러

`CsatChart` 를 거치지 않고 그래프 하나만 직접 그릴 수 있다. 모두 같은 꼴이다.

```ts
render○○(ctx, width, height, data, options): void
```

번들러를 쓴다면 렌더러 하나만 가져오는 편이 실제로 훨씬 가볍다. 실측(esbuild
0.27.7, `--bundle --minify --format=esm`, `csat-chart.js` 를 패키지로 설치한
상태 기준):

| 무엇을 가져오나 | 크기 |
|---|---|
| 라이브러리 전부 | 95.9 KB |
| `CsatChart` 만 | 94.6 KB |
| `renderClimateGraph` 만 | **10.0 KB** |

`CsatChart` 는 `type` 을 문자열로 받아 그때그때 렌더러를 고르므로 16종을 전부
붙들고 있어야 한다. 기후 그래프 하나만 필요한 앱이라면 저수준 렌더러를 직접
부르는 편이 아홉 배 가볍다. CDN 으로 쓰면 어차피 한 벌을 통째로 받으므로 이
이야기는 해당하지 않는다.

저수준 렌더러는 번들 크기 말고 다른 이유로도 쓴다 — `CsatChart` 의 수명주기
(캔버스 자동 크기 보정, 글꼴이 늦게 도착했을 때 다시 그리기)가 필요 없을 때다.
위 [Node.js 에서 PNG 뽑기](#nodejs-에서-png-뽑기)가 그런 경우다.

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
