import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { db } from "../../src/lib/db/client.ts";
import {
  brokerSolicitud,
  contactRequest,
  propiedad,
  propiedadFoto,
  usuario,
} from "../../src/lib/db/schema.ts";
import { normalizeAddress } from "../../src/lib/normalize-address.ts";
import {
  crearAdminDePrueba,
  crearUsuarioAuth,
  limpiarUsuariosAuth,
} from "../helpers/auth-users.ts";
import { iniciarSesion } from "../helpers/e2e-login.ts";
import { resetTestDatabase } from "../helpers/reset-db.ts";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// El geocode es solo una sugerencia (`map-integration.md`): sin interceptarlo, una respuesta real
// de MapTiler puede llegar después de que la prueba ya escribió lat/lng a mano y sobreescribirlos.
async function bloquearGeocode(page: Page) {
  await page.route("**/api/v1/geocode**", async (route) => {
    await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
}

// Tolera paradas de foco que MapLibre agrega por su cuenta (el propio canvas del mapa, el botón
// de atribución y sus enlaces) entre dos campos del formulario, sin dejar de exigir que el
// elemento buscado llegue después del anterior por Tab.
async function avanzarConTabHasta(page: Page, objetivo: Locator, maxTabs: number) {
  for (let intento = 0; intento < maxTabs; intento++) {
    await page.keyboard.press("Tab");
    if (await objetivo.evaluate((el) => el === document.activeElement)) return;
  }
  await expect(objetivo).toBeFocused();
}

async function crearOferente(nombre: string, overrides: Record<string, unknown> = {}) {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await db
    .insert(usuario)
    .values({ id: oferente.id, email: oferente.email, nombre, rol: "oferente", ...overrides });
  return oferente;
}

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. A11y App ${randomUUID()}`,
    direccionNormalizada: `av a11y app ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad para pruebas de accesibilidad autenticada",
    activo: true,
    estadoPublicacion: "publicada" as const,
    ...overrides,
  };
}

let oferenteConCola: Awaited<ReturnType<typeof crearOferente>>;
let oferenteConLead: Awaited<ReturnType<typeof crearOferente>>;
let brokerActivo: Awaited<ReturnType<typeof crearOferente>>;
let admin: Awaited<ReturnType<typeof crearAdminDePrueba>>;

test.beforeAll(async () => {
  await resetTestDatabase();

  admin = await crearAdminDePrueba();

  oferenteConCola = await crearOferente("Oferente con cola");
  const [pendiente] = await db
    .insert(propiedad)
    .values(propiedadFixture(oferenteConCola.id, { estadoPublicacion: "pendiente" }))
    .returning();
  if (!pendiente) throw new Error("fixture pendiente no se creó");
  await db.insert(propiedadFoto).values({
    propiedadId: pendiente.id,
    storageUrl: "https://placehold.co/120x120.png",
    orden: 0,
  });

  oferenteConLead = await crearOferente("Oferente con lead");
  const [publicada] = await db
    .insert(propiedad)
    .values(propiedadFixture(oferenteConLead.id, { estadoPublicacion: "publicada" }))
    .returning();
  if (!publicada) throw new Error("fixture publicada no se creó");
  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await db
    .insert(usuario)
    .values({ id: buscador.id, email: buscador.email, nombre: "Buscador a11y", rol: "buscador" });
  await db.insert(contactRequest).values({
    buscadorId: buscador.id,
    propiedadId: publicada.id,
    oferenteId: oferenteConLead.id,
  });

  brokerActivo = await crearOferente("Broker activo a11y", {
    isBroker: true,
    brokerCode: "BRK-A11YOK",
  });

  const solicitante = await crearOferente("Oferente solicitud pendiente");
  await db.insert(brokerSolicitud).values({
    usuarioId: solicitante.id,
    mensaje: "Quiero ser broker para pruebas de accesibilidad",
  });
});

test.afterAll(async () => {
  await limpiarUsuariosAuth();
});

const RUTAS_AUTENTICADAS: Array<{
  ruta: string;
  login: () => Promise<{ email: string; password: string }>;
}> = [
  { ruta: "/propiedades", login: async () => oferenteConCola },
  { ruta: "/leads", login: async () => oferenteConLead },
  { ruta: "/broker", login: async () => brokerActivo },
  { ruta: "/admin/propiedades", login: async () => admin },
  { ruta: "/admin/brokers", login: async () => admin },
];

for (const { ruta, login } of RUTAS_AUTENTICADAS) {
  test(`${ruta} no tiene violaciones de axe con datos presentes`, async ({ page }) => {
    await iniciarSesion(page, await login());
    await page.goto(ruta);
    const resultados = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(resultados.violations).toEqual([]);
  });
}

for (const width of [640, 320]) {
  for (const { ruta, login } of RUTAS_AUTENTICADAS) {
    test(`${ruta} sin scroll horizontal en ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await iniciarSesion(page, await login());
      await page.goto(ruta);
      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalScroll).toBe(false);
    });
  }
}

test("el pin y los controles del mapa del alta de propiedad miden al menos 24x24 px", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente tamaño de pin");
  await iniciarSesion(page, oferente);
  await page.goto("/propiedades/nueva");

  const pin = page.getByRole("button", { name: /Ubicación de la propiedad/ });
  await expect(pin).toBeVisible();
  const caja = await pin.boundingBox();
  expect(caja).not.toBeNull();
  expect(caja?.width ?? 0).toBeGreaterThanOrEqual(24);
  expect(caja?.height ?? 0).toBeGreaterThanOrEqual(24);
});

test("el alta de propiedad se recorre con teclado en orden tipo, modalidad, estado, ciudad, descripcion, lat, lng, pin, fotos y envío", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente teclado alta");
  await bloquearGeocode(page);
  await iniciarSesion(page, oferente);
  await page.goto("/propiedades/nueva");

  await page.locator("#tipo").focus();
  await expect(page.locator("#tipo")).toBeFocused();
  await page.locator("#tipo").selectOption("nave_industrial");

  await page.keyboard.press("Tab");
  await expect(page.locator("#modalidad")).toBeFocused();
  await page.locator("#modalidad").selectOption("renta");

  await page.keyboard.press("Tab");
  await expect(page.locator("#direccion")).toBeFocused();
  await page.keyboard.type(`Av. Teclado A11y ${randomUUID()}`);

  await page.keyboard.press("Tab");
  await expect(page.locator("#estado")).toBeFocused();
  await page.locator("#estado").selectOption("SLP");

  await page.keyboard.press("Tab");
  await expect(page.locator("#ciudad")).toBeFocused();
  await page.keyboard.type("San Luis Potosí");

  await page.keyboard.press("Tab");
  await expect(page.locator("#descripcion")).toBeFocused();
  await page.keyboard.type("Nave recorrida solo con teclado");

  await page.keyboard.press("Tab");
  await expect(page.locator("#lat")).toBeFocused();
  await page.keyboard.type("22.210000");

  await page.keyboard.press("Tab");
  await expect(page.locator("#lng")).toBeFocused();
  await page.keyboard.type("-100.910000");

  // Entre lng y el pin, MapLibre inserta su propio canvas focusable; entre el pin y "Fotos",
  // el botón y los enlaces del control de atribución. Ninguno de los dos lo agrega esta app.
  const pin = page.getByRole("button", { name: /Ubicación de la propiedad/ });
  await avanzarConTabHasta(page, pin, 2);

  await avanzarConTabHasta(page, page.locator("#fotos"), 6);

  const enviar = page.getByRole("button", { name: "Publicar propiedad" });
  await avanzarConTabHasta(page, enviar, 2);

  await page.keyboard.press("Enter");
  await page.waitForURL("/propiedades");
  await expect(page.getByRole("status").filter({ hasText: "En revisión" }).first()).toBeVisible();
});

test("el mensaje de duplicado se anuncia en un elemento role=alert", async ({ page }) => {
  const oferente = await crearOferente("Oferente duplicado a11y");
  const direccion = `Av. Duplicado A11y ${randomUUID()}`;
  await db.insert(propiedad).values(
    propiedadFixture(oferente.id, {
      direccion,
      direccionNormalizada: normalizeAddress(direccion),
      estadoPublicacion: "pendiente",
    }),
  );

  await bloquearGeocode(page);
  await iniciarSesion(page, oferente);
  await page.goto("/propiedades/nueva");
  await page.getByLabel("Tipo").selectOption("nave_industrial");
  await page.getByLabel("Modalidad").selectOption("renta");
  await page.getByLabel("Dirección").fill(direccion);
  await page.getByLabel("Estado").selectOption("SLP");
  await page.getByLabel("Ciudad").fill("San Luis Potosí");
  await page.getByLabel("Descripción").fill("Intento duplicado a11y");
  await page.getByLabel("Latitud").fill("22.150000");
  await page.getByLabel("Longitud").fill("-100.970000");
  await page.getByRole("button", { name: "Publicar propiedad" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Ya existe una propiedad activa" }),
  ).toBeVisible();
});

async function crearOferenteConPendiente(nombre: string) {
  const oferente = await crearOferente(nombre);
  const [pendiente] = await db
    .insert(propiedad)
    .values(propiedadFixture(oferente.id, { estadoPublicacion: "pendiente" }))
    .returning();
  if (!pendiente) throw new Error("fixture no se creó");
  return { oferente, pendiente };
}

test("un 409 al revisar una propiedad se anuncia con role=alert o aria-live", async ({ page }) => {
  const { pendiente } = await crearOferenteConPendiente("Oferente revisión conflicto");

  await page.route(`**/api/v1/admin/properties/${pendiente.id}/review`, async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "conflict_already_reviewed", message: "Esta propiedad ya fue revisada" },
      }),
    });
  });

  await iniciarSesion(page, admin);
  await page.goto("/admin/propiedades");
  const tarjeta = page.locator("article").filter({ hasText: pendiente.direccion });
  await tarjeta.getByRole("button", { name: "Aprobar" }).click();

  const anuncio = page.locator('[role="alert"], [aria-live]').filter({
    hasText: "Esta propiedad ya fue revisada",
  });
  await expect(anuncio).toBeVisible();
});

test("un 409 al resolver una solicitud de broker se anuncia con role=alert o aria-live", async ({
  page,
}) => {
  const solicitante = await crearOferente("Oferente solicitud conflicto");
  const [solicitud] = await db
    .insert(brokerSolicitud)
    .values({ usuarioId: solicitante.id, mensaje: "Solicitud de conflicto" })
    .returning();
  if (!solicitud) throw new Error("fixture no se creó");

  await page.route(`**/api/v1/admin/broker-requests/${solicitud.id}/approve`, async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "conflict_already_resolved", message: "Esta solicitud ya fue resuelta" },
      }),
    });
  });

  await iniciarSesion(page, admin);
  await page.goto("/admin/brokers");
  const fila = page.locator("li").filter({ hasText: solicitante.email });
  await fila.getByRole("button", { name: "Aprobar" }).click();

  const anuncio = page.locator('[role="alert"], [aria-live]').filter({
    hasText: "Esta solicitud ya fue resuelta",
  });
  await expect(anuncio).toBeVisible();
});

test("un 409 al enviar una solicitud de broker se anuncia con role=alert o aria-live", async ({
  page,
}) => {
  const oferente = await crearOferente("Oferente envío conflicto");

  await page.route("**/api/v1/broker-requests", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "conflict_pending_broker_request",
          message: "Ya tienes una solicitud pendiente",
        },
      }),
    });
  });

  await iniciarSesion(page, oferente);
  await page.goto("/broker");
  await page.getByLabel("Empresa y nota para el equipo de Nodus").fill("Otra solicitud");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  const anuncio = page.locator('[role="alert"], [aria-live]').filter({
    hasText: "Ya tienes una solicitud pendiente",
  });
  await expect(anuncio).toBeVisible();
});

test("el Dialog de revocación atrapa el foco y Escape lo cierra devolviendo el foco al botón", async ({
  page,
}) => {
  await iniciarSesion(page, admin);
  await page.goto("/admin/brokers");

  const seccionActivos = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Brokers activos" }) });
  const filaBroker = seccionActivos.locator("li").filter({ hasText: "BRK-A11YOK" });
  const botonRevocar = filaBroker.getByRole("button", { name: "Revocar" });
  await botonRevocar.click();

  const dialogo = page.getByRole("dialog", { name: "Revocar acceso de broker" });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByLabel("Motivo (obligatorio)")).toBeFocused();

  for (let intento = 0; intento < 8; intento++) {
    await page.keyboard.press("Tab");
    const foco = await page.evaluate(
      () => document.activeElement?.closest('[role="dialog"]') !== null,
    );
    expect(foco).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialogo).toHaveCount(0);
  await expect(botonRevocar).toBeFocused();
});
