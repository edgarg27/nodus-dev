import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SolicitudForm } from "@/components/broker/solicitud-form";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { ultimaRevocacionDe, ultimaSolicitudDe } from "@/server/broker-requests/queries";

export default async function BrokerPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  if (actor.isBroker) {
    const encabezados = await headers();
    const host = encabezados.get("host") ?? "";
    const protocolo = encabezados.get("x-forwarded-proto") ?? "https";
    const enlaceReferido = `${protocolo}://${host}/sign-up?ref=${actor.brokerCode}`;

    return (
      <main>
        <h1>Ser broker</h1>
        <p>Eres broker afiliado</p>
        <p>Tu código: {actor.brokerCode}</p>
        <p>
          Enlace de referido: <a href={enlaceReferido}>{enlaceReferido}</a>
        </p>
      </main>
    );
  }

  const ultimaSolicitud = await ultimaSolicitudDe(actor.id);
  const ultimaRevocacion = await ultimaRevocacionDe(actor.id);

  if (!ultimaSolicitud || ultimaSolicitud.estado === "aprobada") {
    if (ultimaRevocacion) {
      return (
        <main>
          <h1>Ser broker</h1>
          <p>Tu acceso de broker fue revocado</p>
          <p>{ultimaRevocacion.motivo}</p>
          <SolicitudForm />
        </main>
      );
    }

    return (
      <main>
        <h1>Ser broker</h1>
        <SolicitudForm />
      </main>
    );
  }

  if (ultimaSolicitud.estado === "pendiente") {
    return (
      <main>
        <h1>Ser broker</h1>
        <p>Solicitud en revisión</p>
        <p>{ultimaSolicitud.mensaje}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Ser broker</h1>
      <p>{ultimaSolicitud.motivoDenegacion ?? "Sin motivo indicado"}</p>
      <SolicitudForm />
    </main>
  );
}
