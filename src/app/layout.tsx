import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { IdiomaProvider } from "@/components/i18n/idioma-provider";
import { SiteHeader } from "@/components/nav/site-header";
import { QueryProvider } from "@/components/providers/query-provider";
import { COOKIE_IDIOMA, idiomaValido } from "@/lib/i18n";
import { urlDelSitio } from "@/lib/landing-pages";
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
  const mensajesNoLeidos =
    actor?.rol === "oferente" || actor?.rol === "buscador"
      ? // Chats con oferentes más el chat con el equipo de Captive.
        (
          await Promise.all([contarMensajesNoLeidos(actor.id), contarNoLeidosDeCaptive(actor.id)])
        ).reduce((suma, n) => suma + n, 0)
      : 0;

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
                      mensajesNoLeidos,
                    }
                  : null
              }
            />
            {children}
          </QueryProvider>
        </IdiomaProvider>
      </body>
    </html>
  );
}
