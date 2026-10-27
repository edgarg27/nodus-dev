import { PRECIO_PUBLICO } from "../../lib/precio-visibilidad.ts";

// Con el precio "sujeto a cotización" (src/lib/precio-visibilidad.ts) lo público lo recibe nulo:
// así cada pantalla muestra "Precio sujeto a cotización" y el dato no viaja al navegador.
export function sinPrecioPublico<T extends { precio: number | null; precioMax?: number | null }>(
  fila: T,
): T {
  if (PRECIO_PUBLICO) return fila;
  return "precioMax" in fila
    ? { ...fila, precio: null, precioMax: null }
    : { ...fila, precio: null };
}

// Una propiedad tal como la ve el público: sin la comisión compartida (solo se ve en la Red,
// entre propietarios), sin el contacto elegido ni la referencia interna del propietario.
export function proyeccionPublica<
  T extends { comisionPct?: unknown; contactoId?: unknown; referencia?: unknown },
>(fila: T): Omit<T, "comisionPct" | "contactoId" | "referencia"> {
  const { comisionPct: _comision, contactoId: _contacto, referencia: _referencia, ...resto } = fila;
  return resto;
}
