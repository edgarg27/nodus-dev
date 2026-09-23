ALTER TABLE public.broker_solicitud ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_revocacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_atribucion_historica ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.broker_solicitud, public.broker_revocacion, public.broker_atribucion_historica FROM anon, authenticated;
