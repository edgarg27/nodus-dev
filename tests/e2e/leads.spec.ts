import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { db } from "../../src/lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../src/lib/db/schema.ts";
import { crearUsuarioAuth, limpiarUsuariosAuth } from "../helpers/auth-users.ts";
import { iniciarSesion } from "../helpers/e2e-login.ts";
import { resetTestDatabase } from "../helpers/reset-db.ts";

test.beforeAll(async () => {
  await resetTestDatabase();
});

test.afterAll(async () => {
  await limpiarUsuariosAuth();
});

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Leads E2E ${randomUUID()}`,
    direccionNormalizada: `av leads e2e ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de leads",
    activo: true,
    estadoPublicacion: "publicada" as const,
    ...overrides,
  };
}

async function crearOferente(nombre: string) {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await db
    .insert(usuario)
    .values({ id: oferente.id, email: oferente.email, nombre, rol: "oferente" });
  return oferente;
}

async function crearBuscador(nombre: string) {
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await db
    .insert(usuario)
    .values({ id: buscador.id, email: buscador.email, nombre, rol: "buscador" });
  return buscador;
}

test("un oferente sin leads ve el estado vacío con la acción de publicar", async ({ page }) => {
  const oferente = await crearOferente("Oferente leads vacío");
  await iniciarSesion(page, oferente);
  await page.goto("/leads");

  await expect(page.getByText("Aún no tienes leads")).toBeVisible();
  await expect(page.getByRole("link", { name: "Publicar una propiedad" })).toHaveAttribute(
    "href",
    "/propiedades/nueva",
  );
});

test("un oferente ve solo sus propios leads, y el filtro ajeno se ignora", async ({ page }) => {
  const oferenteA = await crearOferente("Oferente leads A");
  const oferenteB = await crearOferente("Oferente leads B");
  const buscador = await crearBuscador("Buscador leads");

  const [propiedadA] = await db
    .insert(propiedad)
    .values(propiedadFixture(oferenteA.id))
    .returning();
  const [propiedadB] = await db
    .insert(propiedad)
    .values(propiedadFixture(oferenteB.id))
    .returning();
  if (!propiedadA || !propiedadB) throw new Error("fixtures no se crearon");

  await db.insert(contactRequest).values([
    {
      buscadorId: buscador.id,
      propiedadId: propiedadA.id,
      oferenteId: oferenteA.id,
      quiereFinanciamiento: false,
    },
    {
      buscadorId: buscador.id,
      propiedadId: propiedadB.id,
      oferenteId: oferenteB.id,
      quiereFinanciamiento: false,
    },
  ]);

  await iniciarSesion(page, oferenteB);
  await page.goto(`/leads?propiedad_id=${propiedadA.id}`);

  await expect(page.getByText(propiedadB.direccion)).toBeVisible();
  await expect(page.getByText(propiedadA.direccion)).toHaveCount(0);
});

test("un buscador o un admin autenticado reciben 404 en /leads", async ({ page }) => {
  const buscador = await crearBuscador("Buscador sin acceso a leads");
  await iniciarSesion(page, buscador);
  const respuesta = await page.goto("/leads");
  expect(respuesta?.status()).toBe(404);
});
