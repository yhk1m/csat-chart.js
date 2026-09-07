// © 2026 김용현
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // src/core 는 이관층이다. 원본을 한 글자도 고치지 않는 것이 원칙이므로
  // 이 저장소의 lint 규칙을 들이대지 않는다. 그쪽의 검증 수단은 골든 이미지다.
  { ignores: ['dist/**', 'docs/**', 'src/core/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
