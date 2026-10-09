-- Aislamiento de la Data API (ver .claude/rules/db-schema.md): sin políticas, sin privilegios para anon/authenticated.
ALTER TABLE public.chat_captive ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.chat_captive FROM anon, authenticated;
--> statement-breakpoint
ALTER TABLE public.mensaje_captive ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.mensaje_captive FROM anon, authenticated;
