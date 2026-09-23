import { randomUUID } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { contactRequest, propiedad } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const AdminLayout = (await import("../../../src/app/(app)/admin/layout.tsx")).default;
const { POST: POST_PROPERTIES } = await import("../../../src/app/api/v1/properties/route.ts");
const { POST: POST_CONTACT_REQUESTS } = await import(
  "../../../src/app/api/v1/contact-requests/route.ts"
);

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

describe("AdminLayout (capa 2: layout de administración)", () => {
  it("sin actor, un buscador o un oferente rechazan con notFound (404)", async () => {
    actuarComo(null);
    await expect(AdminLayout({ children: null })).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });

    actuarComo(actorFixture("buscador"));
    await expect(AdminLayout({ children: null })).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });

    actuarComo(actorFixture("oferente"));
    await expect(AdminLayout({ children: null })).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });

  it("un admin recibe el árbol con los enlaces a Propiedades y Brokers", async () => {
    actuarComo(actorFixture("admin"));
    const arbol = await AdminLayout({ children: null });
    const html = renderToStaticMarkup(arbol);
    expect(html).toContain("/admin/propiedades");
    expect(html).toContain("/admin/brokers");
  });
});

describe("Un admin no publica propiedades ni genera leads (capa 3: requireRol en cada handler)", () => {
  it("POST /api/v1/properties responde 403 sin insertar ninguna fila", async () => {
    await resetTestDatabase();
    actuarComo(actorFixture("admin"));

    const respuesta = await POST_PROPERTIES(
      new Request("http://localhost/api/v1/properties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo: "nave_industrial",
          modalidad: "renta",
          direccion: "Av. Admin 1",
          lat: 22.15637,
          lng: -100.97889,
          estado: "SLP",
          ciudad: "San Luis Potosí",
          descripcion: "No debería crearse",
        }),
      }),
    );
    expect(respuesta.status).toBe(403);

    const filas = await db.select().from(propiedad);
    expect(filas).toHaveLength(0);
  });

  it("POST /api/v1/contact-requests responde 403 sin insertar ninguna fila", async () => {
    await resetTestDatabase();
    actuarComo(actorFixture("admin"));

    const respuesta = await POST_CONTACT_REQUESTS(
      new Request("http://localhost/api/v1/contact-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propiedad_id: randomUUID(), quiere_financiamiento: false }),
      }),
    );
    expect(respuesta.status).toBe(403);

    const filas = await db.select().from(contactRequest);
    expect(filas).toHaveLength(0);
  });
});
