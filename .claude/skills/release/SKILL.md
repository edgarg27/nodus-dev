---
name: release
description: Corre el gate completo de aceptación y despliega Nodus a producción en Vercel, con migraciones aplicadas antes de servir tráfico nuevo. Úsalo cuando el usuario pida "despliega", "haz un release", o "sube esto a producción".
---

# release

## Cuándo usar

Antes de cualquier despliegue a producción, y cada vez que el usuario pida desplegar.

## Pasos

1. Corre el gate completo: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build`.
   No continúes si algo falla.
2. Confirma que no hay variables de entorno faltantes en Vercel comparando con `.env.example`
   (§10 de `blueprint.md` es la fuente de verdad de qué variables existen).
3. Confirma que `DIRECT_URL` está definida en cada ambiente de Vercel: las migraciones las aplica el
   `buildCommand` de `vercel.json` (`pnpm db:migrate && pnpm build`) **antes** de que el nuevo deploy
   sirva tráfico — nunca en el arranque de la aplicación.
4. Despliega: **pídele a la persona que haga el `git push` a `main`** (el agente no hace `git push`:
   está denegado en `settings.json`). Ese push dispara el deploy de Vercel, cuyo `vercel.json` corre
   `pnpm db:migrate && pnpm build` — si la migración falla, el build falla y no se promueve.
5. Corre el smoke test post-deploy contra la URL real (ver §20.1 de `blueprint.md`).

## Verify

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build   # expect: exit 0 en cada uno
curl -s -o /dev/null -w '%{http_code}' "https://${VERCEL_PROD_URL}/api/health"   # expect: 200
```

## Do not

- No despliegues código sin haber aplicado las migraciones correspondientes primero.
- No definas `NODUS_ALLOW_DB_RESET`, `NODUS_DEV_PROJECT_REF` ni `NODUS_PROD_PROJECT_REF` en Vercel ni
  en ningún ambiente de producción: la guardia de la base compartida debe seguir rechazando cualquier
  truncado ahí.
- No hagas rollback de una migración en producción — expand → deploy → backfill → contract, nunca
  un DROP directo con datos reales presentes.
