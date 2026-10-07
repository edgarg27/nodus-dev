// Una propiedad tal como la ve el público: sin la comisión compartida (solo se ve en la Red,
// entre oferentes), sin el contacto elegido ni la referencia interna del oferente.
export function proyeccionPublica<
  T extends { comisionPct?: unknown; contactoId?: unknown; referencia?: unknown },
>(fila: T): Omit<T, "comisionPct" | "contactoId" | "referencia"> {
  const { comisionPct: _comision, contactoId: _contacto, referencia: _referencia, ...resto } = fila;
  return resto;
}
