import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../src/lib/db/schema.ts";
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

async function crearOferenteConPropiedadPublicada(nombre: string) {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await db
    .insert(usuario)
    .values({ id: oferente.id, email: oferente.email, nombre, rol: "oferente" });
  const direccion = `Av. Broker Journey ${randomUUID()}`;
  const [propia] = await db
    .insert(propiedad)
    .values({
      oferenteId: oferente.id,
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion,
      direccionNormalizada: direccion.toLowerCase(),
      lat: "22.150000",
      lng: "-100.970000",
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Propiedad del futuro broker",
      activo: true,
      estadoPublicacion: "publicada",
    })
    .returning();
  if (!propia) throw new Error("fixture no se creó");
  return { oferente, propia };
}

test("journey: solicitud, aprobación, atribución con ?ref= y revocación", async ({ page }) => {
  const { oferente, propia } = await crearOferenteConPropiedadPublicada("Oferente futuro broker");

  await iniciarSesion(page, oferente);
  await page.goto("/broker");
  await page
    .getByLabel("Empresa y nota para el equipo de Nodus")
    .fill("Inmobiliaria del Centro, 8 años en SLP");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByText("Solicitud en revisión")).toBeVisible();

  await page.context().clearCookies();
  const admin = await crearAdminDePrueba();
  await iniciarSesion(page, admin);
  await page.goto("/admin/brokers");

  const seccionPendientes = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Solicitudes pendientes" }) });
  const seccionActivos = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Brokers activos" }) });

  const filaSolicitud = seccionPendientes.locator("li").filter({ hasText: oferente.email });
  await expect(filaSolicitud).toContainText("Inmobiliaria del Centro, 8 años en SLP");
  await filaSolicitud.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText(/Broker aprobado con código/)).toBeVisible();
  await expect(seccionPendientes.locator("li").filter({ hasText: oferente.email })).toHaveCount(0);

  const [filaOferente] = await db.select().from(usuario).where(eq(usuario.id, oferente.id));
  const brokerCode = filaOferente?.brokerCode;
  expect(brokerCode).toMatch(/^BRK-[A-HJ-NP-Z2-9]{6}$/);
  if (!brokerCode) throw new Error("no se asignó broker_code");

  await expect(seccionActivos.locator("li").filter({ hasText: brokerCode })).toBeVisible();

  await page.context().clearCookies();
  await iniciarSesion(page, oferente);
  await page.goto("/broker");
  await expect(page.getByText(`Tu código: ${brokerCode}`)).toBeVisible();

  // Un buscador nuevo se registra con el ?ref= del broker aprobado. La resolución del código a
  // referral_broker_id ya la prueba jit-provisioning.test.ts (paso 7); aquí el registro se fija
  // directo, con la misma referencia que dejaría el JIT, para probar la atribución del lead.
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await db.insert(usuario).values({
    id: buscador.id,
    email: buscador.email,
    nombre: "Buscador referido",
    rol: "buscador",
    referralBrokerId: oferente.id,
  });

  await page.context().clearCookies();
  await iniciarSesion(page, buscador);
  await page.goto("/buscar");

  const tarjeta = page.locator("article").filter({ hasText: propia.direccion });
  await Promise.all([
    page.waitForResponse((respuesta) => respuesta.url().includes("/api/v1/contact-requests")),
    tarjeta.getByRole("button", { name: "Contactar" }).click(),
  ]);

  const [leadUno] = await db
    .select()
    .from(contactRequest)
    .where(eq(contactRequest.propiedadId, propia.id));
  expect(leadUno?.brokerId).toBe(oferente.id);

  await page.context().clearCookies();
  await iniciarSesion(page, oferente);
  await page.goto("/leads");
  await expect(page.getByText(buscador.email)).toBeVisible();

  // Revocación: confirmar deshabilitado sin motivo.
  await page.context().clearCookies();
  await iniciarSesion(page, admin);
  await page.goto("/admin/brokers");
  const seccionActivosRevoke = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Brokers activos" }) });
  const filaBroker = seccionActivosRevoke.locator("li").filter({ hasText: brokerCode });
  await filaBroker.getByRole("button", { name: "Revocar" }).click();
  const confirmarRevocacion = filaBroker.getByRole("button", { name: "Confirmar revocación" });
  await expect(confirmarRevocacion).toBeDisabled();
  await filaBroker.getByLabel("Motivo (obligatorio)").fill("Bajo desempeño");
  await expect(confirmarRevocacion).toBeEnabled();
  await confirmarRevocacion.click();
  await expect(seccionActivosRevoke.locator("li").filter({ hasText: brokerCode })).toHaveCount(0);

  await page.context().clearCookies();
  await iniciarSesion(page, oferente);
  await page.goto("/broker");
  await expect(page.getByText("Tu acceso de broker fue revocado")).toBeVisible();
  await expect(page.getByText("Bajo desempeño")).toBeVisible();

  // Un lead nuevo del mismo buscador ya no se atribuye; el anterior conserva su broker_id.
  await page.context().clearCookies();
  await iniciarSesion(page, buscador);
  await page.goto("/buscar");
  await Promise.all([
    page.waitForResponse((respuesta) => respuesta.url().includes("/api/v1/contact-requests")),
    page
      .locator("article")
      .filter({ hasText: propia.direccion })
      .getByRole("button", { name: "Contactar" })
      .click(),
  ]);

  const leadsFinales = await db
    .select()
    .from(contactRequest)
    .where(eq(contactRequest.propiedadId, propia.id));
  expect(leadsFinales).toHaveLength(2);
  const leadNuevo = leadsFinales.find((lead) => lead.id !== leadUno?.id);
  const leadOriginal = leadsFinales.find((lead) => lead.id === leadUno?.id);
  expect(leadNuevo?.brokerId).toBeNull();
  expect(leadOriginal?.brokerId).toBe(oferente.id);
});

test("denegar con motivo deja la solicitud visible en /broker del oferente", async ({ page }) => {
  const { oferente } = await crearOferenteConPropiedadPublicada("Oferente denegado");

  await iniciarSesion(page, oferente);
  await page.goto("/broker");
  await page.getByLabel("Empresa y nota para el equipo de Nodus").fill("Quiero ser broker");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByText("Solicitud en revisión")).toBeVisible();

  await page.context().clearCookies();
  const admin = await crearAdminDePrueba();
  await iniciarSesion(page, admin);
  await page.goto("/admin/brokers");

  const fila = page.locator("li").filter({ hasText: oferente.email });
  await fila.getByRole("button", { name: "Denegar" }).click();
  await fila.getByLabel("Motivo (opcional)").fill("Falta información");
  await fila.getByRole("button", { name: "Confirmar denegación" }).click();
  await expect(fila).toHaveCount(0);

  await page.context().clearCookies();
  await iniciarSesion(page, oferente);
  await page.goto("/broker");
  await expect(page.getByText("Falta información")).toBeVisible();
  await expect(page.getByLabel("Empresa y nota para el equipo de Nodus")).toBeVisible();
});

test("un buscador y un oferente reciben 404 en /admin/brokers", async ({ page }) => {
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await iniciarSesion(page, buscador);
  const respuestaBuscador = await page.goto("/admin/brokers");
  expect(respuestaBuscador?.status()).toBe(404);

  await page.context().clearCookies();
  const { oferente } = await crearOferenteConPropiedadPublicada("Oferente sin acceso a brokers");
  await iniciarSesion(page, oferente);
  const respuestaOferente = await page.goto("/admin/brokers");
  expect(respuestaOferente?.status()).toBe(404);
});
