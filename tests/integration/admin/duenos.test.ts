import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const { db } = await import("../../../src/lib/db/client.ts");
const { propiedad, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { listarDuenos, obtenerDueno } = await import("../../../src/server/duenos/queries.ts");
const { contarParaMenuAdmin } = await import("../../../src/server/admin/contadores.ts");

type Actor = NonNullable<Parameters<typeof listarDuenos>[0]>;

async function crearUsuario(
  rol: "buscador" | "oferente" | "admin",
  extra: Partial<typeof usuario.$inferInsert> = {},
): Promise<Actor> {
  const id = randomUUID();
  const email = `nodus-test+${id}@example.com`;
  await db.insert(usuario).values({ id, email, nombre: `Usuario ${rol}`, rol, ...extra });
  return {
    id,
    email,
    nombre: `Usuario ${rol}`,
    rol,
    isBroker: extra.isBroker ?? false,
    brokerCode: extra.brokerCode ?? null,
    referralBrokerId: null,
  };
}

async function crearPropiedad(oferenteId: string, estadoPublicacion: string) {
  await db.insert(propiedad).values({
    oferenteId,
    tipo: "oficina",
    modalidad: "renta",
    direccion: `Av. Dueños ${randomUUID()}`,
    direccionNormalizada: `av duenos ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP",
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de un dueño",
    activo: true,
    estadoPublicacion,
  });
}

describe("Dueños del panel de administración", () => {
  it("solo dueños verificados que no son brokers, con sus propiedades", async () => {
    await resetTestDatabase();
    const admin = await crearUsuario("admin");
    const dueno = await crearUsuario("oferente", {
      tipoAnunciante: "particular",
      duenoVerificado: true,
    });
    const sinElegir = await crearUsuario("oferente", { duenoVerificado: true });
    // Dueño sin verificar (su solicitud sigue pendiente): todavía no aparece.
    await crearUsuario("oferente", { tipoAnunciante: "particular" });
    await crearUsuario("oferente", { tipoAnunciante: "inmobiliaria" });
    await crearUsuario("oferente", { isBroker: true, brokerCode: "BRK-DUENO1" });
    await crearUsuario("buscador");
    await crearPropiedad(dueno.id, "publicada");
    await crearPropiedad(dueno.id, "pendiente");

    const lista = await listarDuenos(admin);
    expect(lista.map((d) => d.id).sort()).toEqual([dueno.id, sinElegir.id].sort());
    expect(lista.find((d) => d.id === dueno.id)?.propiedades).toEqual({
      publicadas: 1,
      pendientes: 1,
      rechazadas: 0,
    });
    expect((await contarParaMenuAdmin()).duenos).toBe(2);

    const detalle = await obtenerDueno(admin, dueno.id);
    expect(detalle?.propiedades).toHaveLength(2);

    // Solo admin; un broker no es dueño.
    expect(await listarDuenos(dueno)).toEqual([]);
    expect(await obtenerDueno(admin, admin.id)).toBeNull();
  });
});
