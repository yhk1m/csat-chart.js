# csat-chart.js — AI 참고 문서

이 문서는 언어 모델이 읽도록 쓴 것이다. **이 라이브러리는 2026년에 만들어졌고
어떤 모델의 학습 데이터에도 없다.** `csat-chart.js` 로 그래프를 그려 달라는
요청을 받으면, 사전 지식이나 다른 차트 라이브러리(Chart.js, D3 등)의 API를
유추해서 쓰지 말고 이 문서에 적힌 이름·모양을 그대로 따른다. 이 문서에 없는
API는 존재를 가정하지 않는다.

- 저장소: https://github.com/yhk1m/csat-chart.js (branch `master`, v1.5.0)
- 라이브 데모: https://yhk1m.github.io/csat-chart.js/
- 라이선스: MIT, 런타임 의존성 0

## 1. 최소 동작 코드

### CDN

npm에 발행되어 있으므로 jsdelivr·unpkg가 그대로 서빙한다. 응답 코드 200과
로컬 빌드와의 해시 일치를 확인했다.

```html
<script src="https://cdn.jsdelivr.net/npm/csat-chart.js@1/dist/csat-chart.umd.min.js"></script>
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

`@1`은 1.x 안에서 가장 새 판을 가리킨다 — 고친 것이 따라오고, 판이 2로 올라가도
남의 프로그램이 갑자기 바뀌지 않는다. 한 판에 못 박으려면 `@1.2.0`처럼 적는다.

`https://yhk1m.github.io/csat-chart.js/lib/csat-chart.umd.min.js`도 여전히 산다.
그쪽은 `master`의 최신 빌드를 버전 고정 없이 서빙하므로, 아직 발행하지 않은
상태를 시험할 때만 쓴다.

### npm

```bash
npm install csat-chart.js
```

```ts
import { CsatChart, createDefaultClimateData } from 'csat-chart.js';

await CsatChart.ensureFonts();
const chart = new CsatChart(document.querySelector('canvas'), {
  type: 'climate',
  data: createDefaultClimateData(),
  options: { title: '서울의 기후', source: '기상청' },
});
```

Node.js에서 캔버스 없이 PNG만 뽑을 때는 저수준 렌더러를 쓴다 — 9절 참고.

## 2. 어기면 안 되는 규칙

이 다섯 가지를 어기면 빈 캔버스, 겹친 글자, 또는 던져지는 예외가 나온다.

1. **`ensureFonts()`를 생성자 호출 전에 `await`한다.** 안 하면 대체 글꼴로
   그려진다 — 던지지 않고, 겉보기엔 "멀쩡하게" 그려지므로 실수를 알아채기
   어렵다. 시험지 서체(명조)가 필요 없다면 생략해도 동작은 한다.
2. **데이터는 항상 `createDefault○○Data()`로 시작해서 필요한 칸만 덮어쓴다.**
   객체 리터럴을 처음부터 새로 쓰지 않는다 — 어느 필드가 필수인지, 배열
   길이가 고정인지(예: `climate.months`는 정확히 12개) 외워서 맞히는 대신
   기본값이 이미 정답 모양이다.
3. **여섯 종류는 기본값이 전부 0(또는 빈 값)이라, 고치지 않고 그리면 축만
   있고 자료가 없는 빈 그림이 나온다** — `climate`·`deviation-a`·
   `deviation-b`·`hythergraph`·`pyramid`·`radar`. 예외를 던지지 않으므로
   반드시 값을 채워야 한다는 것을 스스로 기억해야 한다.
4. **캔버스는 800×600을 기본으로 하고, 대략 500×400보다 작으면 제목·눈금·
   각주가 겹쳐 읽을 수 없다.** 여백과 글자 크기가 절대 픽셀이기 때문이다.
   `<canvas id="c"></canvas>`처럼 크기를 안 적으면 라이브러리가 자동으로
   800×600을 채워 주지만, `<canvas width="300" height="150">`처럼 작은
   크기를 명시하면 그 크기를 그대로 존중해 겹친 그림이 나온다.
5. **`options`는 매번 새로 만들지 말고 필요한 필드만 준다.** `fontSize`처럼
   중첩 객체인 필드도 한 항목만 줘도 된다 — 나머지 세 값은 유지된다
   (`{ fontSize: { title: 44 } }`). `footnotes`는 배열이고, 빈 문자열
   `''`은 무시된다.

## 3. 그래프 17종

아래 표는 빌드된 라이브러리(`dist/csat-chart.cjs`)를 직접 불러와
`createDefault○○Data()`의 실제 반환값을 찍어서 만들었다 — 손으로 옮겨 적지
않았다. **저수준 렌더러 이름 중 넷(`renderDataTable`·`renderHythergraph`·
`renderMatrixTable`·`renderRadarChart`)은 `render○○Graph` 규칙을 따르지
않는다(`renderEconPlane`도 `Graph`가 안 붙는다).** 규칙대로 이름을
추측하면(`renderDataTableGraph`·`renderEconPlaneGraph` 등) `undefined`가
된다 — 반드시 아래 정확한 이름을 쓴다.

| `type` | 그리는 것 | 기본 데이터 팩토리 | 저수준 렌더러 |
|---|---|---|---|
| `absbar` | 범주별 값을 절댓값 막대로 비교 (세로/가로, 누적 가능) | `createDefaultAbsBarData` | `renderAbsBarGraph` |
| `category-dot` | 범주별 값을 막대 대신 점으로 찍음 | `createDefaultCategoryDotData` | `renderCategoryDotGraph` |
| `climate` | 기후 그래프 — 기온 꺾은선 + 강수량 막대, 좌우 이중축 | `createDefaultClimateData` | `renderClimateGraph` |
| `cube` | 정육면체 좌표에 점을 찍어 세 변수의 상대 위치를 비교 | `createDefaultCubeData` | `renderCubeGraph` |
| `data-table` | 항목×지역 수치 표 (그래프 아님) | `createDefaultDataTableData` | `renderDataTable` |
| `deviation-a` | 기준값 대비 월별 기온·강수량 편차 (시계열, climate와 같은 틀) | `createDefaultDeviationAData` | `renderDeviationAGraph` |
| `deviation-b` | 기준값 대비 지역별 기온·강수량 편차 (사분면 비교형) | `createDefaultDeviationBData` | `renderDeviationBGraph` |
| `econ-plane` | 수능 «경제» 좌표평면 — 직선·점·유도선·화살표·계열. 이름을 선 끝에 단다 | `createDefaultEconPlaneData` | `renderEconPlane` |
| `hythergraph` | 월별 기온-강수량을 이어 그리는 하이서그래프(폐곡선) | `createDefaultHythergraphData` | `renderHythergraph` |
| `line` | 꺾은선 그래프 (선 종류·기호로 계열 구분) | `createDefaultLineData` | `renderLineGraph` |
| `matrix-table` | 지역 간 짝별 값(예: 거리)을 계단식 삼각형 표로 표시 (그래프 아님) | `createDefaultMatrixTableData` | `renderMatrixTable` |
| `pyramid` | 인구 피라미드 (연령대별 남·여 좌우 대칭 막대) | `createDefaultPyramidData` | `renderPyramidGraph` |
| `radar` | 방사형(레이더) 그래프 | `createDefaultRadarData` | `renderRadarChart` |
| `scatter` | 산점도·버블 차트 (일반 모드 또는 편차 사분면 모드) | `createDefaultScatterData` | `renderScatterGraph` |
| `stacked` | 100% 누적 막대 또는 원 그래프 | `createDefaultStackedData` | `renderStackedGraph` |
| `ternary` | 삼각 그래프 (세 성분의 비율) | `createDefaultTernaryData` | `renderTernaryGraph` |
| `treemap` | 트리맵 (사각형을 값 비율대로 분할) | `createDefaultTreemapData` | `renderTreemapGraph` |

### 각 타입의 필드

형식은 `필드명: 종류 (실제 기본값 또는 배열 원소 모양)`. 배열 길이가 고정으로
검증되는 필드는 `*`를 붙였다 — 다른 길이를 주면 `CsatChartError`가 던져진다
(7절). `range`류 필드는 모두 `{ min, max, auto }` 또는 `{ max, auto }` 모양이며
`auto: true`면 값에 맞춰 자동으로 잡히고, `auto: false`로 두면 `min`/`max`를
그대로 눈금 범위로 쓴다.

**absbar** — 바꿔볼 만한 필드: `categories`, `seriesLabels`, `unit`
- `barDirection`: `'vertical' | 'horizontal'` (기본 `'vertical'`)
- `stacked`: boolean (기본 `false`)
- `categories`: 배열(3) of `{ label: string, values: number[] }`
- `seriesLabels`: 배열(2) of string
- `unit`: string (기본 `''`)
- `yRange`: `{ min: 0, max: 100, auto: true }`

**category-dot** — 바꿔볼 만한 필드: `categories`, `seriesLabels`
- `categories`: 배열(4) of `{ label: string, values: number[] }`
- `seriesLabels`: 배열(1) of string
- `unit`: string
- `dotRadius`: number (기본 `6`)
- `yRange`: `{ min: 0, max: 100, auto: true }`

**climate** — 기본값이 전부 0(규칙 3). 바꿔볼 만한 필드: `months`
- `months`\*: 배열(12) of `{ temp: number, precip: number }`
- `monthInterval`: `12 | 4 | 2` (기본 `12`)
- `tempLabel`: string (기본 `'(°C)'`)
- `precipLabel`: string (기본 `'(mm)'`)
- `tempRange`: `{ min: -10, max: 40, auto: true }`
- `precipRange`: `{ min: 0, max: 400, auto: true }`

**cube** — 좌표는 0~1 범위. 바꿔볼 만한 필드: `points`, 각 축의 `name`/`lowLabel`/`highLabel`
- `points`: 배열(3) of `{ x: number, y: number, z: number, label: string, labelDx: number, labelDy: number }`
- `xAxis`, `yAxis`, `zAxis`: 각각 `{ name: string, lowLabel: string, highLabel: string, lowOffset: {x,y}, highOffset: {x,y} }`

**data-table** — 바꿔볼 만한 필드: `columns`, `rows`
- `cornerLabel`: string (기본 `'구분'`)
- `columns`: 배열(4) of string
- `rows`: 배열(3) of `{ label: string, unit?: string, values: number[] }`

**deviation-a** — 기본값이 전부 0(규칙 3). `baseMonths`가 기준값, `months`가
실제값이고 편차는 렌더러가 계산한다. 바꿔볼 만한 필드: `baseMonths`, `months`
- `baseMonths`\*: 배열(12) of `{ temp: number, precip: number }`
- `months`\*: 배열(12) of `{ temp: number, precip: number }`
- `monthInterval`: `12 | 4 | 2` (기본 `12`)
- `tempLabel`: string (기본 `'(°C)'`)
- `precipLabel`: string (기본 `'(mm)'`)
- `tempRange`: `{ min: -10, max: 10, auto: true }`
- `precipRange`: `{ min: -200, max: 200, auto: true }`

**deviation-b** — 기본값이 전부 0(규칙 3). 바꿔볼 만한 필드: `baseTemp`, `basePrecip`, `regions`
- `baseTemp`: number (기본 `0`)
- `basePrecip`: number (기본 `0`)
- `regions`: 배열(3) of `{ label: string, precip: number, temp: number }`
- `precipDiffLabel`: string (기본 `'강수량 차이'`)
- `tempDiffLabel`: string (기본 `'기온 차이'`)
- `precipUnit`: string (기본 `'(mm)'`)
- `tempUnit`: string (기본 `'(°C)'`)
- `precipRange`: `{ min: -200, max: 200, auto: true }`
- `tempRange`: `{ min: -10, max: 10, auto: true }`

**econ-plane** — 유일한 비지리 종류. 바꿔볼 만한 필드: `lines`, `points`, `arrows`, `series`, `xAxis`, `yAxis`
- `quadrants`: `'first' | 'all'` (기본 `'first'`) — `'all'`이면 네 사분면, 축 양끝에 화살촉
- `xAxis`·`yAxis`: `{ label: string, min: number, max: number, ticks: number[], broken: boolean, brokenAt?: number }` — `brokenAt` 은 생략 기호 `≈` 를 놓을 **축의 값**. 미지정이면 원점과 첫 눈금의 한가운데
- `grid`: boolean (기본 `true`) — 눈금 자리마다 점선 격자
- `dash`: `'dashed' | 'dotted'` (기본 `'dashed'`) — 격자·유도선의 점선 모양
- `lines`: 배열(2) of `{ label: string, from: {x,y}, to: {x,y}, labelAt: 'from'|'to' }`
- `points`: 배열(1) of `{ x, y, label: string, labelPos: 나침반 8방향, guide: 'none'|'to-x'|'to-y'|'both'|'cross', dot: boolean }`
- `arrows`: 배열(0) of `{ from: {x,y}, to: {x,y}, offset: number, shorten: number, label: string, labelPos: 나침반 8방향 }`

기본 데이터에 **없는** 선택 필드가 다섯 더 있다(1.5.0). 적지 않으면 없는 것처럼
그려지고, 검증기도 요구하지 않는다 — 기본 데이터의 키만 필수로 보기 때문이다.
- `lines[].dashed`: boolean — 그 직선을 파선으로. 흑백 시험지에서 선 종류가 뜻을 나른다
- `xAxis.tickLabels`·`yAxis.tickLabels`: `string[]` — 눈금 자리에 숫자 대신 적을 글자.
  `ticks`와 자리끼리 짝을 이룬다. 자리는 언제나 `ticks`가 정한다
- `series`: 배열 of `{ label: string, points: {x,y}[], dashed: boolean, marker: 'circle'|'square', hollow: boolean }`
- `legend`: `'top-right'|'top-left'|'bottom-right'|'bottom-left'` — 계열 범례 상자를 놓을 모서리.
  적지 않으면 범례를 그리지 않는다
- `seriesGuides`: boolean — 계열 꼭짓점에서 가로축으로 내리는 파선

이 종류만 아는 것 넷:
1. **이름을 선 끝에 단다.** `showLegend`·`legendPosition`·`showDataLabels`를
   아예 읽지 않는다. 선 이름은 `lines[].label`로 주고, 그 선의 `labelAt` 쪽 끝에
   붙는다. 범례 상자는 계열(`series`)을 쓸 때만 있고, 옵션이 아니라 자료가
   부른다(`legend`) — `showLegend`로는 켜지지도 꺼지지도 않는다.
2. **`ticks`는 «값» 배열이다.** 자는 언제나 고르고 눈금만 띄엄띄엄 찍힌다 —
   `[0, 10, 20, 50]`이면 50이 20의 세 배 거리에 선다. 간격을 주는 것이 아니다.
   눈금 표시선(축에 붙는 작은 선분)은 그리지 않는다.
3. **시작점이 넷이다.** `createDefaultEconPlaneData()`(= `createSupplyDemandData()`,
   수요·공급 교차)·`createAdAsData()`(총수요·총공급)·`createPointShiftData()`
   (점 + 유도선 + 화살표). 그리려는 그림에 가까운 것에서 시작한다 — 직선
   좌표를 손으로 다시 치지 않는다.
4. **`points[].dot: false`**면 점 없이 유도선만 남는다. 문항이 쓰는 값마다
   파선을 내리되 교점에 점은 찍지 않는 그림이 실제로 있다.
5. **이름에 아래 첨자를 쓸 수 있다.** 밑줄 뒤에 이어지는 영문자·숫자가 작은
   글자로 내려앉는다 — `'D_1'` → D₁, `'P_2'` → P₂. 선 이름·점 이름·화살표
   이름·축 이름·눈금 이름표·계열 이름이 모두 그렇다. 규칙이 «밑줄 + 영숫자»로
   좁혀져 있어 한글 앞의 밑줄(`'강원_춘천'`)은 밑줄 그대로 남는다. 제목·출처·
   각주(`options`)에는 통하지 않는다.
6. **세로축 이름은 여러 줄로 앉는다.** 리터럴 `
`(역슬래시 + n)이나 진짜
   줄바꿈으로 나눈다 — `'GDP
(억 달러)'`. 산점도 `yLabel`과 같은 규약이고,
   여러 줄이면 묶음 가운데 맞춤이 된다. 가로축 이름은 한 줄이다.

**hythergraph** — 기본값이 전부 0(규칙 3). 바꿔볼 만한 필드: `series`
- `series`: 배열(1) of `{ label: string, months: 배열(12) of {temp, precip} }`
- `mode`: `'loop' | 'points' | 'both'` (기본 `'both'`)
- `monthLabelStyle`: `'number' | 'english'` (기본 `'number'`)
- `xUnit`: string (기본 `'(°C)'`)
- `yUnit`: string (기본 `'(mm)'`)
- `xRange`: `{ min: -10, max: 40, auto: true }`
- `yRange`: `{ min: 0, max: 400, auto: true }`

**line** — 바꿔볼 만한 필드: `series`, `xLabels`
- `series`: 배열(1) of `{ label: string, values: number[] }` (실제 필드는 `(number|null)[]`도 허용 — `null`은 선이 끊김을 뜻함)
- `xLabels`: 배열(12) of string — **빈 문자열이면 그 자리의 이름·세로 격자를 생략한다** (5년 자료에 10년 라벨)
- `xUnit`: string (기본 `'(월)'`)
- `yUnit`: string (기본 `''`)
- `yRange`: `{ min: 0, max: 100, auto: true }`
- `labelPlacement`: `'lineEnd' | 'legend' | 'leader'` (기본 `'lineEnd'`). `'leader'`는 유도선 — 이름을 선 근처에 쓰고 짧은 선으로 가리킨다
- `showMarkers`: boolean (기본 `true`)
- 선택 필드(1.6.0): `series[].stroke`(선 색, 기본 검정 — 시험지는 `'#999'` 회색으로 한 계열을 가른다), `series[].lineWidth`(px, 기본 2), `series[].leader`(`{ at, dx, dy }` — 가리킬 점 번호와 라벨 오프셋, 기본 가운데 점에서 `+20, -30`), `xGrid`(세로 점선 격자), `gridColor`(격자 색, 기본 `'#ccc'` — 시험지는 `'#555'`), `gridWidth`(격자 굵기 px, 기본 0.5 — 시험지는 1, 1.6.1)

**matrix-table** — `values[i][j]`는 `j < i`인 칸만 쓰인다(아래 삼각형).
바꿔볼 만한 필드: `names`, `values`
- `names`: 배열(3) of string
- `values`: 배열(3) of 배열(숫자, 정사각 행렬 형태)
- `unit`: string (기본 `'(단위 : km)'`)

**pyramid** — 기본값이 전부 0(규칙 3). 바꿔볼 만한 필드: `ages`
- `ages`\*: 배열(17) of `{ male: number, female: number }` (연령대는 `AGE_GROUPS` 상수 순서: `'0-4'`…`'80+'`)
- `unit`: `'count' | 'percent'` (기본 `'percent'`)
- `maleLabel`: string (기본 `'남'`)
- `femaleLabel`: string (기본 `'여'`)
- `axisLabel`: string (기본 `'(%)'`)
- `range`: `{ max: 10, auto: true }`
- `ageLabelSide`: `'left' | 'right' | 'center'` (기본 `'center'`)

**radar** — 기본값이 전부 0(규칙 3). 바꿔볼 만한 필드: `series`, `axisLabels`
- `axisLabels`: 배열(5) of string
- `series`: 배열(1) of `{ label: string, values: number[] }`
- `maxValue`: number (기본 `100`)
- `autoMax`: boolean (기본 `true`)
- `gridSteps`: number (기본 `5`)
- `showFill`: boolean (기본 `false`)

**scatter** — `quadrantLabels`는 길이 4로 고정 검증되지만 **어떤 렌더러도
지금 이 값을 읽지 않는다**(죽은 필드 — 이식 원본에 있던 것을 그대로 둔 것).
바꿔볼 만한 필드: `points`, `xLabel`, `yLabel`
- `mode`: `'normal' | 'deviation'` (기본 `'normal'`)
- `bubbleLegendPosition`: `'top-left'|'top-right'|'bottom-left'|'bottom-right'|'outside-right'` (기본 `'bottom-right'`)
- `points`: 배열(4) of `{ x: number, y: number, size: number, label: string }` (`size: 0`이면 버블 대신 그냥 점)
- `xLabel`: string (기본 `'X축'`)
- `yLabel`: string (기본 `'Y축'`)
- `xUnit`: string, `yUnit`: string (기본 `''`)
- `xRange`, `yRange`: `{ min: 0, max: 100, auto: true }`
- `showBubble`: boolean (기본 `true`)
- `bubbleScale`: number (기본 `30`, 버블 최대 반지름 px)
- `quadrantLabels`\*: 배열(4) of string (죽은 필드, 위 설명 참고)

**stacked** — 바꿔볼 만한 필드: `categories`, `seriesLabels`, `displayMode`
- `displayMode`: `'bar' | 'pie'` (기본 `'bar'`)
- `barDirection`: `'vertical' | 'horizontal'` (기본 `'vertical'`)
- `categories`: 배열(3) of `{ label: string, values: number[] }`
- `seriesLabels`: 배열(3) of string
- `unit`: string (기본 `'(%)'`)

**ternary** — 바꿔볼 만한 필드: `points`, `axisLabels`
- `points`: 배열(1) of `{ a: number, b: number, c: number, label: string }`
- `axisLabels`\*: 튜플(3) of string (기본 `['A','B','C']`)
- `gridInterval`: `10 | 20 | 25` (기본 `20`)

**treemap** — 바꿔볼 만한 필드: `cells`
- `cells`: 배열(4) of `{ label: string, value: number }` (넓이는 `value`의 비율대로 나뉜다. 내림차순으로 주면 칸이 정사각형에 가깝게 나온다)

각 타입 데이터 인터페이스에는 위에 없는 **선택적(optional) 필드**도 있다 —
시험지의 세부 배치를 재현하는 고급 옵션들이다(예: `absbar.zeroBaseline`,
`scatter.examFrame`, `pyramid.sexFills`). 검증기는 이 필드들을 요구하지
않으므로 빠뜨려도 오류가 나지 않고, 완전한 목록은 `dist/csat-chart.d.ts`의
타입 선언에 있다. 이 문서는 **항상 있는** 필드만 표로 만들었다 — 없어도
그림이 나오는 필드까지 외워서 쓸 필요는 없다.

## 4. 완결 예제 (직접 실행해 확인함)

아래는 Node.js에서 `@napi-rs/canvas`로 실제로 실행해 PNG를 뽑아 확인한
코드다(브라우저에서는 `document.querySelector('canvas')`나 `'c'`처럼 캔버스
요소/아이디를 첫 인자로 쓰면 된다 — 나머지는 동일). 저장소를 클론해 시험한다면
`require('csat-chart.js')` 자리에 `require('./dist/csat-chart.cjs')`를 쓴다.
이 예제의 검증도 그렇게 했다.

```js
const { createCanvas } = require('@napi-rs/canvas');
const { CsatChart, createDefaultClimateData } = require('csat-chart.js');

async function main() {
  const canvas = createCanvas(800, 600);
  await CsatChart.ensureFonts(); // Node에는 document가 없어 즉시 false — 예외 없음

  const data = createDefaultClimateData();
  // 열두 달, 달마다 { temp, precip } 하나씩 — 열두 개를 다 채운다 (서울 평년값)
  data.months = [
    { temp: -1.9, precip: 16.8 }, { temp: 0.7, precip: 28.2 },
    { temp: 6.1, precip: 36.9 },  { temp: 12.6, precip: 72.9 },
    { temp: 18.2, precip: 103.6 },{ temp: 22.7, precip: 129.5 },
    { temp: 25.3, precip: 414.4 },{ temp: 26.1, precip: 348.2 },
    { temp: 21.2, precip: 141.5 },{ temp: 14.8, precip: 52.2 },
    { temp: 7.2, precip: 51.1 },  { temp: 0.4, precip: 22.6 },
  ];

  const chart = new CsatChart(canvas, {
    type: 'climate',
    data,
    options: {
      title: '서울의 기후',
      source: '기상청',
      footnotes: ['1991~2020년의 평년값임.'],
    },
  });

  require('node:fs').writeFileSync('out.png', canvas.toBuffer('image/png'));
}

main();
```

실행 결과: 48,037개의 흰색이 아닌 픽셀이 찍힌 800×600 PNG가 나왔다 — 왼쪽
축(°C)에 꺾은선(기온), 오른쪽 축(mm)에 회색 막대(강수량), 아래에 범례와
각주·출처가 있는 정상적인 기후 그래프였다(육안 확인 완료). `ensureFonts()`가
Node에서 `false`를 돌려줘도 그림 자체는 대체 글꼴로 정상 렌더링된다.

## 5. `options`

`new CsatChart(target, { type, data, options })`의 `options`는 아래 14개
필드를 받는다(값은 실제 `createDefaultGraphOptions()` 반환값에서 확인). 준
것만 덮이고 나머지는 기본값을 쓴다.

| 필드 | 기본값 | 하는 일 |
|---|---|---|
| `title` | `''` | 제목 |
| `source` | `''` | 출처. 각주 위(또는 `sourceInline`이면 각주와 같은 줄)에 오른쪽 정렬 |
| `sourceLeft` | `undefined` | 출처 줄 왼쪽에 함께 적을 글(예: 연도). **`stacked`에서만 동작한다** — 다른 15종은 이 값을 아예 읽지 않는다 |
| `sourceInline` | `undefined` | 출처를 마지막 각주와 같은 줄 오른쪽 끝에 붙인다. **`scatter`·`econ-plane`·`line`에서만 동작한다** — 다른 14종은 읽지 않는다 |
| `footnotes` | `['']` | 각주 목록. `* `를 자동으로 붙인다. 빈 문자열은 무시 |
| `fontFamily` | `'serif'` | `'serif'`(명조) / `'sans'`(고딕) / `'custom'` |
| `customFont` | `''` | `fontFamily`가 `'custom'`일 때 쓸 글꼴 이름. **축 쪽만 바꾼다** — 제목·범례는 못 건드린다 |
| `fontStack` | `{}` | 글꼴 «자리»를 통째로 갈아 끼운다. `{ serif?, sans? }`. 아래 5.1 참고 |
| `fontSize` | `{ title: 36, axisLabel: 28, tick: 26, dataLabel: 22 }` | px 단위. 각주·출처는 `dataLabel`을 따름. 한 항목만 줘도 나머지는 유지됨 |
| `showDataLabels` | `false` | 막대·점 위에 값을 표시할지 (모든 렌더러가 지원하는 것은 아님) |
| `showLegend` | `true` | 범례 표시 여부 |
| `legendPosition` | `'bottom'` | `'bottom'` / `'right'` |
| `legendLabel1` | `''` | 두 계열 종류(`climate`·`deviation-a`·`deviation-b`·`pyramid`)의 첫 계열 범례 이름. 비우면 데이터가 준 이름을 씀. 나머지 12종은 이 필드를 읽지 않음 |
| `legendLabel2` | `''` | 위와 같은 종류의 둘째 계열 범례 이름 |

`fontSize`는 부분 지정이 된다:

```js
chart.update({ options: { fontSize: { title: 44 } } });
```

### 5.1 `fontStack` — 글꼴 갈아 끼우기 (1.3.0)

시험지 그림은 자리마다 서체가 갈린다. **명조 자리**는 축 이름·눈금·자료값,
**고딕 자리**는 제목·출처·각주·범례다. 이 짝은 실제 시험지가 그런 것이므로
기본값을 바꾸지 않는다. `fontStack`은 짝을 그대로 두고 **각 자리의 글꼴만**
바꾼다.

```js
options: {
  fontStack: {
    serif: "'함초롬바탕', serif",      // 축 이름·눈금·자료값
    sans: "'함초롬돋움', sans-serif",  // 제목·출처·각주·범례
  },
}
```

값은 글꼴 «이름»이 아니라 **CSS 글꼴 목록**이다. 총칭 글꼴(`serif`·`sans-serif`)을
뒤에 붙여, 그 이름이 없는 컴퓨터에서도 명조/고딕 계열로 떨어지게 한다.

- 두 키 모두 선택이다. 적지 않은 자리는 기본값(`'Noto Serif KR', 'NanumMyeongjo',
  serif` / `'Noto Sans KR', sans-serif`) 그대로다.
- `update()`에서 **얕게 덮이지 않는다.** `fontSize`와 같다 — 한 자리만 다시 줘도
  나머지 자리는 남는다. 지우려면 그 키에 `undefined`나 `''`를 준다.
- `fontFamily`와 층이 다르다. `fontFamily`는 축이 **어느 자리**를 쓸지 고르고,
  `fontStack`은 그 자리가 **무슨 글꼴**인지 정한다. 둘은 겹치지 않는다.
- `customFont`의 동작은 1.2.0과 똑같다. 바꾸지 않았다.

**이미 깔린 글꼴을 쓰는 것이 기본 경로다.** 한컴오피스가 있는 컴퓨터에는
함초롬바탕·함초롬돋움이 이미 있으므로 내려받을 것도, 호스팅할 것도, 라이선스를
살필 것도 없다. 대신 보는 사람의 컴퓨터에 그 글꼴이 없으면 브라우저가 **말없이**
대체 글꼴로 떨어뜨린다 — 예외도 경고도 없다.

누구에게나 같게 보여야 해서 웹폰트가 필요하면, `ensureFonts()`의 `href`·
`families`로 **먼저 받아 둔 뒤에** 그린다. 그 두 옵션이 정확히 이 짝이다.

```js
await CsatChart.ensureFonts({
  href: 'https://cdn.example.com/my-font.css',
  families: ['MyFont Serif', 'MyFont Sans'],
});
new CsatChart('c', {
  type: 'climate',
  data: CsatChart.createDefaultClimateData(),
  options: { fontStack: { serif: "'MyFont Serif', serif", sans: "'MyFont Sans', sans-serif" } },
});
```

## 6. 오류 읽는 법

데이터나 인자가 잘못되면 `CsatChartError`(내장 `Error`의 서브클래스)를
던진다. **`instanceof CsatChartError`로 가려내지 말고 `err.name ===
'CsatChartError'`로 가려낸다** — 같은 페이지에 ESM 판과 CDN(UMD) 판이 함께
있으면 클래스가 두 벌이 되어 `instanceof`가 조용히 `false`가 될 수 있다.

```js
try {
  new CsatChart(canvas, { type, data });
} catch (err) {
  if (err.name === 'CsatChartError') {
    console.log(err.message); // 한국어, 무엇이 왜 잘못됐는지 적혀 있다
  }
}
```

메시지는 항상 `csat-chart: `로 시작한다. 실제로 던지게 해서 글자 그대로
확인한 예시 셋:

```
csat-chart: 알 수 없는 type "climat" — 혹시 "climate"?
csat-chart: type "pyramid" 의 data 에 ages 항목이 없습니다
csat-chart: type "climate" 의 data.months[0]: 객체여야 합니다 (지금 숫자)
```

- 첫째: `type`을 잘못 적으면 편집 거리(Levenshtein) 3 이내의 가장 가까운
  이름을 제안한다. 못 찾으면 대신 17종 전체 목록을 보여준다.
- 둘째: 기본 데이터에 있는 키가 `data`에 없으면 어떤 키인지 짚어 준다.
- 셋째: 배열의 **원소** 자료형까지 검사한다 — `months: [1,2,...,12]`처럼
  달마다 숫자 하나만 넣는 실수(배열이고 길이도 12라 겉보기엔 통과할 법함)를
  잡아낸다. 그대로 그리면 브라우저에서는 좌표가 어긋나 빈 그림이, Node
  캔버스에서는 네이티브 프로세스 크래시가 나기 때문에 미리 막는다.

그 밖에 같은 형태로 던지는 상황: 길이 고정 배열의 길이가 다름
(`data.months: 12개여야 합니다 (지금 6개)`), `config` 자체가 객체가 아님,
`config.options`가 객체가 아님, `resize(0,0)`처럼 0 이하 크기, `toDataURL({
scale: -1 })`처럼 0 이하이거나 유한하지 않은 `scale`, 이미 `destroy()`된
차트에 `update()`, 브라우저 밖에서 캔버스 id 문자열 사용, `getElementById`가
`null`을 돌려준 잘못된 id. 전부 `csat-chart: `로 시작하는 한국어 문장이고
`err.name === 'CsatChartError'`로 잡힌다.

## 7. 알려진 한계 — 고치려 하지 말 것

- **`sourceLeft`는 `stacked`와 `econ-plane`에서만, `sourceInline`은 `scatter`·
  `econ-plane`·`line`에서만 동작한다.** 나머지에 이 옵션을 줘도 조용히 무시된다(예외
  없음) — 버그가 아니라 이식 원본의 범위다.
- **`econ-plane`의 «가로축» 이름은 한 줄이다.** 세로축은 1.5.0부터 리터럴
  `
`으로 두 줄이 되지만(`'GDP
(억 달러)'`), 가로축은 화살촉 오른쪽에 한 줄로
  눕는다. 실물에서 두 줄로 앉는 것이 언제나 세로축이라 그렇다.
- **`econ-plane`은 캔버스 한 장에 그림 한 장을 그린다.** 두 그림을 나란히 놓는
  문항(2026학년도 수능 경제 5번, 2027학년도 6월 3번)은 캔버스 둘에 각각 그리고
  배치는 부르는 쪽이 한다. `panels` 같은 필드는 없다 — 있다고 가정하지 말 것.
  실물도 판마다 제목이 따로 붙어 있으므로 `options.title`에 〈X재 시장〉·
  〈Y재 시장〉을 적으면 같은 그림이 된다.
- **`pyramid`의 `sexFills`는 막대 색만 바꾸고 범례 색은 안 바꾼다.**
  범례 스와치는 `renderPyramidGraph` 안에 `#666`/`#BBB`로 하드코딩돼 있어,
  `data.sexFills`로 막대를 파란색/빨간색으로 바꿔도 범례 네모는 여전히
  회색으로 나온다 — 막대와 범례 색이 어긋나 보이는 게 정상이다.
- **화면 캔버스는 `devicePixelRatio`를 다루지 않는다.** 항상 1배로 그려서
  레티나 디스플레이에서는 살짝 흐릿하다. 인쇄·고해상도가 필요하면
  `chart.toDataURL({ scale: 2 })`(또는 `download(filename, { scale: 2 })`)를
  쓴다 — `scale`은 **글자·선까지 함께 키우는** 배율이다. `resize(1600,1200)`과
  다르다: `resize`는 캔버스만 키워서 글자가 상대적으로 작아진 다른 그림이
  되고, `toDataURL({ scale })`은 화면과 같은 구도로 해상도만 올린다.
- **`fontStack`에 없는 글꼴 이름을 줘도 아무도 알려 주지 않는다.** 브라우저가
  조용히 대체 글꼴로 그린다. 라이브러리는 글꼴 «이름»을 검사하지 않는다 — 검사할
  방법이 캔버스 폭을 재 보는 것뿐이라 그 판단을 라이브러리에 두지 않았다.
  데모(`docs/index.html`)는 그 폭 비교를 화면 쪽에서 하고 있다.
- **`scatter.quadrantLabels`는 죽은 필드다.** 타입에 4-튜플로 박혀 있고
  검증기도 길이 4를 요구하지만, 어떤 렌더러도 이 값을 읽지 않는다.

## 8. 저수준 경로

`CsatChart` 파사드를 거치지 않고 렌더러 17종을 직접 부를 수 있다. 모두 같은
시그니처다:

```ts
function render○○(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: XxxGraphData,   // 3절 표의 그 타입
  options: GraphOptions // 5절의 그 옵션, createDefaultGraphOptions()로 기본값
): void
```

이름은 3절 표의 "저수준 렌더러" 열을 그대로 쓴다(다섯은 `render○○Graph`
규칙을 안 따르니 주의). `CsatChart`가 자동으로 해 주는 일 — 캔버스 크기
보정, 데이터 모양 검증, 글꼴 도착 후 다시 그리기 — 은 저수준 렌더러를 직접
부르면 전혀 일어나지 않는다.

**`installRoundRectPolyfill()`을 직접 불러야 하는 경우.** 여덟 종류
(`absbar`·`climate`·`deviation-a`·`deviation-b`·`hythergraph`·`pyramid`·
`scatter`·`stacked`)는 범례 박스를 그릴 때 `ctx.roundRect()`를 쓰는데, 이
메서드는 Chrome 99·Firefox 112·Safari 16.4(iOS 16.4) 미만에는 없다. `new
CsatChart(...)`를 쓰면 생성자가 첫 렌더 전에 자동으로 폴리필을 심어 주지만,
저수준 렌더러를 파사드 없이 직접 부른다면 그리기 전에
`installRoundRectPolyfill()`을 스스로 한 번 불러야 한다 — 안 그러면 그 아래
버전에서 `ctx.roundRect is not a function`으로 던져지고 흰 캔버스만 남는다.

Node.js에서 캔버스 구현체 없이 이 패키지를 쓸 수는 없다 — `@napi-rs/canvas`
같은 별도 패키지가 필요하다(이 라이브러리의 의존성이 아니다). 아래 코드도
직접 실행해 800×600 캔버스에 19,036개의 흰색이 아닌 픽셀(축만 있는 빈 틀 —
`createDefaultClimateData()`는 규칙 3에 따라 전부 0이다)이 찍히는 것을
확인했다. `require('csat-chart.js')`는 발행 후 기준이다 — 지금 시험해
보려면 `require('./dist/csat-chart.cjs')`를 쓴다.

```js
const { createCanvas } = require('@napi-rs/canvas');
const { renderClimateGraph, createDefaultClimateData, createDefaultGraphOptions } = require('csat-chart.js');

const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');
renderClimateGraph(ctx, 800, 600, createDefaultClimateData(), createDefaultGraphOptions());
```
