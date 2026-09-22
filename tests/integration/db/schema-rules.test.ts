import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../../src/lib/db/schema.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

function usuarioFixture(overrides: Partial<typeof usuario.$inferInsert> = {}) {
  return {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Usuario de prueba",
    rol: "buscador",
    ...overrides,
  };
}

function propiedadFixture(
  oferenteId: string,
  overrides: Partial<typeof propiedad.$inferInsert> = {},
) {
  return {
    oferenteId,
    tipo: "nave_industrial",
    modalidad: "renta",
    direccion: "Av. Industrias 100",
    direccionNormalizada: "av industrias 100",
    lat: "22.156370",
    lng: "-100.978890",
    estado: "SLP",
    ciudad: "San Luis Potosi",
    descripcion: "Nave industrial de prueba",
    ...overrides,
  };
}

describe("schema-rules", () => {
  it("guardia: sin NODUS_ALLOW_DB_RESET rechaza y conserva las filas", async () => {
    await resetTestDatabase();
    const u = usuarioFixture();
    await db.insert(usuario).values(u);

    vi.stubEnv("NODUS_ALLOW_DB_RESET", "");
    await expect(resetTestDatabase()).rejects.toThrow(/NODUS_ALLOW_DB_RESET/);
    vi.unstubAllEnvs();

    const filas = await db.select().from(usuario).where(eq(usuario.id, u.id));
    expect(filas).toHaveLength(1);
  });

  it("duplicados vigentes: rechaza con 23505, tanto pendiente como publicada", async () => {
    await resetTestDatabase();
    const oferente = usuarioFixture({ rol: "oferente" });
    await db.insert(usuario).values(oferente);
    await db.insert(propiedad).values(propiedadFixture(oferente.id));

    await expect(db.insert(propiedad).values(propiedadFixture(oferente.id))).rejects.toMatchObject({
      cause: { code: "23505" },
    });

    await resetTestDatabase();
    await db.insert(usuario).values(oferente);
    await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { estadoPublicacion: "publicada" }));

    await expect(db.insert(propiedad).values(propiedadFixture(oferente.id))).rejects.toMatchObject({
      cause: { code: "23505" },
    });
  });

  it("no bloquean: inactiva o rechazada permiten la segunda propiedad", async () => {
    await resetTestDatabase();
    const oferente = usuarioFixture({ rol: "oferente" });
    await db.insert(usuario).values(oferente);
    await db.insert(propiedad).values(propiedadFixture(oferente.id, { activo: false }));
    await expect(db.insert(propiedad).values(propiedadFixture(oferente.id))).resolves.toBeDefined();

    await resetTestDatabase();
    await db.insert(usuario).values(oferente);
    await db.insert(propiedad).values(
      propiedadFixture(oferente.id, {
        estadoPublicacion: "rechazada",
        motivoRechazo: "Foto ilegible",
      }),
    );
    await expect(db.insert(propiedad).values(propiedadFixture(oferente.id))).resolves.toBeDefined();
  });

  it("checks de publicación: rechaza con 23514", async () => {
    await resetTestDatabase();
    const oferente = usuarioFixture({ rol: "oferente" });
    await db.insert(usuario).values(oferente);

    await expect(
      db.insert(propiedad).values(propiedadFixture(oferente.id, { estadoPublicacion: "xyz" })),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db
        .insert(propiedad)
        .values(propiedadFixture(oferente.id, { estadoPublicacion: "rechazada" })),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db
        .insert(propiedad)
        .values(
          propiedadFixture(oferente.id, { estadoPublicacion: "rechazada", motivoRechazo: "   " }),
        ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db.insert(propiedad).values(
        propiedadFixture(oferente.id, {
          estadoPublicacion: "publicada",
          motivoRechazo: "no debería estar",
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db.insert(propiedad).values(
        propiedadFixture(oferente.id, {
          estadoPublicacion: "pendiente",
          revisadaPor: oferente.id,
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db.insert(propiedad).values(
        propiedadFixture(oferente.id, {
          estadoPublicacion: "publicada",
          revisadaPor: oferente.id,
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("rol: admite admin, rechaza root con 23514", async () => {
    await resetTestDatabase();
    await expect(
      db.insert(usuario).values(usuarioFixture({ rol: "admin" })),
    ).resolves.toBeDefined();

    await expect(db.insert(usuario).values(usuarioFixture({ rol: "root" }))).rejects.toMatchObject({
      cause: { code: "23514" },
    });
  });

  it("FK del referido: id inexistente rechaza con 23503, id existente inserta", async () => {
    await resetTestDatabase();
    await expect(
      db.insert(usuario).values(usuarioFixture({ referralBrokerId: randomUUID() })),
    ).rejects.toMatchObject({ cause: { code: "23503" } });

    const broker = usuarioFixture({ rol: "oferente" });
    await db.insert(usuario).values(broker);
    await expect(
      db.insert(usuario).values(usuarioFixture({ referralBrokerId: broker.id })),
    ).resolves.toBeDefined();
  });
});
