// © 2026 김용현
import { defineConfig } from 'vitest/config';

// `vitest run --mode fallback` (npm run test:fallback) — 시험지 글꼴이 없는 CI(우분투)를 흉내 낸다.
// 글꼴 목록을 바꿔 찍으므로 기준 이미지는 건너뛴다. test/setup/fallback-fonts.ts 참고.
export default defineConfig(({ mode }) => ({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup/fallback-fonts.ts'],
    // `--mode fallback-batang` — 글꼴 목록 전체를 바탕(Batang) 하나로. 「bottom」 기준선에서 괄호 잉크가
    // 기준선 위에서 끝나는 글꼴이라 리눅스 CI 의 단위·눈금 틈 실패(run 37750161563)를 재현한다
    env: mode === 'fallback' ? { FALLBACK_FONTS: process.env.FALLBACK_FONTS ?? '1', SKIP_GOLDEN: '1' }
      : mode === 'fallback-batang' ? { FALLBACK_FONTS: 'Batang', SKIP_GOLDEN: '1' } : {},
  },
}));
