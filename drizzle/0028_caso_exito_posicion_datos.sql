-- Conserva lo que hoy se ve en la portada: los 3 primeros casos publicados (por orden y antigüedad)
-- toman los lugares 1, 2 y 3; el resto queda guardado, fuera de la portada.
UPDATE public.caso_exito AS c
SET posicion = r.lugar
FROM (
  SELECT id, row_number() OVER (ORDER BY orden, created_at) AS lugar
  FROM public.caso_exito
  WHERE publicado
) AS r
WHERE c.id = r.id AND r.lugar <= 3;
