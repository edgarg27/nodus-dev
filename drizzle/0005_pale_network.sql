CREATE TABLE "rate_limit_hit" (
	"clave" text NOT NULL,
	"ventana_inicio" timestamp with time zone NOT NULL,
	"conteo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "rate_limit_hit_clave_ventana_inicio_pk" PRIMARY KEY("clave","ventana_inicio")
);
