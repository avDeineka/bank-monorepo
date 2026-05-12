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
    CONSTRAINT accounts_user_currency_key UNIQUE (user_id, currency)
);
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    trace_id UUID NOT NULL,
    from_account_id INTEGER NOT NULL,
    to_account_id INTEGER NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    purpose VARCHAR(255),
    status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT NOW()
);"
