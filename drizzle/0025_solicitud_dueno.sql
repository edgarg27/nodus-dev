ALTER TABLE "broker_solicitud" ADD COLUMN "tipo" text DEFAULT 'broker' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "dueno_verificado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "broker_solicitud" ADD CONSTRAINT "chk_broker_solicitud_tipo" CHECK ("broker_solicitud"."tipo" in ('broker','dueno'));--> statement-breakpoint
-- Oferentes que ya existían y no son brokers: quedan como solicitud pendiente para que Captive los
-- revise ("Soy broker" → tipo broker; "Soy el dueño" o sin elegir → tipo dueno). Quien ya tiene una
-- pendiente se queda con la suya.
INSERT INTO "broker_solicitud" ("usuario_id", "mensaje", "empresa", "tipo")
SELECT u."id",
  'Registrado antes de que las cuentas pasaran por aprobación.',
  coalesce(a."nombre", ''),
  CASE WHEN u."tipo_anunciante" = 'inmobiliaria' THEN 'broker' ELSE 'dueno' END
FROM "usuario" u
LEFT JOIN "agencia_perfil" a ON a."usuario_id" = u."id"
WHERE u."rol" = 'oferente'
  AND NOT u."is_broker"
  AND NOT EXISTS (
    SELECT 1 FROM "broker_solicitud" s WHERE s."usuario_id" = u."id" AND s."estado" = 'pendiente'
  );
