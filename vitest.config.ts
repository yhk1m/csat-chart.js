// © 2026 김용현
import { defineConfig } from 'vitest/config';

// `vitest run --mode fallback` (npm run test:fallback) — 시험지 글꼴이 없는 CI(우분투)를 흉내 낸다.
// 글꼴 목록을 바꿔 찍으므로 기준 이미지는 건너뛴다. test/setup/fallback-fonts.ts 참고.
export default defineConfig(({ mode }) => ({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup/fallback-fonts.ts'],
    env: mode === 'fallback' ? { FALLBACK_FONTS: process.env.FALLBACK_FONTS ?? '1', SKIP_GOLDEN: '1' } : {},
  },
}));
