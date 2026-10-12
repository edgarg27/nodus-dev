CREATE TABLE "caso_exito" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector" text NOT NULL,
	"titulo" text NOT NULL,
	"texto" text NOT NULL,
	"sector_en" text,
	"titulo_en" text,
	"texto_en" text,
	"foto_url" text,
	"publicado" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_caso_exito_textos" CHECK (length(btrim("caso_exito"."sector")) between 1 and 60 and length(btrim("caso_exito"."titulo")) between 1 and 120 and length(btrim("caso_exito"."texto")) between 1 and 600),
	CONSTRAINT "chk_caso_exito_textos_en" CHECK (length(coalesce("caso_exito"."sector_en", '')) <= 60 and length(coalesce("caso_exito"."titulo_en", '')) <= 120 and length(coalesce("caso_exito"."texto_en", '')) <= 600)
);
--> statement-breakpoint
CREATE INDEX "idx_caso_exito_publicado_orden" ON "caso_exito" USING btree ("orden") WHERE "caso_exito"."publicado" = true;