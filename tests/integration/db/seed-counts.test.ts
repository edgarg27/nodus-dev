import { spawnSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";

beforeAll(() => {
  const resultado = spawnSync("node", ["--env-file-if-exists=.env", "scripts/seed.ts"], {
    encoding: "utf8",
  });
  if (resultado.status !== 0) {
    throw new Error(`scripts/seed.ts falló (código ${resultado.status}): ${resultado.stderr}`);
  }
});

describe("scripts/seed.ts", () => {
  it("inserta 2 oferentes, 1 buscador, ningún admin y 3 propiedades publicadas", async () => {
    const porRol = (await db.execute(
      sql`select rol, count(*) from usuario group by rol`,
    )) as unknown as { rol: string; count: string }[];
    const conteos = Object.fromEntries(porRol.map((f) => [f.rol, Number(f.count)]));

    expect(conteos.oferente).toBe(2);
    expect(conteos.buscador).toBe(1);
    expect(conteos.admin).toBeUndefined();

    const propiedades = (await db.execute(
      sql`select estado, count(*) from propiedad where activo and estado_publicacion = 'publicada' group by estado`,
    )) as unknown as { estado: string; count: string }[];

    expect(propiedades).toHaveLength(3);
    const total = propiedades.reduce((suma, f) => suma + Number(f.count), 0);
    expect(total).toBe(3);
    const plazas = propiedades.map((f) => f.estado).sort();
    expect(plazas).toEqual(["Aguascalientes", "Leon", "SLP"].sort());
  });

  it("sin NODUS_ALLOW_DB_RESET sale con código 1 sin cambiar nada", async () => {
    const antesResultado = (await db.execute(sql`select count(*) from usuario`)) as unknown as {
      count: string;
    }[];
    const antes = Number(antesResultado[0]?.count);

    const resultado = spawnSync("node", ["--env-file-if-exists=.env", "scripts/seed.ts"], {
      encoding: "utf8",
      env: { ...process.env, NODUS_ALLOW_DB_RESET: "" },
    });

    expect(resultado.status).toBe(1);

    const despuesResultado = (await db.execute(sql`select count(*) from usuario`)) as unknown as {
      count: string;
    }[];
    const despues = Number(despuesResultado[0]?.count);
    expect(despues).toBe(antes);
  });
});
