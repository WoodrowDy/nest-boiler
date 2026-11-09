# E2E 테스트 가이드

## 📁 폴더 구조

```
test/
├── README.md                  # 현재 파일 (E2E 테스트 가이드)
├── jest-e2e.json              # E2E 테스트용 Jest 설정
├── app.e2e-spec.ts            # 메인 E2E 테스트 진입점
├── utils/                     # 테스트 유틸리티 함수/헬퍼
│   ├── e2e-setup.ts           # E2E 테스트 환경변수 설정 (Jest 자동 실행)
│   └── e2e-helper.ts         # 앱 실행/종료 헬퍼 함수들
└── domain/
    ├── template/              # 예시 도메인(users · boards)
    └── {도메인}/
        ├── fixtures/          # 실제 API 호출/유틸 함수 모음
        │   └── {도메인}.fixture.ts
        ├── mocks/            # 테스트용 고정 데이터/DTO/샘플 값
        │   └── {도메인}.mock.ts
        └── scenarios/        # 실제 테스트 시나리오(플로우) 코드
            └── {도메인}.e2e-spec.ts
```

---

## 🧩 1. 폴더별 역할

### utils/e2e-setup.ts

- Jest 실행 전에 테스트 환경변수(.env.test)를 자동으로 로드합니다.
- 테스트 환경 설정을 중앙화하여 관리합니다.

```ts
// test/utils/e2e-setup.ts
import * as dotenv from 'dotenv';
import * as path from 'node:path';

// .env.test 파일 로드
dotenv.config({
  path: path.resolve(__dirname, '../../envs/.env.test'),
});
```

### utils/e2e-helper.ts

- 테스트에서 반복적으로 사용되는 앱 실행/종료, 데이터베이스 초기화 함수들을 제공합니다.

```ts
// test/utils/e2e-helper.ts
export async function launchAppAndGetTestAppAndDb() {
  // 앱 실행 및 DB 초기화
}
export async function closeTestApp(app) {
  // 앱 종료 및 정리
}
```

### fixtures/

- 실제 E2E 테스트에서 반복적으로 사용되는 API 호출 함수, 테스트 유틸리티를 모아둡니다.
- 메서드 이름은 컨트롤러 메서드와 같게 씁니다(`postUser` · `getUsers` · `getUser` · `patchUser` · `deleteUser`).
- 다른 도메인 시나리오도 가져다 씁니다 — boards 시나리오는 `UsersFixture` 로 작성자를 만듭니다.

```ts
// test/domain/template/users/fixtures/users.fixture.ts
export const UsersFixture = {
  async postUser(app: INestApplication, body: object): Promise<Response> {
    return await request(app.getHttpServer()).post(`/users`).send(body);
  },
  async getUser(app: INestApplication, id: number | string): Promise<Response> {
    return await request(app.getHttpServer()).get(`/users/${id}`);
  },
  // getUsers · patchUser · deleteUser
};
```

### mocks/

- 테스트에 사용할 고정 데이터(목업 DTO, 샘플 값)를 정의합니다.
- 예시: 사용자 생성에 쓰는 DTO. 다른 값에 따라 달라지면 함수로 둡니다(`postBoardMockDto(userId)`).

```ts
// test/domain/template/users/mocks/users.mock.ts
export const postUserMockDto = {
  email: "tester@example.com",
  name: "테스터",
  phone: "010-1234-5678",
};
```

### scenarios/

- 실제 테스트 시나리오(플로우)를 작성하는 곳입니다.
- 여러 fixture, mock을 조합해서 실제 유저의 행동을 시뮬레이션합니다.

```ts
// test/domain/template/users/scenarios/users.e2e-spec.ts
describe(`users (e2e)`, () => {
  let app: INestApplication;

  beforeAll(async () => {
    const launchResult = await launchAppAndGetTestAppAndDb();
    app = launchResult.app;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it(`사용자를 생성한다`, async () => {
    const result = await UsersFixture.postUser(app, postUserMockDto);

    expect(result.status).toEqual(HttpStatus.CREATED);
  });

  it(`같은 이메일은 409`, async () => {
    const result = await UsersFixture.postUser(app, postUserMockDto);

    expect(result.status).toEqual(HttpStatus.CONFLICT);
  });
  // ...
});
```

---

## 🚀 2. 테스트 실행 방법

환경변수는 `envs/.env.test` 파일에서 자동으로 로드됩니다.

```bash
pnpm run test:local
```

---

## 💡 Best Practices

- **utils/e2e-setup.ts**: 테스트 환경변수 자동 로드, Jest 실행 전 초기 설정
- **utils/e2e-helper.ts**: 앱 실행/종료, DB 초기화 등 공통 헬퍼 함수들
- **fixtures/**: 테스트에서 반복적으로 쓰는 API 호출/유틸 함수 모음
- **mocks/**: 테스트용 고정 데이터, DTO, 샘플 값
- **scenarios/**: 실제 테스트 시나리오(플로우) 코드, 여러 fixture와 mock을 조합
- 환경변수는 `envs/.env.test` 파일에서 중앙 관리하여 일관성 유지
- 테스트 데이터는 불변성을 유지하고, 외부 의존성은 mock으로 대체
- 실제 유저 플로우를 최대한 현실적으로 재현
- suite 하나는 DB 를 새로 만든 뒤 `it` 이 위에서 아래로 이어집니다 — 뒤 케이스가 앞 케이스가 만든 데이터를 씁니다
- **id 가 연속이라고 가정하지 않습니다** — 실패한 INSERT(409)도 시퀀스 값을 씁니다. 정확한 id 대신 "새 행이다"(`id !== 1`)를 단언합니다
- `afterAll` 에서 `closeTestApp(app)` 으로 앱을 닫습니다

---

**안전하고 일관된 테스트 관리를 위해 이 가이드를 따라주세요!**
