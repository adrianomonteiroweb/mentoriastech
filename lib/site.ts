/**
 * URL pública canônica do site (sem barra final). Usada em metadata, sitemap e robots.
 * Defina NEXT_PUBLIC_SITE_URL em produção.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://mentoriastech.com.br"
).replace(/\/$/, "")
