ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propiedad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propiedad_foto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_request ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.usuario, public.propiedad, public.propiedad_foto, public.contact_request FROM anon, authenticated;
