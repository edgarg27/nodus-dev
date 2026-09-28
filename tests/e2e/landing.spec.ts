import { expect, test } from "@playwright/test";

test.describe("landing", () => {
  test("sin scroll horizontal en 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test("sin scroll horizontal en 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test("el buscador del hero envía modalidad, tipo y ubicación a /buscar", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("#buscar");
    await hero.getByLabel("Modalidad").selectOption("renta");
    await hero.getByLabel("Tipo de inmueble").selectOption("oficina");
    await hero.getByLabel("Ubicación").fill("Aguascalientes");
    await hero.getByRole("button", { name: "Buscar espacios" }).click();
    await expect(page).toHaveURL(/\/buscar\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("modalidad")).toBe("renta");
    expect(url.searchParams.get("tipo")).toBe("oficina");
    expect(url.searchParams.get("ciudad")).toBe("Aguascalientes");
  });

  test("clic en Crear cuenta gratis sin sesión navega a /sign-up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Crear cuenta gratis" }).click();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("la barra de búsqueda se pega debajo del header al hacer scroll", async ({ page }) => {
    await page.goto("/");
    const barraFija = page.locator(".sticky.z-30");
    await expect(barraFija).toHaveCSS("max-height", "0px");
    await page.mouse.wheel(0, 1200);
    await expect(barraFija).not.toHaveCSS("max-height", "0px");
  });
});
