ALTER TABLE "propiedad" ADD COLUMN "equipamiento" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "oficinas_privadas" integer;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "frente_m" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "resistencia_piso_ton" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "chk_propiedad_equipamiento_numeros" CHECK (coalesce("propiedad"."oficinas_privadas", 0) >= 0 and coalesce("propiedad"."frente_m", 0) >= 0 and coalesce("propiedad"."resistencia_piso_ton", 0) >= 0);