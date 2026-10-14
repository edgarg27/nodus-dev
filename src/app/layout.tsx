import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { IdiomaProvider } from "@/components/i18n/idioma-provider";
import { CaptiveHelpGlobal } from "@/components/marketing/captive-help-global";
import { SiteHeader } from "@/components/nav/site-header";
import { QueryProvider } from "@/components/providers/query-provider";
import { hrefAyudaCaptive } from "@/lib/captive-ayuda";
import { COOKIE_IDIOMA, idiomaValido } from "@/lib/i18n";
import { urlDelSitio } from "@/lib/landing-pages";
import { usaLaRed } from "@/lib/red-acceso";
import { getUsuarioActual } from "@/server/auth/session";
import { contarNoLeidosDeCaptive } from "@/server/messages/captive";
import { contarMensajesNoLeidos } from "@/server/messages/conversations";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  // Base de las ligas canónicas y de las imágenes de Open Graph (NEXT_PUBLIC_SITE_URL).
  metadataBase: new URL(urlDelSitio()),
  title: "Captive by Nodus",
  description:
    "Marketplace inmobiliario de dos lados para naves industriales, oficinas y locales comerciales.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const dataTheme = theme === "dark" ? "dark" : theme === "light" ? "light" : undefined;
  const actor = await getUsuarioActual();
  const idioma = idiomaValido(cookieStore.get(COOKIE_IDIOMA)?.value);
  // Chats con propietarios y chat con el equipo de Captive, por separado (al propietario solo se le muestra
  // el de Captive).
  const [noLeidosChats, noLeidosCaptive] =
    actor?.rol === "propietario" || actor?.rol === "buscador"
      ? await Promise.all([contarMensajesNoLeidos(actor.id), contarNoLeidosDeCaptive(actor.id)])
      : [0, 0];

  return (
    <html
      lang={idioma}
      data-theme={dataTheme}
      className={`${ibmPlexSans.variable} ${spaceGrotesk.variable} antialiased motion-safe:scroll-smooth`}
    >
      <body>
        <IdiomaProvider idioma={idioma}>
          <QueryProvider>
            <SiteHeader
              actor={
                actor
                  ? {
                      nombre: actor.nombre,
                      rol: actor.rol,
                      isBroker: actor.isBroker,
                      usaRed: usaLaRed(actor),
                      mensajesNoLeidos: noLeidosChats + noLeidosCaptive,
                      mensajesCaptiveNoLeidos: noLeidosCaptive,
                    }
                  : null
              }
            />
            {children}
            {/* Un admin no tiene chat con Captive: no se le ofrece la ayuda. */}
            {actor?.rol === "admin" ? null : (
              <CaptiveHelpGlobal
                href={hrefAyudaCaptive(actor !== null, {}, idioma)}
                autenticado={actor !== null}
              />
            )}
          </QueryProvider>
        </IdiomaProvider>
      </body>
    </html>
  );
}
