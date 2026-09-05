import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // /api/ segue bloqueado, com uma exceção: o agregado público do radar de
      // vagas é read-only, cacheado, e existe justamente para ser consumido de
      // fora (inclusive por agentes) sem precisar raspar o HTML da página.
      allow: ["/", "/api/jobs/insights"],
      disallow: ["/dashboard", "/admin", "/mentor", "/hr", "/mentee", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
