import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, requireEnv } from "../env.ts";

// Cliente de Supabase para Server Components y Route Handlers — las cookies las administra
// @supabase/ssr (sus atributos por defecto son UNVERIFIED, §8 Sesiones).
export async function createClient() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Llamado desde un Server Component: el proxy refresca la sesión en el siguiente request.
          }
        },
      },
    },
  );
}
