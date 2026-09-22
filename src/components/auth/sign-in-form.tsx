"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

type SignInInput = z.infer<typeof signInSchema>;

interface SignInFormProps {
  errorConfirmacion?: boolean;
}

export function SignInForm({ errorConfirmacion }: SignInFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const [sinConfirmar, setSinConfirmar] = useState(false);
  const [emailParaReenvio, setEmailParaReenvio] = useState("");
  const [errorGenerico, setErrorGenerico] = useState<string | null>(
    errorConfirmacion ? "El enlace de confirmación no es válido o venció" : null,
  );
  const [mensajeReenvio, setMensajeReenvio] = useState<string | null>(null);

  async function onSubmit(data: SignInInput) {
    setErrorGenerico(null);
    setSinConfirmar(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      if (error.code === "email_not_confirmed") {
        setSinConfirmar(true);
        setEmailParaReenvio(data.email);
        return;
      }
      setErrorGenerico("Correo o contraseña incorrectos");
      return;
    }

    // La sesión ya quedó en cookies del cliente de navegador (@supabase/ssr). Una recarga
    // completa deja que el Server Component de esta misma página redirija al panel del rol
    // (o a `next`) — la única fuente de esa lógica, sin duplicarla aquí.
    window.location.assign(window.location.href);
  }

  async function reenviarCorreo() {
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email: emailParaReenvio });
    setMensajeReenvio("Correo reenviado");
  }

  if (sinConfirmar) {
    return (
      <div>
        <p role="alert">Confirma tu correo antes de iniciar sesión</p>
        {mensajeReenvio ? (
          <p role="status" aria-live="polite">
            {mensajeReenvio}
          </p>
        ) : null}
        <button type="button" onClick={reenviarCorreo}>
          Reenviar correo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorGenerico ? <p role="alert">{errorGenerico}</p> : null}

      <label htmlFor="email">Correo electrónico</label>
      <input id="email" type="email" {...register("email")} />
      {errors.email ? <p role="alert">{errors.email.message}</p> : null}

      <label htmlFor="password">Contraseña</label>
      <input id="password" type="password" {...register("password")} />
      {errors.password ? <p role="alert">{errors.password.message}</p> : null}

      <button type="submit">Iniciar sesión</button>
    </form>
  );
}
