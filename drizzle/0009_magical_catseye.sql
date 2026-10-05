CREATE TABLE "busqueda_guardada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"consulta" text NOT NULL,
	"ultima_vista_en" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_busqueda_guardada_nombre" CHECK (length(btrim("busqueda_guardada"."nombre")) between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "favorito" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"propiedad_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "busqueda_guardada" ADD CONSTRAINT "busqueda_guardada_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorito" ADD CONSTRAINT "favorito_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorito" ADD CONSTRAINT "favorito_propiedad_id_propiedad_id_fk" FOREIGN KEY ("propiedad_id") REFERENCES "public"."propiedad"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_busqueda_guardada_usuario_consulta" ON "busqueda_guardada" USING btree ("usuario_id","consulta");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_favorito_usuario_propiedad" ON "favorito" USING btree ("usuario_id","propiedad_id");