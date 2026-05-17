#!/bin/bash
set -e

# Функція для створення бази та виконання SQL у ній
create_db_and_tables() {
  local database=$1
  local sql_content=$2
  echo "  Creating database '$database'..."
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    CREATE DATABASE $database;
EOSQL

  echo "  Initializing tables in '$database'..."
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" <<-EOSQL
    $sql_content
EOSQL
}

# 1. Створюємо audit_db
create_db_and_tables "audit_db" "
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    service VARCHAR,
    event VARCHAR,
    payload JSONB,
    trace_id UUID DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);"

# 2. Створюємо auth_db
create_db_and_tables "auth_db" "
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    password VARCHAR,
    role VARCHAR,
    name VARCHAR,
    phone VARCHAR UNIQUE,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);"

# 3. Створюємо bank_db
# Зверни увагу: REFERENCES public.users тут не спрацює, бо таблиця в іншій базі. 
# В мікросервісах ми просто зберігаємо user_id як число.
create_db_and_tables "bank_db" "
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    balance BIGINT DEFAULT 100 NOT NULL,
    currency VARCHAR NOT NULL,
    iban VARCHAR UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT accounts_user_currency_key UNIQUE (user_id, currency)
);
CREATE INDEX IF NOT EXISTS "idx_accounts_user_id" ON "accounts" ("user_id");

CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    trace_id UUID DEFAULT NULL,
    from_account_id INTEGER NOT NULL,
    to_account_id INTEGER NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR NOT NULL,
    purpose VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'PROCESSING',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "from_account_id" ON "transfers" ("from_account_id");
CREATE INDEX IF NOT EXISTS "to_account_id" ON "transfers" ("to_account_id");

CREATE OR REPLACE FUNCTION handle_account_iban_logic() 
RETURNS TRIGGER AS \$\$
BEGIN
    -- ЛОГІКА ДЛЯ INSERT (Автоматична генерація)
    IF TG_OP = 'INSERT' THEN
        -- Якщо ID ще не присвоєно (наприклад, SERIAL присвоїть його після BEFORE тригера),
        -- нам потрібно взяти наступне значення із сіквенсу таблиці.
        -- Припускаємо, що твоє поле називається id.
        IF NEW.id IS NULL THEN
            NEW.id := nextval(pg_get_serial_sequence('accounts', 'id'));
        END IF;
        
        -- Збираємо IBAN: UA + 1 (МФО) + ID (доповнений нулями до 9 знаків, разом 12)
        -- LPAD(строка, довжина, чим заповнити)
        NEW.iban := 'UA1' || LPAD(NEW.id::text, 9, '0');
    
    -- ЛОГІКА ДЛЯ UPDATE (Захист від змін)
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.iban IS NOT NULL AND OLD.iban <> NEW.iban THEN
            RAISE EXCEPTION 'IBAN cannot be changed once assigned';
        END IF;
    END IF;

    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_iban_bi ON accounts;
CREATE TRIGGER trg_accounts_iban_bi
BEFORE INSERT ON accounts
FOR EACH ROW EXECUTE FUNCTION handle_account_iban_logic();

DROP TRIGGER IF EXISTS trg_accounts_iban_bu ON accounts;
CREATE TRIGGER trg_accounts_iban_bu
BEFORE UPDATE OF iban ON accounts
FOR EACH ROW EXECUTE FUNCTION handle_account_iban_logic();
"
