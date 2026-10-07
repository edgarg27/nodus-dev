import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BrokerActiveCard } from "@/components/broker/broker-active-card";
import { BrokerIntro } from "@/components/broker/broker-intro";
import { BrokerPendingCard } from "@/components/broker/broker-pending-card";
import { SolicitudForm } from "@/components/broker/solicitud-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { ultimaRevocacionDe, ultimaSolicitudDe } from "@/server/broker-requests/queries";
import { obtenerTextos } from "@/server/i18n";

export default async function BrokerPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();
  const { idioma, t } = await obtenerTextos();

  if (actor.isBroker) {
    const encabezados = await headers();
    const host = encabezados.get("host") ?? "";
    const protocolo = encabezados.get("x-forwarded-proto") ?? "https";
    const enlaceReferido = `${protocolo}://${host}/sign-up?ref=${actor.brokerCode}`;

    return (
      <main className="mx-auto w-full max-w-[680px] px-4 py-10">
        <BrokerActiveCard
          brokerCode={actor.brokerCode ?? ""}
          enlaceReferido={enlaceReferido}
          idioma={idioma}
        />
      </main>
    );
  }

  const ultimaSolicitud = await ultimaSolicitudDe(actor.id);
  const ultimaRevocacion = await ultimaRevocacionDe(actor.id);

  if (ultimaSolicitud?.estado === "pendiente") {
    return (
      <main className="mx-auto w-full max-w-[680px] px-4 py-10">
        <BrokerPendingCard mensaje={ultimaSolicitud.mensaje} idioma={idioma} />
      </main>
    );
  }

  let alerta: { motivo: string; detalle: string } | null = null;
  if (ultimaSolicitud?.estado === "denegada") {
    alerta = {
      motivo: t.broker.denegada,
      detalle: ultimaSolicitud.motivoDenegacion ?? t.broker.sinMotivo,
    };
  } else if (ultimaRevocacion) {
    alerta = { motivo: t.broker.revocada, detalle: ultimaRevocacion.motivo };
  }

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-10">
      <BrokerIntro idioma={idioma} />
      {alerta ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{alerta.motivo}</p>
            <p>{alerta.detalle}</p>
          </AlertDescription>
        </Alert>
      ) : null}
      <SolicitudForm nombre={actor.nombre} correo={actor.email} />
    </main>
  );
}
