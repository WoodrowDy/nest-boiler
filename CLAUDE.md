# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Start
```bash
pnpm run build                    # Build for production
pnpm run start:local             # Start local development server (Asia/Seoul timezone)
pnpm run start:dev               # Start dev environment (Asia/Seoul timezone)
pnpm run start:prod              # Start production server
pnpm run format                  # Format code with Prettier
pnpm run lint                    # Lint and fix TypeScript files
```

### Testing
```bash
pnpm run test                    # Run unit tests
pnpm run test:watch              # Run tests in watch mode
pnpm run test:cov                # Run tests with coverage
pnpm run test:local              # Run e2e tests (verbose, silent)
pnpm run test:e2e                # Run e2e tests
```

### Database Operations
```bash
pnpm run setup-db                # Complete database setup (migration + seed)
pnpm run migration:generate      # Generate migration from entity changes
pnpm run migration:run           # Apply migrations
pnpm run migration:revert        # Revert last migration
pnpm run seed:run                # Run all seeds via MainSeeder
pnpm run seed:revert             # Revert seeds
```

### Git Hooks (Husky)
```bash
# Automatic hooks (no manual commands needed):
# - Pre-commit: Runs lint-staged (eslint --fix + prettier --write)
# - Pre-push: Runs pnpm run test:local (e2e tests)
```

## Architecture Overview

### Domain-Driven Design Structure
This NestJS application follows DDD patterns with domain-based directory organization:

- **`src/domain/`** - Business domains, each containing:
  - `controllers/` - HTTP endpoints
  - `services/` - Business logic
  - `entities/` - TypeORM entities
  - `repositories/` - Data access layer
  - `dtos/` - Data transfer objects (request/response)
  - `seeds/` - Domain-specific seed data
  - `{domain}.module.ts` - Domain module configuration

- **`src/global/`** - Shared utilities and cross-cutting concerns:
  - `constants/` - Application constants
  - `decorators/` - Custom decorators (API docs, validation, etc.)
  - `dtos/` - Shared DTOs (pagination, responses)
  - `helpers/` - Utility functions (crypto, date, HTTP)
  - `interceptors/` - Response logging
  - `middlewares/` - Request logging

- **`src/database/`** - Database configuration and migrations:
  - `config/typeorm.config.ts` - TypeORM configuration with PostgreSQL
  - `migrations/` - Database migrations (auto-generated)
  - `seeds/main.seed.ts` - Master seeder that orchestrates all domain seeds
  - `entities/` - Base entities (core-hard, core-soft)

### Key Modules
- **JWT Module** (`src/domain/jwt/`) - Authentication middleware and services
- **Static Board Template** (`src/domain/template/static-board/`) - Example domain implementation

### Testing Structure
- **Unit tests**: Located alongside source files (`*.spec.ts`)
- **E2E tests**: In `test/` directory with domain-specific organization:
  - `fixtures/` - API call functions
  - `mocks/` - Test data
  - `scenarios/` - Test scenarios (`*.e2e-spec.ts`)

## Development Workflow

### Adding New Domain
1. Create domain directory in `src/domain/`
2. Implement standard structure (controllers, services, entities, etc.)
3. Register module in `src/app.module.ts`
4. Generate and run migrations for new entities
5. Create domain seeds and register in `main.seed.ts`

### Database Changes
1. Modify entities
2. Run `pnpm run migration:generate`
3. Review generated migration
4. Run `pnpm run migration:run`
5. Update seeds if needed

### Environment Configuration
- Environment files managed in `envs/` directory
- Validation schema in `app.module.ts` using Joi
- Supports environments: local, dev, prod, test
- Timezone set to Asia/Seoul for local and dev environments

## Important Notes

- Uses pnpm as package manager
- PostgreSQL with TypeORM
- All entities auto-discovered via glob pattern
- Swagger API documentation available at `/api-docs`
- JWT middleware applies to all routes
- Seeding supports environment-specific data (production vs development)

## Git Hooks Configuration

### Pre-commit Hook
- **Trigger**: Before each commit
- **Action**: Runs `lint-staged` which applies:
  - ESLint with auto-fix (`eslint --fix`)
  - Prettier formatting (`prettier --write`)
- **Files**: Only staged TypeScript and JavaScript files (`*.{ts,js}`)

### Pre-push Hook  
- **Trigger**: Before each push to remote
- **Action**: Runs `pnpm run test:local` (e2e tests)
- **Purpose**: Ensures all tests pass before code reaches remote repository

### Configuration Files
- **Husky**: `.husky/` directory contains hook scripts
- **Lint-staged**: Configuration in `package.json` under `lint-staged` field
- **Setup**: Automatic via `prepare` script in `package.json`