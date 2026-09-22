import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../../src/lib/db/schema.ts";
import { normalizeAddress } from "../../../src/lib/normalize-address.ts";
import type { ActorAutenticado } from "../../../src/server/auth/session.ts";
import { crearPropiedad, darDeBajaPropiedad } from "../../../src/server/properties/mutations.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

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

const DIRECCION_FIJA = "Av. Industrias 100";
const LAT_FIJA = "22.156370";
const LNG_FIJA = "-100.978890";

describe("buscarDuplicadoActivo / crearPropiedad", () => {
  it("B duplicada de A vigente es rechazada, sin insertarse", async () => {
    await resetTestDatabase();
    const actor = await crearFilaOferente();

    const resultadoA = await crearPropiedad(actor, {
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion: DIRECCION_FIJA,
      lat: LAT_FIJA,
      lng: LNG_FIJA,
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Nave A",
    });
    expect(resultadoA.ok).toBe(true);
    if (!resultadoA.ok) throw new Error("fixture A no se creó");

    const resultadoB = await crearPropiedad(actor, {
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion: DIRECCION_FIJA,
      lat: LAT_FIJA,
      lng: LNG_FIJA,
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Nave B",
    });
    expect(resultadoB.ok).toBe(false);
    if (resultadoB.ok) throw new Error("B no debió crearse");
    expect(resultadoB.error.code).toBe("conflict_duplicate_property");
    if (resultadoB.error.code === "conflict_duplicate_property") {
      expect(resultadoB.error.details[0].existing_property_id).toBe(resultadoA.data.id);
    }

    const filas = await db.select().from(propiedad).where(eq(propiedad.descripcion, "Nave B"));
    expect(filas).toHaveLength(0);
  });

  it("dos creaciones simultáneas con datos idénticos dejan exactamente una ok", async () => {
    await resetTestDatabase();
    const actor = await crearFilaOferente();

    const input = {
      tipo: "oficina" as const,
      modalidad: "venta" as const,
      direccion: "Blvd. Carretera 200",
      lat: "21.885300",
      lng: "-102.291600",
      estado: "Aguascalientes" as const,
      ciudad: "Aguascalientes",
      descripcion: "Carrera",
    };

    const [r1, r2] = await Promise.all([
      crearPropiedad(actor, input),
      crearPropiedad(actor, input),
    ]);
    const oks = [r1, r2].filter((r) => r.ok);
    const conflictos = [r1, r2].filter(
      (r) => !r.ok && r.error.code === "conflict_duplicate_property",
    );
    expect(oks).toHaveLength(1);
    expect(conflictos).toHaveLength(1);
  });

  it("una A dada de baja permite crear B con la misma dirección/coordenadas", async () => {
    await resetTestDatabase();
    const actor = await crearFilaOferente();

    const resultadoA = await crearPropiedad(actor, {
      tipo: "local_comercial",
      modalidad: "desde_cero",
      direccion: DIRECCION_FIJA,
      lat: LAT_FIJA,
      lng: LNG_FIJA,
      estado: "Leon",
      ciudad: "León",
      descripcion: "Local A",
    });
    if (!resultadoA.ok) throw new Error("fixture A no se creó");

    await darDeBajaPropiedad(actor, resultadoA.data.id);

    const resultadoB = await crearPropiedad(actor, {
      tipo: "local_comercial",
      modalidad: "desde_cero",
      direccion: DIRECCION_FIJA,
      lat: LAT_FIJA,
      lng: LNG_FIJA,
      estado: "Leon",
      ciudad: "León",
      descripcion: "Local B",
    });
    expect(resultadoB.ok).toBe(true);
  });
});

describe("normalizeAddress", () => {
  it("ignora mayúsculas, puntuación y espacios repetidos", () => {
    expect(normalizeAddress("Av. Industrias  #123, Col. Centro")).toBe(
      normalizeAddress("av industrias 123 col centro"),
    );
  });

  it("quita acentos y diacríticos", () => {
    expect(normalizeAddress("Avenida Cañón")).toBe("avenida canon");
  });

  it("colapsa espacios repetidos y recorta los extremos", () => {
    expect(normalizeAddress("  a   b  ")).toBe("a b");
  });

  it("reemplaza puntuación por espacios", () => {
    expect(normalizeAddress("a-b.c")).toBe("a b c");
  });
});
