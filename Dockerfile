# syntax=docker/dockerfile:1
#
# Imagen de producción de Captive Center (Next.js, salida "standalone"). Corre en el mismo VPS que
# nodus-app, detrás de su Caddy (ver docker-compose.yml y deploy/actualizar.sh).
#
# Las variables NEXT_PUBLIC_* se "hornean" al construir, por eso entran como argumentos de
# construcción (docker-compose.yml las toma de .env). Los secretos (llave de servicio de Supabase,
# cadenas de la base, MapTiler del servidor) NO se hornean: entran solo al arrancar el contenedor.

FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# pnpm en la versión exacta de "packageManager" (package.json).
RUN corepack enable

# ---------- 1. Dependencias ----------
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- 2. Construcción ----------
# También sirve para aplicar migraciones (trae drizzle-kit): deploy/actualizar.sh la usa con
# `--target build` antes de arrancar la versión nueva.
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_MAPTILER_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPPORT_WHATSAPP
ARG NEXT_PUBLIC_CAPTIVE_WHATSAPP
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_MAPTILER_KEY=$NEXT_PUBLIC_MAPTILER_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPPORT_WHATSAPP=$NEXT_PUBLIC_SUPPORT_WHATSAPP \
    NEXT_PUBLIC_CAPTIVE_WHATSAPP=$NEXT_PUBLIC_CAPTIVE_WHATSAPP

RUN pnpm build

# ---------- 3. Imagen final ----------
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Mexico_City

RUN groupadd --system --gid 1001 nextjs \
 && useradd --system --uid 1001 --gid nextjs nextjs

COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nextjs /app/public ./public

USER nextjs
EXPOSE 3000

# /api/health no toca la base: solo confirma que la app responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
