import { expect, test } from "@playwright/test";
import {
  crearAdminDePrueba,
  crearUsuarioAuth,
  limpiarUsuariosAuth,
} from "../helpers/auth-users.ts";
import { iniciarSesion } from "../helpers/e2e-login.ts";
import { resetTestDatabase } from "../helpers/reset-db.ts";

test.beforeAll(async () => {
  await resetTestDatabase();
});

test.afterAll(async () => {
  await limpiarUsuariosAuth();
});

test("el admin abre /admin con 200, el encabezado Administración y los enlaces de navegación", async ({
  page,
}) => {
  const admin = await crearAdminDePrueba();
  await iniciarSesion(page, admin);

  const respuesta = await page.goto("/admin");
  expect(respuesta?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Administración" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Propiedades" })).toHaveAttribute(
    "href",
    "/admin/propiedades",
  );
  await expect(page.getByRole("link", { name: "Brokers" })).toHaveAttribute(
    "href",
    "/admin/brokers",
  );
});

test("un buscador autenticado recibe 404 en /admin", async ({ page }) => {
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await iniciarSesion(page, buscador);
  const respuesta = await page.goto("/admin");
  expect(respuesta?.status()).toBe(404);
});

test("un anónimo es redirigido a /sign-in?next=/admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL("/sign-in?next=%2Fadmin");
});
