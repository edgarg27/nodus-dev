CREATE TABLE "seguimiento_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buscador_id" uuid NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seguimiento_cliente_buscador_id_unique" UNIQUE("buscador_id"),
	CONSTRAINT "chk_seguimiento_cliente_estado" CHECK ("seguimiento_cliente"."estado" in ('pendiente','seguimiento','cerrado'))
);
--> statement-breakpoint
CREATE TABLE "seguimiento_nota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buscador_id" uuid NOT NULL,
	"contact_request_id" uuid,
	"autor_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_seguimiento_nota_tipo" CHECK ("seguimiento_nota"."tipo" in ('llamada_broker','llamada_cliente','nota')),
	CONSTRAINT "chk_seguimiento_nota_texto" CHECK (length("seguimiento_nota"."texto") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "contact_request" ADD COLUMN "canal" text DEFAULT 'captive' NOT NULL;--> statement-breakpoint
ALTER TABLE "seguimiento_cliente" ADD CONSTRAINT "seguimiento_cliente_buscador_id_usuario_id_fk" FOREIGN KEY ("buscador_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seguimiento_nota" ADD CONSTRAINT "seguimiento_nota_buscador_id_usuario_id_fk" FOREIGN KEY ("buscador_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seguimiento_nota" ADD CONSTRAINT "seguimiento_nota_contact_request_id_contact_request_id_fk" FOREIGN KEY ("contact_request_id") REFERENCES "public"."contact_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seguimiento_nota" ADD CONSTRAINT "seguimiento_nota_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_seguimiento_nota_buscador_id" ON "seguimiento_nota" USING btree ("buscador_id");--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "chk_contact_request_canal" CHECK ("contact_request"."canal" in ('directo','captive'));