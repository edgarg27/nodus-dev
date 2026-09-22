import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { propiedad, propiedadFoto, usuario } = await import("../../../src/lib/db/schema.ts");
const { crearClienteAdmin } = await import("../../../src/server/supabase/admin.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { normalizeAddress } = await import("../../../src/lib/normalize-address.ts");
const { POST } = await import("../../../src/app/api/v1/properties/route.ts");
const { PATCH, DELETE } = await import("../../../src/app/api/v1/properties/[id]/route.ts");
const { POST: POST_PHOTO, DELETE: DELETE_PHOTO } = await import(
  "../../../src/app/api/v1/properties/[id]/photos/route.ts"
);

type ActorFixture = Awaited<ReturnType<typeof getUsuarioActual>>;

const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const objetosParaBorrar: string[] = [];

afterAll(async () => {
  if (objetosParaBorrar.length === 0) return;
  const admin = crearClienteAdmin();
  await admin.storage.from("propiedades-fotos").remove(objetosParaBorrar);
});

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

function propiedadBase(oferenteId: string, overrides: Record<string, unknown> = {}) {
  const sufijo = randomUUID();
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Publicacion ${sufijo}`,
    direccionNormalizada: normalizeAddress(`Av. Publicacion ${sufijo}`),
    lat: "22.100000",
    lng: "-100.900000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de prueba",
    activo: true,
    estadoPublicacion: "pendiente" as const,
    ...overrides,
  };
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

function requestPhotoUpload(archivoBuffer: Buffer, contentType: string, nombre = "foto") {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(archivoBuffer)], { type: contentType });
  formData.append("archivo", blob, nombre);
  return new Request("http://localhost/api/v1/properties/x/photos", {
    method: "POST",
    body: formData,
  });
}

describe("ciclo de publicación", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  it("una propiedad nace pendiente, sin revisión ni motivo", async () => {
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(
      requestPost({
        tipo: "nave_industrial",
        modalidad: "renta",
        direccion: "Av. Nace Pendiente",
        lat: 22.1,
        lng: -100.9,
        estado: "SLP",
        ciudad: "San Luis Potosí",
        descripcion: "Nace pendiente",
      }),
    );
    expect(respuesta.status).toBe(201);
    const { data } = await respuesta.json();
    expect(data.estadoPublicacion).toBe("pendiente");
    expect(data.revisadaPor).toBeNull();
    expect(data.revisadaEn).toBeNull();
    expect(data.motivoRechazo).toBeNull();
  });

  it("editar el contenido de una publicada la devuelve a pendiente; un PATCH idéntico la deja publicada", async () => {
    const oferente = actorFixture("oferente");
    const admin = actorFixture("admin");
    await insertarUsuario(oferente);
    await insertarUsuario(admin);

    const [publicada] = await db
      .insert(propiedad)
      .values(
        propiedadBase(oferente.id, {
          estadoPublicacion: "publicada",
          revisadaPor: admin.id,
          revisadaEn: new Date(),
        }),
      )
      .returning();
    if (!publicada) throw new Error("fixture no se creó");

    actuarComo(oferente);
    const respuestaCambio = await PATCH(requestPatch({ descripcion: "Descripción editada" }), {
      params: Promise.resolve({ id: publicada.id }),
    });
    expect(respuestaCambio.status).toBe(200);
    const { data: trasCambio } = await respuestaCambio.json();
    expect(trasCambio.estadoPublicacion).toBe("pendiente");
    expect(trasCambio.revisadaPor).toBeNull();
    expect(trasCambio.revisadaEn).toBeNull();

    // republicar directo para probar el PATCH idéntico
    await db
      .update(propiedad)
      .set({ estadoPublicacion: "publicada", revisadaPor: admin.id, revisadaEn: new Date() })
      .where(eq(propiedad.id, publicada.id));

    const respuestaIdentico = await PATCH(requestPatch({ descripcion: "Descripción editada" }), {
      params: Promise.resolve({ id: publicada.id }),
    });
    expect(respuestaIdentico.status).toBe(200);
    const { data: trasIdentico } = await respuestaIdentico.json();
    expect(trasIdentico.estadoPublicacion).toBe("publicada");
  });

  it("agregar o quitar una foto de una publicada la devuelve a pendiente; tipo/tamaño inválido → 422; otro oferente → 404", async () => {
    const oferenteA = actorFixture("oferente");
    const oferenteB = actorFixture("oferente");
    await insertarUsuario(oferenteA);
    await insertarUsuario(oferenteB);

    const [propA] = await db
      .insert(propiedad)
      .values(propiedadBase(oferenteA.id, { estadoPublicacion: "publicada" }))
      .returning();
    const [propB] = await db
      .insert(propiedad)
      .values(propiedadBase(oferenteA.id, { estadoPublicacion: "publicada" }))
      .returning();
    if (!propA || !propB) throw new Error("fixtures no se crearon");

    actuarComo(oferenteA);
    const buffer = Buffer.from(PNG_1X1_BASE64, "base64");
    const respuestaSubida = await POST_PHOTO(requestPhotoUpload(buffer, "image/png"), {
      params: Promise.resolve({ id: propA.id }),
    });
    expect(respuestaSubida.status).toBe(201);
    const { data: fotoSubida } = await respuestaSubida.json();
    objetosParaBorrar.push(`${propA.id}/${fotoSubida.storage_url.split("/").pop()}`);

    const [propATrasSubida] = await db.select().from(propiedad).where(eq(propiedad.id, propA.id));
    expect(propATrasSubida?.estadoPublicacion).toBe("pendiente");

    // DELETE sobre otra publicada (propB): primero le agregamos una foto directo para luego quitarla
    const respuestaSubidaB = await POST_PHOTO(requestPhotoUpload(buffer, "image/png"), {
      params: Promise.resolve({ id: propB.id }),
    });
    const { data: fotoB } = await respuestaSubidaB.json();
    objetosParaBorrar.push(`${propB.id}/${fotoB.storage_url.split("/").pop()}`);
    // Republicamos B para probar el DELETE sobre una publicada de verdad.
    await db
      .update(propiedad)
      .set({ estadoPublicacion: "publicada" })
      .where(eq(propiedad.id, propB.id));

    const requestDelete = new Request(
      `http://localhost/api/v1/properties/x/photos?foto=${fotoB.id}`,
      { method: "DELETE" },
    );
    const respuestaBorrado = await DELETE_PHOTO(requestDelete, {
      params: Promise.resolve({ id: propB.id }),
    });
    expect(respuestaBorrado.status).toBe(200);
    const [propBTrasBorrado] = await db.select().from(propiedad).where(eq(propiedad.id, propB.id));
    expect(propBTrasBorrado?.estadoPublicacion).toBe("pendiente");

    const respuestaTipoInvalido = await POST_PHOTO(
      requestPhotoUpload(Buffer.from("hola"), "text/plain"),
      { params: Promise.resolve({ id: propA.id }) },
    );
    expect(respuestaTipoInvalido.status).toBe(422);

    const bufferGrande = Buffer.alloc(4_000_001);
    const respuestaTamanoInvalido = await POST_PHOTO(
      requestPhotoUpload(bufferGrande, "image/png"),
      { params: Promise.resolve({ id: propA.id }) },
    );
    expect(respuestaTamanoInvalido.status).toBe(422);

    const fotosPropA = await db
      .select()
      .from(propiedadFoto)
      .where(eq(propiedadFoto.propiedadId, propA.id));
    expect(fotosPropA).toHaveLength(1);

    actuarComo(oferenteB);
    const respuestaOtroOferente = await POST_PHOTO(requestPhotoUpload(buffer, "image/png"), {
      params: Promise.resolve({ id: propA.id }),
    });
    expect(respuestaOtroOferente.status).toBe(404);
  });

  it("editar una rechazada la reenvía a pendiente sin motivo; colisión con otra vigente responde 409 sin cambios", async () => {
    const oferente = actorFixture("oferente");
    const admin = actorFixture("admin");
    await insertarUsuario(oferente);
    await insertarUsuario(admin);

    const [rechazada] = await db
      .insert(propiedad)
      .values(
        propiedadBase(oferente.id, {
          estadoPublicacion: "rechazada",
          motivoRechazo: "Fotos ilegibles",
          revisadaPor: admin.id,
          revisadaEn: new Date(),
        }),
      )
      .returning();
    if (!rechazada) throw new Error("fixture no se creó");

    actuarComo(oferente);
    const respuestaReenvio = await PATCH(requestPatch({ descripcion: "Corregida" }), {
      params: Promise.resolve({ id: rechazada.id }),
    });
    expect(respuestaReenvio.status).toBe(200);
    const { data: trasReenvio } = await respuestaReenvio.json();
    expect(trasReenvio.estadoPublicacion).toBe("pendiente");
    expect(trasReenvio.motivoRechazo).toBeNull();

    const [otraVigente] = await db
      .insert(propiedad)
      .values(propiedadBase(oferente.id, { estadoPublicacion: "publicada" }))
      .returning();
    if (!otraVigente) throw new Error("fixture no se creó");

    const [rechazada2] = await db
      .insert(propiedad)
      .values(
        propiedadBase(oferente.id, {
          estadoPublicacion: "rechazada",
          motivoRechazo: "Fotos ilegibles",
        }),
      )
      .returning();
    if (!rechazada2) throw new Error("fixture no se creó");

    const respuestaColision = await PATCH(
      requestPatch({
        direccion: otraVigente.direccion,
        lat: Number(otraVigente.lat),
        lng: Number(otraVigente.lng),
      }),
      { params: Promise.resolve({ id: rechazada2.id }) },
    );
    expect(respuestaColision.status).toBe(409);
    const cuerpoColision = await respuestaColision.json();
    expect(cuerpoColision.error.details[0].existing_property_id).toBe(otraVigente.id);

    const [rechazada2TrasColision] = await db
      .select()
      .from(propiedad)
      .where(eq(propiedad.id, rechazada2.id));
    expect(rechazada2TrasColision?.estadoPublicacion).toBe("rechazada");
  });

  it("el detalle público solo ve la publicada y activa; el dueño ve las tres con su estado", async () => {
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);

    const [publicada] = await db
      .insert(propiedad)
      .values(propiedadBase(oferente.id, { estadoPublicacion: "publicada" }))
      .returning();
    const [pendiente] = await db
      .insert(propiedad)
      .values(propiedadBase(oferente.id, { estadoPublicacion: "pendiente" }))
      .returning();
    const [rechazada] = await db
      .insert(propiedad)
      .values(
        propiedadBase(oferente.id, { estadoPublicacion: "rechazada", motivoRechazo: "Motivo" }),
      )
      .returning();
    const [dadaDeBaja] = await db
      .insert(propiedad)
      .values(propiedadBase(oferente.id, { estadoPublicacion: "publicada", activo: false }))
      .returning();
    if (!publicada || !pendiente || !rechazada || !dadaDeBaja)
      throw new Error("fixtures no se crearon");

    const { obtenerPropiedadPublicaPorId, obtenerPropiedadDelDuenoPorId } = await import(
      "../../../src/server/properties/queries.ts"
    );

    await expect(obtenerPropiedadPublicaPorId(publicada.id)).resolves.not.toBeNull();
    await expect(obtenerPropiedadPublicaPorId(pendiente.id)).resolves.toBeNull();
    await expect(obtenerPropiedadPublicaPorId(rechazada.id)).resolves.toBeNull();
    await expect(obtenerPropiedadPublicaPorId(dadaDeBaja.id)).resolves.toBeNull();

    const detallePublicada = await obtenerPropiedadDelDuenoPorId(oferente.id, publicada.id);
    const detallePendiente = await obtenerPropiedadDelDuenoPorId(oferente.id, pendiente.id);
    const detalleRechazada = await obtenerPropiedadDelDuenoPorId(oferente.id, rechazada.id);
    expect(detallePublicada?.estadoPublicacion).toBe("publicada");
    expect(detallePendiente?.estadoPublicacion).toBe("pendiente");
    expect(detalleRechazada?.estadoPublicacion).toBe("rechazada");
    expect(detalleRechazada?.motivoRechazo).toBe("Motivo");
  });

  it("dar de baja una publicada conserva su estado_publicacion", async () => {
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);

    const [publicada] = await db
      .insert(propiedad)
      .values(propiedadBase(oferente.id, { estadoPublicacion: "publicada" }))
      .returning();
    if (!publicada) throw new Error("fixture no se creó");

    actuarComo(oferente);
    const respuesta = await DELETE(new Request("http://localhost/api/v1/properties/x"), {
      params: Promise.resolve({ id: publicada.id }),
    });
    expect(respuesta.status).toBe(200);

    const [filaFinal] = await db.select().from(propiedad).where(eq(propiedad.id, publicada.id));
    expect(filaFinal?.activo).toBe(false);
    expect(filaFinal?.estadoPublicacion).toBe("publicada");
  });
});
