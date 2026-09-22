import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, requireEnv } from "../env.ts";
import * as schema from "./schema.ts";

requireEnv(["DATABASE_URL"]);

// Pooler Supavisor en modo transacción (puerto 6543): no soporta sentencias preparadas
// (§10 Gotcha #8), por eso `prepare: false`. `max` acotado a 5 para no agotar el pooler compartido
// (proyecto Supabase alojado `nodus-dev`, §10 Gotcha #16).
const client = postgres(env.DATABASE_URL as string, { prepare: false, max: 5 });

export const db = drizzle(client, { schema });
