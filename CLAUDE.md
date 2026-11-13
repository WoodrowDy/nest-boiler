# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

NestJS + TypeScript + TypeORM + PostgreSQL boilerplate. Package manager: **pnpm**.

---

## Development Commands

### Build & Run

```bash
pnpm run build          # Production build (nest build)
pnpm run start:local    # Local dev server (NODE_ENV=local, TZ=Asia/Seoul, --watch)
pnpm run start:dev      # Dev server (NODE_ENV=dev)
pnpm run start:prod     # Production (node dist/src/main — build lands in dist/src/ because envs/env.ts is outside src/)
pnpm run typecheck      # tsc --noEmit (pre-commit does NOT run this)
pnpm run format         # Prettier
pnpm run lint           # eslint --fix
```

**The app refuses to boot when migrations are pending** — `assertNoPendingMigrations` in
`src/global/helpers/pending-migrations.helper.ts`, called before `NestFactory.create`. A schema
that lags the code still starts fine and then fails silently once a `try/catch` swallows the error,
so it dies here instead. The message names the env, the DB and the command to run.

### Local Database (Docker)

Postgres must be running before migrations/seeds/tests.

```bash
cp envs/.env.docker.example envs/.env.docker   # once (git-ignored credentials)
pnpm db:up      # start Postgres container, wait until healthy
pnpm db:down    # stop (volume kept)
pnpm db:reset   # drop volume + restart (full reset)
```

- Host port **5434** → container 5432 (avoids clashing with a system Postgres on 5432 or another project on 5433).
- Credentials come from a single source: `envs/.env.docker` (never hardcoded in `docker-compose.yml`).
- On first boot the init script creates both `nest-boiler` (local) and `nest-boiler-test` (test) DBs.

### Migrations & Seeds

```bash
pnpm run migration:generate <name>   # run pending, then generate from entity diff (review before commit!)
pnpm run migration:create <name>     # empty migration (manual/data changes)
pnpm run migration:check             # entity vs DB diff without writing a file (exit 1 = changes)
pnpm run migration:run               # apply
pnpm run migration:revert            # revert last
pnpm run seed:run                    # run MainSeeder
pnpm run setup-db                    # run + seed
pnpm run migration:lint              # file names + destructive SQL in up()
```

The commands above pin `NODE_ENV=local`, so they always target the local DB in `envs/.env.local`.

- **A migration is named `verb-object`, kebab-case, with SQL verbs** — the repository's rule again.
  Schema: `create | add | alter | rename | drop`; data: `insert | update | delete`. `remove` is not
  accepted (it duplicates `drop`). `pnpm migration:generate add-board-status` writes
  `<timestamp>-add-board-status.ts` with class `AddBoardStatus<timestamp>`. The rule lives in
  `scripts/_migration-name.sh`; `migration-new.sh` refuses a missing or bad name, and
  `migration-lint.sh` blocks one at commit (lint-staged) — names are not a judgment call, so this
  block needs no `--strict`.
- **`migration:generate` runs `migration:run` first.** generate diffs the entities against the
  *local DB*; if that DB lags behind a migration made elsewhere, the change lands in your file a
  second time and the deploy fails with "already exists". It cannot catch the opposite (a DB ahead
  of the code, e.g. a column from another branch): generate then emits a `DROP`, which the lint run
  it prints right after flags as destructive.

**Deploy environments** use a separate, deliberately slower path — run these *on the server* over ssh:

```bash
pnpm migrate:show:dev     # what would apply — read-only
pnpm migrate:run:dev      # apply, after typing the env name to confirm
pnpm migrate:revert:dev   # revert the last one (type `revert-dev`)
```

- **prod is never reverted — roll forward.** Fix a wrong migration with a new one on top; never
  edit the applied file. `migrate:revert:prod` does not exist, and `migrate.sh prod revert` refuses.
  A failed apply undoes itself (TypeORM runs all pending migrations in one transaction, default
  `"all"`, and Postgres rolls DDL back), so a revert would only ever be for one that succeeded but is
  wrong — and its `down()` usually drops what was just added, values included.

- `scripts/_db-env.sh` resolves `envs/.env.<env>`, prints the target, and refuses on a missing file.
  Set `EXPECTED_DB_NAME` in that env file to also cross-check `DB_NAME` — it catches a prod config
  copied into `.env.dev`. Leave it blank to skip the check.
- `DEPLOY.md` is written for **one cheap EC2 instance + pm2**: a human runs the migration over ssh,
  separately from the deploy, because schema changes are expensive to undo. Order is always migrate
  first, deploy second — the boot guard (`assertNoPendingMigrations`) refuses to start the app if you
  get it backwards.
- **Containers → GitHub Actions.** There the pipeline may run migrations as a step: a pre-test on an
  empty Postgres (`migration:run`, then `migration:generate <path> --check`), and applying behind a
  GitHub Environments approval. `migrate.sh` needs a TTY, so the pipeline calls
  `pnpm run typeorm migration:run` directly, from a place that has `src/` and devDependencies.
- Migrate-then-deploy means the old app runs on the new schema for a moment, so a migration must not
  break the running app: add first, and drop or rename a column in a later deploy (table in `DEPLOY.md`).
- The server needs devDependencies (`migrate:*` runs `ts-node` on `src/`, not `dist/`), `NODE_ENV` set by
  the process manager (`start:prod` does not set it; without it the env validation fails), and the repo
  root as working directory. Only `dev` and `prod` exist; `DEPLOY.md` lists what a new env touches.
- No tunnel script ships here, but there is a seam for one. If reaching the DB needs infra-specific
  setup (ssh tunnel, Cloud SQL Proxy, RDS IAM token), create `scripts/db-connect.sh` — `_db-env.sh`
  sources it after reading the env file, and anything you `export` there wins over the env values.
  **Do not edit `_db-env.sh` itself**; infra code there collides on every boilerplate update.

See `DEPLOY.md` for the recommended deploy shape and the reasoning behind it. The boilerplate ships
no `deploy.sh` — infra differs per project — but it does ship the migration path, since without it
there is no way to get a schema onto a deploy environment at all.

### Testing

```bash
pnpm run test:local   # e2e (auto-runs `db:up` via pretest:local)
pnpm run test:e2e     # e2e
pnpm run test         # jest unit
pnpm run test:cov     # coverage
```

- Each e2e suite drops and re-synchronizes the test DB, then runs its `it`s top to bottom on that one
  DB (`maxWorkers: 1`). **Do not assume ids are consecutive**: a failed INSERT (a 409) still consumes
  a sequence value, so the next row skips one. Assert "a new row" (`id !== 1`) rather than an exact
  id unless nothing before it can fail.

### First run (fresh clone)

```bash
pnpm install
cp envs/.env.docker.example envs/.env.docker
cp envs/.env.local.example  envs/.env.local
pnpm db:up && pnpm migration:run && pnpm seed:run
pnpm run start:local
```

---

## Architecture

Directories are organized by domain (package-by-domain), but the internal architecture is a
classic **layered service architecture** (Controller → Service → Repository → Entity). This is
"DDD-lite": DDD-style module boundaries over an anemic domain model. Not full tactical DDD.

```
src/
  domain/<name>/
    controllers/   # HTTP boundary
    services/      # orchestration (validation, transaction boundary)
    repositories/  # data access (Entity in/out only)
    entities/      # persistence-only (@Column, @Index)
    dtos/
      shared/      # field contract: @ApiProperty + class-validator (+ @Transform)
      request/     # payload / query (derived from shared)
      response/    # output-only (derived from shared + AuditResponse)
    mappers/       # Entity -> Response (stateless)
    seeds/         # domain seeder + factory
    <name>.constants.ts / <name>.module.ts
  domain/jwt/      # token verification middleware — no guard yet (see Known gaps)
  global/          # cross-cutting: constants, context, decorators, dtos, enums, filters, helpers,
                   # interceptors, interfaces, logger, middlewares
  database/        # config/typeorm.config.ts, migrations/, seeds/ (main.seed.ts order, run.ts
                   # factory registration), entities/ (core-hard/core-soft base)

scripts/           # db-up/down/reset.sh, migration-new.sh, migration-lint.sh, _migration-name.sh
                   # (name rule both read), migrate.sh, _db-env.sh,
                   # db-connect.sh.example (per-project DB reachability — tunnel/proxy/IAM),
                   # postgres/init-extra-dbs.sh (creates the extra DB on the container's first boot)
envs/              # env.ts (NODE_ENV -> file), .env.*.example (committed; .env.* are ignored)
```

Reference implementation: **`src/domain/template/users/`** (plain CRUD) and
**`src/domain/template/boards/`** (a relation to users, a two-write transaction, a business action).
Copy `users` when adding a domain; `boards` shows what to add once a domain touches another one.
`template/` holds examples only.

---

## Layer Rules (enforced)

Documented in `README.md` and **mechanically enforced by ESLint** (`no-restricted-imports` in
`eslint.config.mjs`). Prefer lint enforcement over prose.

- **Entity = persistence only.** No `@ApiProperty` (Swagger), no `class-validator`, no
  `class-transformer`. Those responsibilities live in `dtos/shared`.
  → ESLint blocks importing `@nestjs/swagger` / `class-validator` / `class-transformer` in `**/entities/*.entity.ts`.
- **DTOs derive from a single field contract.** `dtos/shared/*-fields.dto.ts` owns validation +
  Swagger; request/response DTOs derive via `PickType`/`PartialType`/`IntersectionType`. Do NOT
  derive DTOs from the entity.
  - **The shape rule, whatever the domain: one response shape per endpoint, one definition per field
    name. When the two collide, split the name.** Everything else follows — write the entity, list
    the routes (that count is the number of response shapes), put the fields in the contract, derive
    with `PickType`, give the mapper one method per shape.
  - Only two kinds of collision exist, and each has one answer:
    - **Same name, different shape** → different fields, different names. A detail `body` of 2,000
      characters and a list preview of 100 are not one field; `body` and `bodyPreview` are. Reusing
      the name forces the client to remember which endpoint it came from.
    - **Output-only computed value** (`isCurrent`, an aggregate) → keep it out of the contract,
      which owns validation and has nothing to validate here. Declare it on the response DTO itself
      and have the service build it into a domain result type; the mapper copies it in one line.
      Same precedent as `deletedAt` below.
  - The rule does not decide **directory layout** (flat `request/`·`response/` here; endpoint folders
    pay off past roughly ten routes) or **how many services and repositories a domain has**.
- **Response DTOs are pure data** (no methods). Formatting/behavior goes to a util or the mapper.
  Audit fields (id/createdAt/updatedAt) come from `global/dtos/audit.response.ts`. **`deletedAt` is
  deliberately not there** — soft delete is an implementation detail, deleted rows are filtered out
  of reads anyway, and `CoreHardEntity` domains have no such column. A domain that genuinely needs
  it declares one line on its own response DTO.
- **Service returns entities/domain**, never HTTP response DTOs. Entity→Response conversion happens
  at the controller boundary via the mapper.
  → ESLint blocks importing `**/dtos/response/**` in `**/services/*.ts` and `**/repositories/*.ts`.
  - Values the response needs but the entity lacks (computed, aggregated, joined) go into a **domain
    result type exported from the service file** — not a DTO. It never crosses the HTTP boundary.
  - **One `await` per controller method.** Two means the controller is orchestrating; fold it into
    the service.
- **Mappers copy, they do not compute.** The test: *would this code still be needed if HTTP went
  away?* If yes, it belongs to the domain — the service builds it and the mapper takes it in one line.
  - Listing every outgoing field by hand is the point. TS types do not exist at runtime and there is
    no `ClassSerializerInterceptor` here, so **what you don't write doesn't ship** (closed) — safer
    than `@Exclude` (open), where forgetting one leaks instead of omitting.
  - → ESLint blocks `**/repositories/*`, `**/services/*`, `typeorm`, `@nestjs/common` (a mapper is a
    plain object, not a provider), `async` and `Object.assign` in `**/mappers/*.ts`; and
    `**/repositories/*` / `typeorm` in `**/controllers/*.ts`.
- **One response shape per endpoint, not per domain.** A single shape converges on the largest one:
  the list ends up carrying whatever the detail needs, so every row ships a 2,000-character body and
  a phone number nobody asked for. Split the response DTO (`XListItemResponse`, `XDetailResponse`)
  and give the mapper one method per shape (`toListItem`, `toDetail`, `toSaveResponse`).
  - **Narrow the input with `Pick`.** `toListItem(entity: Pick<X, "id" | "category" | …>)` states that
    this response does not know about the body, and it keeps compiling once the list query stops
    selecting that column.
  - **No array helper.** A `toList` that only wraps `entities.map(toResponse)` adds nothing — the
    controller maps. Wrap the callback in an arrow (`list.map((e) => Mapper.toListItem(e))`);
    `unicorn/no-array-callback-reference` blocks passing the method directly, because `.map` also
    hands the callback an index and the array.
  - **Assign field by field; never `Object.assign`.** Verified with tsc: `Object.assign(new X(), {…})`
    silently accepts a misspelled key, an extra key and a missing required one. The extra key is the
    dangerous one — it ships straight to the client, breaking the closed default this layer exists
    to keep.
- **Repository handles queries only.** Existence checks (404) and transaction boundaries live in the
  service. Reads return `Entity` / `Entity[]`, and a single lookup returns `null` when nothing
  matches; writes return the affected row count, which is how the service learns about a miss
  without a read. Repositories never throw and never wrap calls in `try/catch` (see Error Handling).
  - **A repository is a plain `@Injectable()` that injects `EntityManager`.** It does not extend
    TypeORM's `Repository`: that would hand `find`/`save`/`delete` to every injector beside the named
    methods, and the naming table below would be a suggestion instead of the vocabulary. Taking only
    an `EntityManager` also means it cannot open a transaction — joining is all it can do.
  - **Every executing `return` is `return await`** (`@typescript-eslint/return-await: always`). The
    repository method stays in the stack trace, and wrapping the call in `try/catch` later does not
    change what it means. Building a query is not executing it: `buildSelectQuery` returns a
    `SelectQueryBuilder` and is not awaited; `getMany`/`save`/`findOneBy` are.
  - **`buildSelectQuery` holds the list filters; the single read adds `id` itself, unconditionally.**
    `selectX({ id, ...query })` is `this.buildSelectQuery(query).andWhere("x.id = :id", { id })`, and the
    filter builder has no `id` branch. A conditional `if (id !== undefined)` lets `0`, `undefined` or
    a forgotten argument fall through to "the newest row": QueryBuilder does not reject them the way
    find-options do. Next to `GetXQuery`, `export type GetXByIdQuery = GetXQuery & { id: number }`
    makes `id` required at compile time for `selectX` / `readX` / `readXOrNull`.
  - **User text in `LIKE` / `ILIKE` goes through `toLikePattern`** (`global/helpers/like.helper.ts`),
    which escapes `%` `_` `\`. A bare `` `%${term}%` `` turns a typed `%` into "match everything".

Prettier config is a single source: `.prettierrc` (ESLint reads it, no inline options).

---

## Naming (CRUD)

Each layer takes its verbs from one source, so a method name tells you which layer you are in:
**the controller speaks HTTP, the repository speaks SQL, the service uses plain CRUD verbs that
neither of them uses.** Form is `verb + Entity`; list reads add `List` or `ListAndCount`, and the
controller's list is `getXs`.

| Layer | create | read one | read list | update | delete |
|---|---|---|---|---|---|
| Controller | `postX` | `getX` | `getXs` | `patchX` | `deleteX` |
| Service | `createX` | `readX` | `readXList` · `readXListAndCount` | `modifyX` | `removeX` |
| Repository | `insertX` | `selectX` | `selectXList` · `selectXListAndCount` | `updateX` | `softDeleteX` (`hardDeleteX`) |

```
POST   /users      → postUser   → createUser           → insertUser
GET    /users/:id  → getUser    → readUser             → selectUser
GET    /users      → getUsers   → readUserListAndCount → selectUserListAndCount
(in code)                       → readUserList         → selectUserList
PATCH  /users/:id  → patchUser  → modifyUser           → updateUser
DELETE /users/:id  → deleteUser → removeUser           → softDeleteUser
```

- **Controller = the HTTP method** (`post` / `get` / `patch` / `delete`), so the name says which
  request it handles.
- **Repository = the SQL operation** (`insert` / `select` / `update`). Deletion names what actually
  happens instead: `softDeleteX` (`manager.softDelete`, `@DeleteDateColumn`), and `hardDeleteX` in a
  `CoreHardEntity` domain. The SQL verb would make it `deleteX`, which is the controller's name.
- **Service = `create` / `read` / `modify` / `remove`.** `read` is not a different operation from
  `select`, nor `modify` from `update`; the words are split by layer, not by meaning, so that a name
  identifies its layer. `generate` is left for producing an artifact (a token, a report), not for
  creating a row.
- **This is the project's convention, not something Nest or TypeORM imposes.** It applies to methods
  the project defines; TypeORM's own API keeps its names, and a custom method does not have to match
  the ORM call inside it — `selectX` may well call `findOne` / `getOne`.
- **Writes outside CRUD follow the same split.** A counter is `UPDATE … SET boardCount = boardCount +
  :delta`, so the repository says `updateUserBoardCount`; the service says what it means to the
  business, `addBoardCount`.
- **ESLint enforces the split** (`no-restricted-syntax` per layer in `eslint.config.mjs`): a method in
  `**/services/*.ts` never starts with a controller or repository verb (`get`, `post`, `insert`,
  `select`, `find`, `update`, …), and so on for each layer. It
  is a ban list, not an allow list — business verbs (`publishBoard`, `addBoardCount`) and helpers
  (`buildSelectQuery`) pass. `generate` is not banned in services, because of the artifact case.
- **List reads.** `...ListAndCount` takes an optional `PaginationQuery`: with it, that page plus the
  count of every matching row; without it, every matching row plus the count. `...List` is the
  unpaged `Entity[]` for callers inside the code (another service, a batch). Never pass a large page
  size to mean "all".
- Service reads throw on a miss, so there is no `OrThrow` suffix (see Error Handling).
- **Request DTOs are named after the endpoint:** HTTP verb + singular entity + `Payload` / `Query` —
  `PostUserPayload` (`post-user.dto.ts`), `PatchUserPayload`, `GetUserQuery`, plus
  `GetUserByIdQuery = GetUserQuery & { id: number }`. They are the HTTP contract (Swagger + the
  validation pipe), so they carry the endpoint's name into the service signature
  (`createUser(payload: PostUserPayload)`); the verb ban above is about method names, not types. A values type the service builds itself (`ModifyBoardValues`) is not a request DTO.
- **Plural for the module's parts, singular for the thing.** `UsersController`, `UsersService`,
  `UsersRepository`, `UsersModule`, `users.service.ts`, route `users`; but `User`, `UserFields`,
  `UserMapper`, `UserSeeder`, `UserFactory`, `user.entity.ts`, `PostUserPayload`. Use the real
  English plural (`CategoriesService`, `categories`).
- **Business actions get a business verb**, built on the CRUD set. The controller endpoint is the
  HTTP verb plus the service method name — `POST /notices/:id/publish` → `postPublishNotice` →
  `publishNotice`. In a service, `this.modifyX` means the base set, `this.xRepository.updateX` means
  straight to the DB, so the call itself tells you how deep you are.
  - **The base set knows nothing about state.** `modifyX(id, payload, manager?)` changes fields and
    that is all. A transition rule belongs to the action that needs it, checked in that method's own
    body:

    ```ts
    async publishNotice(id: number, transactionManager?: EntityManager): Promise<void> {
      const notice = await this.readNotice({ id }, transactionManager);
      if (notice.status !== NoticeStatus.DRAFT) {
        throw new ConflictException(constants.errorMessages.NOT_DRAFT);
      }

      await this.modifyNotice(id, { status: PUBLISHED, publishedAt: now() }, transactionManager);
    }
    ```

  - **Do not push the rule into parameters** — `modifyX(id, payload, statusValues = {}, allowedFrom
    = [DRAFT])` looks like reuse and is not. Two of the four arguments are behaviour switches, so the
    rule lives in the argument list instead of in a body you can read, and a plain
    `modifyX(id, payload)` that only means to edit a title silently inherits "DRAFT only" from the
    default. Every new action then adds a switch or overloads an existing one, and all the state
    rules pile up in one method.

**Never re-read after a write in the same request.** If the `INSERT`/`UPDATE` returned without an
error it succeeded; respond with the saved result or with values you already hold.

- Reads go to a replica under replication, so a read right after a write can land before the row has
  replicated: a 404 for the row you just created, or pre-update values. It never reproduces on a
  single local DB, so it only shows up in production.
- `insertX` can return the entity because `manager.save()` gives it back, defaults included.
  `updateX` cannot — `manager.update()` returns an `UpdateResult`, and query-builder writes skip
  `@BeforeUpdate`. So an update path must not promise fields the DB or a hook computes. Returning
  `void` (what `patchUser` does) is the honest default.

## Transactions

The transaction **boundary is the service**, not the repository. Every service injects `DataSource`
and is the only layer that can open a transaction; a repository injects `EntityManager` and can only
join one. Repositories are transaction-aware but not transaction-owning: each method accepts an
optional `transactionManager?: EntityManager` and resolves the manager once:

```ts
const manager = transactionManager ?? this.manager;   // repo's own manager if none passed
```

Service methods take the same optional `transactionManager?` and **only pass it through** to the
repository (and to other services). That parameter is the propagation channel: a caller that owns a
transaction hands its manager in, and everything below runs inside it.

- A passed `transactionManager` is joined as-is: run on it; commit/rollback/release belong to whoever
  opened it. Otherwise:
- One statement → call the repo without opening a transaction (a single statement is atomic). An
  existence check folds into the write: `UPDATE … WHERE id = :id AND deletedAt IS NULL`, and
  `affected === 0` is the 404. A read-then-write pair inside a transaction does **not** close that
  gap without a lock, so that is not what a transaction is for here.
- Two or more writes that must be one unit → **the method that needs the transaction opens it, there
  and only there**: a `QueryRunner` (the form Nest's docs recommend), with `queryRunner.manager` passed
  down to every repo call and to other services. Reference: `BoardsService.createBoard` /
  `removeBoard`.
- **A method that opens a transaction does not take `transactionManager`**; every other service
  method does. Taking it "for uniformity" either ignores it (the caller believes it joined, and it did
  not) or needs a join branch that repeats the body.

```ts
async createX(payload: PostXPayload): Promise<X> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();   // inside try: if starting fails, finally still releases

    const result = await this.xRepository.insertX(payload, queryRunner.manager);
    await this.otherService.createOther(other, queryRunner.manager);

    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

- **When an opener later has to run inside a caller's transaction**, give it `transactionManager?`
  then and branch on it: passed → run on it and leave commit/rollback/release to the owner; not passed
  → open as above. Add the branch when that caller exists, not before. Until then, calling an opener
  from inside another transaction runs it on a second connection — not atomic with the caller, and it
  hangs on any row the caller has already locked.
- **Inside a transaction, run first the write that can report "missing".** `createBoard` increments
  the author's `boardCount` (`affected === 0` → 404) before it inserts the board. In the other order
  the INSERT fails on the foreign key (23503), which the global filter turns into 409 — the wrong
  status for "no such author", and the INSERT already spent a sequence value.

## Error Handling

Classify errors by **meaning**, not by where they come from. DB errors fall on both sides.

- **Expected (business rule)** — not found, wrong state, duplicate (unique violation), delete while
  referenced (FK violation). The service throws a Nest exception (`NotFoundException`,
  `ConflictException`, …) with a message from the domain's `*.constants.ts`.
- **Unexpected (failure)** — connection lost, timeout, query bug. Not caught; it propagates.

Rules:

- **A service read throws on a miss; the repository returns `null`.** Throwing is what the service
  layer is for, so `readX` raises `NotFoundException` and there is no `readXOrThrow` twin — that
  twin delegates without adding anything, which is one behaviour under two names.
- **`readXOrNull` is the pair that earns its name.** It passes the repository result through, and
  `readX` calls it and adds the guard, so the throw and its message stay in one place and the query
  count does not change. Use it wherever a miss is a normal outcome: a duplicate check, an upsert, a
  nullable relation, a batch that skips what it cannot find.
- **A domain is entered through its service, never its repository.** ESLint blocks
  `src/domain/*/**/repositories/*` inside `**/services/*.ts` and `**/repositories/*.ts`, so another
  domain cannot reach past the transaction boundary and the existence check. Own-domain imports use
  `../repositories/*` and are unaffected. That restriction is why `readXOrNull` exists rather than
  letting callers reach for `selectX` themselves.
- **A write that another domain composes into its transaction returns `affected` instead of
  throwing, when only the caller knows what zero rows means.** `UsersService.addBoardCount` returns
  the count: `createBoard` turns 0 into 404 (`WRITER_NOT_FOUND`), `removeBoard` ignores it (the
  author withdrew, and the board must still go). Throwing in the callee picks one meaning for both
  callers, and the wrong one rolls back a legitimate delete. Ordinary writes (`modifyX`, `removeX`)
  still throw — their zero has one meaning.
- No `try/catch` in repositories. Wrapping hides the cause and stops the service from telling a
  duplicate from an outage.
- Translate DB constraint errors **at the catch site** using `src/global/helpers/db-error.helper.ts`
  (`isUniqueViolation` = PostgreSQL `23505`, `isForeignKeyViolation` = `23503`). Each catch site knows
  which constraint it can hit, so there is no lookup table.
- `try/catch` in services only for transaction rollback and the translation above:

```ts
} catch (error) {
  if (isUniqueViolation(error)) throw new ConflictException(constants.errorMessages.DUPLICATE_X);
  throw error;
}
```

Whatever reaches the HTTP boundary is handled by the **global exception filter**
(`global/filters/http-exception.filter.ts`, mounted in `main.ts`). It keeps Nest's shape and adds
`meta`: `{ message, error, statusCode, meta: { traceId, timestamp } }`. Two things it does that the
catch sites above rely on:

- **Constraint errors that no catch site translated** still become `409` (`23505`, `23503`), so a
  missed translation degrades to a sane status instead of a 500. Translating at the catch site is
  still preferred — only there does a domain message exist.
- **Unknown errors never leak their text.** The body is a generic message; stack and driver text
  (which name tables and columns) stay in the log. `meta.traceId` is what ties the two together.
- **The filter logs every 5xx itself, with its stack.** A catch-all `@Catch()` replaces Nest's default
  handler, and that handler is what used to log it — without the filter's log line a 500 leaves only
  the `HTTP RES … 500` access line, and the traceId leads nowhere. 4xx are not logged there; the access
  log already has the status.

## TypeORM hooks vs query methods

- Entity lifecycle hooks (`@BeforeInsert`/`@BeforeUpdate`) run **only** with entity-based ops
  (`save`, `softRemove`). Query-builder ops (`update`, `insert`, `delete`, `softDelete`) **skip** hooks.
- `manager.create(...)` only instantiates an object — it does **not** run hooks. Hooks fire on `save`.
- Convention here: **input normalization lives in the DTO (`@Transform`), not entity hooks** — it is
  path-independent (works for save/update/seed) and keeps the entity pure. Example: phone
  normalization uses `normalizePhone` (`global/helpers/phone.helper.ts`), shared by the DTO `@Transform`
  and the seeds.

---

## Responses & Observability

- Success responses are wrapped by `ObjectResponse` (`{ row, meta }`) / `ListResponse`
  (`{ rows, count, meta }`). `meta = { traceId, timestamp }`.
- **A write answers with its status code.** POST returns the saved resource
  (`ObjectResponse<XSaveResponse>`); PATCH, DELETE and business actions return no body — 200 means it
  happened, 404 / 409 say why not, and the client refetches what it needs. Their traceId is in the
  `X-Request-Id` header.
  - **Never return TypeORM's `InsertResult` / `UpdateResult` / `DeleteResult`.** `raw` is shaped by the
    driver (on Postgres an INSERT's `raw` is the `RETURNING` rows), so it breaks the closed default, and
    the API contract would change with the ORM.
- **traceId**: `TraceIdMiddleware` assigns one per request (uses incoming `X-Request-Id` or a UUID),
  stores it in `AsyncLocalStorage` (`global/context/request-context.ts`), and returns it as the
  `X-Request-Id` response header.
- **Logging**: Winston (`global/logger/winston.config.ts`) via `app.useLogger`. Every log line gets
  the request's traceId automatically. Access logs: `RequestLoggerMiddleware` (`HTTP REQ`) and
  `ResponseLoggerInterceptor` (`HTTP RES`, status + duration; level = info/warn/error by status).
  Every 5xx is also logged by the global filter with its stack (see Error Handling). TypeORM's own
  query logging is off (`logging: false` in `typeorm.config.ts`).
- Swagger: use the `@ApiDoc` decorator. It documents the success response and auto-includes standard
  error responses (400/401/403/404/500). Available at `/api-docs`. Outside `local` it sits behind
  Basic auth, and the app refuses to boot without `SWAGGER_USER` / `SWAGGER_PASSWORD`.

---

## Conventions Recap

- Migrations: entity change → `migration:generate` (auto), data/manual → `migration:create`.
  - **Never edit an applied migration** — add a new one. In VS Code, `src/database/migrations/**` is
    marked **read-only** (`.vscode/settings.json` → `files.readonlyInclude`), so trying to edit a
    migration (even a freshly generated one, e.g. to turn a `DROP`+`ADD` into an `ALTER`) requires
    explicitly toggling read-only off — an edit-time "are you sure?" nudge (no git hook involved).
  - **Review the generated SQL before committing.** For a simple column change, prefer an in-place
    `ALTER` (modify) over `DROP`+`ADD`, which loses data. TypeORM decides automatically; if it emits a
    destructive `DROP`+`ADD` for something that could be an `ALTER`, hand-fix it (unless intentional).
    This is a human review call, not automated.
  - prod keeps `synchronize: false`; migration glob is `*.{js,ts}` (loads under ts-node and compiled runtime).
- Seeds: **`seed:run` always targets local** — the script pins `cross-env NODE_ENV=local`, so
  prefixing `NODE_ENV` does nothing (it looks like it worked, which is the dangerous part).
  - **No deploy-environment seed path, deliberately.** It is not a technical limitation: drop the
    `cross-env` and let the caller set `NODE_ENV`, which is exactly how `migrate.sh` works. It is
    left closed because `migrate.sh` also prints the target, makes you type the env name, and
    refuses without a TTY — unpinning the seed without those guards means one line
    (`NODE_ENV=prod pnpm run seed:run`) writes to production with no confirmation. Add a `seed.sh`
    with the same guards if a real need shows up; before that, essential reference data usually
    belongs in a migration anyway, where ordering, revert and the boot guard already cover it.
  - Factory (random) data is guarded by `NODE_ENV !== "prod"` in the seeder itself, so that branch
    only matters once such a path exists.
- Environments: `local | dev | prod | test`, files in `envs/` selected by `NODE_ENV` (`envs/env.ts`).
  `.env.local` / `.env.dev` / `.env.prod` / `.env.docker` are git-ignored; `.env.test` (e2e) and the
  `.env.*.example` templates are committed. `app.module.ts` validates the env with Joi at boot.
- **`strictNullChecks` is on.** A value that can be missing says so in its type (`Date | null`,
  `responseCode?`); a value that must exist is read with `requireEnv("KEY")`
  (`global/helpers/env.helper.ts`), which throws with the key's name instead of handing on `undefined`
  or `NaN` — it also covers `typeorm.config.ts`, which the migration CLI loads without Nest's Joi
  validation. Do not silence the checker with `!`.

---

## Git Hooks (Husky)

- **pre-commit**: `lint-staged` → `eslint --fix` + `prettier --write` on staged `*.{ts,js}`,
  `migration-lint.sh` on staged migrations, `shellcheck` on staged `*.sh`. lint-staged hides the
  output of passing tasks, so the SQL warnings only show when you run `pnpm migration:lint` (or
  right after `migration:generate`); a bad name fails, so that one shows.
- **pre-push**: `pnpm run test:local` (e2e). Needs a running DB — `pretest:local` starts it via `db:up`.
  Use `git push --no-verify` to skip if the DB is unavailable.

---

## Known gaps

What the boilerplate does not do yet. Check this list before treating a behaviour as covered.

- **No auth guard.** `JwtMiddleware` runs on every route: a valid `Bearer` token attaches
  `req.session`, an invalid one is 403, and no token passes straight through. Nothing blocks an
  unauthenticated request — add a guard before exposing anything that needs a user.
- **DB query logging is off, and three env keys do nothing.** `typeorm.config.ts` hardcodes
  `logging: false`; `DB_LOGGING`, `DB_MAX_QUERY_EXECUTION` and `USE_LOCAL_HTTPS_OPTIONS` are validated
  but never read; `CustomDbLogger` exists but is not wired. 5xx are still logged by the filter.
- **`@ApiDoc` does not list 409** among its standard errors, although the filter returns 409 for
  constraint violations.

Local backlog notes live in `docs/TODO.md` and `docs/cmes-adoption-candidates.md` (git-ignored).
