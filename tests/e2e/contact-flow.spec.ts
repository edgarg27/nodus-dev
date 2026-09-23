import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../src/lib/db/schema.ts";
import { crearUsuarioAuth, limpiarUsuariosAuth } from "../helpers/auth-users.ts";
import { iniciarSesion } from "../helpers/e2e-login.ts";
import { resetTestDatabase } from "../helpers/reset-db.ts";

test.beforeAll(async () => {
  await resetTestDatabase();
});

test.afterAll(async () => {
  await limpiarUsuariosAuth();
});

async function crearOferenteConPropiedad() {
  const oferente = await crearUsuarioAuth({ rol: "oferente" });
  await db.insert(usuario).values({
    id: oferente.id,
    email: oferente.email,
    nombre: "Oferente con teléfono",
    rol: "oferente",
    telefono: "4441234567",
  });
  const direccion = `Av. Contacto E2E ${randomUUID()}`;
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
      descripcion: "Propiedad para contactar",
      activo: true,
      estadoPublicacion: "publicada",
    })
    .returning();
  if (!propia) throw new Error("fixture no se creó");
  return { oferente, propia };
}

test("el botón Contactar revela teléfono y enlace, y crea el lead", async ({ page }) => {
  const { propia } = await crearOferenteConPropiedad();

  const buscador = await crearUsuarioAuth({ rol: "buscador" });
  await db
    .insert(usuario)
    .values({ id: buscador.id, email: buscador.email, nombre: "Buscador", rol: "buscador" });

  await iniciarSesion(page, buscador);
  await page.goto("/buscar");

  const tarjeta = page.locator("article").filter({ hasText: propia.direccion });
  await tarjeta.getByRole("button", { name: "Contactar" }).click();

  await expect(tarjeta.getByText("4441234567")).toBeVisible();
  const enlace = tarjeta.getByRole("link", { name: "Escribir por WhatsApp" });
  await expect(enlace).toHaveAttribute("href", /4441234567/);

  const filas = await db
    .select()
    .from(contactRequest)
    .where(eq(contactRequest.propiedadId, propia.id));
  expect(filas).toHaveLength(1);
});

test("un visitante anónimo que pulsa Contactar termina en /sign-in", async ({ page }) => {
  const { propia } = await crearOferenteConPropiedad();

  await page.goto("/buscar");
  const tarjeta = page.locator("article").filter({ hasText: propia.direccion });
  await tarjeta.getByRole("button", { name: "Contactar" }).click();

  await page.waitForURL((url) => url.pathname === "/sign-in");
});
