// © 2026 김용현
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // src/core 는 다른 앱에서 옮겨 온 층이라 이 저장소의 lint 규칙을 들이대지
  // 않는다. 그쪽을 지키는 수단은 린트가 아니라 골든 이미지다.
  // (1.0.0 은 원본을 한 글자도 고치지 않은 판이었다. 1.1.0 부터는 고치되,
  //  달라진 렌더 결과는 골든 갱신과 CHANGELOG 로 남긴다.)
  { ignores: ['dist/**', 'docs/**', 'src/core/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
