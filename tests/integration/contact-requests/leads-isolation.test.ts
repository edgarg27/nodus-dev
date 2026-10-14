import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../../src/lib/db/schema.ts";
import { listarLeadsDelPropietario } from "../../../src/server/contact-requests/queries.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

async function crearPropietario(nombre: string) {
  const id = randomUUID();
  await db
    .insert(usuario)
    .values({ id, email: `nodus-test+${id}@example.com`, nombre, rol: "propietario" });
  return id;
}

async function crearBuscador() {
  const id = randomUUID();
  await db
    .insert(usuario)
    .values({ id, email: `nodus-test+${id}@example.com`, nombre: "Buscador", rol: "buscador" });
  return id;
}

async function crearPropiedad(propietarioId: string, overrides: Record<string, unknown> = {}) {
  const [fila] = await db
    .insert(propiedad)
    .values({
      propietarioId,
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

// Por omisión, una solicitud que sí le llegó al propietario (canal "directo", las anteriores a que
// pasaran por Captive).
async function crearLead(
  buscadorId: string,
  propiedadId: string,
  propietarioId: string,
  overrides: Record<string, unknown> = {},
) {
  await db.insert(contactRequest).values({
    buscadorId,
    propiedadId,
    propietarioId,
    quiereFinanciamiento: false,
    canal: "directo",
    ...overrides,
  });
}

describe("listarLeadsDelPropietario", () => {
  it("un propietario ve solo sus propios leads, aunque pase el propiedad_id de otro dueño", async () => {
    await resetTestDatabase();
    const propietarioA = await crearPropietario("Propietario A");
    const propietarioB = await crearPropietario("Propietario B");
    const buscador = await crearBuscador();

    const propiedadA1 = await crearPropiedad(propietarioA);
    const propiedadA2 = await crearPropiedad(propietarioA);
    const propiedadB1 = await crearPropiedad(propietarioB);

    await crearLead(buscador, propiedadA1.id, propietarioA);
    await crearLead(buscador, propiedadA2.id, propietarioA);
    await crearLead(buscador, propiedadB1.id, propietarioB);

    const leadsDeA = await listarLeadsDelPropietario(propietarioA);
    expect(leadsDeA).toHaveLength(2);

    const leadsDeB = await listarLeadsDelPropietario(propietarioB);
    expect(leadsDeB).toHaveLength(1);

    // B intenta filtrar por una propiedad de A manipulando la URL: nunca ve los leads de A.
    const leadsDeBConFiltroAjeno = await listarLeadsDelPropietario(propietarioB, propiedadA1.id);
    expect(leadsDeBConFiltroAjeno).toHaveLength(1);
    expect(leadsDeBConFiltroAjeno[0]?.propiedadId).toBe(propiedadB1.id);
  });

  it("filtrar por una propiedad propia muestra solo los leads de esa propiedad", async () => {
    await resetTestDatabase();
    const propietario = await crearPropietario("Propietario filtro");
    const buscador = await crearBuscador();

    const propiedadUno = await crearPropiedad(propietario);
    const propiedadDos = await crearPropiedad(propietario);

    await crearLead(buscador, propiedadUno.id, propietario);
    await crearLead(buscador, propiedadDos.id, propietario);

    const leadsFiltrados = await listarLeadsDelPropietario(propietario, propiedadUno.id);
    expect(leadsFiltrados).toHaveLength(1);
    expect(leadsFiltrados[0]?.propiedadId).toBe(propiedadUno.id);
  });

  it("las solicitudes de canal captive no le llegan al propietario", async () => {
    await resetTestDatabase();
    const propietario = await crearPropietario("Propietario captive");
    const buscador = await crearBuscador();
    const propiedadUno = await crearPropiedad(propietario);
    const propiedadDos = await crearPropiedad(propietario);

    await crearLead(buscador, propiedadUno.id, propietario);
    await crearLead(buscador, propiedadDos.id, propietario, { canal: "captive" });

    const leads = await listarLeadsDelPropietario(propietario);
    expect(leads).toHaveLength(1);
    expect(leads[0]?.propiedadId).toBe(propiedadUno.id);
  });

  it("un propietario sin leads recibe una lista vacía", async () => {
    await resetTestDatabase();
    const propietario = await crearPropietario("Propietario sin leads");
    const leads = await listarLeadsDelPropietario(propietario);
    expect(leads).toHaveLength(0);
  });
});
