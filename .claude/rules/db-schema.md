---
description: Convenciones de esquema y migraciones de base de datos
paths:
  - "src/lib/db/**"
  - "drizzle/**"
  - "drizzle.config.ts"
  - "scripts/**"
---

- `src/lib/db/schema.ts` es la única fuente de verdad del esquema. Cambia ahí, luego
  `pnpm db:generate` genera el SQL — nunca escribas un archivo en `drizzle/` a mano salvo con
  `drizzle-kit generate --custom` para SQL que Drizzle no puede diferenciar (triggers, columnas
  generadas).
- Nunca uses el editor SQL del dashboard de Supabase para tocar el esquema: desincroniza
  `drizzle/meta/_journal.json` del estado real de la base. No existe Supabase CLI en este proyecto.
- La base es **compartida y remota** (proyecto Supabase alojado `nodus-dev`). Todo helper o script
  destructivo (truncado, seed) llama `assertSafeToReset(process.env)` (`src/lib/db/dev-guard.ts`)
  **antes** de tocar nada. `make-admin` y `setup-storage` no la llaman a propósito: se corren contra
  producción.
- **Toda tabla nueva que se trunque entre pruebas se agrega a `tests/helpers/reset-db.ts` en el
  mismo paso que la crea — nunca antes** (truncar una tabla que aún no existe rompe todas las
  pruebas de integración anteriores).
- Toda tabla de entidad nueva lleva `id uuid primary key default gen_random_uuid()` y `created_at`;
  `updated_at` (mantenido por trigger `set_updated_at()`, nunca por código de aplicación) solo en las
  tablas de entidad que cambian con el tiempo (`usuario`, `propiedad`). Las tablas de registro de
  eventos (`broker_solicitud` y `broker_revocacion` — su sello es `resuelta_en`/`revocada_en`) y
  `rate_limit_hit` (clave compuesta) son la excepción documentada. `broker_atribucion_historica` es
  una tabla de fotografía inmutable: solo `INSERT`, nunca `UPDATE` (por eso no lleva `updated_at`).
- `propiedad` usa borrado suave (`activo boolean`) y un ciclo de publicación independiente
  (`estado_publicacion`). `usuario`, `contact_request`, `broker_solicitud`, `broker_revocacion` y
  `broker_atribucion_historica` no se borran en v1 — ver Non-Goals en `blueprint.md` §1.
- **Toda tabla nueva de `public` lleva su aislamiento de la Data API en una migración `--custom` del mismo
  paso:** `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (sin políticas) y `REVOKE ALL ON TABLE … FROM anon,
  authenticated`. La llave publicable de Supabase es pública; `tests/integration/db/data-api-lockdown.test.ts`
  recorre todas las tablas y falla si alguna lo omite. La conexión de Drizzle (rol dueño) no se bloquea.
- Los scripts de `scripts/**` corren con `node --env-file-if-exists=.env` (el comando carga el `.env`, no
  el script) y todo módulo que importen — `env.ts`, `db/{client,schema,dev-guard}.ts`,
  `supabase/admin.ts`, `tests/helpers/reset-db.ts` — usa imports relativos con `.ts`, nunca `@/`.
- `usuario.rol` admite `buscador`, `oferente` y `admin`; nada del registro ni de la metadata de Auth
  puede producir `admin`.
- El índice único parcial `uq_propiedad_duplicado` sobre
  `(direccion_normalizada, lat_redondeada, lng_redondeada) WHERE activo AND estado_publicacion <>
  'rechazada'` es la última línea de defensa contra duplicados — el chequeo de aplicación en
  `src/server/properties/duplicate-check.ts` (mismo predicado) debe correr *antes* del insert para
  devolver un error legible; nunca dependas solo del índice para la experiencia de usuario.
- Migraciones aplican con `pnpm db:migrate` contra `DIRECT_URL` (pooler Supavisor en **modo
  sesión**, puerto 5432). Nunca contra `DATABASE_URL` (modo transacción, 6543): no soporta DDL de
  forma confiable ni sentencias preparadas.
