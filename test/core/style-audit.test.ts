// © 2026 김용현
// 렌더러에 굵기·선 굵기·점선을 다시 박지 못하게 한다.
//
// 양식(exam·classic)이 갈리는 값은 전부 style.ts 토큰이나 파일 안 LOOK 표에 있어야
// 한다. 숫자를 그 자리에 바로 쓰면 그 자리는 양식을 바꿔도 안 바뀐다 — 2.0.0 의
// 토큰화가 막으려던 결함이다. (한 칸짜리 readdirSync 만 쓴다 — 한글 경로)
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = [join(__dirname, '../../src/core/graphs'), join(__dirname, '../../src/core/canvas')];
const FILES = DIRS.flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.ts')).map((f) => join(d, f)));

/** 이 파일들은 토큰을 정의하는 쪽이다 */
const DEFINERS = ['style.ts'];
/** 양식과 상관없는 그림 — 패턴 타일(흰 배경 위 검은 무늬)과 글자 테두리 도우미 */
const ALLOWED_LINE_WIDTH = /patterns\.ts$/;

const RULES: [string, RegExp][] = [
  ["getFont(…, 'bold')", /getFont\([^)]*'bold'/],
  ['`bold ${…}px` 글꼴 문자열', /`bold \$\{/],
  ['ctx.lineWidth = <숫자>', /\.lineWidth\s*=\s*\d/],
  ['setLineDash([<숫자>…])', /setLineDash\(\[\s*\d/],
];

describe('렌더러에 양식 값이 박혀 있지 않다', () => {
  for (const file of FILES) {
    const name = file.split(/[\\/]/).pop()!;
    if (DEFINERS.includes(name)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const [label, re] of RULES) {
      if (label.startsWith('ctx.lineWidth') && ALLOWED_LINE_WIDTH.test(file)) continue;
      it(`${name} — ${label}`, () => {
        const hits = lines
          .map((l, i) => [i + 1, l] as const)
          .filter(([, l]) => re.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*'));
        expect(hits.map(([n, l]) => `${n}: ${l.trim()}`)).toEqual([]);
      });
    }
  }
});
