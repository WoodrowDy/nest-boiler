# nest-boiler

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

NestJS 11 · TypeScript · TypeORM · PostgreSQL 백엔드 보일러플레이트입니다. 패키지 매니저는 **pnpm**.

모든 도메인을 같은 모양(Controller → Service → Repository → Entity)으로 만들고, 업무 로직만 직접
붙이는 것이 목표입니다. 새 도메인은 `src/domain/template/users` 를 복사해서 시작합니다.

> **규칙의 단일 소스는 [`CLAUDE.md`](CLAUDE.md) 입니다.** 이 문서는 실행 방법과 규칙 요약이고,
> 둘이 다르면 `CLAUDE.md` 가 맞습니다.

## 빠른 시작

```bash
pnpm install
cp envs/.env.docker.example envs/.env.docker   # 로컬 DB 컨테이너 자격증명
cp envs/.env.local.example  envs/.env.local    # 앱 로컬 환경변수
pnpm db:up                                     # 로컬 Postgres(docker), 호스트 포트 5434
pnpm migration:run                             # 스키마 생성
pnpm seed:run                                  # (선택) 관리자 1명 + 랜덤 사용자 5명, 게시글 21개
pnpm run start:local                           # http://localhost:8080 · Swagger /api-docs
```

- **미적용 마이그레이션이 있으면 앱이 뜨지 않습니다.** 메시지에 환경·DB·실행할 명령이 나옵니다
  (`src/global/helpers/pending-migrations.helper.ts`).
- `pnpm setup-db` 는 `migration:generate` 부터 돌립니다. 엔티티와 스키마가 어긋나 있으면 마이그레이션
  파일이 새로 생기므로, 처음 받은 저장소에서는 위처럼 `migration:run` 만 씁니다.
- `db:up` 이 `port is already allocated` 로 실패하면 `docker-compose.yml` 의 `POSTGRES_PORT`
  기본값과 `envs/.env.local` 의 `DB_PORT` 를 같이 바꿉니다.

## 구조

```
src/
  main.ts                 # 부팅. 미적용 마이그레이션이면 거부
  app.module.ts           # env 검증(Joi), 전역 파이프·필터·인터셉터(APP_*), 미들웨어
  database/
    config/               # typeorm.config.ts
    entities/             # 공통 베이스 엔티티 (core-hard / core-soft)
    migrations/           # 적용 후 수정 금지
    seeds/                # main.seed.ts(시더 순서), run.ts(팩토리 등록)
    README.md             # 마이그레이션 · 시드 상세
  domain/
    template/             # 복사해서 쓰는 예시 도메인
      users/              # 순수 CRUD — 새 도메인은 이것을 복사
      boards/             # users 에 한 방향 의존: 관계 · 두 쓰기 트랜잭션 · 업무 액션
    jwt/                  # 토큰 검증 미들웨어 (가드는 아직 없음)
  global/                 # 횡단 관심사: constants, context, decorators, dtos, enums, filters,
                          # helpers, interceptors, interfaces, logger, middlewares
test/
  utils/                  # 테스트 앱 실행 헬퍼
  domain/template/{users,boards}/
    fixtures/             # API 호출 함수
    mocks/                # 목 데이터
    scenarios/            # e2e 시나리오
scripts/                  # db-up/down/reset, migration-lint, migrate(배포 환경), _db-env,
                          # db-connect.sh.example(터널 등 DB 접근 — 프로젝트가 복사해 씀)
envs/                     # env.ts(NODE_ENV → 파일 선택), .env.*.example
DEPLOY.md                 # 배포 가이드
```

도메인 하나의 모양:

```
domain/<name>/
  controllers/            # HTTP 경계
  services/               # 오케스트레이션 · 트랜잭션 경계
  repositories/           # 쿼리만 (Entity in/out)
  entities/               # 영속성 전용
  dtos/
    shared/               # 필드 계약: 검증 + Swagger 의 단일 소스 (*-fields.dto.ts)
    request/              # payload · query (shared 에서 파생)
    response/             # 출력 전용 (shared + AuditResponse 에서 파생)
  mappers/                # Entity → Response
  seeds/                  # 시더 + 팩토리
  <name>.constants.ts     # 에러 메시지
  <name>.module.ts
```

## 규칙 요약

### 레이어 — ESLint 가 막는 것

`eslint.config.mjs` 가 위반을 에러로 막습니다. 기계로 막을 수 있는 규칙은 글이 아니라 lint 로 둡니다.

| 대상 파일                     | 금지                                                                                   | 이유                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `entities/*.entity.ts`        | `@nestjs/swagger` · `class-validator` · `class-transformer`                            | 엔티티는 영속성 전용                                     |
| `services/` · `repositories/` | `dtos/response/*`                                                                      | 응답 변환은 컨트롤러 경계의 매퍼가 한다                  |
| `services/` · `repositories/` | 다른 도메인의 `repositories/*`                                                         | 도메인은 서비스로만 들어온다 (트랜잭션 경계 · 존재 확인) |
| `mappers/`                    | `repositories` · `services` · `typeorm` · `@nestjs/common` · `async` · `Object.assign` | 매퍼는 조회하지 않는 평범한 객체                         |
| `controllers/`                | `repositories/*` · `typeorm`                                                           | 컨트롤러는 DB 를 모른다                                  |

메서드 이름의 동사도 레이어마다 막습니다(아래 **이름**). 그 밖에 `return await` 강제
(`@typescript-eslint/return-await: always`), 한 줄 100자. Prettier 설정은
`.prettierrc` 하나입니다.

### 레이어 — 손으로 지키는 것

- **DTO 는 `dtos/shared/*-fields.dto.ts` 하나에서 파생합니다**(`PickType` · `PartialType` ·
  `IntersectionType`). 엔티티에서 파생하지 않습니다.
- **응답 모양은 엔드포인트마다 하나, 필드 정의는 이름마다 하나.** 둘이 충돌하면 이름을 쪼갭니다.
  매퍼도 모양마다 한 메서드(`toSaveResponse` · `toListItem` · `toDetail`)이고, 입력은 `Pick` 으로 좁힙니다.
- **매퍼는 고르고 옮기기만 합니다.** 필드를 한 줄씩 대입합니다 — 적지 않은 것은 나가지 않습니다.
  응답에만 필요한 계산값은 서비스 파일이 `export` 하는 도메인 결과 타입으로 넘깁니다.
- **서비스는 엔티티를 돌려주고, 컨트롤러 메서드의 `await` 는 하나**입니다. 둘이면 서비스로 합칩니다.
- **감사 필드(id · createdAt · updatedAt)는 `AuditResponse`** 가 소유합니다. `deletedAt` 은 응답에 넣지 않습니다.
- **입력 정규화는 엔티티 훅이 아니라 DTO `@Transform`** 입니다(예: `normalizePhone`). 쿼리빌더 쓰기는 훅을 건너뜁니다.

### 이름

**컨트롤러는 HTTP, 레포는 SQL, 서비스는 둘 다 쓰지 않는 CRUD 동사**를 씁니다. 이름만 보고 어느
레이어인지 알 수 있게 하려는 프로젝트 규칙이고, ESLint 가 레이어마다 다른 레이어의 동사를 막습니다.

| 레이어     | 생성      | 단건      | 목록                                  | 수정      | 삭제                          |
| ---------- | --------- | --------- | ------------------------------------- | --------- | ----------------------------- |
| Controller | `postX`   | `getX`    | `getXs`                               | `patchX`  | `deleteX`                     |
| Service    | `createX` | `readX`   | `readXList` · `readXListAndCount`     | `modifyX` | `removeX`                     |
| Repository | `insertX` | `selectX` | `selectXList` · `selectXListAndCount` | `updateX` | `softDeleteX` (`hardDeleteX`) |

```
POST   /users      → postUser   → createUser           → insertUser
GET    /users/:id  → getUser    → readUser             → selectUser
GET    /users      → getUsers   → readUserListAndCount → selectUserListAndCount
PATCH  /users/:id  → patchUser  → modifyUser           → updateUser
DELETE /users/:id  → deleteUser → removeUser           → softDeleteUser
```

- **레포의 삭제는 실제 동작을 이름에 씁니다**(`softDeleteX`, 하드 삭제 도메인은 `hardDeleteX`). SQL 동사대로
  `deleteX` 라고 하면 컨트롤러 이름과 겹칩니다.
- `read` 와 `select`, `modify` 와 `update` 는 뜻이 달라서 나눈 것이 아니라 레이어별로 어휘를 배정한 것입니다.
  `generate` 는 토큰 · 보고서 같은 산출물 생성에 남겨둡니다.
- **CRUD 밖의 쓰기도 같습니다.** 카운터 증가는 레포 `updateUserBoardCount`(SQL 은 UPDATE), 서비스는 업무 동사 `addBoardCount`.
- **업무 액션은 업무 동사**입니다. `POST /boards/:id/publish` → `postPublishBoard` → `publishBoard`.
  상태 규칙은 그 액션 메서드 안에서 확인하고, `modifyX` 는 상태를 모릅니다.
- **요청 DTO 는 엔드포인트 이름을 따릅니다**: HTTP 동사 + 단수 엔티티 + `Payload` / `Query`
  (`PostUserPayload` · `post-user.dto.ts`, `PatchUserPayload`, `GetUserQuery`).
- **모듈의 구성 요소는 복수, 사물은 단수**입니다. `UsersService` · `users.service.ts` · 라우트 `users` /
  `User` · `UserMapper` · `user.entity.ts`. 복수형은 실제 영어 복수(`CategoriesService`)를 씁니다.
- 이 규칙은 Nest · TypeORM 이 강제하는 표준이 아니라 이 프로젝트가 정의하는 메서드에만 적용합니다.
  `selectX` 안에서 TypeORM 의 `findOne` 을 써도 됩니다.

### 조회

- **단건은 `id` 를 분기 없이 항상 붙입니다.** `selectX({ id, ...query })` 가
  `buildSelectQuery(query).andWhere("x.id = :id", { id })` 이고, `GetXByIdQuery = GetXQuery & { id: number }`
  가 `id` 를 컴파일 타임에 필수로 만듭니다.
- **레포는 없으면 `null`, 서비스 `readX` 가 404** 를 던집니다. 미스가 정상인 곳은 `readXOrNull` 입니다.
- **목록은 둘**입니다. `readXListAndCount(query, pagination?)` 는 HTTP 목록용, `readXList(query)` 는
  코드 안 호출자가 "전부" 를 받을 때 씁니다.
- **LIKE 검색어는 `toLikePattern`** 으로 이스케이프합니다(`%` · `_` · `\`).
- **쓰기 직후 다시 읽지 않습니다.** 레플리카에서는 방금 쓴 행이 아직 없을 수 있습니다. 수정 경로는 `void` 를 돌려줍니다.

### 트랜잭션

- **트랜잭션은 서비스가 엽니다**(`DataSource`). 레포는 `EntityManager` 만 받아 합류만 합니다:
  `const manager = transactionManager ?? this.manager`.
- **서비스 메서드는 `transactionManager?` 를 받아 아래로 전달만** 합니다.
- **문장 하나면 트랜잭션 없이** 호출합니다. 존재 확인은 쓰기에 접습니다 — `affected === 0` 이 404 입니다.
- **쓰기 둘 이상을 묶을 때는 그게 필요한 메서드가 직접 `queryRunner` 로 엽니다**(`startTransaction` 은
  try 안). **여는 메서드는 `transactionManager` 를 받지 않습니다.** 참고: `BoardsService.createBoard` · `removeBoard`.
- **트랜잭션 안에서는 "없음" 을 알려주는 쓰기를 먼저** 합니다. `createBoard` 는 작성자 `boardCount`
  증가(0 행이면 404) → 글 INSERT 순서입니다. 반대면 FK 위반이 먼저 나서 409 가 됩니다.

### 에러

| 구분                      | 예                                                  | 처리                                                        |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| 예상한 에러 (업무 규칙)   | 없음, 상태 불일치, 중복(23505), 사용 중 삭제(23503) | 서비스가 Nest 예외로 던짐. 메시지는 도메인 `*.constants.ts` |
| 예상하지 못한 에러 (장애) | 연결 끊김, 타임아웃, 쿼리 오류, 코드 버그           | 잡지 않고 그대로 올림                                       |

- **던지는 곳은 서비스뿐**입니다. 레포는 `try/catch` 를 쓰지 않습니다.
- **다른 도메인이 자기 트랜잭션에 넣는 쓰기는 `affected` 를 돌려줍니다.** 0 의 뜻은 호출한 쪽이
  정합니다(`UsersService.addBoardCount`: 글 생성은 404, 글 삭제는 무시).
- **서비스의 `try/catch` 는 롤백과 DB 제약 변환에만** 씁니다. 아는 것만 바꾸고 나머지는 그대로 던집니다:

```ts
async createUser(payload: PostUserPayload, transactionManager?: EntityManager): Promise<User> {
  try {
    return await this.usersRepository.insertUser(payload, transactionManager);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictException(constants.errorMessages.DUPLICATE_EMAIL); // 아는 것만
    }
    throw error; // 404 · 409 · 장애는 그대로
  }
}
```

- **전역 필터**(`src/global/filters/http-exception.filter.ts`)는 Nest 기본 모양에 `meta` 를 더합니다:
  `{ message, error, statusCode, meta: { traceId, timestamp } }`. 변환되지 않은 23505 · 23503 은 409,
  모르는 에러는 일반 메시지의 500 이고 원문은 응답에 싣지 않습니다. **5xx 는 스택과 함께 로그에 남기고**,
  응답의 `meta.traceId` 로 그 줄을 찾습니다.

### 응답 · 관측

- 성공 응답은 `ObjectResponse`(`{ row, meta }`) · `ListResponse`(`{ rows, count, meta }`) 로 감쌉니다.
- **traceId**: `TraceIdMiddleware` 가 요청마다 부여합니다(들어온 `X-Request-Id` 우선, 없으면 UUID).
  `AsyncLocalStorage` 에 담아 모든 로그 줄에 붙이고, 응답 헤더 `X-Request-Id` 로 돌려줍니다.
- **로그**: winston. 접근 로그는 `RequestLoggerMiddleware`(`HTTP REQ`) 와
  `ResponseLoggerInterceptor`(`HTTP RES`, 상태코드 + 소요시간).
- **Swagger**: `@ApiDoc` 이 성공 응답과 표준 에러(400 · 401 · 403 · 404 · 500)를 문서화합니다.
  `/api-docs`. `local` 이 아니면 Basic 인증 뒤에 있고, `SWAGGER_USER` · `SWAGGER_PASSWORD` 가 없으면 부팅을 거부합니다.

## 명령어

```bash
# 실행 · 빌드
pnpm run start:local   # NODE_ENV=local, TZ=Asia/Seoul, --watch
pnpm run start:dev     # NODE_ENV=dev (envs/.env.dev 필요)
pnpm run start:prod    # node dist/src/main — envs/env.ts 가 src 밖이라 빌드가 dist/src/ 로 떨어진다
pnpm run build         # nest build
pnpm run typecheck     # tsc --noEmit — pre-commit 이 돌리지 않으므로 직접 친다
pnpm run lint          # eslint --fix
pnpm run format        # prettier --write

# 로컬 DB (docker)
pnpm db:up             # 기동, healthy 까지 대기
pnpm db:down           # 중지 (데이터 유지)
pnpm db:reset          # 볼륨 삭제 후 재기동

# 테스트
pnpm test              # 단위 (DB 불필요)
pnpm run test:local    # e2e — 로컬 Postgres 를 먼저 띄운다 (pretest:local → db:up)
pnpm run test:e2e      # e2e — DB 가 이미 떠 있을 때
pnpm run test:cov      # 커버리지
```

## 마이그레이션 · 시드

```bash
# 로컬 — 모두 NODE_ENV=local 고정이라 envs/.env.local 만 봅니다
pnpm migration:generate   # 엔티티 변경분으로 생성 (커밋 전 SQL 리뷰)
pnpm migration:create     # 빈 마이그레이션 (데이터 이관 · 수동 SQL)
pnpm migration:lint       # up() 의 되돌리기 어려운 구문 검사 (인자 없으면 스테이징된 것만, --all 전체)
pnpm migration:show       # 적용 여부 목록
pnpm migration:run        # 적용
pnpm migration:revert     # 마지막 한 건 되돌리기
pnpm seed:run             # MainSeeder 실행 (항상 local)

# 배포 환경 — 서버에 ssh 로 들어가서 돌립니다 (dev 자리에 prod 도 됩니다)
pnpm migrate:show:dev     # 무엇이 적용될지만 — 읽기 전용
pnpm migrate:run:dev      # 환경명을 입력해 확인한 뒤 적용
pnpm migrate:revert:dev   # 마지막 한 건 철회 (revert-dev 를 입력)
```

- **엔티티 변경은 `generate`, 데이터 · 수동 SQL 은 `create`** 입니다. 생성된 SQL 은 반드시 읽고 커밋합니다.
- **단순 컬럼 변경이 `DROP` + `ADD` 로 나오면 `ALTER` 로 손봅니다**(데이터 손실 방지).
- **적용된 마이그레이션은 고치지 않고 새로 추가합니다.** VS Code 에서는 `src/database/migrations/**` 가 읽기 전용입니다.
- **배포 환경 시드 경로는 일부러 없습니다.** 꼭 필요한 기준 데이터는 마이그레이션에 넣습니다.
- 상세: [`src/database/README.md`](src/database/README.md)

## 환경 변수

`NODE_ENV`(`local | dev | prod | test`)로 `envs/` 아래 파일이 선택되고(`envs/env.ts`), 부팅 때
`app.module.ts` 가 Joi 로 검증합니다.

| 파일                          | 용도                            | git    |
| ----------------------------- | ------------------------------- | ------ |
| `envs/.env.local`             | 로컬 개발                       | 제외   |
| `envs/.env.test`              | e2e                             | 커밋됨 |
| `envs/.env.dev` · `.env.prod` | 배포 환경 — **서버에만 둡니다** | 제외   |
| `envs/.env.docker`            | 로컬 Postgres 컨테이너 자격증명 | 제외   |
| `envs/.env.*.example`         | 템플릿                          | 커밋됨 |

- **필수**: `NODE_ENV` · `TZ` · `DB_HOST` · `DB_PORT` · `DB_NAME` · `DB_USERNAME` · `DB_PASSWORD` · `JWT_SECRET`.
  `local` 이 아니면 `SWAGGER_USER` · `SWAGGER_PASSWORD` 도 필수입니다.
- **`EXPECTED_DB_NAME`**(선택): 배포 환경 env 에 적어두면 마이그레이션 전에 `DB_NAME` 과 대조합니다.
  prod 설정을 `.env.dev` 에 잘못 복사한 경우를 잡습니다.

## 테스트

- e2e 스위트는 테스트 DB 를 지우고 다시 동기화한 뒤 `it` 을 위에서 아래로 한 DB 에서 돌립니다.
- **id 가 연속이라고 가정하지 않습니다.** 실패한 INSERT(409)도 시퀀스 값을 씁니다.
- 작성법: [`test/README.md`](test/README.md)

## Git Hooks (Husky)

- **pre-commit**: `lint-staged` → 스테이징된 `*.{ts,js}` 에 `eslint --fix` + `prettier --write`.
- **pre-push**: `pnpm run test:local`(e2e). DB 를 쓸 수 없으면 `git push --no-verify`.
- 훅은 `pnpm install` 의 `prepare` 가 설치합니다. git 저장소 안이어야 합니다.

## 배포

배포 방식은 인프라마다 달라 강제하지 않습니다. 권장하는 모양과 이유는 [`DEPLOY.md`](DEPLOY.md) 에 있습니다.

- **마이그레이션은 배포와 분리합니다.** 서버에 ssh 로 들어가 `migrate:*` 로 돌립니다.
- **순서는 마이그레이션 → 배포**입니다. 거꾸로 하면 앱이 부팅을 거부합니다.

## 아직 없는 것

쓰기 전에 알아둘 빈칸입니다. 상세는 `CLAUDE.md` 의 **Known gaps**.

- **인증 가드가 없습니다.** `JwtMiddleware` 는 유효한 `Bearer` 토큰이면 `req.session` 을 붙이고,
  잘못된 토큰이면 403 입니다. **토큰이 없으면 그냥 통과합니다** — 막아야 하는 API 가 생기면 가드부터 붙입니다.
- **`strictNullChecks` 가 꺼져 있습니다.**
- **DB 쿼리 로그가 꺼져 있습니다**(`logging: false` 고정). `DB_LOGGING` · `DB_MAX_QUERY_EXECUTION` ·
  `USE_LOCAL_HTTPS_OPTIONS` 는 검증만 하고 읽는 곳이 없습니다. 5xx 는 전역 필터가 로그에 남깁니다.
- **`@ApiDoc` 표준 에러에 409 가 없습니다.**

## 코딩 컨벤션

- 클래스 UpperCamelCase · 메서드/변수 lowerCamelCase · 상수 UPPER_SNAKE_CASE · 디렉토리/파일 소문자 + 하이픈.

## 설계 문서 (선택)

위 규칙은 이 보일러플레이트가 정해둔 것입니다. 그 위에 새 기능을 설계할 때, 코드가 어느 정도
쌓이면 글로 먼저 정리하는 편이 낫습니다 — 참고:
[How to Write an Effective Software Design Document](https://refactoringenglish.com/excerpts/write-an-effective-design-doc/)

- **쓸지 말지**: 사람이 여럿 붙거나 3개월을 넘기는 일이면 씁니다. 아니면 안 써도 됩니다 —
  원문도 _"때로는 설계 문서에 들일 적정 비용이 0"_ 이라고 말합니다.
- **무엇을 적을지**: **틀렸을 때 대가가 큰 결정**만 적습니다. 길어지면 아무도 안 읽어서 리뷰를
  못 받습니다. 설계 문서의 목적은 리뷰를 받는 것입니다.
- **그림을 아끼지 않습니다**: 읽는 사람 머릿속에는 당신이 보고 있는 그림이 없습니다.
- 작은 팀에서는 **목표 / 비목표 / 고려한 대안 / 미해결 항목** 넷이 값어치가 큽니다. 특히
  *비목표*는 "이건 안 한다" 를 미리 못 박아 범위가 새는 것을 막습니다.
