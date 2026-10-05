import { env, requireEnv } from "../../lib/env.ts";

export interface ResultadoGeocode {
  lat: number;
  lng: number;
  direccionSugerida: string;
  // Solo los estados que maneja Nodus (ESTADOS del formulario); null si la dirección cae fuera.
  estado: "SLP" | "Aguascalientes" | "Leon" | null;
  ciudad: string | null;
}

interface ContextoMapTiler {
  id: string;
  text: string;
}

// Modo autocompletado del formulario de publicar (`geocodificar(q, { limit })`): ciudad/estado
// llegan tal cual los nombra MapTiler; el formulario los mapea a sus propios valores.
export interface SugerenciaGeocode {
  lat: number;
  lng: number;
  direccionSugerida: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
}

interface FeatureCollectionMapTiler {
  features: Array<{
    center: [number, number];
    place_name: string;
    place_type?: string[];
    text?: string;
    context?: ContextoMapTiler[];
  }>;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// `id` de MapTiler viene como "<tipo>.<número>", p. ej. "region.2211" o "municipality.271886".
function contextoDeTipo(context: ContextoMapTiler[] | undefined, tipo: string) {
  return context?.find((c) => c.id.startsWith(`${tipo}.`))?.text ?? null;
}

function extraerCiudad(feature: FeatureCollectionMapTiler["features"][number]): string | null {
  if (feature.text && feature.place_type?.some((t) => t === "municipality" || t === "place")) {
    return feature.text;
  }
  const municipio = contextoDeTipo(feature.context, "municipality");
  if (municipio) return municipio.replace(/^Municipio de /i, "");
  return contextoDeTipo(feature.context, "place");
}

// León es el único mercado de Guanajuato; el resto del estado no tiene equivalente en ESTADOS.
function mapearEstado(region: string | null, ciudad: string | null): ResultadoGeocode["estado"] {
  if (!region) return null;
  const r = normalizar(region);
  if (r === "san luis potosi") return "SLP";
  if (r === "aguascalientes") return "Aguascalientes";
  if (r === "guanajuato" && ciudad && normalizar(ciudad) === "leon") return "Leon";
  return null;
}

// Proxy server-side a MapTiler Geocoding (decisión #36 de blueprint.md §20.3). La llave es
// solo-servidor, pasada como `key=` en la query string — nunca sale en la respuesta al cliente.
type FeatureMapTiler = FeatureCollectionMapTiler["features"][number];

// MapTiler no reconoce abreviaturas comunes en México ("Av.", "Nte", "Ags."): con ellas cae al
// centroide de la ciudad en vez de la calle.
const ABREVIATURAS: Array<[RegExp, string]> = [
  [/\bAv(da)?\.?(?=\s)/gi, "Avenida"],
  [/\bBlvd\.?(?=\s)/gi, "Bulevar"],
  [/\bCalz\.?(?=\s)/gi, "Calzada"],
  [/\bNte\.?(?=\s|$)/gi, "Norte"],
  [/\bOte\.?(?=\s|$)/gi, "Oriente"],
  [/\bPte\.?(?=\s|$)/gi, "Poniente"],
  [/\bAgs\.?$/gi, "Aguascalientes"],
  [/\bS\.?L\.?P\.?$/gi, "San Luis Potosí"],
  [/\bGto\.?$/gi, "Guanajuato"],
  [/\bCol\.\s*/gi, ""],
];

// Tipos que solo ubican la ciudad o el estado, no la calle.
const TIPOS_GRUESOS = new Set(["place", "municipality", "region", "country", "joint_municipality"]);

function esGruesa(feature: FeatureMapTiler): boolean {
  return feature.place_type?.every((tipo) => TIPOS_GRUESOS.has(tipo)) ?? false;
}

// Consultas a probar en orden: la dirección completa y luego versiones sin la colonia, que suele
// confundir al geocodificador ("Av. X, Colonia, CP Ciudad, Estado" → "Av. X, CP Ciudad, Estado").
function consultasCandidatas(q: string): string[] {
  const partes = q
    .split(",")
    .map((parte) =>
      ABREVIATURAS.reduce(
        (texto, [patron, reemplazo]) => texto.replace(patron, reemplazo),
        parte,
      ).trim(),
    )
    .filter(Boolean);
  const [calle] = partes;
  if (!calle) return [q];
  const candidatas = [
    partes.join(", "),
    [calle, ...partes.slice(1).slice(-2)].join(", "),
    [calle, ...partes.slice(1).slice(-1)].join(", "),
  ];
  return [...new Set(candidatas)];
}

async function consultarMapTiler(q: string): Promise<FeatureMapTiler | undefined> {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${env.MAPTILER_API_KEY}&country=mx&language=es`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`MapTiler respondió ${respuesta.status}`);
  }
  const cuerpo = (await respuesta.json()) as FeatureCollectionMapTiler;
  return cuerpo.features?.[0];
}

async function sugerirDirecciones(q: string, limit: number): Promise<SugerenciaGeocode[]> {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${env.MAPTILER_API_KEY}&country=mx&language=es&autocomplete=true&limit=${limit}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`MapTiler respondió ${respuesta.status}`);
  }
  const cuerpo = (await respuesta.json()) as FeatureCollectionMapTiler;
  return (cuerpo.features ?? []).slice(0, limit).map((feature) => {
    const [lng, lat] = feature.center;
    return {
      lat,
      lng,
      direccionSugerida: feature.place_name,
      ciudad: contextoDeTipo(feature.context, "place") ?? undefined,
      estado: contextoDeTipo(feature.context, "region") ?? undefined,
      codigoPostal: contextoDeTipo(feature.context, "postal_code") ?? undefined,
    };
  });
}

// Sin `opciones.limit`: devuelve el mejor resultado (o `null`) con estado y ciudad mapeados.
// Con `opciones.limit`: modo autocompletado, devuelve hasta `limit` sugerencias.
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
  if (opciones?.limit !== undefined) return sugerirDirecciones(q, opciones.limit);

  // Se queda con el primer resultado a nivel calle; si ninguna consulta lo da, con el primero
  // que haya encontrado algo (aunque sea solo la ciudad).
  let feature: FeatureMapTiler | undefined;
  for (const consulta of consultasCandidatas(q)) {
    const candidato = await consultarMapTiler(consulta);
    if (!candidato) continue;
    feature ??= candidato;
    if (!esGruesa(candidato)) {
      feature = candidato;
      break;
    }
  }
  if (!feature) return null;

  const [lng, lat] = feature.center;
  const ciudad = extraerCiudad(feature);
  const region = feature.place_type?.includes("region")
    ? (feature.text ?? null)
    : contextoDeTipo(feature.context, "region");
  return {
    lat,
    lng,
    direccionSugerida: feature.place_name,
    estado: mapearEstado(region, ciudad),
    ciudad,
  };
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
