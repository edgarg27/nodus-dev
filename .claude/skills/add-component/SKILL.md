---
name: add-component
description: Agrega un componente de UI nuevo siguiendo los tokens de diseño navy/coral y las convenciones de shadcn de Nodus. Úsalo cuando el usuario pida "nuevo componente", "agrega una pantalla", o "necesito un formulario/tarjeta/modal nuevo".
---

# add-component

## Cuándo usar

Cualquier componente de UI nuevo: página, tarjeta, formulario, modal.

## Pasos

1. Si el componente es un primitivo genérico (botón, input, diálogo) revisa primero si ya existe
   en `src/components/ui/` (generado por shadcn) — instala uno nuevo con
   `pnpm dlx shadcn@4.21.0 add <nombre-del-componente>` (sustituye el marcador `<nombre-del-componente>`) en vez de escribirlo desde cero.
2. Usa solo tokens semánticos definidos en `src/app/globals.css` (`@theme`) — nunca un hex o un px
   crudo. Ver la tabla de diseño en `CLAUDE.md`.
3. Server Component por defecto. Agrega `"use client"` solo si el componente necesita estado,
   efectos, o manejadores de evento — y ponlo en la hoja más pequeña posible, nunca en un layout.
4. Todo componente que liste datos necesita su estado vacío (con la acción principal visible) y su
   error (lo cubre el boundary del segmento, `error.tsx`). El estado de **cargando** (skeleton, no
   spinner) solo aplica a componentes cliente que hacen `fetch`; las pantallas de servidor de v1 no lo
   tienen (`blueprint.md` §6).
5. Verifica en 375px y 1440px que no haya scroll horizontal antes de dar el componente por
   terminado.

## Verify

```bash
pnpm lint    # expect: exit 0 — incluye la regla de "sin hex crudo" vía el grep del `Verify` del paso 2 (blueprint §9; no hay CI)
pnpm typecheck
```

## Do not

- No mezcles un segundo mecanismo de estilos (CSS-in-JS, CSS Modules) — Tailwind utility-first es
  el único mecanismo en este proyecto.
- No importes `server/` ni `lib/db` desde un componente.
