// © 2026 김용현
// FALLBACK_FONTS — CI(우분투)처럼 시험지 글꼴(HY중고딕·HY신명조·Garamond·Times New Roman …)이
// 없는 기계를 흉내 낸다. 글꼴에 기대는 배치 결함을 로컬에서 잡는다 (`npm run test:fallback`).
//   FALLBACK_FONTS=1         글꼴 목록의 이름 붙은 글꼴을 모두 지운다 — 일반 글꼴(serif·sans-serif) + 한글 대체
//   FALLBACK_FONTS=<글꼴 이름> 글꼴 목록 전체를 그 글꼴 하나로 바꾼다 (예: 'Noto Serif KR')
import { createCanvas } from '@napi-rs/canvas';

const mode = process.env.FALLBACK_FONTS;
/**
 * 목록 끝 글꼴 — 한글이 없는 'Segoe UI' 를 두면 한글은 Skia 의 시스템 대체로 간다. 윈도에서 CI 실패
 * (run 37711801881: 막대 안쪽 범례 660.49 / 650.95, rightLeader 유도선)를 거의 같은 수치로 재현한다.
 * FALLBACK_HANGUL 로 바꿀 수 있다.
 */
const HANGUL = `'${process.env.FALLBACK_HANGUL ?? 'Segoe UI'}'`;

if (mode && mode !== '0') {
  const generic = /^(serif|sans-serif|monospace)$/i;
  let proto = Object.getPrototypeOf(createCanvas(1, 1).getContext('2d'));
  let desc: PropertyDescriptor | undefined;
  while (proto && !(desc = Object.getOwnPropertyDescriptor(proto, 'font'))) proto = Object.getPrototypeOf(proto);
  if (!proto || !desc?.set) throw new Error('FALLBACK_FONTS: ctx.font 설정자를 찾지 못했다');
  const { get, set } = desc;
  // 읽을 때는 렌더러가 넣은 글꼴 문자열 그대로 — 글꼴 문자열을 보는 시험은 그대로 돈다
  const asked = new WeakMap<object, string>();
  const swap = (v: string) => {
    // «bold 12px 'A', 'B', serif» — 크기 뒤 글꼴 목록만 바꾼다
    const m = /^(.*?\d+(?:\.\d+)?px(?:\/\S+)?\s+)(.*)$/.exec(v);
    if (!m) return v;
    if (mode !== '1') return `${m[1]}'${mode}'`;
    const kept = m[2].split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, '')).filter((f) => generic.test(f));
    // 리눅스처럼 한글은 시험지 글꼴이 아닌 시스템 대체 글꼴에서 온다 — 일반 글꼴만 두면 윈도에선 두부(□)다
    return `${m[1]}${kept.length ? kept.join(', ') : 'sans-serif'}, ${HANGUL}`;
  };
  Object.defineProperty(proto, 'font', {
    ...desc,
    get(this: object) {
      return asked.get(this) ?? get!.call(this);
    },
    set(this: object, v: string) {
      set.call(this, swap(String(v)));
      asked.set(this, String(v));
    },
  });
  // save()/restore() 도 읽는 값을 함께 되돌린다
  const stacks = new WeakMap<object, (string | undefined)[]>();
  const { save, restore } = proto as { save: () => void; restore: () => void };
  (proto as { save: () => void }).save = function (this: object) {
    if (!stacks.has(this)) stacks.set(this, []);
    stacks.get(this)!.push(asked.get(this));
    save.call(this);
  };
  (proto as { restore: () => void }).restore = function (this: object) {
    const st = stacks.get(this);
    if (st && st.length) {
      const v = st.pop();
      if (v === undefined) asked.delete(this); else asked.set(this, v);
    }
    restore.call(this);
  };
}
