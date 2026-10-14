import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { brokerSolicitud, usuario } from "../../../src/lib/db/schema.ts";
import type { ActorAutenticado } from "../../../src/server/auth/session.ts";
import * as brokerCode from "../../../src/server/broker-requests/broker-code.ts";
import { aprobarSolicitud, denegarSolicitud } from "../../../src/server/broker-requests/resolve.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

function actorFixture(
  rol: "buscador" | "propietario" | "admin",
  overrides: Partial<ActorAutenticado> = {},
): ActorAutenticado {
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

async function insertarUsuario(actor: ActorAutenticado) {
  await db.insert(usuario).values({
    id: actor.id,
    email: actor.email,
    nombre: actor.nombre,
    rol: actor.rol,
    isBroker: actor.isBroker,
    brokerCode: actor.brokerCode,
  });
}

async function crearSolicitudPendiente(usuarioId: string) {
  const [fila] = await db
    .insert(brokerSolicitud)
    .values({ usuarioId, mensaje: "Quiero ser broker" })
    .returning();
  if (!fila) throw new Error("fixture no se creó");
  return fila;
}

describe("aprobarSolicitud", () => {
  it("aprueba: fila aprobada, resuelta_por/resuelta_en, usuario con is_broker y broker_code válido", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    const propietario = actorFixture("propietario");
    await insertarUsuario(admin);
    await insertarUsuario(propietario);
    const solicitud = await crearSolicitudPendiente(propietario.id);

    const resultado = await aprobarSolicitud(admin, solicitud.id);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("se esperaba ok");
    expect(resultado.data.estado).toBe("aprobada");
    expect(resultado.data.resueltaPor).toBe(admin.id);
    expect(resultado.data.resueltaEn).not.toBeNull();

    const [fila] = await db.select().from(usuario).where(eq(usuario.id, propietario.id));
    expect(fila?.isBroker).toBe(true);
    expect(fila?.brokerCode).toMatch(/^BRK-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("una solicitud de dueño solo lo verifica: sin is_broker ni broker_code", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    const dueno = actorFixture("propietario");
    await insertarUsuario(admin);
    await insertarUsuario(dueno);
    const [solicitud] = await db
      .insert(brokerSolicitud)
      .values({ usuarioId: dueno.id, mensaje: "Soy el dueño", tipo: "dueno" })
      .returning();
    if (!solicitud) throw new Error("fixture no se creó");

    const resultado = await aprobarSolicitud(admin, solicitud.id);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("se esperaba ok");
    expect(resultado.data.brokerCode).toBeNull();

    const [fila] = await db.select().from(usuario).where(eq(usuario.id, dueno.id));
    expect(fila?.duenoVerificado).toBe(true);
    expect(fila?.isBroker).toBe(false);
    expect(fila?.brokerCode).toBeNull();
  });

  it("colisión de broker_code: reintenta con otro y aprueba; dos propietarios obtienen códigos distintos", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    const ocupado = "BRK-AAAAAA";
    const propietarioConCodigoOcupado = actorFixture("propietario", {
      isBroker: true,
      brokerCode: ocupado,
    });
    const propietarioUno = actorFixture("propietario");
    const propietarioDos = actorFixture("propietario");
    await insertarUsuario(admin);
    await insertarUsuario(propietarioConCodigoOcupado);
    await insertarUsuario(propietarioUno);
    await insertarUsuario(propietarioDos);

    const solicitudUno = await crearSolicitudPendiente(propietarioUno.id);
    vi.spyOn(brokerCode, "generarBrokerCode")
      .mockReturnValueOnce(ocupado)
      .mockReturnValueOnce("BRK-BBBBBB");
    const resultadoUno = await aprobarSolicitud(admin, solicitudUno.id);
    expect(resultadoUno.ok).toBe(true);

    const [filaUno] = await db.select().from(usuario).where(eq(usuario.id, propietarioUno.id));
    expect(filaUno?.brokerCode).toBe("BRK-BBBBBB");

    vi.restoreAllMocks();
    const solicitudDos = await crearSolicitudPendiente(propietarioDos.id);
    const resultadoDos = await aprobarSolicitud(admin, solicitudDos.id);
    expect(resultadoDos.ok).toBe(true);

    const [filaDos] = await db.select().from(usuario).where(eq(usuario.id, propietarioDos.id));
    expect(filaDos?.brokerCode).not.toBe(filaUno?.brokerCode);
  });

  it("agotamiento tras 5 intentos: revierte toda la transacción", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    const ocupado = "BRK-CCCCCC";
    const conCodigoOcupado = actorFixture("propietario", { isBroker: true, brokerCode: ocupado });
    const propietario = actorFixture("propietario");
    await insertarUsuario(admin);
    await insertarUsuario(conCodigoOcupado);
    await insertarUsuario(propietario);
    const solicitud = await crearSolicitudPendiente(propietario.id);

    vi.spyOn(brokerCode, "generarBrokerCode").mockReturnValue(ocupado);

    await expect(aprobarSolicitud(admin, solicitud.id)).rejects.toThrow();

    const [filaSolicitud] = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.id, solicitud.id));
    expect(filaSolicitud?.estado).toBe("pendiente");

    const [filaUsuario] = await db.select().from(usuario).where(eq(usuario.id, propietario.id));
    expect(filaUsuario?.isBroker).toBe(false);
    expect(filaUsuario?.brokerCode).toBeNull();
  });
});

describe("denegarSolicitud", () => {
  it("con motivo deja denegada y guarda el motivo; sin motivo, motivo_denegacion nulo; is_broker sigue false", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    const propietarioUno = actorFixture("propietario");
    const propietarioDos = actorFixture("propietario");
    await insertarUsuario(admin);
    await insertarUsuario(propietarioUno);
    await insertarUsuario(propietarioDos);

    const solicitudUno = await crearSolicitudPendiente(propietarioUno.id);
    const resultadoUno = await denegarSolicitud(admin, solicitudUno.id, "Faltan referencias");
    expect(resultadoUno.ok).toBe(true);
    if (!resultadoUno.ok) throw new Error("se esperaba ok");
    expect(resultadoUno.data.estado).toBe("denegada");
    expect(resultadoUno.data.motivoDenegacion).toBe("Faltan referencias");

    const solicitudDos = await crearSolicitudPendiente(propietarioDos.id);
    const resultadoDos = await denegarSolicitud(admin, solicitudDos.id);
    expect(resultadoDos.ok).toBe(true);
    if (!resultadoDos.ok) throw new Error("se esperaba ok");
    expect(resultadoDos.data.motivoDenegacion).toBeNull();

    const [filaUno] = await db.select().from(usuario).where(eq(usuario.id, propietarioUno.id));
    const [filaDos] = await db.select().from(usuario).where(eq(usuario.id, propietarioDos.id));
    expect(filaUno?.isBroker).toBe(false);
    expect(filaDos?.isBroker).toBe(false);
  });
});

describe("doble resolución", () => {
  it("aprobar→aprobar, aprobar→denegar y denegar→aprobar: la segunda es conflict_already_resolved sin cambios", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    await insertarUsuario(admin);

    const casos: Array<["aprobar" | "denegar", "aprobar" | "denegar"]> = [
      ["aprobar", "aprobar"],
      ["aprobar", "denegar"],
      ["denegar", "aprobar"],
    ];

    for (const [primera, segunda] of casos) {
      const propietario = actorFixture("propietario");
      await insertarUsuario(propietario);
      const solicitud = await crearSolicitudPendiente(propietario.id);

      const resultadoPrimero =
        primera === "aprobar"
          ? await aprobarSolicitud(admin, solicitud.id)
          : await denegarSolicitud(admin, solicitud.id, "motivo");
      expect(resultadoPrimero.ok).toBe(true);
      if (!resultadoPrimero.ok) throw new Error("se esperaba ok");

      const resultadoSegundo =
        segunda === "aprobar"
          ? await aprobarSolicitud(admin, solicitud.id)
          : await denegarSolicitud(admin, solicitud.id, "otro motivo");
      expect(resultadoSegundo.ok).toBe(false);
      if (resultadoSegundo.ok) throw new Error("se esperaba error");
      expect(resultadoSegundo.error.code).toBe("conflict_already_resolved");

      const [filaFinal] = await db
        .select()
        .from(brokerSolicitud)
        .where(eq(brokerSolicitud.id, solicitud.id));
      expect(filaFinal?.resueltaEn?.getTime()).toBe(resultadoPrimero.data.resueltaEn?.getTime());
    }
  });

  it("dos aprobaciones simultáneas: exactamente una ok y una conflict_already_resolved, un único broker_code", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    const propietario = actorFixture("propietario");
    await insertarUsuario(admin);
    await insertarUsuario(propietario);
    const solicitud = await crearSolicitudPendiente(propietario.id);

    const [resultadoA, resultadoB] = await Promise.all([
      aprobarSolicitud(admin, solicitud.id),
      aprobarSolicitud(admin, solicitud.id),
    ]);
    const resultados = [resultadoA, resultadoB];
    const exitosos = resultados.filter((r) => r.ok);
    const fallidos = resultados.filter((r) => !r.ok);
    expect(exitosos).toHaveLength(1);
    expect(fallidos).toHaveLength(1);
    if (!fallidos[0]?.ok) {
      expect(fallidos[0]?.error.code).toBe("conflict_already_resolved");
    }

    const [fila] = await db.select().from(usuario).where(eq(usuario.id, propietario.id));
    expect(fila?.brokerCode).toMatch(/^BRK-[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe("autorización y auto-aprobación", () => {
  it("propietario y buscador como actor, id inexistente y auto-aprobación responden not_found/forbidden", async () => {
    await resetTestDatabase();
    const admin = actorFixture("admin");
    const propietarioDueno = actorFixture("propietario");
    await insertarUsuario(admin);
    await insertarUsuario(propietarioDueno);
    const solicitud = await crearSolicitudPendiente(propietarioDueno.id);

    for (const rol of ["propietario", "buscador"] as const) {
      const actorSinPermiso = actorFixture(rol);
      await insertarUsuario(actorSinPermiso);
      const resultado = await aprobarSolicitud(actorSinPermiso, solicitud.id);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.error.code).toBe("not_found");
    }

    const resultadoInexistente = await aprobarSolicitud(admin, randomUUID());
    expect(resultadoInexistente.ok).toBe(false);
    if (!resultadoInexistente.ok) expect(resultadoInexistente.error.code).toBe("not_found");

    // Auto-aprobación: el propio solicitante pasa a admin y aprueba su solicitud.
    await db.update(usuario).set({ rol: "admin" }).where(eq(usuario.id, propietarioDueno.id));
    const actorAutoAprobacion: ActorAutenticado = { ...propietarioDueno, rol: "admin" };
    const resultadoAuto = await aprobarSolicitud(actorAutoAprobacion, solicitud.id);
    expect(resultadoAuto.ok).toBe(false);
    if (!resultadoAuto.ok) expect(resultadoAuto.error.code).toBe("forbidden");

    const [filaFinal] = await db
      .select()
      .from(brokerSolicitud)
      .where(eq(brokerSolicitud.id, solicitud.id));
    expect(filaFinal?.estado).toBe("pendiente");
    const [filaUsuario] = await db
      .select()
      .from(usuario)
      .where(eq(usuario.id, propietarioDueno.id));
    expect(filaUsuario?.isBroker).toBe(false);
  });
});
