import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../../src/lib/db/schema.ts";
import {
  buscarPropiedadesCercanas,
  paraPropietario,
  posiblesDuplicadosDePendientes,
} from "../../../src/server/properties/near-duplicates.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

const BASE = { lat: 21.88234, lng: -102.28259 };

async function crearPropietario(nombre: string) {
  const id = randomUUID();
  await db
    .insert(usuario)
    .values({ id, email: `nodus-test+${id}@example.com`, nombre, rol: "propietario" });
  return id;
}

async function crearPropiedad(
  propietarioId: string,
  overrides: Partial<typeof propiedad.$inferInsert> = {},
) {
  const [fila] = await db
    .insert(propiedad)
    .values({
      propietarioId,
      tipo: "oficina",
      modalidad: "renta",
      direccion: `Av. Cercanas ${randomUUID()}`,
      direccionNormalizada: `avenida cercanas ${randomUUID()}`,
      lat: String(BASE.lat),
      lng: String(BASE.lng),
      estado: "Aguascalientes",
      ciudad: "Aguascalientes",
      descripcion: "Propiedad cercana",
      activo: true,
      estadoPublicacion: "publicada",
      ...overrides,
    })
    .returning();
  if (!fila) throw new Error("fixture no se creó");
  return fila;
}

describe("buscarPropiedadesCercanas", () => {
  it("trae las vigentes del mismo tipo dentro del radio, de la más cercana a la más lejana", async () => {
    await resetTestDatabase();
    const dueno = await crearPropietario("Dueño");
    const mismoPunto = await crearPropiedad(dueno);
    const a30m = await crearPropiedad(dueno, { lat: String(BASE.lat + 0.00027) });
    // Fuera del radio, otro tipo, rechazada y dada de baja: no cuentan.
    await crearPropiedad(dueno, { lat: String(BASE.lat + 0.001) });
    await crearPropiedad(dueno, { tipo: "nave_industrial" });
    await crearPropiedad(dueno, { estadoPublicacion: "rechazada", motivoRechazo: "Duplicada" });
    await crearPropiedad(dueno, { activo: false });

    const cercanas = await buscarPropiedadesCercanas({ ...BASE, tipo: "oficina" });
    expect(cercanas.map((c) => c.id)).toEqual([mismoPunto.id, a30m.id]);
    expect(cercanas[0]?.distanciaM).toBe(0);
    expect(cercanas[1]?.distanciaM).toBeGreaterThan(25);

    const sinLaPropia = await buscarPropiedadesCercanas({
      ...BASE,
      tipo: "oficina",
      excluirId: mismoPunto.id,
    });
    expect(sinLaPropia.map((c) => c.id)).toEqual([a30m.id]);
  });

  it("a quien publica no se le revela una propiedad ajena que aún no es pública", async () => {
    await resetTestDatabase();
    const yo = await crearPropietario("Yo");
    const otro = await crearPropietario("Otro");
    const ajenaPublicada = await crearPropiedad(otro, { titulo: "Oficina A" });
    await crearPropiedad(otro, { estadoPublicacion: "pendiente", titulo: "Oficina B" });
    const mia = await crearPropiedad(yo, { estadoPublicacion: "pendiente", titulo: "Mía" });

    const vista = paraPropietario(
      await buscarPropiedadesCercanas({ ...BASE, tipo: "oficina" }),
      yo,
    );
    expect(vista.find((v) => v.id === ajenaPublicada.id)?.titulo).toBe("Oficina A");
    expect(vista.find((v) => v.id === mia.id)?.esMia).toBe(true);
    const oculta = vista.find((v) => v.id === null);
    expect(oculta).toMatchObject({ titulo: null, fotoUrl: null, publicada: false, esMia: false });
  });

  it("el admin ve los posibles duplicados de cada pendiente, sin contarse a sí misma", async () => {
    await resetTestDatabase();
    const dueno = await crearPropietario("Dueño");
    const broker = await crearPropietario("Broker");
    const publicada = await crearPropiedad(dueno);
    const pendiente = await crearPropiedad(broker, { estadoPublicacion: "pendiente" });
    const sola = await crearPropiedad(broker, {
      estadoPublicacion: "pendiente",
      lat: String(BASE.lat + 0.01),
    });

    const mapa = await posiblesDuplicadosDePendientes([pendiente, sola]);
    expect(mapa.get(pendiente.id)?.map((p) => [p.id, p.propietario])).toEqual([
      [publicada.id, "Dueño"],
    ]);
    expect(mapa.has(sola.id)).toBe(false);
  });
});
