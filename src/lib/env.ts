export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_MAPTILER_KEY: process.env.NEXT_PUBLIC_MAPTILER_KEY,
  MAPTILER_API_KEY: process.env.MAPTILER_API_KEY,
} satisfies Record<string, string | undefined>;

export function requireEnv(keys: (keyof typeof env)[]): void {
  for (const key of keys) {
    const value = env[key];
    if (value === undefined || value === "") {
      throw new Error(`Falta la variable de entorno ${key}`);
    }
  }
}
