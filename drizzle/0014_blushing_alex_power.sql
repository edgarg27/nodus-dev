CREATE TABLE "agencia_contacto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"valor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_agencia_contacto_tipo" CHECK ("agencia_contacto"."tipo" in ('email','telefono','whatsapp')),
	CONSTRAINT "chk_agencia_contacto_valor" CHECK (length(btrim("agencia_contacto"."valor")) between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "agencia_perfil" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_agencia_perfil_nombre" CHECK (length(btrim("agencia_perfil"."nombre")) between 1 and 120),
	CONSTRAINT "chk_agencia_perfil_descripcion" CHECK (length("agencia_perfil"."descripcion") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "agencia_contacto" ADD CONSTRAINT "agencia_contacto_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agencia_perfil" ADD CONSTRAINT "agencia_perfil_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agencia_contacto_usuario_id" ON "agencia_contacto" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agencia_contacto_usuario_tipo_valor" ON "agencia_contacto" USING btree ("usuario_id","tipo","valor");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agencia_perfil_usuario" ON "agencia_perfil" USING btree ("usuario_id");