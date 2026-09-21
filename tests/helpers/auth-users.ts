// Fixtures de Supabase Auth para las pruebas de integración y e2e — SIN ENVIAR NINGÚN CORREO.
//
// El proyecto Supabase alojado exige confirmar el correo antes de dar sesión, y su servicio de
// correo por defecto solo entrega a miembros del equipo (2 mensajes por hora). Por eso las pruebas
// nunca llaman a `signUp` de verdad: crean el usuario con la Admin API (llave secreta,
// `email_confirm`), y el token de confirmación sale de `auth.admin.generateLink`.
//
// GUARDIA: crear y borrar usuarios de Auth en el proyecto que apunta `.env` es tan destructivo como
// truncar tablas, así que TODO cliente que este archivo construye pasa antes por
// `assertSafeToReset(process.env)` (src/lib/db/dev-guard.ts, paso 3: una hoja sin dependencias).
// Con un `.env` que apunte a producción, estas funciones lanzan antes de tocar nada.
//
// Aparte de dev-guard.ts, este archivo importa solo `@supabase/supabase-js` (lo instala el Bootstrap,
// Gotcha #12 de §10) y builtins de Node. `crearAdminDePrueba` carga `src/lib/db/client.ts` y
// `schema.ts` con `import()` dinámico, así que solo se exige que existan (paso 4) al llamarla.
//
// Los usuarios de Auth NO los trunca `resetTestDatabase()` (solo vacía `public`): cada archivo de
// prueba llama `limpiarUsuariosAuth()` en `afterAll` — también borra los usuarios que crea
// `generarEnlaceConfirmacion` (`generateLink` de tipo "signup" crea el usuario).
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertSafeToReset } from "../../src/lib/db/dev-guard.ts";

export interface UsuarioAuthPrueba {
  id: string;
  email: string;
  password: string;
}

export interface OpcionesUsuarioAuth {
  /** Metadata `rol` (cualquier texto: las pruebas de seguridad mandan "admin" o "root" a propósito). */
  rol?: string;
  nombre?: string;
  /** Metadata `ref`: el broker_code capturado del `?ref=` del registro. */
  ref?: string;
  /** Por defecto `true`. `false` crea un usuario SIN confirmar (para probar `email_not_confirmed`). */
  confirmado?: boolean;
}

export interface OpcionesEnlaceConfirmacion {
  email: string;
  password: string;
  rol?: string;
  nombre?: string;
  ref?: string;
}

const creados: string[] = [];

function metadataDe(opciones: { rol?: string; nombre?: string; ref?: string }) {
  const metadata: Record<string, string> = {};
  if (opciones.rol !== undefined) metadata.rol = opciones.rol;
  if (opciones.nombre !== undefined) metadata.nombre = opciones.nombre;
  if (opciones.ref !== undefined) metadata.ref = opciones.ref;
  return metadata;
}

export function clienteAdminDePrueba() {
  assertSafeToReset(process.env);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno de las pruebas " +
        "(copia los valores del proyecto nodus-dev a .env, ver blueprint.md §10).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function crearUsuarioAuth(
  opciones: OpcionesUsuarioAuth = {},
): Promise<UsuarioAuthPrueba> {
  const email = `nodus-test+${randomUUID()}@example.com`;
  const password = `Pw-${randomUUID()}`;

  const { data, error } = await clienteAdminDePrueba().auth.admin.createUser({
    email,
    password,
    email_confirm: opciones.confirmado ?? true,
    user_metadata: metadataDe(opciones),
  });
  if (error || !data.user) {
    throw new Error(`crearUsuarioAuth falló: ${error?.message ?? "la respuesta no trae usuario"}`);
  }
  creados.push(data.user.id);
  return { id: data.user.id, email, password };
}

/**
 * `auth.admin.generateLink({ type: "signup" })`: devuelve el `token_hash` del enlace de confirmación
 * SIN enviar correo. Ese llamado CREA el usuario en Auth, así que se registra para que
 * `limpiarUsuariosAuth()` lo borre.
 */
export async function generarEnlaceConfirmacion(
  opciones: OpcionesEnlaceConfirmacion,
): Promise<{ id: string; tokenHash: string }> {
  const { data, error } = await clienteAdminDePrueba().auth.admin.generateLink({
    type: "signup",
    email: opciones.email,
    password: opciones.password,
    options: { data: metadataDe(opciones) },
  });
  if (error || !data.user || !data.properties?.hashed_token) {
    throw new Error(
      `generarEnlaceConfirmacion falló: ${error?.message ?? "la respuesta no trae usuario o token"}`,
    );
  }
  creados.push(data.user.id);
  return { id: data.user.id, tokenHash: data.properties.hashed_token };
}

/**
 * Crea un usuario de Auth confirmado, inserta su fila `usuario` y lo promueve a admin con el script
 * REAL `scripts/make-admin.ts` (paso 6) — la misma y única vía de promoción que usa el operador,
 * nunca un `UPDATE` a mano. Requiere que existan el esquema (paso 4) y el script (paso 6).
 */
export async function crearAdminDePrueba(): Promise<UsuarioAuthPrueba> {
  const nombre = "Admin de prueba";
  const admin = await crearUsuarioAuth({ nombre });
  const { db } = await import("../../src/lib/db/client.ts");
  const { usuario } = await import("../../src/lib/db/schema.ts");
  await db
    .insert(usuario)
    .values({ id: admin.id, email: admin.email, nombre, rol: "buscador" })
    .onConflictDoNothing();
  const resultado = spawnSync(
    "node",
    ["--env-file-if-exists=.env", "scripts/make-admin.ts", admin.email],
    { encoding: "utf8" },
  );
  if (resultado.status !== 0) {
    throw new Error(
      `make-admin falló (código ${resultado.status}): ${resultado.stderr || resultado.stdout}`,
    );
  }
  return admin;
}

export async function limpiarUsuariosAuth(): Promise<void> {
  if (creados.length === 0) return;
  const admin = clienteAdminDePrueba();
  while (creados.length > 0) {
    const id = creados.pop();
    if (id) await admin.auth.admin.deleteUser(id);
  }
}
