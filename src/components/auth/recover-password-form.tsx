"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

// "Olvidé mi contraseña": Supabase manda un enlace que pasa por /auth/confirm y termina en
// /crear-contrasena. El aviso es el mismo exista o no la cuenta (no revela qué correos están
// registrados).
export function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Ingresa un correo electrónico válido");
      return;
    }
    setEnviando(true);
    setError(null);
    const supabase = createClient();
    const { error: errorEnvio } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/crear-contrasena`,
    });
    setEnviando(false);
    if (errorEnvio && /rate|too many/i.test(errorEnvio.message)) {
      setError("Ya te enviamos un correo hace poco. Espera un minuto e intenta de nuevo.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <h1 className="text-[24px] font-bold text-foreground">Revisa tu correo</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Si <strong className="text-foreground">{email.trim()}</strong> tiene una cuenta, te
          enviamos un enlace para crear una contraseña nueva. ¿No lo encuentras? Revisa tu carpeta
          de spam.
        </p>
        <Link href="/sign-in" className="text-sm font-bold text-foreground underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[22px]">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[26px] font-bold text-foreground">Recupera tu contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Te enviaremos un enlace para crear una contraseña nueva.
        </p>
      </div>
      <form onSubmit={enviar} noValidate className="flex w-full flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            className="h-[46px] rounded-lg border-border bg-background px-3.5 text-[15px]"
          />
        </div>
        <Button
          type="submit"
          disabled={enviando}
          aria-busy={enviando}
          className="h-12 rounded-lg bg-accent text-[15px] font-bold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
      <Link
        href="/sign-in"
        className="text-center text-sm font-semibold text-foreground underline underline-offset-4"
      >
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
