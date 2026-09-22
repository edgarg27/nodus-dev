import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../../src/lib/db/schema.ts";
import type { Rol } from "../../../src/server/auth/guards.ts";
import type { ActorAutenticado } from "../../../src/server/auth/session.ts";
import { crearPropiedad } from "../../../src/server/properties/mutations.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

function actorFixture(rol: ActorAutenticado["rol"]): ActorAutenticado {
  const id = randomUUID();
  return {
    id,
    email: `nodus-test+${id}@example.com`,
    nombre: "Actor de prueba",
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
}

const INPUT_BASE = {
  tipo: "nave_industrial" as const,
  modalidad: "renta" as const,
  direccion: "Av. Sin Broker 1",
  lat: "22.100000",
  lng: "-100.900000",
  estado: "SLP" as const,
  ciudad: "San Luis Potosí",
  descripcion: "Nave sin broker",
};

describe("crearPropiedad sin broker_code", () => {
  it("oferente con is_broker=false y broker_code=null crea la propiedad pendiente", async () => {
    await resetTestDatabase();
    const actor = actorFixture("oferente");
    await db
      .insert(usuario)
      .values({ id: actor.id, email: actor.email, nombre: actor.nombre, rol: "oferente" });

    const resultado = await crearPropiedad(actor, INPUT_BASE);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("no se creó");
    expect(resultado.data.estadoPublicacion).toBe("pendiente");
  });

  it("un buscador o un admin reciben forbidden sin insertar ninguna fila", async () => {
    await resetTestDatabase();

    for (const rol of ["buscador", "admin"] satisfies Rol[]) {
      const actor = actorFixture(rol);
      await db
        .insert(usuario)
        .values({ id: actor.id, email: actor.email, nombre: actor.nombre, rol });

      const resultado = await crearPropiedad(actor, {
        ...INPUT_BASE,
        direccion: `${INPUT_BASE.direccion} ${rol}`,
      });
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.error.code).toBe("forbidden");
    }

    const filas = await db.select().from(propiedad);
    expect(filas).toHaveLength(0);
  });
});
