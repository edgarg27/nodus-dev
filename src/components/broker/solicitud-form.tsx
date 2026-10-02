"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SolicitudEnviada } from "./solicitud-enviada";

const MENSAJE_MAXIMO = 500;
const EMPRESA_MAXIMO = 200;

const solicitudSchema = z.object({
  empresa: z.string().trim().min(1, "La empresa es obligatoria").max(EMPRESA_MAXIMO),
  mensaje: z.string().trim().min(1, "El mensaje es obligatorio").max(MENSAJE_MAXIMO),
});

type SolicitudInput = z.infer<typeof solicitudSchema>;

interface SolicitudFormProps {
  nombre: string;
  correo: string;
}

export function SolicitudForm({ nombre, correo }: SolicitudFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SolicitudInput>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: { empresa: "", mensaje: "" },
  });
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const mensaje = watch("mensaje") ?? "";

  async function onSubmit(datos: SolicitudInput) {
    setErrorEnvio(null);
    setEnviando(true);

    const respuesta = await fetch("/api/v1/broker-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: datos.mensaje, empresa: datos.empresa }),
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

    setEnviado(true);
  }

  if (enviado) return <SolicitudEnviada />;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5 rounded-[20px] border border-border bg-surface p-9 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none max-sm:p-6"
    >
      {errorEnvio ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {errorEnvio}
        </p>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] font-semibold text-foreground">Nombre</dt>
          <dd className="text-[15px] text-muted-foreground">{nombre}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] font-semibold text-foreground">Correo</dt>
          <dd className="text-[15px] break-all text-muted-foreground">{correo}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <Label htmlFor="empresa" className="text-[13px] font-semibold text-foreground">
          Empresa
        </Label>
        <Input
          id="empresa"
          maxLength={EMPRESA_MAXIMO}
          className="h-[46px] rounded-lg border-input bg-background px-3.5 text-[15px]"
          {...register("empresa")}
          aria-invalid={!!errors.empresa}
        />
        {errors.empresa ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.empresa.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="mensaje" className="text-[13px] font-semibold text-foreground">
            Nota para el equipo de Nodus
          </Label>
          <span className="text-xs text-muted-foreground">{mensaje.length}/500</span>
        </div>
        <Textarea
          id="mensaje"
          rows={5}
          maxLength={MENSAJE_MAXIMO}
          placeholder="Cuéntanos a cuántos clientes representas, en qué zonas operas y cualquier detalle que ayude a revisar tu solicitud."
          className="resize-y rounded-lg border-input bg-background px-3.5 py-3 text-[15px]"
          {...register("mensaje")}
          aria-invalid={!!errors.mensaje}
        />
        {errors.mensaje ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.mensaje.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <p className="max-w-[300px] text-[12.5px] text-muted-foreground">
          Tu solicitud queda en estado <strong className="text-warning">Pendiente</strong> hasta que
          un administrador la revise.
        </p>
        <Button
          type="submit"
          disabled={enviando || isSubmitting}
          aria-busy={enviando}
          className="h-[48px] rounded-lg bg-accent px-6 text-[15px] font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md motion-reduce:transition-none disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </form>
  );
}
