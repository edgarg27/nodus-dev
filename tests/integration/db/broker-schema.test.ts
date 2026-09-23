import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import {
  brokerAtribucionHistorica,
  brokerRevocacion,
  brokerSolicitud,
  usuario,
} from "../../../src/lib/db/schema.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

function usuarioFixture(overrides: Partial<typeof usuario.$inferInsert> = {}) {
  return {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Usuario de prueba",
    rol: "oferente",
    ...overrides,
  };
}

function solicitudFixture(
  usuarioId: string,
  overrides: Partial<typeof brokerSolicitud.$inferInsert> = {},
) {
  return {
    usuarioId,
    mensaje: "Quiero ser broker",
    ...overrides,
  };
}

describe("esquema de broker_solicitud", () => {
  it("una segunda pendiente para el mismo usuario se rechaza con 23505", async () => {
    await resetTestDatabase();
    const u = usuarioFixture();
    await db.insert(usuario).values(u);
    await db.insert(brokerSolicitud).values(solicitudFixture(u.id));

    await expect(db.insert(brokerSolicitud).values(solicitudFixture(u.id))).rejects.toMatchObject({
      cause: { code: "23505" },
    });
  });

  it("tras denegar la anterior, permite insertar una nueva pendiente", async () => {
    await resetTestDatabase();
    const u = usuarioFixture();
    const admin = usuarioFixture({ rol: "admin" });
    await db.insert(usuario).values([u, admin]);

    const [primera] = await db.insert(brokerSolicitud).values(solicitudFixture(u.id)).returning();
    if (!primera) throw new Error("fixture no se creó");
    await db
      .update(brokerSolicitud)
      .set({ estado: "denegada", resueltaPor: admin.id, resueltaEn: new Date() })
      .where(eq(brokerSolicitud.id, primera.id));

    await expect(db.insert(brokerSolicitud).values(solicitudFixture(u.id))).resolves.not.toThrow();
  });

  it("checks de integridad: estado, mensaje, resolución y motivo rechazan con 23514", async () => {
    await resetTestDatabase();
    const u = usuarioFixture();
    const admin = usuarioFixture({ rol: "admin" });
    await db.insert(usuario).values([u, admin]);

    await expect(
      db.insert(brokerSolicitud).values(solicitudFixture(u.id, { estado: "root" })),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db.insert(brokerSolicitud).values(solicitudFixture(u.id, { mensaje: "   " })),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db.insert(brokerSolicitud).values(
        solicitudFixture(u.id, {
          estado: "aprobada",
          resueltaPor: null,
          resueltaEn: null,
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db.insert(brokerSolicitud).values(
        solicitudFixture(u.id, {
          estado: "pendiente",
          resueltaPor: admin.id,
          resueltaEn: new Date(),
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db.insert(brokerSolicitud).values(
        solicitudFixture(u.id, {
          estado: "aprobada",
          motivoDenegacion: "no debería tener motivo",
          resueltaPor: admin.id,
          resueltaEn: new Date(),
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });
});

describe("esquema de broker_revocacion y broker_atribucion_historica", () => {
  it("motivo vacío rechaza con 23514; datos completos se insertan", async () => {
    await resetTestDatabase();
    const broker = usuarioFixture({
      isBroker: true,
      brokerCode: `BRK-${randomUUID().slice(0, 6)}`,
    });
    const admin = usuarioFixture({ rol: "admin" });
    await db.insert(usuario).values([broker, admin]);

    await expect(
      db.insert(brokerRevocacion).values({
        usuarioId: broker.id,
        brokerCode: broker.brokerCode as string,
        motivo: "   ",
        revocadaPor: admin.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await expect(
      db.insert(brokerRevocacion).values({
        usuarioId: broker.id,
        brokerCode: broker.brokerCode as string,
        motivo: "Bajo desempeño",
        revocadaPor: admin.id,
      }),
    ).resolves.not.toThrow();
  });

  it("una segunda fotografía para la misma revocación rechaza con 23505; total_leads negativo con 23514", async () => {
    await resetTestDatabase();
    const broker = usuarioFixture({
      isBroker: true,
      brokerCode: `BRK-${randomUUID().slice(0, 6)}`,
    });
    const admin = usuarioFixture({ rol: "admin" });
    await db.insert(usuario).values([broker, admin]);

    const [revocacion] = await db
      .insert(brokerRevocacion)
      .values({
        usuarioId: broker.id,
        brokerCode: broker.brokerCode as string,
        motivo: "Bajo desempeño",
        revocadaPor: admin.id,
      })
      .returning();
    if (!revocacion) throw new Error("fixture no se creó");

    await db.insert(brokerAtribucionHistorica).values({
      brokerRevocacionId: revocacion.id,
      usuarioId: broker.id,
      brokerCode: broker.brokerCode as string,
      contactRequestIds: [],
      totalLeads: 0,
    });

    await expect(
      db.insert(brokerAtribucionHistorica).values({
        brokerRevocacionId: revocacion.id,
        usuarioId: broker.id,
        brokerCode: broker.brokerCode as string,
        contactRequestIds: [],
        totalLeads: 0,
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });

    const [otraRevocacion] = await db
      .insert(brokerRevocacion)
      .values({
        usuarioId: broker.id,
        brokerCode: broker.brokerCode as string,
        motivo: "Otra revocación",
        revocadaPor: admin.id,
      })
      .returning();
    if (!otraRevocacion) throw new Error("fixture no se creó");

    await expect(
      db.insert(brokerAtribucionHistorica).values({
        brokerRevocacionId: otraRevocacion.id,
        usuarioId: broker.id,
        brokerCode: broker.brokerCode as string,
        contactRequestIds: [],
        totalLeads: -1,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });
});

describe("resetTestDatabase incluye las tres tablas nuevas", () => {
  it("deja broker_solicitud, broker_revocacion y broker_atribucion_historica vacías", async () => {
    await resetTestDatabase();
    const u = usuarioFixture();
    const admin = usuarioFixture({ rol: "admin" });
    await db.insert(usuario).values([u, admin]);
    const [solicitud] = await db.insert(brokerSolicitud).values(solicitudFixture(u.id)).returning();
    if (!solicitud) throw new Error("fixture no se creó");
    const [revocacion] = await db
      .insert(brokerRevocacion)
      .values({ usuarioId: u.id, brokerCode: "BRK-000000", motivo: "x", revocadaPor: admin.id })
      .returning();
    if (!revocacion) throw new Error("fixture no se creó");
    await db.insert(brokerAtribucionHistorica).values({
      brokerRevocacionId: revocacion.id,
      usuarioId: u.id,
      brokerCode: "BRK-000000",
      contactRequestIds: [],
      totalLeads: 0,
    });

    await resetTestDatabase();

    expect(await db.select().from(brokerSolicitud)).toHaveLength(0);
    expect(await db.select().from(brokerRevocacion)).toHaveLength(0);
    expect(await db.select().from(brokerAtribucionHistorica)).toHaveLength(0);
  });
});
