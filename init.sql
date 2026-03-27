-- Створюємо таблицю Users (identity)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    name character varying NOT NULL,
    email character varying NOT NULL UNIQUE,
    password character varying
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