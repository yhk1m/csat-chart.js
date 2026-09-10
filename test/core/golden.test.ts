// © 2026 김용현
import { describe, it, expect } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { clearCanvas, createDefaultGraphOptions } from '../../src/core/index';
import { CASES, type Renderer } from './fixtures';

const SNAP_DIR = join(__dirname, '__snapshots__');
const W = 800;
const H = 600;

/** 기준 이미지를 새로 쓰려면: UPDATE_GOLDEN=1 npx vitest run */
const UPDATE = process.env.UPDATE_GOLDEN === '1';

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
function optionsFor(name: string) {
  const base = createDefaultGraphOptions();
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
  if (!name.endsWith('LongText')) return base;
  return {
    ...base,
    title: '〈아주 긴 제목 — 캔버스 너비를 훌쩍 넘기는 시험지 제목의 예시 문구입니다〉',
    source: '(아주 긴 출처 표기 — 통계청 국가통계포털 인구총조사 자료)',
    footnotes: ['아주 긴 각주 — 이 문장은 캔버스 너비를 넘도록 일부러 길게 늘여 쓴 설명입니다.'],
  };
}

function render(fn: Renderer, data: unknown, name = ''): Buffer {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  fn(ctx, W, H, data as never, optionsFor(name));
  return canvas.toBuffer('image/png');
}

describe('골든 이미지', () => {
  (SKIP_GOLDEN ? it.skip : it).each(CASES)(
    '%s 렌더 결과가 기준 이미지와 같다',
    (name, fn, makeData) => {
      const actual = render(fn, makeData(), name);
      const snapPath = join(SNAP_DIR, `${name}.png`);

      if (!existsSync(snapPath) || UPDATE) {
        mkdirSync(SNAP_DIR, { recursive: true });
        writeFileSync(snapPath, actual);
        // 기준을 처음 만드는 경우엔 통과시키되, 사람이 눈으로 확인해야 한다.
        return;
      }

      const expected = readFileSync(snapPath);
      expect(
        actual.equals(expected),
        `${name} 렌더 결과가 기준 이미지와 다릅니다. ` +
          `의도한 변경이면 UPDATE_GOLDEN=1 로 기준을 갱신하고 CHANGES.md에 기록하세요.`,
      ).toBe(true);
    },
  );

  it.each(CASES)('%s 는 빈 캔버스가 아니다', (_name, fn, makeData) => {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    // 새 캔버스는 투명 검정이다. 흰색으로 채워야 «흰색이 아닌 픽셀» 이 뜻을 가진다.
    clearCanvas(ctx, W, H);
    fn(ctx, W, H, makeData() as never, optionsFor(_name));

    // 흰 배경 위에 무언가 그려졌는지 — 흰색이 아닌 픽셀이 있는지 본다
    const raw = canvas.getContext('2d').getImageData(0, 0, W, H).data;
    let nonWhite = 0;
    for (let i = 0; i < raw.length; i += 4) {
      if (raw[i] !== 255 || raw[i + 1] !== 255 || raw[i + 2] !== 255) nonWhite++;
    }
    expect(nonWhite).toBeGreaterThan(50);
  });
});
