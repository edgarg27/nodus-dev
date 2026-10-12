ALTER TABLE "caso_exito" ADD COLUMN "posicion" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_caso_exito_posicion" ON "caso_exito" USING btree ("posicion") WHERE "caso_exito"."posicion" is not null;--> statement-breakpoint
ALTER TABLE "caso_exito" ADD CONSTRAINT "chk_caso_exito_posicion" CHECK ("caso_exito"."posicion" is null or "caso_exito"."posicion" between 1 and 3);