import { redirect } from "next/navigation";
import { getUsuarioActual } from "./session";

export function destinoPorRol(rol: string): string {
  if (rol === "propietario") return "/panel";
  if (rol === "admin") return "/admin/propiedades";
  return "/buscar";
}

function esRutaRelativaSegura(next: string | undefined): next is string {
  return !!next && next.startsWith("/") && !next.startsWith("//");
}

// Ingresar, registrarse o recuperar la contraseña no tienen sentido con una sesión abierta: se
// manda a la persona a `next` (si es una ruta del sitio) o al inicio de su rol.
export async function redirigirSiHaySesion(next?: string): Promise<void> {
  const actor = await getUsuarioActual();
  if (actor) redirect(esRutaRelativaSegura(next) ? next : destinoPorRol(actor.rol));
}
