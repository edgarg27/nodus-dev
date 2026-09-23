import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { db } from "../../src/lib/db/client.ts";
import { propiedad, propiedadFoto, usuario } from "../../src/lib/db/schema.ts";
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

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Revisión E2E ${randomUUID()}`,
    direccionNormalizada: `av revision e2e ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad para revisar",
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

test("el admin inicia sesión y termina en /admin/propiedades, con la cola y sus fotos", async ({
  page,
}) => {
  const admin = await crearAdminDePrueba();
  const oferente = await crearOferente("Oferente con fotos");
  const [pendiente] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
  if (!pendiente) throw new Error("fixture no se creó");
  await db.insert(propiedadFoto).values([
    { propiedadId: pendiente.id, storageUrl: "https://placehold.co/120x120.png", orden: 0 },
    { propiedadId: pendiente.id, storageUrl: "https://placehold.co/120x120.png", orden: 1 },
  ]);

  await page.goto("/sign-in");
  await page.getByLabel("Correo electrónico").fill(admin.email);
  await page.getByLabel("Contraseña").fill(admin.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("/admin/propiedades");

  const tarjeta = page.locator("article").filter({ hasText: pendiente.direccion });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.getByText("Oferente con fotos")).toBeVisible();
  await expect(tarjeta.locator("img")).toHaveCount(2);
});

test("aprobar quita la propiedad de la cola y la hace visible en /buscar para un anónimo", async ({
  page,
  browser,
}) => {
  const admin = await crearAdminDePrueba();
  const oferente = await crearOferente("Oferente a aprobar");
  const [pendiente] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
  if (!pendiente) throw new Error("fixture no se creó");

  await iniciarSesion(page, admin);
  await page.goto("/admin/propiedades");
  const tarjeta = page.locator("article").filter({ hasText: pendiente.direccion });
  await tarjeta.getByRole("button", { name: "Aprobar" }).click();
  await expect(tarjeta).toHaveCount(0);

  const paginaAnonima = await browser.newPage();
  await paginaAnonima.goto("/buscar");
  await expect(paginaAnonima.getByText(pendiente.direccion)).toBeVisible();
  await paginaAnonima.close();
});

test("rechazar exige motivo; con motivo, sale de la cola y el oferente ve el motivo", async ({
  page,
}) => {
  const admin = await crearAdminDePrueba();
  const oferente = await crearOferente("Oferente a rechazar");
  const [pendiente] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
  if (!pendiente) throw new Error("fixture no se creó");

  await iniciarSesion(page, admin);
  await page.goto("/admin/propiedades");
  const tarjeta = page.locator("article").filter({ hasText: pendiente.direccion });
  await tarjeta.getByRole("button", { name: "Rechazar" }).click();

  const confirmar = tarjeta.getByRole("button", { name: "Confirmar rechazo" });
  await expect(confirmar).toBeDisabled();

  await tarjeta.getByLabel("Motivo (obligatorio)").fill("Foto ilegible");
  await expect(confirmar).toBeEnabled();
  await confirmar.click();
  await expect(tarjeta).toHaveCount(0);

  await page.context().clearCookies();
  await iniciarSesion(page, oferente);
  await page.goto("/propiedades");
  await expect(page.getByText("Rechazada")).toBeVisible();
  await expect(page.getByText("Foto ilegible")).toBeVisible();
});

test("editar la descripción de una propiedad aprobada la regresa a la cola del admin", async ({
  page,
}) => {
  const admin = await crearAdminDePrueba();
  const oferente = await crearOferente("Oferente que reedita");
  const [publicada] = await db
    .insert(propiedad)
    .values(propiedadFixture(oferente.id, { estadoPublicacion: "publicada" }))
    .returning();
  if (!publicada) throw new Error("fixture no se creó");

  await iniciarSesion(page, oferente);
  await page.goto(`/propiedades/${publicada.id}/editar`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Descripción").fill("Descripción reeditada tras aprobación");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForURL("/propiedades");

  await page.context().clearCookies();
  await iniciarSesion(page, admin);
  await page.goto("/admin/propiedades");
  await expect(page.locator("article").filter({ hasText: publicada.direccion })).toBeVisible();
});

test("un buscador u oferente reciben 404 en /admin/propiedades, y un anónimo va a /sign-in", async ({
  page,
}) => {
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await iniciarSesion(page, buscador);
  const respuestaBuscador = await page.goto("/admin/propiedades");
  expect(respuestaBuscador?.status()).toBe(404);

  const oferente = await crearOferente("Oferente sin acceso admin");
  await page.context().clearCookies();
  await iniciarSesion(page, oferente);
  const respuestaOferente = await page.goto("/admin/propiedades");
  expect(respuestaOferente?.status()).toBe(404);

  await page.context().clearCookies();
  await page.goto("/admin/propiedades");
  await expect(page).toHaveURL("/sign-in?next=%2Fadmin%2Fpropiedades");
});
