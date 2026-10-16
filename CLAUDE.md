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
pnpm run start:prod     # Production (node dist/main)
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
pnpm run migration:generate   # generate from entity diff (review before commit!)
pnpm run migration:create     # empty migration (manual/data changes)
pnpm run migration:run        # apply
pnpm run migration:revert     # revert last
pnpm run seed:run             # run MainSeeder
pnpm run setup-db             # generate + run + seed
pnpm run migration:lint       # scan up() for destructive SQL before committing
```

The commands above pin `NODE_ENV=local`, so they always target the local DB in `envs/.env.local`.

**Deploy environments** use a separate, deliberately slower path — run these *on the server* over ssh:

```bash
pnpm migrate:show:dev     # what would apply — read-only
pnpm migrate:run:dev      # apply, after typing the env name to confirm
pnpm migrate:revert:dev   # revert the last one (type `revert-dev`)
```

- `scripts/_db-env.sh` resolves `envs/.env.<env>`, prints the target, and refuses on a missing file.
  Set `EXPECTED_DB_NAME` in that env file to also cross-check `DB_NAME` — it catches a prod config
  copied into `.env.dev`. Leave it blank to skip the check.
- Migration is deliberately **not** part of deploy: schema changes are expensive to undo, so a human
  confirms them. Order is always migrate first, deploy second — the boot guard
  (`assertNoPendingMigrations`) refuses to start the app if you get it backwards.
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
    seeds/         # domain seed + factory
  global/          # cross-cutting: constants, decorators, dtos, helpers, interceptors, middlewares, context, logger
  database/        # typeorm.config.ts, migrations/, seeds/main.seed.ts, entities/ (core-hard/core-soft base)

scripts/           # db-up/down/reset.sh, migration-lint.sh, migrate.sh, _db-env.sh,
                   # db-connect.sh.example (per-project DB reachability — tunnel/proxy/IAM)
envs/              # env.ts (NODE_ENV -> file), .env.*.example (committed; .env.* are ignored)
```

Reference implementation: **`src/domain/template/static-board/`** — copy this when adding a domain.

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
  - → ESLint blocks `**/repositories/*`, `**/services/*`, `typeorm`, `async` and `Object.assign` in
    `**/mappers/*.ts`; and `**/repositories/*` / `typeorm` in `**/controllers/*.ts`.
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
  service. Return type is always `Entity` / `Entity[]`; a single lookup returns `null` when nothing
  matches. Repositories never throw and never wrap calls in `try/catch` (see Error Handling).
  - → ESLint also blocks `@nestjs/common` in `**/mappers/*.ts` (a mapper is a plain object, not a provider).

Prettier config is a single source: `.prettierrc` (ESLint reads it, no inline options).

---

## Naming (CRUD)

Each layer owns its own verbs, so a method name tells you which layer you are in. Form is
`verb + Entity`; a list method that also returns a count is `...ListAndCount` (what `ListResponse`
needs).

| Layer | create | read one | read list | update | delete |
|---|---|---|---|---|---|
| Controller | `postX` | `getX` | `getXs` | `patchX` | `deleteX` |
| Service | `generateX` | `readX` | `readXListAndCount` | `modifyX` | `removeX` |
| Repository | `createX` | `findX` | `findXListAndCount` | `updateX` | `softDeleteX` |

`POST /static-boards` → `postStaticBoard` → `generateStaticBoard` → `createStaticBoard`.

- **A service never uses an HTTP verb (`get`, `post`) or a SQL verb (`insert`, `find`, `update`).**
  Seeing `find...` in a service means a repository method leaked upward. Service reads throw on a
  miss, so there is no `OrThrow` suffix either (see Error Handling).
- **`softDeleteX` names what it does** (`manager.softDelete`, `@DeleteDateColumn`). It also keeps the
  repository from colliding with the controller's `deleteX`. A `CoreHardEntity` domain uses
  `hardDeleteX`.
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
- `createX` can return the entity because `manager.save()` gives it back, defaults included.
  `updateX` cannot — `manager.update()` returns an `UpdateResult`, and query-builder writes skip
  `@BeforeUpdate`. So an update path must not promise fields the DB or a hook computes. Returning
  `void` (what `patchStaticBoard` does) is the honest default.

## Transactions

The transaction **boundary is the service**, not the repository. Repositories are transaction-aware
but not transaction-owning: each method accepts an optional `transactionManager?: EntityManager` and
resolves the manager once:

```ts
const manager = transactionManager ?? this.manager;   // repo's own manager if none passed
```

- If an external tx (`transactionManager`) is passed, join it as-is and just run (the owner/caller does commit/rollback/release). Otherwise:
- Single-row op → call the repo without opening a transaction (single statement is atomic).
- Multi-step / needs a lock → service opens a new transaction with `createQueryRunner()` (connect → startTransaction → commit/rollback → release) and passes the manager to each repo call so they share one transaction.

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
  `src/domain/*/**/repositories/*` inside `**/services/*.ts`, so another domain cannot reach past
  the transaction boundary and the existence check. Own-domain imports use `../repositories/*` and
  are unaffected. That restriction is why `readXOrNull` exists rather than letting callers reach for
  `findX` themselves.
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
- **traceId**: `TraceIdMiddleware` assigns one per request (uses incoming `X-Request-Id` or a UUID),
  stores it in `AsyncLocalStorage` (`global/context/request-context.ts`), and returns it as the
  `X-Request-Id` response header.
- **Logging**: Winston (`global/logger/winston.config.ts`) via `app.useLogger`. Every log line gets
  the request's traceId automatically. Access logs: `RequestLoggerMiddleware` (`HTTP REQ`) and
  `ResponseLoggerInterceptor` (`HTTP RES`, status + duration; level = info/warn/error by status).
- Swagger: use the `@ApiDoc` decorator. It documents the success response and auto-includes standard
  error responses (400/401/403/404/500). Available at `/api-docs`.

---

## Conventions Recap

- Errors thrown as Nest `HttpException`s (`NotFoundException`/`ConflictException`/… with messages from
  the domain's `*.constants.ts`) — from services only. See Error Handling.
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
    (`NODE_ENV=prod pnpm run seed`) writes to production with no confirmation. Add a `seed.sh`
    with the same guards if a real need shows up; before that, essential reference data usually
    belongs in a migration anyway, where ordering, revert and the boot guard already cover it.
  - Factory (random) data is guarded by `NODE_ENV !== "prod"` in the seeder itself, so that branch
    only matters once such a path exists.
- Environments: `local | dev | prod | test`, files in `envs/` selected by `NODE_ENV` (`envs/env.ts`).
  `.env.*` are git-ignored; `.env.*.example` are committed templates.

---

## Git Hooks (Husky)

- **pre-commit**: `lint-staged` → `eslint --fix` + `prettier --write` on staged `*.{ts,js}`.
- **pre-push**: `pnpm run test:local` (e2e). Needs a running DB — `pretest:local` starts it via `db:up`.
  Use `git push --no-verify` to skip if the DB is unavailable.

---

## Backlog

Open items and "adopt from cmes-server when triggered" candidates are tracked in
`docs/TODO.md` and `docs/cmes-adoption-candidates.md` (both git-ignored, local notes).
Top P1: real auth flow (`JwtModule`/`JwtMiddleware` may be stubs), stricter env validation.
