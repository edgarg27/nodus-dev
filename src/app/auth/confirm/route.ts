import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.ts";
import { getUsuarioActual } from "../../../server/auth/session.ts";

const TIPOS_PERMITIDOS = new Set(["email", "signup"]);

function destinoPorRol(rol: string | undefined): string {
  if (rol === "oferente") return "/propiedades";
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
  const next = url.searchParams.get("next");

  if (!tokenHash || !tipo || !TIPOS_PERMITIDOS.has(tipo)) {
    return NextResponse.redirect(new URL("/sign-in?error=confirmacion", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: tipo as "email" | "signup",
  });

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=confirmacion", request.url));
  }

  const actor = await getUsuarioActual();
  const destino = esRutaRelativaSegura(next) ? next : destinoPorRol(actor?.rol);

  return NextResponse.redirect(new URL(destino, request.url));
}
