"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
    formState: { errors },
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorEnvio ? <p aria-live="polite">{errorEnvio}</p> : null}

      <label htmlFor="mensaje">Empresa y nota para el equipo de Nodus</label>
      <textarea id="mensaje" maxLength={MENSAJE_MAXIMO} {...register("mensaje")} />
      <p>
        {mensaje.length}/{MENSAJE_MAXIMO}
      </p>
      {errors.mensaje ? <p role="alert">{errors.mensaje.message}</p> : null}

      <button type="submit" disabled={enviando}>
        Enviar solicitud
      </button>
    </form>
  );
}
