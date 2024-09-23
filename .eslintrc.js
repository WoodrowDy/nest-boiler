import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

export default [
  {
    // TypeScript 파일에 대한 설정
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,  // ECMAScript 버전 설정
      sourceType: 'module', // 모듈 시스템 사용
      parser: '@typescript-eslint/parser', // parser 설정은 여기에
      parserOptions: {
        project: './tsconfig.json', // TypeScript 프로젝트 설정
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // 규칙 설정
    },
  },
  // Prettier 관련 설정 포함
  ...compat.extends('plugin:prettier/recommended'),
];
