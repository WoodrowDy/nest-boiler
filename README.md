# backend-nestjs

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## 소개

이 애플리케이션은 NestJS 기반의 백엔드 서버로, 효율적이고 확장성 있는 서버 애플리케이션을 구축하기 위해 설계되었습니다.

## 프로젝트 구조

- 본 프로젝트는 DDD 패턴을 참고하여, 도메인별로 디렉토리를 분리하여 관리합니다.

```bash
backend-nestjs/
|-- src/
|   |-- app.controller.ts
|   |-- app.module.ts
|   |-- app.service.ts
|   |-- main.ts
|   |-- database/
|   |   |-- config/           # 데이터베이스 설정
|   |   |-- entity/           # 공통 엔티티
|   |   |-- migrations/       # 마이그레이션 파일
|   |   |-- seeds/            # 시드 데이터
|   |-- domain/
|   |   |-- static-board/     # 예시 static-board 도메인
|   |       |-- controllers/  # 컨트롤러
|   |       |-- dtos/         # DTO
|   |       |-- entities/     # 엔티티
|   |       |-- repositories/ # 레포지토리
|   |       |-- services/     # 서비스
|   |       |-- seeds/        # 도메인별 시드
|   |-- shared/               # 공통 모듈, 상수, 데코레이터 등
|-- test/                     # 테스트 코드
    |-- utils/                # 테스트 환경 변수 및 앱 실행 헬퍼 함수 등
    |-- domain/
        |-- fixture           # 실제 API 호출 함수 모음
        |-- mocks             # 테스트용 목 데이터
        |-- scenarios         # 실제 테스트 시나리오 코드
|-- package.json
|-- README.md
```

## 기술 스택

- **언어**: TypeScript
- **프레임워크**: NestJS
- **데이터베이스**: PostgreSQL, TypeORM
- **테스트**: Jest
- **API 문서화**: Swagger
- **배포/운영**: AWS

## API 문서

| 환경     | 바로가기                                                             |
| -------- | -------------------------------------------------------------------- |
| **로컬** | [Swagger (localhost)](http://localhost:3000/api-docs)                |
| **개발** | [Swagger (dev)](https://dev-api.yourdomain.com/api-docs) (설정 필요) |
| **운영** | [Swagger (prod)](https://api.yourdomain.com/api-docs) (설정 필요)    |

## 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm run start:dev

# 프로덕션 빌드 및 실행
pnpm run build
pnpm run start:prod
```

## 테스트

```bash
# 단위 테스트
pnpm run test:local

# e2e 테스트
pnpm run test:e2e

# 커버리지
pnpm run test:cov
```

## 환경 변수

- 환경 변수는 `envs/` 디렉토리 및 `.env` 파일을 통해 관리합니다.

## 마이그레이션 및 시드

- TypeORM 마이그레이션 및 시드 데이터는 `src/database/migrations/`, `src/database/seeds/`에서 관리합니다.
- 자세한 사용법은 `src/database/README.md`를 참고하세요.

## 코딩 컨벤션

- 클래스: UpperCamelCase
- 메서드/변수: lowerCamelCase
- 상수: UPPER_SNAKE_CASE
- 디렉토리/파일: 소문자, 하이픈(-) 구분

## 예외 처리

- NestJS의 Exception Filter를 활용하여 일관된 예외 처리를 구현합니다.
- 커스텀 예외 및 에러 코드는 `shared/` 디렉토리에서 관리합니다.

## Git Hooks (Husky)

이 프로젝트는 코드 품질 관리를 위해 Husky를 사용합니다:

### Pre-commit Hook
- **실행 시점**: 커밋 전 자동 실행
- **실행 내용**: 
  - ESLint로 코드 검사 및 자동 수정
  - Prettier로 코드 포맷팅
- **대상 파일**: staged된 TypeScript/JavaScript 파일만

### Pre-push Hook
- **실행 시점**: 푸시 전 자동 실행  
- **실행 내용**: E2E 테스트 (`pnpm run test:local`)
- **목적**: 테스트를 통과한 코드만 원격 저장소에 푸시

```bash
# Git hooks는 자동으로 실행됩니다
git add .
git commit -m "your message"  # 자동으로 lint + format 실행
git push                       # 자동으로 테스트 실행
```

---
