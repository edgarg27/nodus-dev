import { env, requireEnv } from "../../lib/env.ts";

export interface ResultadoGeocode {
  lat: number;
  lng: number;
  direccionSugerida: string;
}

interface FeatureCollectionMapTiler {
  features: Array<{ center: [number, number]; place_name: string }>;
}

// Proxy server-side a MapTiler Geocoding (decisión #36 de blueprint.md §20.3). La llave es
// solo-servidor, pasada como `key=` en la query string — nunca sale en la respuesta al cliente.
export async function geocodificar(q: string): Promise<ResultadoGeocode | null> {
  requireEnv(["MAPTILER_API_KEY"]);

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${env.MAPTILER_API_KEY}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`MapTiler respondió ${respuesta.status}`);
  }

  const cuerpo = (await respuesta.json()) as FeatureCollectionMapTiler;
  const feature = cuerpo.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.center;
  return { lat, lng, direccionSugerida: feature.place_name };
}
