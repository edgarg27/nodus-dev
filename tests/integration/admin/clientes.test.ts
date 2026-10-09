import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { contactRequest, propiedad, seguimientoNota, usuario } = await import(
  "../../../src/lib/db/schema.ts"
);
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { listarClientes, listarAccionesPendientes, contarClientesPorAtender } = await import(
  "../../../src/server/clientes/queries.ts"
);
const { obtenerCliente } = await import("../../../src/server/clientes/detalle.ts");
const { PATCH } = await import("../../../src/app/api/v1/admin/solicitudes/[id]/route.ts");
const { POST: POST_NOTA } = await import(
  "../../../src/app/api/v1/admin/clientes/[id]/notas/route.ts"
);

type ActorFixture = NonNullable<Awaited<ReturnType<typeof getUsuarioActual>>>;

async function crearUsuario(rol: "buscador" | "oferente" | "admin"): Promise<ActorFixture> {
  const actor: ActorFixture = {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: `Usuario ${rol}`,
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
  await db
    .insert(usuario)
    .values({ id: actor.id, email: actor.email, nombre: actor.nombre, rol: actor.rol });
  return actor;
}

async function crearPropiedad(oferenteId: string) {
  const [fila] = await db
    .insert(propiedad)
    .values({
      oferenteId,
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion: `Av. Clientes ${randomUUID()}`,
      direccionNormalizada: `av clientes ${randomUUID()}`,
      lat: "22.150000",
      lng: "-100.970000",
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Propiedad de clientes",
      activo: true,
      estadoPublicacion: "publicada",
    })
    .returning();
  if (!fila) throw new Error("fixture no se creó");
  return fila;
}

const PARAMS = { q: "", vista: "solicitudes" as const, estado: null, pagina: 1 };

function peticion(url: string, metodo: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rutaCon(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Un admin, un oferente con una propiedad y dos buscadores: uno con solicitud para Captive y otro
// solo registrado.
async function preparar() {
  await resetTestDatabase();
  const admin = await crearUsuario("admin");
  const oferente = await crearUsuario("oferente");
  const conSolicitud = await crearUsuario("buscador");
  const registrado = await crearUsuario("buscador");
  const propia = await crearPropiedad(oferente.id);
  const [solicitud] = await db
    .insert(contactRequest)
    .values({
      buscadorId: conSolicitud.id,
      propiedadId: propia.id,
      oferenteId: oferente.id,
      quiereFinanciamiento: true,
      canal: "captive",
    })
    .returning();
  if (!solicitud) throw new Error("fixture no se creó");
  return { admin, oferente, conSolicitud, registrado, propia, solicitud };
}

describe("Clientes y prospectos — consultas", () => {
  it("solo un admin ve la lista; la vista por omisión trae a quien pidió informes", async () => {
    const { admin, oferente, conSolicitud, registrado } = await preparar();

    expect((await listarClientes(oferente, PARAMS)).clientes).toHaveLength(0);
    expect((await listarClientes(null, PARAMS)).clientes).toHaveLength(0);

    const conSolicitudes = await listarClientes(admin, PARAMS);
    expect(conSolicitudes.clientes.map((c) => c.id)).toEqual([conSolicitud.id]);
    expect(conSolicitudes.clientes[0]?.estado).toBe("pendiente");
    expect(conSolicitudes.clientes[0]?.quiereFinanciamiento).toBe(true);

    const registrados = await listarClientes(admin, { ...PARAMS, vista: "registrados" });
    expect(registrados.clientes.map((c) => c.id).sort()).toEqual(
      [conSolicitud.id, registrado.id].sort(),
    );
  });

  it("la vista con solicitudes también trae a quien solo tiene solicitudes anteriores", async () => {
    const { admin, oferente, conSolicitud, propia } = await preparar();
    const anterior = await crearUsuario("buscador");
    await db.insert(contactRequest).values({
      buscadorId: anterior.id,
      propiedadId: propia.id,
      oferenteId: oferente.id,
      canal: "directo",
    });

    const lista = await listarClientes(admin, PARAMS);
    expect(lista.clientes.map((c) => c.id).sort()).toEqual([conSolicitud.id, anterior.id].sort());
    // El contador del menú sigue contando solo las nuevas (canal "captive").
    expect(await contarClientesPorAtender()).toBe(1);
  });

  it("el detalle trae la solicitud con el oferente al que hay que llamarle", async () => {
    const { admin, oferente, conSolicitud, propia } = await preparar();
    const detalle = await obtenerCliente(admin, conSolicitud.id);
    expect(detalle?.solicitudes).toHaveLength(1);
    expect(detalle?.solicitudes[0]?.propiedad.id).toBe(propia.id);
    expect(detalle?.solicitudes[0]?.oferente.id).toBe(oferente.id);

    expect(await obtenerCliente(oferente, conSolicitud.id)).toBeNull();
    expect(await obtenerCliente(admin, admin.id)).toBeNull();
  });

  it("el contador del menú cuenta solicitudes nuevas y próximas acciones vencidas", async () => {
    const { admin, solicitud } = await preparar();
    expect(await contarClientesPorAtender()).toBe(1);

    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db
      .update(contactRequest)
      .set({ paso: "broker_contactado", proximaAccion: "Llamar al broker", proximaAccionEn: ayer })
      .where(eq(contactRequest.id, solicitud.id));
    expect(await contarClientesPorAtender()).toBe(1);
    const acciones = await listarAccionesPendientes(admin);
    expect(acciones.map((a) => a.solicitudId)).toEqual([solicitud.id]);
    expect(acciones[0]?.vencida).toBe(true);

    await db
      .update(contactRequest)
      .set({ paso: "cerrada" })
      .where(eq(contactRequest.id, solicitud.id));
    expect(await contarClientesPorAtender()).toBe(0);
  });
});

describe("PATCH /api/v1/admin/solicitudes/:id", () => {
  it("cambia el paso y la próxima acción; el cambio de paso queda en la bitácora", async () => {
    const { admin, conSolicitud, solicitud } = await preparar();
    vi.mocked(getUsuarioActual).mockResolvedValue(admin);
    const url = `/api/v1/admin/solicitudes/${solicitud.id}`;
    const cuerpo = {
      paso: "disponible",
      proxima_accion: { texto: "Avisar al cliente", en: "2026-10-10T16:00:00.000Z" },
      comentario: "  El broker confirma disponibilidad  ",
    };

    const respuesta = await PATCH(peticion(url, "PATCH", cuerpo), rutaCon(solicitud.id));
    expect(respuesta.status).toBe(200);
    const [fila] = await db
      .select()
      .from(contactRequest)
      .where(eq(contactRequest.id, solicitud.id));
    expect(fila?.paso).toBe("disponible");
    expect(fila?.proximaAccion).toBe("Avisar al cliente");

    const notas = await db.select().from(seguimientoNota);
    expect(notas.map((n) => [n.tipo, n.texto]).sort()).toEqual(
      [
        ["nota", "El broker confirma disponibilidad"],
        ["paso", "disponible"],
      ].sort(),
    );
    expect(notas.every((n) => n.autorId === admin.id && n.contactRequestId === solicitud.id)).toBe(
      true,
    );

    // Repetir sin comentario no agrega nada a la bitácora.
    const { comentario: _c, ...sinComentario } = cuerpo;
    await PATCH(peticion(url, "PATCH", sinComentario), rutaCon(solicitud.id));
    expect(await db.select().from(seguimientoNota)).toHaveLength(2);

    const detalle = await obtenerCliente(admin, conSolicitud.id);
    expect(detalle?.estado).toBe("seguimiento");
  });

  it("al cerrar la solicitud se borra la próxima acción", async () => {
    const { admin, solicitud } = await preparar();
    vi.mocked(getUsuarioActual).mockResolvedValue(admin);
    await PATCH(
      peticion(`/api/v1/admin/solicitudes/${solicitud.id}`, "PATCH", {
        paso: "cerrada",
        proxima_accion: { texto: "Algo", en: "2026-10-10T16:00:00.000Z" },
      }),
      rutaCon(solicitud.id),
    );
    const [fila] = await db
      .select()
      .from(contactRequest)
      .where(eq(contactRequest.id, solicitud.id));
    expect(fila?.paso).toBe("cerrada");
    expect(fila?.proximaAccion).toBeNull();
    expect(fila?.proximaAccionEn).toBeNull();
  });

  it("401 sin sesión, 404 a otro rol o a una solicitud anterior, 422 con un paso inválido", async () => {
    const { admin, oferente, conSolicitud, propia, solicitud } = await preparar();
    const url = `/api/v1/admin/solicitudes/${solicitud.id}`;
    const valido = { paso: "broker_contactado", proxima_accion: null };

    vi.mocked(getUsuarioActual).mockResolvedValue(null);
    expect((await PATCH(peticion(url, "PATCH", valido), rutaCon(solicitud.id))).status).toBe(401);

    vi.mocked(getUsuarioActual).mockResolvedValue(oferente);
    expect((await PATCH(peticion(url, "PATCH", valido), rutaCon(solicitud.id))).status).toBe(404);

    vi.mocked(getUsuarioActual).mockResolvedValue(admin);
    expect(
      (
        await PATCH(
          peticion(url, "PATCH", { paso: "ganada", proxima_accion: null }),
          rutaCon(solicitud.id),
        )
      ).status,
    ).toBe(422);

    const [anterior] = await db
      .insert(contactRequest)
      .values({
        buscadorId: conSolicitud.id,
        propiedadId: propia.id,
        oferenteId: oferente.id,
        canal: "directo",
      })
      .returning();
    if (!anterior) throw new Error("fixture no se creó");
    expect(
      (
        await PATCH(
          peticion(`/api/v1/admin/solicitudes/${anterior.id}`, "PATCH", valido),
          rutaCon(anterior.id),
        )
      ).status,
    ).toBe(404);
    expect(await db.select().from(seguimientoNota)).toHaveLength(0);
  });
});

describe("POST /api/v1/admin/clientes/:id/notas", () => {
  it("un admin agrega una llamada a la bitácora del cliente", async () => {
    const { admin, conSolicitud } = await preparar();
    vi.mocked(getUsuarioActual).mockResolvedValue(admin);

    const respuesta = await POST_NOTA(
      peticion(`/api/v1/admin/clientes/${conSolicitud.id}/notas`, "POST", {
        tipo: "llamada_broker",
        texto: "  Sí tiene disponible desde noviembre  ",
      }),
      rutaCon(conSolicitud.id),
    );
    expect(respuesta.status).toBe(201);

    const [nota] = await db.select().from(seguimientoNota);
    expect(nota?.texto).toBe("Sí tiene disponible desde noviembre");
    expect(nota?.autorId).toBe(admin.id);
  });

  it("422 con una nota vacía o con el tipo reservado para cambios de paso", async () => {
    const { admin, registrado } = await preparar();
    vi.mocked(getUsuarioActual).mockResolvedValue(admin);
    const url = `/api/v1/admin/clientes/${registrado.id}/notas`;

    for (const cuerpo of [
      { tipo: "nota", texto: "   " },
      { tipo: "paso", texto: "cerrada" },
    ]) {
      const respuesta = await POST_NOTA(peticion(url, "POST", cuerpo), rutaCon(registrado.id));
      expect(respuesta.status).toBe(422);
    }
    expect(await db.select().from(seguimientoNota)).toHaveLength(0);
  });
});
