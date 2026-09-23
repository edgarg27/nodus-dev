import { createServerClient } from "@supabase/ssr";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { usuario } from "./lib/db/schema.ts";
import { env, requireEnv } from "./lib/env.ts";

function requestId(): string {
  return `req_${crypto.randomUUID()}`;
}

function apiNoAutenticado() {
  return NextResponse.json(
    { error: { code: "unauthenticated", message: "Sesión requerida", request_id: requestId() } },
    { status: 401 },
  );
}

function apiNoEncontrado() {
  return NextResponse.json(
    { error: { code: "not_found", message: "No encontrado", request_id: requestId() } },
    { status: 404 },
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Nunca getSession() en el proxy — getClaims() verifica la firma del JWT.
  const { data, error } = await supabase.auth.getClaims();
  const haySesion = !error && !!data?.claims;

  const esApiAdmin = request.nextUrl.pathname.startsWith("/api/v1/admin");
  const esSuperficieAdmin = esApiAdmin || request.nextUrl.pathname.startsWith("/admin");

  if (!haySesion) {
    if (esApiAdmin) return apiNoAutenticado();

    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (esSuperficieAdmin) {
    const claims = data.claims as { sub: string };
    // Import dinámico, solo en esta rama: el proxy corre en el runtime de Node.js (verificado por
    // este mismo build) y así el resto de rutas nunca carga la conexión a la base.
    const { db } = await import("./lib/db/client.ts");
    const [fila] = await db
      .select({ rol: usuario.rol })
      .from(usuario)
      .where(eq(usuario.id, claims.sub));

    if (fila?.rol !== "admin") {
      // 404, nunca 403: no confirma que la ruta exista.
      return esApiAdmin ? apiNoEncontrado() : new NextResponse(null, { status: 404 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/propiedades/:path*",
    "/leads/:path*",
    "/broker/:path*",
    "/admin/:path*",
    "/api/v1/admin/:path*",
  ],
};
