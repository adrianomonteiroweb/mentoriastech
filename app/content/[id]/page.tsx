import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { db, contentCategories, contentItems } from "@/lib/db"
import { toContentCategory, toContentItem } from "@/lib/db/mappers"
import { SITE_URL } from "@/lib/site"
import { ContentDetailClient } from "./content-detail-client"

interface Props {
  params: Promise<{ id: string }>
}

async function getContent(id: string) {
  const [row] = await db
    .select({ item: contentItems, category: contentCategories })
    .from(contentItems)
    .leftJoin(
      contentCategories,
      eq(contentItems.categoryId, contentCategories.id),
    )
    .where(and(eq(contentItems.id, id), eq(contentItems.isPublished, true)))
    .limit(1)

  if (!row) return null

  return {
    ...toContentItem(row.item),
    content_categories: row.category
      ? toContentCategory(row.category)
      : null,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const item = await getContent(id)

  if (!item) {
    return { title: "Conteúdo não encontrado" }
  }

  const typeLabel =
    { pdf: "PDF", video: "Vídeo", article: "Artigo", link: "Link" }[
      item.content_type
    ] || ""

  return {
    title: item.title,
    description:
      item.description ||
      `${typeLabel} sobre tecnologia e carreira na biblioteca MentoriasTech.`,
    alternates: { canonical: `/content/${id}` },
    openGraph: {
      title: `${item.title} | MentoriasTech`,
      description:
        item.description ||
        `Acesse este ${typeLabel.toLowerCase()} na MentoriasTech.`,
      url: `${SITE_URL}/content/${id}`,
      type: "article",
    },
  }
}

export default async function ContentDetailPage({ params }: Props) {
  const { id } = await params
  const item = await getContent(id)
  if (!item) notFound()

  return <ContentDetailClient initialData={item} />
}
