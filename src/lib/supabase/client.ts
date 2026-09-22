import { createBrowserClient } from "@supabase/ssr";
import { env, requireEnv } from "../env.ts";

// Cliente de Supabase para Client Components (navegador). Solo puede ver variables
// NEXT_PUBLIC_* — Next las inlinea en el bundle del navegador por acceso literal (paso 1, §10).
export function createClient() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
