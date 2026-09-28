"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const DURACION_AUTO_DESCARTE_MS = 6000;

const signInSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type SignInInput = z.infer<typeof signInSchema>;

interface SignInFormProps {
  errorConfirmacion?: boolean;
}

export function SignInForm({ errorConfirmacion }: SignInFormProps) {
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const [sinConfirmar, setSinConfirmar] = useState(false);
  const [emailParaReenvio, setEmailParaReenvio] = useState("");
  const [errorGenerico, setErrorGenerico] = useState<string | null>(
    errorConfirmacion ? "El enlace de confirmación no es válido o venció" : null,
  );
  const [mensajeReenvio, setMensajeReenvio] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (!errorGenerico) return;
    const timeoutId = setTimeout(() => setErrorGenerico(null), DURACION_AUTO_DESCARTE_MS);
    return () => clearTimeout(timeoutId);
  }, [errorGenerico]);

  useEffect(() => {
    if (!mensajeReenvio) return;
    const timeoutId = setTimeout(() => setMensajeReenvio(null), DURACION_AUTO_DESCARTE_MS);
    return () => clearTimeout(timeoutId);
  }, [mensajeReenvio]);

  useEffect(() => {
    if (!errors.email && !errors.password) return;
    const timeoutId = setTimeout(() => clearErrors(), DURACION_AUTO_DESCARTE_MS);
    return () => clearTimeout(timeoutId);
  }, [errors.email, errors.password, clearErrors]);

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
      <div className="flex w-full flex-col gap-4">
        <Alert
          variant="destructive"
          className="animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
        >
          <AlertDescription>Confirma tu correo antes de iniciar sesión</AlertDescription>
        </Alert>
        {mensajeReenvio ? (
          <p
            role="status"
            aria-live="polite"
            className="animate-in fade-in text-sm text-muted-foreground duration-200 ease-out motion-reduce:animate-none"
          >
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-[18px]">
      {errorGenerico ? (
        <Alert
          variant="destructive"
          className="animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
        >
          <AlertDescription>{errorGenerico}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">
          Correo electrónico
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@empresa.com"
          className="h-[46px] rounded-lg border-border bg-background px-3.5 text-[15px]"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-[13px] font-semibold text-foreground">
          Contraseña
        </Label>
        <div className="relative flex items-center">
          <Input
            id="password"
            type={passwordVisible ? "text" : "password"}
            placeholder="••••••••"
            className="h-[46px] rounded-lg border-border bg-background pr-11 pl-3.5 text-[15px]"
            {...register("password")}
            aria-invalid={!!errors.password}
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2 flex h-[30px] w-[30px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <EyeIcon hidden={!passwordVisible} />
          </button>
        </div>
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
        className="h-12 rounded-lg bg-accent text-[15px] font-bold text-accent-foreground transition-all duration-150 ease-out hover:bg-accent/90 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:opacity-60"
      >
        {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
