-- Створюємо таблицю Users (identity)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email character varying NOT NULL UNIQUE,
    password character varying,
    role character varying,
);

CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL, -- Зв'язок з таблицею users (Auth)
    name VARCHAR(255) NOT NULL,      -- Повне ім'я (Full Name)
    phone VARCHAR(20),               -- Для верифікації або контактів
    avatar_url TEXT,                 -- Посилання на фото профілю (на майбутнє для S3)
    bio TEXT,                        -- Коротка інформація (опціонально)
    preferred_currency VARCHAR(3) DEFAULT 'USD', -- Важливо для банку!
    last_active_at TIMESTAMP,        -- Для аналітики, коли юзер востаннє заходив
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unique_phone" UNIQUE ("phone")
);

-- Створюємо таблицю Accounts (finances)
CREATE TABLE IF NOT EXISTS public.accounts (
    id SERIAL PRIMARY KEY,
    user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance bigint DEFAULT 100 NOT NULL,
    currency character varying NOT NULL
);

-- Створюємо таблицю Audit Logs (logging)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id SERIAL PRIMARY KEY,
    service character varying,
    event character varying,
    payload jsonb,
    created_at timestamp without time zone DEFAULT now()
);

-- Індекси (CREATE INDEX за замовчуванням мають логіку IF NOT EXISTS у нових версіях, 
-- але краще додати перевірку або просто завантажити один раз)
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts (user_id);
