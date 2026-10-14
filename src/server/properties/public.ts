// Una propiedad tal como la ve el público: sin la comisión compartida (solo se ve en la Red,
// entre propietarios), sin el contacto elegido ni la referencia interna del propietario.
export function proyeccionPublica<
  T extends { comisionPct?: unknown; contactoId?: unknown; referencia?: unknown },
>(fila: T): Omit<T, "comisionPct" | "contactoId" | "referencia"> {
  const { comisionPct: _comision, contactoId: _contacto, referencia: _referencia, ...resto } = fila;
  return resto;
}
