// © 2026 김용현
// 타입이 없는 자바스크립트 사용자를 위한 얕은 모양 검사.
// 값의 타당성은 보지 않는다 — 모양만 본다.
import { CHART_TYPES, REGISTRY, isCsatChartType } from './registry';
import type { CsatChartType } from './types';

export class CsatChartError extends Error {
  constructor(message: string) {
    super(`csat-chart: ${message}`);
    this.name = 'CsatChartError';
  }
}

/**
 * 길이가 고정된 배열 필드. 기본 데이터에서 «몇 개여야 하는가»를 도출할 수 없어
 * (산점도의 점 개수처럼 자유로운 배열과 구별되지 않는다) 확인된 것만 여기 적는다.
 *
 * `scatter.quadrantLabels` 는 타입에 `[string, string, string, string]` 튜플로
 * 박혀 있어 ternary.axisLabels 와 같은 근거로 추가했다 — 렌더러가 아직 이
 * 필드를 읽지 않지만(포팅 원본을 그대로 둔 필드), 타입 계약은 4개를 요구한다.
 */
const FIXED_LENGTHS: Partial<Record<CsatChartType, Record<string, number>>> = {
  climate: { months: 12 },
  'deviation-a': { baseMonths: 12, months: 12 },
  ternary: { axisLabels: 3 },
  scatter: { quadrantLabels: 4 },
};

const KIND_NAMES: Record<string, string> = {
  object: '객체',
  number: '숫자',
  string: '문자열',
  boolean: '불리언',
  undefined: 'undefined',
  function: '함수',
};

function kindOf(v: unknown): string {
  if (Array.isArray(v)) return '배열';
  if (v === null) return 'null';
  return KIND_NAMES[typeof v] ?? typeof v;
}

/**
 * «…이어야 합니다» / «…여야 합니다» 를 받침에 따라 고른다.
 *
 * 하나로 고정하면 «배열여야»·«문자열여야» 같은 문장이 나온다. 한글 음절은
 * (코드 − 0xAC00) % 28 로 받침 유무를 알 수 있고, 한글이 아니면(`null` 처럼)
 * 받침이 있는 것으로 친다 — 개발 문서에서 흔히 쓰는 «null이어야» 쪽이다.
 */
function shouldBe(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasFinal = isHangul ? (last - 0xac00) % 28 !== 0 : true;
  return `${word}${hasFinal ? '이어야' : '여야'} 합니다`;
}

/** 두 문자열의 편집 거리 (Levenshtein) */
function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

function nearestType(input: string): CsatChartType | null {
  let best: CsatChartType | null = null;
  let bestD = Infinity;
  for (const t of CHART_TYPES) {
    const d = distance(input.toLowerCase(), t);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return bestD <= 3 ? best : null;
}

export function assertChartType(type: unknown): asserts type is CsatChartType {
  if (isCsatChartType(type)) return;
  const near = typeof type === 'string' ? nearestType(type) : null;
  throw new CsatChartError(
    `알 수 없는 type ${JSON.stringify(type)}` +
      (near ? ` — 혹시 "${near}"?` : ` — 쓸 수 있는 값: ${CHART_TYPES.join(', ')}`),
  );
}

export function assertChartData(type: CsatChartType, data: unknown): void {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new CsatChartError(
      `type "${type}" 의 data 는 ${shouldBe('객체')} (지금 ${kindOf(data)})`,
    );
  }

  const given = data as Record<string, unknown>;
  // 매핑 타입이라 반환값이 16종의 유니온이다. Record 로 바로 못 좁히므로
  // unknown 을 거친다. 키와 종류만 훑을 것이므로 안전하다.
  const shape = REGISTRY[type].createDefaultData() as unknown as Record<string, unknown>;
  const lengths = FIXED_LENGTHS[type] ?? {};

  for (const key of Object.keys(shape)) {
    if (!(key in given)) {
      // 키 이름 뒤에 «이/가» 를 붙이면 영문 식별자마다 조사가 어긋난다.
      // «항목이» 를 세우면 어떤 키가 와도 문장이 성립한다.
      throw new CsatChartError(`type "${type}" 의 data 에 ${key} 항목이 없습니다`);
    }

    const want = kindOf(shape[key]);
    const got = kindOf(given[key]);
    if (want !== got) {
      // 키 이름 뒤는 «는/은» 대신 콜론을 쓴다 — 영문 식별자에 조사를 붙이지 않는다.
      throw new CsatChartError(
        `type "${type}" 의 data.${key}: ${shouldBe(want)} (지금 ${got})`,
      );
    }

    const n = lengths[key];
    if (n !== undefined) {
      const len = (given[key] as unknown[]).length;
      if (len !== n) {
        throw new CsatChartError(
          `type "${type}" 의 data.${key}: ${n}개여야 합니다 (지금 ${len}개)`,
        );
      }
    }
  }
}
