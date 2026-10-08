-- Las solicitudes que ya existían siguen llegando al oferente (su bandeja de leads y su chat): solo
-- las nuevas van únicamente a Captive. La 0019 agregó `canal` con default 'captive' a todas.
UPDATE public.contact_request SET canal = 'directo';
--> statement-breakpoint
-- Aislamiento de la Data API (ver .claude/rules/db-schema.md): sin políticas, sin privilegios para anon/authenticated.
ALTER TABLE public.seguimiento_cliente ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.seguimiento_cliente FROM anon, authenticated;
--> statement-breakpoint
ALTER TABLE public.seguimiento_nota ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.seguimiento_nota FROM anon, authenticated;
