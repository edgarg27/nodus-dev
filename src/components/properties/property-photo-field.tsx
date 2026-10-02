"use client";

import { type ChangeEvent, type DragEvent, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

const TIPOS_FOTO_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO_FOTO = 4_000_000;

export interface PropertyFormPhoto {
  id: string;
  storageUrl: string;
}

export function validarArchivoFoto(archivo: File): string | null {
  if (!TIPOS_FOTO_PERMITIDOS.includes(archivo.type)) {
    return `${archivo.name}: usa una foto JPEG, PNG o WebP`;
  }
  if (archivo.size > TAMANO_MAXIMO_FOTO) {
    return `${archivo.name}: pesa más de 4 MB`;
  }
  return null;
}

function useVistasPrevias(archivos: File[]) {
  const [urls, setUrls] = useState<Map<File, string>>(new Map());

  useEffect(() => {
    setUrls((previas) => {
      const nuevas = new Map<File, string>();
      for (const archivo of archivos) {
        nuevas.set(archivo, previas.get(archivo) ?? URL.createObjectURL(archivo));
      }
      for (const [archivo, url] of previas) {
        if (!nuevas.has(archivo)) URL.revokeObjectURL(url);
      }
      return nuevas;
    });
  }, [archivos]);

  useEffect(() => {
    return () => {
      setUrls((previas) => {
        for (const url of previas.values()) URL.revokeObjectURL(url);
        return previas;
      });
    };
  }, []);

  return urls;
}

const iconoQuitar = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface PropertyPhotoFieldProps {
  fotosExistentes: PropertyFormPhoto[];
  onQuitarFotoExistente: (fotoId: string) => void;
  archivosNuevos: File[];
  onAgregarArchivos: (archivos: File[]) => void;
  onQuitarArchivoNuevo: (indice: number) => void;
}

export function PropertyPhotoField({
  fotosExistentes,
  onQuitarFotoExistente,
  archivosNuevos,
  onAgregarArchivos,
  onQuitarArchivoNuevo,
}: PropertyPhotoFieldProps) {
  const [arrastrando, setArrastrando] = useState(false);
  const [errorArchivos, setErrorArchivos] = useState<string | null>(null);
  const vistasPrevias = useVistasPrevias(archivosNuevos);
  const total = fotosExistentes.length + archivosNuevos.length;

  function procesarArchivos(lista: File[]) {
    for (const archivo of lista) {
      const error = validarArchivoFoto(archivo);
      if (error) {
        setErrorArchivos(error);
        return;
      }
    }
    setErrorArchivos(null);
    onAgregarArchivos(lista);
  }

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="fotos" className="sr-only">
        Fotos
      </Label>

      <label
        htmlFor="fotos"
        onDragOver={(event: DragEvent<HTMLLabelElement>) => {
          event.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(event: DragEvent<HTMLLabelElement>) => {
          event.preventDefault();
          setArrastrando(false);
          procesarArchivos(Array.from(event.dataTransfer.files));
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors duration-150 ease-out ${
          arrastrando
            ? "border-accent bg-accent/10"
            : "border-input bg-background hover:border-primary hover:bg-muted"
        }`}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="text-sm font-semibold text-foreground">
          Arrastra tus fotos aquí o haz clic para seleccionarlas
        </span>
        <span className="text-xs text-muted-foreground">
          JPG, PNG o WebP · máx. 4 MB cada una
          {total > 0 ? ` · ${total} agregada${total === 1 ? "" : "s"}` : ""}
        </span>
      </label>
      <input
        id="fotos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          procesarArchivos(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
        className="sr-only"
      />

      {errorArchivos ? (
        <p role="alert" className="text-sm text-destructive">
          {errorArchivos}
        </p>
      ) : null}

      {total > 0 ? (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {fotosExistentes.map((foto) => (
            <div
              key={foto.id}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {/* biome-ignore lint/performance/noImgElement: foto subida por el usuario, no un asset estático */}
              <img src={foto.storageUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Quitar foto"
                onClick={() => onQuitarFotoExistente(foto.id)}
                className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary/75 text-primary-foreground transition-transform duration-150 ease-out hover:scale-110 hover:bg-primary"
              >
                {iconoQuitar}
              </button>
            </div>
          ))}
          {archivosNuevos.map((archivo, indice) => (
            <div
              key={`${archivo.name}-${archivo.size}-${archivo.lastModified}`}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {/* biome-ignore lint/performance/noImgElement: vista previa local de un archivo aún no subido */}
              <img src={vistasPrevias.get(archivo)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Quitar foto"
                onClick={() => onQuitarArchivoNuevo(indice)}
                className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary/75 text-primary-foreground transition-transform duration-150 ease-out hover:scale-110 hover:bg-primary"
              >
                {iconoQuitar}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
