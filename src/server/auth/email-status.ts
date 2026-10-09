import { sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";

// ¿Ya existe una cuenta con este correo y ya confirmó su correo? Solo cuentan las confirmadas: un
// registro a medias (sin confirmar) debe poder reintentarse, porque Supabase reenvía el enlace.
// Lee `auth.users` con la conexión de la base (rol dueño); el correo se compara sin importar
// mayúsculas.
export async function correoYaRegistrado(email: string): Promise<boolean> {
  const filas = await db.execute(
    sql`select 1 as existe from auth.users where lower(email) = lower(${email}) and email_confirmed_at is not null limit 1`,
  );
  return filas.length > 0;
}
