// © 2026 김용현
import { describe, it, expect } from 'vitest';
import {
  squarify, wrapLabel, pickLabelLayout, shouldOmitLabel, shouldOmitLayout, resolveDrawSize,
  type TreemapRect,
} from '../../src/core/graphs/TreemapGraph';

const RECT = { x: 0, y: 0, w: 400, h: 300 };

/**
 * 실제 캔버스 없이 글자 수 × 고정 폭으로 너비를 흉내내는 가짜 컨텍스트.
 * `wrapLabel`은 몇 줄로 나눌지만 결정할 뿐 실제 폰트 렌더링은 하지 않으므로
 * 이 정도로도 줄 나눔 로직을 결정적으로(deterministic) 검증할 수 있다.
 */
const CHAR_W = 10;
function fakeCtx(): CanvasRenderingContext2D {
  return {
    measureText: (text: string) => ({ width: text.length * CHAR_W }),
  } as unknown as CanvasRenderingContext2D;
}

describe('squarify', () => {
  it('칸 개수만큼 사각형을 돌려준다', () => {
    expect(squarify([50, 30, 20], RECT)).toHaveLength(3);
  });

  it('사각형 넓이의 합이 전체 넓이와 같다', () => {
    const rects = squarify([50, 30, 12, 8], RECT);
    const area = rects.reduce((s, r) => s + r.w * r.h, 0);

    expect(area).toBeCloseTo(RECT.w * RECT.h, 3);
  });

  it('넓이 비율이 값의 비율과 같다', () => {
    const rects = squarify([60, 40], RECT);
    const total = RECT.w * RECT.h;

    expect((rects[0].w * rects[0].h) / total).toBeCloseTo(0.6, 5);
    expect((rects[1].w * rects[1].h) / total).toBeCloseTo(0.4, 5);
  });

  it('모든 사각형이 주어진 틀 안에 있다', () => {
    for (const r of squarify([40, 25, 15, 10, 6, 4], RECT)) {
      expect(r.x).toBeGreaterThanOrEqual(RECT.x - 1e-6);
      expect(r.y).toBeGreaterThanOrEqual(RECT.y - 1e-6);
      expect(r.x + r.w).toBeLessThanOrEqual(RECT.x + RECT.w + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(RECT.y + RECT.h + 1e-6);
    }
  });

  it('사각형들이 서로 겹치지 않는다', () => {
    const rects = squarify([40, 25, 15, 10, 6, 4], RECT);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const overlapW = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapH = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(Math.min(overlapW, overlapH)).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it('큰 값이 작은 값보다 넓다', () => {
    const rects = squarify([50, 30, 20], RECT);

    expect(rects[0].w * rects[0].h).toBeGreaterThan(rects[1].w * rects[1].h);
    expect(rects[1].w * rects[1].h).toBeGreaterThan(rects[2].w * rects[2].h);
  });

  it('값이 전부 0 이어도 멎지 않는다', () => {
    // ⚠️ 이 렌더러도 동기 루프다. 0 나눗셈으로 Infinity 가 나오면
    // 탭이 멎고 vitest 타임아웃으로도 안 끊긴다 (CLAUDE.md 참조).
    const rects = squarify([0, 0, 0], RECT);

    expect(rects).toHaveLength(3);
    expect(rects.every((r) => Number.isFinite(r.w) && Number.isFinite(r.h))).toBe(true);
  });

  it('틀의 높이가 0 이어도 멎지 않는다', () => {
    const rects = squarify([50, 30], { x: 0, y: 0, w: 400, h: 0 });

    expect(rects).toHaveLength(2);
    expect(rects.every((r) => Number.isFinite(r.w) && Number.isFinite(r.h))).toBe(true);
  });

  it('빈 목록은 빈 배열이다', () => {
    expect(squarify([], RECT)).toEqual([]);
  });

  it('값 하나가 NaN 이어도 나머지 칸은 멀쩡히 채워진다', () => {
    // ⚠️ `Math.max(0, NaN)` 은 `NaN` 이고 `NaN <= 0` 은 `false` 라, 예전에는
    //    값 하나가 NaN 인 것만으로 합계가 NaN 이 되고 조기 반환도 못 잡아
    //    **모든** 칸의 너비가 NaN 이 됐다. 캔버스는 유한하지 않은 인자를
    //    조용히 무시하므로 화면에는 티가 안 난다 — 그래서 더 고약하다.
    const rects = squarify([NaN, 50, 30, 20], RECT);

    expect(rects).toHaveLength(4);
    expect(rects.every((r) => Number.isFinite(r.w) && Number.isFinite(r.h))).toBe(true);
    // NaN 칸만 넓이 0 이고, 나머지 셋이 틀을 남김없이 나눠 갖는다
    expect(rects[0].w * rects[0].h).toBe(0);
    expect(rects.reduce((s, r) => s + r.w * r.h, 0)).toBeCloseTo(RECT.w * RECT.h, 3);
    expect((rects[1].w * rects[1].h) / (RECT.w * RECT.h)).toBeCloseTo(0.5, 5);
  });

  it('값 하나가 Infinity 여도 나머지 칸은 멀쩡히 채워진다', () => {
    const rects = squarify([50, Infinity, 30, 20], RECT);

    expect(rects).toHaveLength(4);
    expect(rects.every((r) => Number.isFinite(r.w) && Number.isFinite(r.h))).toBe(true);
    expect(rects[1].w * rects[1].h).toBe(0);
    expect(rects.reduce((s, r) => s + r.w * r.h, 0)).toBeCloseTo(RECT.w * RECT.h, 3);
    expect((rects[0].w * rects[0].h) / (RECT.w * RECT.h)).toBeCloseTo(0.5, 5);
  });

  it('가운데에 0 이 끼어도 다른 칸의 가로세로비가 망가지지 않는다', () => {
    // ⚠️ 0 이 줄의 **첫** 칸이 되면(첫 바퀴는 break 하지 않으므로 막을 수 없다)
    //    `worstRatio` 가 양쪽 다 Infinity 를 돌려주고 `Infinity > Infinity` 는
    //    false 라 줄이 다시는 닫히지 않는다 — 남은 값이 전부 한 줄로 쓸려
    //    들어가 형제 칸이 가늘고 길게 찌그러진다. 0 칸 자신은 넓이가 없어
    //    안 보이므로 **형제 칸의 가로세로비로만** 알아챌 수 있다.
    const ratio = (r: TreemapRect) => Math.max(r.w, r.h) / Math.min(r.w, r.h);
    const worst = (vals: number[]) =>
      Math.max(...squarify(vals, RECT).filter((r) => r.w > 0 && r.h > 0).map(ratio));

    const base = worst([50, 30, 20, 12, 8]);
    const withZero = worst([50, 0, 30, 20, 12, 8]);

    // 정상 자료는 2:1 안쪽에 들어온다 (squarified treemap 의 존재 이유다)
    expect(base).toBeLessThan(2);
    // 0 을 하나 끼워도 그 수준이 유지되어야 한다. 고치기 전에는 11:1 이었다.
    expect(withZero).toBeLessThan(2);
    expect(withZero).toBeLessThanOrEqual(base * 1.01);
  });

  it('값이 전부 유한하지 않으면 넓이 0 인 칸만 돌려준다', () => {
    const rects = squarify([NaN, Infinity, -Infinity], RECT);

    expect(rects).toHaveLength(3);
    expect(rects.every((r) => r.w === 0 && r.h === 0)).toBe(true);
  });
});

describe('wrapLabel', () => {
  it('폭 안에 들어가면 한 줄 그대로 돌려준다', () => {
    expect(wrapLabel(fakeCtx(), '중국', 100, 3)).toEqual(['중국']);
  });

  it('한 글자짜리는 넘쳐도 나누지 않는다', () => {
    expect(wrapLabel(fakeCtx(), '가', 1, 3)).toEqual(['가']);
  });

  it('maxLines 가 1 이하이면 넘쳐도 나누지 않는다 (호출부가 최후에 축소·maxWidth 로 처리)', () => {
    expect(wrapLabel(fakeCtx(), '사우디아라비아', 30, 1)).toEqual(['사우디아라비아']);
    expect(wrapLabel(fakeCtx(), '사우디아라비아', 30, 0)).toEqual(['사우디아라비아']);
  });

  it('두 줄로 충분하면 두 줄로 고르게 나눈다 (예전 동작과 같다)', () => {
    // 전체 폭 70(7자×10), maxW 60 → ceil(70/60) = 2 줄이면 충분
    expect(wrapLabel(fakeCtx(), '사우디아라비아', 60, 3)).toEqual(['사우디아', '라비아']);
  });

  it('두 줄로도 안 들어가면 필요한 만큼(3줄) 나눈다', () => {
    // 좁은 칸(340×400 패널의 석유 칸 56px)을 흉내낸 값 —
    // 전체 폭 70, maxW 30 → ceil(70/30) = 3 줄이 필요하다.
    expect(wrapLabel(fakeCtx(), '사우디아라비아', 30, 3)).toEqual(['사우디', '아라비', '아']);
  });

  it('필요한 줄 수가 maxLines 를 넘으면 maxLines 로 자른다', () => {
    // 필요 줄 수는 5줄이 넘지만 칸 높이가 2줄만 감당한다면 2줄로 자른다
    expect(wrapLabel(fakeCtx(), '사우디아라비아', 8, 2)).toEqual(['사우디아', '라비아']);
  });

  it('줄 수가 글자 수를 넘지 않는다 (두 글자를 세 줄로 나누지 않는다)', () => {
    expect(wrapLabel(fakeCtx(), '중국', 1, 5)).toEqual(['중', '국']);
  });
});

describe('pickLabelLayout', () => {
  it('칸이 넉넉하면 한 줄, 배율 1을 고른다', () => {
    const layout = pickLabelLayout(fakeCtx(), '중국', 1000, 1000, 24);

    expect(layout).toEqual({ lines: ['중국'], scale: 1 });
  });

  /**
   * 340×400 패널의 `인도네시아`·`러시아`(행 높이 30px 안팎)를 흉내낸 값이다.
   * 옛(순서로 매기는) 방식은 칸 높이만으로 줄 수를 먼저 정했다 —
   * `Math.floor(34 / (24 * 0.6 * 1.2)) = 1` 이라 1줄로 굳어 버리고, 그 1줄이
   * 칸 폭(25)을 훌쩍 넘어(50) `maxWidth`가 장평을 눌렀다.
   *
   * 여기서는 1줄·2줄 각각의 배율을 재서 **2줄(사우디아→사우디/아라비/아 같은
   * 접기)이 하한(0.6)에도 못 미치는 배율(0.59)로도 1줄(0.5)보다 낫다**는 걸
   * 확인한다 — 순서로 매기는 옛 방식은 애초에 2줄을 시도조차 못 해 이 값을
   * 낼 수 없다.
   */
  it('짧고 좁은 칸에서는 하한(0.6) 아래 배율이라도 2줄이 1줄을 이긴다', () => {
    const layout = pickLabelLayout(fakeCtx(), '가나다라마', 25, 34, 24);

    expect(layout.lines).toEqual(['가나다', '라마']);
    expect(layout.scale).toBeCloseTo(0.5903, 3);
    // 옛 하한(0.6)보다 낮다 — 이 경우를 풀려고 하한을 0.6→0.5로 낮췄다.
    expect(layout.scale).toBeLessThan(0.6);
    expect(layout.scale).toBeGreaterThan(0.5);
  });

  it('배율이 같으면 줄이 더 적은 쪽(작은 n)을 고른다', () => {
    // 칸이 아주 넉넉해 1줄·2줄 모두 배율 1로 꽉 찬다 — 그래도 1줄이 읽기 편하다.
    const layout = pickLabelLayout(fakeCtx(), '가나', 1000, 1000, 24);

    expect(layout).toEqual({ lines: ['가나'], scale: 1 });
  });

  /**
   * 상한(4줄)이 없으면 폭만 보고 글자 수만큼(7줄, 한 글자씩) 나누는 쪽이
   * 배율은 더 크게 나온다 — 그게 바로 "좁고 긴 칸이 한 글자씩 세로로
   * 늘어선 라벨"이 되는 경로다. `maxN`을 직접 7로 주면(=상한이 없다고
   * 가정하면) 실제로 한 글자씩 7줄로 쪼개고 배율도 4줄(0.25)보다 높은
   * 0.5가 나오는 것으로 확인한다 — 즉 상한을 두지 않으면 "배율이 더 큰
   * 쪽을 고른다"는 규칙 자체가 한 글자씩 쪼개는 쪽을 선택해 버린다.
   * 기본값(4)을 쓰면 그 경로를 밟지 않고 4줄에서 멈춘다.
   */
  it('줄 수 상한(기본 4)을 넘지 않는다 — 상한이 없으면 한 글자씩 쪼개졌을 상황', () => {
    const capped = pickLabelLayout(fakeCtx(), '가나다라마바사', 5, 10000, 24);
    expect(capped.lines).toEqual(['가나', '다라', '마바', '사']);
    expect(capped.lines.length).toBeLessThanOrEqual(4);
    expect(capped.scale).toBeCloseTo(0.25, 3);

    // 상한을 글자 수(7)까지 풀어 주면 실제로 한 글자씩 쪼개는 쪽이 배율이
    // 더 높아 선택된다는 것을 확인해, 위 결과가 우연이 아니라 상한(4) 덕분임을 보인다.
    const uncapped = pickLabelLayout(fakeCtx(), '가나다라마바사', 5, 10000, 24, 7);
    expect(uncapped.lines).toEqual(['가', '나', '다', '라', '마', '바', '사']);
    expect(uncapped.scale).toBeGreaterThan(capped.scale);
  });

  it('줄 수가 글자 수를 넘지 않는다 (두 글자를 여러 줄로 쪼개지 않는다)', () => {
    // 칸이 극단적으로 작아도(글자 수가 2뿐이라) 2줄까지만 시도한다
    const layout = pickLabelLayout(fakeCtx(), '가나', 1, 1, 24);

    expect(layout.lines.length).toBeLessThanOrEqual(2);
    expect(layout.lines.join('')).toBe('가나');
  });
});

describe('shouldOmitLabel', () => {
  // TreemapGraph.ts 의 비공개 MIN_LEGIBLE_SCALE 과 같은 값. 여기서 다시 적는
  // 이유는 그 상수가 export 되어 있지 않아서다 — 값이 바뀌면 이 테스트가
  // 실패로 그 사실을 알려준다(숨은 동기화가 아니라 드러난 실패로). 근거는
  // TreemapGraph.ts의 MIN_LEGIBLE_SCALE 주석 참고 — 340×400 천연가스 패널의
  // `사우디아라비아`(실측 자연 배율 ≈0.4729)를 살려 두는 값이다.
  const MIN_LEGIBLE_SCALE = 0.4;
  const labelSize = 24;
  const minLabelW = 34;
  // r.h < labelSize * MIN_LEGIBLE_SCALE * 1.2 = 11.52 — 가장 작게 그릴 수
  // 있는 배율(MIN_LEGIBLE_SCALE)로 한 줄만 그려도 들어가는 최소 높이.
  const heightThreshold = labelSize * MIN_LEGIBLE_SCALE * 1.2;

  it('칸이 새 높이 기준(11.52px)보다 크면 라벨을 생략하지 않는다', () => {
    expect(shouldOmitLabel({ x: 0, y: 0, w: 40, h: heightThreshold + 0.1 }, minLabelW, labelSize)).toBe(false);
  });

  it('칸이 새 높이 기준(11.52px)보다 작으면 라벨을 생략한다', () => {
    expect(shouldOmitLabel({ x: 0, y: 0, w: 40, h: heightThreshold - 0.1 }, minLabelW, labelSize)).toBe(true);
  });

  it('높이가 기준과 정확히 같으면 생략하지 않는다 (경계는 포함)', () => {
    expect(shouldOmitLabel({ x: 0, y: 0, w: 40, h: heightThreshold }, minLabelW, labelSize)).toBe(false);
  });

  it('너비 기준(minLabelW)은 그대로다 — 높이가 넉넉해도 너비가 좁으면 생략한다', () => {
    expect(shouldOmitLabel({ x: 0, y: 0, w: minLabelW - 1, h: 200 }, minLabelW, labelSize)).toBe(true);
  });

  /**
   * 실제 문제였던 값이다 — 340×400 천연가스 패널의 `캐나다`·`사우디아라비아`
   * 칸은 행 높이가 25.5px 이다. 옛(맨 처음) 기준(`labelSize * 1.2` = 28.8px)
   * 으로는 생략됐지만(25.5 < 28.8), `pickLabelLayout`은 24px 라벨을 훨씬
   * 작게 줄일 수 있어 실제로는 들어갈 수 있었다. 지금 기준(11.52px)으로도
   * 여전히 생략되지 않는다 — 클램프를 없앤 오늘 수정과 무관하게 유지된다.
   */
  it('340×400 패널의 캐나다·사우디아라비아 칸(행 높이 25.5px)이 여전히 생략되지 않는다', () => {
    const oldThreshold = labelSize * 1.2; // 28.8 — 맨 처음(축소 도입 전) 기준
    const rowHeight = 25.5;

    expect(rowHeight).toBeLessThan(oldThreshold); // 그 옛 기준으로는 생략 대상이었다
    expect(shouldOmitLabel({ x: 0, y: 0, w: 60, h: rowHeight }, minLabelW, labelSize)).toBe(false);
  });

  /**
   * 기준 높이(11.52px)에 정확히 걸린 칸에서 `pickLabelLayout`이 고른 배율로
   * (하한으로 밀어 올리지 않고 그대로) 그렸을 때, 실제로 그려지는 줄 높이가
   * 칸 높이를 넘지 않는지 확인한다. 너비 쪽은 라벨(3자)이 넉넉히 들어가는
   * 값(avail=40)을 써서 1줄로 자연스럽게 고정하고, 높이만 경계에 딱 맞춘다.
   *
   * 이 경계에서는 `byHeight(1) = heightThreshold / (24*1.2)` 가 정확히
   * `MIN_LEGIBLE_SCALE` 이 되므로 — `shouldOmitLayout`이 "생략하지 않는다"고
   * 판정하는 것과도 정확히 맞아떨어진다(경계는 포함이므로 생략 대상이 아니다).
   */
  it('기준 높이 칸에서 pickLabelLayout 이 고른 크기(하한으로 밀어 올리지 않은 채)가 칸을 넘치지 않는다', () => {
    const layout = pickLabelLayout(fakeCtx(), '캐나다', 40, heightThreshold, labelSize);
    const drawSize = resolveDrawSize(labelSize, layout);
    const neededH = layout.lines.length * drawSize * 1.2;

    expect(layout.lines).toEqual(['캐나다']);
    expect(layout.scale).toBeCloseTo(MIN_LEGIBLE_SCALE, 5);
    expect(drawSize).toBeCloseTo(labelSize * MIN_LEGIBLE_SCALE, 5);
    expect(shouldOmitLayout(layout)).toBe(false); // 경계값은 생략 대상이 아니다
    // 경계값이라 정확히 같다 — 그보다 커지면(부동소수 오차 제외) 넘친다.
    expect(neededH).toBeLessThanOrEqual(heightThreshold + 1e-9);
    expect(neededH).toBeCloseTo(heightThreshold, 5);
  });
});

describe('resolveDrawSize · shouldOmitLayout — 클램프를 없애고 생략으로 바꾼 부분', () => {
  // TreemapGraph.ts 의 비공개 MIN_LEGIBLE_SCALE 과 같은 값 (근거는 그 상수의 주석 참고)
  const MIN_LEGIBLE_SCALE = 0.4;
  const OLD_FLOOR = 0.5; // 2026-08-18 이전에 쓰던 클램프 하한 — 되돌림 검증용으로만 쓴다
  const labelSize = 24;

  /**
   * 340×400 천연가스 패널의 `사우디아라비아`(실측 자연 배율 ≈0.4729, 옛
   * 하한 0.5보다 낮다)를 흉내낸 값이다 — 폭이 배율을 정하는 1줄 케이스.
   * avail=30, cellH=13 (fakeCtx의 CHAR_W=10, 7자 라벨) 에서 `pickLabelLayout`은
   * 1줄·배율 30/70=0.42857을 고른다(2·3·4줄은 칸이 얕아 오히려 더 작아진다).
   */
  it('자연 배율이 옛 하한(0.5)보다 낮아도 하한으로 밀어 올리지 않고 자연 크기 그대로 그린다 — 그린 줄 폭이 avail 안에 든다', () => {
    const avail = 30;
    const cellH = 13;
    const text = '가나다라마바사'; // 7자

    const layout = pickLabelLayout(fakeCtx(), text, avail, cellH, labelSize);

    expect(layout.lines).toEqual([text]); // 1줄이 이긴다 (칸이 얕아 여러 줄은 더 작아진다)
    expect(layout.scale).toBeCloseTo(30 / 70, 5);
    expect(layout.scale).toBeLessThan(OLD_FLOOR); // 옛 클램프였다면 밀어 올려졌을 값
    expect(layout.scale).toBeGreaterThanOrEqual(MIN_LEGIBLE_SCALE); // 새 하한(생략 기준)은 넘는다
    expect(shouldOmitLayout(layout)).toBe(false); // 그래서 생략 대상이 아니다 — 그려야 한다

    const drawSize = resolveDrawSize(labelSize, layout);
    // ⚠️ 하한으로 밀어 올리는 옛 클램프를 되돌리면 이 값이 12(=24*0.5)로
    // 나와 아래 두 단언이 실패한다 — 이게 이번 수정의 핵심 단언이다.
    expect(drawSize).toBeCloseTo(labelSize * layout.scale, 6);
    expect(drawSize).toBeLessThan(labelSize * OLD_FLOOR);

    const widestAtLabelSize = text.length * CHAR_W; // fakeCtx: 글자 수 × 고정폭
    const drawnWidth = widestAtLabelSize * (drawSize / labelSize);
    expect(drawnWidth).toBeLessThanOrEqual(avail + 1e-9); // 실제로 그릴 줄 폭이 칸 폭을 넘지 않는다

    // 대조: 옛 클램프(하한 0.5)를 그대로 적용했다면 폭이 avail을 넘어
    // maxWidth가 장평을 눌렀을 것이다 — 오늘 고친 결함 그 자체다.
    const oldDrawSize = Math.max(labelSize * OLD_FLOOR, labelSize * layout.scale);
    const oldDrawnWidth = widestAtLabelSize * (oldDrawSize / labelSize);
    expect(oldDrawnWidth).toBeGreaterThan(avail);
  });

  /**
   * 이전 라운드(CHANGES.md 2026-08-17 「5)」)가 브루트포스로 찾아 "오늘은
   * 손대지 않는다"고 남겨 둔 세로 넘침 사례를 직접 구성한다 — 좁은 칸이라
   * `pickLabelLayout`이 4줄을 고르는데, 그 자연 배율(≈0.421)이 옛 하한(0.5)
   * 보다 낮아 클램프가 걸렸다면 세로로 넘쳤을 경우다.
   */
  it('여러 줄을 고른 좁고 짧은 칸(세로 넘침 사례)도 하한으로 밀어 올리지 않아 칸 높이를 넘지 않는다', () => {
    const avail = 8.5;
    const cellH = 48.5;
    const text = '가나다라마바사';

    const layout = pickLabelLayout(fakeCtx(), text, avail, cellH, labelSize);

    expect(layout.lines).toEqual(['가나', '다라', '마바', '사']); // 4줄
    expect(layout.scale).toBeCloseTo(0.4210069444444445, 6);
    expect(layout.scale).toBeLessThan(OLD_FLOOR); // 옛 클램프를 건드렸을 값
    expect(layout.scale).toBeGreaterThanOrEqual(MIN_LEGIBLE_SCALE);
    expect(shouldOmitLayout(layout)).toBe(false);

    const drawSize = resolveDrawSize(labelSize, layout);
    const neededH = layout.lines.length * drawSize * 1.2;
    // ⚠️ 클램프를 되돌리면 drawSize가 12로 고정돼 neededH가 57.6이 되어
    // 아래 단언이 실패한다(48.5보다 크다) — 이게 세로 넘침 결함의 재현이다.
    expect(neededH).toBeLessThanOrEqual(cellH + 1e-9);

    // 대조: 옛 클램프(하한 0.5)를 적용하면 실제로 칸 높이를 넘친다.
    const oldDrawSize = Math.max(labelSize * OLD_FLOOR, labelSize * layout.scale);
    const oldNeededH = layout.lines.length * oldDrawSize * 1.2;
    expect(oldNeededH).toBeGreaterThan(cellH);
    expect(oldNeededH / cellH).toBeGreaterThan(1.15); // 15% 이상 넘친다 — 사소한 오차가 아니다
  });

  it('배율이 새 하한(생략 기준)보다 낮으면 생략한다', () => {
    expect(shouldOmitLayout({ lines: ['가'], scale: MIN_LEGIBLE_SCALE - 0.01 })).toBe(true);
  });

  it('배율이 새 하한과 같거나 크면 생략하지 않는다 (경계는 포함)', () => {
    expect(shouldOmitLayout({ lines: ['가'], scale: MIN_LEGIBLE_SCALE })).toBe(false);
    expect(shouldOmitLayout({ lines: ['가'], scale: MIN_LEGIBLE_SCALE + 0.01 })).toBe(false);
  });

  it('아주 좁고 짧은 칸 — pickLabelLayout이 실제로 하한 밑의 배율을 고르면 생략 대상이 된다', () => {
    const layout = pickLabelLayout(fakeCtx(), '가나다라마바사', 6, 20, labelSize);

    expect(layout.scale).toBeLessThan(MIN_LEGIBLE_SCALE);
    expect(shouldOmitLayout(layout)).toBe(true);
  });

  /**
   * 위 "자연 배율이 옛 하한보다 낮아도…" 테스트와 같은 칸(avail=30, cellH=13)
   * — 자연 배율 0.42857이 새 하한(0.4)보다 살짝 위다. 실제 천연가스 패널의
   * `사우디아라비아`(실측 자연 배율 ≈0.4729)와 같은 종류의 경계 사례:
   * 하한보다 살짝 위면 생략하지 않고 그린다.
   */
  it('하한보다 살짝 위인 배율(사우디아라비아 칸과 같은 종류)은 생략하지 않는다', () => {
    const layout = pickLabelLayout(fakeCtx(), '가나다라마바사', 30, 13, labelSize);

    expect(layout.scale).toBeGreaterThan(MIN_LEGIBLE_SCALE);
    expect(shouldOmitLayout(layout)).toBe(false);
  });
});
