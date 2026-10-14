import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpCard } from "@/components/panel/help-card";
import { KpiCard } from "@/components/panel/kpi-card";
import { NetworkBanner } from "@/components/panel/network-banner";
import { PeriodSelector } from "@/components/panel/period-selector";
import { ViewsChart } from "@/components/panel/views-chart";
import { VerificationNotice } from "@/components/verificacion/verification-notice";
import { localeDe } from "@/lib/i18n";
import { BANDEJA_VISIBLE_PARA_PROPIETARIO } from "@/lib/propietario-visibilidad";
import { periodoValido } from "@/lib/periodos";
import { obtenerPerfilAgencia } from "@/server/agency/queries";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";
import { metricasDelPropietario } from "@/server/metrics/queries";
import { estadisticasDeLaRed } from "@/server/network/queries";
import { obtenerVerificacion } from "@/server/verificacion/estado";

interface PanelPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PanelPage({ searchParams }: PanelPageProps) {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "propietario");
  if (!permiso.ok || !actor) notFound();

  const { idioma, t } = await obtenerTextos();
  const i = t.panel.inicio;
  const numero = (valor: number) => valor.toLocaleString(localeDe(idioma));
  const params = await searchParams;
  const dias = periodoValido(typeof params.dias === "string" ? params.dias : undefined);

  const [perfil, metricas, red, verificacion] = await Promise.all([
    obtenerPerfilAgencia(actor.id),
    metricasDelPropietario(actor.id, dias),
    estadisticasDeLaRed(),
    obtenerVerificacion(actor.id),
  ]);
  const { totales, serie } = metricas;

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[28px] font-bold text-foreground">
              {i.hola(perfil.nombre)}
            </h1>
            <p className="text-sm text-muted-foreground">{i.subtitulo}</p>
          </div>
          <Link
            href="/propiedades/nueva"
            className="flex h-[46px] items-center rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md motion-reduce:transition-none"
          >
            {t.panel.publicaciones.publicarEspacio}
          </Link>
        </header>

        {verificacion.estado === "pendiente" || verificacion.estado === "denegada" ? (
          <VerificationNotice
            idioma={idioma}
            estado={verificacion.estado}
            faltanDocumentos={verificacion.faltantes.length > 0}
          />
        ) : null}

        <NetworkBanner
          propiedades={red.propiedades}
          nuevas48h={red.nuevas48h}
          brokers={red.brokers}
        />

        <section aria-labelledby="resumen-titulo" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="resumen-titulo"
              className="text-[13px] font-bold tracking-wide text-muted-foreground uppercase"
            >
              {i.resumen}
            </h2>
            <PeriodSelector actual={dias} idioma={idioma} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              valor={numero(totales.publicadas)}
              etiqueta={i.kpiPublicadas}
              href="/propiedades"
            />
            <KpiCard valor={numero(totales.impresiones)} etiqueta={i.kpiImpresiones} />
            <KpiCard valor={numero(totales.visitas)} etiqueta={i.kpiVisitas} />
            <KpiCard
              valor={numero(totales.solicitudes)}
              href={BANDEJA_VISIBLE_PARA_PROPIETARIO ? "/leads" : undefined}
              etiqueta={
                <>
                  {i.kpiSolicitudesDe}{" "}
                  <strong className="font-semibold text-foreground">
                    {numero(totales.leadsDistintos)}
                  </strong>{" "}
                  {i.lead(totales.leadsDistintos)}
                </>
              }
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <ViewsChart serie={serie} idioma={idioma} />
          </div>
        </section>

        <HelpCard idioma={idioma} />
      </div>
    </main>
  );
}
