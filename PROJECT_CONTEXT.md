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
- `PATTERNS.USER.GET_ALL`
- `PATTERNS.USER.GET_ONE`
- `PATTERNS.ACCOUNT.CREATE`
- `PATTERNS.ACCOUNT.CREATE_FAILED`
- `PATTERNS.ACCOUNT.GET_BALANCE`
- `PATTERNS.ACCOUNT.TRANSFER`
- `PATTERNS.SYSTEM.LOGGER`
- `PATTERNS.SYSTEM.PING`

DTO виносяться в `libs/common/src/dto`.

## Current Domain Shape

- `CreateUserDto` містить `preferred_currency`
- `CreateAccountDto` містить:
  - `user_id`
  - `currency`
  - `balance`
- `accounts` має вміти створювати акаунт не лише як частину реєстрації

## Important Decisions

- Не виводити нові внутрішні account-операції в `gateway`, поки явно не домовимось
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
