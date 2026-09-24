import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SolicitudForm } from "@/components/broker/solicitud-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Ser broker</h1>
        <div className="flex flex-col gap-1.5 rounded-lg bg-surface p-4 ring-1 ring-border shadow-sm">
          <Badge variant="secondary" className="w-fit bg-success/10 text-success">
            Eres broker afiliado
          </Badge>
          <p className="text-sm text-text">Tu código: {actor.brokerCode}</p>
          <p className="text-sm text-text-muted">
            Enlace de referido:{" "}
            <a href={enlaceReferido} className="text-primary underline underline-offset-4">
              {enlaceReferido}
            </a>
          </p>
        </div>
      </main>
    );
  }

  const ultimaSolicitud = await ultimaSolicitudDe(actor.id);
  const ultimaRevocacion = await ultimaRevocacionDe(actor.id);

  if (!ultimaSolicitud || ultimaSolicitud.estado === "aprobada") {
    if (ultimaRevocacion) {
      return (
        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 py-8">
          <h1 className="text-2xl font-semibold text-foreground">Ser broker</h1>
          <Alert variant="destructive">
            <AlertDescription>
              <p>Tu acceso de broker fue revocado</p>
              <p>{ultimaRevocacion.motivo}</p>
            </AlertDescription>
          </Alert>
          <SolicitudForm />
        </main>
      );
    }

    return (
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Ser broker</h1>
        <SolicitudForm />
      </main>
    );
  }

  if (ultimaSolicitud.estado === "pendiente") {
    return (
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Ser broker</h1>
        <div className="flex flex-col gap-1.5 rounded-lg bg-surface p-4 ring-1 ring-border shadow-sm">
          <Badge variant="secondary" className="w-fit">
            Solicitud en revisión
          </Badge>
          <p className="text-sm text-text-muted">{ultimaSolicitud.mensaje}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Ser broker</h1>
      <Alert variant="destructive">
        <AlertDescription>
          {ultimaSolicitud.motivoDenegacion ?? "Sin motivo indicado"}
        </AlertDescription>
      </Alert>
      <SolicitudForm />
    </main>
  );
}
