---
description: Aprobación de propiedades y ciclo de broker (solicitud, aprobación, revocación) — superficie de administración
paths:
  - "src/server/broker-requests/**"
  - "src/server/properties/review.ts"
  - "src/app/api/v1/admin/**"
  - "src/app/(app)/admin/**"
---

- Toda superficie de administración exige `rol = 'admin'`: proxy + layout + `requireRol()` dentro de
  cada función de servicio. A cualquier otro rol autenticado se le responde **404, no 403**; sin
  sesión, `401` en la API o redirect a `/sign-in` en páginas.
- Resolver (aprobar/denegar una solicitud, aprobar/rechazar una propiedad) es un
  `UPDATE … WHERE estado = 'pendiente' RETURNING`: con 0 filas, distingue `not_found` de
  `conflict_already_resolved`/`conflict_already_reviewed` (409) y **no cambia nada**. Nunca un
  `SELECT` seguido de un `UPDATE` sin esa condición.
- `aprobarSolicitud` corre en **una sola transacción**: la solicitud + `is_broker = true` + el
  `broker_code`. El código (`BRK-` + 6 caracteres) lo genera `generarBrokerCode()` en el servidor con
  `crypto.randomInt`; se reintenta dentro de un savepoint si choca con el `unique`. Nunca llega del
  cliente.
- Un admin no aprueba su propia solicitud (`forbidden`), no edita propiedades y no publica ni recibe
  leads (`POST /api/v1/properties` y `POST /api/v1/contact-requests` → 403).
- Rechazar una propiedad y revocar a un broker exigen un `motivo` no vacío (recortado, ≤500);
  denegar una solicitud lo deja opcional.
- Revocar (`revocarBroker`) apaga `is_broker`, deja `broker_code = NULL` y escribe la fila de
  `broker_revocacion` **y** una fotografía inmutable en `broker_atribucion_historica` (el conjunto de
  `contact_request` atribuidos al broker en ese momento y su conteo) en la misma transacción. No toca
  `contact_request`: los leads existentes conservan su `broker_id`; los nuevos no se atribuyen (el
  contacto exige `is_broker = true`). `broker_atribucion_historica` solo recibe `INSERT`, nunca
  `UPDATE` ni `DELETE`.
- Nunca se envían correos desde estas rutas (v1 no tiene proveedor de correo transaccional): el
  usuario ve el estado en su panel.
