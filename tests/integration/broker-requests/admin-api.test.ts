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
const { GET } = await import("../../../src/app/api/v1/admin/broker-requests/route.ts");
const { POST: APPROVE } = await import(
  "../../../src/app/api/v1/admin/broker-requests/[id]/approve/route.ts"
);
const { POST: DENY } = await import(
  "../../../src/app/api/v1/admin/broker-requests/[id]/deny/route.ts"
);

type ActorFixture = Awaited<ReturnType<typeof getUsuarioActual>>;

function actorFixture(rol: "buscador" | "oferente" | "admin"): NonNullable<ActorFixture> {
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

async function crearSolicitudPendiente(usuarioId: string, overrides: Record<string, unknown> = {}) {
  const [fila] = await db
    .insert(brokerSolicitud)
    .values({ usuarioId, mensaje: "Quiero ser broker", ...overrides })
    .returning();
  if (!fila) throw new Error("fixture no se creó");
  return fila;
}

function requestApprove(id: string) {
  return {
    request: new Request(`http://localhost/api/v1/admin/broker-requests/${id}/approve`, {
      method: "POST",
    }),
    params: { params: Promise.resolve({ id }) },
  };
}

function requestDeny(id: string, body: unknown = {}) {
  return {
    request: new Request(`http://localhost/api/v1/admin/broker-requests/${id}/deny`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: { params: Promise.resolve({ id }) },
  };
}

describe("autorización de /api/v1/admin/broker-requests", () => {
  it("sin sesión las 3 rutas responden 401", async () => {
    await resetTestDatabase();
    actuarComo(null);

    expect((await GET()).status).toBe(401);
    const { request: reqApprove, params: paramsApprove } = requestApprove(randomUUID());
    expect((await APPROVE(reqApprove, paramsApprove)).status).toBe(401);
    const { request: reqDeny, params: paramsDeny } = requestDeny(randomUUID());
    expect((await DENY(reqDeny, paramsDeny)).status).toBe(401);
  });

  it("buscador y oferente reciben 404 en las 3 rutas, sin cambiar la solicitud", async () => {
    await resetTestDatabase();
    const oferenteDueno = actorFixture("oferente");
    await insertarUsuario(oferenteDueno);
    const solicitud = await crearSolicitudPendiente(oferenteDueno.id);

    for (const rol of ["buscador", "oferente"] as const) {
      const actor = actorFixture(rol);
      await insertarUsuario(actor);
      actuarComo(actor);

      expect((await GET()).status).toBe(404);
      const { request: reqApprove, params: paramsApprove } = requestApprove(solicitud.id);
      expect((await APPROVE(reqApprove, paramsApprove)).status).toBe(404);
      const { request: reqDeny, params: paramsDeny } = requestDeny(solicitud.id);
      expect((await DENY(reqDeny, paramsDeny)).status).toBe(404);
    }

    const [fila] = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.id, solicitud.id));
    expect(fila?.estado).toBe("pendiente");
  });
});

describe("GET /api/v1/admin/broker-requests", () => {
  it("solo devuelve pendiente, la más antigua primero, con los datos del solicitante", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const oferenteUno = actorFixture("oferente");
    const oferenteDos = actorFixture("oferente");
    const oferenteTres = actorFixture("oferente");
    await insertarUsuario(oferenteUno);
    await insertarUsuario(oferenteDos);
    await insertarUsuario(oferenteTres);

    const vieja = await crearSolicitudPendiente(oferenteUno.id);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const nueva = await crearSolicitudPendiente(oferenteDos.id);
    await crearSolicitudPendiente(oferenteTres.id, {
      estado: "aprobada",
      resueltaPor: admin.id,
      resueltaEn: new Date(),
    });

    actuarComo(admin);
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data).toHaveLength(2);
    expect(cuerpo.data[0].id).toBe(vieja.id);
    expect(cuerpo.data[1].id).toBe(nueva.id);
    expect(cuerpo.data[0].usuario).toMatchObject({ id: oferenteUno.id, email: oferenteUno.email });
  });
});

describe("aprobar y denegar", () => {
  it("approve responde 200 con broker_code y deja is_broker=true; deny con y sin motivo responde 200", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const oferenteAprobar = actorFixture("oferente");
    const oferenteDenegarConMotivo = actorFixture("oferente");
    const oferenteDenegarSinMotivo = actorFixture("oferente");
    await insertarUsuario(oferenteAprobar);
    await insertarUsuario(oferenteDenegarConMotivo);
    await insertarUsuario(oferenteDenegarSinMotivo);

    const solicitudAprobar = await crearSolicitudPendiente(oferenteAprobar.id);
    const solicitudDenegarConMotivo = await crearSolicitudPendiente(oferenteDenegarConMotivo.id);
    const solicitudDenegarSinMotivo = await crearSolicitudPendiente(oferenteDenegarSinMotivo.id);

    actuarComo(admin);
    const { request: reqApprove, params: paramsApprove } = requestApprove(solicitudAprobar.id);
    const respuestaApprove = await APPROVE(reqApprove, paramsApprove);
    expect(respuestaApprove.status).toBe(200);
    const cuerpoApprove = await respuestaApprove.json();
    expect(cuerpoApprove.data.broker_code).toMatch(/^BRK-[A-HJ-NP-Z2-9]{6}$/);
    const [filaAprobado] = await db
      .select()
      .from(usuario)
      .where(eq(usuario.id, oferenteAprobar.id));
    expect(filaAprobado?.isBroker).toBe(true);

    const { request: reqDenyConMotivo, params: paramsDenyConMotivo } = requestDeny(
      solicitudDenegarConMotivo.id,
      { motivo: "Faltan referencias" },
    );
    const respuestaDenyConMotivo = await DENY(reqDenyConMotivo, paramsDenyConMotivo);
    expect(respuestaDenyConMotivo.status).toBe(200);
    const [filaDenyConMotivo] = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.id, solicitudDenegarConMotivo.id));
    expect(filaDenyConMotivo?.motivoDenegacion).toBe("Faltan referencias");

    const { request: reqDenySinMotivo, params: paramsDenySinMotivo } = requestDeny(
      solicitudDenegarSinMotivo.id,
    );
    const respuestaDenySinMotivo = await DENY(reqDenySinMotivo, paramsDenySinMotivo);
    expect(respuestaDenySinMotivo.status).toBe(200);
    const [filaDenySinMotivo] = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.id, solicitudDenegarSinMotivo.id));
    expect(filaDenySinMotivo?.motivoDenegacion).toBeNull();
  });
});

describe("409 y 404 de re-resolución e id inválido", () => {
  it("approve dos veces y deny sobre una ya aprobada responden 409; id inexistente y no-uuid responden 404", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    const solicitud = await crearSolicitudPendiente(oferente.id);
    actuarComo(admin);

    const primera = requestApprove(solicitud.id);
    await APPROVE(primera.request, primera.params);

    const segunda = requestApprove(solicitud.id);
    expect((await APPROVE(segunda.request, segunda.params)).status).toBe(409);

    const tercera = requestDeny(solicitud.id);
    expect((await DENY(tercera.request, tercera.params)).status).toBe(409);

    const inexistente = requestApprove(randomUUID());
    expect((await APPROVE(inexistente.request, inexistente.params)).status).toBe(404);

    const noUuid = requestApprove("no-es-uuid");
    expect((await APPROVE(noUuid.request, noUuid.params)).status).toBe(404);
  });
});

describe("validación del motivo al denegar", () => {
  it("motivo de 501 caracteres responde 422 y la solicitud sigue pendiente", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    const solicitud = await crearSolicitudPendiente(oferente.id);
    actuarComo(admin);

    const { request, params } = requestDeny(solicitud.id, { motivo: "a".repeat(501) });
    const respuesta = await DENY(request, params);
    expect(respuesta.status).toBe(422);

    const [fila] = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.id, solicitud.id));
    expect(fila?.estado).toBe("pendiente");
  });
});
