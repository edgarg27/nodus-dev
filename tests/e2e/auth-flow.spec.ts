import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  crearAdminDePrueba,
  crearUsuarioAuth,
  generarEnlaceConfirmacion,
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

test("registro con la red interceptada muestra Revisa tu correo y permite reenviar", async ({
  page,
}) => {
  await page.route("**/auth/v1/signup**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: randomUUID(),
        aud: "authenticated",
        role: "authenticated",
        email: "revisa-correo@example.com",
        phone: "",
        confirmation_sent_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { nombre: "Prueba", rol: "buscador" },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  });
  await page.route("**/auth/v1/resend**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/sign-up");
  await page.getByLabel("Nombre").fill("Prueba");
  await page.getByLabel("Correo electrónico").fill("revisa-correo@example.com");
  await page.getByLabel("Contraseña").fill("password123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByRole("status")).toContainText("Revisa tu correo");
  await page.getByRole("button", { name: "Reenviar correo" }).click();
  await expect(page.getByRole("status")).toContainText("Correo reenviado");
});

test("usuarios confirmados inician sesión y terminan en el panel de su rol", async ({ page }) => {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await iniciarSesion(page, oferente);
  expect(page.url()).toContain("/propiedades");

  await page.context().clearCookies();
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await iniciarSesion(page, buscador);
  expect(page.url()).toContain("/buscar");

  await page.context().clearCookies();
  const admin = await crearAdminDePrueba();
  await iniciarSesion(page, admin);
  expect(page.url()).toContain("/admin/propiedades");
});

test("con sesión iniciada, visitar /sign-in redirige al panel del rol", async ({ page }) => {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await iniciarSesion(page, oferente);

  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/propiedades/);
});

test("un usuario sin confirmar ve Confirma tu correo y no llega a ningún panel", async ({
  page,
}) => {
  const cuenta = await crearUsuarioAuth({ confirmado: false });

  await page.goto("/sign-in");
  await page.getByLabel("Correo electrónico").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page.getByText("Confirma tu correo antes de iniciar sesión")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("el enlace de confirmación real lleva al panel del rol", async ({ page }) => {
  const email = `nodus-test+${randomUUID()}@example.com`;
  const password = `Pw-${randomUUID()}`;
  const { tokenHash } = await generarEnlaceConfirmacion({ email, password, rol: "oferente" });

  await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=signup`);
  await expect(page).toHaveURL(/\/propiedades/);
});
