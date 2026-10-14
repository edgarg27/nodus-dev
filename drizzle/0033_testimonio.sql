CREATE TABLE "testimonio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cita" text NOT NULL,
	"nombre" text NOT NULL,
	"cargo" text NOT NULL,
	"cita_en" text,
	"cargo_en" text,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_testimonio_textos" CHECK (length(btrim("testimonio"."cita")) between 1 and 400 and length(btrim("testimonio"."nombre")) between 1 and 80 and length(btrim("testimonio"."cargo")) between 1 and 120),
	CONSTRAINT "chk_testimonio_textos_en" CHECK (length(coalesce("testimonio"."cita_en", '')) <= 400 and length(coalesce("testimonio"."cargo_en", '')) <= 120)
);
