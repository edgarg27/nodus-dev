import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { SiteHeader } from "@/components/nav/site-header";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
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

  return (
    <html lang="es" data-theme={dataTheme} className={`${manrope.variable} antialiased`}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
