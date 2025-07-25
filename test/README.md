# E2E 테스트 가이드

## 📁 폴더 구조

```
test/
├── README.md                  # 현재 파일 (E2E 테스트 가이드)
├── jest-e2e.json              # E2E 테스트용 Jest 설정
├── app.e2e-spec.ts            # 메인 E2E 테스트 진입점
├── utils/                     # 테스트 유틸리티 함수/헬퍼
│   ├── e2e-setup.ts           # E2E 테스트 환경변수 설정 (Jest 자동 실행)
│   └── e2e-helpers.ts         # 앱 실행/종료 헬퍼 함수들
└── e2e-test/
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
import * as path from 'path';

// .env.test 파일 로드
dotenv.config({
  path: path.resolve(__dirname, '../envs/.env.test'),
});
```

### utils/e2e-helpers.ts

- 테스트에서 반복적으로 사용되는 앱 실행/종료, 데이터베이스 초기화 함수들을 제공합니다.

```ts
// test/utils/e2e-helpers.ts
export async function launchAppAndGetTestAppAndDb() {
  // 앱 실행 및 DB 초기화
}
export async function closeTestApp(app) {
  // 앱 종료 및 정리
}
```

### fixtures/

- 실제 E2E 테스트에서 반복적으로 사용되는 API 호출 함수, 테스트 유틸리티를 모아둡니다.
- 예시: 게시판 생성, 리스트 조회, 상세 조회 등 API 호출 래퍼

```ts
// test/e2e-test/static-board/fixtures/static-board.fixture.ts
export class StaticBoardFixture {
  static async generateStaticBoard(app, body) {
    /* ... */
  }
  static async getStaticBoardListAndCount(app, query) {
    /* ... */
  }
  static async getStaticBoard(app, id) {
    /* ... */
  }
}
```

### mocks/

- 테스트에 사용할 고정 데이터(목업 DTO, 샘플 값)를 정의합니다.
- 예시: 게시판 생성에 사용할 DTO, 예시 데이터 등

```ts
// test/e2e-test/static-board/mocks/static-board.mock.ts
export const generateStaticBoardMockDto = {
  birth: new Date('2000-10-10'),
  body: '초기 seed 목업 내용',
  category: '공지사항',
  isActivated: true,
  writer: '김작가',
  phone: '010-1234-5678',
};
```

### scenarios/

- 실제 테스트 시나리오(플로우)를 작성하는 곳입니다.
- 여러 fixture, mock을 조합해서 실제 유저의 행동을 시뮬레이션합니다.

```ts
// test/e2e-test/static-board/scenarios/static-board.e2e-spec.ts
describe(`static board test (e2e)`, () => {
  it(`테스트 게시판을 생성 할 수 있다`, async () => {
    const result = await StaticBoardFixture.generateStaticBoard(
      app,
      generateStaticBoardMockDto,
    );
    expect(result.status).toEqual(201);
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
- **utils/e2e-helpers.ts**: 앱 실행/종료, DB 초기화 등 공통 헬퍼 함수들
- **fixtures/**: 테스트에서 반복적으로 쓰는 API 호출/유틸 함수 모음
- **mocks/**: 테스트용 고정 데이터, DTO, 샘플 값
- **scenarios/**: 실제 테스트 시나리오(플로우) 코드, 여러 fixture와 mock을 조합
- 환경변수는 `envs/.env.test` 파일에서 중앙 관리하여 일관성 유지
- 테스트 데이터는 불변성을 유지하고, 외부 의존성은 mock으로 대체
- 실제 유저 플로우를 최대한 현실적으로 재현

---

**안전하고 일관된 테스트 관리를 위해 이 가이드를 따라주세요!**
