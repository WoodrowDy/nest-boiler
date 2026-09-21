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
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      // 적용된 마이그레이션은 수정하지 않는다 — .prettierignore 와 같은 이유
      "src/database/migrations/**",
    ],
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
      // prettier 설정은 .prettierrc 단일 소스에서 읽는다 (인라인 중복 제거 → 설정 드리프트 방지)
      "prettier/prettier": "error",
      "max-len": ["error", { code: 100, ignoreUrls: true }],
    },
  },

  // ---------- 레이어 경계 강제 (README 아키텍처 규칙의 lint 강제) ----------
  {
    // 엔티티 = 영속성 전용: Swagger/검증/변환 import 금지
    files: ["**/entities/*.entity.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@nestjs/swagger", message: "엔티티는 영속성 전용 — Swagger는 dto로" },
            { name: "class-validator", message: "엔티티는 영속성 전용 — 검증은 dto/shared로" },
            { name: "class-transformer", message: "엔티티는 영속성 전용 — 입력 변환은 dto로" },
          ],
        },
      ],
    },
  },
  {
    // 서비스/레포 = 응답 DTO를 만들지 않음(변환은 컨트롤러 경계 Mapper)
    files: ["**/services/*.ts", "**/repositories/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/dtos/response/*", "**/dto/response/*"],
              message: "서비스/레포는 엔티티를 반환 — 응답 DTO 변환은 컨트롤러 경계(Mapper)에서",
            },
          ],
        },
      ],
    },
  },
  {
    // 매퍼 = 무상태 변환. 조회하지 않는다.
    //
    // ★ 매퍼가 부푸는 첫 단추는 대개 "여기서 한 번만 조회하면 되는데" 다.
    //   한 번 열리면 목록 변환에서 줄마다 도는 N+1 이 조용히 생긴다.
    //   필요한 값은 서비스가 미리 모아서 인자로 넘긴다(줄이 여럿이면 Map 으로).
    files: ["**/mappers/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/repositories/*", "**/services/*"],
              message: "매퍼는 무상태 — 조회가 필요하면 서비스가 모아서 인자로 넘긴다",
            },
          ],
          paths: [
            { name: "typeorm", message: "매퍼는 무상태 — DB 를 모른다" },
            { name: "@nestjs/common", message: "매퍼는 프로바이더가 아니다 — 평범한 객체로 둔다" },
          ],
        },
      ],
      // 비동기가 필요하다는 것은 기다릴 일이 있다는 뜻이고, 그 일은 서비스 것이다.
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionExpression[async=true], ArrowFunctionExpression[async=true]",
          message: "매퍼는 동기 — 비동기가 필요하면 그 일은 서비스 것이다",
        },
      ],
    },
  },
  {
    // 컨트롤러 = HTTP 경계. 데이터 접근을 건너뛰지 않는다.
    //
    // ★ 컨트롤러가 레포를 직접 부르면 서비스 층이 통째로 건너뛰어진다 —
    //   트랜잭션 경계와 존재 검사(404)가 서비스에 있으므로 그것까지 같이 사라진다.
    files: ["**/controllers/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/repositories/*"],
              message: "컨트롤러는 서비스를 통한다 — 트랜잭션 경계와 존재 검사가 서비스에 있다",
            },
          ],
          paths: [{ name: "typeorm", message: "컨트롤러는 DB 를 모른다 — 서비스를 통한다" }],
        },
      ],
    },
  },
];