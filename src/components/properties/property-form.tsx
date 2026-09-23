"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PinPicker } from "../map/pin-picker";
import type { EstadoPublicacion } from "./status-badge";

const TIPOS = ["nave_industrial", "oficina", "local_comercial"] as const;
const MODALIDADES = ["renta", "venta", "desde_cero"] as const;
const ESTADOS = ["SLP", "Aguascalientes", "Leon"] as const;

const LAT_MIN = 14.5;
const LAT_MAX = 32.7;
const LNG_MIN = -118.4;
const LNG_MAX = -86.7;

const TIPOS_FOTO_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO_FOTO = 4_000_000;

const propertyFormSchema = z.object({
  tipo: z.enum(TIPOS),
  modalidad: z.enum(MODALIDADES),
  direccion: z.string().trim().min(1, "La dirección es obligatoria"),
  lat: z.number().min(LAT_MIN).max(LAT_MAX),
  lng: z.number().min(LNG_MIN).max(LNG_MAX),
  estado: z.enum(ESTADOS),
  ciudad: z.string().trim().min(1, "La ciudad es obligatoria"),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria"),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export interface PropertyFormPhoto {
  id: string;
  storageUrl: string;
}

export interface PropertyFormInitialData {
  id: string;
  tipo: (typeof TIPOS)[number];
  modalidad: (typeof MODALIDADES)[number];
  direccion: string;
  lat: number;
  lng: number;
  estado: (typeof ESTADOS)[number];
  ciudad: string;
  descripcion: string;
  estadoPublicacion: EstadoPublicacion;
  motivoRechazo: string | null;
  fotos: PropertyFormPhoto[];
}

interface PropertyFormProps {
  propiedad?: PropertyFormInitialData;
}

interface ErrorApi {
  code?: string;
  message?: string;
  details?: Array<{ existing_property_id?: string }>;
}

function validarArchivo(archivo: File): string | null {
  if (!TIPOS_FOTO_PERMITIDOS.includes(archivo.type)) {
    return `${archivo.name}: usa una foto JPEG, PNG o WebP`;
  }
  if (archivo.size > TAMANO_MAXIMO_FOTO) {
    return `${archivo.name}: pesa más de 4 MB`;
  }
  return null;
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
        }
      : undefined,
  });

  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const [errorArchivos, setErrorArchivos] = useState<string | null>(null);
  const [fotosExistentes, setFotosExistentes] = useState(propiedad?.fotos ?? []);
  const [mensajeDuplicado, setMensajeDuplicado] = useState<{ id: string } | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [coordenadasTocadas, setCoordenadasTocadas] = useState(Boolean(propiedad));

  const lat = watch("lat");
  const lng = watch("lng");

  function alMoverPin(latNueva: number, lngNueva: number) {
    setCoordenadasTocadas(true);
    setValue("lat", latNueva, { shouldValidate: true });
    setValue("lng", lngNueva, { shouldValidate: true });
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
    } catch {
      // El geocode es solo una sugerencia editable; un fallo no bloquea el formulario.
    }
  }

  const mutacion = useMutation({
    mutationFn: async (valores: PropertyFormValues) => {
      const respuesta = propiedad
        ? await fetch(`/api/v1/properties/${propiedad.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(valores),
          })
        : await fetch("/api/v1/properties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(valores),
          });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw cuerpo.error as ErrorApi;
      return cuerpo.data as { id: string };
    },
  });

  function alSeleccionarArchivos(event: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(event.target.files ?? []);
    for (const archivo of lista) {
      const error = validarArchivo(archivo);
      if (error) {
        setErrorArchivos(error);
        event.target.value = "";
        return;
      }
    }
    setErrorArchivos(null);
    setArchivosNuevos((previos) => [...previos, ...lista]);
    event.target.value = "";
  }

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

  async function onSubmit(valores: PropertyFormValues) {
    setErrorEnvio(null);
    setMensajeDuplicado(null);

    if (propiedad?.estadoPublicacion === "publicada") {
      const continuar = window.confirm(
        "Este cambio hará que la propiedad vuelva a revisión. ¿Deseas continuar?",
      );
      if (!continuar) return;
    }

    try {
      const data = await mutacion.mutateAsync(valores);
      const idPropiedad = propiedad?.id ?? data.id;
      for (const archivo of archivosNuevos) {
        await subirFoto(idPropiedad, archivo);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorEnvio ? <p role="alert">{errorEnvio}</p> : null}
      {mensajeDuplicado ? (
        <div role="alert">
          <p>Ya existe una propiedad activa en esta dirección.</p>
          <Link href={`/propiedades/${mensajeDuplicado.id}`}>Ver propiedad existente</Link>
        </div>
      ) : null}
      {propiedad?.estadoPublicacion === "rechazada" && propiedad.motivoRechazo ? (
        <p>Motivo de rechazo: {propiedad.motivoRechazo}</p>
      ) : null}

      <label htmlFor="tipo">Tipo</label>
      <select id="tipo" {...register("tipo")}>
        <option value="nave_industrial">Nave industrial</option>
        <option value="oficina">Oficina</option>
        <option value="local_comercial">Local comercial</option>
      </select>
      {errors.tipo ? <p role="alert">{errors.tipo.message}</p> : null}

      <label htmlFor="modalidad">Modalidad</label>
      <select id="modalidad" {...register("modalidad")}>
        <option value="renta">Renta</option>
        <option value="venta">Venta</option>
        <option value="desde_cero">Desde cero</option>
      </select>
      {errors.modalidad ? <p role="alert">{errors.modalidad.message}</p> : null}

      <label htmlFor="direccion">Dirección</label>
      <input
        id="direccion"
        {...register("direccion", {
          onBlur: () => {
            void alSalirDeDireccion();
          },
        })}
      />
      {errors.direccion ? <p role="alert">{errors.direccion.message}</p> : null}

      <PinPicker lat={lat} lng={lng} onChange={alMoverPin} />

      <label htmlFor="lat">Latitud</label>
      <input
        id="lat"
        type="number"
        step="any"
        {...register("lat", {
          valueAsNumber: true,
          onChange: () => setCoordenadasTocadas(true),
        })}
      />
      {errors.lat ? <p role="alert">{errors.lat.message}</p> : null}

      <label htmlFor="lng">Longitud</label>
      <input
        id="lng"
        type="number"
        step="any"
        {...register("lng", {
          valueAsNumber: true,
          onChange: () => setCoordenadasTocadas(true),
        })}
      />
      {errors.lng ? <p role="alert">{errors.lng.message}</p> : null}

      <label htmlFor="estado">Estado</label>
      <select id="estado" {...register("estado")}>
        <option value="SLP">San Luis Potosí</option>
        <option value="Aguascalientes">Aguascalientes</option>
        <option value="Leon">León</option>
      </select>
      {errors.estado ? <p role="alert">{errors.estado.message}</p> : null}

      <label htmlFor="ciudad">Ciudad</label>
      <input id="ciudad" {...register("ciudad")} />
      {errors.ciudad ? <p role="alert">{errors.ciudad.message}</p> : null}

      <label htmlFor="descripcion">Descripción</label>
      <textarea id="descripcion" {...register("descripcion")} />
      {errors.descripcion ? <p role="alert">{errors.descripcion.message}</p> : null}

      <label htmlFor="fotos">Fotos</label>
      <input
        id="fotos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={alSeleccionarArchivos}
      />
      {errorArchivos ? <p role="alert">{errorArchivos}</p> : null}
      {archivosNuevos.length > 0 ? (
        <ul>
          {archivosNuevos.map((archivo) => (
            <li key={`${archivo.name}-${archivo.size}-${archivo.lastModified}`}>{archivo.name}</li>
          ))}
        </ul>
      ) : null}
      {fotosExistentes.length > 0 ? (
        <ul>
          {fotosExistentes.map((foto) => (
            <li key={foto.id}>
              {/* biome-ignore lint/performance/noImgElement: foto subida por el usuario, no un asset estático */}
              <img src={foto.storageUrl} alt="" width={80} height={80} />
              <button type="button" onClick={() => quitarFotoExistente(foto.id)}>
                Quitar foto
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button type="submit" disabled={mutacion.isPending}>
        {modo === "nueva" ? "Publicar propiedad" : "Guardar cambios"}
      </button>
    </form>
  );
}
