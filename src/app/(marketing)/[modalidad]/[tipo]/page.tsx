import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolverLanding } from "@/lib/landing-pages";
import { LandingView, metadataDeLanding } from "../../../_shared/landing-view";

interface LandingTipoPageProps {
  params: Promise<{ modalidad: string; tipo: string }>;
}

// /renta/naves-industriales — todas las ubicaciones. Una combinación desconocida responde 404.
export async function generateMetadata({ params }: LandingTipoPageProps): Promise<Metadata> {
  const { modalidad, tipo } = await params;
  const landing = resolverLanding(modalidad, tipo);
  return landing ? metadataDeLanding(landing) : {};
}

export default async function LandingTipoPage({ params }: LandingTipoPageProps) {
  const { modalidad, tipo } = await params;
  const landing = resolverLanding(modalidad, tipo);
  if (!landing) notFound();
  return <LandingView landing={landing} />;
}
