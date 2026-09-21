---
description: Regla de validación de duplicados de propiedades — el requisito más importante del producto
paths:
  - "src/server/properties/**"
  - "src/app/api/v1/properties/**"
---

- **Nunca insertes una `propiedad` sin llamar antes a
  `buscarDuplicadoActivo(direccionNormalizada, lat, lng)`** de
  `src/server/properties/duplicate-check.ts`. Si devuelve una coincidencia, la ruta API responde
  409 `conflict_duplicate_property` con el `id` y los datos de la propiedad existente — nunca se
  inserta la nueva fila.
- La normalización vive en un único lugar: `src/lib/normalize-address.ts`. No dupliques la lógica
  de `toLowerCase().trim().normalize(...)` en ningún otro archivo.
- El chequeo compara `direccion_normalizada` (string exacto) **y** `lat`/`lng` redondeados a 5
  decimales — ambas condiciones, no una sola. Ver `blueprint.md` §4 para la definición exacta.
- El chequeo solo considera propiedades **vigentes**: `activo = true` **y** `estado_publicacion <>
  'rechazada'` — exactamente el predicado del índice único parcial. Una propiedad dada de baja
  (`activo = false`) o `rechazada` nunca bloquea una nueva inserción (ni el reenvío corregido de la
  propia rechazada, que se excluye a sí misma con `excluirId`) en la misma dirección/coordenadas;
  una `pendiente` o `publicada` sí bloquea.
- La edición que cambia dirección o coordenadas, y el reenvío de una `rechazada`, corren el mismo
  chequeo; un `23505` del índice se traduce al mismo `409`, nunca un `500`.
- El índice único parcial en la base de datos es un respaldo, no el mecanismo principal — la
  aplicación debe rechazar el duplicado con un mensaje útil antes de que la base de datos lo haga.
