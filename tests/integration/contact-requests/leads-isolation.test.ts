import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../../src/lib/db/schema.ts";
import { listarLeadsDelOferente } from "../../../src/server/contact-requests/queries.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

async function crearOferente(nombre: string) {
  const id = randomUUID();
  await db
    .insert(usuario)
    .values({ id, email: `nodus-test+${id}@example.com`, nombre, rol: "oferente" });
  return id;
}

async function crearBuscador() {
  const id = randomUUID();
  await db
    .insert(usuario)
    .values({ id, email: `nodus-test+${id}@example.com`, nombre: "Buscador", rol: "buscador" });
  return id;
}

async function crearPropiedad(oferenteId: string, overrides: Record<string, unknown> = {}) {
  const [fila] = await db
    .insert(propiedad)
    .values({
      oferenteId,
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion: `Av. Leads ${randomUUID()}`,
      direccionNormalizada: `av leads ${randomUUID()}`,
      lat: "22.150000",
      lng: "-100.970000",
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Propiedad de leads",
      activo: true,
      estadoPublicacion: "publicada",
      ...overrides,
    })
    .returning();
  if (!fila) throw new Error("fixture no se creó");
  return fila;
}

async function crearLead(
  buscadorId: string,
  propiedadId: string,
  oferenteId: string,
  overrides: Record<string, unknown> = {},
) {
  await db
    .insert(contactRequest)
    .values({ buscadorId, propiedadId, oferenteId, quiereFinanciamiento: false, ...overrides });
}

describe("listarLeadsDelOferente", () => {
  it("un oferente ve solo sus propios leads, aunque pase el propiedad_id de otro dueño", async () => {
    await resetTestDatabase();
    const oferenteA = await crearOferente("Oferente A");
    const oferenteB = await crearOferente("Oferente B");
    const buscador = await crearBuscador();

    const propiedadA1 = await crearPropiedad(oferenteA);
    const propiedadA2 = await crearPropiedad(oferenteA);
    const propiedadB1 = await crearPropiedad(oferenteB);

    await crearLead(buscador, propiedadA1.id, oferenteA);
    await crearLead(buscador, propiedadA2.id, oferenteA);
    await crearLead(buscador, propiedadB1.id, oferenteB);

    const leadsDeA = await listarLeadsDelOferente(oferenteA);
    expect(leadsDeA).toHaveLength(2);

    const leadsDeB = await listarLeadsDelOferente(oferenteB);
    expect(leadsDeB).toHaveLength(1);

    // B intenta filtrar por una propiedad de A manipulando la URL: nunca ve los leads de A.
    const leadsDeBConFiltroAjeno = await listarLeadsDelOferente(oferenteB, propiedadA1.id);
    expect(leadsDeBConFiltroAjeno).toHaveLength(1);
    expect(leadsDeBConFiltroAjeno[0]?.propiedadId).toBe(propiedadB1.id);
  });

  it("filtrar por una propiedad propia muestra solo los leads de esa propiedad", async () => {
    await resetTestDatabase();
    const oferente = await crearOferente("Oferente filtro");
    const buscador = await crearBuscador();

    const propiedadUno = await crearPropiedad(oferente);
    const propiedadDos = await crearPropiedad(oferente);

    await crearLead(buscador, propiedadUno.id, oferente);
    await crearLead(buscador, propiedadDos.id, oferente);

    const leadsFiltrados = await listarLeadsDelOferente(oferente, propiedadUno.id);
    expect(leadsFiltrados).toHaveLength(1);
    expect(leadsFiltrados[0]?.propiedadId).toBe(propiedadUno.id);
  });

  it("un oferente sin leads recibe una lista vacía", async () => {
    await resetTestDatabase();
    const oferente = await crearOferente("Oferente sin leads");
    const leads = await listarLeadsDelOferente(oferente);
    expect(leads).toHaveLength(0);
  });
});
