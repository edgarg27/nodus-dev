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

export interface CiudadSugerida {
  ciudad: string;
  estado: string;
}

// Estados donde opera Nodus (León pertenece a Guanajuato en MapTiler); el resto de México no
// tiene propiedades y solo produciría búsquedas vacías.
const REGIONES_OPERATIVAS = new Set(["San Luis Potosí", "Aguascalientes", "Guanajuato"]);
const MAX_CIUDADES = 6;

// Sugerencias de ciudad para el buscador público. MapTiler devuelve el estado en
// `context[].id = "region.<id>"`; `place` y `municipality` suelen repetir la misma ciudad, así
// que se deduplica por ciudad + estado.
export async function buscarCiudades(q: string): Promise<CiudadSugerida[]> {
  requireEnv(["MAPTILER_API_KEY"]);

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${env.MAPTILER_API_KEY}&country=mx&language=es&autocomplete=true&limit=10&types=municipality,joint_municipality,locality,place`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`MapTiler respondió ${respuesta.status}`);
  }

  const cuerpo = (await respuesta.json()) as FeatureCollectionMapTiler;
  const vistas = new Set<string>();
  const ciudades: CiudadSugerida[] = [];
  for (const feature of cuerpo.features ?? []) {
    const ciudad = feature.place_name.split(",")[0]?.trim();
    const estado = feature.context?.find((entrada) => entrada.id.startsWith("region."))?.text;
    if (!ciudad || !estado || !REGIONES_OPERATIVAS.has(estado)) continue;
    const clave = `${ciudad}|${estado}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    ciudades.push({ ciudad, estado });
  }
  return ciudades.slice(0, MAX_CIUDADES);
}
