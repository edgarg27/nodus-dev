CREATE TABLE "conversacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"propiedad_id" uuid NOT NULL,
	"iniciador_id" uuid NOT NULL,
	"dueno_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_conversacion_participantes" CHECK ("conversacion"."iniciador_id" <> "conversacion"."dueno_id")
);
--> statement-breakpoint
CREATE TABLE "mensaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"leido_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_mensaje_texto" CHECK (length(btrim("mensaje"."texto")) between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "propiedad_metrica_diaria" (
	"propiedad_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"impresiones" integer DEFAULT 0 NOT NULL,
	"visitas" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "propiedad_metrica_diaria_propiedad_id_dia_pk" PRIMARY KEY("propiedad_id","dia"),
	CONSTRAINT "chk_metrica_no_negativa" CHECK ("propiedad_metrica_diaria"."impresiones" >= 0 and "propiedad_metrica_diaria"."visitas" >= 0)
);
--> statement-breakpoint
ALTER TABLE "contact_request" ADD COLUMN "estado" text DEFAULT 'nueva' NOT NULL;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "referencia" text;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "titulo" text;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "contacto_id" uuid;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "compartida_en_red" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "comision_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "exclusiva" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_propiedad_id_propiedad_id_fk" FOREIGN KEY ("propiedad_id") REFERENCES "public"."propiedad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_iniciador_id_usuario_id_fk" FOREIGN KEY ("iniciador_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_dueno_id_usuario_id_fk" FOREIGN KEY ("dueno_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_conversacion_id_conversacion_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propiedad_metrica_diaria" ADD CONSTRAINT "propiedad_metrica_diaria_propiedad_id_propiedad_id_fk" FOREIGN KEY ("propiedad_id") REFERENCES "public"."propiedad"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_conversacion_propiedad_iniciador" ON "conversacion" USING btree ("propiedad_id","iniciador_id");--> statement-breakpoint
CREATE INDEX "idx_conversacion_iniciador_id" ON "conversacion" USING btree ("iniciador_id");--> statement-breakpoint
CREATE INDEX "idx_conversacion_dueno_id" ON "conversacion" USING btree ("dueno_id");--> statement-breakpoint
CREATE INDEX "idx_mensaje_conversacion" ON "mensaje" USING btree ("conversacion_id","created_at");--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "propiedad_contacto_id_agencia_contacto_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."agencia_contacto"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_propiedad_red" ON "propiedad" USING btree ("created_at") WHERE "propiedad"."compartida_en_red" = true and "propiedad"."activo" = true;--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "chk_contact_request_estado" CHECK ("contact_request"."estado" in ('nueva','contactada','visita','propuesta','ganada','descartada'));--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "chk_propiedad_comision" CHECK ("propiedad"."comision_pct" is null or ("propiedad"."comision_pct" >= 0 and "propiedad"."comision_pct" <= 100));--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "chk_propiedad_referencia_titulo" CHECK (("propiedad"."referencia" is null or length(btrim("propiedad"."referencia")) between 1 and 60) and ("propiedad"."titulo" is null or length(btrim("propiedad"."titulo")) between 1 and 160));