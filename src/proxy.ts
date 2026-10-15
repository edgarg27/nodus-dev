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

// Rutas que exigen sesión. El resto del sitio es público, pero pasa igual por el proxy para refrescar
// el token: un Server Component no puede guardar cookies, así que si el token vence en una página
// pública y nadie lo refresca aquí, Supabase rota el refresh token sin que el navegador lo reciba y
// la siguiente petición cierra la sesión.
const PREFIJOS_PROTEGIDOS = [
  "/panel",
  "/perfil",
  "/red",
  "/mensajes",
  "/propiedades",
  "/leads",
  "/broker",
  "/verificacion",
  "/favoritos",
  "/mis-busquedas",
  "/inicio",
  "/admin",
  "/api/v1/admin",
];

function esRutaProtegida(pathname: string): boolean {
  return PREFIJOS_PROTEGIDOS.some(
    (prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`),
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

  // Página pública: la sesión ya quedó refrescada en `response`; no se exige nada más.
  if (!esRutaProtegida(request.nextUrl.pathname)) return response;

  if (!haySesion) {
    if (esApiAdmin) return apiNoAutenticado();

    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Cuenta confirmada que aún no crea su contraseña (el registro no la pide): primero eso.
  const metadata = (data.claims as { user_metadata?: { crear_password?: unknown } }).user_metadata;
  if (metadata?.crear_password === true && !esApiAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/crear-contrasena";
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
  // Todas las páginas (para refrescar la sesión), menos estáticos e imágenes. Las rutas /api/*
  // quedan fuera: un Route Handler sí puede guardar cookies; solo /api/v1/admin exige el proxy.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|demo|nodus|vendor|videos|.*[.](?:svg|png|jpg|jpeg|gif|webp|ico|mjs|js|css|woff2?)$).*)",
    "/api/v1/admin/:path*",
  ],
};
