
CREATE TABLE public.support_tickets (
  id SERIAL PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id),
  org_id TEXT NOT NULL,
  domain TEXT,
  user_id UUID,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'phone')),
  contact_value TEXT NOT NULL,
  query_summary TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);
