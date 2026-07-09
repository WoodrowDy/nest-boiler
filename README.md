# backend-nestjs

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## 소개

이 애플리케이션은 NestJS 기반의 백엔드 서버로, 효율적이고 확장성 있는 서버 애플리케이션을 구축하기 위해 설계되었습니다.

## 프로젝트 구조

- 본 프로젝트는 DDD 패턴을 참고하여, 도메인별로 디렉토리를 분리하여 관리합니다.

```bash
backend-nestjs/
|-- src/
|   |-- app.controller.ts
|   |-- app.module.ts
|   |-- app.service.ts
|   |-- main.ts
|   |-- database/
|   |   |-- config/           # 데이터베이스 설정
|   |   |-- entity/           # 공통 엔티티
|   |   |-- migrations/       # 마이그레이션 파일
|   |   |-- seeds/            # 시드 데이터
|   |-- domain/
|   |   |-- static-board/     # 예시 static-board 도메인
|   |       |-- controllers/  # 컨트롤러
|   |       |-- dtos/         # DTO
|   |       |-- entities/     # 엔티티
|   |       |-- repositories/ # 레포지토리
|   |       |-- services/     # 서비스
|   |       |-- seeds/        # 도메인별 시드
|   |-- shared/               # 공통 모듈, 상수, 데코레이터 등
|-- test/                     # 테스트 코드
    |-- utils/                # 테스트 환경 변수 및 앱 실행 헬퍼 함수 등
    |-- domain/
        |-- fixture           # 실제 API 호출 함수 모음
        |-- mocks             # 테스트용 목 데이터
        |-- scenarios         # 실제 테스트 시나리오 코드
|-- package.json
|-- README.md
```

## 레이어 아키텍처 규칙 (Entity / DTO / Mapper)

도메인 단위로 폴더를 나누되(package by domain), 내부는 계층형 서비스 아키텍처를 따릅니다.
각 계층이 **무엇을 받고 무엇을 반환하는지**와 **어디에 정의하는지**를 아래 규칙으로 고정합니다.
`static-board` 도메인이 참조 구현입니다.

### 핵심 원칙

- **엔티티 = 영속성 전용**: `@Column`·`@Index`·라이프사이클 훅만. `@ApiProperty`(Swagger)·`class-validator`(검증)·`@Transform`(입력 변환)을 두지 않습니다.
- **검증 + Swagger의 단일 소스 = `dtos/shared` 필드 DTO**. request/response는 여기서 `PickType`/`PartialType` 등으로 파생합니다. (엔티티에서 파생하지 않음)
- **응답 DTO = 순수 데이터**: 행위/포맷 메서드를 두지 않습니다. 필요하면 util 또는 mapper로.
- **서비스는 HTTP 응답 DTO를 반환하지 않습니다**: 엔티티/도메인 모델을 반환하고, 엔티티→응답 변환은 **컨트롤러 경계에서 Mapper**로 수행합니다.
- **Repository는 엔티티만** 다룹니다(DTO를 모름). 반환 타입은 항상 `Entity`/`Entity[]`.
- **공통 audit 응답 필드**(id/createdAt/updatedAt/deletedAt)는 `AuditResponse`(`src/global/dtos/audit.response.ts`) 한 곳에서 소유합니다.

### 계층별 역할

| 계층 | 입력 | 출력 | 정의 위치 |
| --- | --- | --- | --- |
| Controller | Request DTO | Response DTO | `dtos/request`, `dtos/response` |
| Service | Request payload/query | Entity / 도메인 모델 | `services/` |
| Repository | 조회 파라미터 / Entity | Entity | `repositories/` |
| Mapper | Entity | Response DTO | `mappers/` |
| Entity | — | — | `entities/` (영속성 전용) |
| 필드 계약(공유) | — | — | `dtos/shared/` |
| Audit 응답 | — | — | `src/global/dtos/audit.response.ts` |

### 데이터 흐름

```
Controller(payload/query)
  → Service(Entity 반환)
    → Repository(Entity)
  → Controller 가 Mapper 로 Entity → Response 변환
```

### 도메인 폴더 구조

```
domain/<name>/
  controllers/
  services/
  repositories/
  entities/          # 영속성 전용 (@Column/@Index/훅)
  dtos/
    shared/          # 필드 계약 = 검증+Swagger 단일 소스 (엔티티 아님)
    request/         # 입력 (payload / query)
    response/        # 출력 (순수 데이터)
  mappers/           # Entity ↔ DTO 무상태 변환
```

> **파일명 권장**: 입력 `*.payload.ts` / `*.query.ts`, 출력 `*.response.ts`, 공유 `*-fields.dto.ts`.

### VO (선택)

**현재는 도입하지 않습니다**(도메인 모델 anemic 유지). 불변식이 필요한 도메인 값(예: `PhoneNumber`)이 실제로 필요해지면 그때 `vo/`에 도입하세요.
참고로 **DTO는 경계(transport) 타입, VO는 도메인 값**으로 서로 다른 레이어입니다.

### 규칙 강제 (ESLint)

위 레이어 규칙 중 **기계로 강제 가능한 것은 산문이 아니라 lint로** 막습니다 (`eslint.config.mjs`).

- **엔티티**(`**/entities/*.entity.ts`): `@nestjs/swagger`·`class-validator`·`class-transformer` import 금지 → 엔티티에 API/검증/변환 지식이 새는 것을 차단.
- **서비스·레포**(`**/services/*.ts`, `**/repositories/*.ts`): `dtos/response/**` import 금지 → 응답 DTO는 컨트롤러 경계의 Mapper에서만 생성.
- 위반 시 `eslint`/pre-commit 에서 에러로 차단됩니다. (규칙 = 자동 강제, README는 근거만 기술)

> Prettier 설정은 `.prettierrc` **단일 소스**로 통일(eslint 인라인 옵션 제거)하여 에디터↔lint 포맷 충돌을 방지합니다.

### 트랜잭션 & 영속성

- **트랜잭션 경계는 서비스**입니다. 레포는 트랜잭션을 소유하지 않고 참여만 — 각 메서드가 `transactionManager?`를 받아 `const manager = transactionManager ?? this.manager`로 매니저를 해석합니다.
  - 외부 tx(`transactionManager`)를 받으면 그대로 합류해 실행(commit/rollback/release는 소유자 몫). 없으면 — 단건 op → 트랜잭션 없이 호출(단일 statement는 원자적), 다단계/락 → 서비스가 새 트랜잭션(`createQueryRunner()` → connect → startTransaction → commit/rollback → release)을 열어 각 레포에 매니저를 전달해 한 트랜잭션 공유.
- **엔티티 훅 vs 쿼리 메서드**: `@BeforeInsert`/`@BeforeUpdate`는 **엔티티 기반 op(`save`/`softRemove`)에서만** 실행됩니다. 쿼리빌더 op(`update`/`insert`/`delete`/`softDelete`)는 훅을 건너뜁니다. `create()`는 인스턴스만 만들 뿐 훅을 태우지 않습니다.
- **입력 정규화는 엔티티 훅이 아니라 DTO `@Transform`으로** 처리합니다 — 경로 독립적(save/update/seed 무관)이고 엔티티를 순수하게 유지. 예: 전화번호는 `normalizePhone`(`src/global/helpers/phone.helper.ts`)을 DTO `@Transform`과 시드가 공유합니다.

### 응답 & 관측성

- 성공 응답은 `ObjectResponse`(`{ row, meta }`)/`ListResponse`(`{ rows, count, meta }`)로 래핑됩니다. `meta = { traceId, timestamp }`.
- **traceId**: `TraceIdMiddleware`가 요청마다 부여(유입 `X-Request-Id` 우선, 없으면 UUID) → `AsyncLocalStorage`에 저장 → 응답 헤더 `X-Request-Id`로 반환.
- **로깅**: winston(`app.useLogger`) — 모든 로그 라인에 traceId 자동 부착. 액세스 로그는 `RequestLoggerMiddleware`(`HTTP REQ`)와 `ResponseLoggerInterceptor`(`HTTP RES`, 상태코드+소요시간, 레벨 info/warn/error 분기).
- **Swagger**: `@ApiDoc` 데코레이터가 성공 응답 + **표준 에러 응답(400/401/403/404/500)** 을 자동 문서화. `/api-docs`.

## 기술 스택

- **언어**: TypeScript
- **프레임워크**: NestJS
- **데이터베이스**: PostgreSQL, TypeORM
- **테스트**: Jest
- **API 문서화**: Swagger
- **배포/운영**: AWS

## API 문서

| 환경     | 바로가기                                                             |
| -------- | -------------------------------------------------------------------- |
| **로컬** | [Swagger (localhost)](http://localhost:3000/api-docs)                |
| **개발** | [Swagger (dev)](https://dev-api.yourdomain.com/api-docs) (설정 필요) |
| **운영** | [Swagger (prod)](https://api.yourdomain.com/api-docs) (설정 필요)    |

## 설치 및 실행

### 최초 실행 (first run)

```bash
# 1) 의존성 설치
pnpm install

# 2) 환경변수 준비 (git 에 없는 파일이므로 example 에서 복사)
cp envs/.env.docker.example envs/.env.docker   # 로컬 DB 컨테이너 자격증명
cp envs/.env.local.example  envs/.env.local    # 앱 로컬 환경변수

# 3) 로컬 Postgres(docker) 기동
pnpm db:up

# 4) 스키마 생성 (마이그레이션)
pnpm migration:run

# 5) (선택) 시드 데이터 주입
pnpm seed:run

# 6) 개발 서버 실행
pnpm run start:local
```

> DB 상세(마이그레이션/시드/도커)는 [`src/database/README.md`](src/database/README.md) 참고.

### 일반 실행

```bash
# 로컬 서버 실행
pnpm run start:local

# 필요 시, 환경에 맞게 cross-env 활용
```

## 테스트

```bash
# 단위 테스트
pnpm run test:local

# e2e 테스트
pnpm run test:e2e

# 커버리지
pnpm run test:cov
```

## 환경 변수

- 환경 변수는 `envs/` 디렉토리 및 `.env` 파일을 통해 관리합니다.

## 마이그레이션 및 시드

- TypeORM 마이그레이션 및 시드 데이터는 `src/database/migrations/`, `src/database/seeds/`에서 관리합니다.
- 자세한 사용법은 `src/database/README.md`를 참고하세요.

### 마이그레이션 규칙

- **생성 방식 구분**: 엔티티 스키마 변경 → `pnpm migration:generate`(자동 생성), 데이터 이관·수동 SQL → `pnpm migration:create`(빈 파일 직접 작성).
- **자동 생성물은 반드시 리뷰**: `migration:generate` 결과를 그대로 믿지 말고 up/down SQL을 확인한 뒤 커밋합니다.
- **단순 컬럼 변경은 `ALTER`(modify) 우선**: 단순 변경인데 `DROP`+`ADD`(데이터 손실)로 생성됐다면, 룰에 저촉되지 않는 한 in-place `ALTER`로 손수 고칩니다. (TypeORM 자동 판단이라 사람이 리뷰하는 영역)
- **적용된 마이그레이션은 사후 수정 금지**: 이미 반영된 파일은 고치지 말고 항상 **새 마이그레이션**으로 보정합니다(협업·운영 일관성). VS Code에서는 `src/database/migrations/**`가 **읽기전용**(`.vscode/settings.json`의 `files.readonlyInclude`)이라, 실수로 편집하려 하면 에디터가 막습니다. 정말 고쳐야 하면(예: 생성된 마이그레이션의 `DROP`+`ADD`를 `ALTER`로) **읽기전용을 명시적으로 해제**한 뒤 편집 — 편집 순간의 "정말 할거냐?" 확인 역할.
- **prod는 `synchronize: false` 유지**: 스키마는 오직 마이그레이션으로만 변경합니다(`typeorm.config.ts`).
- **경로는 `*.{js,ts}`**: ts-node(로컬 CLI)와 컴파일(dist/JS 런타임) 양쪽에서 로딩되도록 확장자 glob을 통일합니다.

## 코딩 컨벤션

- 클래스: UpperCamelCase
- 메서드/변수: lowerCamelCase
- 상수: UPPER_SNAKE_CASE
- 디렉토리/파일: 소문자, 하이픈(-) 구분

## 예외 처리

- NestJS의 Exception Filter를 활용하여 일관된 예외 처리를 구현합니다.
- 커스텀 예외 및 에러 코드는 `shared/` 디렉토리에서 관리합니다.

## Git Hooks (Husky)

이 프로젝트는 코드 품질 관리를 위해 Husky를 사용합니다:

### Pre-commit Hook
- **실행 시점**: 커밋 전 자동 실행
- **실행 내용**: 
  - ESLint로 코드 검사 및 자동 수정
  - Prettier로 코드 포맷팅
- **대상 파일**: staged된 TypeScript/JavaScript 파일만

### Pre-push Hook
- **실행 시점**: 푸시 전 자동 실행  
- **실행 내용**: E2E 테스트 (`pnpm run test:local`)
- **목적**: 테스트를 통과한 코드만 원격 저장소에 푸시

```bash
# Git hooks는 자동으로 실행됩니다
git add .
git commit -m "your message"  # 자동으로 lint + format 실행
git push                       # 자동으로 테스트 실행
```

---
