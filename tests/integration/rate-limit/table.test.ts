import { describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { rateLimitHit } from "../../../src/lib/db/schema.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

function ventanaFixture(overrides: Partial<typeof rateLimitHit.$inferInsert> = {}) {
  return {
    clave: "contact:127.0.0.1",
    ventanaInicio: new Date("2026-01-01T12:00:00Z"),
    ...overrides,
  };
}

describe("esquema de rate_limit_hit", () => {
  it("una segunda fila con la misma clave y ventana_inicio rechaza con 23505", async () => {
    await resetTestDatabase();
    await db.insert(rateLimitHit).values(ventanaFixture());

    await expect(db.insert(rateLimitHit).values(ventanaFixture())).rejects.toMatchObject({
      cause: { code: "23505" },
    });
  });

  it("una fila sin conteo guarda conteo = 1", async () => {
    await resetTestDatabase();
    const [fila] = await db.insert(rateLimitHit).values(ventanaFixture()).returning();

    expect(fila?.conteo).toBe(1);
  });

  it("resetTestDatabase deja rate_limit_hit vacía", async () => {
    await resetTestDatabase();
    await db.insert(rateLimitHit).values(ventanaFixture());

    await resetTestDatabase();

    expect(await db.select().from(rateLimitHit)).toHaveLength(0);
  });
});
