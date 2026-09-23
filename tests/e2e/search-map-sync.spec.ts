import { expect, test } from "@playwright/test";
import { db } from "../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../src/lib/db/schema.ts";
import { crearUsuarioAuth, limpiarUsuariosAuth } from "../helpers/auth-users.ts";
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
    direccion: "Av. Búsqueda 1",
    direccionNormalizada: "av busqueda 1",
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de búsqueda",
    activo: true,
    estadoPublicacion: "publicada" as const,
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

test("un anónimo ve /buscar en 200 solo con propiedades activo y publicada", async ({ page }) => {
  const oferente = await crearOferente("Oferente búsqueda anónima");
  await db.insert(propiedad).values([
    propiedadFixture(oferente.id, {
      direccion: "Av. Pública 100",
      direccionNormalizada: "av publica 100",
    }),
    propiedadFixture(oferente.id, {
      direccion: "Av. Pendiente 200",
      direccionNormalizada: "av pendiente 200",
      estadoPublicacion: "pendiente",
    }),
    propiedadFixture(oferente.id, {
      direccion: "Av. Baja 300",
      direccionNormalizada: "av baja 300",
      activo: false,
    }),
  ]);

  const respuesta = await page.goto("/buscar");
  expect(respuesta?.status()).toBe(200);

  await expect(page.getByText("Av. Pública 100")).toBeVisible();
  await expect(page.getByText("Av. Pendiente 200")).toHaveCount(0);
  await expect(page.getByText("Av. Baja 300")).toHaveCount(0);
});

test("clic en un pin resalta la tarjeta y clic en una tarjeta centra el pin", async ({ page }) => {
  const oferente = await crearOferente("Oferente búsqueda sincronizada");
  const [propiedadUno, propiedadDos] = await db
    .insert(propiedad)
    .values([
      propiedadFixture(oferente.id, {
        direccion: "Av. Sincronía Uno 400",
        direccionNormalizada: "av sincronia uno 400",
        lat: "22.200000",
        lng: "-100.900000",
      }),
      propiedadFixture(oferente.id, {
        direccion: "Av. Sincronía Dos 500",
        direccionNormalizada: "av sincronia dos 500",
        lat: "22.300000",
        lng: "-100.800000",
      }),
    ])
    .returning();
  if (!propiedadUno || !propiedadDos) throw new Error("fixtures no se crearon");

  await page.goto("/buscar");

  const pinUno = page.getByRole("button", { name: `Ver ${propiedadUno.direccion} en el mapa` });
  await pinUno.click();
  const tarjetaUno = page.locator("article").filter({ hasText: propiedadUno.direccion });
  await expect(tarjetaUno).toHaveAttribute("aria-current", "true");

  const tarjetaDos = page.locator("article").filter({ hasText: propiedadDos.direccion });
  await tarjetaDos.click();
  await expect(tarjetaDos).toHaveAttribute("aria-current", "true");
  await expect(tarjetaUno).not.toHaveAttribute("aria-current", "true");
});

test("filtros por query string muestran solo lo que cumple ambas condiciones", async ({ page }) => {
  const oferente = await crearOferente("Oferente búsqueda filtrada");
  await db.insert(propiedad).values([
    propiedadFixture(oferente.id, {
      direccion: "Av. Filtro Coincide 600",
      direccionNormalizada: "av filtro coincide 600",
      modalidad: "renta",
      estado: "SLP",
    }),
    propiedadFixture(oferente.id, {
      direccion: "Av. Filtro Modalidad 700",
      direccionNormalizada: "av filtro modalidad 700",
      modalidad: "venta",
      estado: "SLP",
    }),
    propiedadFixture(oferente.id, {
      direccion: "Av. Filtro Estado 800",
      direccionNormalizada: "av filtro estado 800",
      modalidad: "renta",
      estado: "Leon",
    }),
  ]);

  await page.goto("/buscar?modalidad=renta&estado=SLP");

  await expect(page.getByText("Av. Filtro Coincide 600")).toBeVisible();
  await expect(page.getByText("Av. Filtro Modalidad 700")).toHaveCount(0);
  await expect(page.getByText("Av. Filtro Estado 800")).toHaveCount(0);
});
