import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { assertSafeToReset } from "../../../src/lib/db/dev-guard.ts";
import { crearClienteAdmin } from "../../../src/server/supabase/admin.ts";

assertSafeToReset(process.env);

const BUCKET = "propiedades-fotos";
const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const objetosSubidos: string[] = [];

afterAll(async () => {
  if (objetosSubidos.length === 0) return;
  const admin = crearClienteAdmin();
  await admin.storage.from(BUCKET).remove(objetosSubidos);
});

describe("scripts/setup-storage.ts", () => {
  it("corre dos veces sin fallar", () => {
    const primera = spawnSync("node", ["--env-file-if-exists=.env", "scripts/setup-storage.ts"], {
      encoding: "utf8",
    });
    expect(primera.status).toBe(0);

    const segunda = spawnSync("node", ["--env-file-if-exists=.env", "scripts/setup-storage.ts"], {
      encoding: "utf8",
    });
    expect(segunda.status).toBe(0);
  });
});

describe("bucket propiedades-fotos", () => {
  it("el cliente admin sube un objeto y se sirve por URL pública", async () => {
    const admin = crearClienteAdmin();
    const ruta = `pruebas/${randomUUID()}.png`;
    objetosSubidos.push(ruta);

    const buffer = Buffer.from(PNG_1X1_BASE64, "base64");
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(ruta, buffer, { contentType: "image/png" });
    expect(error).toBeNull();

    const { data } = admin.storage.from(BUCKET).getPublicUrl(ruta);
    const respuesta = await fetch(data.publicUrl);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("image/png");
  });

  it("un cliente anon no puede subir al bucket", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const clienteAnonimo = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const ruta = `pruebas/${randomUUID()}.png`;
    const buffer = Buffer.from(PNG_1X1_BASE64, "base64");

    const { error } = await clienteAnonimo.storage
      .from(BUCKET)
      .upload(ruta, buffer, { contentType: "image/png" });
    expect(error).not.toBeNull();

    const admin = crearClienteAdmin();
    const { data: listado } = await admin.storage.from(BUCKET).list("pruebas");
    const nombre = ruta.split("/").pop();
    expect(listado?.some((objeto) => objeto.name === nombre)).toBe(false);
  });

  it("el cliente admin no puede subir un tipo no permitido", async () => {
    const admin = crearClienteAdmin();
    const ruta = `pruebas/${randomUUID()}.txt`;

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(ruta, Buffer.from("hola"), { contentType: "text/plain" });
    expect(error).not.toBeNull();
  });

  it("sin NODUS_ALLOW_DB_RESET la guardia lanza y no sube nada", () => {
    vi.stubEnv("NODUS_ALLOW_DB_RESET", "");
    expect(() => assertSafeToReset(process.env)).toThrowError(/NODUS_ALLOW_DB_RESET/);
    vi.unstubAllEnvs();
  });
});
