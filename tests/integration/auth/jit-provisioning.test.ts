import { randomUUID } from "node:crypto";
import { createClient as createClienteSupabase } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../../../src/lib/db/client.ts";
import { usuario } from "../../../src/lib/db/schema.ts";
import { createClient } from "../../../src/lib/supabase/server.ts";
import { getUsuarioActual } from "../../../src/server/auth/session.ts";
import type { UsuarioAuthPrueba } from "../../helpers/auth-users.ts";
import { crearUsuarioAuth, limpiarUsuariosAuth } from "../../helpers/auth-users.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

vi.mock("../../../src/lib/supabase/server.ts", () => ({ createClient: vi.fn() }));

async function clienteConSesion(cuenta: UsuarioAuthPrueba) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const cliente = createClienteSupabase(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await cliente.auth.signInWithPassword({
    email: cuenta.email,
    password: cuenta.password,
  });
  if (error) throw error;
  return cliente;
}

function usarCliente(cliente: unknown) {
  vi.mocked(createClient).mockResolvedValue(cliente as Awaited<ReturnType<typeof createClient>>);
}

beforeAll(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await limpiarUsuariosAuth();
});

describe("getUsuarioActual — aprovisionamiento just-in-time", () => {
  it("recrea la fila borrada, con nombre igual al prefijo local si no hay metadata nombre", async () => {
    const cuenta = await crearUsuarioAuth({ rol: "buscador" });
    const cliente = await clienteConSesion(cuenta);
    usarCliente(cliente);

    // primera llamada provisiona la fila
    await getUsuarioActual();
    await db.delete(usuario).where(eq(usuario.id, cuenta.id));

    const actor = await getUsuarioActual();
    expect(actor?.id).toBe(cuenta.id);
    expect(actor?.email).toBe(cuenta.email);
    expect(actor?.nombre).toBe(cuenta.email.split("@")[0]);
  });

  it("un rol distinto de oferente en la metadata (admin, desconocido) aprovisiona buscador", async () => {
    const admin = await crearUsuarioAuth({ rol: "admin" });
    const clienteAdmin = await clienteConSesion(admin);
    usarCliente(clienteAdmin);
    const actorAdmin = await getUsuarioActual();
    expect(actorAdmin?.rol).toBe("buscador");

    const root = await crearUsuarioAuth({ rol: "root" });
    const clienteRoot = await clienteConSesion(root);
    usarCliente(clienteRoot);
    const actorRoot = await getUsuarioActual();
    expect(actorRoot?.rol).toBe("buscador");

    const oferente = await crearUsuarioAuth({ rol: "oferente" });
    const clienteOferente = await clienteConSesion(oferente);
    usarCliente(clienteOferente);
    const actorOferente = await getUsuarioActual();
    expect(actorOferente?.rol).toBe("oferente");
  });

  it("ref válido copia referral_broker_id; ref inexistente o de un no-broker deja null", async () => {
    const broker = {
      id: randomUUID(),
      email: `nodus-test+${randomUUID()}@example.com`,
      nombre: "Broker sembrado",
      rol: "oferente",
      isBroker: true,
      brokerCode: "BRK-JITTST",
    };
    const noBroker = {
      id: randomUUID(),
      email: `nodus-test+${randomUUID()}@example.com`,
      nombre: "No broker",
      rol: "oferente",
    };
    await db.insert(usuario).values([broker, noBroker]);

    const referidoValido = await crearUsuarioAuth({ rol: "buscador", ref: broker.brokerCode });
    usarCliente(await clienteConSesion(referidoValido));
    const actorValido = await getUsuarioActual();
    expect(actorValido?.referralBrokerId).toBe(broker.id);

    const referidoInexistente = await crearUsuarioAuth({ rol: "buscador", ref: "BRK-NOEXISTE" });
    usarCliente(await clienteConSesion(referidoInexistente));
    const actorInexistente = await getUsuarioActual();
    expect(actorInexistente?.referralBrokerId).toBeNull();

    const referidoNoBroker = await crearUsuarioAuth({ rol: "buscador", ref: "no-aplica" });
    usarCliente(await clienteConSesion(referidoNoBroker));
    const actorNoBroker = await getUsuarioActual();
    expect(actorNoBroker?.referralBrokerId).toBeNull();
  });

  it("sin sesión válida devuelve null sin lanzar", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const clienteAnonimo = createClienteSupabase(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    usarCliente(clienteAnonimo);

    await expect(getUsuarioActual()).resolves.toBeNull();
  });

  it("dos llamadas simultáneas dejan exactamente una fila", async () => {
    const cuenta = await crearUsuarioAuth({ rol: "buscador" });
    const cliente = await clienteConSesion(cuenta);
    usarCliente(cliente);

    await Promise.all([getUsuarioActual(), getUsuarioActual()]);

    const filas = await db.select().from(usuario).where(eq(usuario.id, cuenta.id));
    expect(filas).toHaveLength(1);
  });
});
