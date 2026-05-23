# AGENTS.md

This file describes how an engineering agent should work in this repository.

## Purpose

This repository is a NestJS monorepo for a small banking domain split into microservices.
The main goal for an agent here is to make targeted changes without silently breaking message contracts, service boundaries, or local debug workflows.

## Repository Shape

- `apps/gateway`
  - HTTP entrypoint.
  - Proxies client requests into backend services.
  - Talks to `auth` and `accounts` over RabbitMQ.
  - Talks to `rater` over gRPC.
- `apps/auth`
  - Registration, login, user profile, role changes.
  - Owns user-related data.
- `apps/accounts`
  - Accounts, balances, transfers, currency conversion integration.
  - Owns account-related data.
- `apps/logger`
  - Consumes audit/domain log events.
- `apps/rater`
  - Provides exchange rates.
  - Uses Redis for caching and gRPC for integration.
- `libs/common`
  - Shared DTOs, constants, filters, logger utilities, RMQ module, proto-path helpers, cross-service helpers.

## Architecture Rules

- Treat `libs/common` as the source of truth for shared contracts.
- If a DTO, message pattern, service token, or shared helper is used across services, it belongs in `libs/common`.
- When changing a cross-service contract, update all three sides together:
  - shared contract in `libs/common`
  - producer
  - consumer
- Do not add new internal account operations to `gateway` unless the task explicitly asks for public HTTP exposure.
- Keep orchestration concerns separate from core business operations when possible.
- Preserve existing saga-like compensation flows unless the task explicitly changes domain behavior.

## Current Service Contracts

Important message groups currently live in:

- `libs/common/src/constants/patterns.ts`
- `libs/common/src/constants/services.ts`
- `libs/common/src/dto/*`
- `libs/common/src/index.ts`

Examples of active shared contracts:

- `PATTERNS.USER.REGISTER`
- `PATTERNS.USER.LOGIN`
- `PATTERNS.USER.SET_ROLE`
- `PATTERNS.USER.GET_ALL`
- `PATTERNS.USER.GET_ONE`
- `PATTERNS.ACCOUNT.CREATE`
- `PATTERNS.ACCOUNT.CREATE_FAILED`
- `PATTERNS.ACCOUNT.GET_ACCOUNTS`
- `PATTERNS.ACCOUNT.GET_RATE`
- `PATTERNS.ACCOUNT.TRANSFER`
- `PATTERNS.SYSTEM.LOGGER`
- `PATTERNS.SYSTEM.PING`

If you add a new DTO or shared helper and expect other services to import it through `@app/common`, export it from `libs/common/src/index.ts`.

## Runtime and Infrastructure

Local orchestration is defined in:

- `docker-compose.yml`
- `docker-compose.debug.yml`

Current infrastructure assumptions:

- PostgreSQL
- RabbitMQ
- Redis
- gRPC between `accounts` and `rater`

Important environment variables used in the repo:

- `DATABASE_URL`
- `JWT_SECRET`
- `RABBITMQ_URL`
- `RATER_HOST`
- `RATER_GRPC_URL`
- `REDIS_URL`
- `EXCHANGE_API_KEY`

If you introduce a new required env var:

- wire it into the relevant service config
- update compose files if needed
- update `.env.example`

## Build and Run

Common commands:

- `npm run build`
- `npm run build:debug`
- `npm run test`
- `npm run test:e2e`

Notes:

- `nest-cli.json` defines a monorepo with multiple apps and one shared library.
- `build:debug` uses webpack and produces output layout that differs from the standard Nest build.
- The debug Docker workflow is the canonical local attach-debug path.

## Debugging Conventions

Use `docker-compose.debug.yml` for local debug sessions.

Expected debug ports:

- `gateway`: `9230`
- `accounts`: `9231`
- `logger`: `9232`
- `auth`: `9233`
- `rater`: `9234`

If breakpoints become unbound, check:

- that the container was built in debug mode
- generated output paths in `dist`
- VS Code `outFiles`
- `sourceMapPathOverrides`

## Change Strategy

For most tasks, prefer the smallest coherent change that keeps the monorepo consistent.

Good default workflow:

1. Read the target service module, controller, and service.
2. Inspect related shared contracts in `libs/common`.
3. Check whether another service consumes or emits the same message pattern.
4. Make the change.
5. Verify build or tests at the narrowest useful scope.

## File-Level Guidance

### `apps/gateway`

- Keep it thin.
- Prefer validation, auth, role checks, and request translation here.
- Avoid pushing account-domain logic into controllers.

### `apps/auth`

- Registration currently has side effects into `accounts`.
- Be careful not to break compensation behavior around account creation failures.
- Registration should not accept arbitrary role assignment from public input.

### `apps/accounts`

- This service owns account-domain rules.
- Currency-sensitive behavior and transfer behavior should stay here unless there is a strong reason otherwise.
- Check `rater` integration if touching exchange-rate logic.

### `apps/rater`

- Redis-backed rate caching and provider strategy behavior live here.
- Be explicit about external API assumptions and fallback behavior.

### `apps/logger`

- Keep it consumer-oriented.
- Changes here often require confirming emitted payload shape from producers.

### `libs/common`

- Avoid turning this library into a dumping ground.
- Shared code should be either:
  - contract-level
  - transport-level
  - clearly reused infrastructure

## Testing Expectations

Before finishing a change, validate at least one of:

- targeted unit or e2e tests
- `npm run build`

Minimum checks depend on the task:

- DTO or shared contract change:
  - check all producers/consumers
  - prefer `npm run build`
- Controller/service logic change:
  - run relevant tests if present
- Compose/env/debug change:
  - verify YAML consistency and referenced env vars

## Known Project Nuances

- `gateway` is the public HTTP surface, not the place for arbitrary business expansion.
- `auth` can request accounts data when building a user profile.
- `accounts` may create accounts outside the registration flow as a standalone domain operation.
- Users should not end up with more than one open account per supported currency.
- The repo contains both normal and debug compose files; keep them aligned unless divergence is intentional.

## What to Avoid

- Do not change shared contracts in only one service.
- Do not add secrets to tracked files.
- Do not remove or rename DTO exports from `libs/common/src/index.ts` without checking consumers.
- Do not assume `main.ts` is the only entrypoint to behavior; Nest modules and RMQ patterns define runtime wiring.
- Do not treat test-only files as dead code without checking Jest config.

## Definition of Done

A change is usually ready when:

- the code change is internally consistent
- shared contracts remain aligned
- required env vars are documented
- debug/runtime config still matches service topology
- at least one relevant verification step was performed, or the lack of verification is explicitly stated

## Suggested Maintenance

Keep this file updated when any of the following changes:

- service topology
- message contracts
- shared DTO layout
- debug workflow
- required environment variables
