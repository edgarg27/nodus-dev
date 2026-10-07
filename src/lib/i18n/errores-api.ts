import type { Idioma } from "./index.ts";

// Traducción de los mensajes de error de la API para mostrarlos en pantalla. La API responde en
// español (`{ error: { code, message, details? } }`) y ese contrato no cambia; aquí se traduce lo
// que ve el usuario. Un mensaje sin traducción se reemplaza por el texto genérico de la pantalla,
// para nunca mostrar español en la versión en inglés.

const EN: Record<string, string> = {
  "Sesión requerida": "Please sign in to continue.",
  "No encontrado": "Not found.",
  "Error inesperado": "Something went wrong. Please try again.",
  "Datos inválidos": "Some fields are invalid.",
  "Filtros inválidos": "Some filters are invalid.",
  "Valor inválido": "Invalid value.",
  "Consulta inválida": "Invalid search.",
  "Sin resultados": "No results.",
  "No se pudo consultar el mapa": "Couldn't reach the map service. Please try again.",
  "Demasiadas solicitudes": "Too many requests. Please wait a moment and try again.",
  "Se requiere el rol oferente": "You need a lister account to do this.",
  "Se requiere el rol buscador": "You need a buyer account to do this.",
  "Se requiere el rol admin": "You need an administrator account to do this.",
  "Propiedad no encontrada": "Property not found.",
  "Foto no encontrada": "Photo not found.",
  "Contacto no encontrado": "Contact not found.",
  "Conversación no encontrada": "Conversation not found.",
  "Lead no encontrado": "Lead not found.",
  "Búsqueda no encontrada": "Saved search not found.",
  "Solicitud no encontrada": "Request not found.",
  "Usuario no encontrado": "User not found.",
  "Ya existe una propiedad activa en esta dirección":
    "There's already an active property at this address.",
  "El contacto elegido no es tuyo": "The selected contact isn't yours.",
  "Tipo de archivo no permitido": "File type not allowed.",
  "El archivo supera 4 MB": "The file is larger than 4 MB.",
  "Falta el archivo": "The file is missing.",
  "Falta el parámetro foto": "The photo parameter is missing.",
  "La propiedad ya fue revisada": "This property has already been reviewed.",
  "El motivo es obligatorio": "A reason is required.",
  "Ya eres broker": "You're already a broker.",
  "Ya tienes una solicitud pendiente": "You already have a pending request.",
  "No puedes resolver tu propia solicitud": "You can't resolve your own request.",
  "La solicitud ya fue resuelta": "This request has already been resolved.",
  "Este usuario no es broker": "This user isn't a broker.",
  "Correo inválido": "Invalid email.",
  "Teléfono inválido": "Invalid phone number.",
};

const PATRONES_EN: [RegExp, (coincidencia: RegExpMatchArray) => string][] = [
  [
    /^Puedes guardar hasta (\d+) búsquedas\./,
    (m) => `You can save up to ${m[1]} searches. Delete one to save another.`,
  ],
];

export function traducirMensajeApi(mensaje: string, idioma: Idioma): string | null {
  if (idioma === "es") return mensaje;
  const directo = EN[mensaje];
  if (directo) return directo;
  for (const [patron, armar] of PATRONES_EN) {
    const coincidencia = mensaje.match(patron);
    if (coincidencia) return armar(coincidencia);
  }
  return null;
}

interface CuerpoErrorApi {
  error?: { message?: unknown; details?: { message?: unknown }[] };
}

// Mensaje para mostrar a partir del cuerpo de una respuesta de error. Con `detalle`, el primer
// detalle de validación (p. ej. "Correo inválido") tiene prioridad sobre el mensaje general.
export function mensajeDeErrorApi(
  cuerpo: unknown,
  idioma: Idioma,
  generico: string,
  opciones: { detalle?: boolean } = {},
): string {
  const error = (cuerpo as CuerpoErrorApi | null | undefined)?.error;
  const candidatos = [opciones.detalle ? error?.details?.[0]?.message : undefined, error?.message];
  for (const candidato of candidatos) {
    if (typeof candidato !== "string" || !candidato) continue;
    const traducido = traducirMensajeApi(candidato, idioma);
    if (traducido) return traducido;
  }
  return generico;
}
