#!/bin/bash
# Actualiza Captive Center en el servidor a lo último de la rama main.
# Desde la carpeta del proyecto (/opt/captive):   bash deploy/actualizar.sh
# Orden: bajar el código, construir, aplicar migraciones y solo entonces arrancar la versión nueva.
# Si la construcción o una migración fallan, la versión anterior sigue funcionando.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Guardando la versión actual por si hay que volver atrás"
git rev-parse --short HEAD > .version-anterior || true

echo "==> Bajando lo nuevo"
git pull --ff-only origin main

echo "==> Construyendo"
docker compose build captive

echo "==> Aplicando migraciones de la base"
# La etapa "build" del Dockerfile trae drizzle-kit; ya quedó en caché del paso anterior.
docker build --target build -t captive-migrar \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$(grep ^NEXT_PUBLIC_SUPABASE_URL= .env | cut -d= -f2-)" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$(grep ^NEXT_PUBLIC_SUPABASE_ANON_KEY= .env | cut -d= -f2-)" \
  --build-arg NEXT_PUBLIC_MAPTILER_KEY="$(grep ^NEXT_PUBLIC_MAPTILER_KEY= .env | cut -d= -f2-)" \
  --build-arg NEXT_PUBLIC_SITE_URL="$(grep ^NEXT_PUBLIC_SITE_URL= .env | cut -d= -f2-)" \
  . >/dev/null
docker run --rm --env-file .env captive-migrar pnpm db:migrate

echo "==> Reiniciando"
docker compose up -d

echo "==> Limpiando imágenes viejas"
docker image prune -f >/dev/null

echo "==> Estado"
docker compose ps
echo
echo "Listo. Revisa que responda: curl -fsS https://\$(grep ^NEXT_PUBLIC_SITE_URL= .env | cut -d= -f2- | sed 's#https://##')/api/health"
echo "Para volver a la versión anterior: git checkout \$(cat .version-anterior) && docker compose up -d --build"
