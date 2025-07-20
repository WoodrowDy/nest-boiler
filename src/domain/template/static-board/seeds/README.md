# Seeds 폴더

이 폴더는 해당 도메인의 시딩 관련 파일들을 관리합니다.

## 📁 파일 구조

```
seeds/
├── README.md           # 이 파일
├── {도메인}.seed.ts    # 필수 데이터 시드
└── {도메인}.factory.ts # 랜덤 데이터 팩토리 (선택사항)
```

## 📋 파일별 설명

### `{도메인}.seed.ts`

**목적**: 모든환경에 필요한 필수 데이터 생성

- 기본 관리자 계정
- 시스템 설정값
- 기본 카테고리
- 약관/정책 데이터

**특징**:

- 고정된 정확한 데이터
- 모든 환경에서 실행 가능
- Repository 패턴 활용

### `{도메인}.factory.ts` (선택사항)

**목적**: 개발/테스트용 랜덤 데이터 생성

- 테스트용 더미 데이터
- UI/UX 확인용 샘플 데이터
- 성능 테스트용 대량 데이터

**특징**:

- Faker.js 사용한 랜덤 데이터
- 주로 개발 환경에서만 사용
- 대량 데이터 생성 가능

## 🎯 사용 케이스

### 케이스 1: 필수 데이터만 필요한 경우

**파일**: `{도메인}.seed.ts`만 생성  
**내용**: Repository 패턴으로 고정 데이터만 생성

```typescript
export class {
  도메인
}

Seeder
implements
Seeder
{
public async
  run(dataSource
:
  DataSource
)
  {  // factoryManager 제거
    const repository = new { 도메인 }
    Repository(dataSource);

    await dataSource.transaction(async (transactionManager) => {
      await repository.create
      {
        도메인
      }
      ({
        // 고정 필수 데이터
      }, transactionManager);
    });
  }
}
```

### 케이스 2: 랜덤 데이터만 필요한 경우

**파일**: `{도메인}.seed.ts` + `{도메인}.factory.ts` 생성  
**내용**: Factory로 랜덤 데이터만 생성

```typescript
// {도메인}.factory.ts
export const { 도메인 }
Factory = setSeederFactory({ 도메인 }, (faker) => {
  const entity = new { 도메인 }();
  entity.name = faker.person.fullName();
  entity.email = faker.internet.email();
  return entity;
});

// {도메인}.seed.ts
export class {
  도메인
}

Seeder
implements
Seeder
{
public async
  run(dataSource
:
  DataSource, factoryManager
:
  SeederFactoryManager
)
  {
    const factory = factoryManager.get({ 도메인 });
    await factory.saveMany(50);
  }
}
```

### 케이스 3: 필수 데이터 + 랜덤 데이터 모두 필요한 경우 (권장)

**파일**: `{도메인}.seed.ts` + `{도메인}.factory.ts` 생성  
**내용**: Repository + Factory 혼합 사용

```typescript
// {도메인}.factory.ts
export const { 도메인 }
Factory = setSeederFactory({ 도메인 }, (faker) => {
  const entity = new { 도메인 }();
  entity.name = faker.person.fullName();
  entity.email = faker.internet.email();
  return entity;
});

// {도메인}.seed.ts
export class {
  도메인
}

Seeder
implements
Seeder
{
public async
  run(dataSource
:
  DataSource, factoryManager
:
  SeederFactoryManager
)
  {
    const repository = new { 도메인 }
    Repository(dataSource);

    await dataSource.transaction(async (transactionManager) => {
      // 1️⃣ 필수 데이터 (Repository 패턴)
      await repository.create
      {
        도메인
      }
      ({
        // 고정 필수 데이터
      }, transactionManager);

      // 2️⃣ 랜덤 데이터 (Factory 패턴) - 개발 환경에서만
      if (process.env.NODE_ENV !== 'production') {
        const factory = factoryManager.get({ 도메인 });
        await factory.saveMany(20);
      }
    });
  }
}
```

## 📋 케이스별 체크리스트

### ✅ 케이스 1 (필수 데이터만)

- [ ] `{도메인}.seed.ts` 파일 생성
- [ ] Repository 패턴 사용
- [ ] `factoryManager` 매개변수 제거
- [ ] 고정 데이터만 정의

### ✅ 케이스 2 (랜덤 데이터만)

- [ ] `{도메인}.factory.ts` 파일 생성
- [ ] `{도메인}.seed.ts` 파일 생성
- [ ] `factoryManager` 매개변수 포함
- [ ] `setSeederFactory` 사용

### ✅ 케이스 3 (혼합 사용)

- [ ] `{도메인}.factory.ts` 파일 생성
- [ ] `{도메인}.seed.ts` 파일 생성
- [ ] Repository + Factory 모두 사용
- [ ] 환경별 조건 분기 추가
- [ ] 데이터소스 설정에 factory 경로 추가
