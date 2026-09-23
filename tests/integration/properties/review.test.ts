import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { propiedad, propiedadFoto, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { GET: GET_QUEUE } = await import("../../../src/app/api/v1/admin/properties/route.ts");
const { POST: POST_REVIEW } = await import(
  "../../../src/app/api/v1/admin/properties/[id]/review/route.ts"
);
const { PATCH } = await import("../../../src/app/api/v1/properties/[id]/route.ts");

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

async function insertarUsuario(
  actor: NonNullable<ActorFixture>,
  overrides: Record<string, unknown> = {},
) {
  await db.insert(usuario).values({
    id: actor.id,
    email: actor.email,
    nombre: actor.nombre,
    rol: actor.rol,
    ...overrides,
  });
}

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Revisión ${randomUUID()}`,
    direccionNormalizada: `av revision ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de revisión",
    activo: true,
    estadoPublicacion: "pendiente" as const,
    ...overrides,
  };
}

function requestReview(id: string, body: unknown) {
  return {
    request: new Request(`http://localhost/api/v1/admin/properties/${id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: { params: Promise.resolve({ id }) },
  };
}

describe("GET /api/v1/admin/properties", () => {
  it("solo lista pendiente y activa, en orden de espera, con fotos y oferente", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente, { telefono: "4441234567" });

    const [pendienteVieja] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id))
      .returning();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const [pendienteNueva] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id))
      .returning();
    await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { estadoPublicacion: "publicada" }));
    await db
      .insert(propiedad)
      .values(
        propiedadFixture(oferente.id, { estadoPublicacion: "rechazada", motivoRechazo: "x" }),
      );
    await db.insert(propiedad).values(propiedadFixture(oferente.id, { activo: false }));
    if (!pendienteVieja || !pendienteNueva) throw new Error("fixtures no se crearon");

    await db.insert(propiedadFoto).values([
      { propiedadId: pendienteVieja.id, storageUrl: "https://x/1.png", orden: 0 },
      { propiedadId: pendienteVieja.id, storageUrl: "https://x/2.png", orden: 1 },
    ]);

    actuarComo(actorFixture("admin"));
    const respuesta = await GET_QUEUE();
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();

    expect(cuerpo.data).toHaveLength(2);
    expect(cuerpo.data[0].id).toBe(pendienteVieja.id);
    expect(cuerpo.data[1].id).toBe(pendienteNueva.id);
    expect(cuerpo.data[0].fotos).toHaveLength(2);
    expect(cuerpo.data[0].oferente).toMatchObject({ id: oferente.id, email: oferente.email });
  });
});

describe("POST /api/v1/admin/properties/:id/review — aprobar", () => {
  it("deja la propiedad publicada con revisada_por y revisada_en", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    const admin = actorFixture("admin");
    await insertarUsuario(admin);

    const [pendiente] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id))
      .returning();
    if (!pendiente) throw new Error("fixture no se creó");

    actuarComo(admin);
    const { request, params } = requestReview(pendiente.id, { decision: "aprobar" });
    const respuesta = await POST_REVIEW(request, params);
    expect(respuesta.status).toBe(200);

    const [fila] = await db.select().from(propiedad).where(eq(propiedad.id, pendiente.id));
    expect(fila?.estadoPublicacion).toBe("publicada");
    expect(fila?.revisadaPor).toBe(admin.id);
    expect(fila?.revisadaEn).not.toBeNull();
    expect(fila?.motivoRechazo).toBeNull();
  });
});

describe("POST /api/v1/admin/properties/:id/review — rechazar", () => {
  it("con motivo deja rechazada; sin motivo, vacío o solo espacios responde 422 sin cambiar la fila", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    actuarComo(admin);

    const [conMotivo] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id))
      .returning();
    if (!conMotivo) throw new Error("fixture no se creó");
    const { request: reqConMotivo, params: paramsConMotivo } = requestReview(conMotivo.id, {
      decision: "rechazar",
      motivo: "Foto ilegible",
    });
    const respuestaConMotivo = await POST_REVIEW(reqConMotivo, paramsConMotivo);
    expect(respuestaConMotivo.status).toBe(200);
    const [filaConMotivo] = await db.select().from(propiedad).where(eq(propiedad.id, conMotivo.id));
    expect(filaConMotivo?.estadoPublicacion).toBe("rechazada");
    expect(filaConMotivo?.motivoRechazo).toBe("Foto ilegible");

    for (const motivo of [undefined, "", "   "]) {
      const [pendiente] = await db
        .insert(propiedad)
        .values(propiedadFixture(oferente.id))
        .returning();
      if (!pendiente) throw new Error("fixture no se creó");
      const body: Record<string, unknown> = { decision: "rechazar" };
      if (motivo !== undefined) body.motivo = motivo;
      const { request, params } = requestReview(pendiente.id, body);
      const respuesta = await POST_REVIEW(request, params);
      expect(respuesta.status).toBe(422);
      const [fila] = await db.select().from(propiedad).where(eq(propiedad.id, pendiente.id));
      expect(fila?.estadoPublicacion).toBe("pendiente");
    }
  });
});

describe("POST /api/v1/admin/properties/:id/review — 409 y 404", () => {
  it("una segunda revisión, dos simultáneas, id inexistente/no-uuid y baja responden con el código correcto", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    const admin = actorFixture("admin");
    await insertarUsuario(admin);
    actuarComo(admin);

    const [yaAprobada] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id))
      .returning();
    if (!yaAprobada) throw new Error("fixture no se creó");
    const { request: primeraReq, params: primerosParams } = requestReview(yaAprobada.id, {
      decision: "aprobar",
    });
    await POST_REVIEW(primeraReq, primerosParams);

    const { request: segundaReq, params: segundosParams } = requestReview(yaAprobada.id, {
      decision: "aprobar",
    });
    const segunda = await POST_REVIEW(segundaReq, segundosParams);
    expect(segunda.status).toBe(409);

    const { request: rechazoTrasAprobar, params: paramsRechazo } = requestReview(yaAprobada.id, {
      decision: "rechazar",
      motivo: "x",
    });
    const respuestaRechazoTrasAprobar = await POST_REVIEW(rechazoTrasAprobar, paramsRechazo);
    expect(respuestaRechazoTrasAprobar.status).toBe(409);

    const [carrera] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
    if (!carrera) throw new Error("fixture no se creó");
    const solicitudA = requestReview(carrera.id, { decision: "aprobar" });
    const solicitudB = requestReview(carrera.id, { decision: "aprobar" });
    const [resultadoA, resultadoB] = await Promise.all([
      POST_REVIEW(solicitudA.request, solicitudA.params),
      POST_REVIEW(solicitudB.request, solicitudB.params),
    ]);
    const estados = [resultadoA.status, resultadoB.status].sort();
    expect(estados).toEqual([200, 409]);

    const { request: reqInexistente, params: paramsInexistente } = requestReview(randomUUID(), {
      decision: "aprobar",
    });
    expect((await POST_REVIEW(reqInexistente, paramsInexistente)).status).toBe(404);

    const { request: reqNoUuid, params: paramsNoUuid } = requestReview("no-es-un-uuid", {
      decision: "aprobar",
    });
    expect((await POST_REVIEW(reqNoUuid, paramsNoUuid)).status).toBe(404);

    const [deBaja] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { activo: false }))
      .returning();
    if (!deBaja) throw new Error("fixture no se creó");
    const { request: reqDeBaja, params: paramsDeBaja } = requestReview(deBaja.id, {
      decision: "aprobar",
    });
    expect((await POST_REVIEW(reqDeBaja, paramsDeBaja)).status).toBe(404);
  });
});

describe("Autorización de las rutas de revisión", () => {
  it("sin sesión 401 en ambas rutas; buscador y oferente 404 sin cambiar la fila", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    const [pendiente] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id))
      .returning();
    if (!pendiente) throw new Error("fixture no se creó");

    actuarComo(null);
    expect((await GET_QUEUE()).status).toBe(401);
    const { request: reqAnonimo, params: paramsAnonimo } = requestReview(pendiente.id, {
      decision: "aprobar",
    });
    expect((await POST_REVIEW(reqAnonimo, paramsAnonimo)).status).toBe(401);

    for (const rol of ["buscador", "oferente"] as const) {
      const actor = actorFixture(rol);
      await insertarUsuario(actor);
      actuarComo(actor);
      expect((await GET_QUEUE()).status).toBe(404);
      const { request, params } = requestReview(pendiente.id, { decision: "aprobar" });
      expect((await POST_REVIEW(request, params)).status).toBe(404);
    }

    const [fila] = await db.select().from(propiedad).where(eq(propiedad.id, pendiente.id));
    expect(fila?.estadoPublicacion).toBe("pendiente");
  });
});

describe("Un admin no edita contenido de propiedades", () => {
  it("PATCH /api/v1/properties/:id sobre una propiedad ajena responde 403 sin cambiar campos", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    const admin = actorFixture("admin");
    await insertarUsuario(admin);

    const [propia] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
    if (!propia) throw new Error("fixture no se creó");

    actuarComo(admin);
    const respuesta = await PATCH(
      new Request(`http://localhost/api/v1/properties/${propia.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ descripcion: "Editado por el admin" }),
      }),
      { params: Promise.resolve({ id: propia.id }) },
    );
    expect(respuesta.status).toBe(403);

    const [fila] = await db.select().from(propiedad).where(eq(propiedad.id, propia.id));
    expect(fila?.descripcion).toBe(propia.descripcion);
  });
});
