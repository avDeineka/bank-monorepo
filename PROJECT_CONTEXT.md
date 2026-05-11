# Project Context

Цей файл тримає короткий живий контекст по репозиторію, щоб не відновлювати картину з нуля в кожній сесії.

## Stack

- NestJS monorepo
- RabbitMQ для міжсервісної взаємодії
- PostgreSQL через Knex
- Спільні DTO, constants та утиліти в `libs/common`

## Services

- `apps/gateway`
  - HTTP entrypoint
  - проксіює запити в мікросервіси через RMQ
- `apps/auth`
  - користувачі, реєстрація, логін
  - зберігає user-дані
- `apps/accounts`
  - акаунти, баланс, перекази
  - зберігає account-дані окремо від `auth`
- `apps/logger`
  - приймає доменні події для логування

## Shared Contracts

- `PATTERNS.USER.REGISTER`
- `PATTERNS.USER.LOGIN`
- `PATTERNS.USER.SET_ROLE`
- `PATTERNS.USER.GET_ALL`
- `PATTERNS.USER.GET_ONE`
- `PATTERNS.ACCOUNT.CREATE`
- `PATTERNS.ACCOUNT.CREATE_FAILED`
- `PATTERNS.ACCOUNT.GET_BALANCE`
- `PATTERNS.ACCOUNT.TRANSFER`
- `PATTERNS.SYSTEM.LOGGER`
- `PATTERNS.SYSTEM.PING`

DTO виносяться в `libs/common/src/dto`.
Спільні role-константи (`ROLES.USER`, `ROLES.ADMIN`) винесені в `libs/common/src/constants/roles.ts`.

## Current Domain Shape

- `CreateUserDto` містить `preferred_currency` і більше не приймає `role`
- `SetRoleDto` містить:
  - `email`
  - `role`
- `CreateAccountDto` містить:
  - `user_id`
  - `currency`
  - `balance`
- `accounts` має вміти створювати акаунт не лише як частину реєстрації

## Important Decisions

- Не виводити нові внутрішні account-операції в `gateway`, поки явно не домовимось
- Реєстрація через `POST /api/register` завжди створює юзера з роллю `ROLES.USER`
- Зміна ролі винесена в окремий `POST /api/set-role`, доступний лише для `admin`
- При зміні message contract треба синхронно перевіряти:
  - `libs/common`
  - producer
  - consumer
- Якщо логіка використовується в saga і як окрема доменна операція, краще:
  - лишати загальний service-метод
  - saga-оркестрацію тримати окремо, а не змішувати з базовою бізнес-операцією

## Current Nuance

- У `auth -> accounts` вже є saga-подібний компенсаційний сценарій під час реєстрації юзера
- При рефакторингах account creation не можна випадково викидати saga-поведінку, якщо задача лише в перейменуванні або узагальненні методу

## Debugging

- Для локального attach-debug актуальним вважається `docker-compose.debug.yml`
- Контейнери запускаються через `docker compose -f docker-compose.debug.yml up --build`
- VS Code attach-конфіги в `.vscode/launch.json` підключаються до портів:
  - `gateway`: `9230`
  - `accounts`: `9231`
  - `logger`: `9232`
  - `auth`: `9233`
- Debug build (`npm run build:debug`, webpack builder) у цьому репо генерує артефакти не в `dist/apps/...`, а в `dist/<service>/src/...`
- Якщо breakpoints стають `Unbound`, спочатку перевіряти:
  - `outFiles` у `.vscode/launch.json`
  - `sourceMapPathOverrides`
  - чи контейнер зібраний саме в debug-режимі
  - чи після змін у `.vscode/launch.json` було `Developer: Reload Window`

## Change Checklist

Перед завершенням змін перевіряти:

- чи не зламався payload між мікросервісами
- чи DTO експортований з `libs/common/src/index.ts`
- чи `gateway` не зачеплений, якщо цього не просили
- чи збірка проходить: `cmd /c npm run build`

## Open Notes

Сюди можна дописувати руками:

- домовленості по saga
- що вважається тимчасовим рішенням
- які ендпоїнти не чіпати
- які рефакторинги вже початі
