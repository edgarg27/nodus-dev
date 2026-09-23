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

  test("el hero usa --color-primary de fondo", async ({ page }) => {
    await page.goto("/");
    const backgroundColor = await page
      .locator("main > section")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe("rgb(11, 30, 61)");
  });

  test("el CTA del hero usa --color-accent de fondo", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Buscar propiedades" });
    const backgroundColor = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe("rgb(255, 138, 91)");
  });

  test("clic en el CTA del hero sin sesión navega a /sign-up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Buscar propiedades" }).click();
    await expect(page).toHaveURL(/\/sign-up/);
  });
});
