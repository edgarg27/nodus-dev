import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolverLanding } from "@/lib/landing-pages";
import { obtenerIdioma } from "@/server/i18n";
import { LandingView, metadataDeLanding } from "../../../../_shared/landing-view";

interface LandingLugarPageProps {
  params: Promise<{ modalidad: string; tipo: string; lugar: string }>;
}

// /renta/naves-industriales/san-luis-potosi. Una combinación desconocida responde 404.
export async function generateMetadata({ params }: LandingLugarPageProps): Promise<Metadata> {
  const { modalidad, tipo, lugar } = await params;
  const idioma = await obtenerIdioma();
  const landing = resolverLanding(modalidad, tipo, lugar, idioma);
  return landing ? metadataDeLanding(landing) : {};
}

export default async function LandingLugarPage({ params }: LandingLugarPageProps) {
  const { modalidad, tipo, lugar } = await params;
  const idioma = await obtenerIdioma();
  const landing = resolverLanding(modalidad, tipo, lugar, idioma);
  if (!landing) notFound();
  return <LandingView landing={landing} idioma={idioma} />;
}
