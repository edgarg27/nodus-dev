// Número de propietario tal como se muestra y se dicta por teléfono: "P-0783". Lo asigna la base
// (migración 0037); aquí solo se le da formato y se reconoce al buscarlo.

export function formatearNumeroPropietario(numero: number | null | undefined): string | null {
  if (numero === null || numero === undefined) return null;
  return `P-${String(numero).padStart(4, "0")}`;
}

// "P-0783", "p783", "#783" o "783" → 783. Cualquier otro texto → null.
export function leerNumeroPropietario(texto: string): number | null {
  const coincidencia = texto.trim().match(/^(?:p-?|#)?0*(\d{1,9})$/i);
  if (!coincidencia?.[1]) return null;
  const numero = Number(coincidencia[1]);
  return numero > 0 ? numero : null;
}
