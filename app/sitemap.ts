import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/ferramentas", priority: 0.9, changeFrequency: "weekly" },
    { path: "/ferramentas/curriculo", priority: 0.9, changeFrequency: "weekly" },
    { path: "/trilhas", priority: 0.8, changeFrequency: "weekly" },
    { path: "/content", priority: 0.7, changeFrequency: "weekly" },
    { path: "/jobs", priority: 0.7, changeFrequency: "daily" },
    { path: "/minhas-mentorias", priority: 0.5, changeFrequency: "monthly" },
  ]

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
