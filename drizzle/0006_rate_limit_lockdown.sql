ALTER TABLE public.rate_limit_hit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limit_hit FROM anon, authenticated;
