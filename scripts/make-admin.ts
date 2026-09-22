import postgres from "postgres";
import { env, requireEnv } from "../src/lib/env.ts";

async function makeAdmin() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error("Uso: pnpm db:make-admin <email>");
    process.exit(2);
  }

  requireEnv(["DIRECT_URL"]);
  const email = emailArg.trim().toLowerCase();
  const sql = postgres(env.DIRECT_URL as string);

  let codigoSalida = 0;
  try {
    const filas = await sql`select id, rol from usuario where email = ${email}`;
    if (filas.length === 0) {
      console.error(
        `No existe ningún usuario con el email ${email}. Debe registrarse y confirmar su correo primero.`,
      );
      codigoSalida = 1;
    } else {
      const fila = filas[0] as { id: string; rol: string };
      if (fila.rol !== "admin") {
        await sql`update usuario set rol = 'admin' where id = ${fila.id}`;
      }
    }
  } finally {
    await sql.end();
  }
  process.exit(codigoSalida);
}

await makeAdmin();
