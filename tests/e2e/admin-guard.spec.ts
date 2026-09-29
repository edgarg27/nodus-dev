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

test("el admin abre /admin y cae en /admin/propiedades, con la navegación del panel", async ({
  page,
}) => {
  const admin = await crearAdminDePrueba();
  await iniciarSesion(page, admin);

  await page.goto("/admin");
  await expect(page).toHaveURL("/admin/propiedades");
  await expect(page.getByRole("link", { name: "Propiedades pendientes" })).toHaveAttribute(
    "href",
    "/admin/propiedades",
  );
  await expect(page.getByRole("link", { name: "Solicitudes de broker" })).toHaveAttribute(
    "href",
    "/admin/broker-requests",
  );
  await expect(page.getByRole("link", { name: "Brokers activos" })).toHaveAttribute(
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
