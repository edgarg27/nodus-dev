-- Número de propietario ("P-0783"): consecutivo y único para cada dueño o broker. Lo asigna la base
-- al pasar a propietario (registro, "Publica tu espacio" o cualquier cambio de rol), así ningún
-- camino de la aplicación lo puede olvidar ni repetir. Un número asignado no se reutiliza.
CREATE SEQUENCE IF NOT EXISTS numero_propietario_seq;
--> statement-breakpoint
REVOKE ALL ON SEQUENCE numero_propietario_seq FROM anon, authenticated;
--> statement-breakpoint
-- Quienes ya publican reciben su número por orden de registro: el más antiguo es el 1.
UPDATE usuario u
SET numero_propietario = o.n
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM usuario
  WHERE rol = 'propietario' AND numero_propietario IS NULL
) o
WHERE u.id = o.id;
--> statement-breakpoint
SELECT setval(
  'numero_propietario_seq',
  coalesce((SELECT max(numero_propietario) FROM usuario), 0) + 1,
  false
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION asignar_numero_propietario() RETURNS trigger AS $$
BEGIN
  IF NEW.rol = 'propietario' AND NEW.numero_propietario IS NULL THEN
    NEW.numero_propietario := nextval('numero_propietario_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_usuario_numero_propietario BEFORE INSERT OR UPDATE OF rol ON usuario
  FOR EACH ROW EXECUTE FUNCTION asignar_numero_propietario();
