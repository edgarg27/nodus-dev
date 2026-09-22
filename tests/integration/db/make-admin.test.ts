import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { usuario } from "../../../src/lib/db/schema.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

beforeAll(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
});

function correrMakeAdmin(args: string[], env?: NodeJS.ProcessEnv) {
  return spawnSync("node", ["--env-file-if-exists=.env", "scripts/make-admin.ts", ...args], {
    encoding: "utf8",
    env: env ?? process.env,
  });
}

describe("scripts/make-admin.ts", () => {
  it("promueve a admin a un usuario ya registrado", async () => {
    const buscador = {
      id: randomUUID(),
      email: `nodus-test+${randomUUID()}@example.com`,
      nombre: "Buscador de prueba",
      rol: "buscador",
    };
    await db.insert(usuario).values(buscador);

    const resultado = correrMakeAdmin([buscador.email]);
    expect(resultado.status).toBe(0);

    const [fila] = await db.select().from(usuario).where(eq(usuario.id, buscador.id));
    expect(fila?.rol).toBe("admin");
  });

  it("una segunda corrida sobre el mismo email es idempotente", async () => {
    const buscador = {
      id: randomUUID(),
      email: `nodus-test+${randomUUID()}@example.com`,
      nombre: "Buscador idempotente",
      rol: "buscador",
    };
    await db.insert(usuario).values(buscador);

    correrMakeAdmin([buscador.email]);
    const resultado = correrMakeAdmin([buscador.email]);
    expect(resultado.status).toBe(0);

    const [fila] = await db.select().from(usuario).where(eq(usuario.id, buscador.id));
    expect(fila?.rol).toBe("admin");
  });

  it("email inexistente sale con código 1 y no cambia ninguna fila", async () => {
    const antes = (await db.select().from(usuario)).length;

    const email = `nodus-test+${randomUUID()}@example.com`;
    const resultado = correrMakeAdmin([email]);

    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toContain("No existe ningún usuario");

    const despues = await db.select().from(usuario);
    expect(despues).toHaveLength(antes);
  });

  it("sin argumento sale con código 2 y el uso en stderr", () => {
    const resultado = correrMakeAdmin([]);
    expect(resultado.status).toBe(2);
    expect(resultado.stderr).toContain("Uso:");
  });

  it("carga DIRECT_URL desde .env aunque el proceso hijo no lo herede", () => {
    const email = `nodus-test+${randomUUID()}@example.com`;
    const entorno = { ...process.env, DIRECT_URL: undefined } as unknown as NodeJS.ProcessEnv;
    const resultado = correrMakeAdmin([email], entorno);

    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toContain("No existe ningún usuario");
  });
});
