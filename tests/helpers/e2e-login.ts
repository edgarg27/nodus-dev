// Inicia sesión por el formulario de /sign-in en las pruebas e2e. Las etiquetas ("Correo
// electrónico", "Contraseña") y el botón ("Iniciar sesión") los fija el paso 10 (sign-in-form.tsx).
// Solo para usuarios CONFIRMADOS: el flujo de un usuario sin confirmar se prueba aparte en el paso 10.
import type { Page } from "@playwright/test";

export async function iniciarSesion(
  page: Page,
  credenciales: { email: string; password: string },
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Correo electrónico").fill(credenciales.email);
  await page.getByLabel("Contraseña").fill(credenciales.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}
