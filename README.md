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
nest-boiler/
|-- src/
|   |-- main.ts                   # 부팅. 미적용 마이그레이션이면 여기서 거부
|   |-- app.module.ts
|   |-- app.controller.ts
|   |-- app.service.ts
|   |-- database/
|   |   |-- config/               # typeorm.config.ts
|   |   |-- entities/             # 공통 베이스 엔티티 (core-hard / core-soft)
|   |   |-- migrations/           # 마이그레이션 파일 (적용 후 수정 금지)
|   |   |-- seeds/                # main.seed.ts
|   |   |-- README.md             # 마이그레이션 · 시드 상세 가이드
|   |-- domain/
|   |   |-- template/
|   |   |   |-- static-board/     # 참조 구현 — 새 도메인은 이것을 복사
|   |   |       |-- controllers/  # HTTP 경계
|   |   |       |-- services/     # 오케스트레이션 · 트랜잭션 경계
|   |   |       |-- repositories/ # 데이터 접근 (Entity 만 다룸)
|   |   |       |-- entities/     # 영속성 전용
|   |   |       |-- dtos/         # shared / request / response
|   |   |       |-- mappers/      # Entity -> Response
|   |   |       |-- seeds/        # 도메인 시드 + 팩토리
|   |   |-- jwt/
|   |-- global/                   # 횡단 관심사
|       |-- constants/ context/ decorators/ dtos/ enums/
|       |-- helpers/ interceptors/ interfaces/ logger/ middlewares/
|-- scripts/
|   |-- db-up.sh / db-down.sh / db-reset.sh   # 로컬 Postgres(docker)
|   |-- migration-lint.sh         # up() 의 되돌리기 어려운 구문 검사
|   |-- migrate.sh                # 배포 환경 마이그레이션 (show/run/revert)
|   |-- _db-env.sh                # 환경 판정 · 접속 대상 표시 · DB 이름 가드
|   |-- db-connect.sh.example     # DB 에 닿는 방법 (터널 등) — 프로젝트가 복사해 씀
|-- envs/
|   |-- env.ts                    # NODE_ENV 로 env 파일 선택
|   |-- .env.*.example            # 커밋되는 템플릿 (.env.* 는 git 제외)
|-- test/
|   |-- utils/                    # 테스트 환경 변수 및 앱 실행 헬퍼
|   |-- domain/
|       |-- fixture               # 실제 API 호출 함수 모음
|       |-- mocks                 # 테스트용 목 데이터
|       |-- scenarios             # 실제 테스트 시나리오 코드
|-- docker-compose.yml            # 로컬 Postgres
|-- DEPLOY.md                     # 배포 가이드라인
|-- CLAUDE.md                     # Claude Code 용 저장소 안내
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
  - **응답을 위해 만들어야 하는 값**(계산·집계·다른 테이블에서 가져온 값)은 응답 DTO가 아니라 **도메인 결과 타입**에 담고, 그 타입은 **그 서비스 파일에 `export`** 합니다. HTTP 경계를 넘지 않으므로 DTO가 아니고, 만든 서비스가 소유자입니다.
  - **컨트롤러의 `await`는 하나**입니다. 둘이 필요하면 컨트롤러가 오케스트레이션을 하고 있는 것이므로 서비스로 합칩니다.
- **Mapper는 값을 만들지 않습니다 — 고르고 옮기기만 합니다.** 계산·집계·포맷·정책 판단이 들어오려 하면 그 값은 도메인 것입니다. 판별: **HTTP를 지워도 그 코드가 필요한가.** 필요하면 도메인입니다.
  - **왜 명시적 복사인가**: TypeScript 타입은 런타임에 없습니다. 반환 타입을 적어도 아무것도 걸러지지 않고, 이 레포는 `ClassSerializerInterceptor`도 쓰지 않습니다. **적지 않은 것은 나가지 않는다**(닫힘)가 `@Exclude`(열림)보다 안전합니다 — 빠뜨리면 안 나갈 뿐이고, `@Exclude`는 빠뜨리면 새어 나갑니다.
  - **Mapper는 조회하지 않습니다.** 필요한 값은 서비스가 미리 모아 인자로 넘깁니다(줄이 여럿이면 `Map`으로). 줄마다 조회하면 목록 하나에 N+1이 생깁니다.
- **Repository는 엔티티만** 다룹니다(DTO를 모름). 반환 타입은 항상 `Entity`/`Entity[]`.
- **공통 audit 응답 필드**(id/createdAt/updatedAt)는 `AuditResponse`(`src/global/dtos/audit.response.ts`) 한 곳에서 소유합니다.
  - **`deletedAt`은 담지 않습니다.** soft delete는 내부 구현이고 삭제된 행은 조회에서 걸러지므로 클라이언트가 받는 값은 언제나 `null`입니다. `CoreHardEntity` 도메인에는 컬럼 자체가 없어서, 여기 두면 절반의 도메인에 대해 Swagger가 거짓말을 합니다. 정말 필요한 도메인이 생기면 그 응답 DTO에 한 줄 선언합니다.

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

## 설계 문서 (선택)

위 규칙은 **이 보일러플레이트가 정해둔 것**입니다. 그 위에 새 기능을 설계할 때, 코드가 어느
정도 쌓이면 글로 먼저 정리하는 편이 낫습니다 — 참고:
[How to Write an Effective Software Design Document](https://refactoringenglish.com/excerpts/write-an-effective-design-doc/)

- **쓸지 말지**: 사람이 여럿 붙거나 3개월을 넘기는 일이면 씁니다. 아니면 안 써도 됩니다 —
  원문도 *"때로는 설계 문서에 들일 적정 비용이 0"* 이라고 말합니다.
- **무엇을 적을지**: **틀렸을 때 대가가 큰 결정**만 적습니다. 사소한 선택까지 적으면 길어지고,
  길어지면 아무도 안 읽어서 리뷰를 못 받습니다. 설계 문서의 목적은 리뷰를 받는 것입니다.
- **그림을 아끼지 않습니다**: 읽는 사람 머릿속에는 당신이 보고 있는 그림이 없습니다.
  사진 말고 고칠 수 있는 형태로 그립니다.
- 원문이 제시하는 24개 섹션은 큰 조직 기준입니다. 골라 쓰세요 — 작은 팀에서는
  **목표 / 비목표 / 고려한 대안 / 미해결 항목** 넷이 값어치가 큽니다. 특히 *비목표*는
  "이건 안 한다"를 미리 못 박아 나중에 범위가 새는 것을 막습니다.

## 기술 스택

- **언어**: TypeScript
- **프레임워크**: NestJS
- **데이터베이스**: PostgreSQL, TypeORM
- **테스트**: Jest
- **API 문서화**: Swagger
- **인프라**: AWS

## API 문서

| 환경     | 바로가기                                                             |
| -------- | -------------------------------------------------------------------- |
| **로컬** | [Swagger (localhost)](http://localhost:8080/api-docs)                |
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

# 6) 로컬 서버 실행
pnpm run start:local
```

> 4~5 는 `pnpm setup-db` 한 줄로도 됩니다(`migration:generate` + `run` + `seed:run`).
> 다만 `generate` 가 먼저 도므로, 엔티티와 스키마가 어긋나 있으면 마이그레이션 파일이
> 새로 생깁니다. 처음 받은 저장소라면 위처럼 `migration:run` 만 돌리는 편이 안전합니다.

> 로컬 Postgres 는 호스트 **5434** 로 뜹니다(컨테이너 5432). 5432·5433 은 이미 쓰이고
> 있을 수 있어 피한 값입니다. `db:up` 이 `port is already allocated` 로 실패하면
> `docker-compose.yml` 의 `POSTGRES_PORT` 기본값을 바꾸고 `envs/.env.local` 의
> `DB_PORT` 도 같이 맞추세요.
>
> DB 상세(마이그레이션/시드/도커)는 [`src/database/README.md`](src/database/README.md) 참고.

### 일반 실행

```bash
pnpm run start:local   # NODE_ENV=local, TZ=Asia/Seoul, --watch
pnpm run start:dev     # NODE_ENV=dev  (envs/.env.dev 필요)
pnpm run start:prod    # node dist/main

pnpm run build         # nest build → dist/
pnpm run typecheck     # tsc --noEmit — pre-commit 은 돌리지 않으므로 직접 친다
pnpm run lint          # eslint --fix

pnpm db:down           # 컨테이너 중지 (데이터 유지)
pnpm db:reset          # 볼륨 삭제 후 재기동 — 스키마가 꼬였을 때
```

> 적용되지 않은 마이그레이션이 있으면 **앱이 뜨지 않습니다.** 의도된 동작이며,
> 무엇을 해야 하는지 메시지에 나옵니다. `src/global/helpers/pending-migrations.helper.ts`

## 테스트

```bash
# 단위 테스트 (DB 불필요)
pnpm test

# e2e — 로컬 Postgres 를 자동으로 띄운 뒤 실행 (pretest:local → db:up)
pnpm run test:local

# e2e — DB 가 이미 떠 있을 때
pnpm run test:e2e

# 커버리지
pnpm run test:cov
```

> `pnpm run test:local` 은 **e2e** 입니다. pre-push 훅이 이것을 돌립니다.

## 환경 변수

환경은 `local | dev | prod | test` 네 가지이며, `NODE_ENV` 값으로 `envs/` 아래 파일이
선택됩니다(`envs/env.ts`).

| 파일 | 용도 | git |
|---|---|---|
| `envs/.env.local` | 로컬 개발 | 제외 |
| `envs/.env.test` | e2e | 커밋됨 |
| `envs/.env.dev` · `.env.prod` | 배포 환경 — **서버에만 둡니다** | 제외 |
| `envs/.env.docker` | 로컬 Postgres 컨테이너 자격증명 | 제외 |
| `envs/.env.*.example` | 템플릿 | 커밋됨 |

`.env.*` 는 git 에서 제외하고 `.env.*.example` 만 커밋합니다. 새 환경을 쓸 때는
example 을 복사해 값을 채웁니다.

```bash
cp envs/.env.dev.example envs/.env.dev
```

**`EXPECTED_DB_NAME`** (선택) — 배포 환경 env 에 적어두면 마이그레이션 전에 `DB_NAME` 과
대조합니다. prod 설정을 `.env.dev` 에 잘못 복사한 경우를 잡습니다. 비우면 검사하지 않고
접속 대상만 보여줍니다.

## 마이그레이션 및 시드

- TypeORM 마이그레이션 및 시드 데이터는 `src/database/migrations/`, `src/database/seeds/`에서 관리합니다.
- 자세한 사용법은 [`src/database/README.md`](src/database/README.md)를 참고하세요.

```bash
# 로컬 — 아래는 모두 NODE_ENV=local 고정이라 envs/.env.local 만 봅니다
pnpm migration:generate   # 엔티티 변경분으로 마이그레이션 생성 (커밋 전 SQL 리뷰!)
pnpm migration:create     # 빈 마이그레이션 (데이터 이관·수동 SQL)
pnpm migration:lint       # up() 의 되돌리기 어려운 구문 검사
pnpm migration:show       # 적용 여부 목록
pnpm migration:run        # 적용
pnpm migration:revert     # 마지막 한 건 되돌리기
pnpm seed:run             # MainSeeder 실행
pnpm setup-db             # generate + run + seed 한 번에

# 배포 환경 — 서버에 ssh 로 들어가서 돌립니다 (dev 자리에 prod 도 됩니다)
pnpm migrate:show:dev     # 뭐가 적용될지만 — 읽기 전용
pnpm migrate:run:dev      # 환경명을 입력해 확인한 뒤 적용
pnpm migrate:revert:dev   # 마지막 한 건 철회 (revert-dev 를 입력)
```

### 마이그레이션 규칙

- **생성 방식 구분**: 엔티티 스키마 변경 → `pnpm migration:generate`(자동 생성), 데이터 이관·수동 SQL → `pnpm migration:create`(빈 파일 직접 작성).
- **자동 생성물은 반드시 리뷰**: `migration:generate` 결과를 그대로 믿지 말고 up/down SQL을 확인한 뒤 커밋합니다.
- **`pnpm migration:lint` 로 한 번 거릅니다**: `up()` 안의 `DROP COLUMN`/`DROP TABLE`·`RENAME`·기존 행 처리 없는 `SET NOT NULL`·빈 `down()`·같은 컬럼 `DROP`+`ADD` 를 찾아 보여줍니다. **막지 않고 보여주며 판단은 사람이 합니다**(위의 리뷰 규칙을 기계가 거드는 것). 인자 없이 쓰면 스테이징된 것만, `--all` 이면 전체입니다.
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

## 배포

배포 방식은 인프라마다 달라서 이 보일러플레이트가 강제하지 않습니다. **권장하는 모양과 그
이유**를 [`DEPLOY.md`](./DEPLOY.md) 에 정리해 두었습니다.

마이그레이션 쪽만은 실제로 들어 있습니다 — 그것 없이는 배포 환경에 스키마를 올릴 방법
자체가 없기 때문입니다.

```bash
pnpm migrate:show:dev     # 무엇이 적용될지만 — 읽기 전용
pnpm migrate:run:dev      # 환경명을 입력해 확인한 뒤 적용
pnpm migrate:revert:dev   # 마지막 한 건 철회 (revert-dev 를 입력)
```

- **서버에 ssh 로 들어가 거기서 돌립니다.** 서버가 이미 VPC 안이라 터널이 필요 없고, 실제
  DB 자격증명이 노트북에 남지 않습니다.
- **마이그레이션은 배포와 분리합니다.** 스키마 변경은 되돌리기가 비싸서 사람이 확인합니다.
- 순서를 어기면 **앱이 부팅을 거부합니다.** 마이그레이션을 잊은 배포는 조용히 성공하지
  않습니다.

---
