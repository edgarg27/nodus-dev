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
