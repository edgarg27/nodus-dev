import { expect, test } from "@playwright/test";
import { db } from "../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../src/lib/db/schema.ts";
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
    direccion: "Av. Listado 1",
    direccionNormalizada: "av listado 1",
    lat: "22.100000",
    lng: "-100.900000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de listado",
    activo: true,
    estadoPublicacion: "pendiente" as const,
    ...overrides,
  };
}

test("oferente sin propiedades ve el estado vacío con la acción de publicar", async ({ page }) => {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await db
    .insert(usuario)
    .values({ id: oferente.id, email: oferente.email, nombre: "Oferente vacío", rol: "oferente" });

  await iniciarSesion(page, oferente);
  await page.goto("/propiedades");

  await expect(page.getByText("Aún no tienes propiedades")).toBeVisible();
  const enlace = page.getByRole("link", { name: "Publicar una propiedad" });
  await expect(enlace).toHaveAttribute("href", "/propiedades/nueva");
});

test("muestra el estado de cada propiedad, el motivo de rechazo y Corregir y reenviar solo en la rechazada", async ({
  page,
}) => {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await db.insert(usuario).values({
    id: oferente.id,
    email: oferente.email,
    nombre: "Oferente con propiedades",
    rol: "oferente",
  });

  const [pendiente, publicada, rechazada] = await db
    .insert(propiedad)
    .values([
      propiedadFixture(oferente.id, {
        direccion: "Av. Uno 100",
        direccionNormalizada: "av uno 100",
      }),
      propiedadFixture(oferente.id, {
        direccion: "Av. Dos 200",
        direccionNormalizada: "av dos 200",
        estadoPublicacion: "publicada",
      }),
      propiedadFixture(oferente.id, {
        direccion: "Av. Tres 300",
        direccionNormalizada: "av tres 300",
        estadoPublicacion: "rechazada",
        motivoRechazo: "Foto ilegible",
      }),
    ])
    .returning();
  if (!pendiente || !publicada || !rechazada) throw new Error("fixtures no se crearon");

  await iniciarSesion(page, oferente);
  await page.goto("/propiedades");

  await expect(page.getByText("En revisión")).toBeVisible();
  await expect(page.getByText("Publicada")).toBeVisible();
  await expect(page.getByText("Rechazada")).toBeVisible();
  await expect(page.getByText("Foto ilegible")).toBeVisible();

  const enlacesCorregir = page.getByRole("link", { name: "Corregir y reenviar" });
  await expect(enlacesCorregir).toHaveCount(1);
  await expect(enlacesCorregir).toHaveAttribute("href", `/propiedades/${rechazada.id}/editar`);
});

test("no muestra propiedades de otro oferente", async ({ page }) => {
  const oferenteA = await crearUsuarioAuth({ rol: "oferente" });
  const oferenteB = await crearUsuarioAuth({ rol: "oferente" });
  await db.insert(usuario).values([
    { id: oferenteA.id, email: oferenteA.email, nombre: "Oferente A", rol: "oferente" },
    { id: oferenteB.id, email: oferenteB.email, nombre: "Oferente B", rol: "oferente" },
  ]);

  await db.insert(propiedad).values(
    propiedadFixture(oferenteB.id, {
      direccion: "Av. Ajena 1",
      direccionNormalizada: "av ajena 1",
      descripcion: "Propiedad de B",
    }),
  );

  await iniciarSesion(page, oferenteA);
  await page.goto("/propiedades");

  await expect(page.getByText("Av. Ajena 1")).toHaveCount(0);
});

test("un buscador autenticado recibe 404 en /propiedades", async ({ page }) => {
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await db
    .insert(usuario)
    .values({ id: buscador.id, email: buscador.email, nombre: "Buscador", rol: "buscador" });

  await iniciarSesion(page, buscador);
  const respuesta = await page.goto("/propiedades");
  expect(respuesta?.status()).toBe(404);
});
