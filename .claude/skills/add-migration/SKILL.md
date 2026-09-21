---
name: add-migration
description: Agrega o modifica una tabla/columna en el esquema de Nodus y genera la migración de Drizzle correspondiente. Úsalo cuando el usuario pida "agrega un campo a propiedad", "nueva tabla", "cambia el esquema", o cualquier variante de modificar la base de datos.
---

# add-migration

## Cuándo usar

Cualquier cambio al esquema de base de datos: nueva tabla, nueva columna, nuevo índice, nueva
restricción.

## Pasos

1. Edita `src/lib/db/schema.ts` — nunca escribas SQL de migración a mano para un cambio que Drizzle
   puede diferenciar (columna, tabla, índice —incluido el único parcial con `.where(sql`…`)`, como
   `uq_propiedad_duplicado`—, columna generada, FK).
2. Corre `pnpm db:generate`. Drizzle escribe el archivo SQL en `drizzle/` con un nombre que él
   mismo elige — no lo renombres ni lo edites después de generado.
3. Si el cambio necesita algo que Drizzle no puede expresar como diff de esquema (un trigger, el
   aislamiento RLS/`REVOKE` de la Data API, una expresión no soportada), usa
   `pnpm exec drizzle-kit generate --custom` y escribe el SQL a mano dentro del archivo vacío que
   genera — nunca edites un archivo ya aplicado.
4. Aplica con `pnpm db:migrate` contra el proyecto Supabase dev (`nodus-dev`) — usa `DIRECT_URL`,
   la cadena del pooler en modo sesión. No hay servicios locales que levantar.
5. **Aislamiento de la Data API (obligatorio para cada tabla nueva de `public`):** genera una segunda
   migración vacía con `pnpm exec drizzle-kit generate --custom --name <tabla>_lockdown` y escribe
   `ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY;` y `REVOKE ALL ON TABLE public.<tabla> FROM
   anon, authenticated;` — la llave publicable de Supabase es pública y sin esto un usuario podría
   leer o escribir la tabla por PostgREST. `pnpm test tests/integration/db/data-api-lockdown.test.ts`
   debe seguir pasando (recorre todas las tablas).
6. Si la tabla nueva se trunca entre pruebas, agrégala a `tests/helpers/reset-db.ts` **en este
   mismo paso** (nunca antes de que exista) y a `scripts/seed.ts` si necesita datos de ejemplo
   (el seed corre bajo la guardia de la base compartida).

## Verify

```bash
pnpm db:migrate   # expect: exit 0, migración nueva aplicada
pnpm typecheck     # expect: exit 0 — el tipo inferido del schema se propaga sin cambios manuales
pnpm test tests/integration/db/data-api-lockdown.test.ts   # expect: exit 0 — RLS y privilegios en todas las tablas
```

## Do not

- No uses el editor SQL del dashboard de Supabase — desincroniza `drizzle/meta/_journal.json` del
  estado real. No existe Supabase CLI en este proyecto.
- No edites un archivo de migración que ya corrió en cualquier ambiente compartido — genera uno
  nuevo que corrija.
