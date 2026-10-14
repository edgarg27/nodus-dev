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

function propiedadFixture(propietarioId: string, overrides: Record<string, unknown> = {}) {
  return {
    propietarioId,
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

test("propietario sin propiedades ve el estado vacío con la acción de publicar", async ({
  page,
}) => {
  const propietario = await crearUsuarioAuth({ rol: "propietario" });
  await db
    .insert(usuario)
    .values({
      id: propietario.id,
      email: propietario.email,
      nombre: "Propietario vacío",
      rol: "propietario",
    });

  await iniciarSesion(page, propietario);
  await page.goto("/propiedades");

  await expect(page.getByText("Aún no tienes propiedades")).toBeVisible();
  const enlace = page.getByRole("link", { name: "Publicar una propiedad" });
  await expect(enlace).toHaveAttribute("href", "/propiedades/nueva");
});

test("muestra el estado de cada propiedad, el motivo de rechazo y Corregir y reenviar solo en la rechazada", async ({
  page,
}) => {
  const propietario = await crearUsuarioAuth({ rol: "propietario" });
  await db.insert(usuario).values({
    id: propietario.id,
    email: propietario.email,
    nombre: "Propietario con propiedades",
    rol: "propietario",
  });

  const [pendiente, publicada, rechazada] = await db
    .insert(propiedad)
    .values([
      propiedadFixture(propietario.id, {
        direccion: "Av. Uno 100",
        direccionNormalizada: "av uno 100",
      }),
      propiedadFixture(propietario.id, {
        direccion: "Av. Dos 200",
        direccionNormalizada: "av dos 200",
        estadoPublicacion: "publicada",
      }),
      propiedadFixture(propietario.id, {
        direccion: "Av. Tres 300",
        direccionNormalizada: "av tres 300",
        estadoPublicacion: "rechazada",
        motivoRechazo: "Foto ilegible",
      }),
    ])
    .returning();
  if (!pendiente || !publicada || !rechazada) throw new Error("fixtures no se crearon");

  await iniciarSesion(page, propietario);
  await page.goto("/propiedades");

  await expect(page.getByText("En revisión")).toBeVisible();
  await expect(page.getByText("Publicada")).toBeVisible();
  await expect(page.getByText("Rechazada")).toBeVisible();
  await expect(page.getByText("Foto ilegible")).toBeVisible();

  const enlacesCorregir = page.getByRole("link", { name: "Corregir y reenviar" });
  await expect(enlacesCorregir).toHaveCount(1);
  await expect(enlacesCorregir).toHaveAttribute("href", `/propiedades/${rechazada.id}/editar`);
});

test("no muestra propiedades de otro propietario", async ({ page }) => {
  const propietarioA = await crearUsuarioAuth({ rol: "propietario" });
  const propietarioB = await crearUsuarioAuth({ rol: "propietario" });
  await db.insert(usuario).values([
    { id: propietarioA.id, email: propietarioA.email, nombre: "Propietario A", rol: "propietario" },
    { id: propietarioB.id, email: propietarioB.email, nombre: "Propietario B", rol: "propietario" },
  ]);

  await db.insert(propiedad).values(
    propiedadFixture(propietarioB.id, {
      direccion: "Av. Ajena 1",
      direccionNormalizada: "av ajena 1",
      descripcion: "Propiedad de B",
    }),
  );

  await iniciarSesion(page, propietarioA);
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
