import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.ts";
import { getUsuarioActual } from "../../../server/auth/session.ts";

// Enlaces de los correos de Supabase: confirmación de registro y recuperación de contraseña.
// Acepta el enlace con `token_hash` (plantillas propias) y el de `code` (plantillas por defecto,
// flujo PKCE). Si la cuenta aún no tiene contraseña propia, o el enlace es de recuperación, lleva a
// /crear-contrasena.
const TIPOS_PERMITIDOS = new Set(["email", "signup", "recovery"]);
const CREAR_CONTRASENA = "/crear-contrasena";

function destinoPorRol(rol: string | undefined): string {
  if (rol === "oferente") return "/panel";
  if (rol === "admin") return "/admin/propiedades";
  return "/buscar";
}

function esRutaRelativaSegura(next: string | null): next is string {
  return !!next && next.startsWith("/") && !next.startsWith("//");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const errorConfirmacion = NextResponse.redirect(
    new URL("/sign-in?error=confirmacion", request.url),
  );

  const supabase = await createClient();
  if (tokenHash && tipo && TIPOS_PERMITIDOS.has(tipo)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tipo as "email" | "signup" | "recovery",
    });
    if (error) return errorConfirmacion;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return errorConfirmacion;
  } else {
    return errorConfirmacion;
  }

  const { data } = await supabase.auth.getUser();
  const actor = await getUsuarioActual();
  const destinoFinal = esRutaRelativaSegura(next) ? next : destinoPorRol(actor?.rol);
  const faltaContrasena = data.user?.user_metadata?.crear_password === true;

  // El enlace de "olvidé mi contraseña" llega como type=recovery (token_hash) o con
  // next=/crear-contrasena (code).
  const esRecuperacion = tipo === "recovery" || destinoFinal === CREAR_CONTRASENA;
  if (esRecuperacion || faltaContrasena) {
    const destino = new URL(CREAR_CONTRASENA, request.url);
    if (esRecuperacion) destino.searchParams.set("modo", "recuperar");
    if (destinoFinal !== CREAR_CONTRASENA) destino.searchParams.set("next", destinoFinal);
    return NextResponse.redirect(destino);
  }
  return NextResponse.redirect(new URL(destinoFinal, request.url));
}
