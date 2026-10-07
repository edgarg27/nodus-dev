-- Aislamiento de la Data API (ver .claude/rules/db-schema.md): sin políticas, sin privilegios para anon/authenticated.
ALTER TABLE public.agencia_perfil ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.agencia_perfil FROM anon, authenticated;
--> statement-breakpoint
ALTER TABLE public.agencia_contacto ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.agencia_contacto FROM anon, authenticated;
