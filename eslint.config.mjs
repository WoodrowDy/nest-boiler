import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },
  ...compat.extends("plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"),
  // unicorn 권장 규칙 전체 ON (flat config 포맷). 아래 커스텀 블록에서 NestJS에 맞게 일부 override
  eslintPluginUnicorn.configs["flat/recommended"],
  {
    files: ["**/*.{ts,js}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      prettier: prettierPlugin,
      // unicorn 플러그인은 위 flat/recommended 에서 이미 등록됨 (중복 등록 금지)
    },
    rules: {
      // ---------- NestJS 환경에 맞춘 unicorn override ----------
      // 약어 강제(req/res/params/dto/db/env 등) → NestJS에선 너무 시끄러워서 off
      "unicorn/prevent-abbreviations": "off",
      // null 금지 → TypeORM/DTO/class-validator에서 null 빈번 → off
      "unicorn/no-null": "off",
      // ESM 강제(require/__dirname 금지) → Nest는 CJS로 컴파일 → off
      "unicorn/prefer-module": "off",
      // 부트스트랩 패턴(bootstrap().then 등)과 충돌 → off
      "unicorn/prefer-top-level-await": "off",
      // import * as path 스타일 막음 → 프로젝트 관용구 유지 위해 off
      "unicorn/import-style": "off",
      // 취향성 강제 규칙 완화
      "unicorn/no-array-reduce": "off",
      "unicorn/no-array-for-each": "off",
      "unicorn/prefer-event-target": "off",
      // 파일명: NestJS 컨벤션(kebab-case) 강제. 단 TypeORM 마이그레이션 파일은 예외
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
          ignore: ["^\\d+-.+\\.ts$"],
        },
      ],
      // prefer-node-protocol 등 나머지 권장 규칙은 유지 (예: import "path" → "node:path" 자동수정)
      // --------------------------------------------------------
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "prettier/prettier": [
        "error",
        {
          singleQuote: false,
          trailingComma: "all",
          printWidth: 100,
          tabWidth: 2,
          semi: true,
        },
      ],
      "max-len": ["error", { code: 100, ignoreUrls: true }],
    },
  },
];