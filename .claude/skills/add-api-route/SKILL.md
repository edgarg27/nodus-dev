---
name: add-api-route
description: Crea un nuevo endpoint REST bajo src/app/api/v1 siguiendo el envelope y las convenciones de validación de Nodus. Úsalo cuando el usuario pida "agrega un endpoint", "expón esto como API", o "nueva ruta API".
---

# add-api-route

## Cuándo usar

Agregar un endpoint nuevo bajo `/api/v1/**`, o modificar uno existente.

## Pasos

1. Escribe el schema Zod de entrada (body/query/params) en el mismo archivo o en
   `src/server/<feature>/schemas.ts` si se comparte.
2. Implementa la lógica de negocio en `src/server/<feature>/` — la función no debe importar nada
   de `next/server`. El handler de la ruta solo parsea, llama a la función de servicio, y mapea el
   resultado al envelope.
3. Usa el envelope estándar: `{ data, meta }` en éxito, `{ error: { code, message, details?,
   request_id } }` en error. Nunca `200` con un error adentro.
4. Autoriza dentro de la función de servicio (después de parsear, antes de escribir), nunca solo
   en el handler.
5. Agrega la ruta a la tabla de rutas en `blueprint.md` §5 si el endpoint es parte del contrato
   público — y escribe al menos una prueba de contrato en `tests/integration/`.

## Verify

```bash
pnpm typecheck
pnpm test tests/integration/<feature>/<ruta>.test.ts   # expect: exit 0 — sustituye <feature>/<ruta> por el archivo de prueba de tu ruta (ver `tests/integration/properties/api-routes.test.ts`)
```

- **Errores no controlados:** el `catch` de una ruta **nueva** usa `manejarError` de
  `src/server/http/handle-error.ts` (paso 38) para devolver el envelope `internal_error` con `request_id`.

## Do not

- No pongas lógica de negocio directamente en el `route.ts` — la copia en un futuro Server Action
  o herramienta MCP diverge de la original.
- No devuelvas `200` para un error. Rompe reintentos, cachés y cualquier cliente generado.
