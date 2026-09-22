import { describe, expect, it } from "vitest";
import { type Rol, requireRol } from "../../src/server/auth/guards.ts";
import type { ActorAutenticado } from "../../src/server/auth/session.ts";

function actor(rol: Rol): ActorAutenticado {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: "actor@example.com",
    nombre: "Actor de prueba",
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
}

const roles: Rol[] = ["buscador", "oferente", "admin"];
const actores: (ActorAutenticado | null)[] = [...roles.map(actor), null];

describe("requireRol", () => {
  for (const actorActual of actores) {
    for (const rolPedido of roles) {
      const esperado = actorActual !== null && actorActual.rol === rolPedido;
      const etiquetaActor = actorActual === null ? "null" : actorActual.rol;

      it(`actor ${etiquetaActor} contra rol ${rolPedido} → ${esperado ? "ok" : "no ok"}`, () => {
        expect(() => requireRol(actorActual, rolPedido)).not.toThrow();
        const resultado = requireRol(actorActual, rolPedido);
        expect(resultado.ok).toBe(esperado);
      });
    }
  }
});
