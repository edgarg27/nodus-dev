// Los 32 estados de México: fuente única para la base (check), la API, los formularios, los
// filtros, el geocoding y las páginas por lugar. El `codigo` es lo que se guarda en
// `propiedad.estado`: ASCII y estable (SLP y Aguascalientes conservan su código histórico).
// `nombre` es el que se muestra y `slug` el de las URLs.

export const ESTADOS_MX = [
  { codigo: "Aguascalientes", nombre: "Aguascalientes", slug: "aguascalientes" },
  { codigo: "Baja California", nombre: "Baja California", slug: "baja-california" },
  { codigo: "Baja California Sur", nombre: "Baja California Sur", slug: "baja-california-sur" },
  { codigo: "Campeche", nombre: "Campeche", slug: "campeche" },
  { codigo: "Chiapas", nombre: "Chiapas", slug: "chiapas" },
  { codigo: "Chihuahua", nombre: "Chihuahua", slug: "chihuahua" },
  { codigo: "Ciudad de Mexico", nombre: "Ciudad de México", slug: "ciudad-de-mexico" },
  { codigo: "Coahuila", nombre: "Coahuila", slug: "coahuila" },
  { codigo: "Colima", nombre: "Colima", slug: "colima" },
  { codigo: "Durango", nombre: "Durango", slug: "durango" },
  { codigo: "Estado de Mexico", nombre: "Estado de México", slug: "estado-de-mexico" },
  { codigo: "Guanajuato", nombre: "Guanajuato", slug: "guanajuato" },
  { codigo: "Guerrero", nombre: "Guerrero", slug: "guerrero" },
  { codigo: "Hidalgo", nombre: "Hidalgo", slug: "hidalgo" },
  { codigo: "Jalisco", nombre: "Jalisco", slug: "jalisco" },
  { codigo: "Michoacan", nombre: "Michoacán", slug: "michoacan" },
  { codigo: "Morelos", nombre: "Morelos", slug: "morelos" },
  { codigo: "Nayarit", nombre: "Nayarit", slug: "nayarit" },
  { codigo: "Nuevo Leon", nombre: "Nuevo León", slug: "nuevo-leon" },
  { codigo: "Oaxaca", nombre: "Oaxaca", slug: "oaxaca" },
  { codigo: "Puebla", nombre: "Puebla", slug: "puebla" },
  { codigo: "Queretaro", nombre: "Querétaro", slug: "queretaro" },
  { codigo: "Quintana Roo", nombre: "Quintana Roo", slug: "quintana-roo" },
  { codigo: "SLP", nombre: "San Luis Potosí", slug: "san-luis-potosi" },
  { codigo: "Sinaloa", nombre: "Sinaloa", slug: "sinaloa" },
  { codigo: "Sonora", nombre: "Sonora", slug: "sonora" },
  { codigo: "Tabasco", nombre: "Tabasco", slug: "tabasco" },
  { codigo: "Tamaulipas", nombre: "Tamaulipas", slug: "tamaulipas" },
  { codigo: "Tlaxcala", nombre: "Tlaxcala", slug: "tlaxcala" },
  { codigo: "Veracruz", nombre: "Veracruz", slug: "veracruz" },
  { codigo: "Yucatan", nombre: "Yucatán", slug: "yucatan" },
  { codigo: "Zacatecas", nombre: "Zacatecas", slug: "zacatecas" },
] as const;

export type CodigoEstado = (typeof ESTADOS_MX)[number]["codigo"];

export const CODIGOS_ESTADO = ESTADOS_MX.map((estado) => estado.codigo) as [
  CodigoEstado,
  ...CodigoEstado[],
];

const POR_CODIGO = new Map<string, (typeof ESTADOS_MX)[number]>(
  ESTADOS_MX.map((estado) => [estado.codigo, estado]),
);

export function esCodigoEstado(valor: string): valor is CodigoEstado {
  return POR_CODIGO.has(valor);
}

export function nombreEstado(codigo: string): string {
  return POR_CODIGO.get(codigo)?.nombre ?? codigo;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Nombres alternos con que llegan los estados (MapTiler, abreviaturas, nombres oficiales).
const ALIAS: Record<string, CodigoEstado> = {
  "san luis potosi": "SLP",
  slp: "SLP",
  ags: "Aguascalientes",
  cdmx: "Ciudad de Mexico",
  "distrito federal": "Ciudad de Mexico",
  "mexico city": "Ciudad de Mexico",
  mexico: "Estado de Mexico",
  "state of mexico": "Estado de Mexico",
  edomex: "Estado de Mexico",
  "coahuila de zaragoza": "Coahuila",
  "michoacan de ocampo": "Michoacan",
  "veracruz de ignacio de la llave": "Veracruz",
  "veracruz llave": "Veracruz",
  gto: "Guanajuato",
  nl: "Nuevo Leon",
  qro: "Queretaro",
  "queretaro de arteaga": "Queretaro",
  bc: "Baja California",
  bcs: "Baja California Sur",
};

// Código del estado a partir de un nombre libre ("San Luis Potosí", "Ciudad de México", "CDMX").
// Devuelve null si no corresponde a un estado de México.
export function estadoDesdeNombre(nombre: string | null | undefined): CodigoEstado | null {
  if (!nombre) return null;
  const clave = normalizar(nombre);
  if (ALIAS[clave]) return ALIAS[clave];
  for (const estado of ESTADOS_MX) {
    if (normalizar(estado.nombre) === clave || normalizar(estado.codigo) === clave) {
      return estado.codigo;
    }
  }
  return null;
}
