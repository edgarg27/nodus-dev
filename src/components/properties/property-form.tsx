"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Sugerencia } from "./address-autocomplete";
import { PropertyFormBasicsFields } from "./property-form-basics-fields";
import { PropertyFormDetailsFields } from "./property-form-details-fields";
import { PropertyFormLocationField } from "./property-form-location-field";
import { PropertyFormReviewDialog } from "./property-form-review-dialog";
import {
  CAMPOS_NUMERICOS_FORMULARIO,
  estadoDesdeGeocode,
  type PropertyFormInitialData,
  type PropertyFormValues,
  propertyFormSchema,
  textoANumero,
} from "./property-form-schema";
import { PropertyFormSuccess } from "./property-form-success";
import { PropertyPhotoField } from "./property-photo-field";

export type { PropertyFormInitialData } from "./property-form-schema";

interface PropertyFormProps {
  propiedad?: PropertyFormInitialData;
}

interface ErrorApi {
  code?: string;
  message?: string;
  details?: Array<{ existing_property_id?: string }>;
}

async function subirFoto(propiedadId: string, archivo: File): Promise<void> {
  const formData = new FormData();
  formData.append("archivo", archivo);
  const respuesta = await fetch(`/api/v1/properties/${propiedadId}/photos`, {
    method: "POST",
    body: formData,
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw (cuerpo?.error as ErrorApi) ?? { message: "No se pudo subir la foto" };
  }
}

export function PropertyForm({ propiedad }: PropertyFormProps) {
  const router = useRouter();
  const modo = propiedad ? "editar" : "nueva";

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: propiedad
      ? {
          tipo: propiedad.tipo,
          modalidad: propiedad.modalidad,
          direccion: propiedad.direccion,
          lat: propiedad.lat,
          lng: propiedad.lng,
          estado: propiedad.estado,
          ciudad: propiedad.ciudad,
          descripcion: propiedad.descripcion,
          aceptaFinanciamiento: propiedad.aceptaFinanciamiento ? "true" : "false",
          moneda: propiedad.moneda === "USD" ? "USD" : "MXN",
          precioUnidad: propiedad.precioUnidad === "m2" ? "m2" : "total",
          ...Object.fromEntries(
            CAMPOS_NUMERICOS_FORMULARIO.map((campo) => [
              campo,
              propiedad[campo] === null ? "" : String(propiedad[campo]),
            ]),
          ),
        }
      : { aceptaFinanciamiento: "false", moneda: "MXN", precioUnidad: "total" },
  });

  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const [fotosExistentes, setFotosExistentes] = useState(propiedad?.fotos ?? []);
  const [mensajeDuplicado, setMensajeDuplicado] = useState<{ id: string } | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [coordenadasTocadas, setCoordenadasTocadas] = useState(Boolean(propiedad));
  // El geocode solo aproxima (MapTiler no conoce muchas colonias): una ubicación calculada no se
  // envía hasta que el oferente confirma el pin o lo coloca él mismo.
  const [ubicacionConfirmada, setUbicacionConfirmada] = useState(Boolean(propiedad));
  const [mostrarExito, setMostrarExito] = useState(false);
  // Valores ya validados en espera de que el oferente acepte devolver la propiedad a revisión.
  const [valoresPorConfirmar, setValoresPorConfirmar] = useState<PropertyFormValues | null>(null);

  const lat = watch("lat");
  const tipo = watch("tipo");
  const modalidad = watch("modalidad");
  const lng = watch("lng");

  function alTocarCoordenadas() {
    setCoordenadasTocadas(true);
    setUbicacionConfirmada(true);
  }

  function alMoverPin(latNueva: number, lngNueva: number) {
    alTocarCoordenadas();
    setValue("lat", latNueva, { shouldValidate: true });
    setValue("lng", lngNueva, { shouldValidate: true });
  }

  function alSeleccionarSugerencia(sugerencia: Sugerencia) {
    // Una sugerencia sigue siendo una ubicación calculada: el pin se vuelve a confirmar.
    setCoordenadasTocadas(true);
    setUbicacionConfirmada(false);
    setValue("direccion", sugerencia.direccion, { shouldValidate: true });
    setValue("lat", sugerencia.lat, { shouldValidate: true });
    setValue("lng", sugerencia.lng, { shouldValidate: true });
    if (sugerencia.ciudad) setValue("ciudad", sugerencia.ciudad, { shouldValidate: true });
    const estado = estadoDesdeGeocode(sugerencia.estado, sugerencia.ciudad);
    if (estado) setValue("estado", estado, { shouldValidate: true });
  }

  async function alSalirDeDireccion() {
    if (coordenadasTocadas) return;
    const direccion = getValues("direccion")?.trim();
    if (!direccion || direccion.length < 3) return;

    try {
      const respuesta = await fetch(`/api/v1/geocode?q=${encodeURIComponent(direccion)}`);
      if (!respuesta.ok || coordenadasTocadas) return;
      const cuerpo = await respuesta.json();
      setValue("lat", cuerpo.data.lat, { shouldValidate: true });
      setValue("lng", cuerpo.data.lng, { shouldValidate: true });
      setUbicacionConfirmada(false);
      if (cuerpo.data.estado) setValue("estado", cuerpo.data.estado, { shouldValidate: true });
      if (cuerpo.data.ciudad) setValue("ciudad", cuerpo.data.ciudad, { shouldValidate: true });
    } catch {
      // El geocode es solo una sugerencia editable; un fallo no bloquea el formulario.
    }
  }

  const mutacion = useMutation({
    mutationFn: async (valores: PropertyFormValues) => {
      const cuerpoEnvio = {
        ...valores,
        aceptaFinanciamiento: valores.aceptaFinanciamiento === "true",
        moneda: valores.moneda ?? "MXN",
        precioUnidad: valores.precioUnidad ?? "total",
        ...Object.fromEntries(
          CAMPOS_NUMERICOS_FORMULARIO.map((campo) => [campo, textoANumero(valores[campo])]),
        ),
      };
      const respuesta = propiedad
        ? await fetch(`/api/v1/properties/${propiedad.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cuerpoEnvio),
          })
        : await fetch("/api/v1/properties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cuerpoEnvio),
          });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw cuerpo.error as ErrorApi;
      return cuerpo.data as { id: string };
    },
  });

  async function quitarFotoExistente(fotoId: string) {
    if (!propiedad) return;
    const respuesta = await fetch(`/api/v1/properties/${propiedad.id}/photos?foto=${fotoId}`, {
      method: "DELETE",
    });
    if (respuesta.ok) {
      setFotosExistentes((previas) => previas.filter((foto) => foto.id !== fotoId));
      router.refresh();
    }
  }

  function onSubmit(valores: PropertyFormValues) {
    if (propiedad?.estadoPublicacion === "publicada") {
      setValoresPorConfirmar(valores);
      return;
    }
    return guardar(valores);
  }

  function confirmarRevision() {
    const valores = valoresPorConfirmar;
    setValoresPorConfirmar(null);
    if (valores) void guardar(valores);
  }

  async function guardar(valores: PropertyFormValues) {
    setErrorEnvio(null);
    setMensajeDuplicado(null);

    try {
      const data = await mutacion.mutateAsync(valores);
      const idPropiedad = propiedad?.id ?? data.id;
      for (const archivo of archivosNuevos) {
        await subirFoto(idPropiedad, archivo);
      }
      if (modo === "nueva") {
        setMostrarExito(true);
        return;
      }
      router.push("/propiedades");
      router.refresh();
    } catch (err) {
      const error = err as ErrorApi;
      if (error.code === "conflict_duplicate_property") {
        const existingId = error.details?.[0]?.existing_property_id;
        if (existingId) setMensajeDuplicado({ id: existingId });
        return;
      }
      setErrorEnvio(error.message ?? "No se pudo guardar la propiedad");
    }
  }

  function reiniciarFormulario() {
    reset();
    setArchivosNuevos([]);
    setCoordenadasTocadas(false);
    setUbicacionConfirmada(false);
    setMostrarExito(false);
  }

  // Sin coordenadas el botón sigue activo para que la validación del esquema muestre el error.
  const faltaConfirmarUbicacion =
    !ubicacionConfirmada && Number.isFinite(lat) && Number.isFinite(lng);

  if (mostrarExito) {
    return <PropertyFormSuccess onReset={reiniciarFormulario} />;
  }

  const mensajeEstado =
    modo === "nueva" ? (
      <>
        Al enviar, tu propiedad queda en estado <strong className="text-warning">Pendiente</strong>{" "}
        hasta que un administrador la revise.
      </>
    ) : (
      <>Al guardar, los cambios pueden requerir una nueva revisión antes de ser públicos.</>
    );

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-4">
      <div className="flex flex-col gap-2 px-1">
        <span className="text-[13px] font-bold tracking-wide text-warning uppercase">
          {modo === "nueva" ? "Publicar un espacio" : "Editar propiedad"}
        </span>
        <h1 className="font-display text-[28px] font-bold text-foreground">
          {modo === "nueva" ? "Cuéntanos sobre tu inmueble" : "Actualiza los datos de tu inmueble"}
        </h1>
        {modo === "nueva" ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Un administrador de Nodus revisará tu publicación antes de que sea pública. Este proceso
            normalmente toma entre 24 y 48 horas.
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-7 rounded-[20px] border border-border bg-surface p-9 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none max-sm:p-6"
      >
        {errorEnvio ? (
          <Alert variant="destructive">
            <AlertDescription>{errorEnvio}</AlertDescription>
          </Alert>
        ) : null}
        {mensajeDuplicado ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col gap-1">
              <p>Ya existe una propiedad activa en esta dirección.</p>
              <Link
                href={`/propiedades/${mensajeDuplicado.id}`}
                className="text-primary underline underline-offset-4"
              >
                Ver propiedad existente
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}
        {propiedad?.estadoPublicacion === "rechazada" && propiedad.motivoRechazo ? (
          <p className="text-sm text-destructive">Motivo de rechazo: {propiedad.motivoRechazo}</p>
        ) : null}

        <PropertyFormBasicsFields
          register={register}
          errors={errors}
          onSalirDeDireccion={() => {
            void alSalirDeDireccion();
          }}
          onSeleccionarDireccion={alSeleccionarSugerencia}
        />

        <PropertyFormDetailsFields
          register={register}
          errors={errors}
          tipo={tipo}
          modalidad={modalidad}
        />

        <PropertyFormLocationField
          register={register}
          errors={errors}
          lat={lat}
          lng={lng}
          onCoordenadaTocada={alTocarCoordenadas}
          onMoverPin={alMoverPin}
          faltaConfirmar={faltaConfirmarUbicacion}
          onConfirmar={() => setUbicacionConfirmada(true)}
        />

        <div className="flex flex-col gap-4 border-t border-border pt-7">
          <h2 className="text-[15px] font-bold text-foreground">Fotos</h2>
          <PropertyPhotoField
            fotosExistentes={fotosExistentes}
            onQuitarFotoExistente={quitarFotoExistente}
            archivosNuevos={archivosNuevos}
            onAgregarArchivos={(archivos) =>
              setArchivosNuevos((previos) => [...previos, ...archivos])
            }
            onQuitarArchivoNuevo={(indice) =>
              setArchivosNuevos((previos) => previos.filter((_, i) => i !== indice))
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-7">
          {faltaConfirmarUbicacion ? (
            <p className="max-w-[320px] text-[13px] font-semibold text-warning">
              Confirma la ubicación en el mapa para poder enviar.
            </p>
          ) : (
            <p className="max-w-[320px] text-[13px] text-muted-foreground">{mensajeEstado}</p>
          )}
          <Button
            type="submit"
            disabled={mutacion.isPending || faltaConfirmarUbicacion}
            aria-busy={mutacion.isPending}
            className="h-[50px] rounded-lg bg-accent px-7 text-[15px] font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none disabled:opacity-60"
          >
            {mutacion.isPending
              ? "Guardando…"
              : modo === "nueva"
                ? "Enviar a revisión"
                : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <PropertyFormReviewDialog
        open={valoresPorConfirmar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setValoresPorConfirmar(null);
        }}
        onConfirmar={confirmarRevision}
      />
    </div>
  );
}
