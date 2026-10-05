-- Aislamiento de la Data API (ver .claude/rules/db-schema.md): sin políticas, sin privilegios para anon/authenticated.
ALTER TABLE public.favorito ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.favorito FROM anon, authenticated;
--> statement-breakpoint
ALTER TABLE public.busqueda_guardada ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.busqueda_guardada FROM anon, authenticated;
