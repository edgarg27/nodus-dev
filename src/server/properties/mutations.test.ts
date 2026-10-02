import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { resetTestDatabase } from "../../../tests/helpers/reset-db.ts";
import { db } from "../../lib/db/client.ts";
import { propiedad, usuario } from "../../lib/db/schema.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { crearPropiedad, editarPropiedad } from "./mutations.ts";

function actorOferente(id: string): ActorAutenticado {
  return {
    id,
    email: `nodus-test+${id}@example.com`,
    nombre: "Oferente de prueba",
    rol: "oferente",
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
}

async function crearFilaOferente(): Promise<ActorAutenticado> {
  const id = randomUUID();
  const actor = actorOferente(id);
  await db
    .insert(usuario)
    .values({ id, email: actor.email, nombre: actor.nombre, rol: "oferente" });
  return actor;
}

function inputBase(overrides: Record<string, unknown> = {}) {
  return {
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Financiamiento ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de prueba",
    ...overrides,
  };
}

describe("crearPropiedad / aceptaFinanciamiento", () => {
  it("sin aceptaFinanciamiento inserta la fila con acepta_financiamiento = false", async () => {
    await resetTestDatabase();
    const actor = await crearFilaOferente();

    const resultado = await crearPropiedad(actor, inputBase());
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("no se creó");
    expect(resultado.data.aceptaFinanciamiento).toBe(false);
  });

  it("con aceptaFinanciamiento: true inserta la fila con acepta_financiamiento = true", async () => {
    await resetTestDatabase();
    const actor = await crearFilaOferente();

    const resultado = await crearPropiedad(actor, inputBase({ aceptaFinanciamiento: true }));
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("no se creó");
    expect(resultado.data.aceptaFinanciamiento).toBe(true);
  });
});

describe("editarPropiedad / aceptaFinanciamiento", () => {
  it("cambiar solo aceptaFinanciamiento actualiza la columna sin devolver una publicada a pendiente", async () => {
    await resetTestDatabase();
    const actor = await crearFilaOferente();

    const [publicada] = await db
      .insert(propiedad)
      .values({
        ...inputBase(),
        oferenteId: actor.id,
        direccionNormalizada: `financiamiento ${randomUUID()}`,
        estadoPublicacion: "publicada",
      })
      .returning();
    if (!publicada) throw new Error("fixture no se creó");
    expect(publicada.aceptaFinanciamiento).toBe(false);

    const resultado = await editarPropiedad(actor, publicada.id, { aceptaFinanciamiento: true });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("no se actualizó");
    expect(resultado.data.aceptaFinanciamiento).toBe(true);
    expect(resultado.data.estadoPublicacion).toBe("publicada");

    const [filaFinal] = await db.select().from(propiedad).where(eq(propiedad.id, publicada.id));
    expect(filaFinal?.estadoPublicacion).toBe("publicada");
  });
});
