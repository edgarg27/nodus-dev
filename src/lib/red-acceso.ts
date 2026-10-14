// Quién usa la Red inmobiliaria (propiedades compartidas entre colegas, con comisión): los brokers y
// quienes publican como inmobiliaria. Al dueño directo ("Soy el dueño", `tipo_anunciante =
// 'particular'`) no se le muestra la Red ni la comisión, y sus propiedades no se comparten en ella.
// Un propietario sin tipo capturado (cuentas anteriores) conserva la Red.

export interface PerfilRed {
  isBroker: boolean;
  tipoAnunciante?: string | null;
}

export function usaLaRed(perfil: PerfilRed): boolean {
  return perfil.isBroker || perfil.tipoAnunciante !== "particular";
}
