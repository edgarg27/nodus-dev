import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { contactRequest, propiedad, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { POST } = await import("../../../src/app/api/v1/contact-requests/route.ts");

type ActorFixture = Awaited<ReturnType<typeof getUsuarioActual>>;

function actorFixture(
  rol: "buscador" | "oferente" | "admin",
  overrides: Record<string, unknown> = {},
): NonNullable<ActorFixture> {
  return {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Actor de prueba",
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
    ...overrides,
  };
}

function actuarComo(actor: ActorFixture) {
  vi.mocked(getUsuarioActual).mockResolvedValue(actor);
}

async function insertarUsuario(
  actor: NonNullable<ActorFixture>,
  overrides: Record<string, unknown> = {},
) {
  await db.insert(usuario).values({
    id: actor.id,
    email: actor.email,
    nombre: actor.nombre,
    rol: actor.rol,
    isBroker: actor.isBroker,
    brokerCode: actor.brokerCode,
    referralBrokerId: actor.referralBrokerId,
    ...overrides,
  });
}

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Contacto ${randomUUID()}`,
    direccionNormalizada: `av contacto ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de contacto",
    activo: true,
    estadoPublicacion: "publicada" as const,
    ...overrides,
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/v1/contact-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/contact-requests", () => {
  it("buscador sin referral_broker_id crea el lead con broker_id null", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente, { telefono: "4441234567" });
    const [propia] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
    if (!propia) throw new Error("fixture no se creó");

    const buscador = actorFixture("buscador");
    await insertarUsuario(buscador);
    actuarComo(buscador);

    const respuesta = await POST(
      request({ propiedad_id: propia.id, quiere_financiamiento: false }),
    );
    expect(respuesta.status).toBe(201);

    const [fila] = await db
      .select()
      .from(contactRequest)
      .where(eq(contactRequest.propiedadId, propia.id));
    expect(fila?.brokerId).toBeNull();
  });

  it("buscador con broker vigente copia el broker_id automáticamente", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente, { telefono: "4441234567" });
    const [propia] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
    if (!propia) throw new Error("fixture no se creó");

    const broker = actorFixture("oferente");
    await insertarUsuario(broker, {
      isBroker: true,
      brokerCode: `BRK-${randomUUID().slice(0, 6)}`,
    });

    const buscador = actorFixture("buscador", { referralBrokerId: broker.id });
    await insertarUsuario(buscador, { referralBrokerId: broker.id });
    actuarComo(buscador);

    const respuesta = await POST(
      request({ propiedad_id: propia.id, quiere_financiamiento: false }),
    );
    expect(respuesta.status).toBe(201);

    const [fila] = await db
      .select()
      .from(contactRequest)
      .where(eq(contactRequest.propiedadId, propia.id));
    expect(fila?.brokerId).toBe(broker.id);
  });

  it("oferente y admin reciben 403", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente, { telefono: "4441234567" });
    const [propia] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
    if (!propia) throw new Error("fixture no se creó");

    actuarComo(oferente);
    const respuestaOferente = await POST(
      request({ propiedad_id: propia.id, quiere_financiamiento: false }),
    );
    expect(respuestaOferente.status).toBe(403);

    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    actuarComo(admin);
    const respuestaAdmin = await POST(
      request({ propiedad_id: propia.id, quiere_financiamiento: false }),
    );
    expect(respuestaAdmin.status).toBe(403);
  });

  it("propiedad inactiva, pendiente o rechazada responde 404 sin insertar fila", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente, { telefono: "4441234567" });
    const [inactiva] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { activo: false }))
      .returning();
    const [pendiente] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { estadoPublicacion: "pendiente" }))
      .returning();
    const [rechazada] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { estadoPublicacion: "rechazada", motivoRechazo: "x" }))
      .returning();
    if (!inactiva || !pendiente || !rechazada) throw new Error("fixtures no se crearon");

    const buscador = actorFixture("buscador");
    await insertarUsuario(buscador);
    actuarComo(buscador);

    for (const propia of [inactiva, pendiente, rechazada]) {
      const respuesta = await POST(
        request({ propiedad_id: propia.id, quiere_financiamiento: false }),
      );
      expect(respuesta.status).toBe(404);
    }

    const filas = await db.select().from(contactRequest);
    expect(filas).toHaveLength(0);
  });

  it("un broker revocado no recibe atribución nueva y sus leads previos no cambian", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente, { telefono: "4441234567" });
    const [propia] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
    if (!propia) throw new Error("fixture no se creó");

    const broker = actorFixture("oferente");
    await insertarUsuario(broker, {
      isBroker: true,
      brokerCode: `BRK-${randomUUID().slice(0, 6)}`,
    });

    const buscador = actorFixture("buscador", { referralBrokerId: broker.id });
    await insertarUsuario(buscador, { referralBrokerId: broker.id });
    actuarComo(buscador);

    const primerLead = await POST(
      request({ propiedad_id: propia.id, quiere_financiamiento: false }),
    );
    expect(primerLead.status).toBe(201);

    // Simula la revocación (paso 30): is_broker pasa a false y se limpia broker_code.
    await db
      .update(usuario)
      .set({ isBroker: false, brokerCode: null })
      .where(eq(usuario.id, broker.id));

    const [otraPropia] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id))
      .returning();
    if (!otraPropia) throw new Error("fixture no se creó");

    const segundoLead = await POST(
      request({ propiedad_id: otraPropia.id, quiere_financiamiento: false }),
    );
    expect(segundoLead.status).toBe(201);

    const filas = await db.select().from(contactRequest);
    const leadAntiguo = filas.find((f) => f.propiedadId === propia.id);
    const leadNuevo = filas.find((f) => f.propiedadId === otraPropia.id);
    expect(leadAntiguo?.brokerId).toBe(broker.id);
    expect(leadNuevo?.brokerId).toBeNull();
  });

  it("respuesta exitosa incluye teléfono y whatsapp_url del oferente dueño", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente, { telefono: "444 123 4567" });
    const [propia] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
    if (!propia) throw new Error("fixture no se creó");

    const buscador = actorFixture("buscador");
    await insertarUsuario(buscador);
    actuarComo(buscador);

    const respuesta = await POST(request({ propiedad_id: propia.id, quiere_financiamiento: true }));
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.telefono_oferente).toBe("444 123 4567");
    expect(cuerpo.data.whatsapp_url).toContain("4441234567");
  });
});
