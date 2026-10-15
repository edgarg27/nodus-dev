// Equipamiento de una propiedad: casillas de sí/no que el propietario marca al publicar y que la
// ficha muestra. Se guardan como lista de claves en `propiedad.equipamiento`, así que agregar una
// casilla nueva es solo sumarla aquí (y su texto en src/lib/i18n): no hace falta migración.

export const EQUIPAMIENTO = [
  // Para cualquier tipo de inmueble.
  { clave: "iluminacion", tipos: "todos" },
  { clave: "plafon", tipos: "todos" },
  { clave: "divisiones", tipos: "todos" },
  { clave: "planta_emergencia", tipos: "todos" },
  { clave: "aire_acondicionado", tipos: "todos" },
  { clave: "seguridad", tipos: "todos" },
  { clave: "internet", tipos: "todos" },
  { clave: "cisterna", tipos: "todos" },
  { clave: "accesibilidad", tipos: "todos" },
  // Oficinas.
  { clave: "amueblada", tipos: ["oficina"] },
  { clave: "sala_juntas", tipos: ["oficina"] },
  { clave: "cocineta", tipos: ["oficina"] },
  { clave: "elevador", tipos: ["oficina"] },
  // Naves y bodegas.
  { clave: "patio_maniobras", tipos: ["nave_industrial"] },
  { clave: "contra_incendios", tipos: ["nave_industrial"] },
  { clave: "parque_industrial", tipos: ["nave_industrial"] },
  // Locales comerciales.
  { clave: "frente_calle", tipos: ["local_comercial"] },
  { clave: "plaza_comercial", tipos: ["local_comercial"] },
] as const satisfies readonly { clave: string; tipos: "todos" | readonly string[] }[];

export type ClaveEquipamiento = (typeof EQUIPAMIENTO)[number]["clave"];

export const CLAVES_EQUIPAMIENTO = EQUIPAMIENTO.map((item) => item.clave) as [
  ClaveEquipamiento,
  ...ClaveEquipamiento[],
];

// Las casillas que corresponden a un tipo de inmueble, en el orden del catálogo.
export function equipamientoDeTipo(tipo: string): ClaveEquipamiento[] {
  return EQUIPAMIENTO.filter(
    (item) => item.tipos === "todos" || (item.tipos as readonly string[]).includes(tipo),
  ).map((item) => item.clave);
}

// Lo que se guarda o se muestra: solo claves del catálogo que tocan a ese tipo, sin repetir y en el
// orden del catálogo (si el propietario cambia el tipo, lo que ya no aplica se descarta).
export function limpiarEquipamiento(tipo: string, marcado: readonly string[]): ClaveEquipamiento[] {
  const elegido = new Set(marcado);
  return equipamientoDeTipo(tipo).filter((clave) => elegido.has(clave));
}
