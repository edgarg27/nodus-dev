---
description: Convenciones de las rutas API REST (src/app/api/v1)
paths:
  - "src/app/api/**"
---

- Toda ruta parsea su entrada (body, query, params) con un schema Zod antes de tocar
  `src/server/**`. Ningún handler recibe `request.json()` crudo en la lógica de negocio.
- El envelope de respuesta es siempre `{ "data": ..., "meta": ... }` en éxito o
  `{ "error": { "code", "message", "details"?, "request_id" } }` en error — nunca `200` con un
  cuerpo de error. Ver `blueprint.md` §5.
- La autorización corre después de parsear y antes de la lógica de negocio, en la capa de
  servicio (`src/server/**`), nunca solo en el handler de la ruta.
- Todo handler que muta datos (`POST`/`PATCH`/`DELETE`) es idempotente cuando aplica o documenta
  explícitamente por qué no lo es.
- **Regla única de autorización fuera de `/api/v1/admin/**`:** un rol equivocado recibe `403` y un oferente
  que no es el dueño del recurso recibe `404` (no confirma que exista).
- Las rutas bajo `/api/v1/admin/**` exigen `rol = 'admin'` (`requireRol` dentro de la función de
  servicio) y responden **404, no 403**, a cualquier otro actor autenticado y `401` sin sesión. El
  `rol` de un actor nunca se toma de la metadata de Supabase Auth: se lee de `public.usuario`.
- Los webhooks (si se agregan en el futuro) verifican firma sobre el cuerpo crudo antes de
  parsear — no aplica en v1 porque Nodus no tiene webhooks entrantes.
