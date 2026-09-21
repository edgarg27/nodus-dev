---
description: Integración con MapLibre GL JS y MapTiler Geocoding
paths:
  - "src/components/map/**"
  - "src/server/geocoding/**"
  - "src/app/api/v1/geocode/**"
---

- El mapa (`maplibre-gl`) es siempre un Client Component. Nunca lo importes desde un Server
  Component directamente — pásale las propiedades ya resueltas como props.
- La geocodificación (MapTiler Geocoding) es solo un **punto de partida**. El oferente puede
  arrastrar el pin manualmente al crear o editar una propiedad, y la posición final arrastrada es
  la que se guarda en `lat`/`lng` — nunca se sobrescribe con un nuevo geocode automático después de
  que el usuario ajustó el pin a mano.
- Las llamadas a MapTiler Geocoding pasan por el proxy `src/app/api/v1/geocode/route.ts`
  (usa `MAPTILER_API_KEY`, server-only, query param `key=`) — nunca se llama a la API de
  geocodificación directamente desde el navegador con la llave pública.
- La respuesta de MapTiler es un `FeatureCollection` GeoJSON: coordenadas en `features[0].center`
  o `features[0].geometry.coordinates` (ambos `[lon, lat]`), dirección en `features[0].place_name`,
  y `features[0].context` es un **arreglo** de features padre — no el shape de Mapbox v6
  (`properties.full_address`, `properties.context.<key>`) que este proyecto usaba antes.
- El mapa del buscador y la lista de resultados comparten estado: al hacer clic en un pin se
  resalta la tarjeta correspondiente en la lista, y viceversa — implementado con un `id`
  seleccionado en estado compartido del componente contenedor, no con dos fuentes de verdad.
- Nunca commitear una llave de MapTiler real en el código. `NEXT_PUBLIC_MAPTILER_KEY` y
  `MAPTILER_API_KEY` vienen de variables de entorno, y la llave pública debe estar restringida por
  dominio en el dashboard de MapTiler.
