import { put, del } from "@vercel/blob"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_TYPES: Record<string, string[]> = {
  resume: ["application/pdf"],
  content: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ],
  ads: [
    "image/png",
    "image/jpeg",
    "image/webp",
  ],
}

interface UploadResult {
  url: string
  size: number
}

/**
 * Upload de arquivo para Vercel Blob.
 *
 * @param file - File do FormData
 * @param folder - Pasta de destino (ex: "resumes", "content")
 * @param category - Categoria para validação de tipo ("resume" | "content")
 * @returns URL pública do arquivo
 */
export async function uploadFile(
  file: File,
  folder: string,
  category: "resume" | "content" | "ads" = "content",
): Promise<UploadResult> {
  // Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(
      `Arquivo muito grande. Tamanho maximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      413,
    )
  }

  // Validar tipo
  const allowedTypes = ALLOWED_TYPES[category] || ALLOWED_TYPES.content
  if (!allowedTypes.includes(file.type)) {
    throw new UploadError(
      `Tipo de arquivo nao permitido: ${file.type}. Tipos aceitos: ${allowedTypes.join(", ")}`,
      415,
    )
  }

  // Gerar nome único
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const pathname = `${folder}/${timestamp}-${safeName}`

  const blob = await put(pathname, file, {
    access: "public",
  })

  return {
    url: blob.url,
    size: file.size,
  }
}

/**
 * Deletar arquivo do Vercel Blob.
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    await del(url)
  } catch (error) {
    console.error("[upload] Delete error:", error)
    // Não lançar erro — deleção de blob é best-effort
  }
}

/**
 * Erro de upload com status HTTP.
 */
export class UploadError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "UploadError"
    this.status = status
  }
}
