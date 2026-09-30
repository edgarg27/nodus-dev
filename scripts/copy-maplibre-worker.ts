import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// maplibre-gl-worker.mjs importa `./maplibre-gl-shared.mjs` con una ruta relativa que asume que
// ambos archivos viven en la misma carpeta. Al referenciar el worker con
// `new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url)` (property-map.tsx),
// Turbopack lo copia como asset opaco sin arrastrar ese import relativo, así que el worker
// termina pidiendo `maplibre-gl-shared.mjs` en un directorio donde no existe (404 → "non-JavaScript
// MIME type of text/html"): el mapa se queda sin estilo ni tiles para siempre, sin lanzar ningún
// error visible. Copiar ambos archivos juntos a `public/vendor/maplibre-gl/` y servir el worker
// desde ahí (ruta estática, sin pasar por el bundler) evita el problema de raíz.
const require = createRequire(import.meta.url);
const workerEntry = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
const origen = dirname(workerEntry);
const destino = join(process.cwd(), "public", "vendor", "maplibre-gl");

mkdirSync(destino, { recursive: true });
for (const archivo of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(origen, archivo), join(destino, archivo));
}

if (!existsSync(join(destino, "maplibre-gl-worker.mjs"))) {
  throw new Error("no se pudo copiar maplibre-gl-worker.mjs a public/vendor/maplibre-gl/");
}

console.log(
  "maplibre-gl-worker.mjs y maplibre-gl-shared.mjs copiados a public/vendor/maplibre-gl/",
);
