import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: {
    path: string
    priority: number
    changeFrequency: ChangeFreq
  }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/ferramentas", priority: 0.9, changeFrequency: "weekly" },
    { path: "/ferramentas/curriculo", priority: 0.9, changeFrequency: "weekly" },
    { path: "/ferramentas/linkedin", priority: 0.8, changeFrequency: "weekly" },
    { path: "/trilhas", priority: 0.8, changeFrequency: "weekly" },
    { path: "/content", priority: 0.7, changeFrequency: "weekly" },
    { path: "/jobs", priority: 0.7, changeFrequency: "daily" },
    { path: "/schedule", priority: 0.5, changeFrequency: "weekly" },
    { path: "/sobre", priority: 0.5, changeFrequency: "monthly" },
    { path: "/minhas-mentorias", priority: 0.5, changeFrequency: "monthly" },
    { path: "/politica-de-privacidade", priority: 0.3, changeFrequency: "yearly" },
    { path: "/termos-de-uso", priority: 0.3, changeFrequency: "yearly" },
  ]

  let contentRoutes: MetadataRoute.Sitemap = []
  try {
    const { db, contentItems } = await import("@/lib/db")
    const { eq } = await import("drizzle-orm")

    const items = await db
      .select({
        id: contentItems.id,
        updatedAt: contentItems.updatedAt,
      })
      .from(contentItems)
      .where(eq(contentItems.isPublished, true))

    contentRoutes = items.map((item) => ({
      url: `${SITE_URL}/content/${item.id}`,
      lastModified: item.updatedAt ? new Date(item.updatedAt) : now,
      changeFrequency: "weekly" as ChangeFreq,
      priority: 0.6,
    }))
  } catch {}

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...contentRoutes,
  ]
}
