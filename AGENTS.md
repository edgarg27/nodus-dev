# Nodus — instrucciones para agentes

Marketplace inmobiliario de dos lados (SLP, Aguascalientes, León) conectando pymes con espacios
industriales, de oficina y comerciales. Toda propiedad la aprueba un admin antes de ser pública.

## Comandos

| Tarea | Comando |
|---|---|
| Instalar | `pnpm install` |
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Tests | `pnpm test` · `pnpm test:e2e` |
| Migraciones | `pnpm db:generate` · `pnpm db:migrate` |
| Promover a admin | `pnpm db:make-admin <email>` |

No hay Docker ni Supabase CLI: la base es el proyecto Supabase alojado `nodus-dev`.

**Gate:** `pnpm typecheck && pnpm lint && pnpm test` debe pasar antes de marcar cualquier tarea
como terminada.

## No negociable

1. Nunca hacer bypass del chequeo de duplicados de propiedades.
2. Nunca usar el editor SQL del dashboard de Supabase para tocar el esquema — solo Drizzle Kit
   (`pnpm db:generate` / `pnpm db:migrate`).
3. Nunca commitear secretos, `.env`, o salida de build generada.
4. Nunca editar a mano una migración ya aplicada — generar una nueva.
5. Nunca marcar una tarea como terminada con el comando de gate fallando.
6. La autorización de escritura sobre `propiedad` siempre se revisa en el servidor.
7. Nunca permitir que `rol = 'admin'` salga del registro ni de la metadata de Auth; nunca correr un
   truncado o un seed sin la guardia (`assertSafeToReset`); las rutas de admin devuelven 404 a los
   demás roles.
8. Toda tabla nueva de `public` lleva RLS sin políticas y `REVOKE` a `anon`/`authenticated`; los módulos
   alcanzables desde `scripts/` usan imports relativos con `.ts`, nunca `@/`.

Arquitectura completa, límites de importación y tokens de diseño: ver `CLAUDE.md` en este mismo
directorio.
