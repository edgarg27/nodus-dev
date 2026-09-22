// Guardia de la base compartida (paso 3). Función pura, sin I/O: lanza en cuanto una de las cuatro
// condiciones falla, y devuelve sin más cuando las cuatro se cumplen. Lista de permitidos, no de
// bloqueados — ver blueprint.md §9 paso 3. Los mensajes de error nombran la variable que falló y
// nunca imprimen el valor de una cadena de conexión (llevan contraseña).
export function assertSafeToReset(env: Record<string, string | undefined>): void {
  if (env.NODUS_ALLOW_DB_RESET !== "yes") {
    throw new Error("NODUS_ALLOW_DB_RESET debe valer exactamente 'yes' para permitir un reset.");
  }

  const devRef = env.NODUS_DEV_PROJECT_REF;
  if (!devRef) {
    throw new Error("NODUS_DEV_PROJECT_REF no está definida.");
  }

  const conexiones: Record<string, string | undefined> = {
    DATABASE_URL: env.DATABASE_URL,
    DIRECT_URL: env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  };
  for (const [nombre, valor] of Object.entries(conexiones)) {
    if (!valor?.includes(devRef)) {
      throw new Error(`${nombre} no está definida o no contiene el ref del proyecto dev.`);
    }
  }

  const prodRef = env.NODUS_PROD_PROJECT_REF;
  if (prodRef) {
    if (prodRef === devRef) {
      throw new Error("NODUS_PROD_PROJECT_REF no puede ser igual a NODUS_DEV_PROJECT_REF.");
    }
    for (const [nombre, valor] of Object.entries(conexiones)) {
      if (valor?.includes(prodRef)) {
        throw new Error(`${nombre} contiene el ref del proyecto de producción.`);
      }
    }
  }
}
