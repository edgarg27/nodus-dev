import { randomUUID } from "node:crypto";
import { createClient as createClienteSupabase } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name) as string } : undefined,
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
  }),
}));

const { GET } = await import("../../../src/app/auth/confirm/route.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { usuario } = await import("../../../src/lib/db/schema.ts");
const { crearUsuarioAuth, generarEnlaceConfirmacion, limpiarUsuariosAuth } = await import(
  "../../helpers/auth-users.ts"
);
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");

beforeAll(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await limpiarUsuariosAuth();
});

beforeEach(() => {
  cookieJar.clear();
});

describe("GET /auth/confirm", () => {
  it("usuario sin confirmar: signInWithPassword devuelve email_not_confirmed", async () => {
    const cuenta = await crearUsuarioAuth({ confirmado: false });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const cliente = createClienteSupabase(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await cliente.auth.signInWithPassword({
      email: cuenta.email,
      password: cuenta.password,
    });
    expect(error?.code).toBe("email_not_confirmed");
  });

  it("token_hash válido crea sesión, aprovisiona usuario y redirige al panel del rol", async () => {
    const email = `nodus-test+${randomUUID()}@example.com`;
    const password = `Pw-${randomUUID()}`;
    const { tokenHash } = await generarEnlaceConfirmacion({
      email,
      password,
      rol: "oferente",
      nombre: "Ana",
    });

    const request = new Request(
      `http://localhost:3000/auth/confirm?token_hash=${tokenHash}&type=signup`,
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/propiedades");
    expect(cookieJar.size).toBeGreaterThan(0);

    const [fila] = await db.select().from(usuario).where(eq(usuario.email, email));
    expect(fila?.rol).toBe("oferente");
    expect(fila?.nombre).toBe("Ana");
  });

  it("token_hash alterado redirige a /sign-in?error=confirmacion sin cookies", async () => {
    const email = `nodus-test+${randomUUID()}@example.com`;
    const password = `Pw-${randomUUID()}`;
    const { tokenHash } = await generarEnlaceConfirmacion({ email, password });

    const request = new Request(
      `http://localhost:3000/auth/confirm?token_hash=${tokenHash}xxx&type=signup`,
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in?error=confirmacion");
    expect(cookieJar.size).toBe(0);
  });

  it("next externo (//evil.example o https://evil.example) se ignora", async () => {
    for (const nextMalicioso of ["//evil.example", "https://evil.example"]) {
      const email = `nodus-test+${randomUUID()}@example.com`;
      const password = `Pw-${randomUUID()}`;
      const { tokenHash } = await generarEnlaceConfirmacion({ email, password, rol: "buscador" });

      const request = new Request(
        `http://localhost:3000/auth/confirm?token_hash=${tokenHash}&type=signup&next=${encodeURIComponent(nextMalicioso)}`,
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/buscar");
      expect(response.headers.get("location")).not.toContain("evil.example");
    }
  });
});
