# 경제 좌표평면 — 물결 자리를 옮긴다

작성일: 2026-09-11 · 판 1.7.0 예정

## 1. 배경

물결(축 생략 기호 `≈`)은 1.4.0 부터 그려졌고, 2026-09-10 에 데모 조작칸까지 났다.
남은 것은 **자리**다. 지금은 코드에 박혀 있다 — 원점과 첫 눈금의 한가운데,
눈금이 하나도 없으면 축 길이의 12%(`EconPlane.ts` 의 「생략 기호는 원점과 첫
눈금의 한가운데에 놓는다」 대목, 2026학년도 9월 7번 실측).

실물 한 장에서 잰 자리라 다른 그림에는 안 맞을 수 있다. 자리를 자료가 정하게
한다.

## 2. 자료 — `EconAxis` 에 칸 하나

```ts
broken: boolean;
/** 물결을 놓을 «값». 미지정이면 원점과 첫 눈금의 한가운데 */
brokenAt?: number;
```

**축의 «값» 으로 적는다.** 이 라이브러리는 눈금에서 이미 「값이 곧 자리다」를
못박아 두었다(`ticks` 주석). 자리를 말하는 둘째 자[尺]를 들이지 않는다.
1.6.1 의 `gridWidth?: number`(«미지정이면 0.5»)와 같은 꼴의 선택 칸이다.

| 경우 | 하는 일 |
|---|---|
| 안 적으면 | 지금 자리 그대로. **기존 자료와 골든 41장이 한 획도 안 바뀐다** |
| `broken: false` 면 | 무시한다(물결을 안 그리므로) |
| `min`~`max` 밖 값 | 축 안으로 자른다(clamp). 「축 내에서」가 이 칸의 뜻이라 캔버스 밖으로 내보내지 않는다 |

검증기는 손대지 않는다. `validate.ts` 는 «기본 데이터의 키» 만 필수로 보고
«모양만» 보므로(파일 첫 줄), 선택 칸이자 숫자인 이 칸은 이미 규약 안에 있다.

## 3. 렌더러 — `EconPlane.ts` 의 두 자리

```ts
const at = data.xAxis.brokenAt;
const x = at == null ? <지금 계산> : toX(clampAxis(at, data.xAxis));
drawBreakMark(ctx, x, axY, false);
```

세로축도 같은 꼴(`toY`). `toX`·`toY` 가 이미 있어 새 셈은 없다. `clampAxis` 는
이 파일 안에 두는 작은 헬퍼다.

## 4. 데모 — 「물결 자리」 숫자칸 둘

물결 체크박스 바로 아래. **비우면 기본 자리**(키가 자료에서 사라진다).

- **물결이 꺼져 있으면 감춘다.** `isInert` 에 이 종류의 첫 규칙이 생긴다 —
  `brokenAt` 은 `data.xAxis.broken` 이 거짓이면 그림을 한 획도 안 바꾼다.
- `data-data` 배선에 **숫자 규약** 을 하나 더 넓힌다. 지금은 문자열(select)과
  불리언(checkbox) 둘뿐이다. 빈칸은 `undefined`, 아니면 `Number()`.
  `undefined` 를 넣으면 `JSON.stringify` 가 키를 통째로 빼 주므로 JSON 칸도
  「안 적음」으로 돌아간다.
- 자리표시자에 지금 자리를 적어 준다.

## 5. 확인

1. **골든 1장 추가** — 두 축 다 옮긴 그림(`econPlaneBrokenAt`).
2. **기존 41장 불변** — 기본값을 안 바꿨다는 증거.
3. **단위 시험** — `min`~`max` 밖 값이 축 안으로 잘리는지.
4. `npm run verify`(typecheck → lint → build → test).
5. 데모는 로컬 서버 + 헤드리스 Chrome 으로 눌러 본다(2026-09-10 과 같은 하네스).

## 6. 딸려오는 것

`src/` 를 고치므로 세트가 붙는다.

- **판 1.7.0** (1.6.1 까지 나갔다) + CHANGELOG 항목
- README 의 `xAxis`·`yAxis` 행, `docs/ai-reference.md` 178번째 줄
- `npm run build` — `dist` 와 `docs/lib` 를 함께 다시 뜬다(`bundle.test.ts` 가
  둘을 바이트로 견준다)
- npm 발행은 사용자가 직접(`npm publish`, CI 에 발행 단계 없음)

## 7. 구현 순서

1. `src/core/types/econplane.ts` — `brokenAt?: number`
2. `src/core/graphs/EconPlane.ts` — `clampAxis` + 두 자리
3. `test/core/fixtures.ts` + `golden.test.ts` — 새 그림 하나
4. 단위 시험 — 축 밖 값 자르기
5. `docs/index.html` — 숫자칸·`isInert`·숫자 규약
6. README·ai-reference·CHANGELOG·`package.json`
7. `npm run verify` → 헤드리스로 데모 확인
