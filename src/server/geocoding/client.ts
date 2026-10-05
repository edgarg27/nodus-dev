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

export async function geocodificar(q: string): Promise<ResultadoGeocode | null> {
  requireEnv(["MAPTILER_API_KEY"]);

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
