// Log estructurado JSON: una línea por evento, siempre con `requestId`. Nunca recibe ni escribe
// contraseñas, tokens ni el cuerpo completo de un request — los llamadores solo pasan los campos
// puntuales que necesitan loguear, nunca un objeto de request/formulario completo.
type NivelLog = "info" | "error";

const CLAVES_SENSIBLES = ["password", "contrasena", "token", "authorization", "cookie"];

function redactar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(redactar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, val]) => [
        clave,
        CLAVES_SENSIBLES.some((sensible) => clave.toLowerCase().includes(sensible))
          ? "[redactado]"
          : redactar(val),
      ]),
    );
  }
  return valor;
}

export function log(nivel: NivelLog, mensaje: string, campos: Record<string, unknown>): void {
  const linea = JSON.stringify({
    nivel,
    mensaje,
    timestamp: new Date().toISOString(),
    ...(redactar(campos) as Record<string, unknown>),
  });
  if (nivel === "error") {
    console.error(linea);
  } else {
    console.log(linea);
  }
}
