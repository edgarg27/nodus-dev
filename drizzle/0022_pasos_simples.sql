ALTER TABLE "contact_request" DROP CONSTRAINT "chk_contact_request_paso";--> statement-breakpoint
-- Los 8 pasos de la 0021 pasan a 4 (+ descartada): confirmar con el broker, avisar al cliente.
UPDATE "contact_request" SET "paso" = CASE "paso"
  WHEN 'broker_contactado' THEN 'con_broker'
  WHEN 'disponible' THEN 'con_cliente'
  WHEN 'cliente_contactado' THEN 'con_cliente'
  WHEN 'visita_agendada' THEN 'con_cliente'
  WHEN 'no_disponible' THEN 'descartada'
  ELSE "paso"
END;--> statement-breakpoint
-- Los cambios de paso de la bitácora guardan la clave del paso: se traducen igual.
UPDATE "seguimiento_nota" SET "texto" = CASE "texto"
  WHEN 'broker_contactado' THEN 'con_broker'
  WHEN 'disponible' THEN 'con_cliente'
  WHEN 'cliente_contactado' THEN 'con_cliente'
  WHEN 'visita_agendada' THEN 'con_cliente'
  WHEN 'no_disponible' THEN 'descartada'
  ELSE "texto"
END
WHERE "tipo" = 'paso';--> statement-breakpoint
ALTER TABLE "contact_request" ADD CONSTRAINT "chk_contact_request_paso" CHECK ("contact_request"."paso" in ('nueva','con_broker','con_cliente','cerrada','descartada'));
