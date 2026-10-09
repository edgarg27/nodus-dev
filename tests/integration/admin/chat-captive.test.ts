import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { mensajeCaptive, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const {
  obtenerChatParaCaptive,
  contarNoLeidosDeCaptive,
  clientesConMensajesSinLeer,
  listarChatsParaCaptive,
} = await import("../../../src/server/messages/captive.ts");
const { contarClientesPorAtender } = await import("../../../src/server/clientes/queries.ts");
const CLIENTE = await import("../../../src/app/api/v1/captive-chat/route.ts");
const { POST: POST_ADMIN } = await import(
  "../../../src/app/api/v1/admin/clientes/[id]/mensajes/route.ts"
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

function peticion(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Chat del cliente con Captive", () => {
  it("el cliente escribe, Captive lo ve sin leer, contesta y el cliente lo ve sin leer", async () => {
    await resetTestDatabase();
    const admin = await crearUsuario("admin");
    const cliente = await crearUsuario("buscador");

    vi.mocked(getUsuarioActual).mockResolvedValue(cliente);
    const enviado = await CLIENTE.POST(peticion("/api/v1/captive-chat", { texto: "  Hola  " }));
    expect(enviado.status).toBe(201);
    expect((await clientesConMensajesSinLeer()).get(cliente.id)).toBe(1);
    // Los mensajes se cuentan en "Mensajes", no en el contador de Clientes y prospectos.
    expect(await contarClientesPorAtender()).toBe(0);
    const bandeja = await listarChatsParaCaptive(admin);
    expect(bandeja.map((chat) => [chat.buscadorId, chat.noLeidos])).toEqual([[cliente.id, 1]]);

    // Abrir el chat desde el panel lo marca como leído.
    const vistaCaptive = await obtenerChatParaCaptive(admin, cliente.id);
    expect(vistaCaptive?.map((m) => [m.texto, m.mio])).toEqual([["Hola", false]]);
    expect((await clientesConMensajesSinLeer()).size).toBe(0);

    vi.mocked(getUsuarioActual).mockResolvedValue(admin);
    const respuesta = await POST_ADMIN(
      peticion(`/api/v1/admin/clientes/${cliente.id}/mensajes`, { texto: "¡Hola! Ya revisamos" }),
      { params: Promise.resolve({ id: cliente.id }) },
    );
    expect(respuesta.status).toBe(201);
    expect(await contarNoLeidosDeCaptive(cliente.id)).toBe(1);

    vi.mocked(getUsuarioActual).mockResolvedValue(cliente);
    const cuerpo = await (
      await CLIENTE.GET(new Request("http://localhost/api/v1/captive-chat"))
    ).json();
    // El cliente no ve qué admin escribió.
    expect(
      cuerpo.data.map((m: { texto: string; mio: boolean; autor: string | null }) => [
        m.texto,
        m.mio,
        m.autor,
      ]),
    ).toEqual([
      ["Hola", true, null],
      ["¡Hola! Ya revisamos", false, null],
    ]);
    expect(await contarNoLeidosDeCaptive(cliente.id)).toBe(0);
  });

  it("un admin no usa el chat de cliente; otro rol no escribe como Captive", async () => {
    await resetTestDatabase();
    const admin = await crearUsuario("admin");
    const oferente = await crearUsuario("oferente");
    const cliente = await crearUsuario("buscador");

    vi.mocked(getUsuarioActual).mockResolvedValue(admin);
    expect((await CLIENTE.POST(peticion("/api/v1/captive-chat", { texto: "Hola" }))).status).toBe(
      403,
    );

    vi.mocked(getUsuarioActual).mockResolvedValue(oferente);
    const ajeno = await POST_ADMIN(
      peticion(`/api/v1/admin/clientes/${cliente.id}/mensajes`, { texto: "Hola" }),
      { params: Promise.resolve({ id: cliente.id }) },
    );
    expect(ajeno.status).toBe(404);
    expect(await db.select().from(mensajeCaptive)).toHaveLength(0);
  });
});
