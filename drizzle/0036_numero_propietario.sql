ALTER TABLE "usuario" ADD COLUMN "numero_propietario" integer;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_numero_propietario_unique" UNIQUE("numero_propietario");