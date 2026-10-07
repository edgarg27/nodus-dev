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
import { obtenerIdioma, obtenerTextos } from "@/server/i18n";
import { listarPropiedadesPublicadasRecientes } from "@/server/properties/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.meta.tituloInicio, description: t.meta.descripcionInicio };
}

export default async function MarketingPage() {
  const [actor, propiedades, idioma] = await Promise.all([
    getUsuarioActual(),
    listarPropiedadesPublicadasRecientes(3),
    obtenerIdioma(),
  ]);

  const buscarHref = actor ? "/buscar" : "/sign-up";
  const publicarHref = actor ? "/propiedades/nueva" : "/sign-up";

  return (
    <main className="bg-background">
      <SmoothScroll />
      <SearchHero />
      <HowItWorks idioma={idioma} />
      <TwoPaths buscarHref={buscarHref} publicarHref={publicarHref} idioma={idioma} />
      <FeaturedListings propiedades={propiedades} idioma={idioma} />
      <WhyNodus idioma={idioma} />
      <Testimonial idioma={idioma} />
      <FinalCta
        autenticado={!!actor}
        buscarHref={buscarHref}
        publicarHref={publicarHref}
        idioma={idioma}
      />
      <SiteFooter idioma={idioma} />
    </main>
  );
}
