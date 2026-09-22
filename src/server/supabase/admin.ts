import { createClient } from "@supabase/supabase-js";
import { env, requireEnv } from "../../lib/env.ts";

/**
 * Cliente con la llave de servicio — solo servidor. La regla de límites de §3 impide que
 * `src/components/**` lo importe, y la llave de servicio nunca llega al navegador (§14).
 */
export function crearClienteAdmin() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
