// Precio o mantenimiento capturado como rango en una sola casilla del formulario ("450 - 1200"):
// se guarda en dos columnas, "desde" (precio, mantenimiento) y "hasta" (precioMax, mantenimientoMax).

// Texto de la casilla del formulario: "450", "450 - 1200" o vacío.
export function rangoATexto(desde: number | null, hasta: number | null): string {
  if (desde === null) return "";
  return hasta !== null && hasta > desde ? `${desde} - ${hasta}` : String(desde);
}

// Lee "450", "1,200.50", "450 - 1200" o "450 a 1200". Devuelve null si el texto no es válido o el
// "hasta" no supera al "desde"; vacío = sin dato.
export function textoARango(
  texto: string | undefined,
): { desde: number | null; hasta: number | null } | null {
  const limpio = texto?.trim() ?? "";
  if (!limpio) return { desde: null, hasta: null };
  const partes = limpio.split(/\s*(?:-|–|—|\sa\s|\sto\s)\s*/i);
  if (partes.length > 2) return null;
  const numeros = partes.map((parte) =>
    parte.trim() ? Number(parte.replace(/,/g, "")) : Number.NaN,
  );
  if (numeros.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const desde = numeros[0] ?? Number.NaN;
  const hasta = numeros[1] ?? null;
  if (hasta !== null && hasta <= desde) return null;
  return { desde, hasta };
}
