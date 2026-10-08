"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { EyeIcon } from "./eye-icon";

const DURACION_AUTO_DESCARTE_MS = 6000;
const SEGUNDOS_ESPERA_REENVIO = 30;

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
  const [segundosParaReenvio, setSegundosParaReenvio] = useState(0);

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

  if (sinConfirmar) {
    return (
      <div className="flex w-full flex-col items-center gap-[22px] text-center">
        <span className="flex h-14 w-14 shrink-0 animate-in items-center justify-center rounded-full bg-accent/15 fade-in zoom-in-75 duration-500 ease-out [animation-delay:120ms] motion-reduce:animate-none">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
            aria-hidden="true"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 6-10 7L2 6" />
          </svg>
        </span>

        <h1 className="text-[24px] font-bold text-foreground">
          Confirma tu correo antes de iniciar sesión
        </h1>

        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          <p className="max-w-[340px] text-sm leading-relaxed text-muted-foreground">
            Te enviamos un enlace de confirmación a{" "}
            <strong className="font-semibold text-foreground">{emailParaReenvio}</strong>.
          </p>
          {mensajeReenvio ? (
            <p className="animate-in fade-in text-sm text-muted-foreground duration-200 ease-out motion-reduce:animate-none">
              {mensajeReenvio}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={reenviarCorreo}
          disabled={segundosParaReenvio > 0}
          className="h-12 w-full rounded-[10px] border-input"
        >
          {segundosParaReenvio > 0 ? `Reenviar en ${segundosParaReenvio}s` : "Reenviar correo"}
        </Button>

        <p className="text-[13px] text-muted-foreground">
          ¿No lo encuentras? Revisa tu carpeta de spam.
        </p>

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-grow bg-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <div className="h-px flex-grow bg-border" />
        </div>

        <button
          type="button"
          onClick={() => setSinConfirmar(false)}
          className="cursor-pointer text-sm font-bold text-foreground underline underline-offset-4 transition-colors hover:text-accent"
        >
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[26px]">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[26px] font-bold text-foreground">Bienvenido de vuelta</h1>
        <p className="text-sm text-muted-foreground">
          Inicia sesión para buscar o publicar espacios
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex w-full flex-col gap-[18px]"
      >
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
              className="absolute right-2 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <EyeIcon hidden={!passwordVisible} />
            </button>
          </div>
          {errors.password ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          ) : null}
          <Link
            href="/recuperar"
            className="self-end text-[13px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="h-12 rounded-lg bg-accent text-[15px] font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:opacity-60"
        >
          {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-grow bg-border" />
        <span className="text-xs text-muted-foreground">o</span>
        <div className="h-px flex-grow bg-border" />
      </div>

      <Link
        href="/sign-up"
        className="flex h-12 items-center justify-center rounded-lg border border-border text-[15px] font-semibold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-foreground active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        Crear una cuenta nueva
      </Link>
    </div>
  );
}
