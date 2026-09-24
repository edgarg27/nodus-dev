"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    formState: { errors, isSubmitting },
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
      <div
        role="status"
        aria-live="polite"
        className="mx-auto flex w-full max-w-[400px] flex-col gap-4 px-4"
      >
        <p className="text-sm text-text">
          Revisa tu correo. Enviamos un enlace de confirmación a {emailEnviado}.
        </p>
        {mensajeReenvio ? <p className="text-sm text-muted-foreground">{mensajeReenvio}</p> : null}
        <Button
          type="button"
          variant="outline"
          onClick={reenviarCorreo}
          disabled={segundosParaReenvio > 0}
        >
          Reenviar correo
        </Button>
        <a href="/sign-in" className="text-sm text-primary underline underline-offset-4">
          Ir a iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex w-full max-w-[400px] flex-col gap-4 px-4"
    >
      {errorEnvio ? (
        <Alert variant="destructive">
          <AlertDescription>{errorEnvio}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" {...register("nombre")} aria-invalid={!!errors.nombre} />
        {errors.nombre ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.nombre.message}
          </p>
        ) : null}
      </div>

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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rol">Quiero</Label>
        <select
          id="rol"
          {...register("rol")}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        >
          <option value="buscador">Buscar propiedades</option>
          <option value="oferente">Publicar propiedades</option>
        </select>
        {errors.rol ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.rol.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="transition-opacity duration-150 ease-out motion-reduce:transition-none disabled:opacity-60"
      >
        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
