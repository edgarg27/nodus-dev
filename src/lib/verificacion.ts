// Documentos con los que un broker o dueño comprueba quién es antes de que Captive lo apruebe.
// Fuente única para la base (check de `verificacion_documento.tipo`), la API y las pantallas.

export const TIPOS_DOCUMENTO = [
  "identificacion",
  "acreditacion_broker",
  "comprobante_propiedad",
] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export type TipoSolicitud = "broker" | "dueno";

// Lo que se le pide a cada quien, en el orden en que se muestra.
const REQUERIDOS: Record<TipoSolicitud, readonly TipoDocumento[]> = {
  broker: ["identificacion", "acreditacion_broker"],
  dueno: ["identificacion", "comprobante_propiedad"],
};

export function documentosRequeridos(tipo: string): readonly TipoDocumento[] {
  return tipo === "broker" ? REQUERIDOS.broker : REQUERIDOS.dueno;
}

export function documentosFaltantes(
  tipo: string,
  subidos: readonly { tipo: string }[],
): TipoDocumento[] {
  const presentes = new Set(subidos.map((documento) => documento.tipo));
  return documentosRequeridos(tipo).filter((requerido) => !presentes.has(requerido));
}

export function esTipoDocumento(valor: unknown): valor is TipoDocumento {
  return typeof valor === "string" && (TIPOS_DOCUMENTO as readonly string[]).includes(valor);
}

// Formatos aceptados y su extensión. 4 000 000 bytes: el mismo tope que las fotos (el cuerpo de una
// Vercel Function admite 4,5 MB).
export const FORMATOS_DOCUMENTO: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const TAMANO_MAXIMO_DOCUMENTO = 4_000_000;
