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
pnpm run format         # Prettier
pnpm run lint           # eslint --fix
```

### Local Database (Docker)

Postgres must be running before migrations/seeds/tests.

```bash
cp envs/.env.docker.example envs/.env.docker   # once (git-ignored credentials)
pnpm db:up      # start Postgres container, wait until healthy
pnpm db:down    # stop (volume kept)
pnpm db:reset   # drop volume + restart (full reset)
```

- Host port **5433** → container 5432 (avoids clashing with a system Postgres).
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
```

CLI scripts run with `cross-env NODE_ENV=local`, so they target the local DB in `envs/.env.local`.

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
  Audit fields (id/createdAt/updatedAt/deletedAt) come from `global/dtos/audit.response.ts`.
- **Service returns entities/domain**, never HTTP response DTOs. Entity→Response conversion happens
  at the controller boundary via the mapper.
  → ESLint blocks importing `**/dtos/response/**` in `**/services/*.ts` and `**/repositories/*.ts`.
- **Repository handles queries only.** Existence checks (404) and transaction boundaries live in the
  service. Return type is always `Entity` / `Entity[]`.

Prettier config is a single source: `.prettierrc` (ESLint reads it, no inline options).

---

## Transactions

The transaction **boundary is the service**, not the repository. Repositories are transaction-aware
but not transaction-owning: each method accepts an optional `transactionManager?: EntityManager` and
resolves the manager once:

```ts
const manager = transactionManager ?? this.manager;   // repo's own manager if none passed
```

- Single-row op → call the repo without a manager (single statement is atomic).
- Multi-step / needs a lock → service opens `dataSource.transaction(m => ...)` and passes `m` to each repo call so they share one transaction.

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

- Errors thrown as Nest `HttpException`s (`NotFoundException`/`BadRequestException` with messages from
  the domain's `*.constants.ts`).
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
- Seeds: factory (random) data is guarded by `NODE_ENV !== "prod"`; prod seeds only essential data.
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
Top P1: global exception filter (unify error envelope with traceId), real auth flow, stricter env validation.
