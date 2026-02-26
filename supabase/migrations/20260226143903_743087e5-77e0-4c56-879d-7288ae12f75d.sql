CREATE TABLE public.telegram_sessions (
  chat_id BIGINT PRIMARY KEY,
  org_id TEXT NOT NULL,
  domain TEXT,
  language TEXT DEFAULT 'english',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.telegram_sessions DISABLE ROW LEVEL SECURITY;