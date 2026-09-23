import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { brokerSolicitud, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { POST } = await import("../../../src/app/api/v1/broker-requests/route.ts");

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

async function insertarUsuario(actor: NonNullable<ActorFixture>) {
  await db.insert(usuario).values({
    id: actor.id,
    email: actor.email,
    nombre: actor.nombre,
    rol: actor.rol,
    isBroker: actor.isBroker,
    brokerCode: actor.brokerCode,
  });
}

function request(body: unknown) {
  return new Request("http://localhost/api/v1/broker-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/broker-requests — alta", () => {
  it("oferente sin broker y sin pendiente crea la solicitud pendiente", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(request({ mensaje: "Inmobiliaria Norte, 12 años en SLP" }));
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.estado).toBe("pendiente");

    const [fila] = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.usuarioId, oferente.id));
    expect(fila?.estado).toBe("pendiente");
  });
});

describe("POST /api/v1/broker-requests — 409 pendiente", () => {
  it("una segunda solicitud mientras hay una pendiente responde 409 sin crear una segunda fila", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const primera = await POST(request({ mensaje: "Primera solicitud" }));
    expect(primera.status).toBe(201);

    const segunda = await POST(request({ mensaje: "Segunda solicitud" }));
    expect(segunda.status).toBe(409);
    const cuerpo = await segunda.json();
    expect(cuerpo.error.code).toBe("conflict_pending_broker_request");

    const filas = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.usuarioId, oferente.id));
    expect(filas).toHaveLength(1);
  });

  it("dos solicitudes simultáneas del mismo oferente producen exactamente un 201 y un 409", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const [resultadoA, resultadoB] = await Promise.all([
      POST(request({ mensaje: "Solicitud A" })),
      POST(request({ mensaje: "Solicitud B" })),
    ]);
    const estados = [resultadoA.status, resultadoB.status].sort();
    expect(estados).toEqual([201, 409]);

    const filas = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.usuarioId, oferente.id));
    expect(filas).toHaveLength(1);
  });
});

describe("POST /api/v1/broker-requests — tras denegada", () => {
  it("con la solicitud anterior denegada, permite enviar una nueva", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    const admin = actorFixture("admin");
    await insertarUsuario(oferente);
    await insertarUsuario(admin);

    await db.insert(brokerSolicitud).values({
      usuarioId: oferente.id,
      mensaje: "Solicitud vieja",
      estado: "denegada",
      motivoDenegacion: "Faltan referencias",
      resueltaPor: admin.id,
      resueltaEn: new Date(),
    });

    actuarComo(oferente);
    const respuesta = await POST(request({ mensaje: "Solicitud nueva" }));
    expect(respuesta.status).toBe(201);
  });
});

describe("POST /api/v1/broker-requests — autorización", () => {
  it("buscador y admin reciben 403; sin sesión responde 401", async () => {
    await resetTestDatabase();

    actuarComo(null);
    expect((await POST(request({ mensaje: "x" }))).status).toBe(401);

    for (const rol of ["buscador", "admin"] as const) {
      const actor = actorFixture(rol);
      await insertarUsuario(actor);
      actuarComo(actor);
      expect((await POST(request({ mensaje: "x" }))).status).toBe(403);
    }
  });
});

describe("POST /api/v1/broker-requests — ya es broker", () => {
  it("un oferente con is_broker = true responde 409 conflict_already_broker", async () => {
    await resetTestDatabase();
    const broker = actorFixture("oferente", {
      isBroker: true,
      brokerCode: `BRK-${randomUUID().slice(0, 6)}`,
    });
    await insertarUsuario(broker);
    actuarComo(broker);

    const respuesta = await POST(request({ mensaje: "Quiero seguir siendo broker" }));
    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("conflict_already_broker");
  });
});

describe("POST /api/v1/broker-requests — validación del mensaje", () => {
  it("mensaje ausente, vacío, en blanco o de más de 500 caracteres responde 422 sin insertar fila", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    expect((await POST(request({}))).status).toBe(422);
    expect((await POST(request({ mensaje: "" }))).status).toBe(422);
    expect((await POST(request({ mensaje: "   " }))).status).toBe(422);
    expect((await POST(request({ mensaje: "a".repeat(501) }))).status).toBe(422);

    const filas = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.usuarioId, oferente.id));
    expect(filas).toHaveLength(0);
  });
});
