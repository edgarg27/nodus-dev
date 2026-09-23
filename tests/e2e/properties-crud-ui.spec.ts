import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
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

const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: "Av. Formulario 1",
    direccionNormalizada: "av formulario 1",
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de formulario",
    activo: true,
    estadoPublicacion: "pendiente" as const,
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

async function llenarFormulario(
  page: import("@playwright/test").Page,
  datos: { direccion: string; lat: string; lng: string; ciudad: string; descripcion: string },
) {
  await page.getByLabel("Tipo").selectOption("nave_industrial");
  await page.getByLabel("Modalidad").selectOption("renta");
  await page.getByLabel("Dirección").fill(datos.direccion);
  await page.getByLabel("Latitud").fill(datos.lat);
  await page.getByLabel("Longitud").fill(datos.lng);
  await page.getByLabel("Estado").selectOption("SLP");
  await page.getByLabel("Ciudad").fill(datos.ciudad);
  await page.getByLabel("Descripción").fill(datos.descripcion);
}

test("alta con dirección, lat/lng manuales y una foto crea la propiedad En revisión", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente alta");
  await iniciarSesion(page, oferente);
  await page.goto("/propiedades/nueva");

  await llenarFormulario(page, {
    direccion: "Av. Nueva 500",
    lat: "22.200000",
    lng: "-100.900000",
    ciudad: "San Luis Potosí",
    descripcion: "Nave nueva",
  });
  await page
    .getByLabel("Fotos")
    .setInputFiles([
      { name: "foto.png", mimeType: "image/png", buffer: Buffer.from(PNG_1X1_BASE64, "base64") },
    ]);

  await page.getByRole("button", { name: "Publicar propiedad" }).click();

  await page.waitForURL("/propiedades");
  await expect(page.getByText("Av. Nueva 500")).toBeVisible();
  await expect(page.getByText("En revisión")).toBeVisible();
});

test("dirección/coordenadas duplicadas muestran el mensaje con enlace a la propiedad existente", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente duplicado");
  const [existente] = await db
    .insert(propiedad)
    .values(
      propiedadFixture(oferente.id, {
        direccion: "Av. Duplicada 200",
        direccionNormalizada: "av duplicada 200",
        lat: "22.300000",
        lng: "-100.800000",
      }),
    )
    .returning();
  if (!existente) throw new Error("fixture no se creó");

  await iniciarSesion(page, oferente);
  await page.goto("/propiedades/nueva");

  await llenarFormulario(page, {
    direccion: "Av. Duplicada 200",
    lat: "22.300000",
    lng: "-100.800000",
    ciudad: "San Luis Potosí",
    descripcion: "Intento duplicado",
  });
  await page.getByRole("button", { name: "Publicar propiedad" }).click();

  const enlace = page.getByRole("link", { name: "Ver propiedad existente" });
  await expect(enlace).toBeVisible();
  await expect(enlace).toHaveAttribute("href", `/propiedades/${existente.id}`);
  await expect(page).toHaveURL("/propiedades/nueva");
});

test("corregir una propiedad rechazada y reenviarla la deja En revisión", async ({ page }) => {
  const oferente = await crearOferente("Oferente rechazado");
  const [rechazada] = await db
    .insert(propiedad)
    .values(
      propiedadFixture(oferente.id, {
        direccion: "Av. Rechazada 300",
        direccionNormalizada: "av rechazada 300",
        estadoPublicacion: "rechazada",
        motivoRechazo: "Foto ilegible",
      }),
    )
    .returning();
  if (!rechazada) throw new Error("fixture no se creó");

  await iniciarSesion(page, oferente);
  await page.goto(`/propiedades/${rechazada.id}/editar`);

  await expect(page.getByText("Motivo de rechazo: Foto ilegible")).toBeVisible();
  await page.getByLabel("Descripción").fill("Descripción corregida");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await page.waitForURL("/propiedades");
  await expect(page.getByText("En revisión")).toBeVisible();
});

test("el pin movido con el teclado gana sobre un geocode posterior y se guarda", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente pin teclado");
  await iniciarSesion(page, oferente);

  await page.route("**/api/v1/geocode**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { lat: 19.4326, lng: -99.1332, direccion_sugerida: "Ciudad de México" },
      }),
    });
  });

  await page.goto("/propiedades/nueva");
  await llenarFormulario(page, {
    direccion: "Av. Pin Teclado 700",
    lat: "",
    lng: "",
    ciudad: "San Luis Potosí",
    descripcion: "Nave movida con teclado",
  });

  const pin = page.getByRole("button", { name: /Ubicación de la propiedad/ });
  await pin.focus();
  await pin.press("ArrowUp");
  await pin.press("ArrowUp");
  await pin.press("ArrowRight");

  const latInput = page.getByLabel("Latitud");
  const lngInput = page.getByLabel("Longitud");
  const latTrasPin = await latInput.inputValue();
  const lngTrasPin = await lngInput.inputValue();
  expect(Number(latTrasPin)).not.toBe(19.4326);
  expect(Number(lngTrasPin)).not.toBe(-99.1332);

  // Salir de Dirección dispara el geocode (interceptado); como el pin ya se movió, no debe
  // sobrescribir las coordenadas.
  await page.getByLabel("Dirección").focus();
  await page.getByLabel("Ciudad").focus();

  await expect(latInput).toHaveValue(latTrasPin);
  await expect(lngInput).toHaveValue(lngTrasPin);

  await page.getByRole("button", { name: "Publicar propiedad" }).click();
  await page.waitForURL("/propiedades");

  const [guardada] = await db
    .select()
    .from(propiedad)
    .where(eq(propiedad.direccion, "Av. Pin Teclado 700"));
  expect(guardada).toBeDefined();
  expect(Number(guardada?.lat)).toBeCloseTo(Number(latTrasPin), 3);
  expect(Number(guardada?.lng)).toBeCloseTo(Number(lngTrasPin), 3);
});

test("los inputs de latitud y longitud siguen editables junto al selector de mapa", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente inputs editables");
  await iniciarSesion(page, oferente);
  await page.goto("/propiedades/nueva");

  await expect(page.getByRole("button", { name: /Ubicación de la propiedad/ })).toBeVisible();
  const latInput = page.getByLabel("Latitud");
  const lngInput = page.getByLabel("Longitud");
  await expect(latInput).toBeEditable();
  await expect(lngInput).toBeEditable();

  await llenarFormulario(page, {
    direccion: "Av. Inputs Editables 800",
    lat: "24.111111",
    lng: "-101.222222",
    ciudad: "San Luis Potosí",
    descripcion: "Coordenadas escritas a mano",
  });
  await page.getByRole("button", { name: "Publicar propiedad" }).click();
  await page.waitForURL("/propiedades");

  const [guardada] = await db
    .select()
    .from(propiedad)
    .where(eq(propiedad.direccion, "Av. Inputs Editables 800"));
  expect(guardada).toBeDefined();
  expect(Number(guardada?.lat)).toBeCloseTo(24.111111, 5);
  expect(Number(guardada?.lng)).toBeCloseTo(-101.222222, 5);
});

test("editar el contenido de una propiedad publicada avisa que vuelve a revisión", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente publicada");
  const [publicada] = await db
    .insert(propiedad)
    .values(
      propiedadFixture(oferente.id, {
        direccion: "Av. Publicada 400",
        direccionNormalizada: "av publicada 400",
        estadoPublicacion: "publicada",
      }),
    )
    .returning();
  if (!publicada) throw new Error("fixture no se creó");

  await iniciarSesion(page, oferente);
  await page.goto(`/propiedades/${publicada.id}/editar`);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Descripción").fill("Descripción actualizada");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await page.waitForURL("/propiedades");
  await expect(page.getByText("En revisión")).toBeVisible();
});
