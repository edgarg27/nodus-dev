ALTER TABLE "seguimiento_cliente" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "seguimiento_cliente" CASCADE;--> statement-breakpoint
ALTER TABLE "seguimiento_nota" DROP CONSTRAINT "chk_seguimiento_nota_tipo";--> statement-breakpoint
ALTER TABLE "contact_request" ADD COLUMN "paso" text DEFAULT 'nueva' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_request" ADD COLUMN "proxima_accion" text;--> statement-breakpoint
ALTER TABLE "contact_request" ADD COLUMN "proxima_accion_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "chk_contact_request_paso" CHECK ("contact_request"."paso" in ('nueva','broker_contactado','disponible','no_disponible','cliente_contactado','visita_agendada','cerrada','descartada'));--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "chk_contact_request_proxima_accion" CHECK ("contact_request"."proxima_accion" is null or length("contact_request"."proxima_accion") between 1 and 300);--> statement-breakpoint
ALTER TABLE "seguimiento_nota" ADD CONSTRAINT "chk_seguimiento_nota_tipo" CHECK ("seguimiento_nota"."tipo" in ('llamada_broker','llamada_cliente','nota','paso'));