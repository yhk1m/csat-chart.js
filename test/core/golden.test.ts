// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { clearCanvas, createDefaultGraphOptions, type StyleName } from '../../src/core/index';
import { CASES, EXAM_ONLY_CASES, type Renderer } from './fixtures';

const SNAP_DIR = join(__dirname, '__snapshots__');
const W = 800;
const H = 600;
/** classic 43장은 1.7.0 모양의 증거로 그대로(2.2.0 의 새 그림 5장은 GeoTester 그림 그대로), exam 은 2.0.0 기본 모양 */
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

/**
 * 기준 이미지는 **글꼴 대체 결과에 의존한다.** @napi-rs/canvas 는 등록된 글꼴이
 * 없으면 시스템 기본 글꼴로 그리므로, 기계가 바뀌면 픽셀이 달라진다.
 * 그래서 CI 에서는 건너뛴다 (`SKIP_GOLDEN=1`). 이식 검증은 저자 기계에서 한다.
 * 글꼴과 무관한 «빈 캔버스가 아니다» 검사는 늘 돌린다.
 */
const SKIP_GOLDEN = process.env.SKIP_GOLDEN === '1';

/**
 * 케이스 이름이 LongText 로 끝나면 제목·각주를 캔버스보다 길게 준다.
 * 글자가 잘리지 않고 줄어드는지 보기 위한 것이다.
 */
function optionsFor(name: string, style: StyleName) {
  const base = { ...createDefaultGraphOptions(style), style };
  // 시험지 틀 케이스는 출처·각주를 한 줄에 두는 배치(sourceInline)까지 감시한다
  if (name.endsWith('ExamFrame')) {
    return {
      ...base,
      source: '(기상청)',
      footnotes: ['1991~2020년의 평년값임.'],
      sourceInline: true,
    };
  }
  // 꺾은선 시험지 두 장 — 각주·출처 인라인, 한 장은 제목까지
  if (name === 'lineLeader') {
    return {
      ...base,
      source: '(국가데이터처)',
      footnotes: ['각 지역의 2000년 인구를 100으로 했을 때의 상댓값임.', '2020년 행정 구역을 기준으로 함.'],
      sourceInline: true,
    };
  }
  if (name === 'lineEndExam') {
    return {
      ...base,
      title: '〈권역별 인구 변화〉',
      source: '(통계청)',
      footnotes: ['각 권역의 2005년 인구를 100으로 했을 때의 상댓값임.'],
      sourceInline: true,
    };
  }
  // 제목·각주가 있는 틀 — 위아래 눈금 글자(좌표 평면의 90°N·90°S)와 겹치지 않는지 본다 (2.2.0)
  if (name.endsWith('Titled')) {
    return {
      ...base,
      title: '〈(가)~(라) 지역의 경·위도 좌표〉',
      footnotes: ['점은 각 지역의 위치를 나타냄.'],
    };
  }
  // 범례 쪽을 적은 그림 (exam 만, 2.1.0)
  if (name.endsWith('LegendRight')) return { ...base, legendPosition: 'right' as const };
  if (name.endsWith('LegendBottom')) return { ...base, legendPosition: 'bottom' as const };
  // 원그래프 — 조각 안 값 라벨(어두운 조각은 흰 글자)까지 감시한다
  if (name === 'stackedPie') return { ...base, showDataLabels: true };
  if (!name.endsWith('LongText')) return base;
  return {
    ...base,
    title: '〈아주 긴 제목 — 캔버스 너비를 훌쩍 넘기는 시험지 제목의 예시 문구입니다〉',
    source: '(아주 긴 출처 표기 — 통계청 국가통계포털 인구총조사 자료)',
    footnotes: ['아주 긴 각주 — 이 문장은 캔버스 너비를 넘도록 일부러 길게 늘여 쓴 설명입니다.'],
  };
}

function render(fn: Renderer, data: unknown, name: string, style: StyleName): Buffer {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  fn(ctx, W, H, data as never, optionsFor(name, style));
  return canvas.toBuffer('image/png');
}

describe.each(SETS)('골든 이미지 — %s', (style, dir) => {
  // classic 은 43장(+ 2.2.0 의 5장) 그대로, exam 은 legendPosition 을 적은 그림이 더 있다
  const cases = style === 'exam' ? [...CASES, ...EXAM_ONLY_CASES] : CASES;
  (SKIP_GOLDEN ? it.skip : it).each(cases)(
    '%s 렌더 결과가 기준 이미지와 같다',
    (name, fn, makeData) => {
      const actual = render(fn, makeData(), name, style);
      const snapPath = join(dir, `${name}.png`);

      if (!existsSync(snapPath) || updates(style)) {
        // 한 칸만 만든다 — 이 PC 의 한글 경로에서 recursive 는 깨진다
        if (!existsSync(dir)) mkdirSync(dir);
        writeFileSync(snapPath, actual);
        // 기준을 처음 만드는 경우엔 통과시키되, 사람이 눈으로 확인해야 한다.
        return;
      }

      const expected = readFileSync(snapPath);
      expect(
        actual.equals(expected),
        `${name} 렌더 결과가 기준 이미지와 다릅니다. ` +
          `의도한 변경이면 UPDATE_GOLDEN=${style} 로 기준을 갱신하고 CHANGELOG.md에 기록하세요.`,
      ).toBe(true);
    },
  );

  it.each(cases)('%s 는 빈 캔버스가 아니다', (_name, fn, makeData) => {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    // 새 캔버스는 투명 검정이다. 흰색으로 채워야 «흰색이 아닌 픽셀» 이 뜻을 가진다.
    clearCanvas(ctx, W, H);
    fn(ctx, W, H, makeData() as never, optionsFor(_name, style));

    // 흰 배경 위에 무언가 그려졌는지 — 흰색이 아닌 픽셀이 있는지 본다
    const raw = canvas.getContext('2d').getImageData(0, 0, W, H).data;
    let nonWhite = 0;
    for (let i = 0; i < raw.length; i += 4) {
      if (raw[i] !== 255 || raw[i + 1] !== 255 || raw[i + 2] !== 255) nonWhite++;
    }
    expect(nonWhite).toBeGreaterThan(50);
  });
});
