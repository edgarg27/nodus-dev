DROP INDEX "idx_caso_exito_publicado_orden";--> statement-breakpoint
ALTER TABLE "caso_exito" DROP COLUMN "publicado";--> statement-breakpoint
ALTER TABLE "caso_exito" DROP COLUMN "orden";