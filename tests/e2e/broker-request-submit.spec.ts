import { expect, test } from "@playwright/test";
import { db } from "../../src/lib/db/client.ts";
import { brokerRevocacion, brokerSolicitud, usuario } from "../../src/lib/db/schema.ts";
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

async function crearOferente(nombre: string, overrides: Record<string, unknown> = {}) {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await db
    .insert(usuario)
    .values({ id: oferente.id, email: oferente.email, nombre, rol: "oferente", ...overrides });
  return oferente;
}

test("un oferente sin propiedades ve Solicitar ser broker y llega a /broker con el formulario", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente sin broker");
  await iniciarSesion(page, oferente);
  await page.goto("/propiedades");

  const enlace = page.getByRole("link", { name: "Solicitar ser broker" });
  await expect(enlace).toHaveAttribute("href", "/broker");
  await enlace.click();
  await page.waitForURL("/broker");

  await expect(page.getByLabel("Empresa y nota para el equipo de Nodus")).toBeVisible();
});

test("enviar un mensaje válido muestra en revisión, y tras recargar sigue en revisión", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente que solicita");
  await iniciarSesion(page, oferente);
  await page.goto("/broker");

  await page
    .getByLabel("Empresa y nota para el equipo de Nodus")
    .fill("Inmobiliaria Norte, 12 años en SLP");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(page.getByText("Solicitud en revisión")).toBeVisible();
  await expect(page.getByLabel("Empresa y nota para el equipo de Nodus")).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("Solicitud en revisión")).toBeVisible();
});

test("con la última solicitud denegada muestra el motivo y el formulario", async ({ page }) => {
  const admin = await crearAdminDePrueba();
  const oferente = await crearOferente("Oferente denegado");
  await db.insert(brokerSolicitud).values({
    usuarioId: oferente.id,
    mensaje: "Primer intento",
    estado: "denegada",
    motivoDenegacion: "Falta información",
    resueltaPor: admin.id,
    resueltaEn: new Date(),
  });

  await iniciarSesion(page, oferente);
  await page.goto("/broker");

  await expect(page.getByText("Falta información")).toBeVisible();
  await expect(page.getByLabel("Empresa y nota para el equipo de Nodus")).toBeVisible();
});

test("un broker aprobado ve su código y el enlace de referido", async ({ page }) => {
  const admin = await crearAdminDePrueba();
  const oferente = await crearOferente("Oferente broker", {
    isBroker: true,
    brokerCode: "BRK-ABCDEF",
  });
  await db.insert(brokerSolicitud).values({
    usuarioId: oferente.id,
    mensaje: "Quiero ser broker",
    estado: "aprobada",
    resueltaPor: admin.id,
    resueltaEn: new Date(),
  });

  await iniciarSesion(page, oferente);
  await page.goto("/broker");

  await expect(page.getByText("Eres broker afiliado")).toBeVisible();
  await expect(page.getByText("Tu código: BRK-ABCDEF")).toBeVisible();
  await expect(page.getByRole("link", { name: /sign-up\?ref=BRK-ABCDEF/ })).toHaveAttribute(
    "href",
    /\/sign-up\?ref=BRK-ABCDEF$/,
  );
});

test("un broker con solicitud aprobada y revocado ve el motivo y el formulario", async ({
  page,
}) => {
  const admin = await crearAdminDePrueba();
  const oferente = await crearOferente("Oferente revocado con solicitud", { isBroker: false });
  await db.insert(brokerSolicitud).values({
    usuarioId: oferente.id,
    mensaje: "Quiero ser broker",
    estado: "aprobada",
    resueltaPor: admin.id,
    resueltaEn: new Date(),
  });
  await db.insert(brokerRevocacion).values({
    usuarioId: oferente.id,
    brokerCode: "BRK-VIEJO1",
    motivo: "Bajo desempeño",
    revocadaPor: admin.id,
  });

  await iniciarSesion(page, oferente);
  await page.goto("/broker");

  await expect(page.getByText("Tu acceso de broker fue revocado")).toBeVisible();
  await expect(page.getByText("Bajo desempeño")).toBeVisible();
  await expect(page.getByLabel("Empresa y nota para el equipo de Nodus")).toBeVisible();
});

test("un broker sembrado sin ninguna solicitud y revocado también ve el motivo y el formulario", async ({
  page,
}) => {
  const admin = await crearAdminDePrueba();
  const oferente = await crearOferente("Oferente sembrado revocado", { isBroker: false });
  await db.insert(brokerRevocacion).values({
    usuarioId: oferente.id,
    brokerCode: "BRK-DEMO",
    motivo: "Reestructuración",
    revocadaPor: admin.id,
  });

  await iniciarSesion(page, oferente);
  await page.goto("/broker");

  await expect(page.getByText("Tu acceso de broker fue revocado")).toBeVisible();
  await expect(page.getByText("Reestructuración")).toBeVisible();
  await expect(page.getByLabel("Empresa y nota para el equipo de Nodus")).toBeVisible();
});

test("un buscador y un admin reciben 404 en /broker", async ({ page }) => {
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await iniciarSesion(page, buscador);
  const respuestaBuscador = await page.goto("/broker");
  expect(respuestaBuscador?.status()).toBe(404);

  await page.context().clearCookies();
  const admin = await crearAdminDePrueba();
  await iniciarSesion(page, admin);
  const respuestaAdmin = await page.goto("/broker");
  expect(respuestaAdmin?.status()).toBe(404);
});

test("una pendiente insertada mientras la página está abierta hace que el envío anuncie 409", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente carrera");
  await iniciarSesion(page, oferente);
  await page.goto("/broker");

  await db.insert(brokerSolicitud).values({
    usuarioId: oferente.id,
    mensaje: "Insertada por SQL mientras la página estaba abierta",
  });

  await page
    .getByLabel("Empresa y nota para el equipo de Nodus")
    .fill("Intento desde el formulario ya abierto");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(page.getByText("Ya tienes una solicitud pendiente")).toBeVisible();
});
