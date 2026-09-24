"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    formState: { errors, isSubmitting },
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
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-4 px-4">
        <Alert variant="destructive">
          <AlertDescription>Confirma tu correo antes de iniciar sesión</AlertDescription>
        </Alert>
        {mensajeReenvio ? (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {mensajeReenvio}
          </p>
        ) : null}
        <Button type="button" variant="outline" onClick={reenviarCorreo}>
          Reenviar correo
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex w-full max-w-[400px] flex-col gap-4 px-4"
    >
      {errorGenerico ? (
        <Alert variant="destructive">
          <AlertDescription>{errorGenerico}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
        {errors.email ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="transition-opacity duration-150 ease-out motion-reduce:transition-none disabled:opacity-60"
      >
        {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
