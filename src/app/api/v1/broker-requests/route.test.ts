import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../../server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../../server/auth/session.ts");
const { db } = await import("../../../../lib/db/client.ts");
const { usuario } = await import("../../../../lib/db/schema.ts");
const { resetTestDatabase } = await import("../../../../../tests/helpers/reset-db.ts");
const { POST } = await import("./route.ts");

type ActorFixture = Awaited<ReturnType<typeof getUsuarioActual>>;

function actorFixture(
  rol: "buscador" | "oferente" | "admin" = "oferente",
): NonNullable<ActorFixture> {
  return {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Actor de prueba",
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
}

function actuarComo(actor: ActorFixture) {
  vi.mocked(getUsuarioActual).mockResolvedValue(actor);
}

async function insertarUsuario(actor: NonNullable<ActorFixture>) {
  await db
    .insert(usuario)
    .values({ id: actor.id, email: actor.email, nombre: actor.nombre, rol: actor.rol });
}

function request(body: unknown) {
  return new Request("http://localhost/api/v1/broker-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/broker-requests / empresa", () => {
  it("body sin empresa responde 422 validation_error", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(request({ mensaje: "Quiero ser broker" }));
    expect(respuesta.status).toBe(422);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("validation_error");
  });

  it("empresa vacío tras trim() responde 422 validation_error", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(request({ mensaje: "Quiero ser broker", empresa: "   " }));
    expect(respuesta.status).toBe(422);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("validation_error");
  });

  it("mensaje y empresa válidos responden 201", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(
      request({ mensaje: "Quiero ser broker", empresa: "Inmobiliaria Norte" }),
    );
    expect(respuesta.status).toBe(201);
  });
});
