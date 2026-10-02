import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { resetTestDatabase } from "../../../tests/helpers/reset-db.ts";
import { db } from "../../lib/db/client.ts";
import { usuario } from "../../lib/db/schema.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { crearSolicitudBroker } from "./mutations.ts";

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

describe("crearSolicitudBroker / empresa", () => {
  it("con { mensaje, empresa } inserta la fila con ambos valores", async () => {
    await resetTestDatabase();
    const actor = await crearFilaOferente();

    const resultado = await crearSolicitudBroker(actor, {
      mensaje: "Quiero ser broker",
      empresa: "Inmobiliaria Norte",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("no se creó");
    expect(resultado.data.mensaje).toBe("Quiero ser broker");
    expect(resultado.data.empresa).toBe("Inmobiliaria Norte");
  });

  it("el actor ya tiene una solicitud pendiente: sigue respondiendo conflict_pending_broker_request sin que empresa cambie ese comportamiento", async () => {
    await resetTestDatabase();
    const actor = await crearFilaOferente();

    const primera = await crearSolicitudBroker(actor, {
      mensaje: "Primera solicitud",
      empresa: "Empresa A",
    });
    expect(primera.ok).toBe(true);

    const segunda = await crearSolicitudBroker(actor, {
      mensaje: "Segunda solicitud",
      empresa: "Empresa B",
    });
    expect(segunda.ok).toBe(false);
    if (segunda.ok) throw new Error("no debía crearse");
    expect(segunda.error.code).toBe("conflict_pending_broker_request");
  });
});
