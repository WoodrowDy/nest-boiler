# users / boards 템플릿 재작성 — 설계 메모 (인수인계용)

작성 2026-11-02. 상태: **§1–§4 확정, §5–§8 제안(승인 전)**. 코드 변경은 아직 없다.

- 커밋·푸시·브랜치는 사용자가 한다. 코드 변경은 §5–§8 에 "확정" 이 붙은 뒤에 시작한다.
- `docs/` 는 `.gitignore` 대상이다. 이 파일을 올리려면 `git add -f docs/superpowers/specs/2026-11-02-users-boards-template-rewrite-design.md`.
- 기준 골격은 지금 스테이징된 `src/domain/template/static-board/` 다. 새 두 도메인은 이 모양을 그대로 따른다.

---

## 0. 브리프 — 왜 다시 짜나

- **목표**: "다른 모듈을 만들더라도 기본 모듈은 똑같이 만들어지게, 필요 로직은 내가 직접 붙인다." 룰 하나가 명확하면 누가 뭘 시작해도 금방이다.
- **단일조회는 빈틈 없이**: 잘못된 쿼리로는 안 나오고, 잘된 쿼리로는 나온다. 에러 3단 —
  컨트롤러 타입 체크 실패 → 400 / 코드가 잘못 호출 → 500(버그, 들어오면 안 됨) / 키는 맞는데 행이 없음 → 404.
- **개념은 적게**: withManager·CLS·manager-first 인자·OrThrow 접미사 안 쓴다. 트랜잭션은 서비스가 정의하고 `transactionManager?` 를 전달만 한다.
- **쿼리빌더가 기본**. 조인 여부는 서버(컨트롤러)가 정한다. 클라이언트에 주지 않는다.
- **순서**: ① 이 재작성 → ② `strictNullChecks` 켜기(비교용, 별도 커밋) → ③ Nest 12 / TS 6 업그레이드는 보류.

## 1. 범위 (확정)

- `src/domain/template/static-board/` 삭제. **`users` + `boards`** 두 도메인이 참고 구현이 된다.
- 마이그레이션은 기존 파일 삭제 후 **초기 마이그레이션 1개** 로 새로 생성. 시드도 새로(UserSeeder → BoardSeeder).
- 인증은 이번 라운드에 넣지 않는다(`src/domain/jwt` 는 그대로).
- `strictNullChecks` 는 다음 스텝(§9-4).

## 2. 도메인 모델 (확정)

둘 다 `CoreSoftEntity`(id·createdAt·updatedAt·deletedAt). 관계 이름은 **`user` / `userId` / `userName`** — writer 아님.

**User** — `@Entity("users")`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| email | varchar(255) | 부분 유니크 `@Index(["email"], { unique: true, where: '"deletedAt" IS NULL' })` — 탈퇴 후 같은 이메일로 재가입 가능 |
| name | varchar(50) | |
| phone | varchar(15) | DTO 에서 `@Transform(normalizePhone)` (static-board 와 같음) |
| boardCount | int, default 0 | β 카운터. `UsersService.addBoardCount` 만 바꾼다 |

**Board** — `@Entity("boards")`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| userId | int, `@Index` | FK → users.id. `@ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "userId" }) user: User`. 단방향 — User 에 `boards` 없음 |
| title | varchar(100) | |
| content | text | |
| status | enum `BoardStatus` (DRAFT · PUBLISHED), default DRAFT | |
| publishedAt | timestamptz, nullable | |

- **의존 방향(β)**: Boards → Users 만. `BoardsModule` 이 `UsersModule` 을 import 하고 **`UsersService` 만** 쓴다(다른 도메인의 레포 import 는 ESLint 가 막는다). `forwardRef` 없음.
- 탈퇴한 사용자의 글은 남는다(soft delete 라 FK RESTRICT 는 안 걸린다). 조인하면 `user = null`, 응답 `userName: null` — TypeORM 이 조인 조건에 `user.deletedAt IS NULL` 을 자동으로 붙인다(`withDeleted` 가 아닐 때).

## 3. 라우트와 응답 (확정)

**users**

| 라우트 | 호출 사슬 | 응답 | 비고 |
|---|---|---|---|
| POST /users | `postUser → generateUser → createUser` | 201 `UserSaveResponse` | 이메일 중복 → 409 `DUPLICATE_EMAIL` (catch 에서 `isUniqueViolation`) |
| GET /users | `getUsers → readUserListAndCount(query, pagination)` | `ListResponse<UserListItemResponse[]>` | 필터 `nameLike`. `PaginationQuery` 는 선택 |
| GET /users/:id | `getUser → readUser({ id })` | `UserDetailResponse` | 없으면 404 |
| PATCH /users/:id | `patchUser → modifyUser` | void | name·phone. `affected === 0` → 404 |
| DELETE /users/:id | `deleteUser → removeUser` | void | softDelete 한 문장. 글은 건드리지 않음 |

**boards**

| 라우트 | 호출 사슬 | 응답 | 비고 |
|---|---|---|---|
| POST /boards | `postBoard → generateBoard` | 201 `BoardSaveResponse` | body userId·title·content. **트랜잭션**: createBoard + addBoardCount(+1). 유저 없으면 404 → 롤백 |
| GET /boards | `getBoards → readBoardListAndCount({ ...query, isJoinUser: true }, pagination)` | `ListResponse<BoardListItemResponse[]>` | 필터 userId·status·titleLike. content 없음 |
| GET /boards/:id | `getBoard → readBoard({ id, isJoinUser: true })` | `BoardDetailResponse` | + content |
| PATCH /boards/:id | `patchBoard → modifyBoard` | void | title·content |
| POST /boards/:id/publish | `postPublishBoard → publishBoard` | void | `readBoard({ id })` → DRAFT 아니면 409 `NOT_DRAFT` → `modifyBoard(id, { status: PUBLISHED, publishedAt: new Date() })` |
| DELETE /boards/:id | `deleteBoard → removeBoard` | void | **트랜잭션**: softDeleteBoard(0 → 404) + addBoardCount(−1) |

- ID 파라미터는 `@Param("id", ParseIntPipe)`. 문자는 400. **0·음수는 통과시켜 404** 가 되게 둔다 — 키 타입은 맞고 행이 없는 것이다.
- 쿼리스트링은 문자열로 온다(전역 파이프에 암묵 변환 없음). `BoardFields.userId` 에 `@Type(() => Number)` — static-board 의 `id` 와 같은 이유.

**응답 필드 (제안 — 모양 수는 §3 에서 확정, 필드 구성만 확인)**

- `UserSaveResponse` = Audit + email·name / `UserListItemResponse` = Audit + name·email·boardCount / `UserDetailResponse` = Audit + email·name·phone·boardCount
- `BoardSaveResponse` = Audit + userId·title·status / `BoardListItemResponse` = Audit + userId·title·status·publishedAt + `userName: string | null` / `BoardDetailResponse` = ListItem + content
- `userName` 은 계약(`BoardFields`)에 없다 — 조인 평탄화 값이라 **응답 DTO 에 직접 선언**(`@ApiProperty({ nullable: true })`). 매퍼는 `dto.userName = board.user?.name ?? null` 한 줄. 매퍼 입력 타입은 `Pick<Board, …> & { user?: User | null }`.

## 4. 레포·서비스 (확정, 2026-11-02)

- **두 레포 모두 `static-board.repository.ts` 골격 그대로.** `EntityManager` 주입, 마지막 인자 `transactionManager?`, `const manager = transactionManager ?? this.manager`, `private buildFindQuery(query, tm?)` 가 `createQueryBuilder(X, "x").orderBy("x.id", "DESC")` + 필터별 `if`. find-options 스타일(`findOne`, `FindOptionsWhere` 헬퍼)은 쓰지 않는다 — 두 모듈이 다르게 생기면 "똑같이 만들어진다" 가 깨진다.
- **단건 조회 타입**: DTO 파일에 `export type GetUserByIdQuery = GetUserQuery & { id: number }`. `findUser({ id, ...query })` 는 `buildFindQuery(query, tm).andWhere("user.id = :id", { id })` — **id 는 무조건 붙는다**(조건부 아님). 서비스 `readUser` 가 null 이면 `NotFoundException`, `readUserOrNull` 은 통과.
- **조인 스위치**: `GetBoardQuery` 클래스에 `isJoinUser?: boolean` 을 **데코레이터 없이** 한 줄. Swagger 에 안 뜨고, 전역 `ValidationPipe({ whitelist: true })`(`src/app.module.ts`)가 클라이언트 입력을 지운다. 컨트롤러가 필요할 때 `{ ...query, isJoinUser: true }` 로 넣고, `buildFindQuery` 가 `if (isJoinUser) qb.leftJoinAndSelect("board.user", "user")`.
  **`whitelist: true` 가 이 설계의 전제다** — 끄면 `?isJoinUser=true` 가 문자열 `"true"` 로 레포까지 내려간다.
- **LIKE**: `src/global/helpers/like.helper.ts` 에 `toLikePattern(term)` — `\` `%` `_` 이스케이프 후 `%term%`. 둘 다 쓴다. 지금 static-board 의 `` `%${x}%` `` 는 `%`·`_` 가 와일드카드로 먹는다.
- **카운터**: `UsersRepository.addUserBoardCount(userId, delta, tm?)` = `manager.increment(User, { id: userId, deletedAt: IsNull() }, "boardCount", delta)` → `affected ?? 0`. `UsersService.addBoardCount(userId, delta, tm?)` 가 0 이면 `NotFoundException(USER_NOT_FOUND)`. 존재 확인이 UPDATE 한 문장에 접힌다.
- **쓰기**: `manager.update(X, { id, deletedAt: IsNull() }, payload)`, `manager.softDelete(X, id)` → affected. static-board 그대로.
- **`BoardsService.generateBoard(payload, tm?)`**: CLAUDE.md 의 QueryRunner 블록 그대로(join 분기 → createQueryRunner → connect → startTransaction → try/commit → catch/rollback → finally/release). 본문만 `private runGenerate(payload, manager)` 로 빼서 두 분기가 같은 코드를 탄다. `removeBoard` 도 같은 형태.
- **`modifyBoard(id, values: Partial<Pick<Board, "title" | "content" | "status" | "publishedAt">>, tm?)`** 하나를 `patchBoard`(HTTP 는 title·content 만 담은 `ModifyBoardPayload`)와 `publishBoard` 가 같이 쓴다. 상태 규칙은 `publishBoard` 본문에만 있다(CLAUDE.md "base set knows nothing about state").

```ts
// boards.repository.ts
private buildFindQuery(query: GetBoardQuery, transactionManager?: EntityManager): SelectQueryBuilder<Board> {
  const manager = transactionManager ?? this.manager;
  const { userId, status, titleLike, isJoinUser } = query;
  const qb = manager.createQueryBuilder(Board, "board").orderBy("board.id", "DESC");

  if (isJoinUser) {
    qb.leftJoinAndSelect("board.user", "user"); // 탈퇴 유저는 deletedAt 필터로 user = null
  }
  if (userId !== undefined) {
    qb.andWhere("board.userId = :userId", { userId });
  }
  if (status) {
    qb.andWhere("board.status = :status", { status });
  }
  if (titleLike) {
    qb.andWhere("board.title iLike :titleLike", { titleLike: toLikePattern(titleLike) });
  }

  return qb;
}

async findBoard({ id, ...query }: GetBoardByIdQuery, transactionManager?: EntityManager): Promise<Board | null> {
  const qb = this.buildFindQuery(query, transactionManager).andWhere("board.id = :id", { id });

  return await qb.getOne();
}
```

```ts
// boards.service.ts
async generateBoard(payload: GenerateBoardPayload, transactionManager?: EntityManager): Promise<Board> {
  if (transactionManager) {
    return await this.runGenerate(payload, transactionManager); // 합류 — commit 은 소유자 몫
  }
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const board = await this.runGenerate(payload, queryRunner.manager);
    await queryRunner.commitTransaction();
    return board;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

private async runGenerate(payload: GenerateBoardPayload, manager: EntityManager): Promise<Board> {
  const board = await this.boardsRepository.createBoard(payload, manager);
  await this.usersService.addBoardCount(payload.userId, 1, manager); // affected 0 → 404 → 롤백
  return board;
}
```

---

## 5. DB — 마이그레이션·시드 (제안)

### 5.1 엔티티 등록

- `src/database/config/typeorm.config.ts` 의 `entities` 글로브 `domain/**/entities/*.entity.{js,ts}` 가 자동으로 잡는다. 등록 작업 없음.
  그래서 **static-board 엔티티를 먼저 지워야** 생성되는 마이그레이션에 static_board 가 섞이지 않는다.
- `BoardStatus` enum 은 `src/domain/boards/boards.constants.ts` 에 `export enum BoardStatus { DRAFT = "DRAFT", PUBLISHED = "PUBLISHED" }` — 엔티티와 DTO 둘이 import 한다.

### 5.2 마이그레이션 — 순서대로

1. `src/database/migrations/1752999646987-AutoMigration.ts` 삭제(유일한 파일). `.vscode/settings.json` 의 read-only 는 편집기 설정이라 터미널 삭제엔 영향 없음.
2. **`pnpm db:reset`** — 볼륨까지 지운 빈 DB 에서 생성해야 한다. 기존 static_board 테이블이 남아 있으면 `DROP TABLE` 이 섞인 마이그레이션이 나오고, 그건 빈 DB(dev·prod·새 클론)에서 실패한다.
3. `pnpm run migration:generate` (파일명을 바꾸려면 `NODE_ENV=local pnpm run typeorm migration:generate src/database/migrations/InitUsersAndBoards`).
4. 생성된 SQL 확인 —
   있어야 하는 것: `CREATE TYPE "public"."boards_status_enum"`, `CREATE TABLE "users"` / `"boards"`(컬럼 comment 포함), `CREATE UNIQUE INDEX … ON "users" ("email") WHERE "deletedAt" IS NULL`, `CREATE INDEX … ON "boards" ("userId")`, `ALTER TABLE "boards" ADD CONSTRAINT "FK_…" FOREIGN KEY ("userId") REFERENCES "users"("id") … ON DELETE RESTRICT`.
   없어야 하는 것: static_board 관련 어떤 문장도.
5. `pnpm run migration:lint` → `pnpm run migration:run` → `pnpm run seed:run` → `pnpm run start:local` (부팅 가드 `assertNoPendingMigrations` 통과 확인).

- 테스트 DB 는 e2e 헬퍼가 `dropDatabase + synchronize` 라 마이그레이션과 무관.

### 5.3 시드

- 파일: `src/domain/users/seeds/user.seed.ts` + `user.factory.ts`, `src/domain/boards/seeds/board.seed.ts` + `board.factory.ts`. static-board 의 seed·factory·`seeds/README.md` 는 삭제(README 는 포맷이 깨져 있고 내용은 CLAUDE.md Seeds 절과 겹친다).
- **등록 두 곳**: `src/database/seeds/main.seed.ts` 에 **UserSeeder → BoardSeeder 순서**(FK). `src/database/seeds/run.ts` 의 `factories: [UserFactory, BoardFactory]` — 글로브가 아니라 클래스 등록이다(파일 상단 주석). `typeorm.config.ts` seederOptions 의 템플릿용 경로 `src/domain/*/*/seeds/*.factory.{js,ts}` 는 제거.
- 고정 데이터: UserSeeder 가 사용자 1명(`new UsersRepository(dataSource.manager)` → `createUser`, phone 은 `normalizePhone`). BoardSeeder 가 그 사용자에게 글 1개.
- **boardCount 정합성**: BoardSeeder 는 레포가 아니라 **서비스를 손으로 조립해 `generateBoard`** 로 넣는다 —
  `new BoardsService(new BoardsRepository(m), new UsersService(new UsersRepository(m), dataSource), dataSource)` (`m = dataSource.manager`). 랜덤 글도 `factory.make()` 로 값만 만들고 `generateBoard` 로 저장. 운영 경로 하나로 카운터가 저절로 맞는다.
  대안은 `factory.saveMany` 뒤 `UPDATE users SET "boardCount" = (SELECT count(*) …)` 재계산 한 문장 — 경로가 둘이 된다. 추천은 전자.
- 랜덤: `NODE_ENV !== "prod"` 가드 안에서 유저 5 · 글 20 정도. **UserFactory 의 email 은 유니크를 보장**해야 한다(중복이면 시드가 23505 로 죽는다) — `faker.helpers.uniqueArray` 또는 인덱스 접미사.

## 6. 상수·에러 (제안)

- `src/domain/users/users.constants.ts`: `USER_NOT_FOUND: "사용자를 찾을 수 없습니다."`, `DUPLICATE_EMAIL: "이미 사용 중인 이메일입니다."`
- `src/domain/boards/boards.constants.ts`: `BOARD_NOT_FOUND: "게시글을 찾을 수 없습니다."`, `NOT_DRAFT: "초안 상태의 글만 발행할 수 있습니다."` + `BoardStatus` enum.
- 409 변환은 `generateUser` 의 catch 에서 `isUniqueViolation` 로. 그 외 DB 에러는 잡지 않는다 — 전역 필터가 23505/23503 을 409 로, 나머지는 500 으로 보낸다.

## 7. 테스트 (제안)

구조는 지금과 같이 `test/domain/<name>/{fixtures,mocks,scenarios}`. `test/domain/static-board/` 삭제.

**users.e2e-spec**: 생성 201 / 같은 이메일 409 / 목록 + `nameLike` / 상세 200 / **`GET /users/0` → 404, `GET /users/abc` → 400** / patch 후 상세 반영, 없는 id 404 / delete 후 상세 404 / **delete 뒤 같은 이메일 재생성 201**(부분 유니크).

**boards.e2e-spec**: 생성 201 → `GET /users/:id` boardCount 1 / **없는 userId 로 생성 404 → boards 목록 count 변화 없음(롤백 확인)** / 목록에 `userName` 있고 `content` 없음 / 필터 userId·status·titleLike(제목에 `%` 를 넣고 `%` 로 검색해 이스케이프 확인) / 상세 + content / publish 200 → PUBLISHED·publishedAt / **publish 재시도 409** / patch / delete → boardCount 0 / pagination 없이 전부 + count, `page=1&pageSize=2` 로 2개.

실행: `NODE_ENV=test TZ=Asia/Seoul pnpm exec jest --config ./test/jest-e2e.json --forceExit test/domain/boards`

## 8. 문서·정리 (제안)

- 삭제: `src/domain/template/` 전체 — static-board 와 `dynamic/`(빈 `DynamicModule`, 어디서도 import 안 함) / `test/domain/static-board/` / 옛 마이그레이션 / `run.ts` 의 `StaticBoardFactory`.
- `src/app.module.ts`: `StaticBoardModule` → `UsersModule, BoardsModule`.
- CLAUDE.md: "Reference implementation: `src/domain/template/static-board/`" → `src/domain/users/` + `src/domain/boards/`; Naming 예시 `POST /static-boards → postStaticBoard …` → users; Transactions 의 "reference copy lives as a comment under `generateStaticBoard`" → `generateBoard` 가 실제 구현이 된다; `patchStaticBoard` 언급 → `patchUser`. 레포 절에 "조인은 컨트롤러가 `isJoinUser` 로 켠다, DTO 에 데코레이터 없이" 한 줄 추가. README.md · test/README.md 도 같은 치환.
- 새 파일: `src/global/helpers/like.helper.ts`.

---

## 9. 작업 순서 (집에서 이어받기)

1. 스테이징된 17개 파일 커밋·푸시. 이 문서는 `git add -f` 로 포함.
2. §5–§8 을 읽고 걸리는 것만 표시 → 확정. 브레인스토밍 규칙: 확정 전 코드 변경 없음.
3. 확정되면 `superpowers:writing-plans` 로 구현 계획 → 구현. 권장 순서: `like.helper` → users(엔티티·constants·DTO·레포·서비스·매퍼·컨트롤러·모듈) → boards → `app.module` → static-board 삭제 → 마이그레이션 생성(§5.2) → 시드(§5.3) → e2e(§7) → 문서(§8).
4. **다음 스텝(별도 커밋)**: `tsconfig.json` `strictNullChecks: true`. 2026-10-20 측정 57 에러 —
   45개는 `const decorators = [];` 9곳(`src/global/decorators/dto.decorator.ts` 54·69·88·129·140·157·168, `api-property-validator.decorator.ts:71`, `api-doc.decorator.ts:49`) 타입 주석으로 해결;
   12개는 `app.module.ts:80`, `database/config/typeorm.config.ts:12`, `global/dtos/object-response.dto.ts:7`, `crypto.helper.ts:22-24`, `date.helper.ts:13/27/41`, `http-logger.helper.ts:141/176`, `main.ts:22`.
   플래그와 수정은 **한 커밋**(pre-commit 에 typecheck 가 없다. pre-push e2e 가 잡는다).

## 10. 근거

- Nest 문서 "TypeORM Transactions": *"We recommend the `QueryRunner` class, because it gives you full control over the transaction."* — https://docs.nestjs.com/data/typeorm
- TypeORM `increment` 시그니처: `node_modules/typeorm/entity-manager/EntityManager.d.ts:470` (`decrement` :479). 문서: https://typeorm.io/docs/working-with-entity-manager/entity-manager-api
- 부분 유니크 인덱스 `where?: string`: `node_modules/typeorm/decorator/options/IndexOptions.d.ts:36`
- 조인된 soft-delete 엔티티 자동 필터: `node_modules/typeorm/query-builder/SelectQueryBuilder.js:1111-1116`
- find-options 는 `undefined`/`null` 조건에서 throw(`invalidWhereValuesBehavior`): `node_modules/typeorm/data-source/BaseDataSourceOptions.d.ts:175-179`, `SelectQueryBuilder.js:2606-2624`. **QueryBuilder 는 던지지 않는다** — `{ id: undefined }` → `WHERE id = NULL` → null. 그래서 단건 조회는 id 를 조건부가 아니라 무조건 붙인다(§4).
