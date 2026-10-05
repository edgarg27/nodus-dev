ALTER TABLE "propiedad" ADD COLUMN "precio" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "moneda" text DEFAULT 'MXN' NOT NULL;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "precio_unidad" text DEFAULT 'total' NOT NULL;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "mantenimiento" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "superficie_construida_m2" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "superficie_terreno_m2" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "banos" integer;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "estacionamientos" integer;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "altura_libre_m" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "andenes" integer;--> statement-breakpoint
ALTER TABLE "propiedad" ADD COLUMN "potencia_kva" integer;--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "chk_propiedad_moneda" CHECK ("propiedad"."moneda" in ('MXN','USD'));--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "chk_propiedad_precio_unidad" CHECK ("propiedad"."precio_unidad" in ('total','m2'));--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "chk_propiedad_detalles_no_negativos" CHECK (coalesce("propiedad"."precio", 0) >= 0 and coalesce("propiedad"."mantenimiento", 0) >= 0 and coalesce("propiedad"."superficie_construida_m2", 0) >= 0 and coalesce("propiedad"."superficie_terreno_m2", 0) >= 0 and coalesce("propiedad"."banos", 0) >= 0 and coalesce("propiedad"."estacionamientos", 0) >= 0 and coalesce("propiedad"."altura_libre_m", 0) >= 0 and coalesce("propiedad"."andenes", 0) >= 0 and coalesce("propiedad"."potencia_kva", 0) >= 0);