import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../../src/lib/db/schema.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("trigger set_updated_at", () => {
  it("un UPDATE sobre propiedad.descripcion sube updated_at sin que el código lo escriba", async () => {
    await resetTestDatabase();

    const oferente = {
      id: randomUUID(),
      email: `nodus-test+${randomUUID()}@example.com`,
      nombre: "Oferente de prueba",
      rol: "oferente",
    };
    await db.insert(usuario).values(oferente);

    const filasCreadas = await db
      .insert(propiedad)
      .values({
        oferenteId: oferente.id,
        tipo: "nave_industrial",
        modalidad: "renta",
        direccion: "Av. Industrias 100",
        direccionNormalizada: "av industrias 100",
        lat: "22.156370",
        lng: "-100.978890",
        estado: "SLP",
        ciudad: "San Luis Potosi",
        descripcion: "Descripción original",
      })
      .returning();
    const creada = filasCreadas[0];
    if (!creada) throw new Error("no se insertó la propiedad de prueba");

    await esperar(10);

    await db
      .update(propiedad)
      .set({ descripcion: "Descripción editada" })
      .where(eq(propiedad.id, creada.id));

    const filasActualizadas = await db.select().from(propiedad).where(eq(propiedad.id, creada.id));
    const actualizada = filasActualizadas[0];
    if (!actualizada) throw new Error("no se encontró la propiedad actualizada");

    expect(actualizada.updatedAt.getTime()).toBeGreaterThan(creada.updatedAt.getTime());
  });
});
