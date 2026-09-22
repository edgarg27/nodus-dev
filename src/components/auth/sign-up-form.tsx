"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { buildSignUpArgs, type SignUpInput, signUpSchema } from "@/lib/auth/sign-up";
import { createClient } from "@/lib/supabase/client";

const SEGUNDOS_ESPERA_REENVIO = 60;

interface SignUpFormProps {
  ref?: string;
}

export function SignUpForm({ ref }: SignUpFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { rol: "buscador" },
  });

  const [vista, setVista] = useState<"formulario" | "revisa-correo">("formulario");
  const [emailEnviado, setEmailEnviado] = useState("");
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [segundosParaReenvio, setSegundosParaReenvio] = useState(0);
  const [mensajeReenvio, setMensajeReenvio] = useState<string | null>(null);

  async function onSubmit(data: SignUpInput) {
    setErrorEnvio(null);
    const supabase = createClient();
    const args = buildSignUpArgs(data, ref, window.location.origin);
    const { error } = await supabase.auth.signUp(args);

    if (error) {
      setErrorEnvio(error.message);
      return;
    }

    setEmailEnviado(data.email);
    setVista("revisa-correo");
  }

  async function reenviarCorreo() {
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email: emailEnviado });
    setMensajeReenvio("Correo reenviado");
    setSegundosParaReenvio(SEGUNDOS_ESPERA_REENVIO);
    const intervalo = setInterval(() => {
      setSegundosParaReenvio((segundos) => {
        if (segundos <= 1) {
          clearInterval(intervalo);
          return 0;
        }
        return segundos - 1;
      });
    }, 1000);
  }

  if (vista === "revisa-correo") {
    return (
      <div role="status" aria-live="polite">
        <p>Revisa tu correo. Enviamos un enlace de confirmación a {emailEnviado}.</p>
        {mensajeReenvio ? <p>{mensajeReenvio}</p> : null}
        <button type="button" onClick={reenviarCorreo} disabled={segundosParaReenvio > 0}>
          Reenviar correo
        </button>
        <a href="/sign-in">Ir a iniciar sesión</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorEnvio ? <p role="alert">{errorEnvio}</p> : null}

      <label htmlFor="nombre">Nombre</label>
      <input id="nombre" {...register("nombre")} />
      {errors.nombre ? <p role="alert">{errors.nombre.message}</p> : null}

      <label htmlFor="email">Correo electrónico</label>
      <input id="email" type="email" {...register("email")} />
      {errors.email ? <p role="alert">{errors.email.message}</p> : null}

      <label htmlFor="password">Contraseña</label>
      <input id="password" type="password" {...register("password")} />
      {errors.password ? <p role="alert">{errors.password.message}</p> : null}

      <label htmlFor="rol">Quiero</label>
      <select id="rol" {...register("rol")}>
        <option value="buscador">Buscar propiedades</option>
        <option value="oferente">Publicar propiedades</option>
      </select>
      {errors.rol ? <p role="alert">{errors.rol.message}</p> : null}

      <button type="submit">Crear cuenta</button>
    </form>
  );
}
