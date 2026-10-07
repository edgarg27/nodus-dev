import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolverLanding } from "@/lib/landing-pages";
import { obtenerIdioma } from "@/server/i18n";
import { LandingView, metadataDeLanding } from "../../../_shared/landing-view";

interface LandingTipoPageProps {
  params: Promise<{ modalidad: string; tipo: string }>;
}

// /renta/naves-industriales — todas las ubicaciones. Una combinación desconocida responde 404.
export async function generateMetadata({ params }: LandingTipoPageProps): Promise<Metadata> {
  const { modalidad, tipo } = await params;
  const idioma = await obtenerIdioma();
  const landing = resolverLanding(modalidad, tipo, undefined, idioma);
  return landing ? metadataDeLanding(landing) : {};
}

export default async function LandingTipoPage({ params }: LandingTipoPageProps) {
  const { modalidad, tipo } = await params;
  const idioma = await obtenerIdioma();
  const landing = resolverLanding(modalidad, tipo, undefined, idioma);
  if (!landing) notFound();
  return <LandingView landing={landing} idioma={idioma} />;
}
