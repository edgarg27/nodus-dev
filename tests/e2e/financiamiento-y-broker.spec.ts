import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db/client.ts";
import { brokerSolicitud, propiedad, usuario } from "../../src/lib/db/schema.ts";
import { crearUsuarioAuth, limpiarUsuariosAuth } from "../helpers/auth-users.ts";
import { iniciarSesion } from "../helpers/e2e-login.ts";
import { resetTestDatabase } from "../helpers/reset-db.ts";

test.beforeAll(async () => {
  await resetTestDatabase();
});

test.afterAll(async () => {
  await limpiarUsuariosAuth();
});

async function crearPropietario(nombre: string) {
  const propietario = await crearUsuarioAuth({ rol: "propietario" });
  await db
    .insert(usuario)
    .values({ id: propietario.id, email: propietario.email, nombre, rol: "propietario" });
  return propietario;
}

function propiedadPublicada(propietarioId: string, direccion: string, overrides = {}) {
  return {
    propietarioId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion,
    direccionNormalizada: direccion
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim(),
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de prueba e2e",
    activo: true,
    estadoPublicacion: "publicada" as const,
    ...overrides,
  };
}

test("publicar escribiendo la dirección (se ubica sola en el mapa) y marcando Sí en financiamiento", async ({
  page,
}) => {
  const propietario = await crearPropietario("Propietario financiamiento");
  await iniciarSesion(page, propietario);

  // MapTiler es un servicio externo: se simula la respuesta del proxy para que el escenario sea
  // determinista (el proxy en sí lo cubren sus pruebas de integración). El campo ya no ofrece
  // sugerencias: al salir de él, el formulario pide la ubicación de la dirección escrita.
  await page.route("**/api/v1/geocode?**", async (ruta) => {
    await ruta.fulfill({
      json: {
        data: { lat: 22.1564, lng: -100.9789, ciudad: "San Luis Potosí", estado: "SLP" },
      },
    });
  });

  await page.goto("/propiedades/nueva");
  await page.getByLabel("Dirección").fill("Av. Industrias 100, San Luis Potosí");
  await page.getByLabel("Dirección").blur();

  await expect(page.getByLabel("Ciudad")).toHaveValue("San Luis Potosí");
  await expect(page.getByLabel("Estado")).toHaveValue("SLP");
  await expect(page.getByLabel("Latitud")).toHaveValue("22.1564");
  await expect(page.getByLabel("Longitud")).toHaveValue("-100.9789");

  // La ubicación calculada se confirma antes de enviar.
  await page.getByRole("button", { name: "Sí, está en el lugar correcto" }).click();

  await page.getByRole("radio", { name: "Sí" }).check();
  await page
    .getByLabel("Cuéntale a los buscadores sobre tu espacio")
    .fill("Nave con financiamiento");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();

  await expect(
    page.getByRole("heading", { name: "Tu propiedad fue enviada a revisión" }),
  ).toBeVisible();

  const [fila] = await db
    .select()
    .from(propiedad)
    .where(eq(propiedad.propietarioId, propietario.id));
  expect(fila?.direccion).toBe("Av. Industrias 100, San Luis Potosí");
  expect(fila?.aceptaFinanciamiento).toBe(true);
});

test("buscar con estado + financiamiento refleja la URL y los resultados", async ({ page }) => {
  const propietario = await crearPropietario("Propietario búsqueda financiamiento");
  await db.insert(propiedad).values([
    propiedadPublicada(propietario.id, "Av. Financiable SLP 1", { aceptaFinanciamiento: true }),
    propiedadPublicada(propietario.id, "Av. Contado SLP 2", { aceptaFinanciamiento: false }),
    propiedadPublicada(propietario.id, "Av. Financiable AGS 3", {
      aceptaFinanciamiento: true,
      estado: "Aguascalientes",
      ciudad: "Aguascalientes",
    }),
  ]);

  await page.goto("/buscar");
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.getByLabel("Estado").selectOption("SLP");
  await page.getByRole("radio", { name: "Sí" }).check();
  await page.getByRole("button", { name: "Buscar espacios" }).click();

  await page.waitForURL(/\/buscar\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get("estado")).toBe("SLP");
  expect(url.searchParams.get("financiamiento")).toBe("true");

  await expect(page.getByRole("heading", { name: "1 espacio encontrado" })).toBeVisible();
  await expect(page.getByText("Av. Financiable SLP 1")).toBeVisible();
  await expect(page.getByText("Av. Contado SLP 2")).toHaveCount(0);
  await expect(page.getByText("Av. Financiable AGS 3")).toHaveCount(0);

  await page.getByRole("button", { name: "Filtros" }).click();
  await expect(page.getByLabel("Estado")).toHaveValue("SLP");
  await expect(page.getByRole("radio", { name: "Sí" })).toBeChecked();
});

test("solicitar broker muestra nombre y correo de la cuenta y envía la empresa", async ({
  page,
}) => {
  const propietario = await crearPropietario("Ana Pérez Broker");
  await iniciarSesion(page, propietario);
  await page.goto("/broker");

  await expect(page.getByRole("main").getByText("Ana Pérez Broker")).toBeVisible();
  await expect(page.getByRole("main").getByText(propietario.email)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /nombre|correo/i })).toHaveCount(0);

  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByText("La empresa es obligatoria")).toBeVisible();

  await page.getByLabel("Empresa", { exact: true }).fill("Inmobiliaria Norte");
  await page.getByLabel("Nota para el equipo de Nodus").fill("12 años en SLP");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(page.getByRole("heading", { name: "Tu solicitud fue enviada" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver a mis publicaciones" })).toHaveAttribute(
    "href",
    "/propiedades",
  );
  await expect(page.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");

  const [solicitud] = await db
    .select()
    .from(brokerSolicitud)
    .where(eq(brokerSolicitud.usuarioId, propietario.id));
  expect(solicitud?.empresa).toBe("Inmobiliaria Norte");
  expect(solicitud?.mensaje).toBe("12 años en SLP");
});
