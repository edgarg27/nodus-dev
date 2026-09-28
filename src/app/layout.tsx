import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { SiteHeader } from "@/components/nav/site-header";
import { QueryProvider } from "@/components/providers/query-provider";
import { getUsuarioActual } from "@/server/auth/session";
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
  title: "Nodus",
  description:
    "Marketplace inmobiliario de dos lados para naves industriales, oficinas y locales comerciales.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const dataTheme = theme === "dark" ? "dark" : theme === "light" ? "light" : undefined;
  const actor = await getUsuarioActual();

  return (
    <html
      lang="es"
      data-theme={dataTheme}
      className={`${ibmPlexSans.variable} ${spaceGrotesk.variable} antialiased motion-safe:scroll-smooth`}
    >
      <body>
        <QueryProvider>
          <SiteHeader
            actor={
              actor ? { nombre: actor.nombre, rol: actor.rol, isBroker: actor.isBroker } : null
            }
          />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
