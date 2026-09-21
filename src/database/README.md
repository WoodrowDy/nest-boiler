# Database 가이드

## 📁 폴더 구조

```
src/
├── database/
│   ├── README.md               # 현재파일
│   ├── config/
│   │   └── typeorm.config.ts   # DB 설정 + 시드 설정
│   ├── migrations/             # 마이그레이션 파일들
│   └── seeds/                  # 시드 파일들
│       └── main.seed.ts        # 메인 시드 (모든 시드 통합 관리)
└── domain/
    └── */seeds/                # 도메인별 시드들
        ├── README.md           # 도메인 시드 가이드
        ├── {도메인}.seed.ts    # 필수 데이터 시드
        └── {도메인}.factory.ts # 랜덤 데이터 팩토리 (선택)
```

---

## 🐘 0. 로컬 데이터베이스 (Docker)

마이그레이션·시드·앱 실행 **전에 로컬 Postgres 가 떠 있어야** 합니다.

```bash
# 최초 1회: 컨테이너 자격증명 파일 준비 (git 제외)
cp envs/.env.docker.example envs/.env.docker

pnpm db:up      # Postgres 컨테이너 기동 (healthy 될 때까지 대기)
pnpm db:down    # 중지 (데이터 볼륨 유지)
pnpm db:reset   # 볼륨 삭제 후 재기동 (완전 초기화)
```

- 포트: 호스트 **5434** → 컨테이너 5432 (포트 충돌 방지 — 5432·5433 은 이미 쓰이고 있을 수 있다)
- 최초 기동 시 `nest-boiler`(로컬) / `nest-boiler-test`(테스트) DB 자동 생성
- 자격증명은 `envs/.env.docker` 단일 소스에서 주입 (compose 에 비밀번호 하드코딩 안 함)

> 최초 실행 전체 순서는 최상단 [`README.md`](../../README.md) 의 "최초 실행" 참고.

---

## 🔧 1. 데이터베이스 마이그레이션

### 1.1. 엔티티 생성

```typescript
// src/domain/{도메인}/entities/{엔티티}.entity.ts
@Entity()
export class SampleEntity {
  @Column()
  name: string;
}
```

### 1.2. 마이그레이션 생성

```bash
pnpm run migration:generate
```

- 엔티티(코드)와 실제 데이터베이스 스키마를 비교
- 차이점(변경점)을 자동으로 감지하여 새로운 마이그레이션 파일 생성
- `src/database/migrations/` 폴더에 타임스탬프가 포함된 파일 생성

### 1.3. 마이그레이션 적용

```bash
pnpm run migration:run
```

- 이미 만들어진 마이그레이션 파일을 DB에 반영하는 작업
- `migrations` 테이블에 실행 기록 저장
- 이미 실행된 마이그레이션은 건너뛰기

### 1.4. 마이그레이션 되돌리기

```bash
pnpm run migration:revert
```

- 가장 최근에 실행된 마이그레이션을 되돌리기
- 마이그레이션 테이블의 해당 데이터가 hard delete 됩니다
- ⚠️ 데이터 손실 가능성 있음 - 신중하게 사용

### 1.5. 수동 마이그레이션 생성 (비추천)

```bash
pnpm run migration:create
```

- 빈 마이그레이션 파일을 수동으로 생성
- 수동으로 작업 케이스를 위해 명령어 남겨둠 추천하지는 않아요
- 혹시 실수로 생성하셨다면, 코드에서 해당 파일을 지우고 generate 명령어로 검증해주시면 됩니다

### 1.6. 커밋 전 검사

```bash
pnpm run migration:lint          # 스테이징된 마이그레이션만
pnpm run migration:lint --all    # 전체
```

`up()` 안에서 되돌리기 어려운 구문을 찾아 보여줍니다 — `DROP COLUMN`/`DROP TABLE`,
`RENAME`, 기존 행 처리 없는 `SET NOT NULL`, 빈 `down()`, 같은 컬럼 `DROP`+`ADD`.

**막지 않고 보여줍니다.** 걸리는 것 대부분은 의도한 변경이고 판단은 사람이 합니다.
`--strict` 를 주면 종료코드 1 로 끊습니다.

### 1.7. 배포 환경에 적용하기

로컬용 `migration:run` 은 항상 `envs/.env.local` 을 봅니다. 배포 환경은 **별도 경로**로,
**서버에 ssh 로 들어가서** 돌립니다.

```bash
pnpm migrate:show:dev      # 무엇이 적용될지만 — 읽기 전용
pnpm migrate:run:dev       # 환경명을 입력해 확인한 뒤 적용
pnpm migrate:revert:dev    # 마지막 한 건 철회 (revert-dev 를 입력)
```

- 적용 전후 상태를 모두 보여주고, `y` 가 아니라 **환경명을 그대로 타이핑**하게 합니다.
- TTY 가 없으면 거부합니다 — `ssh host '명령'` 으로는 확인이 무력해지기 때문입니다.
- `envs/.env.<env>` 에 `EXPECTED_DB_NAME` 을 적어두면 `DB_NAME` 과 대조합니다.
- DB 에 닿는 방법(터널 · 프록시 · IAM 토큰)이 필요하면 `scripts/db-connect.sh` 하나만
  만듭니다. `scripts/_db-env.sh` 는 고치지 않습니다.

> 배포 전체 흐름과 이유는 [`DEPLOY.md`](../../DEPLOY.md) 참고.

---

## 🌱 2. 시드 (Seeding)

### 2.1. 시드 데이터가 필요하다면 시드 파일 생성

- 도메인별 시드: `src/domain/{도메인}/seeds/{도메인}.seed.ts` 생성
- 각 도메인의 `seeds` 폴더 README.md 참조

### 2.2. 시드 파일 작성 예시

```typescript
// src/domain/static-board/seeds/static-board.seed.ts
export class StaticBoardSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    const repository = new StaticBoardRepository(dataSource);

    // 필수 데이터 생성
    await repository.createStaticBoard({
      category: "공지사항",
      writer: "관리자",
      // ... 데이터
    });

    // 운영 외 환경에서만 더미 데이터 생성
    if (process.env.NODE_ENV !== "prod") {
      const factory = factoryManager.get(StaticBoard);
      await factory.saveMany(10);
    }
  }
}
```

### 2.3. MainSeeder에 시드 등록

```typescript
// src/database/seeds/main.seed.ts
export class MainSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    console.log("🌱 Starting seeding process...");

    // 도메인별 시드들을 순서대로 실행
    const staticBoardSeeder = new StaticBoardSeeder();
    await staticBoardSeeder.run(dataSource, factoryManager);

    // 추가 도메인 시드들...

    console.log("✅ All seeding completed!");
  }
}
```

### 2.4. 시드 실행

```bash
pnpm run seed:run
```

- MainSeeder를 통해 모든 등록된 시드 실행
- 적용이 제대로 되었다면 커맨드 실행 후, 스크립트 확인 가능

### 2.5. 시드 되돌리기

```bash
pnpm run seed:revert
```

- 시드로 생성된 데이터를 되돌리기 (제한적)

---

## 🚀 3. 통합 명령어

### 3.1. 전체 설정 (한 번에 실행)

```bash
pnpm run setup-db
```

**실행 순서:**

1. `migration:generate` - 마이그레이션 생성
2. `migration:run` - 마이그레이션 적용
3. `seed:run` - 모든 시드 실행 (MainSeeder)

### 3.2. 환경별 실행

```bash
# 로컬 환경 (더미 데이터 포함)
NODE_ENV=local pnpm run seed:run

# prod (필수 데이터만 — 시드 팩토리의 랜덤 데이터는 가드에 걸려 돌지 않는다)
NODE_ENV=prod pnpm run seed:run
```

> 환경값은 이 프로젝트 기준 `local | dev | prod | test` 입니다(`development`/`production` 아님).

---

## 📋 4. 사용 가능한 명령어

### Migration 명령어

```bash
pnpm run typeorm                    # TypeORM CLI 기본 (NODE_ENV 는 호출자가 준다)
pnpm run migration:create           # 빈 마이그레이션 생성 (커스텀 비추천)
pnpm run migration:generate         # 엔티티 변경사항 기반 마이그레이션 생성
pnpm run migration:run              # 마이그레이션 실행
pnpm run migration:revert           # 마이그레이션 되돌리기
pnpm run migration:show             # 적용 여부 목록
pnpm run migration:lint             # up() 의 되돌리기 어려운 구문 검사
```

위 명령은 전부 `NODE_ENV=local` 로 고정돼 있어 로컬 DB 만 봅니다.

### 배포 환경 Migration 명령어

```bash
pnpm migrate:show:dev               # 적용 예정 확인 (읽기 전용)
pnpm migrate:run:dev                # 확인 입력 후 적용
pnpm migrate:revert:dev             # 마지막 한 건 철회
```

`dev` 자리에 `prod` 도 됩니다. 서버에 ssh 로 들어가서 돌립니다 — 1.7 참고.

### Seed 명령어

```bash
pnpm run seed:run                   # 모든 시드 실행 (MainSeeder)
pnpm run seed:revert                # 시드 되돌리기
```

### 통합 명령어

```bash
pnpm run setup-db                   # 마이그레이션 + 시드 한 번에 실행
```

---

## 💡 5. Best Practices

### 🔧 마이그레이션

- ✅ 엔티티 변경 후 반드시 `migration:generate` 실행
- ✅ **`local` 외 환경은 배포 전에 반드시 마이그레이션을 먼저 적용합니다** (`pnpm migrate:run:<env>`).
      순서를 어기면 앱이 부팅을 거부하므로 배포가 그 자리에서 실패합니다
- ✅ `migration:revert`는 신중하게 사용
- ❌ 수동 마이그레이션 생성 지양

### 🌱 시드

- ✅ 도메인별 시드 파일 분리
- ✅ MainSeeder에서 모든 시드 통합 관리
- ✅ 환경별 조건부 실행 구현 (`NODE_ENV` 활용)
- ✅ Repository 패턴 활용으로 비즈니스 로직 재사용
- ✅ 시드 팩토리(`*.factory.ts` — faker 랜덤 데이터)는 `prod` 외에서만 사용
      가드가 `NODE_ENV !== "prod"` 이므로 `local`·`dev`·`test` 전부에서 돕니다
- ❌ `prod` 에서 시드 팩토리 사용 금지 — 운영 DB 에 가짜 데이터가 들어갑니다

### 📁 시드 관리

- ✅ 새 도메인 추가 시 MainSeeder에 등록
- ✅ 의존성 순서 고려한 시드 실행 순서
- ✅ 각 도메인 시드 폴더에 README.md 작성

---

## 🎯 6. 일반적인 워크플로우

### 신규 기능 개발 시

```bash
1. 엔티티 생성/수정
2. pnpm run migration:generate
3. pnpm run migration:run
4. 필요시 도메인 시드 생성 및 MainSeeder에 등록
5. pnpm run seed:run
```

### 환경 초기 구축 시

```bash
# 한 번에 모든 설정
pnpm run setup-db
```

### 시드 추가 시

```bash
1. 도메인별 시드 파일 생성
2. MainSeeder에 새 시드 등록
3. pnpm run seed:run
```

---

## 🔍 7. 트러블슈팅

### 일반적인 문제들

**Q: 서버가 안 뜨고 "적용되지 않은 마이그레이션이 있습니다" 가 나와요**
A: 의도된 동작입니다. `pnpm run migration:run` 으로 먼저 적용하세요.

스키마가 어긋나도 앱은 그냥 뜹니다. 그리고 서비스 코드의 try/catch 가 그 에러를 삼키면
기능이 멈춰 있어도 겉으로는 아무 일 없어 보입니다. 조용히 잘못되느니 그 자리에서 죽는
편이 낫다고 보고 `src/global/helpers/pending-migrations.helper.ts` 에서 부팅을 막습니다.

배포 환경이면 `pnpm migrate:run:<env>` 입니다. 이 검사가 **마이그레이션 먼저, 배포 나중**
이라는 순서를 강제합니다.

**Q: 엔티티를 변경했는데 마이그레이션이 생성되지 않아요**
A: 엔티티 경로 설정을 확인하고, TypeScript 컴파일 오류가 없는지 확인하세요.

**Q: 시드가 중복 실행돼요**
A: 시드 파일에 중복 방지 로직체크 추가하세요.

**Q: 새로 만든 시드가 실행되지 않아요**
A: MainSeeder에 새 시드를 등록했는지 확인하세요.

**Q: 시드 팩토리에서 필수 필드 에러가 나요**
A: `*.factory.ts` 에서 모든 필수 필드(NOT NULL)를 채웠는지 확인하세요. 엔티티에 컬럼을
추가하면 팩토리도 같이 고쳐야 합니다 — 팩토리는 엔티티를 보고 자동으로 채우지 않습니다.

### 시드 관련

- **새 시드 추가**: MainSeeder에 등록 필수
- **실행 순서**: 의존성을 고려한 순서로 MainSeeder에서 관리
- **환경별 실행**: `NODE_ENV` 환경 변수 활용

---

## 🎯 8. 워크플로우 요약

### 💫 가장 자주 사용하는 명령어

```bash
# 🎯 기본 명령어들
pnpm run migration:generate    # 엔티티 변경 후
pnpm run migration:run         # 마이그레이션 적용
pnpm run seed:run             # 시드 실행
pnpm run setup-db             # 전체 환경 구축
```

### 일반적인 개발 흐름

1. **환경 구축**: `pnpm run setup-db`
2. **개발 중**: `pnpm run migration:generate` → `pnpm run migration:run`
3. **시드 추가**: 도메인 시드 생성 → MainSeeder 등록 → `pnpm run seed:run`

**📚 안전하고 일관된 데이터베이스 관리를 위해 이 가이드를 따라주세요!** 🚀

<!-- # DB Migration

## 순서

### 1. 데이터베이스 마이그레이션!

### 1-1. 엔티티 생성

### 1.2. pnpm run migration:generate 실행

- 엔티티(코드)와 실제 데이터베이스 스키마를 비교해서, 차이점(변경점)을 자동으로 감지하여 새로운 마이그레이션 파일을 생성합니다

### 1.3 pnpm run migration:run 으로 적용

- 이미 만들어진 마이그레이션 파일을 DB에 반영하는 작업입니다

### 1.4 pnpm run migration:revert 가장 최근에 실행된 마이그레이션을 되돌리기

- 마이그레이션 테이블의 해당 데이터가 hard delete 됩니다

### 1.5 pnpm run migration:create 빈 마이그레이션 파일 생성

- 수동으로 작업 케이스를 위해 명령어 남겨둠 추천하지는 않아요
- 혹시 실수로 생성하셧다면, 코드에서 해당 파일을 지우고 generate 명령어로 검증해주시면 됩니다

---

### 2. 시드

### 2.1.시드 데이터가 필요하다면 seeds 파일 생성 (builtInBoard 모듈 seeds 폴더 참조)

### 2.2 npm run seeds 시드 내용 적용 (적용이 제대로 되었다면 커맨드 실행 후, 스크립트 확인 가능)

### 2.3. 한번에 적용하고 싶다면, npm run setup-db

### 3-1. npm run start:${env} -->
