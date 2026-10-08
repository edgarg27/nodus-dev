import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { contactRequest, propiedad, seguimientoCliente, seguimientoNota, usuario } = await import(
  "../../../src/lib/db/schema.ts"
);
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { listarClientes, obtenerCliente, contarClientesPendientes } = await import(
  "../../../src/server/clientes/queries.ts"
);
const { PATCH } = await import("../../../src/app/api/v1/admin/clientes/[id]/route.ts");
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
    expect(await contarClientesPendientes()).toBe(1);
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

  it("el contador del menú cuenta solo clientes con solicitud que siguen pendientes", async () => {
    const { conSolicitud } = await preparar();
    expect(await contarClientesPendientes()).toBe(1);
    await db.insert(seguimientoCliente).values({ buscadorId: conSolicitud.id, estado: "cerrado" });
    expect(await contarClientesPendientes()).toBe(0);
  });
});

describe("PATCH /api/v1/admin/clientes/:id", () => {
  it("un admin cambia la etapa; repetirla deja el mismo resultado", async () => {
    const { admin, conSolicitud } = await preparar();
    vi.mocked(getUsuarioActual).mockResolvedValue(admin);

    for (let vez = 0; vez < 2; vez += 1) {
      const respuesta = await PATCH(
        peticion(`/api/v1/admin/clientes/${conSolicitud.id}`, "PATCH", { estado: "seguimiento" }),
        rutaCon(conSolicitud.id),
      );
      expect(respuesta.status).toBe(200);
    }
    const filas = await db
      .select()
      .from(seguimientoCliente)
      .where(eq(seguimientoCliente.buscadorId, conSolicitud.id));
    expect(filas).toHaveLength(1);
    expect(filas[0]?.estado).toBe("seguimiento");
  });

  it("401 sin sesión, 404 a cualquier otro rol y 422 con una etapa inválida", async () => {
    const { admin, oferente, conSolicitud } = await preparar();
    const url = `/api/v1/admin/clientes/${conSolicitud.id}`;

    vi.mocked(getUsuarioActual).mockResolvedValue(null);
    expect(
      (await PATCH(peticion(url, "PATCH", { estado: "cerrado" }), rutaCon(conSolicitud.id))).status,
    ).toBe(401);

    vi.mocked(getUsuarioActual).mockResolvedValue(oferente);
    expect(
      (await PATCH(peticion(url, "PATCH", { estado: "cerrado" }), rutaCon(conSolicitud.id))).status,
    ).toBe(404);

    vi.mocked(getUsuarioActual).mockResolvedValue(admin);
    expect(
      (await PATCH(peticion(url, "PATCH", { estado: "ganado" }), rutaCon(conSolicitud.id))).status,
    ).toBe(422);
    expect(await db.select().from(seguimientoCliente)).toHaveLength(0);
  });
});

describe("POST /api/v1/admin/clientes/:id/notas", () => {
  it("un admin agrega una llamada ligada a la solicitud del cliente", async () => {
    const { admin, conSolicitud, solicitud } = await preparar();
    vi.mocked(getUsuarioActual).mockResolvedValue(admin);

    const respuesta = await POST_NOTA(
      peticion(`/api/v1/admin/clientes/${conSolicitud.id}/notas`, "POST", {
        tipo: "llamada_broker",
        texto: "  Sí tiene disponible desde noviembre  ",
        contact_request_id: solicitud.id,
      }),
      rutaCon(conSolicitud.id),
    );
    expect(respuesta.status).toBe(201);

    const [nota] = await db.select().from(seguimientoNota);
    expect(nota?.texto).toBe("Sí tiene disponible desde noviembre");
    expect(nota?.autorId).toBe(admin.id);
    expect(nota?.contactRequestId).toBe(solicitud.id);
  });

  it("404 si la solicitud es de otro cliente; 422 con una nota vacía", async () => {
    const { admin, registrado, solicitud } = await preparar();
    vi.mocked(getUsuarioActual).mockResolvedValue(admin);
    const url = `/api/v1/admin/clientes/${registrado.id}/notas`;

    const ajena = await POST_NOTA(
      peticion(url, "POST", { tipo: "nota", texto: "Hola", contact_request_id: solicitud.id }),
      rutaCon(registrado.id),
    );
    expect(ajena.status).toBe(404);

    const vacia = await POST_NOTA(
      peticion(url, "POST", { tipo: "nota", texto: "   " }),
      rutaCon(registrado.id),
    );
    expect(vacia.status).toBe(422);
    expect(await db.select().from(seguimientoNota)).toHaveLength(0);
  });
});
