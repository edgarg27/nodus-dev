CREATE TABLE "broker_atribucion_historica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker_revocacion_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"broker_code" text NOT NULL,
	"contact_request_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"total_leads" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_broker_atribucion_historica_total_leads" CHECK ("broker_atribucion_historica"."total_leads" >= 0)
);
--> statement-breakpoint
CREATE TABLE "broker_revocacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"broker_code" text NOT NULL,
	"motivo" text NOT NULL,
	"revocada_por" uuid NOT NULL,
	"revocada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_broker_revocacion_motivo" CHECK (length(btrim("broker_revocacion"."motivo")) > 0)
);
--> statement-breakpoint
CREATE TABLE "broker_solicitud" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"mensaje" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"motivo_denegacion" text,
	"resuelta_por" uuid,
	"resuelta_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_broker_solicitud_estado" CHECK ("broker_solicitud"."estado" in ('pendiente','aprobada','denegada')),
	CONSTRAINT "chk_broker_solicitud_mensaje" CHECK (length(btrim("broker_solicitud"."mensaje")) > 0),
	CONSTRAINT "chk_broker_solicitud_resolucion" CHECK (("broker_solicitud"."estado" = 'pendiente' and "broker_solicitud"."resuelta_por" is null and "broker_solicitud"."resuelta_en" is null) or ("broker_solicitud"."estado" <> 'pendiente' and "broker_solicitud"."resuelta_por" is not null and "broker_solicitud"."resuelta_en" is not null)),
	CONSTRAINT "chk_broker_solicitud_motivo" CHECK ("broker_solicitud"."motivo_denegacion" is null or "broker_solicitud"."estado" = 'denegada')
);
--> statement-breakpoint
ALTER TABLE "broker_atribucion_historica" ADD CONSTRAINT "broker_atribucion_historica_broker_revocacion_id_broker_revocacion_id_fk" FOREIGN KEY ("broker_revocacion_id") REFERENCES "public"."broker_revocacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_atribucion_historica" ADD CONSTRAINT "broker_atribucion_historica_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_revocacion" ADD CONSTRAINT "broker_revocacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_revocacion" ADD CONSTRAINT "broker_revocacion_revocada_por_usuario_id_fk" FOREIGN KEY ("revocada_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_solicitud" ADD CONSTRAINT "broker_solicitud_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_solicitud" ADD CONSTRAINT "broker_solicitud_resuelta_por_usuario_id_fk" FOREIGN KEY ("resuelta_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_broker_atribucion_historica_revocacion" ON "broker_atribucion_historica" USING btree ("broker_revocacion_id");--> statement-breakpoint
CREATE INDEX "idx_broker_atribucion_historica_usuario_id" ON "broker_atribucion_historica" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_broker_revocacion_usuario_id" ON "broker_revocacion" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_broker_solicitud_pendiente" ON "broker_solicitud" USING btree ("usuario_id") WHERE "broker_solicitud"."estado" = 'pendiente';--> statement-breakpoint
CREATE INDEX "idx_broker_solicitud_usuario_id" ON "broker_solicitud" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_broker_solicitud_pendientes" ON "broker_solicitud" USING btree ("created_at") WHERE "broker_solicitud"."estado" = 'pendiente';