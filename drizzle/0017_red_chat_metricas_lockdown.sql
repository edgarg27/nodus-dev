-- Aislamiento de la Data API (ver .claude/rules/db-schema.md): sin políticas, sin privilegios para anon/authenticated.
ALTER TABLE public.propiedad_metrica_diaria ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.propiedad_metrica_diaria FROM anon, authenticated;
--> statement-breakpoint
ALTER TABLE public.conversacion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.conversacion FROM anon, authenticated;
--> statement-breakpoint
ALTER TABLE public.mensaje ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.mensaje FROM anon, authenticated;
