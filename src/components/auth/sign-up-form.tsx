"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import Link from "next/link";
import { type KeyboardEvent, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildSignUpArgs, type SignUpInput, signUpSchema } from "@/lib/auth/sign-up";
import { createClient } from "@/lib/supabase/client";
import { EyeIcon } from "./eye-icon";

const SEGUNDOS_ESPERA_REENVIO = 30;
const DURACION_AUTO_DESCARTE_MS = 6000;

const OPCIONES_ROL = [
  { valor: "buscador", etiqueta: "Busco un espacio" },
  { valor: "oferente", etiqueta: "Ofrezco un espacio" },
] as const;

interface SignUpFormProps {
  ref?: string;
}

function traducirErrorSignUp(mensaje: string): string {
  if (/already registered|already exists/i.test(mensaje)) {
    return "Este correo ya está registrado";
  }
  return "No pudimos crear tu cuenta. Intenta de nuevo.";
}

export function SignUpForm({ ref }: SignUpFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { rol: "buscador" },
  });

  const rol = watch("rol");

  const [vista, setVista] = useState<"formulario" | "revisa-correo">("formulario");
  const [emailEnviado, setEmailEnviado] = useState("");
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [segundosParaReenvio, setSegundosParaReenvio] = useState(0);
  const [mensajeReenvio, setMensajeReenvio] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (!errorEnvio) return;
    const timeoutId = setTimeout(() => setErrorEnvio(null), DURACION_AUTO_DESCARTE_MS);
    return () => clearTimeout(timeoutId);
  }, [errorEnvio]);

  useEffect(() => {
    if (!mensajeReenvio) return;
    const timeoutId = setTimeout(() => setMensajeReenvio(null), DURACION_AUTO_DESCARTE_MS);
    return () => clearTimeout(timeoutId);
  }, [mensajeReenvio]);

  useEffect(() => {
    if (
      !errors.nombre &&
      !errors.email &&
      !errors.password &&
      !errors.rol &&
      !errors.aceptaTerminos
    )
      return;
    const timeoutId = setTimeout(() => clearErrors(), DURACION_AUTO_DESCARTE_MS);
    return () => clearTimeout(timeoutId);
  }, [
    errors.nombre,
    errors.email,
    errors.password,
    errors.rol,
    errors.aceptaTerminos,
    clearErrors,
  ]);

  function seleccionarRol(valor: (typeof OPCIONES_ROL)[number]["valor"]) {
    setValue("rol", valor, { shouldValidate: true });
  }

  function onRolKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const indiceActual = OPCIONES_ROL.findIndex((opcion) => opcion.valor === rol);
    const paso = event.key === "ArrowRight" ? 1 : -1;
    const siguiente = OPCIONES_ROL.at((indiceActual + paso) % OPCIONES_ROL.length);
    if (siguiente) seleccionarRol(siguiente.valor);
  }

  async function onSubmit(data: SignUpInput) {
    setErrorEnvio(null);
    const supabase = createClient();
    const args = buildSignUpArgs(data, ref, window.location.origin);
    const { error } = await supabase.auth.signUp(args);

    if (error) {
      setErrorEnvio(traducirErrorSignUp(error.message));
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

        <h1 className="text-[24px] font-bold text-foreground">Revisa tu correo</h1>

        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          <p className="max-w-[340px] text-sm leading-relaxed text-muted-foreground">
            Enviamos un enlace de confirmación a{" "}
            <strong className="font-semibold text-foreground">{emailEnviado}</strong>. Ábrelo para
            activar tu cuenta.
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

        <a
          href="/sign-in"
          className="text-sm font-bold text-foreground underline underline-offset-4 transition-colors hover:text-accent"
        >
          Ir a iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[22px]">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[26px] font-bold text-foreground">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Empieza a buscar o publicar espacios en minutos
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-4">
        {errorEnvio ? (
          <Alert
            variant="destructive"
            className="animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
          >
            <AlertDescription>{errorEnvio}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="nombre" className="text-[13px] font-semibold text-foreground">
            Nombre completo
          </Label>
          <Input
            id="nombre"
            placeholder="Tu nombre"
            className="h-[46px] rounded-lg border-border bg-background px-3.5 text-[15px]"
            {...register("nombre")}
            aria-invalid={!!errors.nombre}
          />
          {errors.nombre ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.nombre.message}
            </p>
          ) : null}
        </div>

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
              placeholder="Mínimo 8 caracteres"
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
        </div>

        <div>
          <span id="rol-label" className="text-[13px] font-semibold text-foreground">
            Quiero
          </span>
          <div
            id="rol"
            role="radiogroup"
            aria-labelledby="rol-label"
            tabIndex={0}
            onKeyDown={onRolKeyDown}
            className="mt-2 flex gap-1 rounded-[10px] border border-border bg-background p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {OPCIONES_ROL.map((opcion) => (
              // biome-ignore lint/a11y/useSemanticElements: control segmentado con foco en el contenedor y flechas para cambiar de opción (patrón APG de radiogroup), no un <input type="radio"> individualmente enfocable
              <button
                key={opcion.valor}
                type="button"
                role="radio"
                aria-checked={rol === opcion.valor}
                tabIndex={-1}
                onClick={() => seleccionarRol(opcion.valor)}
                className={cn(
                  "type-toggle-btn h-[38px] flex-1 cursor-pointer rounded-lg text-[13px] font-semibold transition-all duration-150 ease-out",
                  rol === opcion.valor
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-card hover:text-foreground",
                )}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          {errors.rol ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {errors.rol.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
              {...register("aceptaTerminos")}
              aria-invalid={!!errors.aceptaTerminos}
            />
            <span>
              Acepto los{" "}
              <a
                href="/terminos"
                target="_blank"
                rel="noreferrer"
                className="relative font-semibold text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100"
              >
                términos y condiciones
              </a>{" "}
              y el{" "}
              <a
                href="/aviso-privacidad"
                target="_blank"
                rel="noreferrer"
                className="relative font-semibold text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100"
              >
                aviso de privacidad
              </a>
            </span>
          </label>
          {errors.aceptaTerminos ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.aceptaTerminos.message}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="h-12 rounded-lg bg-accent text-[15px] font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:opacity-60"
        >
          {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-grow bg-border" />
        <span className="text-xs text-muted-foreground">o</span>
        <div className="h-px flex-grow bg-border" />
      </div>

      <Link
        href="/sign-in"
        className="flex h-12 items-center justify-center rounded-lg border border-border text-[15px] font-semibold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-foreground active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        Ya tengo una cuenta
      </Link>
    </div>
  );
}
