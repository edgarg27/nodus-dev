import { describe, expect, it } from "vitest";
import { buildSignUpArgs, validarSignUp } from "../../src/lib/auth/sign-up.ts";

const base = {
  nombre: "Ana Prueba",
  email: "ana@example.com",
  password: "password123",
  rol: "buscador",
};

describe("validarSignUp", () => {
  it("nombre ausente o solo espacios → 422", () => {
    const { nombre: _omit, ...sinNombre } = base;
    const resultadoAusente = validarSignUp(sinNombre);
    expect(resultadoAusente.ok).toBe(false);
    if (!resultadoAusente.ok) expect(resultadoAusente.error.status).toBe(422);

    const resultadoEspacios = validarSignUp({ ...base, nombre: "   " });
    expect(resultadoEspacios.ok).toBe(false);
    if (!resultadoEspacios.ok) expect(resultadoEspacios.error.status).toBe(422);
  });

  it("rol admin o root → 422; buscador/oferente pasan", () => {
    expect(validarSignUp({ ...base, rol: "admin" }).ok).toBe(false);
    expect(validarSignUp({ ...base, rol: "root" }).ok).toBe(false);
    expect(validarSignUp({ ...base, rol: "buscador" }).ok).toBe(true);
    expect(validarSignUp({ ...base, rol: "oferente" }).ok).toBe(true);
  });

  it("password de 7 caracteres → 422", () => {
    const resultado = validarSignUp({ ...base, password: "1234567" });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.status).toBe(422);
  });
});

describe("buildSignUpArgs", () => {
  it("con ref trae options.data.ref y emailRedirectTo terminado en /auth/confirm", () => {
    const validado = validarSignUp(base);
    if (!validado.ok) throw new Error("fixture inválido");

    const args = buildSignUpArgs(validado.data, "BRK-1", "http://localhost:3000");

    expect(args.options.data).toEqual({
      nombre: base.nombre,
      rol: base.rol,
      ref: "BRK-1",
    });
    expect(args.options.emailRedirectTo).toBe("http://localhost:3000/auth/confirm");
  });

  it("sin ref la clave ref no existe en options.data", () => {
    const validado = validarSignUp(base);
    if (!validado.ok) throw new Error("fixture inválido");

    const args = buildSignUpArgs(validado.data, undefined, "http://localhost:3000");

    expect("ref" in args.options.data).toBe(false);
  });
});
