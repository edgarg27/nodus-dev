import type { Metadata } from "next";
import { FeaturedListings } from "@/components/marketing/featured-listings";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { NotFoundBanner } from "@/components/marketing/not-found-banner";
import { SearchHero } from "@/components/marketing/search-hero";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { SupportServices } from "@/components/marketing/support-services";
import { Testimonial } from "@/components/marketing/testimonial";
import { TwoPaths } from "@/components/marketing/two-paths";
import { WhyNodus } from "@/components/marketing/why-nodus";
import { hrefAyudaCaptive } from "@/lib/captive-ayuda";
import { casoEnIdioma } from "@/lib/casos-exito";
import { testimonioEnIdioma } from "@/lib/testimonio";
import { getUsuarioActual } from "@/server/auth/session";
import { listarCasosDePortada } from "@/server/casos-exito/queries";
import { obtenerIdioma, obtenerTextos } from "@/server/i18n";
import { listarPropiedadesPublicadasRecientes } from "@/server/properties/queries";
import { obtenerTestimonioDePortada } from "@/server/testimonio/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.meta.tituloInicio, description: t.meta.descripcionInicio };
}

export default async function MarketingPage() {
  const [actor, propiedades, idioma, casos, testimonio] = await Promise.all([
    getUsuarioActual(),
    listarPropiedadesPublicadasRecientes(3),
    obtenerIdioma(),
    listarCasosDePortada(),
    obtenerTestimonioDePortada(),
  ]);

  const buscarHref = actor ? "/buscar" : "/sign-up";
  // /publicar atiende a cada quien: visitante (registro como oferente), buscador (pasa a oferente).
  const publicarHref = actor?.rol === "oferente" ? "/propiedades/nueva" : "/publicar";

  return (
    <main className="bg-background">
      <SmoothScroll />
      <SearchHero />
      <HowItWorks idioma={idioma} />
      <TwoPaths buscarHref={buscarHref} publicarHref={publicarHref} idioma={idioma} />
      <FeaturedListings propiedades={propiedades} idioma={idioma} />
      <SupportServices idioma={idioma} casos={casos.map((caso) => casoEnIdioma(caso, idioma))} />
      <WhyNodus idioma={idioma} />
      {/* Sin testimonio guardado (o con "Mostrar en la portada" apagado) no hay sección. */}
      {testimonio ? <Testimonial testimonio={testimonioEnIdioma(testimonio, idioma)} /> : null}
      {/* Un admin no tiene chat con Captive: no se le ofrece el banner. */}
      {actor?.rol === "admin" ? null : (
        <NotFoundBanner
          autenticado={!!actor}
          ayudaHref={hrefAyudaCaptive(!!actor, {}, idioma)}
          idioma={idioma}
        />
      )}
      <SiteFooter idioma={idioma} />
    </main>
  );
}
