import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { propiedad, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { GET: GET_SEARCH } = await import("../../../src/app/api/v1/properties/route.ts");
const { GET: GET_DETALLE } = await import("../../../src/app/api/v1/properties/[id]/route.ts");

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

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Búsqueda ${randomUUID()}`,
    direccionNormalizada: `av busqueda ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de búsqueda",
    activo: true,
    estadoPublicacion: "publicada" as const,
    ...overrides,
  };
}

function requestSearch(query: string) {
  return new Request(`http://localhost/api/v1/properties?${query}`);
}

function requestDetalle(id: string) {
  return new Request(`http://localhost/api/v1/properties/${id}`);
}

function detalleParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/v1/properties", () => {
  it("modalidad=renta&estado=SLP devuelve solo publicada/activa que cumple ambas condiciones", async () => {
    await resetTestDatabase();
    const oferente = actorFixture();
    await insertarUsuario(oferente);

    const [coincide] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { modalidad: "renta", estado: "SLP" }))
      .returning();
    await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { modalidad: "venta", estado: "SLP" }));
    await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { modalidad: "renta", estado: "Leon" }));
    if (!coincide) throw new Error("fixture no se creó");

    const respuesta = await GET_SEARCH(requestSearch("modalidad=renta&estado=SLP"));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data).toHaveLength(1);
    expect(cuerpo.data[0].id).toBe(coincide.id);
  });

  it("modalidad fuera del enum responde 422 en vez de ignorar el filtro", async () => {
    await resetTestDatabase();
    const respuesta = await GET_SEARCH(requestSearch("modalidad=invalido"));
    expect(respuesta.status).toBe(422);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("validation_error");
  });

  it("nunca incluye propiedades pendiente, rechazada o dadas de baja aunque cumplan los filtros", async () => {
    await resetTestDatabase();
    const oferente = actorFixture();
    await insertarUsuario(oferente);

    await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { estadoPublicacion: "pendiente" }));
    await db
      .insert(propiedad)
      .values(
        propiedadFixture(oferente.id, { estadoPublicacion: "rechazada", motivoRechazo: "x" }),
      );
    await db.insert(propiedad).values(propiedadFixture(oferente.id, { activo: false }));

    const respuesta = await GET_SEARCH(requestSearch(""));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data).toHaveLength(0);
  });

  it("limita a 50 por página con meta.has_more y meta.next_cursor, sin repetir filas", async () => {
    await resetTestDatabase();
    const oferente = actorFixture();
    await insertarUsuario(oferente);

    await db
      .insert(propiedad)
      .values(Array.from({ length: 55 }, () => propiedadFixture(oferente.id)));

    const primeraPagina = await GET_SEARCH(requestSearch("limit=60"));
    expect(primeraPagina.status).toBe(200);
    const cuerpoUno = await primeraPagina.json();
    expect(cuerpoUno.data).toHaveLength(50);
    expect(cuerpoUno.meta.has_more).toBe(true);
    expect(cuerpoUno.meta.next_cursor).toBeTruthy();

    const segundaPagina = await GET_SEARCH(
      requestSearch(`limit=60&cursor=${cuerpoUno.meta.next_cursor}`),
    );
    const cuerpoDos = await segundaPagina.json();
    expect(cuerpoDos.data).toHaveLength(5);
    expect(cuerpoDos.meta.has_more).toBe(false);
    expect(cuerpoDos.meta.next_cursor).toBeNull();

    const idsPaginaUno = new Set(cuerpoUno.data.map((fila: { id: string }) => fila.id));
    const idsPaginaDos = cuerpoDos.data.map((fila: { id: string }) => fila.id);
    for (const id of idsPaginaDos) {
      expect(idsPaginaUno.has(id)).toBe(false);
    }
  });
});

describe("GET /api/v1/properties/:id", () => {
  it("una propiedad que no es publicada y activa responde 404 sin ser el dueño", async () => {
    await resetTestDatabase();
    const oferente = actorFixture();
    const otro = actorFixture("buscador");
    await insertarUsuario(oferente);
    await insertarUsuario(otro);

    const [pendiente] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { estadoPublicacion: "pendiente" }))
      .returning();
    if (!pendiente) throw new Error("fixture no se creó");

    actuarComo(otro);
    const respuesta = await GET_DETALLE(requestDetalle(pendiente.id), detalleParams(pendiente.id));
    expect(respuesta.status).toBe(404);

    actuarComo(null);
    const respuestaAnonima = await GET_DETALLE(
      requestDetalle(pendiente.id),
      detalleParams(pendiente.id),
    );
    expect(respuestaAnonima.status).toBe(404);
  });

  it("el dueño autenticado ve el detalle de su propiedad en cualquier estado", async () => {
    await resetTestDatabase();
    const oferente = actorFixture();
    await insertarUsuario(oferente);

    const [rechazada] = await db
      .insert(propiedad)
      .values(
        propiedadFixture(oferente.id, {
          estadoPublicacion: "rechazada",
          motivoRechazo: "Foto ilegible",
        }),
      )
      .returning();
    if (!rechazada) throw new Error("fixture no se creó");

    actuarComo(oferente);
    const respuesta = await GET_DETALLE(requestDetalle(rechazada.id), detalleParams(rechazada.id));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.estadoPublicacion).toBe("rechazada");
    expect(cuerpo.data.motivoRechazo).toBe("Foto ilegible");
  });

  it("una propiedad publicada es visible para cualquiera, incluido un anónimo", async () => {
    await resetTestDatabase();
    const oferente = actorFixture();
    await insertarUsuario(oferente);

    const [publicada] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id))
      .returning();
    if (!publicada) throw new Error("fixture no se creó");

    actuarComo(null);
    const respuesta = await GET_DETALLE(requestDetalle(publicada.id), detalleParams(publicada.id));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.id).toBe(publicada.id);
  });
});
