# 경제 좌표평면 — 데모에 「물결」 칸을 낸다

작성일: 2026-09-10

## 1. 배경

축 생략 기호(물결 `≈`)는 1.4.0 부터 이미 그려진다. `EconPlane.ts` 의
`drawBreakMark` 가 축선을 흰색으로 끊고 그 자리에 물결 둘을 얹으며, 켜는 스위치는
자료의 `xAxis.broken`·`yAxis.broken` 두 불리언이다(`src/core/types/econplane.ts`).

**없는 것은 조작칸이다.** 데모 페이지에서 이 값을 켜고 끄려면 「데이터 (JSON) 직접
고치기」를 펴서 `"broken": true` 를 손으로 쳐야 한다. 카드에 난 조작칸으로
누를 수 있는 것은 옵션(제목·출처·각주·범례·값·글꼴)과 자료 한 칸(「막대 방향」)
뿐이다.

이 문서는 데모에 「가로축 물결」·「세로축 물결」 두 칸을 내는 일을 적는다.
**`src/` 는 손대지 않는다** — 그리는 코드는 이미 다 있다. 따라서 재빌드도, 판
올림도, npm 발행도 없다. 데모만 고친 과거 커밋들(`d112849` 등)과 같은 `docs:` 한
건이다.

## 2. 화면

경제 좌표평면 카드의 「각주·범례·**물결**·이름 바꾸기」 접기 안, 글꼴칸 아래
자료칸 자리에 구분선(`.data-field` 의 위쪽 실선)과 함께 선다.

```
──────────────────────────────
☑ 가로축 물결   ☑ 세로축 물결
```

두 칸으로 가른 것은 **자료가 이미 축마다 딴 값을 가지기 때문이다.** 한 축만 자른
그림도 그대로 나와야 한다. `title` 에 `data.xAxis.broken` 을 달아 어느 값인지
보이게 한다 — 「막대 방향」 칸과 같은 규약이다.

물결 칸을 가진 종류는 `econ-plane` 하나뿐이다(`grep -rn broken src/core/types` →
`econplane.ts` 뿐). `SUPPORTS_AXIS_BREAK = ['econ-plane']` 로 막아 나머지 열여섯
카드에는 아예 그리지 않는다 — 「막대 방향」이 `SUPPORTS_BAR_DIRECTION` 으로
absbar·stacked 에만 서는 것과 같다.

## 3. 배선

`data-data` 는 지금 «최상위 값» 하나만 다룬다(`state.data[key]`, `c.value`).
두 군데만 넓힌다.

| 넓히는 것 | 방법 |
|---|---|
| 점 경로 | `data-data="xAxis.broken"` 을 `.split('.')` 로 갈라 읽고 쓴다. 쓰기는 이름칸이 쓰는 `setAt(root, path, value)` 를 그대로 재활용하고, 짝이 없는 읽기 쪽에 `valueAt(root, path)` 를 새로 단다 |
| 체크박스 | `syncDataControls()` 와 `change` 처리에서 `c.type === 'checkbox'` 면 `c.value` 대신 `c.checked` 를 본다 |

`barDirection` 은 경로가 한 마디(`['barDirection']`)로 갈릴 뿐이라 지금과 똑같이
동작한다. 배선 갈래를 셋으로 늘리지 않은 것에 뜻이 있다 — 물결 전용 속성을 새로
두면 `data-opt`·`data-data` 에 이어 세 번째 규약이 생기고, 다음에 `grid`·`dash`
칸을 낼 때 또 갈린다.

`setAt` 은 중간 마디가 없으면 말없이 아무것도 하지 않는다. JSON 칸에서 `xAxis` 를
지운 자료는 렌더러·검증기가 먼저 막으므로 여기서 더 따지지 않는다.

## 4. JSON 칸과 어긋나지 않기

기존 배선이 이미 양방향이라 새로 할 일이 없다.

- 체크박스를 누르면 `apply('data')` 가 JSON 칸을 다시 쓴다.
- JSON 칸에서 `"broken": true` 로 고치면 `apply('json')` 끝의 `syncDataControls()`
  가 체크를 따라 켠다.
- 「이 그래프를 만드는 코드」 조각과 「되돌리기」 버튼도 같은 `apply` 흐름에 얹혀
  저절로 따라온다.

## 5. 하지 않는 것

- **`isInert` 규칙을 넣지 않는다.** 물결은 눈금이 하나도 없어도 그려진다
  (`ticks.find(v => v !== 0)` 가 없으면 `plotW * 0.12` 자리로 물러난다). 곧
  언제나 하는 일이 있어 감출 조건이 없다.
- **물결의 모양·크기·놓이는 자리는 손대지 않는다.** 표시/미표시만이다.
- `.checks` 클래스를 그대로 쓰지 않는다. `syncControlVisibility()` 가
  `el.querySelector('.checks')` 로 «옵션 체크 줄» 하나를 집어 통째로 감추는데,
  경제 카드는 범례·값 칸이 없어 그 줄이 아예 없다 — 자료칸이 그 이름을 물려받으면
  옵션 쪽 배선에 걸린다. `.data-checks` 를 같은 CSS 규칙에 이름만 얹어 쓴다.

## 6. 확인

1. `npm test` — 41장 골든이 그대로여야 한다(`src` 를 안 건드렸다는 증거).
2. `docs` 를 로컬에 띄우고 Chrome 으로 본다.
   - 경제 카드의 두 칸을 눌러 물결이 붙었다 떨어지는가
   - 그때 JSON 칸의 `broken` 이 따라 바뀌는가
   - JSON 칸에서 `broken` 을 고치면 체크가 따라오는가
   - 「막대 방향」(누적 막대 카드)이 여전히 동작하는가
   - 나머지 카드에 물결 칸이 안 생기는가

## 7. 구현 순서 (한 장 계획)

고치는 파일은 `docs/index.html` 하나다.

1. CSS `.checks` 규칙에 `.data-checks` 를 얹는다.
2. `SUPPORTS_AXIS_BREAK` 를 `SUPPORTS_BAR_DIRECTION` 옆에 두고, 어느 자료가 이
   칸을 가지는지 주석으로 적는다.
3. `valueAt(root, path)` 를 `setAt` 옆에 단다.
4. `syncDataControls()` 를 점 경로·체크박스까지 읽게 고친다.
5. `[data-data]` 의 `change` 처리를 같은 규약으로 고친다.
6. `breakHtml` 을 만들고 `dirHtml` 뒤에 끼운다. 접기 이름에 `물결·` 을 얹는다.
7. §6 대로 확인한다.
