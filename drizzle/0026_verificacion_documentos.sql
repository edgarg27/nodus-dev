CREATE TABLE "verificacion_documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"storage_path" text NOT NULL,
	"nombre_archivo" text NOT NULL,
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_verificacion_documento_tipo" CHECK ("verificacion_documento"."tipo" in ('identificacion','acreditacion_broker','comprobante_propiedad'))
);
--> statement-breakpoint
ALTER TABLE "broker_solicitud" ADD COLUMN "nota_aprobacion" text;--> statement-breakpoint
ALTER TABLE "verificacion_documento" ADD CONSTRAINT "verificacion_documento_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_verificacion_documento_usuario_tipo" ON "verificacion_documento" USING btree ("usuario_id","tipo");