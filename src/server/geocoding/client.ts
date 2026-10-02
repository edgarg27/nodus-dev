import { env, requireEnv } from "../../lib/env.ts";

export interface ResultadoGeocode {
  lat: number;
  lng: number;
  direccionSugerida: string;
}

export interface SugerenciaGeocode extends ResultadoGeocode {
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
}

interface ContextoMapTiler {
  id: string;
  text: string;
}

interface FeatureMapTiler {
  center: [number, number];
  place_name: string;
  context?: ContextoMapTiler[];
}

interface FeatureCollectionMapTiler {
  features: FeatureMapTiler[];
}

// `context` es un arreglo de features padre, cada uno con `id` tipo "<categoria>.<identificador>"
// (ver `.claude/rules/map-integration.md`). Las categorías de interés: "region" (estado),
// "place" (ciudad) y "postal_code" (código postal).
function extraerContexto(context: ContextoMapTiler[] | undefined) {
  const porCategoria = new Map<string, string>();
  for (const entrada of context ?? []) {
    const categoria = entrada.id.split(".")[0];
    if (categoria && !porCategoria.has(categoria)) porCategoria.set(categoria, entrada.text);
  }
  return {
    ciudad: porCategoria.get("place"),
    estado: porCategoria.get("region"),
    codigoPostal: porCategoria.get("postal_code"),
  };
}

// Proxy server-side a MapTiler Geocoding (decisión #36 de blueprint.md §20.3). La llave es
// solo-servidor, pasada como `key=` en la query string — nunca sale en la respuesta al cliente.
//
// Sin `opciones.limit`: comportamiento histórico, devuelve el primer resultado o `null`.
// Con `opciones.limit`: modo autocompletado, devuelve hasta `limit` sugerencias con
// ciudad/estado/codigoPostal cuando MapTiler los incluye en `context`.
export async function geocodificar(q: string): Promise<ResultadoGeocode | null>;
export async function geocodificar(
  q: string,
  opciones: { limit: number },
): Promise<SugerenciaGeocode[]>;
export async function geocodificar(
  q: string,
  opciones?: { limit?: number },
): Promise<ResultadoGeocode | SugerenciaGeocode[] | null> {
  requireEnv(["MAPTILER_API_KEY"]);

  const sufijoSugerencias =
    opciones?.limit !== undefined ? `&autocomplete=true&limit=${opciones.limit}` : "";
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${env.MAPTILER_API_KEY}${sufijoSugerencias}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`MapTiler respondió ${respuesta.status}`);
  }

  const cuerpo = (await respuesta.json()) as FeatureCollectionMapTiler;

  if (opciones?.limit !== undefined) {
    return (cuerpo.features ?? []).slice(0, opciones.limit).map((feature) => {
      const [lng, lat] = feature.center;
      return {
        lat,
        lng,
        direccionSugerida: feature.place_name,
        ...extraerContexto(feature.context),
      };
    });
  }

  const feature = cuerpo.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.center;
  return { lat, lng, direccionSugerida: feature.place_name };
}
