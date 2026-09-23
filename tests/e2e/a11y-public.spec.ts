import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { db } from "../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../src/lib/db/schema.ts";
import { crearUsuarioAuth, limpiarUsuariosAuth } from "../helpers/auth-users.ts";
import { resetTestDatabase } from "../helpers/reset-db.ts";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function interceptarSignUp(page: Page) {
  await page.route("**/auth/v1/signup**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: randomUUID(),
        aud: "authenticated",
        role: "authenticated",
        email: "a11y@example.com",
        phone: "",
        confirmation_sent_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { nombre: "A11y", rol: "buscador" },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  });
}

test.beforeAll(async () => {
  await resetTestDatabase();

  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await db
    .insert(usuario)
    .values({ id: oferente.id, email: oferente.email, nombre: "Oferente a11y", rol: "oferente" });
  await db.insert(propiedad).values({
    oferenteId: oferente.id,
    tipo: "nave_industrial",
    modalidad: "renta",
    direccion: "Av. Accesibilidad 1",
    direccionNormalizada: "av accesibilidad 1",
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP",
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad para pruebas de accesibilidad",
    activo: true,
    estadoPublicacion: "publicada",
  });
});

test.afterAll(async () => {
  await limpiarUsuariosAuth();
});

for (const ruta of ["/", "/buscar", "/sign-in", "/sign-up"]) {
  test(`${ruta} no tiene violaciones de axe`, async ({ page }) => {
    await page.goto(ruta);
    const resultados = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(resultados.violations).toEqual([]);
  });
}

for (const width of [640, 320]) {
  for (const ruta of ["/", "/buscar", "/sign-in", "/sign-up"]) {
    test(`${ruta} sin scroll horizontal en ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(ruta);
      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalScroll).toBe(false);
    });
  }
}

test("los controles del mapa de /buscar miden al menos 24x24 px", async ({ page }) => {
  await page.goto("/buscar");
  const marcador = page.getByRole("button", { name: /Ver .* en el mapa/ }).first();
  await expect(marcador).toBeVisible();
  const caja = await marcador.boundingBox();
  expect(caja).not.toBeNull();
  expect(caja?.width ?? 0).toBeGreaterThanOrEqual(24);
  expect(caja?.height ?? 0).toBeGreaterThanOrEqual(24);
});

test("el registro se recorre con teclado en orden email, password, rol y Crear cuenta", async ({
  page,
}) => {
  await interceptarSignUp(page);
  await page.goto("/sign-up");
  await page.getByLabel("Nombre").fill("Teclado");

  await page.locator("#email").focus();
  await expect(page.locator("#email")).toBeFocused();
  await page.keyboard.type("teclado@example.com");

  await page.keyboard.press("Tab");
  await expect(page.locator("#password")).toBeFocused();
  await page.keyboard.type("password123");

  await page.keyboard.press("Tab");
  await expect(page.locator("#rol")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Revisa tu correo");
});

test("Revisa tu correo usa role=status y aria-live=polite", async ({ page }) => {
  await interceptarSignUp(page);
  await page.goto("/sign-up");
  await page.getByLabel("Nombre").fill("Correo");
  await page.getByLabel("Correo electrónico").fill("correo@example.com");
  await page.getByLabel("Contraseña").fill("password123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  const estado = page.getByRole("status");
  await expect(estado).toContainText("Revisa tu correo");
  await expect(estado).toHaveAttribute("aria-live", "polite");
});
