// Única implementación de la normalización de direcciones para el chequeo de duplicados
// (ver .claude/rules/duplicate-validation.md). La misma calle escrita de formas distintas
// ("Av. Aguascalientes #123", "Avenida Aguascalientes No. 123") debe dar el mismo texto.
//
// Si cambian estas reglas hay que volver a calcular `direccion_normalizada` de las propiedades que
// ya existen: `pnpm db:renormalize`.

// Abreviaturas comunes en direcciones de México → palabra completa. Se comparan contra cada palabra
// ya en minúsculas, sin acentos ni puntos.
const ABREVIATURAS: Record<string, string> = {
  av: "avenida",
  ave: "avenida",
  avda: "avenida",
  blvd: "boulevard",
  blv: "boulevard",
  bulevar: "boulevard",
  calz: "calzada",
  carr: "carretera",
  carret: "carretera",
  prol: "prolongacion",
  priv: "privada",
  cda: "cerrada",
  and: "andador",
  fracc: "fraccionamiento",
  col: "colonia",
  int: "interior",
  ext: "exterior",
  edif: "edificio",
  depto: "departamento",
  dpto: "departamento",
  mz: "manzana",
  mza: "manzana",
  lt: "lote",
  lte: "lote",
  esq: "esquina",
  nte: "norte",
  ote: "oriente",
  pte: "poniente",
};

// Palabras que solo anuncian el número exterior y no distinguen una dirección de otra
// ("No. 123", "Núm 123", "Número 123"; "#" ya se quita como signo).
const MARCAS_DE_NUMERO = new Set(["no", "num", "numero", "nro"]);

export function normalizeAddress(direccion: string): string {
  return direccion
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((palabra) => palabra && !MARCAS_DE_NUMERO.has(palabra))
    .map((palabra) => ABREVIATURAS[palabra] ?? palabra)
    .join(" ");
}
