"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { EyeIcon } from "./eye-icon";

const MINIMO = 8;

interface CreatePasswordFormProps {
  // A dónde ir al terminar (ya validado por la página: ruta relativa).
  destino: string;
  // "nueva": primera contraseña tras confirmar el correo; "recuperar": viene de "olvidé mi contraseña".
  modo: "nueva" | "recuperar";
}

// Fija la contraseña de la sesión actual (llegó por el enlace del correo) y quita la marca
// `crear_password` de la cuenta. Refresca la sesión para que el proxy vea la marca ya apagada.
export function CreatePasswordForm({ destino, modo }: CreatePasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (password.length < MINIMO) {
      setError(`La contraseña debe tener al menos ${MINIMO} caracteres`);
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const { error: errorGuardar } = await supabase.auth.updateUser({
      password,
      data: { crear_password: false },
    });
    if (errorGuardar) {
      setGuardando(false);
      setError(
        /should be different|same/i.test(errorGuardar.message)
          ? "Usa una contraseña distinta a la anterior"
          : /weak|characters|strength/i.test(errorGuardar.message)
            ? "La contraseña es muy débil. Combina letras, números y símbolos."
            : "No pudimos guardar tu contraseña. Intenta de nuevo.",
      );
      return;
    }
    await supabase.auth.refreshSession();
    window.location.assign(destino);
  }

  return (
    <div className="flex w-full flex-col gap-[22px]">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[26px] font-bold text-foreground">
          {modo === "nueva" ? "Crea tu contraseña" : "Nueva contraseña"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {modo === "nueva"
            ? "Tu correo quedó confirmado. Elige la contraseña con la que vas a entrar."
            : "Elige una contraseña nueva para tu cuenta."}
        </p>
      </div>

      <form onSubmit={guardar} noValidate className="flex w-full flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-[13px] font-semibold text-foreground">
            Contraseña
          </Label>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              placeholder={`Mínimo ${MINIMO} caracteres`}
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              className="h-[46px] rounded-lg border-border bg-background pr-11 pl-3.5 text-[15px]"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <EyeIcon hidden={!visible} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmacion" className="text-[13px] font-semibold text-foreground">
            Confirma tu contraseña
          </Label>
          <Input
            id="confirmacion"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
            className="h-[46px] rounded-lg border-border bg-background px-3.5 text-[15px]"
          />
        </div>

        <Button
          type="submit"
          disabled={guardando}
          aria-busy={guardando}
          className="h-12 rounded-lg bg-accent text-[15px] font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md disabled:opacity-60 motion-reduce:transition-none"
        >
          {guardando ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </div>
  );
}
