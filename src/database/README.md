# Database 가이드

## 📁 폴더 구조

```
src/
├── database/
│   ├── README.md               # 현재 파일
│   ├── config/
│   │   └── typeorm.config.ts   # 접속 · 엔티티/마이그레이션 경로 · 시드 설정
│   ├── entities/               # 공통 베이스 엔티티 (core-hard / core-soft)
│   ├── migrations/             # 마이그레이션 파일 (적용 후 수정 금지)
│   └── seeds/
│       ├── main.seed.ts        # MainSeeder — 도메인 시더를 순서대로 실행
│       └── run.ts              # 시드 실행 진입점 — 팩토리를 클래스로 등록
└── domain/
    └── {도메인}/
        ├── entities/{엔티티}.entity.ts
        └── seeds/
            ├── {엔티티}.seed.ts      # 시더 (예: template/users/seeds/user.seed.ts)
            └── {엔티티}.factory.ts   # 랜덤 데이터 팩토리 (선택)
```

---

## 🐘 0. 로컬 데이터베이스 (Docker)

마이그레이션 · 시드 · 앱 실행 **전에 로컬 Postgres 가 떠 있어야** 합니다.

```bash
# 최초 1회: 컨테이너 자격증명 파일 준비 (git 제외)
cp envs/.env.docker.example envs/.env.docker

pnpm db:up      # Postgres 컨테이너 기동 (healthy 될 때까지 대기)
pnpm db:down    # 중지 (데이터 볼륨 유지)
pnpm db:reset   # 볼륨 삭제 후 재기동 (완전 초기화)
```

- 포트: 호스트 **5434** → 컨테이너 5432 (5432 · 5433 은 이미 쓰이고 있을 수 있어 피했습니다)
- 최초 기동 시 `nest-boiler-test`(테스트, `POSTGRES_DB`) 와 `nest-boiler`(로컬,
  `scripts/postgres/init-extra-dbs.sh`) 가 생성됩니다
- 자격증명은 `envs/.env.docker` 단일 소스에서 주입합니다 (compose 에 비밀번호를 두지 않음)

> 처음 받은 저장소의 전체 순서는 최상단 [`README.md`](../../README.md) 의 **빠른 시작** 참고.

---

## 🔧 1. 마이그레이션

### 1.1. 엔티티 작성

```typescript
// src/domain/{도메인}/entities/{엔티티}.entity.ts
import { Column, Entity } from "typeorm";
import { CoreSoftEntity } from "src/database/entities/core-soft.entity";

@Entity({ name: "Sample", schema: process.env.DB_SCHEMA })
export class Sample extends CoreSoftEntity {
  @Column({ comment: "이름", type: "varchar", length: 50, nullable: false })
  name: string;
}
```

- `src/domain/**/entities/*.entity.ts` 에 두면 자동으로 읽힙니다 (`typeorm.config.ts` 의 글로브).
- `CoreSoftEntity`(id · 감사 컬럼 · `deletedAt`) 를 상속합니다. 소프트 삭제가 필요 없으면 `CoreHardEntity`.
- 컬럼마다 `comment` 를 답니다 — 마이그레이션에 `COMMENT ON COLUMN` 으로 같이 나갑니다.
- 엔티티에는 Swagger · class-validator · class-transformer 를 두지 않습니다 (ESLint 가 막습니다).
- 새 도메인은 `src/domain/template/users` 를 복사하고 `app.module.ts` 에 모듈을 등록합니다.

### 1.2. 생성 전: 로컬 DB 를 최신으로

```bash
pnpm migration:run
```

`migration:generate` 는 엔티티와 **로컬 DB** 의 차이로 파일을 만듭니다. 로컬 DB 가 뒤처져 있으면
다른 사람이 이미 만든 변경까지 내 마이그레이션에 섞여 들어갑니다.

### 1.3. 마이그레이션 생성

```bash
pnpm migration:generate
```

- `src/database/migrations/<타임스탬프>-AutoMigration.ts` 가 생깁니다.
- **"No changes in database schema were found"**(종료 코드 1) 는 엔티티가 인식되지 않았거나
  로컬 DB 가 이미 엔티티와 같다는 뜻입니다.

### 1.4. 생성된 SQL 리뷰 — 가장 중요한 단계

TypeORM 이 만든 SQL 을 그대로 믿지 않습니다. `up()` 과 `down()` 을 읽고 커밋합니다.

- **컬럼 이름 변경이나 단순 타입 변경이 `DROP` + `ADD` 로 나오면 데이터가 사라집니다.**
  `RENAME COLUMN` 이나 `ALTER` 로 손으로 고칩니다. VS Code 에서는 `src/database/migrations/**` 가
  읽기 전용(`.vscode/settings.json`)이라, 읽기 전용을 직접 풀어야 고칠 수 있습니다.
- **행이 있는 테이블에 `NOT NULL` 컬럼을 추가하려면 `DEFAULT` 나 기존 행 채우기가 필요합니다.**
  로컬 테이블은 비어 있어 통과해도 데이터가 있는 dev · prod 에서 실패합니다.
- **`down()` 이 `up()` 을 정확히 되돌리는지** 봅니다.
- 고칠 수 있는 건 **어느 환경에도 적용되기 전까지**입니다. 적용된 마이그레이션은 고치지 않고
  새 마이그레이션으로 바로잡습니다.

### 1.5. 커밋 전 검사

```bash
pnpm migration:lint src/database/migrations/<파일>.ts   # 파일 지정 (아직 스테이징 전일 때)
pnpm migration:lint                                      # 스테이징된 마이그레이션만
pnpm migration:lint --all                                # 전체
```

`up()` 안에서 되돌리기 어려운 구문을 찾아 보여줍니다 — `DROP COLUMN` / `DROP TABLE`,
`RENAME`, 기존 행 처리 없는 `SET NOT NULL`, 빈 `down()`, 같은 컬럼 `DROP` + `ADD`.

**막지 않고 보여줍니다.** 걸리는 것 대부분은 의도한 변경이고 판단은 사람이 합니다.
`--strict` 를 주면 종료 코드 1 로 끊습니다.

### 1.6. 로컬 적용과 검증

```bash
pnpm migration:run                            # 적용
pnpm migration:revert && pnpm migration:run   # (선택) down() 까지 검증
pnpm migration:generate                       # (선택) "No changes" 가 나오면 엔티티와 DB 가 일치
```

- 적용하지 않으면 `start:local` 이 **부팅을 거부**합니다 (7장 참고).
- **e2e 는 마이그레이션을 쓰지 않습니다.** 테스트 DB 를 지우고 엔티티로 `synchronize` 합니다.
  e2e 가 통과해도 마이그레이션이 맞다는 증명은 아니므로, 검증은 이 단계에서 끝냅니다.
- 엔티티와 마이그레이션은 **한 커밋**에 넣습니다.

### 1.7. 되돌리기

```bash
pnpm migration:revert
```

- 가장 최근에 실행된 마이그레이션 한 건을 되돌립니다 (`migrations` 테이블의 기록도 지워집니다).
- ⚠️ 되돌린 컬럼에 있던 데이터는 돌아오지 않습니다.

### 1.8. 데이터 변경 · 수동 SQL

```bash
pnpm migration:create
```

- 빈 마이그레이션 파일을 만들고 SQL 을 직접 씁니다.
- **스키마가 아니라 데이터를 바꿀 때** 씁니다 — 데이터 이관, 코드 테이블 같은 기준 데이터,
  generate 가 표현하지 못하는 SQL.
- 운영에 꼭 있어야 하는 기준 데이터는 시드가 아니라 여기에 넣습니다. 순서 · 되돌리기 · 부팅
  가드가 스키마와 함께 따라옵니다.
- 엔티티 변경을 손으로 쓰지는 않습니다 — 그건 `migration:generate` 의 몫입니다.

### 1.9. 배포 환경에 적용하기

로컬용 `migration:run` 은 항상 `envs/.env.local` 을 봅니다. 배포 환경은 **별도 경로**로,
**서버에 ssh 로 들어가서** 돌립니다.

```bash
pnpm migrate:show:dev      # 접속 대상과 적용 예정 목록 — 읽기 전용
pnpm migrate:run:dev       # 환경명(dev)을 그대로 입력해야 적용
pnpm migrate:revert:dev    # 마지막 한 건 철회 (revert-dev 를 입력)
```

- `dev` 자리에 `prod` 도 됩니다. 그 외 환경은 거부합니다.
- **서버의 `pnpm install` 은 devDependencies 까지 설치해야 합니다.** `migrate:*` 는 빌드 결과가
  아니라 `ts-node` 로 `src/` 의 TS 를 직접 돌립니다.
- **TTY 가 없으면 거부합니다.** `ssh host '명령'` 한 줄로는 확인 입력이 무력해지기 때문입니다.
- `envs/.env.<env>` 에 `EXPECTED_DB_NAME` 을 적어두면 `DB_NAME` 과 대조합니다.
- DB 에 닿는 방법(터널 · 프록시 · IAM 토큰)이 필요하면 `scripts/db-connect.sh` 하나만
  만듭니다. `scripts/_db-env.sh` 는 고치지 않습니다.
- **컬럼 삭제 · 이름 변경은 배포를 둘로 나눕니다.** 마이그레이션 후 배포 전까지 구버전 앱이 새
  스키마 위에서 돌기 때문입니다.

> 서버 준비 · 순서 · 되돌리기는 [`DEPLOY.md`](../../DEPLOY.md) 참고.

---

## 🌱 2. 시드 (Seeding)

### 2.1. 시드 파일 만들기

- 도메인 시더: `src/domain/{도메인}/seeds/{엔티티}.seed.ts` (예: `src/domain/template/users/seeds/user.seed.ts`)
- 팩토리를 만들었으면 `src/database/seeds/run.ts` 의 `factories` 에도 등록합니다 — 글로브가 아니라
  클래스로 넘기기 때문입니다 (이유는 그 파일 주석)
- **다른 테이블과 같이 바뀌는 데이터는 레포가 아니라 서비스로 넣습니다.** 글은 작성자의
  `boardCount` 와 한 트랜잭션이라, `BoardSeeder` 는 서비스를 손으로 조립해 `createBoard` 를 탑니다.
  레포로 바로 넣으면 글만 생기고 카운트가 0 으로 남습니다

### 2.2. 시드 파일 작성 예시

```typescript
// src/domain/template/users/seeds/user.seed.ts
export class UserSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    // 필수 데이터 — 다른 테이블을 건드리지 않으니 레포로 바로 넣는다
    const usersRepository = new UsersRepository(dataSource.manager);
    await usersRepository.insertUser(SEED_ADMIN);

    // 운영 외 환경에서만 더미 데이터 생성
    if (process.env.NODE_ENV !== "prod") {
      await factoryManager.get(User).saveMany(5);
    }
  }
}
```

```typescript
// src/domain/template/boards/seeds/board.seed.ts — 서비스를 거쳐야 boardCount 가 맞는다
const usersService = new UsersService(new UsersRepository(manager), dataSource);
const boardsService = new BoardsService(new BoardsRepository(manager), usersService, dataSource);

const draft = await factoryManager.get(Board).make(); // 저장하지 않는다 — 값만
await boardsService.createBoard({ userId, title: draft.title, content: draft.content });
```

### 2.3. MainSeeder 에 등록

```typescript
// src/database/seeds/main.seed.ts
export class MainSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    console.log("🌱 Starting seeding process...");

    // 도메인별 시드들을 FK 순서대로 실행 — 글은 작성자를 참조하므로 사용자가 먼저
    await new UserSeeder().run(dataSource, factoryManager);
    await new BoardSeeder().run(dataSource, factoryManager);

    console.log("✅ All seeding completed!");
  }
}
```

### 2.4. 시드 실행

```bash
pnpm seed:run
```

- MainSeeder 에 등록된 시더를 순서대로 실행합니다.
- **다시 돌리면 중복으로 걸립니다** (관리자 이메일이 유니크). 다시 깔려면 2.5 처럼 DB 부터 비웁니다.

### 2.5. 시드 되돌리기 — 없습니다

`seed:revert` 는 제공하지 않습니다. typeorm-extension 4 부터 되돌리기가 CLI 전용인데,
이 프로젝트는 CLI 를 쓰지 않고 `runSeeders` 를 직접 부릅니다(`src/database/seeds/run.ts`).

로컬에서 시드를 다시 깔려면 **DB 를 비우고 처음부터** 돌립니다.

```bash
pnpm db:reset && pnpm migration:run && pnpm seed:run
```

---

## 🚀 3. 통합 명령어 · 시드 범위

### 3.1. `setup-db`

```bash
pnpm setup-db   # migration:generate → migration:run → seed:run
```

**`generate` 가 먼저 돕니다.** 엔티티와 로컬 DB 가 어긋나 있으면 마이그레이션 파일이 새로
생깁니다. 처음 받은 저장소에서는 `pnpm migration:run && pnpm seed:run` 을 씁니다.

### 3.2. 시드는 로컬 전용입니다

```bash
pnpm seed:run     # 항상 envs/.env.local 을 봅니다
```

**앞에 `NODE_ENV` 를 붙여도 바뀌지 않습니다.** 스크립트 안에 `cross-env NODE_ENV=local`
이 박혀 있고, `cross-env` 가 자식 프로세스의 값을 덮어쓰기 때문입니다.

```bash
NODE_ENV=prod pnpm seed:run   # ← 그래도 local 로 돕니다
```

이것이 위험한 이유는 **겉으로는 성공해 보이기 때문**입니다. prod 를 겨냥했다고 믿은 채
로컬 DB 에 시드가 들어가고, 팩토리 가드(`NODE_ENV !== "prod"`)도 통과해 랜덤 더미까지
생성됩니다.

### 배포 환경 시드를 일부러 만들지 않았습니다

**기술적으로 못 하는 것이 아닙니다.** `cross-env` 를 떼고 호출자가 `NODE_ENV` 를 주게
하면 됩니다 — 마이그레이션이 정확히 그 구조입니다.

```
typeorm        cross-env 없음                                  호출자가 NODE_ENV 를 준다
migration:run  cross-env NODE_ENV=local pnpm run typeorm ...   로컬 고정
migrate.sh     NODE_ENV="$ENV" pnpm run typeorm ...            환경 지정
```

**열지 않은 이유는 가드 때문입니다.** `migrate.sh` 는 붙기 전에 접속 대상을 크게 찍고,
환경명을 그대로 타이핑하게 하고, TTY 가 없으면 거부합니다. 시드에서 `cross-env` 만 떼면
그 가드 없이 `NODE_ENV=prod pnpm seed:run` 한 줄로 **운영 DB 에 시드가 들어갑니다.**

필요해지면 `migrate.sh` 와 같은 가드를 단 `seed.sh` 를 두는 것이 맞습니다. 다만 그 전에
**운영에 시드를 돌릴 일이 실제로 있는지**를 먼저 보세요 — 기준 데이터는 대개 마이그레이션에
넣습니다(1.8).

> 환경값은 이 프로젝트 기준 `local | dev | prod | test` 입니다(`development` / `production` 아님).

> **필수 데이터와 더미의 구분은 `NODE_ENV` 가 아니라 시더 코드가 합니다.**
> `user.seed.ts` · `board.seed.ts` 가 `NODE_ENV !== "prod"` 일 때만 팩토리를 돌립니다 — 로컬에서
> 그 분기를 시험하려면 시더를 직접 고쳐야 합니다.

---

## 📋 4. 명령어

```bash
# 로컬 — 모두 NODE_ENV=local 고정
pnpm migration:generate     # 엔티티 변경분으로 생성
pnpm migration:create       # 빈 마이그레이션 (데이터 변경 · 수동 SQL)
pnpm migration:lint         # up() 의 되돌리기 어려운 구문 검사
pnpm migration:show         # 적용 여부 목록
pnpm migration:run          # 적용
pnpm migration:revert       # 마지막 한 건 되돌리기
pnpm seed:run               # MainSeeder 실행
pnpm setup-db               # generate + run + seed (3.1 주의)

# 배포 환경 — 서버에서 (dev 자리에 prod)
pnpm migrate:show:dev
pnpm migrate:run:dev
pnpm migrate:revert:dev

# TypeORM CLI 그대로 — NODE_ENV 는 호출자가 준다
pnpm run typeorm <command>
```

---

## 💡 5. Best Practices

### 🔧 마이그레이션

- ✅ 엔티티 변경은 `migration:generate`, 데이터 변경은 `migration:create`
- ✅ 생성 전에 `migration:run` 으로 로컬 DB 를 최신으로
- ✅ 생성된 SQL 을 읽고 커밋한다 — `DROP` + `ADD` 는 `RENAME` / `ALTER` 로
- ✅ 엔티티와 마이그레이션은 한 커밋
- ✅ **`local` 외 환경은 배포 전에 마이그레이션을 먼저 적용** (`pnpm migrate:run:<env>`)
- ✅ 컬럼 삭제 · 이름 변경은 배포를 둘로 나눈다 (추가 먼저, 삭제는 다음 배포)
- ❌ 적용된 마이그레이션 수정 — 새 마이그레이션으로 바로잡는다
- ⚠️ `migration:revert` 는 데이터를 되돌리지 않는다

### 🌱 시드

- ✅ 도메인별 시더 분리, MainSeeder 에서 순서 관리 (FK 의존 순서)
- ✅ 혼자 바뀌는 데이터는 레포로, 다른 테이블과 같이 바뀌는 데이터는 서비스로 (`BoardSeeder`)
- ✅ 팩토리를 만들면 `run.ts` 의 `factories` 에도 등록
- ✅ 팩토리(faker 랜덤 데이터)는 시더 안의 `NODE_ENV !== "prod"` 가드 안에서만
- ❌ 운영에 필요한 기준 데이터를 시드로 — 마이그레이션에 넣는다

---

## 🎯 6. 워크플로우

### 스키마 변경 (컬럼 · 테이블 추가)

```
1. 엔티티 수정                        (1.1)
2. pnpm migration:run                 로컬 DB 를 최신으로 (1.2)
3. pnpm migration:generate            (1.3)
4. 생성된 SQL 리뷰                    (1.4)
5. pnpm migration:lint <파일>          (1.5)
6. pnpm migration:run                 + 선택: revert → run, generate 로 "No changes" 확인 (1.6)
7. 필요하면 시더 · 팩토리 추가 → pnpm seed:run   (2장)
8. pnpm run test:local
9. 엔티티 + 마이그레이션 한 커밋
10. 서버: git pull → migrate:show → migrate:run → 빌드 · 재기동   (1.9, DEPLOY.md)
```

### 처음 받은 저장소

```bash
pnpm db:up && pnpm migration:run && pnpm seed:run
```

### 시드 추가

```
1. 도메인 시더 (· 팩토리) 작성
2. MainSeeder 에 등록, 팩토리는 run.ts 의 factories 에도
3. pnpm seed:run   (이미 시드가 있으면 2.5 처럼 비우고)
```

---

## 🔍 7. 트러블슈팅

**Q: 서버가 안 뜨고 "적용되지 않은 마이그레이션이 있습니다" 가 나와요**
A: 의도된 동작입니다. `pnpm migration:run` 으로 먼저 적용하세요. 배포 환경이면
`pnpm migrate:run:<env>` 입니다.

스키마가 어긋나도 앱은 그냥 뜹니다. 그리고 서비스 코드의 try/catch 가 그 에러를 삼키면
기능이 멈춰 있어도 겉으로는 아무 일 없어 보입니다. 조용히 잘못되느니 그 자리에서 죽는
편이 낫다고 보고 `src/global/helpers/pending-migrations.helper.ts` 에서 부팅을 막습니다.
이 검사가 **마이그레이션 먼저, 배포 나중**이라는 순서를 강제합니다.

**Q: 엔티티를 바꿨는데 "No changes in database schema were found" 가 나와요**
A: 엔티티 파일이 `src/domain/**/entities/*.entity.ts` 에 있는지 확인하세요. 로컬 DB 가 이미
엔티티와 같은 상태여도 이렇게 나옵니다 (예: 다른 브랜치에서 이미 적용).

**Q: 생성된 마이그레이션에 내가 안 바꾼 변경이 섞여 있어요**
A: 로컬 DB 가 뒤처져 있습니다. 파일을 지우고 `pnpm migration:run` 후 다시 생성하세요 (1.2).

**Q: 시드가 중복으로 실패해요**
A: 시드는 한 번 깔리는 것을 전제로 합니다. `pnpm db:reset && pnpm migration:run && pnpm seed:run`.

**Q: 새로 만든 시드가 실행되지 않아요**
A: MainSeeder 에 등록했는지, 팩토리를 `run.ts` 의 `factories` 에 넣었는지 확인하세요 —
빠지면 `factoryManager.get(X)` 가 실패합니다.

**Q: 시드 팩토리에서 필수 필드 에러가 나요**
A: `*.factory.ts` 에서 모든 필수 필드(NOT NULL)를 채웠는지 확인하세요. 엔티티에 컬럼을
추가하면 팩토리도 같이 고쳐야 합니다 — 팩토리는 엔티티를 보고 자동으로 채우지 않습니다.

**Q: 서버에서 `migrate:*` 가 `ts-node` 를 못 찾아요**
A: `pnpm install --prod` 로 설치한 경우입니다. devDependencies 까지 설치하세요 (1.9).
