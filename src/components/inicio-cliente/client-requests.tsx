import { FileTextIcon } from "lucide-react";
import Link from "next/link";
import { type Idioma, localeDe, textosDe } from "@/lib/i18n";
import { tituloEspacio } from "@/lib/property-details";
import {
  type EstadoSolicitudCliente,
  estadoSolicitudCliente,
  solicitudEnCurso,
} from "@/lib/solicitud-cliente";
import type { SolicitudDelCliente } from "@/server/contact-requests/del-cliente";

// Color de la etiqueta de estado: en curso resalta; concluida y enviada van apagadas.
const CLASE_ESTADO: Record<EstadoSolicitudCliente, string> = {
  recibida: "bg-accent/15 text-foreground",
  confirmando: "bg-accent/15 text-foreground",
  en_contacto: "bg-primary text-primary-foreground",
  concluida: "bg-muted text-muted-foreground",
  enviada: "bg-muted text-muted-foreground",
};

interface ClientRequestsProps {
  solicitudes: SolicitudDelCliente[];
  idioma: Idioma;
}

// "Mis solicitudes de informes" de la pantalla de inicio del cliente: las que siguen en curso
// primero, cada una con su estado en palabras del cliente.
export function ClientRequests({ solicitudes, idioma }: ClientRequestsProps) {
  const i = textosDe(idioma).panel.inicioCliente;
  const fecha = new Intl.DateTimeFormat(localeDe(idioma), { day: "numeric", month: "short" });
  const filas = solicitudes
    .map((solicitud) => ({
      solicitud,
      estado: estadoSolicitudCliente(solicitud.canal, solicitud.paso),
    }))
    .sort((a, b) => Number(solicitudEnCurso(b.estado)) - Number(solicitudEnCurso(a.estado)));

  return (
    <section
      aria-labelledby="solicitudes-titulo"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <h2 id="solicitudes-titulo" className="text-[15px] font-bold text-foreground">
          {i.solicitudesTitulo}
        </h2>
        <p className="text-sm text-muted-foreground">{i.solicitudesDescripcion}</p>
      </div>

      {filas.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5">
          <FileTextIcon className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{i.solicitudesVacio}</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {filas.map(({ solicitud, estado }) => {
            const { propiedad } = solicitud;
            const titulo = tituloEspacio(
              propiedad.tipo,
              propiedad.modalidad,
              propiedad.ciudad,
              idioma,
            );
            const contenido = (
              <>
                <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/70 to-primary">
                  {propiedad.fotoUrl ? (
                    // biome-ignore lint/performance/noImgElement: foto subida por el propietario
                    <img src={propiedad.fotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-foreground">{titulo}</span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {propiedad.publicada ? propiedad.direccion : i.noDisponible} ·{" "}
                    {i.enviadaEl(fecha.format(solicitud.creadaEn))}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${CLASE_ESTADO[estado]}`}
                >
                  {i.estados[estado]}
                </span>
              </>
            );
            return (
              <li key={solicitud.id}>
                {propiedad.publicada ? (
                  <Link
                    href={`/espacios/${propiedad.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40"
                  >
                    {contenido}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-3">{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
