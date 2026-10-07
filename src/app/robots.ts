import type { MetadataRoute } from "next";
import { urlDelSitio } from "@/lib/landing-pages";

// /robots.txt: se indexa lo público; las áreas con sesión y la API quedan fuera.
export default function robots(): MetadataRoute.Robots {
  const base = urlDelSitio();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/propiedades",
        "/leads",
        "/broker",
        "/favoritos",
        "/mis-busquedas",
        "/sign-in",
        "/sign-up",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
