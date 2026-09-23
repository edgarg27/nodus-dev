import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const {
  brokerAtribucionHistorica,
  brokerRevocacion,
  brokerSolicitud,
  contactRequest,
  propiedad,
  usuario,
} = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { ultimaRevocacionDe } = await import("../../../src/server/broker-requests/queries.ts");
const { aprobarSolicitud } = await import("../../../src/server/broker-requests/resolve.ts");
const { crearSolicitudBroker } = await import("../../../src/server/broker-requests/mutations.ts");
const { crearContactRequest } = await import("../../../src/server/contact-requests/mutations.ts");
const { GET } = await import("../../../src/app/api/v1/admin/brokers/route.ts");
const { POST: REVOKE } = await import("../../../src/app/api/v1/admin/brokers/[id]/revoke/route.ts");

type ActorFixture = Awaited<ReturnType<typeof getUsuarioActual>>;

function actorFixture(
  rol: "buscador" | "oferente" | "admin",
  overrides: Partial<NonNullable<ActorFixture>> = {},
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
    referralBrokerId: actor.referralBrokerId,
  });
}

async function crearPropiedadPublicada(oferenteId: string) {
  const [fila] = await db
    .insert(propiedad)
    .values({
      oferenteId,
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion: `Av. Revocación ${randomUUID()}`,
      direccionNormalizada: `av revocacion ${randomUUID()}`,
      lat: "22.150000",
      lng: "-100.970000",
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Propiedad de revocación",
      activo: true,
      estadoPublicacion: "publicada",
    })
    .returning();
  if (!fila) throw new Error("fixture no se creó");
  return fila;
}

function requestRevoke(id: string, body: unknown = { motivo: "Bajo desempeño" }) {
  return {
    request: new Request(`http://localhost/api/v1/admin/brokers/${id}/revoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: { params: Promise.resolve({ id }) },
  };
}

describe("GET /api/v1/admin/brokers", () => {
  it("devuelve solo is_broker=true, por nombre, con broker_code", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const brokerB = actorFixture("oferente", {
      nombre: "Broker B",
      isBroker: true,
      brokerCode: "BRK-BBBBBB",
    } as Partial<NonNullable<ActorFixture>>);
    const brokerA = actorFixture("oferente", {
      isBroker: true,
      brokerCode: "BRK-AAAAAA",
    });
    await db.insert(usuario).values({
      id: brokerA.id,
      email: brokerA.email,
      nombre: "Broker A",
      rol: "oferente",
      isBroker: true,
      brokerCode: "BRK-AAAAAA",
    });
    await db.insert(usuario).values({
      id: brokerB.id,
      email: brokerB.email,
      nombre: "Broker B",
      rol: "oferente",
      isBroker: true,
      brokerCode: "BRK-BBBBBB",
    });
    const noBroker = actorFixture("oferente");
    await insertarUsuario(noBroker);

    actuarComo(admin);
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data).toHaveLength(2);
    expect(cuerpo.data.map((b: { nombre: string }) => b.nombre)).toEqual(["Broker A", "Broker B"]);
    expect(cuerpo.data[0].brokerCode).toBe("BRK-AAAAAA");
  });
});

describe("POST /api/v1/admin/brokers/:id/revoke — con motivo", () => {
  it("responde 200, apaga is_broker, limpia broker_code, y audita con la fotografía de leads", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const broker = actorFixture("oferente", { isBroker: true, brokerCode: "BRK-CCCCCC" });
    await insertarUsuario(broker);
    const propia = await crearPropiedadPublicada(broker.id);

    const buscador = actorFixture("buscador", { referralBrokerId: broker.id });
    await insertarUsuario(buscador);
    actuarComo(buscador);
    const resultadoLead = await crearContactRequest(buscador, {
      propiedadId: propia.id,
      quiereFinanciamiento: false,
    });
    expect(resultadoLead.ok).toBe(true);

    actuarComo(admin);
    const { request, params } = requestRevoke(broker.id, { motivo: "Bajo desempeño" });
    const respuesta = await REVOKE(request, params);
    expect(respuesta.status).toBe(200);

    const [filaUsuario] = await db.select().from(usuario).where(eq(usuario.id, broker.id));
    expect(filaUsuario?.isBroker).toBe(false);
    expect(filaUsuario?.brokerCode).toBeNull();

    const [filaRevocacion] = await db
      .select()
      .from(brokerRevocacion)
      .where(eq(brokerRevocacion.usuarioId, broker.id));
    expect(filaRevocacion?.brokerCode).toBe("BRK-CCCCCC");
    expect(filaRevocacion?.motivo).toBe("Bajo desempeño");
    expect(filaRevocacion?.revocadaPor).toBe(admin.id);
    expect(filaRevocacion?.revocadaEn).not.toBeNull();
    if (!filaRevocacion) throw new Error("no se insertó broker_revocacion");

    const [filaFotografia] = await db
      .select()
      .from(brokerAtribucionHistorica)
      .where(eq(brokerAtribucionHistorica.brokerRevocacionId, filaRevocacion.id));
    expect(filaFotografia?.totalLeads).toBe(1);
    if (resultadoLead.ok) {
      expect(filaFotografia?.contactRequestIds).toEqual([resultadoLead.data.id]);
    }
  });

  it("un broker sin ningún lead se revoca con contact_request_ids vacío y total_leads 0", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const broker = actorFixture("oferente", { isBroker: true, brokerCode: "BRK-DDDDDD" });
    await insertarUsuario(broker);

    actuarComo(admin);
    const { request, params } = requestRevoke(broker.id);
    await REVOKE(request, params);

    const [filaRevocacion] = await db
      .select()
      .from(brokerRevocacion)
      .where(eq(brokerRevocacion.usuarioId, broker.id));
    if (!filaRevocacion) throw new Error("no se insertó broker_revocacion");
    const [filaFotografia] = await db
      .select()
      .from(brokerAtribucionHistorica)
      .where(eq(brokerAtribucionHistorica.brokerRevocacionId, filaRevocacion.id));
    expect(filaFotografia?.contactRequestIds).toEqual([]);
    expect(filaFotografia?.totalLeads).toBe(0);
  });
});

describe("POST /api/v1/admin/brokers/:id/revoke — sin motivo", () => {
  it("responde 422 sin cambiar nada ni insertar filas en broker_revocacion o broker_atribucion_historica", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const broker = actorFixture("oferente", { isBroker: true, brokerCode: "BRK-EEEEEE" });
    await insertarUsuario(broker);
    actuarComo(admin);

    for (const motivo of [undefined, "", "   "]) {
      const body: Record<string, unknown> = motivo === undefined ? {} : { motivo };
      const { request, params } = requestRevoke(broker.id, body);
      const respuesta = await REVOKE(request, params);
      expect(respuesta.status).toBe(422);
    }

    const [fila] = await db.select().from(usuario).where(eq(usuario.id, broker.id));
    expect(fila?.isBroker).toBe(true);
    expect(fila?.brokerCode).toBe("BRK-EEEEEE");
    expect(await db.select().from(brokerRevocacion)).toHaveLength(0);
    expect(await db.select().from(brokerAtribucionHistorica)).toHaveLength(0);
  });
});

describe("POST /api/v1/admin/brokers/:id/revoke — 409 conflict_not_broker", () => {
  it("revocar al mismo usuario otra vez, o a uno que nunca fue broker, responde 409 con una sola fila de auditoría", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const broker = actorFixture("oferente", { isBroker: true, brokerCode: "BRK-FFFFFF" });
    await insertarUsuario(broker);
    const nuncaBroker = actorFixture("oferente");
    await insertarUsuario(nuncaBroker);
    actuarComo(admin);

    const primera = requestRevoke(broker.id);
    const primeraRespuesta = await REVOKE(primera.request, primera.params);
    expect(primeraRespuesta.status).toBe(200);

    const segunda = requestRevoke(broker.id);
    const segundaRespuesta = await REVOKE(segunda.request, segunda.params);
    expect(segundaRespuesta.status).toBe(409);
    const cuerpoSegunda = await segundaRespuesta.json();
    expect(cuerpoSegunda.error.code).toBe("conflict_not_broker");

    const nunca = requestRevoke(nuncaBroker.id);
    expect((await REVOKE(nunca.request, nunca.params)).status).toBe(409);

    expect(await db.select().from(brokerRevocacion)).toHaveLength(1);
    expect(await db.select().from(brokerAtribucionHistorica)).toHaveLength(1);
  });
});

describe("autorización de las rutas de brokers", () => {
  it("sin sesión 401 en ambas rutas; buscador y oferente 404 sin cambiar el broker; id no-uuid 404", async () => {
    await resetTestDatabase();
    const broker = actorFixture("oferente", { isBroker: true, brokerCode: "BRK-GGGGGG" });
    await insertarUsuario(broker);

    actuarComo(null);
    expect((await GET()).status).toBe(401);
    const anonimo = requestRevoke(broker.id);
    expect((await REVOKE(anonimo.request, anonimo.params)).status).toBe(401);

    for (const rol of ["buscador", "oferente"] as const) {
      const actor = actorFixture(rol);
      await insertarUsuario(actor);
      actuarComo(actor);
      expect((await GET()).status).toBe(404);
      const { request, params } = requestRevoke(broker.id);
      expect((await REVOKE(request, params)).status).toBe(404);
    }

    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    actuarComo(admin);
    const noUuid = requestRevoke("no-es-uuid");
    expect((await REVOKE(noUuid.request, noUuid.params)).status).toBe(404);

    const [fila] = await db.select().from(usuario).where(eq(usuario.id, broker.id));
    expect(fila?.isBroker).toBe(true);
  });
});

describe("consecuencias en leads", () => {
  it("un lead existente conserva broker_id tras la revocación; un lead nuevo del mismo buscador tiene broker_id null", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const broker = actorFixture("oferente", { isBroker: true, brokerCode: "BRK-HHHHHH" });
    await insertarUsuario(broker);
    const propiaUno = await crearPropiedadPublicada(broker.id);
    const propiaDos = await crearPropiedadPublicada(broker.id);

    const buscador = actorFixture("buscador", { referralBrokerId: broker.id });
    await insertarUsuario(buscador);
    actuarComo(buscador);
    const leadUno = await crearContactRequest(buscador, {
      propiedadId: propiaUno.id,
      quiereFinanciamiento: false,
    });
    expect(leadUno.ok).toBe(true);

    actuarComo(admin);
    const { request, params } = requestRevoke(broker.id);
    await REVOKE(request, params);

    actuarComo(buscador);
    const leadDos = await crearContactRequest(buscador, {
      propiedadId: propiaDos.id,
      quiereFinanciamiento: false,
    });
    expect(leadDos.ok).toBe(true);

    const [filaLeadUno] = await db
      .select()
      .from(contactRequest)
      .where(eq(contactRequest.propiedadId, propiaUno.id));
    const [filaLeadDos] = await db
      .select()
      .from(contactRequest)
      .where(eq(contactRequest.propiedadId, propiaDos.id));
    expect(filaLeadUno?.brokerId).toBe(broker.id);
    expect(filaLeadDos?.brokerId).toBeNull();
  });
});

describe("consecuencias en registro y reaprobación", () => {
  it("el ?ref= viejo no resuelve, y tras reaprobar con código nuevo, los leads nuevos de sus referidos se atribuyen otra vez", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const broker = actorFixture("oferente", { isBroker: true, brokerCode: "BRK-JJJJJJ" });
    await insertarUsuario(broker);
    const propiaUno = await crearPropiedadPublicada(broker.id);

    const buscador = actorFixture("buscador", { referralBrokerId: broker.id });
    await insertarUsuario(buscador);
    actuarComo(buscador);
    await crearContactRequest(buscador, { propiedadId: propiaUno.id, quiereFinanciamiento: false });

    actuarComo(admin);
    const { request, params } = requestRevoke(broker.id);
    await REVOKE(request, params);

    // ?ref= viejo ya no resuelve: simula el aprovisionamiento JIT con el código viejo.
    const [brokerActual] = await db.select().from(usuario).where(eq(usuario.id, broker.id));
    expect(brokerActual?.brokerCode).toBeNull();

    // El broker envía una solicitud nueva y se aprueba con un código distinto.
    actuarComo({ ...broker, isBroker: false, brokerCode: null });
    const nuevaSolicitud = await crearSolicitudBroker(
      { ...broker, isBroker: false, brokerCode: null },
      "Quiero volver a ser broker",
    );
    expect(nuevaSolicitud.ok).toBe(true);
    if (!nuevaSolicitud.ok) throw new Error("se esperaba ok");

    actuarComo(admin);
    const aprobacion = await aprobarSolicitud(admin, nuevaSolicitud.data.id);
    expect(aprobacion.ok).toBe(true);
    if (!aprobacion.ok) throw new Error("se esperaba ok");
    expect(aprobacion.data.brokerCode).not.toBe("BRK-JJJJJJ");

    // El buscador conservó referral_broker_id === broker.id, así que su siguiente lead se atribuye
    // otra vez, ahora con el código nuevo.
    const propiaDos = await crearPropiedadPublicada(broker.id);
    actuarComo(buscador);
    const leadNuevo = await crearContactRequest(buscador, {
      propiedadId: propiaDos.id,
      quiereFinanciamiento: false,
    });
    expect(leadNuevo.ok).toBe(true);
    if (leadNuevo.ok) {
      const [filaLeadNuevo] = await db
        .select()
        .from(contactRequest)
        .where(eq(contactRequest.id, leadNuevo.data.id));
      expect(filaLeadNuevo?.brokerId).toBe(broker.id);
    }
  });

  it("un broker sembrado sin ninguna broker_solicitud también se puede revocar y queda visible en ultimaRevocacionDe", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    const brokerSembrado = actorFixture("oferente", { isBroker: true, brokerCode: "BRK-DEMO" });
    await insertarUsuario(brokerSembrado);
    const solicitudesPrevias = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.usuarioId, brokerSembrado.id));
    expect(solicitudesPrevias).toHaveLength(0);

    actuarComo(admin);
    const { request, params } = requestRevoke(brokerSembrado.id, { motivo: "Reestructuración" });
    const respuesta = await REVOKE(request, params);
    expect(respuesta.status).toBe(200);

    const ultima = await ultimaRevocacionDe(brokerSembrado.id);
    expect(ultima).not.toBeNull();
    expect(ultima?.brokerCode).toBe("BRK-DEMO");
  });
});
