import type { Metadata } from "next";
import { FeaturedListings } from "@/components/marketing/featured-listings";
import { FinalCta } from "@/components/marketing/final-cta";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SearchHero } from "@/components/marketing/search-hero";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { Testimonial } from "@/components/marketing/testimonial";
import { TwoPaths } from "@/components/marketing/two-paths";
import { WhyNodus } from "@/components/marketing/why-nodus";
import { getUsuarioActual } from "@/server/auth/session";
import { listarPropiedadesPublicadasRecientes } from "@/server/properties/queries";

export const metadata: Metadata = {
  title: "Captive by Nodus — Naves, oficinas y locales en SLP, Aguascalientes y León",
  description:
    "Encuentra o publica naves industriales, oficinas y locales comerciales en San Luis Potosí, Aguascalientes y León. Nodus conecta pymes con oferentes verificados.",
};

export default async function MarketingPage() {
  const [actor, propiedades] = await Promise.all([
    getUsuarioActual(),
    listarPropiedadesPublicadasRecientes(3),
  ]);

  const buscarHref = actor ? "/buscar" : "/sign-up";
  const publicarHref = actor ? "/propiedades/nueva" : "/sign-up";

  return (
    <main className="bg-background">
      <SmoothScroll />
      <SearchHero />
      <HowItWorks />
      <TwoPaths buscarHref={buscarHref} publicarHref={publicarHref} />
      <FeaturedListings propiedades={propiedades} />
      <WhyNodus />
      <Testimonial />
      <FinalCta autenticado={!!actor} buscarHref={buscarHref} publicarHref={publicarHref} />
      <SiteFooter />
    </main>
  );
}
