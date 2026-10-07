-- Abre la plataforma a los 32 estados de México (src/lib/estados.ts).
-- "Leon" era una ciudad guardada como estado: pasa a Guanajuato (la ciudad León se conserva).
ALTER TABLE "propiedad" DROP CONSTRAINT "chk_propiedad_estado";
--> statement-breakpoint
UPDATE "propiedad" SET "estado" = 'Guanajuato' WHERE "estado" = 'Leon';
--> statement-breakpoint
UPDATE "busqueda_guardada" SET "consulta" = regexp_replace("consulta", '(^|&)estado=Leon(&|$)', '\1estado=Guanajuato\2') WHERE "consulta" ~ '(^|&)estado=Leon(&|$)';
--> statement-breakpoint
ALTER TABLE "propiedad" ADD CONSTRAINT "chk_propiedad_estado" CHECK ("propiedad"."estado" in ('Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Ciudad de Mexico','Coahuila','Colima','Durango','Estado de Mexico','Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacan','Morelos','Nayarit','Nuevo Leon','Oaxaca','Puebla','Queretaro','Quintana Roo','SLP','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatan','Zacatecas'));
