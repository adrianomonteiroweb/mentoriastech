import { extractText } from "unpdf"

export async function extractPdfText(
  buffer: ArrayBuffer,
): Promise<string | null> {
  try {
    const { text } = await extractText(new Uint8Array(buffer))
    if (!text || text.trim().length === 0) {
      console.warn("[pdf-to-markdown] PDF sem conteudo textual extraivel")
      return null
    }
    return text.trim()
  } catch (error) {
    console.error("[pdf-to-markdown] Falha na extracao:", error)
    return null
  }
}
