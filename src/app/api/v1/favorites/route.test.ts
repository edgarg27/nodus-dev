import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../../server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../../server/auth/session.ts");
const { db } = await import("../../../../lib/db/client.ts");
const { propiedad, usuario } = await import("../../../../lib/db/schema.ts");
const { resetTestDatabase } = await import("../../../../../tests/helpers/reset-db.ts");
const { GET, POST } = await import("./route.ts");
const { DELETE } = await import("./[propiedadId]/route.ts");
const savedSearches = await import("../saved-searches/route.ts");
const savedSearchById = await import("../saved-searches/[id]/route.ts");

async function actor() {
  const id = randomUUID();
  const fila = {
    id,
    email: `nodus-test+${id}@example.com`,
    nombre: "Buscador",
    rol: "buscador" as const,
  };
  await db.insert(usuario).values(fila);
  return { ...fila, isBroker: false, brokerCode: null, referralBrokerId: null };
}

function post(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API de favoritos", () => {
  it("sin sesión responde 401", async () => {
    vi.mocked(getUsuarioActual).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(
      (await POST(post("http://localhost/api/v1/favorites", { propiedad_id: randomUUID() })))
        .status,
    ).toBe(401);
  });

  it("agrega, lista y quita un favorito", async () => {
    await resetTestDatabase();
    const buscador = await actor();
    const oferente = await actor();
    const [espacio] = await db
      .insert(propiedad)
      .values({
        oferenteId: oferente.id,
        tipo: "oficina",
        modalidad: "renta",
        direccion: "Av. API Favorito 1",
        direccionNormalizada: `av api favorito ${randomUUID()}`,
        lat: "22.150000",
        lng: "-100.970000",
        estado: "SLP",
        ciudad: "San Luis Potosí",
        descripcion: "Oficina",
        estadoPublicacion: "publicada",
      })
      .returning();
    if (!espacio) throw new Error("sin propiedad");
    vi.mocked(getUsuarioActual).mockResolvedValue(buscador);

    const agregar = await POST(
      post("http://localhost/api/v1/favorites", { propiedad_id: espacio.id }),
    );
    expect(agregar.status).toBe(200);
    const { data } = await (await GET()).json();
    expect(data).toEqual([{ propiedad_id: espacio.id }]);

    const quitar = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ propiedadId: espacio.id }),
    });
    expect(quitar.status).toBe(200);
    expect((await (await GET()).json()).data).toEqual([]);
  });

  it("responde 422 con un id inválido y 404 con un espacio inexistente", async () => {
    await resetTestDatabase();
    vi.mocked(getUsuarioActual).mockResolvedValue(await actor());
    expect(
      (await POST(post("http://localhost/api/v1/favorites", { propiedad_id: "abc" }))).status,
    ).toBe(422);
    expect(
      (await POST(post("http://localhost/api/v1/favorites", { propiedad_id: randomUUID() })))
        .status,
    ).toBe(404);
  });
});

describe("API de búsquedas guardadas", () => {
  it("guardar responde 201 la primera vez y 200 después; otro usuario recibe 404 al borrar", async () => {
    await resetTestDatabase();
    const duena = await actor();
    vi.mocked(getUsuarioActual).mockResolvedValue(duena);

    const url = "http://localhost/api/v1/saved-searches";
    const primera = await savedSearches.POST(post(url, { consulta: "tipo=oficina" }));
    expect(primera.status).toBe(201);
    const { data } = await primera.json();
    expect((await savedSearches.POST(post(url, { consulta: "?tipo=oficina" }))).status).toBe(200);

    vi.mocked(getUsuarioActual).mockResolvedValue(await actor());
    const ajena = await savedSearchById.DELETE(new Request(url), {
      params: Promise.resolve({ id: data.id }),
    });
    expect(ajena.status).toBe(404);
  });

  it("PATCH exige { vista: true }", async () => {
    await resetTestDatabase();
    vi.mocked(getUsuarioActual).mockResolvedValue(await actor());
    const respuesta = await savedSearchById.PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vista: false }),
      }),
      { params: Promise.resolve({ id: randomUUID() }) },
    );
    expect(respuesta.status).toBe(422);
  });
});
