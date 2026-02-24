
DROP FUNCTION IF EXISTS public.match_faqs;

CREATE OR REPLACE FUNCTION public.match_faqs(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_domain text DEFAULT NULL
)
RETURNS TABLE (
  id integer,
  q_en text,
  a_en text,
  q_ta text,
  a_ta text,
  domain text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.q_en,
    f.a_en,
    f.q_ta,
    f.a_ta,
    f.domain,
    (1 - (f.embedding <=> query_embedding))::float AS similarity
  FROM public.faqs f
  WHERE
    f.embedding IS NOT NULL
    AND (filter_domain IS NULL OR f.domain = filter_domain)
    AND 1 - (f.embedding <=> query_embedding) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
