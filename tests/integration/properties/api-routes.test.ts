import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { propiedad, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { POST } = await import("../../../src/app/api/v1/properties/route.ts");
const { PATCH, DELETE } = await import("../../../src/app/api/v1/properties/[id]/route.ts");

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

async function insertarUsuario(actor: NonNullable<ActorFixture>) {
  await db
    .insert(usuario)
    .values({ id: actor.id, email: actor.email, nombre: actor.nombre, rol: actor.rol });
}

function actuarComo(actor: ActorFixture) {
  vi.mocked(getUsuarioActual).mockResolvedValue(actor);
}

function requestPost(body: unknown) {
  return new Request("http://localhost/api/v1/properties", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function requestPatch(body: unknown) {
  return new Request("http://localhost/api/v1/properties/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const INPUT_VALIDO = {
  tipo: "nave_industrial",
  modalidad: "renta",
  direccion: "Av. Rutas 1",
  lat: 22.15637,
  lng: -100.97889,
  estado: "SLP",
  ciudad: "San Luis Potosí",
  descripcion: "Nave de prueba",
};

describe("POST /api/v1/properties", () => {
  it("cuerpo válido crea la propiedad pendiente y responde 201", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(requestPost(INPUT_VALIDO));
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.id).toBeDefined();
    expect(cuerpo.data.estadoPublicacion).toBe("pendiente");
  });

  it("campo faltante o lat fuera de rango responde 422", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const { direccion: _omit, ...sinDireccion } = INPUT_VALIDO;
    const respuestaFaltante = await POST(requestPost(sinDireccion));
    expect(respuestaFaltante.status).toBe(422);

    const respuestaFueraDeRango = await POST(requestPost({ ...INPUT_VALIDO, lat: 90 }));
    expect(respuestaFueraDeRango.status).toBe(422);
  });

  it("sin sesión responde 401", async () => {
    await resetTestDatabase();
    actuarComo(null);
    const respuesta = await POST(requestPost(INPUT_VALIDO));
    expect(respuesta.status).toBe(401);
  });

  it("buscador y admin reciben 403 sin insertar ninguna fila", async () => {
    await resetTestDatabase();
    for (const rol of ["buscador", "admin"] as const) {
      const actor = actorFixture(rol);
      await insertarUsuario(actor);
      actuarComo(actor);
      const respuesta = await POST(requestPost({ ...INPUT_VALIDO, direccion: `Av. ${rol}` }));
      expect(respuesta.status).toBe(403);
    }
    const filas = await db.select().from(propiedad);
    expect(filas).toHaveLength(0);
  });

  it("dirección y coordenadas de una propiedad vigente responden 409 con existing_property_id", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const primera = await POST(requestPost(INPUT_VALIDO));
    const { data: existente } = await primera.json();

    const segunda = await POST(requestPost(INPUT_VALIDO));
    expect(segunda.status).toBe(409);
    const cuerpo = await segunda.json();
    expect(cuerpo.error.code).toBe("conflict_duplicate_property");
    expect(cuerpo.error.details[0].existing_property_id).toBe(existente.id);

    const filas = await db.select().from(propiedad);
    expect(filas).toHaveLength(1);
  });
});

describe("PATCH y DELETE /api/v1/properties/:id", () => {
  it("404 para otro oferente, 200 para el dueño, 403 para otro rol, DELETE de baja suave", async () => {
    await resetTestDatabase();
    const oferenteA = actorFixture("oferente");
    const oferenteB = actorFixture("oferente");
    await insertarUsuario(oferenteA);
    await insertarUsuario(oferenteB);

    actuarComo(oferenteA);
    const creada = await POST(requestPost(INPUT_VALIDO));
    const { data: propiedadCreada } = await creada.json();
    const id = propiedadCreada.id as string;

    actuarComo(oferenteB);
    const patchAjeno = await PATCH(requestPatch({ descripcion: "hackeo" }), {
      params: Promise.resolve({ id }),
    });
    expect(patchAjeno.status).toBe(404);

    actuarComo(oferenteA);
    const patchDueno = await PATCH(requestPatch({ descripcion: "actualizada" }), {
      params: Promise.resolve({ id }),
    });
    expect(patchDueno.status).toBe(200);

    for (const rol of ["buscador", "admin"] as const) {
      const actor = actorFixture(rol);
      await insertarUsuario(actor);
      actuarComo(actor);
      const respuesta = await PATCH(requestPatch({ descripcion: "no debería" }), {
        params: Promise.resolve({ id }),
      });
      expect(respuesta.status).toBe(403);
    }

    const [filaTrasIntentos] = await db.select().from(propiedad).where(eq(propiedad.id, id));
    expect(filaTrasIntentos?.descripcion).toBe("actualizada");

    actuarComo(oferenteB);
    const deleteAjeno = await DELETE(new Request("http://localhost/api/v1/properties/x"), {
      params: Promise.resolve({ id }),
    });
    expect(deleteAjeno.status).toBe(404);

    actuarComo(oferenteA);
    const deleteDueno = await DELETE(new Request("http://localhost/api/v1/properties/x"), {
      params: Promise.resolve({ id }),
    });
    expect(deleteDueno.status).toBe(200);

    const [filaFinal] = await db.select().from(propiedad).where(eq(propiedad.id, id));
    expect(filaFinal?.activo).toBe(false);

    const total = await db.select().from(propiedad);
    expect(total).toHaveLength(1);
  });
});
