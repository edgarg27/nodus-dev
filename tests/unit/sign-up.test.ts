import { describe, expect, it } from "vitest";
import { datosPropietarioDeMetadata } from "../../src/lib/auth/datos-propietario.ts";
import {
  buildSignUpArgs,
  contrasenaProvisional,
  validarSignUp,
} from "../../src/lib/auth/sign-up.ts";

const base = {
  nombre: "Ana Prueba",
  email: "ana@example.com",
  rol: "buscador",
  aceptaTerminos: true,
};

const propietario = {
  ...base,
  rol: "propietario",
  telefono: "+52 444 123 4567",
  tipoAnunciante: "particular",
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

  it("rol admin o root → 422; buscador/propietario pasan", () => {
    expect(validarSignUp({ ...base, rol: "admin" }).ok).toBe(false);
    expect(validarSignUp({ ...base, rol: "root" }).ok).toBe(false);
    expect(validarSignUp({ ...base, rol: "buscador" }).ok).toBe(true);
    expect(validarSignUp(propietario).ok).toBe(true);
  });

  it("no pide contraseña: el registro pasa sin ella", () => {
    expect(validarSignUp(base).ok).toBe(true);
  });

  it("aceptaTerminos ausente o en false → 422", () => {
    const { aceptaTerminos: _omit, ...sinAceptar } = base;
    expect(validarSignUp(sinAceptar).ok).toBe(false);
    expect(validarSignUp({ ...base, aceptaTerminos: false }).ok).toBe(false);
  });

  it("un propietario debe dar teléfono válido y cómo publica", () => {
    const sinTelefono = validarSignUp({ ...propietario, telefono: "" });
    expect(sinTelefono.ok).toBe(false);
    if (!sinTelefono.ok) {
      expect(sinTelefono.error.details.map((d) => d.field)).toContain("telefono");
    }
    expect(validarSignUp({ ...propietario, telefono: "12345" }).ok).toBe(false);
    expect(validarSignUp({ ...propietario, telefono: "44a123b4567" }).ok).toBe(false);
    expect(validarSignUp({ ...propietario, tipoAnunciante: undefined }).ok).toBe(false);
    expect(validarSignUp({ ...propietario, tipoAnunciante: "admin" }).ok).toBe(false);
  });

  it("una inmobiliaria debe dar el nombre de la empresa", () => {
    const sinEmpresa = validarSignUp({ ...propietario, tipoAnunciante: "inmobiliaria" });
    expect(sinEmpresa.ok).toBe(false);
    if (!sinEmpresa.ok) expect(sinEmpresa.error.details.map((d) => d.field)).toContain("empresa");
    expect(
      validarSignUp({ ...propietario, tipoAnunciante: "inmobiliaria", empresa: "Ontigón" }).ok,
    ).toBe(true);
  });

  it("un buscador no necesita datos de propietario", () => {
    expect(validarSignUp({ ...base, telefono: "" }).ok).toBe(true);
  });
});

describe("buildSignUpArgs", () => {
  it("con ref trae options.data.ref, marca crear_password y emailRedirectTo a /auth/confirm", () => {
    const validado = validarSignUp(base);
    if (!validado.ok) throw new Error("fixture inválido");

    const args = buildSignUpArgs(validado.data, "BRK-1", "http://localhost:3000");

    expect(args.options.data).toEqual({
      nombre: base.nombre,
      rol: base.rol,
      crear_password: true,
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

  it("un propietario manda teléfono, tipo y empresa en la metadata", () => {
    const validado = validarSignUp({
      ...propietario,
      tipoAnunciante: "inmobiliaria",
      empresa: " Ontigón ",
    });
    if (!validado.ok) throw new Error("fixture inválido");

    const args = buildSignUpArgs(validado.data, undefined, "http://localhost:3000");

    expect(args.options.data).toMatchObject({
      rol: "propietario",
      telefono: "+52 444 123 4567",
      tipo_anunciante: "inmobiliaria",
      empresa: "Ontigón",
    });
    expect(datosPropietarioDeMetadata(args.options.data)).toEqual({
      telefono: "+52 444 123 4567",
      tipoAnunciante: "inmobiliaria",
      empresa: "Ontigón",
    });
  });

  it("usa una contraseña provisional aleatoria y distinta cada vez", () => {
    const validado = validarSignUp(base);
    if (!validado.ok) throw new Error("fixture inválido");
    const a = buildSignUpArgs(validado.data, undefined, "http://localhost:3000").password;
    const b = buildSignUpArgs(validado.data, undefined, "http://localhost:3000").password;
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(contrasenaProvisional()).toMatch(/[a-z]/);
    expect(contrasenaProvisional()).toMatch(/[A-Z]/);
    expect(contrasenaProvisional()).toMatch(/\d/);
    expect(contrasenaProvisional()).toMatch(/[^a-zA-Z0-9]/);
  });
});

describe("datosPropietarioDeMetadata", () => {
  it("ignora metadata inválida (la fija el cliente)", () => {
    expect(datosPropietarioDeMetadata({ telefono: "x", tipo_anunciante: "particular" })).toBeNull();
    expect(
      datosPropietarioDeMetadata({ telefono: "4441234567", tipo_anunciante: "admin" }),
    ).toBeNull();
    expect(datosPropietarioDeMetadata({})).toBeNull();
  });
});
