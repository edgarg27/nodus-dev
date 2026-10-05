import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { resetTestDatabase } from "../../../tests/helpers/reset-db.ts";
import { db } from "../../lib/db/client.ts";
import { busquedaGuardada, propiedad, usuario } from "../../lib/db/schema.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import {
  eliminarBusqueda,
  estaGuardada,
  guardarBusqueda,
  listarBusquedasGuardadas,
  MAXIMO_BUSQUEDAS_POR_USUARIO,
  marcarBusquedaVista,
  normalizarConsulta,
} from "./saved-searches.ts";

async function crearUsuario(rol: "buscador" | "oferente" = "buscador"): Promise<ActorAutenticado> {
  const id = randomUUID();
  await db
    .insert(usuario)
    .values({ id, email: `nodus-test+${id}@example.com`, nombre: "Usuario de prueba", rol });
  return {
    id,
    email: `nodus-test+${id}@example.com`,
    nombre: "Usuario de prueba",
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
}

function oficina(oferenteId: string, revisadaEn: Date) {
  return {
    oferenteId,
    tipo: "oficina",
    modalidad: "renta",
    direccion: `Av. Búsqueda ${randomUUID()}`,
    direccionNormalizada: `av busqueda ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP",
    ciudad: "San Luis Potosí",
    descripcion: "Oficina de prueba",
    estadoPublicacion: "publicada",
    revisadaPor: oferenteId,
    revisadaEn,
  };
}

describe("normalizarConsulta", () => {
  it("ordena los parámetros y quita vacíos e inválidos", () => {
    expect(normalizarConsulta("?ciudad=&tipo=oficina&estado=SLP&orden=azar&precio_min=")).toBe(
      "tipo=oficina&estado=SLP",
    );
  });
});

describe("búsquedas guardadas", () => {
  it("guardar dos veces la misma búsqueda devuelve la existente, con nombre automático", async () => {
    await resetTestDatabase();
    const actor = await crearUsuario();

    const primera = await guardarBusqueda(actor, {
      consulta: "estado=SLP&tipo=oficina&precio_max=40000",
    });
    const segunda = await guardarBusqueda(actor, {
      consulta: "?precio_max=40000&tipo=oficina&estado=SLP",
    });
    expect(primera.ok && primera.data.creada).toBe(true);
    expect(segunda.ok && segunda.data.creada).toBe(false);
    if (primera.ok && segunda.ok) {
      expect(segunda.data.busqueda.id).toBe(primera.data.busqueda.id);
      expect(primera.data.busqueda.nombre).toBe("Oficinas en San Luis Potosí · hasta $40,000 MXN");
    }
    expect(await estaGuardada(actor.id, "tipo=oficina&estado=SLP&precio_max=40000")).toBe(true);
  });

  it("limita la cantidad por usuario", async () => {
    await resetTestDatabase();
    const actor = await crearUsuario();
    await db.insert(busquedaGuardada).values(
      Array.from({ length: MAXIMO_BUSQUEDAS_POR_USUARIO }, (_, i) => ({
        usuarioId: actor.id,
        nombre: `Búsqueda ${i}`,
        consulta: `m2_min=${i}`,
      })),
    );
    const resultado = await guardarBusqueda(actor, { consulta: "tipo=oficina" });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.status).toBe(409);
  });

  it("cuenta los espacios publicados desde la última vista y la vista reinicia el contador", async () => {
    await resetTestDatabase();
    const oferente = await crearUsuario("oferente");
    const actor = await crearUsuario();
    const guardada = await guardarBusqueda(actor, { consulta: "tipo=oficina" });
    if (!guardada.ok) throw new Error("no se guardó");

    const hora = 60 * 60 * 1000;
    const ahora = Date.now();
    // Última vista hace 1 h; una oficina publicada hace 2 h y otra hace 1 min.
    await db
      .update(busquedaGuardada)
      .set({ ultimaVistaEn: new Date(ahora - hora) })
      .where(eq(busquedaGuardada.id, guardada.data.busqueda.id));
    await db
      .insert(propiedad)
      .values([
        oficina(oferente.id, new Date(ahora - 2 * hora)),
        oficina(oferente.id, new Date(ahora - 60_000)),
      ]);

    const [conNuevos] = await listarBusquedasGuardadas(actor.id);
    expect(conNuevos?.total).toBe(2);
    expect(conNuevos?.nuevos).toBe(1);

    await marcarBusquedaVista(actor, guardada.data.busqueda.id);
    const [trasVista] = await listarBusquedasGuardadas(actor.id);
    expect(trasVista?.nuevos).toBe(0);
  });

  it("otro usuario no puede borrar ni marcar una búsqueda ajena (404)", async () => {
    await resetTestDatabase();
    const duena = await crearUsuario();
    const otra = await crearUsuario();
    const guardada = await guardarBusqueda(duena, { consulta: "tipo=oficina" });
    if (!guardada.ok) throw new Error("no se guardó");

    const borrar = await eliminarBusqueda(otra, guardada.data.busqueda.id);
    expect(borrar.ok).toBe(false);
    if (!borrar.ok) expect(borrar.error.status).toBe(404);
    const marcar = await marcarBusquedaVista(otra, guardada.data.busqueda.id);
    expect(marcar.ok).toBe(false);

    expect((await eliminarBusqueda(duena, guardada.data.busqueda.id)).ok).toBe(true);
    expect(await listarBusquedasGuardadas(duena.id)).toEqual([]);
  });
});
