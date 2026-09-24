"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MENSAJE_MAXIMO = 500;

const solicitudSchema = z.object({
  mensaje: z.string().trim().min(1, "El mensaje es obligatorio").max(MENSAJE_MAXIMO),
});

type SolicitudInput = z.infer<typeof solicitudSchema>;

export function SolicitudForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SolicitudInput>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: { mensaje: "" },
  });
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const mensaje = watch("mensaje") ?? "";

  async function onSubmit(datos: SolicitudInput) {
    setErrorEnvio(null);
    setEnviando(true);

    const respuesta = await fetch("/api/v1/broker-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      setErrorEnvio("Ya tienes una solicitud pendiente");
      router.refresh();
      return;
    }

    const cuerpo = await respuesta.json();
    if (!respuesta.ok) {
      setErrorEnvio(cuerpo.error?.message ?? "No se pudo enviar la solicitud");
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4"
    >
      {errorEnvio ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {errorEnvio}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mensaje">Empresa y nota para el equipo de Nodus</Label>
        <Textarea
          id="mensaje"
          maxLength={MENSAJE_MAXIMO}
          {...register("mensaje")}
          aria-invalid={!!errors.mensaje}
        />
        <p className="text-right text-xs text-muted-foreground">{mensaje.length}/500</p>
        {errors.mensaje ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.mensaje.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={enviando || isSubmitting}
        aria-busy={enviando}
        className="transition-opacity duration-150 ease-out motion-reduce:transition-none disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar solicitud"}
      </Button>
    </form>
  );
}
