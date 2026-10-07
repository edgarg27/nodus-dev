import type { MetadataRoute } from "next";
import { todasLasLandings, urlDelSitio } from "@/lib/landing-pages";
import { listarIdsPublicos } from "@/server/properties/queries";

// /sitemap.xml: portada, búsqueda, páginas por tipo y ciudad, y cada espacio público.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlDelSitio();
  const espacios = await listarIdsPublicos();

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/buscar`, changeFrequency: "daily", priority: 0.8 },
    ...todasLasLandings().map((landing) => ({
      url: `${base}${landing.ruta}`,
      changeFrequency: "daily" as const,
      priority: landing.lugar ? 0.7 : 0.6,
    })),
    ...espacios.map((espacio) => ({
      url: `${base}/espacios/${espacio.id}`,
      lastModified: espacio.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
