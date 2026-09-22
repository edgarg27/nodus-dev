import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { propiedad, usuario } from "../../../src/lib/db/schema.ts";
import { crearUsuarioAuth, limpiarUsuariosAuth } from "../../helpers/auth-users.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

interface FilaCatalogo {
  relname: string;
  relrowsecurity: boolean;
  anon_select: boolean;
  anon_insert: boolean;
  anon_update: boolean;
  anon_delete: boolean;
  authenticated_select: boolean;
  authenticated_insert: boolean;
  authenticated_update: boolean;
  authenticated_delete: boolean;
}

afterAll(async () => {
  await limpiarUsuariosAuth();
});

describe("aislamiento de la Data API", () => {
  it("catálogo: RLS activo y sin privilegios anon/authenticated en toda tabla base de public", async () => {
    await resetTestDatabase();

    const resultado = await db.execute(sql`
      select
        c.relname,
        c.relrowsecurity,
        has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
        has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
        has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
        has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
        has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
        has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
        has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update,
        has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `);

    const filas = resultado as unknown as FilaCatalogo[];
    const nombres = filas.map((f) => f.relname);
    for (const tabla of ["usuario", "propiedad", "propiedad_foto", "contact_request"]) {
      expect(nombres).toContain(tabla);
    }

    for (const fila of filas) {
      expect(fila.relrowsecurity).toBe(true);
      expect(fila.anon_select).toBe(false);
      expect(fila.anon_insert).toBe(false);
      expect(fila.anon_update).toBe(false);
      expect(fila.anon_delete).toBe(false);
      expect(fila.authenticated_select).toBe(false);
      expect(fila.authenticated_insert).toBe(false);
      expect(fila.authenticated_update).toBe(false);
      expect(fila.authenticated_delete).toBe(false);
    }
  });

  it("ataque por la Data API: un token de usuario no cambia rol ni lee/escribe fuera de lo suyo", async () => {
    await resetTestDatabase();

    const u1 = await crearUsuarioAuth({ rol: "buscador" });
    const u2 = await crearUsuarioAuth({ rol: "buscador" });

    await db.insert(usuario).values([
      { id: u1.id, email: u1.email, nombre: "Usuario uno", rol: "buscador", isBroker: false },
      { id: u2.id, email: u2.email, nombre: "Usuario dos", rol: "buscador", isBroker: false },
    ]);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const clienteAutenticado = createClient(url, anonKey);
    const { error: errorLogin } = await clienteAutenticado.auth.signInWithPassword({
      email: u1.email,
      password: u1.password,
    });
    expect(errorLogin).toBeNull();

    const intento1 = await clienteAutenticado
      .from("usuario")
      .update({ rol: "admin" })
      .eq("id", u1.id)
      .select();
    expect(intento1.error !== null || (intento1.data?.length ?? 0) === 0).toBe(true);

    const intento2 = await clienteAutenticado
      .from("usuario")
      .update({ is_broker: true, broker_code: "BRK-HACK" })
      .eq("id", u1.id)
      .select();
    expect(intento2.error !== null || (intento2.data?.length ?? 0) === 0).toBe(true);

    const intento3 = await clienteAutenticado.from("usuario").select("*");
    expect(intento3.error !== null || (intento3.data?.length ?? 0) === 0).toBe(true);

    const intento4 = await clienteAutenticado.from("propiedad").insert({
      oferente_id: u1.id,
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion: "Av. Ataque 1",
      direccion_normalizada: "av ataque 1",
      lat: "22.100000",
      lng: "-100.900000",
      estado: "SLP",
      ciudad: "San Luis Potosi",
      descripcion: "Fila de ataque",
    });
    expect(intento4.error !== null || intento4.data === null).toBe(true);

    const clienteAnonimo = createClient(url, anonKey);
    const intentoAnon = await clienteAnonimo.from("usuario").select("*");
    expect(intentoAnon.error !== null || (intentoAnon.data?.length ?? 0) === 0).toBe(true);

    const filas = await db.select().from(usuario);
    for (const fila of filas) {
      expect(fila.rol).toBe("buscador");
      expect(fila.isBroker).toBe(false);
      expect(fila.brokerCode).toBeNull();
    }
    const propiedades = await db.select().from(propiedad);
    expect(propiedades).toHaveLength(0);
  });

  it("la app sí ve sus filas con la conexión Drizzle", async () => {
    await resetTestDatabase();
    const u1 = await crearUsuarioAuth({ rol: "buscador" });
    const u2 = await crearUsuarioAuth({ rol: "buscador" });
    await db.insert(usuario).values([
      { id: u1.id, email: u1.email, nombre: "Usuario uno", rol: "buscador" },
      { id: u2.id, email: u2.email, nombre: "Usuario dos", rol: "buscador" },
    ]);

    const resultado = await db.execute(sql`select count(*) from usuario`);
    const filas = resultado as unknown as { count: string }[];
    const primera = filas[0];
    if (!primera) throw new Error("la consulta de conteo no devolvió filas");
    expect(Number(primera.count)).toBe(2);
  });
});
