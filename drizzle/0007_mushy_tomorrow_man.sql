ALTER TABLE "broker_solicitud" ADD COLUMN "empresa" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "acepta_financiamiento" boolean DEFAULT false NOT NULL;