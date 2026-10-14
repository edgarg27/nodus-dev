-- El rol "oferente" pasa a llamarse "propietario". Solo cambian nombres y el valor del rol: no se
-- pierde ni se mueve ningún dato.

-- Rol: se suelta la restricción, se convierten las filas y se vuelve a crear con el valor nuevo.
ALTER TABLE "usuario" DROP CONSTRAINT "chk_usuario_rol";--> statement-breakpoint
UPDATE "usuario" SET "rol" = 'propietario' WHERE "rol" = 'oferente';--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "chk_usuario_rol" CHECK ("usuario"."rol" in ('buscador','propietario','admin'));--> statement-breakpoint

-- Columnas, llaves foráneas e índices.
ALTER TABLE "propiedad" RENAME COLUMN "oferente_id" TO "propietario_id";--> statement-breakpoint
ALTER TABLE "contact_request" RENAME COLUMN "oferente_id" TO "propietario_id";--> statement-breakpoint
ALTER TABLE "propiedad" RENAME CONSTRAINT "propiedad_oferente_id_usuario_id_fk" TO "propiedad_propietario_id_usuario_id_fk";--> statement-breakpoint
ALTER TABLE "contact_request" RENAME CONSTRAINT "contact_request_oferente_id_usuario_id_fk" TO "contact_request_propietario_id_usuario_id_fk";--> statement-breakpoint
ALTER INDEX "idx_propiedad_oferente_id" RENAME TO "idx_propiedad_propietario_id";--> statement-breakpoint
ALTER INDEX "idx_contact_request_oferente_id" RENAME TO "idx_contact_request_propietario_id";
