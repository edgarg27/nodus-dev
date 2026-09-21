# Nodus

Marketplace inmobiliario de dos lados (SLP, Aguascalientes, León) que conecta pymes/startups
buscando nave industrial, oficina o local comercial con oferentes (staff Nodus o brokers
afiliados) que publican esos espacios. Toda propiedad la aprueba un admin antes de ser pública.

## Comandos

| Tarea | Comando |
|---|---|
| Instalar | `pnpm install` |
| Dev server | `pnpm dev` — http://localhost:3000 |
| Build | `pnpm build` |
| Typecheck | `pnpm typecheck` |
| Lint / format | `pnpm lint` · `pnpm lint:fix` |
| Tests unitarios/integración | `pnpm test` · un archivo: `pnpm test <ruta>` |
| Tests en modo watch | `pnpm test:watch` |
| E2E | `pnpm test:e2e` |
| Generar migración | `pnpm db:generate` |
| Aplicar migraciones | `pnpm db:migrate` |
| Explorar DB | `pnpm db:studio` |
| Sembrar datos (solo proyecto dev, con guardia) | `pnpm db:seed` |
| Promover a admin (existe desde el paso 6) | `pnpm db:make-admin <email>` — el usuario debe estar registrado |
| Crear/actualizar el bucket de fotos (desde el paso 11) | `pnpm storage:setup` |

**No hay Docker ni Supabase CLI.** La base, Auth y Storage son proyectos Supabase alojados:
`nodus-dev` (desarrollo, pruebas, previews) y `nodus-prod`.

**Gate:** `pnpm typecheck && pnpm lint && pnpm test` debe pasar antes de marcar cualquier tarea como
terminada.

Node pinned in `.nvmrc` (24.21.0). Versiones de dependencias viven en `pnpm-lock.yaml` — léelo,
nunca adivines una versión.

## Stack

Next.js 16 (App Router) · TypeScript 5.9.3 · Tailwind CSS 4 · shadcn (CLI 4.21, base Radix — sin
concepto de "estilo new-york"; los tokens de `globals.css` gobiernan la apariencia) ·
Drizzle ORM + drizzle-kit · Supabase alojado (Postgres + Auth + Storage) · MapLibre GL JS + MapTiler
Geocoding · Zod · React Hook Form · TanStack Query · Biome · Vitest · Playwright · Vercel.

## Arquitectura

**Camino de una request de búsqueda.** Navegador → `src/app/(app)/buscar/page.tsx` (Server
Component, lee filtros de la query string) → `src/server/properties/queries.ts` (consulta
tipada con Drizzle, siempre filtrando `activo = true AND estado_publicacion = 'publicada'`) →
`src/lib/db/client.ts` → Postgres. El mapa (`src/components/map/property-map.tsx`) es un Client
Component que recibe las propiedades ya resueltas como props — nunca vuelve a golpear la base de
datos.

**Camino de una mutación.** Formulario (`src/components/properties/property-form.tsx`, Client
Component con React Hook Form) → `fetch` mismo-origen a `src/app/api/v1/properties/route.ts` →
valida con Zod → `src/server/properties/mutations.ts` (incluye el chequeo de duplicados) →
Drizzle → Postgres. El API REST (`src/app/api/v1/**`) es el único camino de escritura — tanto la
UI propia como un cliente externo futuro lo usan de la misma forma, así que la autorización y la
validación solo existen una vez.

**Roles.** `buscador` y `oferente` se eligen una vez en el registro; `admin` **solo** lo crea
`pnpm db:make-admin <email>` (nunca el registro ni la metadata de Auth). Las rutas de
administración (`/admin/**`, `/api/v1/admin/**`) exigen `admin` en tres capas (proxy, layout,
`requireRol()`) y devuelven **404, no 403**, a cualquier otro rol.

**Límites.** Cruzar esta tabla al revés rompe el build:

| Capa | Puede importar de | Nunca debe |
|---|---|---|
| `src/app/**` (rutas) | `components`, `server`, `lib` | Importar `lib/db` directamente |
| `src/components/**` | `lib`, otros componentes | Importar `server/` o `lib/db` |
| `src/server/**` | `lib/db`, `lib` | Importar React o algo de `components/` |
| `src/lib/db/**` | nada interno | Importar `server/` |

**Dónde vive cada cosa.**

| Concern | Fuente única de verdad |
|---|---|
| Esquema de base de datos | `src/lib/db/schema.ts` — cambia aquí, luego `pnpm db:generate && pnpm db:migrate` |
| Acceso a variables de entorno | `src/lib/env.ts` — objeto tipado a mano (sin Zod, acceso literal a `process.env`); cada consumidor llama `requireEnv([...])` con solo las claves que necesita; nunca leer `process.env` en otro lugar, salvo metadata de build inyectada por la plataforma (ej. `VERCEL_GIT_COMMIT_SHA` en `src/app/api/health/route.ts`, paso 39) y las 3 variables `NODUS_*` de herramientas de desarrollo (solo `src/lib/db/dev-guard.ts`, por parámetro) — no son configuración de la app |
| Guardia de la base compartida | `src/lib/db/dev-guard.ts` — `assertSafeToReset(env)`; `resetTestDatabase()` y `scripts/seed.ts` la llaman antes de tocar nada |
| Tokens de diseño | `src/app/globals.css` (`@theme`) — sin hex ni px crudos en componentes |
| Sesión / actor actual | `src/server/auth/session.ts` — una sola `getUsuarioActual()`, usada en todos lados |
| Aprobación de propiedades | `src/server/properties/review.ts` — el admin aprueba o rechaza con motivo; nunca edita |
| Aprobación/revocación de brokers | `src/server/broker-requests/{resolve,revoke}.ts` — transacciones; el `broker_code` lo genera el servidor |
| Normalización de dirección (dedupe) | `src/lib/normalize-address.ts` — única implementación, usada al crear/editar y en las pruebas |

## Reglas de código

1. **Un componente por archivo. Máx 300 líneas.** Más largo significa que debe dividirse.
2. **Alias de ruta `@/` → `src/`.** Nada de `../../..` — salvo en los módulos alcanzables desde
   `scripts/` (regla 12): ahí solo rutas relativas con `.ts`.
3. **Server-first.** Los componentes son Server Components por defecto. `"use client"` solo en la
   hoja que realmente necesita estado/eventos, nunca en un layout.
4. **Sin archivos barril.** Importa del módulo fuente; `index.ts` de re-exportación rompe
   tree-shaking.
5. **Valida en el borde.** Toda ruta en `src/app/api/**` parsea su entrada con un schema Zod antes
   de tocar lógica de negocio.
6. **Errores como resultados tipados**, nunca strings lanzados: `{ ok: true, data } | { ok: false, error }`.
7. **`Drizzle Kit es dueño único del esquema.`** Nunca usar el editor SQL del dashboard de Supabase
   para alterar tablas — eso desincroniza `drizzle/meta/_journal.json` del estado real. No existe
   Supabase CLI en este proyecto; el esquema lo aplica exclusivamente `pnpm db:migrate`.
8. **`TypeScript se queda fijo en `5.9.3`.** No actualizar a la línea `7.x` ("latest" en npm) —
   typescript-eslint y el resto del tooling con conciencia de tipos aún no la soportan.
9. **Toda propiedad nueva pasa por el chequeo de duplicados** (`src/server/properties/duplicate-check.ts`)
   antes del insert. Nunca se hace bypass de esta función desde una ruta nueva.
10. **Nunca una consulta pública sin `estado_publicacion = 'publicada'`.** Editar contenido o
    fotos de una propiedad publicada la devuelve a `pendiente`.
11. **Las pruebas nunca envían correos**: fixtures con `auth.admin.createUser({ email_confirm })`,
    `generarEnlaceConfirmacion()` y `crearAdminDePrueba()` (`tests/helpers/auth-users.ts`, detrás de
    `assertSafeToReset`) y `limpiarUsuariosAuth()` en `afterAll`.
12. **Los módulos alcanzables desde `scripts/` usan imports relativos con `.ts`, nunca `@/`** (Node
    desnudo no resuelve el alias): `env.ts`, `db/{client,schema,dev-guard}.ts`,
    `supabase/admin.ts`, `tests/helpers/reset-db.ts` y lo que importen.
13. **Scripts (Node desnudo, ESM: `package.json` declara `"type": "module"`):** `import type` obligatorio para
    los tipos (Node solo borra tipos; `verbatimModuleSyntax` lo impone con TS1484), solo sintaxis borrable (sin
    `enum`, `namespace` ni propiedades de parámetro: `erasableSyntaxOnly`) y sin `__dirname`/`require`.
    **Los scripts cargan `.env` en el comando** (`node --env-file-if-exists=.env scripts/x.ts`, ya en
    los scripts de `package.json`), nunca con un `loadEnvFile` dentro del script.
14. **Autorización en la API:** fuera de `/api/v1/admin/**`, rol equivocado → `403` y oferente no dueño → `404`;
    dentro de `/api/v1/admin/**`, todo no-admin → `404`. **En las páginas** (`/propiedades`, `/leads`, `/broker`,
    `/admin/**`) un rol equivocado recibe `404` (`notFound()`), nunca `403`.

## Diseño

| Rol | Valor | Uso |
|---|---|---|
| `--color-primary` (navy) | `#0B1E3D` | Encabezados, texto sobre superficies claras, nav |
| `--color-accent` (coral) | `#FF8A5B` | Únicamente CTA primario, estados activos |
| `--color-background` | `#F7F7F5` (claro) / `#0B1E3D` (oscuro) | Fondo de página |
| `--color-surface` | `#FFFFFF` (claro) / `#132A4E` (oscuro) | Tarjetas, paneles |
| `--color-border` | `#E2E1DC` (claro) / `#24406E` (oscuro) | Divisores, inputs |
| `--color-text` | `#0B1E3D` (claro) / `#FFFFFF` (oscuro) | Texto de cuerpo |
| `--color-text-muted` | `#5B6B85` (claro) / `#9FB0CC` (oscuro) | Texto secundario |
| `--color-destructive` | `#B3261E` (claro) / `#F2938C` (oscuro) | Errores |
| `--color-success` | `#146C43` (claro) / `#7CD992` (oscuro) | Confirmaciones |

- **Tipografía:** Manrope (variable) para títulos y cuerpo — pesos 400/500/600/700. Sin segunda
  familia display.
- **Escala:** 12 / 14 / 16 / 20 / 24 / 32 / 48 px.
- **Espaciado:** base 4px — 4, 8, 12, 16, 24, 32, 48, 64. Sin valores arbitrarios.
- **Radio:** `rounded-lg` (12px) en tarjetas y botones; full en avatares.
- **Elevación:** `shadow-sm` en tarjetas; sin sombras duras.
- **Motion:** 150–200ms, `ease-out`. Solo transform/opacity. Respeta `prefers-reduced-motion`.
- **Layout:** ancho máximo de contenido 1280px; mobile-first; breakpoints estándar de Tailwind
  (sm 640 / md 768 / lg 1024 / xl 1280).

## Entorno

Todos los valores salen del dashboard del proyecto Supabase (`blueprint.md` §10); `.env` nunca se commitea.

| Variable | Requerida | Usada por | Fuente |
|---|---|---|---|
| `DATABASE_URL` | sí | `src/lib/db/client.ts` | Connect → Transaction pooler (puerto `6543`, `prepare:false`) |
| `DIRECT_URL` | sí | `drizzle.config.ts`, `scripts/make-admin.ts` | Connect → Session pooler (puerto `5432`; nombre histórico, no es la conexión directa IPv6) |
| `NEXT_PUBLIC_SUPABASE_URL` | sí | `src/lib/supabase/*.ts` | Settings → API (pública) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sí | `src/lib/supabase/*.ts` | Settings → API Keys → publishable key (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | sí | `src/server/supabase/admin.ts`, `tests/helpers/auth-users.ts` | Settings → API Keys → secret key — solo servidor |
| `NEXT_PUBLIC_MAPTILER_KEY` | sí | `src/components/map/*.tsx` | MapTiler account → Keys (https://cloud.maptiler.com/account/keys/) |
| `MAPTILER_API_KEY` | sí | `src/app/api/v1/geocode/route.ts` | MapTiler account → Keys (puede ser el mismo valor) |
| `NODUS_ALLOW_DB_RESET`, `NODUS_DEV_PROJECT_REF`, `NODUS_PROD_PROJECT_REF` | solo dev | `src/lib/db/dev-guard.ts` | `.env` de desarrollo a mano — **nunca en Vercel ni producción** |

`.env.example` está commiteado y se mantiene sincronizado.

## Reglas diferidas

| Archivo | Aplica a |
|---|---|
| `.claude/rules/db-schema.md` | `src/lib/db/**`, `drizzle/**`, `scripts/**` |
| `.claude/rules/duplicate-validation.md` | `src/server/properties/**` |
| `.claude/rules/map-integration.md` | `src/components/map/**`, `src/server/geocoding/**` |
| `.claude/rules/api-routes.md` | `src/app/api/**` |
| `.claude/rules/broker-approval.md` | `src/server/broker-requests/**`, `src/app/api/v1/admin/**`, `src/app/(app)/admin/**` |

## No negociable

1. Nunca hacer bypass del chequeo de duplicados de propiedades — es el requisito más importante
   del producto.
2. Nunca usar el editor SQL del dashboard de Supabase para tocar el esquema — solo Drizzle.
3. Nunca commitear secretos, `.env`, o salida de build generada.
4. Nunca editar a mano una migración ya aplicada — generar una nueva.
5. Nunca marcar una tarea como terminada con el comando de gate fallando.
6. La autorización de escritura sobre `propiedad` siempre se revisa en el servidor
   (`oferente_id === actor.id`), nunca solo se oculta el botón en la UI.
7. Nunca permitir que `rol = 'admin'` salga del registro ni de la metadata de Supabase Auth — solo
   `pnpm db:make-admin` crea admins. Nunca correr un truncado o un seed sin `assertSafeToReset`, ni
   definir las variables `NODUS_*` en producción.
8. Toda tabla nueva de `public` nace con RLS activado **sin políticas** y `REVOKE` a `anon` y
   `authenticated` (migración `--custom` del mismo paso): la llave publicable es pública.
