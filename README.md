# csat-chart.js

수능·모의고사 시험지 양식의 그래프를 Canvas 2D로 그리는 라이브러리입니다.
축·범례·각주·출처의 배치, 명조 글꼴, 흑백 인쇄를 전제한 해칭 패턴까지
시험지 관습을 그대로 따릅니다. 지리 열여섯 종으로 시작했고, 1.4.0 에서 경제
좌표평면이 더해져 열일곱 종입니다. **런타임 의존성이 없습니다.**

- npm: https://www.npmjs.com/package/csat-chart.js
- 데모: https://yhk1m.github.io/csat-chart.js/
- AI 참고 문서: [docs/ai-reference.md](docs/ai-reference.md) — 이 라이브러리를 모르는 AI 어시스턴트에게 붙여넣는 용도
- 라이선스: MIT

## 시작하기

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

`@1` 은 1.x 안에서 가장 새 판을 가리킵니다 — 고친 것이 자동으로 따라오고, 판이
2 로 올라가도 갑자기 바뀌지 않습니다. 한 판에 못 박으려면 `@1.2.0` 처럼 적으세요.

`ensureFonts()` 를 부르지 않으면 대체 글꼴로 그려져 시험지 양식이 재현되지 않습니다.
던지지 않습니다 — 글꼴을 못 받아도, 제한 시간(기본 5초)을 넘겨도 조용히 `false` 로
끝납니다.

`<canvas id="c"></canvas>` 처럼 크기를 적지 않으면 800×600 으로 채웁니다. HTML
기본값인 300×150 으로 그리면 여백·글자 크기가 절대 픽셀이라 제목·눈금·각주가
한 덩어리로 겹칩니다. 크기를 직접 적었다면 그 크기를 그대로 씁니다. 다만 대략
500×400 보다 작으면 글자가 겹쳐 읽기 어려워집니다.

## 내 자료 넣기

`createDefault○○Data()` 가 주는 것은 **뼈대**입니다. 기후·인구 피라미드처럼 값이 전부
0인 것도 있어서, 그대로 그리면 빈 그림이 나옵니다. 필요한 칸만 덮어 쓰세요.

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

`tempRange`·`precipRange` 는 `auto: true` 라 값에 맞춰 알아서 잡힙니다. 눈금을 고정하고
싶으면 `auto: false` 로 두고 `min`·`max` 를 적으세요.

## 그래프 17종

| `type` | 그래프 | 기본 데이터 | 저수준 렌더러 | 데이터 타입 |
|---|---|---|---|---|
| `absbar` | 절댓값 막대 | `createDefaultAbsBarData()` | `renderAbsBarGraph` | `AbsBarGraphData` |
| `category-dot` | 범주 점 | `createDefaultCategoryDotData()` | `renderCategoryDotGraph` | `CategoryDotGraphData` |
| `climate` | 기후 그래프 | `createDefaultClimateData()` | `renderClimateGraph` | `ClimateGraphData` |
| `cube` | 정육면체 | `createDefaultCubeData()` | `renderCubeGraph` | `CubeGraphData` |
| `data-table` | 항목×지역 표 | `createDefaultDataTableData()` | `renderDataTable` | `DataTableData` |
| `deviation-a` | 월별 편차 | `createDefaultDeviationAData()` | `renderDeviationAGraph` | `DeviationAData` |
| `deviation-b` | 지역별 편차 | `createDefaultDeviationBData()` | `renderDeviationBGraph` | `DeviationBData` |
| `econ-plane` | 경제 좌표평면 | `createDefaultEconPlaneData()` | `renderEconPlane` | `EconPlaneData` |
| `hythergraph` | 하이서그래프 | `createDefaultHythergraphData()` | `renderHythergraph` | `HythergraphData` |
| `line` | 꺾은선 | `createDefaultLineData()` | `renderLineGraph` | `LineGraphData` |
| `matrix-table` | 계단식 행렬표 | `createDefaultMatrixTableData()` | `renderMatrixTable` | `MatrixTableData` |
| `pyramid` | 인구 피라미드 | `createDefaultPyramidData()` | `renderPyramidGraph` | `PyramidGraphData` |
| `radar` | 방사형 | `createDefaultRadarData()` | `renderRadarChart` | `RadarGraphData` |
| `scatter` | 산점도·버블 | `createDefaultScatterData()` | `renderScatterGraph` | `ScatterGraphData` |
| `stacked` | 100% 막대·원 | `createDefaultStackedData()` | `renderStackedGraph` | `StackedGraphData` |
| `ternary` | 삼각 그래프 | `createDefaultTernaryData()` | `renderTernaryGraph` | `TernaryGraphData` |
| `treemap` | 트리맵 | `createDefaultTreemapData()` | `renderTreemapGraph` | `TreemapGraphData` |

기본 데이터는 표의 `createDefault○○Data()` 로 얻어 고쳐 씁니다 — 어느 종류든 이
이름 규칙을 따릅니다. 저수준 렌더러 이름은 그렇지 않습니다 — `renderDataTable`·
`renderHythergraph`·`renderMatrixTable`·`renderRadarChart` 넷은 `render○○Graph`
를 따르지 않으니 표에서 확인하세요. 저수준 렌더러 이름에는 `renderEconPlane`
처럼 `Graph` 가 안 붙는 것도 있습니다. 데이터 모양이 어긋나면 한국어 메시지로
알려줍니다 — [오류 가려내기](#오류-가려내기) 참고.

### 꺾은선 — 시험지 관습 네 가지

`line` 은 수능 꺾은선의 관습을 옵션으로 둡니다 (1.6.0). 전부 선택이라 안 적으면
예전과 같이 그립니다.

| 칸 | 값 | 하는 일 |
|---|---|---|
| `xLabels[]` 의 빈 문자열 | `''` | 그 자리의 이름과 세로 격자를 건너뜁니다 — 자료는 5년마다, 라벨은 10년마다(`['1980','','1990',…]`) |
| `series[].stroke` · `series[].lineWidth` | `'#999'` · `3.5` | 계열을 색이 아니라 **굵기와 회색**으로 가릅니다 |
| `labelPlacement: 'leader'` + `series[].leader` | `{ at: 2, dx: 40, dy: -45 }` | 이름을 선 근처에 쓰고 짧은 **유도선**으로 가리킵니다. `at` 은 가리킬 점 번호, `dx`·`dy` 는 그 점에서 라벨까지의 거리 |
| `xGrid` · `gridColor` · `gridWidth` | `true` · `'#555'` · `1` | 세로 점선 격자와 격자 색·굵기. 시험지는 가로·세로 모두 진하고 1px 쯤인 점선입니다 (`gridWidth` 는 1.6.1) |

## 경제 좌표평면

`econ-plane` 은 수능 경제 문항의 그림입니다. 주제가 달라도(수요·공급, 총수요·
총공급, 생산가능곡선, 고용 지표, 물가-성장률, 국민 소득) 그림은 한 장입니다 —
화살표 달린 좌표평면 위에 **직선·점·유도선·화살표·계열** 다섯 가지만 놓입니다.

**이름은 거의 언제나 선 끝에 답니다**(`lines[].label`). 실물 열여섯 장 중 열다섯
장이 그렇습니다. 범례 상자는 계열(꺾은선)을 쓰는 한 장에만 있고, 그 상자도
`options.showLegend` 가 아니라 **자료**가 부릅니다(`legend`). 계열 이름을 적을
자리가 그것뿐이라 끌 수 있게 두면 어느 선이 무엇인지 알 길이 없기 때문입니다.

```js
const data = CsatChart.createSupplyDemandData();   // 수요·공급 교차 + 균형점 E
data.xAxis.label = '수량(개)';
data.yAxis.label = '가격(만 원)';
data.points.push({
  x: 6, y: 2, label: '', labelPos: 'top', guide: 'both', dot: false,  // 점 없이 유도선만
});
new CsatChart('c', { type: 'econ-plane', data: data });
```

기본값 말고 **시작점이 셋** 있습니다. 그리려는 그림에 가까운 것에서 시작하세요.

| 시작점 | 그리는 것 |
|---|---|
| `createSupplyDemandData()` | 수요·공급 교차 + 균형점 `E` (실물에서 가장 흔한 그림입니다. `createDefaultEconPlaneData()` 가 이것을 돌려줍니다) |
| `createAdAsData()` | 총수요·총공급 — 물가 × 실질 GDP, 눈금 없음 |
| `createPointShiftData()` | 이름 붙인 점 + 축으로 내리는 유도선 + 점 사이 화살표 (이것도 그만큼 자주 나옵니다) |

칸마다 하는 일은 이렇습니다.

| 칸 | 값 | 하는 일 |
|---|---|---|
| `quadrants` | `'first'`·`'all'` | `'all'` 이면 네 사분면을 그리고 축 양끝에 화살촉을 답니다 |
| `xAxis`·`yAxis` | `{ label, min, max, ticks, broken, brokenAt? }` | `ticks` 는 눈금 «값» 배열입니다. **자는 언제나 고르고 눈금만 띄엄띄엄 찍힙니다** — `[0, 10, 20, 50]` 이면 50 이 20 의 세 배 거리에 섭니다. `broken: true` 면 원점과 첫 눈금 사이에 생략 기호 `≈` 를 넣고, `brokenAt` 에 **축의 값**을 적으면 그 자리로 옮깁니다(`min`~`max` 밖은 축 안으로 잘립니다) |
| `grid` | boolean | 눈금 자리마다 점선 격자를 깝니다 |
| `dash` | `'dashed'`·`'dotted'` | 격자와 유도선의 점선 모양 |
| `lines[]` | `{ label, from, to, labelAt }` | 직선 하나. 이름은 `labelAt` 이 가리키는 끝에 붙습니다(`'to'` 가 보통) |
| `points[]` | `{ x, y, label, labelPos, guide, dot }` | `labelPos` 는 나침반 여덟 방향, `guide` 는 `'none'`·`'to-x'`·`'to-y'`·`'both'`·`'cross'`, `dot: false` 면 점 없이 유도선만 남습니다 |
| `arrows[]` | `{ from, to, offset, shorten, label, labelPos }` | `offset` 은 잇는 선에서 **진행 방향 오른쪽**으로 비켜 놓는 픽셀(곡선을 따라가는 화살표가 이 꼴), `shorten` 은 양 끝을 줄여 점에 안 닿게 하는 픽셀 |

필요할 때만 적는 **선택** 칸이 다섯 더 있습니다. 적지 않으면 1.4.0 과 똑같이
그려집니다.

| 칸 | 값 | 하는 일 |
|---|---|---|
| `lines[].dashed` | boolean | 그 직선을 파선으로 긋습니다. 흑백 시험지에서 선 종류가 뜻을 나릅니다 — 사적 편익만 반영한 `D_1` 은 실선, 사회적 편익까지 반영한 `D_2` 는 파선입니다 |
| `xAxis.tickLabels`·`yAxis.tickLabels` | `string[]` | 눈금 자리에 숫자 대신 적을 **글자**입니다. `ticks` 와 자리끼리 짝을 이룹니다 — 자리는 언제나 `ticks` 가 정하고, 이 배열은 거기 무엇이라 적을지만 바꿉니다. 숫자가 하나도 없는 세로축(`P_1`·`P_2`)도, 해[年]가 눈금인 가로축(`t년`·`t+1년`)도 이 한 칸으로 그립니다 |
| `series[]` | `{ label, points, dashed, marker, hollow }` | 점 여럿을 잇고 기호를 얹은 꺾은선. `marker` 는 `'circle'`·`'square'`, `hollow: true` 면 속을 비웁니다. 계열 둘이 한 점에서 만나면 **먼저 적은 것이 위**에 옵니다 |
| `legend` | `'bottom-right'` 따위 네 모서리 | 계열 범례 상자를 놓을 자리. 적지 않으면 그리지 않습니다. 그 모서리가 자료에 막히면 나머지 셋을 차례로 봅니다 |
| `seriesGuides` | boolean | 계열 꼭짓점에서 가로축으로 파선을 내립니다. 한 자리에 점이 여럿이면 가장 높은 점까지 한 번만 긋습니다 |

```js
// 명목 GDP·실질 GDP — 계열 둘과 범례 상자 (2027학년도 6월 경제 16번 모양)
new CsatChart('c', { type: 'econ-plane', data: {
  quadrants: 'first',
  xAxis: { label: '연도', min: 0, max: 4.5, ticks: [1, 2, 3],
           tickLabels: ['t년', 't+1년', 't+2년'], broken: true },
  yAxis: { label: 'GDP\\n(억 달러)', min: 0, max: 10, ticks: [], broken: true },
  grid: false, dash: 'dashed', lines: [], points: [], arrows: [],
  series: [
    { label: '명목 GDP', dashed: true, marker: 'circle', hollow: false,
      points: [{ x: 1, y: 7.2 }, { x: 2, y: 6.2 }, { x: 3, y: 3.2 }] },
    { label: '실질 GDP', dashed: false, marker: 'square', hollow: true,
      points: [{ x: 1, y: 3.5 }, { x: 2, y: 6.2 }, { x: 3, y: 8.8 }] },
  ],
  legend: 'bottom-right', seriesGuides: true,
} });
```

### 아래 첨자 — 밑줄로 적습니다

이 종류의 이름은 어디든 `D_1` 처럼 적으면 **밑줄 뒤에 이어지는 영문자·숫자**가
아래 첨자로 내려앉습니다(`D₁`). 선 이름·점 이름·화살표 이름·축 이름·눈금
이름표·계열 이름이 모두 그렇습니다.

한글 이름과 부딪히지 않게 규칙을 **밑줄 + 영숫자**로 좁혀 두었습니다. 그 밖의
글자 앞에 선 밑줄은 밑줄 그대로 남습니다 — `'강원_춘천'` 은 첨자가 아닙니다.
이어지는 영숫자는 통째로 첨자가 됩니다(`'수량_2024년'` → 「2024」만 첨자).

제목·출처·각주(`options`)에는 통하지 않습니다. 그쪽은 열일곱 종이 함께 쓰는
자리입니다.

### 세로축 이름을 두 줄로

세로축 이름에 리터럴 `\n`(역슬래시 + n)이나 진짜 줄바꿈을 넣으면 줄이 나뉘어
쌓입니다 — 실물이 「GDP」와 「(억 달러)」를 두 줄로 앉히는 꼴입니다. 여러 줄이면
묶음 가운데 맞춤이 됩니다. 산점도 `yLabel` 과 같은 규약입니다. 가로축 이름은
한 줄입니다.

눈금 표시선(축에 붙는 작은 선분)은 그리지 않습니다 — 시험지가 그렇습니다.
격자나 유도선이 축까지 닿아 자리를 알려 줍니다.

두 그림을 나란히 놓는 문항(2026학년도 수능 경제 5번의 〈X재 시장〉·〈Y재 시장〉,
2027학년도 6월 3번도 같습니다)은 캔버스 둘에 각각 그리고 배치는 쓰시는 쪽에서
합니다. 이 종류는 캔버스 한 장에 그림 한 장을 그립니다 — 판마다 제목이 따로
붙어 있으므로 `options.title` 에 〈X재 시장〉·〈Y재 시장〉을 적으면 실물과 같은
그림이 나옵니다.

## 옵션

`options` 는 다음 14개 필드를 받습니다. 필요한 것만 적으면 나머지는 기본값을 씁니다.

| 필드 | 기본값 | 하는 일 |
|---|---|---|
| `title` | `''` | 제목 |
| `source` | `''` | 출처. 각주 위(또는 `sourceInline` 이면 각주와 같은 줄)에 오른쪽 정렬로 적힙니다 |
| `sourceLeft` | 없음 | 출처 줄 왼쪽에 함께 적을 글(예: 자료 연도 `(2024)`). **지금은 `stacked`·`econ-plane` 에서만 동작합니다** |
| `sourceInline` | 없음(꺼짐) | 출처를 마지막 각주와 같은 줄 오른쪽 끝에 붙입니다(시험지 관습). **지금은 `scatter`·`econ-plane`·`line` 에서만 동작합니다** |
| `footnotes` | `['']` | 각주 목록. 앞에 `* ` 를 자동으로 붙이므로 직접 적지 않습니다. 빈 문자열은 무시됩니다 |
| `fontFamily` | `'serif'` | `'serif'`(명조)·`'sans'`(고딕)·`'custom'` 중 하나 |
| `customFont` | `''` | `fontFamily` 가 `'custom'` 일 때 **축 쪽에만** 쓸 글꼴 이름 |
| `fontStack` | `{}` | 글꼴 자리를 통째로 갈아 끼웁니다 — `{ serif, sans }`. 아래 [내 글꼴로 그리기](#내-글꼴로-그리기) 참고 |
| `fontSize` | `{ title: 36, axisLabel: 28, tick: 26, dataLabel: 22 }` | 제목·축 이름·눈금·데이터 값 글자 크기(px). 각주·출처는 `dataLabel` 을 따릅니다 |
| `showDataLabels` | `false` | 막대·점에 값을 함께 표시할지 |
| `showLegend` | `true` | 범례를 보여줄지 |
| `legendPosition` | `'bottom'` | `'bottom'`(아래)·`'right'`(오른쪽) 중 하나 |
| `legendLabel1` | `''` | 두 계열을 쓰는 종류(기후·편차·인구 피라미드)의 첫 계열 범례 이름. 비워 두면 데이터가 준 이름을 씁니다 |
| `legendLabel2` | `''` | 같은 종류의 두 번째 계열 범례 이름 |

`econ-plane` 은 `showLegend`·`legendPosition`·`showDataLabels` 를 읽지 않습니다.
시험지 경제 그림은 선 끝에 이름을 달고, 계열을 쓰는 그림의 범례 상자는 옵션이
아니라 자료가 부르기 때문입니다(`data.legend` — 위 [경제 좌표평면](#경제-좌표평면)
참고). 나머지 옵션(제목·출처·각주·글꼴)은 다른 종류와 똑같이 동작합니다.

`fontSize` 는 하나만 부분 지정해도 됩니다 — TypeScript·JavaScript 모두 마찬가지입니다.

```js
chart.update({ options: { fontSize: { title: 44 } } });
```

나머지 세 값은 그대로 유지됩니다(준 항목만 갈아 끼웁니다). `fontStack` 도 같습니다 —
한 자리만 다시 줘도 나머지 자리는 그대로 남습니다. TypeScript 에서 이 모양의 옵션
타입 이름은 `PartialGraphOptions`, 한 종류의 부분 갱신 전체는 `UpdateFor<T>` 입니다.

## 내 글꼴로 그리기

시험지 그림은 자리마다 서체가 다릅니다. **축 이름·눈금·자료값은 명조**, **제목·출처·
각주·범례는 고딕**입니다. 실제 시험지가 그렇기 때문에 기본값도 그렇게 두었습니다.

`fontStack` 은 그 짝을 그대로 둔 채 **각 자리에 무슨 글꼴을 쓸지**만 바꿉니다.

```js
new CsatChart('c', {
  type: 'climate',
  data: myData,
  options: {
    fontStack: {
      serif: "'함초롬바탕', serif",      // 축 이름·눈금·자료값
      sans: "'함초롬돋움', sans-serif",  // 제목·출처·각주·범례
    },
  },
});
```

**이 방법이 가장 손이 적게 갑니다.** 한컴오피스가 깔린 컴퓨터에는 함초롬바탕·
함초롬돋움이 이미 있습니다. 내려받을 것도, 어딘가에 올려 둘 것도, 라이선스를 살펴볼
것도 없습니다 — 보는 사람의 컴퓨터에 있는 글꼴을 그대로 쓰기 때문입니다. 윈도우
기본 글꼴(`'맑은 고딕'`·`'바탕'`)도 같은 방식으로 쓸 수 있습니다.

대신 **그 컴퓨터에 그 글꼴이 있어야** 합니다. 없으면 브라우저가 아무 말 없이 뒤의
총칭 글꼴(`serif`·`sans-serif`)로 떨어뜨립니다. 그래서 이름 뒤에 `, serif` 를 꼭
붙여 두세요 — 그래야 이름이 틀렸을 때도 명조 계열로 떨어집니다.

누가 열어 보든 같게 보여야 한다면 웹폰트를 쓰고, 글꼴을 **먼저 받아 둔 뒤에**
그리세요. `ensureFonts()` 의 `href`·`families` 가 그 자리입니다.

```js
await CsatChart.ensureFonts({
  href: 'https://cdn.example.com/my-font.css',
  families: ['MyFont Serif', 'MyFont Sans'],
});
new CsatChart('c', {
  type: 'climate',
  data: myData,
  options: { fontStack: { serif: "'MyFont Serif', serif", sans: "'MyFont Sans', sans-serif" } },
});
```

두 자리 중 하나만 줘도 됩니다. 적지 않은 자리는 기본 글꼴(Noto Serif KR·Noto Sans KR)
그대로입니다.

`fontFamily` 와는 층이 다릅니다. `fontFamily` 는 **축이 어느 자리를 쓸지**(명조냐
고딕이냐) 고르고, `fontStack` 은 **그 자리가 무슨 글꼴인지**를 정합니다. 둘을 함께
써도 됩니다 — `fontFamily: 'sans'` + `fontStack.sans` 면 축까지 그 고딕으로 그립니다.
`customFont` 은 예전 그대로 동작하지만 축 쪽만 바꾸므로, 그림 전체를 바꾸려면
`fontStack` 을 쓰세요.

## 그림이 이상할 때

| 증상 | 원인 | 할 일 |
|---|---|---|
| 글꼴이 시험지 같지 않습니다 | `ensureFonts()` 를 안 불렀거나, 차트를 만든 **뒤에** 불렀습니다 | `await CsatChart.ensureFonts()` 를 먼저 부르고 그 안에서 차트를 만드세요 |
| `fontStack` 을 줬는데 그림이 그대로입니다 | 그 이름의 글꼴이 이 컴퓨터에 없어 브라우저가 조용히 대체 글꼴로 떨어뜨렸습니다 | 글꼴 이름을 다시 보세요(한글 이름은 한글 그대로 적습니다). 누구에게나 같게 보여야 하면 웹폰트를 쓰고 `ensureFonts({ href, families })` 로 먼저 받으세요 |
| `update()` 뒤에 축 글꼴만 기본으로 돌아갑니다 | — | 그런 일은 없습니다. `fontStack` 은 `fontSize` 처럼 준 자리만 갈아 끼우고 나머지는 유지합니다 |
| 제목·눈금·각주가 한 덩어리로 겹칩니다 | 캔버스가 너무 작습니다 | 800×600 안팎으로. 500×400 아래로는 내려가지 않습니다 |
| 축은 그려지는데 자료가 없습니다 | 기본 데이터를 그대로 썼습니다 (값이 전부 0인 종류가 있습니다) | [내 자료 넣기](#내-자료-넣기) |
| 레티나에서 흐릿합니다 | 화면 캔버스는 1배입니다 | `toDataURL({ scale: 2 })` 로 뽑아 `<img>` 로 거세요 |
| 아무것도 안 그려집니다 | `CsatChartError` 가 던져졌습니다 | 브라우저 콘솔(F12)을 열면 한국어로 이유가 적혀 있습니다 |
| 축 이름이 두 줄로 나뉘거나 그림이 조금 작아졌습니다 | 이름이 길어 한 줄로 두면 캔버스를 벗어납니다 | 그대로 두셔도 됩니다 — **이름을 자르는 대신** 자리를 비우고 줄을 늘립니다. 그림을 키우려면 이름을 줄이거나 캔버스를 넓히세요 |

## 인쇄용으로 뽑기

`toDataURL()`·`download()` 의 `scale` 은 **글자·선까지 함께 키우는** 배율입니다.
캔버스만 키우는 `resize(1600, 1200)` 과는 다릅니다 — 이 라이브러리의 글꼴 크기와
여백이 절대 픽셀이라서, 캔버스를 두 배로 하면 «두 배로 선명한 같은 그림» 이 아니라
**«글자가 절반으로 작아진 다른 그림»** 이 나옵니다. 인쇄용으로 뽑을 때는 이렇게 씁니다.

```js
const printUrl = chart.toDataURL({ scale: 2 });   // 화면과 같은 구도, 두 배 해상도
chart.download('시험지그림.png', { scale: 2 });
```

화면에 그려지는 캔버스 자체는 항상 1배입니다. `devicePixelRatio` 를 따로 다루지
않으므로 **레티나 디스플레이에서는 글자와 선이 조금 흐릿하게 보입니다.** 화면으로
훑어보는 데는 지장이 없지만, 또렷한 그림이 필요하면 `scale: 2` 로 뽑은 PNG 를
`<img>` 에 넣고 CSS 로 원래 크기까지 줄여 거세요. 인쇄·투사도 같은 방법입니다.

## 지원 환경

- Chrome 99, Firefox 112, Safari 16.4(iOS 16.4) 이상은 아무것도 하지 않아도
  17종 전부가 그대로 그려집니다 (빌드 타깃 ES2020).
- 그 아래 — Chrome 80·Firefox 74·Safari 13.1 까지 — 도 그려집니다. **다만
  `absbar`·`climate`·`deviation-a`·`deviation-b`·`hythergraph`·`pyramid`·
  `scatter`·`stacked` 여덟 종류는 범례 박스를 그릴 때 `ctx.roundRect()` 를
  쓰는데, 그 메서드가 Chrome 99·Firefox 112·Safari 16.4 미만에는 없습니다.** 이
  라이브러리는 그 자리를 폴리필로 메웁니다 — `new CsatChart(...)` 를 쓰면
  생성자가 첫 렌더 전에 자동으로 불러 주므로 신경 쓸 일이 없습니다. 저수준
  렌더러(`renderClimateGraph` 등)를 파사드 없이 직접 부른다면 그리기 전에
  `installRoundRectPolyfill()` 을 스스로 한 번 불러야 합니다.
- 학교 PC·구형 iPad 가 이 라이브러리의 실제 관객입니다. iPad 5세대·Air 2 처럼
  iOS 15 에서 멈춘 기기는 iOS 16.4 를 영영 받을 수 없어, 폴리필이 없으면
  위 여덟 종류가 흰 캔버스로만 보입니다.
- 런타임 의존성 0. `<script>` 한 줄이면 됩니다
- Node 는 캔버스 구현체를 직접 고릅니다 (아래 「Node.js 에서 PNG 뽑기」)

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

캔버스 구현체는 직접 고릅니다. 이 패키지의 의존성이 아닙니다.

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
`false` 만 돌아옵니다 — 시스템에 깔린 대체 글꼴로 그려집니다. 시험지 서체가 꼭
필요하면 그 글꼴을 서버에 직접 설치하세요.

## API 자세히

### `new CsatChart(target, config)`

`target` 은 `<canvas>` 요소 또는 그 `id` 문자열. `config` 는 `{ type, data, options? }`.
TypeScript 에서는 `type` 을 적는 순간 `data` 타입이 그 종류로 좁혀집니다 — 다른 종류의
데이터를 넣으면 컴파일이 막힙니다.

`target` 이 잘못되면 알아보기 쉬운 한국어 오류를 던집니다. 특히 `id` 를 잘못 적어
`document.getElementById()` 가 `null` 을 돌려준 경우 — 브라우저 콘솔을 잘 열지
않는 사용자를 겨냥해, «그 id 를 찾지 못한 것은 아닌지 보라» 는 안내까지 붙습니다.

| 메서드 | 하는 일 |
|---|---|
| `update(next: UpdateFor<T>)` | `data`·`options` 중 준 것만 덮고 다시 그립니다. 어긋나면 던지고 이전 상태를 지킵니다 |
| `resize(width, height)` | 캔버스 픽셀 크기를 바꾸고 다시 그립니다. 둘 다 0보다 커야 합니다 |
| `toDataURL(options?: { scale?: number })` | PNG data URL |
| `download(filename?, options?: { scale?: number })` | 내려받기 (브라우저 전용) |
| `destroy()` | 캔버스를 흰 바탕으로 지우고 더는 그리지 못하게 합니다 |

`update()`·`resize()` 는 `this` 를 돌려주므로 이어 쓸 수 있습니다. `chart.canvas` 로
넘겨준 캔버스 자체에도 접근할 수 있습니다.

### `CsatChart.ensureFonts(options?)`

`Noto Serif KR`·`Noto Sans KR` 을 확보합니다. 준비되면 `true`, 못 받거나 Node 이면
`false` 를 돌려줍니다. **던지지 않습니다.**

한 페이지에서 여러 번 불러도 실제 작업은 한 번뿐입니다. 그래서 **차트를 만들기 전에,
가장 먼저** 부르세요 — 나중 호출에 넘긴 옵션은 조용히 버려지고, 차트를 먼저 만들면
늦게 도착한 글꼴이 반영되지 않을 수 있습니다.

옵션은 셋입니다. `href`(글꼴 CSS 주소), `families`(확인할 글꼴 이름), `timeoutMs`
(기본 5000). 교내망·오프라인이라 `href` 를 바꾼다면 **`families` 도 함께 바꾸세요**
— `href` 를 그대로 둔 채 `families` 만 바꾸면 그 글꼴이 없어도 `true` 가 나옵니다.

이 둘은 `options.fontStack` 과 짝입니다. 내려받아야 하는 웹폰트를 쓸 때 여기서 먼저
받아 두고, `fontStack` 으로 그 글꼴을 자리에 앉힙니다. 이미 컴퓨터에 깔린 글꼴만
쓴다면 `ensureFonts()` 는 부를 필요가 없습니다 — [내 글꼴로 그리기](#내-글꼴로-그리기)
참고.

### 오류 가려내기

데이터가 어긋나면 `CsatChartError` 를 던집니다. 가려낼 때는 `instanceof` 말고
**`err.name` 을 보세요.**

```js
try {
  new CsatChart(c, { type, data });
} catch (err) {
  if (err.name === 'CsatChartError') showHint(err.message);
}
```

같은 페이지에 ESM 판과 CDN 판이 함께 올라오면 클래스가 두 벌이 되어
`instanceof` 가 조용히 `false` 가 됩니다. `name` 은 그런 일이 없습니다.

메시지는 무엇이 왜 잘못됐는지까지 말해 줍니다. 필수 항목이 빠졌으면 그 이름을,
값의 자료형이 다르면 무엇이었어야 하는지를, `type` 을 잘못 적었으면 가까운
후보를 댑니다.

```
csat-chart: 알 수 없는 type "climat" — 혹시 "climate"?
csat-chart: type "pyramid" 의 data 에 ages 항목이 없습니다
csat-chart: type "climate" 의 data.months[0]: 객체여야 합니다 (지금 숫자)
```

마지막 예는 흔한 실수 하나를 잡습니다 — 열두 달 자료를 `months: [1, 2, …, 12]`
처럼 숫자만 늘어놓은 배열로 적는 것. 배열이고 길이도 12라 겉모양만 보면
통과할 법하지만, 그 상태로 그리면 브라우저에서는 좌표가 어긋나 빈 그림이
나오고 Node 캔버스에서는 프로세스가 죽습니다. 배열의 첫 원소까지 한 겹 더 보고
막습니다.

### 상수

기호·눈금 순서를 정하는 상수 7개를 내보냅니다 — `AGE_GROUPS`·`DOT_MARKER_ORDER`·
`LINE_MARKER_ORDER`·`LINE_STYLE_ORDER`·`MONTH_LABELS_EN`·`MONTH_LABELS_NUM`·
`LINE_DASH`. 모두 **얼려서** 내보냅니다. 렌더러가 기본값으로 읽는 바로 그 객체라서,
얼지 않으면 `DOT_MARKER_ORDER.reverse()` 한 번에 이후 모든 그림의 기호 배정이
조용히 어긋납니다. `CHART_TYPES`(그래프 17종 목록)도 같은 이유로 따로 얼려서
내보냅니다.

ESM/CJS 로 쓸 때는 각각 이름으로 가져옵니다.

```ts
import { CHART_TYPES, AGE_GROUPS } from 'csat-chart.js';
```

CDN 판에서는 전역 `CsatChart` 에도 같이 붙어 있어 `CsatChart.CHART_TYPES` 로도
쓸 수 있습니다 — UMD 번들이 전역 `CsatChart` 에 한 번 더 얹어 둔 것뿐이라, 번들러로
쓸 때 `CsatChart.CHART_TYPES` 라고 쓰면 `undefined` 입니다.

## 저수준 렌더러

`CsatChart` 를 거치지 않고 그래프 하나만 직접 그릴 수 있습니다. 모두 같은 꼴입니다.

```ts
render○○(ctx, width, height, data, options): void
```

번들러를 쓴다면 렌더러 하나만 가져오는 편이 실제로 훨씬 가볍습니다. 실측(esbuild
0.27.7, `--bundle --minify --format=esm`, `csat-chart.js` 를 패키지로 설치한
상태 기준):

| 무엇을 가져오나 | 크기 |
|---|---|
| 라이브러리 전부 | 112.6 KB |
| `CsatChart` 만 | 110.0 KB |
| `renderClimateGraph` 만 | **12.0 KB** |

`CsatChart` 는 `type` 을 문자열로 받아 그때그때 렌더러를 고르므로 17종을 전부
붙들고 있어야 합니다. 기후 그래프 하나만 필요한 앱이라면 저수준 렌더러를 직접
부르는 편이 아홉 배 가볍습니다. CDN 으로 쓰면 어차피 한 벌을 통째로 받으므로 이
이야기는 해당하지 않습니다.

저수준 렌더러는 번들 크기 말고 다른 이유로도 씁니다 — `CsatChart` 의 수명주기
(캔버스 자동 크기 보정, 글꼴이 늦게 도착했을 때 다시 그리기)가 필요 없을 때입니다.
위 [Node.js 에서 PNG 뽑기](#nodejs-에서-png-뽑기)가 그런 경우입니다.

렌더러가 눈금 간격을 잡을 때 쓰는 두 축 계산 유틸도 함께 내보냅니다 —
`niceStep(range, maxTicks = 8)` 은 범위를 주면 1·2·5 배수 규칙으로 보기 좋은
눈금 간격 하나를 돌려주고(범위가 0 이하거나 유한하지 않으면 1을 돌려줍니다 —
간격이 0이면 눈금을 그리는 루프가 멎습니다), `autoRange(values, maxTicks = 8)`
는 값 배열을 주면 그 값들을 담는 `{ min, max, step }` 을 한 번에 잡아 줍니다.
직접 축을 그리는 커스텀 렌더러를 만들 때 유용합니다.

## 만든 배경

지리 교사가 수업·평가 자료를 만들려고 쓰던 렌더러를 떼어내 공개한 것입니다.
[GeoTester](https://geotester-v2.vercel.app) 와 GeoGrapher 에서 쓰이던 코드입니다.
1.4.0 의 `econ-plane` 은 그 바깥에서 온 첫 종류입니다 — 수능 경제 문항의 그림
열세 장(2026학년도 수능·9월, 2027학년도 6월)을 재어 만들었고, 1.5.0 에서 같은
회차의 세 장을 더 재어 열여섯 장이 됐습니다.

## 기여

버그 제보와 새 그래프 종류 제안을 환영합니다. 렌더 결과를 바꾸는 변경은
골든 이미지 기준을 함께 갱신해야 합니다.

```bash
npm install
npm run verify          # 타입 → 린트 → 빌드 → 테스트 순
UPDATE_GOLDEN=1 npx vitest run test/core/golden.test.ts   # 기준 갱신
```

골든 이미지는 시스템 글꼴 대체 결과에 의존하므로 기계마다 다를 수 있습니다.
CI 에서는 `SKIP_GOLDEN=1` 로 건너뜁니다.

`src/core/**` 는 이 저장소의 ESLint 대상에서도 제외됩니다(`eslint.config.mjs` 참고) —
이 층을 지키는 수단이 린트가 아니라 골든 이미지이기 때문입니다. 1.0.0 은 원본
렌더러를 한 글자도 고치지 않고 옮긴 판이었고 골든 이미지 31장이 그 증거였습니다.
지금은 필요하면 고칩니다 — 대신 렌더 결과가 달라진 내역은 CHANGELOG 에 남깁니다.
그리고 CI 는 `SKIP_GOLDEN=1` 로 골든 이미지 비교 자체를
건너뛰므로, 렌더 결과가 기준 이미지와 실제로 같은지는 CI 가 확인하지 않습니다 —
CI 가 렌더러에 대해 돌리는 자동 검사는 「캔버스가 비어 있지 않다」 하나뿐입니다.
렌더러를 바꾸는 PR 을 보낸다면, 위 명령으로 로컬에서 골든 이미지 비교까지
통과하는지 직접 확인한 결과를 함께 적어 주면 리뷰가 빨라집니다.

## 라이선스

MIT © 2026 김용현
