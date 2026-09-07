# 변경 기록

## [1.0.0] — 2026-09-07

첫 공개. GeoTester 의 `src/lib/geo-graph` 밀봉 폴더를 독립 패키지로 떼어냈다.

### 담긴 것

- Canvas 렌더러 16종 (기후·인구 피라미드·삼각·100% 막대/원·절댓값 막대·산점도/버블·
  하이서그래프·정육면체·방사형·편차 A/B·꺾은선·범주점·트리맵·계단식 행렬표·항목×지역 표)
- 파사드 `CsatChart` — `type` 문자열 하나로 16종을 그리고, 만든 뒤에도 `update()`·
  `resize()`·`toDataURL()`·`download()`·`destroy()` 로 다룬다
- `ensureFonts()` — 시험지 글꼴을 선택적으로 불러온다
- ESM·CJS·UMD 세 산출물, 런타임 의존성 0

### 새로 생긴 동작

포팅 대상이던 렌더러 자체(`src/core`)는 한 글자도 바꾸지 않았지만, 그걸 감싸는
파사드·검증·글꼴 계층은 이 패키지에서 새로 썼다. 아래는 원본 앱(GeoTester)에는
없던, 이 패키지만의 동작이다.

- **모양 검증, 한국어 메시지.** `new CsatChart()`·`update()` 에 준 `data` 가
  기본 데이터와 모양이 다르면(키가 빠졌다, 종류가 다르다, 길이가 고정된 배열의
  길이가 다르다) 그리기 전에 막고 이유를 한국어로 말한다. 배열은 원소의 종류까지
  한 겹 더 본다 — `months: [1, 2, …, 12]` 처럼 열두 달 자료를 숫자 배열로 납작하게
  붙여넣는 실수는 배열이고 길이도 12라 겉모양만 보면 통과하는데, 그 상태로 그리면
  브라우저에서는 좌표가 어긋나 빈 그림이 되고 Node 캔버스에서는 프로세스가 죽는다.
  이 한 겹이 그 실패를 그리기 전에 막는다.
- **크기 없는 `<canvas>` 는 800×600 으로 본다.** HTML 기본값인 300×150 은 이
  라이브러리의 절대 픽셀 여백·글자 크기와 맞지 않아 제목·눈금·각주가 겹친 읽을 수
  없는 그림이 된다. `<canvas id="c"></canvas>` 라고만 쓰는 실수는 흔한데, 그 결과가
  조용한 오작동이면 안 되므로 자동으로 800×600 을 넣는다. 명시적으로 준 크기는
  그대로 존중한다.
- **`toDataURL({ scale })` — 인쇄용 고해상도 내보내기.** `resize()` 는 캔버스만
  키우고 글자 크기는 절대 픽셀 그대로라 «두 배로 선명한 같은 그림» 이 아니라
  «글자가 절반으로 작아진 다른 그림» 이 된다. `scale` 은 글자·선까지 함께 키워
  뽑은 뒤 캔버스를 원래 크기로 되돌린다. `download()` 도 같은 옵션을 받는다.
- **글꼴이 늦게 도착하면 한 번 다시 그린다.** `ensureFonts()` 를 깜빡하는 실수가
  가장 흔한데 증상이 조용하다 — 대체 글꼴로 «멀쩡히» 그려지고 잠시 뒤 글꼴이
  와도 아무도 다시 그리지 않는다. `CsatChart` 는 `document.fonts.ready` 를
  지켜보다 한 번 더 그린다. 다만 만능은 아니다 — `document.fonts.ready` 는
  **부르는 시점에** 로딩 중이던 것이 끝나면 이행하므로, 차트를 먼저 만들고
  `ensureFonts()` 를 나중에 부르면 이 약속은 이미 이행된 뒤라 도움이 안 된다.
  `await CsatChart.ensureFonts()` 뒤에 차트를 만드는 순서를 지키는 것이 여전히
  옳다.
- **내보내는 상수는 얼려서 내보낸다.** `CHART_TYPES`·`AGE_GROUPS`·`DOT_MARKER_ORDER`·
  `LINE_MARKER_ORDER`·`LINE_STYLE_ORDER`·`MONTH_LABELS_EN`·`MONTH_LABELS_NUM`·
  `LINE_DASH` 는 렌더러가 기본값으로 읽는 바로 그 객체다. 타입 검사를 받지 않는
  CDN 사용자를 겨냥한 패키지라, 얼리지 않으면 `DOT_MARKER_ORDER.reverse()` 한
  번에 이후 모든 그림의 기호 배정이 조용히 어긋난다.
- **저수준 렌더러를 하나만 가져오면 번들이 실제로 작아진다.** 처음 재는 값(esbuild
  실측)이 95.9 KB(전부)와 별 차이 없는 92 KB 대여서, 한동안 이 이점이 배포되는
  `dist/csat-chart.mjs` 에서는 성립하지 않았다. 원인 둘을 찾아 고쳤다.
  - `CHART_TYPES` 를 만드는 `Object.freeze(Object.keys(REGISTRY).sort())` 가
    모듈 맨 위의 함수 호출이라 번들러가 부작용을 의심해 지우지 못했다 — 세
    호출(`Object.keys`·`.sort()`·`Object.freeze`) 모두에 `/* @__PURE__ */` 를 달았다.
  - 더 컸던 원인은 따로 있었다: `CsatChart.ensureFonts` 정적 필드가 (당시 빌드
    타깃이던) ES2020 으로 내려가며 클래스 선언 뒤의 `CsatChart.ensureFonts =
    ensureFonts;` 대입문으로 풀렸는데, 이 대입문은 트리쉐이킹이 절대 지울 수
    없는 부작용이라 `CsatChart` 를 아무도 안 써도 클래스 전체와 그것이 붙든
    `REGISTRY`(=16종 렌더러 전부)가 계속 살아 있었다. 빌드 타깃을 ES2022 로
    올려 정적 필드가 네이티브로 남게 했다.
  - 두 수정을 합치니 `renderClimateGraph` 하나만 가져온 번들이 10.0 KB 로
    줄었다(같은 방법으로 잰 값). `CsatChart` 를 통째로 가져오면 여전히 94.6 KB
    다 — 파사드가 16종을 다 붙들고 있어야 하는 것은 설계상 당연하다.

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
