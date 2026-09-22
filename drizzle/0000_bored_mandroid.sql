CREATE TABLE "contact_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buscador_id" uuid NOT NULL,
	"propiedad_id" uuid NOT NULL,
	"oferente_id" uuid NOT NULL,
	"broker_id" uuid,
	"quiere_financiamiento" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propiedad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferente_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"modalidad" text NOT NULL,
	"direccion" text NOT NULL,
	"direccion_normalizada" text NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"lat_redondeada" numeric(9, 5) GENERATED ALWAYS AS (round(lat, 5)) STORED NOT NULL,
	"lng_redondeada" numeric(9, 5) GENERATED ALWAYS AS (round(lng, 5)) STORED NOT NULL,
	"estado" text NOT NULL,
	"ciudad" text NOT NULL,
	"descripcion" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"estado_publicacion" text DEFAULT 'pendiente' NOT NULL,
	"motivo_rechazo" text,
	"revisada_por" uuid,
	"revisada_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_propiedad_publicacion" CHECK ("propiedad"."estado_publicacion" in ('pendiente','publicada','rechazada')),
	CONSTRAINT "chk_propiedad_motivo_rechazo" CHECK (("propiedad"."estado_publicacion" = 'rechazada' and "propiedad"."motivo_rechazo" is not null and length(btrim("propiedad"."motivo_rechazo")) > 0) or ("propiedad"."estado_publicacion" <> 'rechazada' and "propiedad"."motivo_rechazo" is null)),
	CONSTRAINT "chk_propiedad_revision" CHECK (("propiedad"."estado_publicacion" = 'pendiente' and "propiedad"."revisada_por" is null and "propiedad"."revisada_en" is null) or ("propiedad"."estado_publicacion" <> 'pendiente' and ("propiedad"."revisada_por" is null) = ("propiedad"."revisada_en" is null))),
	CONSTRAINT "chk_propiedad_tipo" CHECK ("propiedad"."tipo" in ('nave_industrial','oficina','local_comercial')),
	CONSTRAINT "chk_propiedad_modalidad" CHECK ("propiedad"."modalidad" in ('renta','venta','desde_cero')),
	CONSTRAINT "chk_propiedad_estado" CHECK ("propiedad"."estado" in ('SLP','Aguascalientes','Leon'))
);
--> statement-breakpoint
CREATE TABLE "propiedad_foto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"propiedad_id" uuid NOT NULL,
	"storage_url" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text,
	"rol" text NOT NULL,
	"is_broker" boolean DEFAULT false NOT NULL,
	"broker_code" text,
	"referral_broker_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email"),
	CONSTRAINT "usuario_broker_code_unique" UNIQUE("broker_code"),
	CONSTRAINT "chk_usuario_rol" CHECK ("usuario"."rol" in ('buscador','oferente','admin')),
	CONSTRAINT "chk_usuario_broker_code" CHECK ("usuario"."broker_code" is null or "usuario"."is_broker" = true)
);
--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "contact_request_buscador_id_usuario_id_fk" FOREIGN KEY ("buscador_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "contact_request_propiedad_id_propiedad_id_fk" FOREIGN KEY ("propiedad_id") REFERENCES "public"."propiedad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "contact_request_oferente_id_usuario_id_fk" FOREIGN KEY ("oferente_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "contact_request_broker_id_usuario_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "propiedad_oferente_id_usuario_id_fk" FOREIGN KEY ("oferente_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "propiedad_revisada_por_usuario_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propiedad_foto" ADD CONSTRAINT "propiedad_foto_propiedad_id_propiedad_id_fk" FOREIGN KEY ("propiedad_id") REFERENCES "public"."propiedad"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_referral_broker_id_usuario_id_fk" FOREIGN KEY ("referral_broker_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_request_oferente_id" ON "contact_request" USING btree ("oferente_id");--> statement-breakpoint
CREATE INDEX "idx_contact_request_broker_id" ON "contact_request" USING btree ("broker_id") WHERE "contact_request"."broker_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_contact_request_propiedad_id" ON "contact_request" USING btree ("propiedad_id");--> statement-breakpoint
CREATE INDEX "idx_propiedad_oferente_id" ON "propiedad" USING btree ("oferente_id");--> statement-breakpoint
CREATE INDEX "idx_propiedad_busqueda" ON "propiedad" USING btree ("estado","ciudad","modalidad","tipo") WHERE "propiedad"."activo" = true;--> statement-breakpoint
CREATE INDEX "idx_propiedad_revision" ON "propiedad" USING btree ("updated_at") WHERE "propiedad"."activo" = true and "propiedad"."estado_publicacion" = 'pendiente';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_propiedad_duplicado" ON "propiedad" USING btree ("direccion_normalizada","lat_redondeada","lng_redondeada") WHERE "propiedad"."activo" = true and "propiedad"."estado_publicacion" <> 'rechazada';--> statement-breakpoint
CREATE INDEX "idx_propiedad_foto_propiedad_id" ON "propiedad_foto" USING btree ("propiedad_id");