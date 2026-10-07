// Guardia de la base compartida (paso 3). Función pura, sin I/O: lanza en cuanto una de las cuatro
// condiciones falla, y devuelve sin más cuando las cuatro se cumplen. Lista de permitidos, no de
// bloqueados — ver blueprint.md §9 paso 3. Los mensajes de error nombran la variable que falló y
// nunca imprimen el valor de una cadena de conexión (llevan contraseña).
type Entorno = Record<string, string | undefined>;

function conexionesDe(env: Entorno): Record<string, string | undefined> {
  return {
    DATABASE_URL: env.DATABASE_URL,
    DIRECT_URL: env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

// Para seed/demo: la base debe ser el proyecto dev.
export function assertSafeToReset(env: Entorno): void {
  if (env.NODUS_ALLOW_DB_RESET !== "yes") {
    throw new Error("NODUS_ALLOW_DB_RESET debe valer exactamente 'yes' para permitir un reset.");
  }

  const devRef = env.NODUS_DEV_PROJECT_REF;
  if (!devRef) {
    throw new Error("NODUS_DEV_PROJECT_REF no está definida.");
  }

  const conexiones = conexionesDe(env);
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

// Para las pruebas (Vitest y Playwright truncan tablas y borran usuarios de Auth): deben correr
// contra su PROPIO proyecto Supabase (`.env.test`), nunca contra nodus-dev — ahí viven las cuentas
// y publicaciones con las que el equipo revisa la plataforma — ni contra producción.
export function assertSafeToResetTests(env: Entorno): void {
  if (env.NODUS_ALLOW_DB_RESET !== "yes") {
    throw new Error("NODUS_ALLOW_DB_RESET debe valer exactamente 'yes' para permitir un reset.");
  }

  const testRef = env.NODUS_TEST_PROJECT_REF;
  if (!testRef) {
    throw new Error(
      "NODUS_TEST_PROJECT_REF no está definida. Las pruebas corren contra su propio proyecto " +
        "Supabase: crea .env.test a partir de .env.test.example y corre pnpm test:db:setup.",
    );
  }

  const devRef = env.NODUS_DEV_PROJECT_REF;
  const prodRef = env.NODUS_PROD_PROJECT_REF;
  if (testRef === devRef) {
    throw new Error("NODUS_TEST_PROJECT_REF no puede ser igual a NODUS_DEV_PROJECT_REF.");
  }
  if (testRef === prodRef) {
    throw new Error("NODUS_TEST_PROJECT_REF no puede ser igual a NODUS_PROD_PROJECT_REF.");
  }

  for (const [nombre, valor] of Object.entries(conexionesDe(env))) {
    if (!valor?.includes(testRef)) {
      throw new Error(`${nombre} no está definida o no contiene el ref del proyecto de pruebas.`);
    }
    if (devRef && valor.includes(devRef)) {
      throw new Error(
        `${nombre} contiene el ref del proyecto dev: las pruebas no pueden vaciarlo.`,
      );
    }
    if (prodRef && valor.includes(prodRef)) {
      throw new Error(`${nombre} contiene el ref del proyecto de producción.`);
    }
  }
}
