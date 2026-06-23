import { randomUUID } from "crypto"
import { del, get, list, put } from "@vercel/blob"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

type UploadCategory = "resume" | "content" | "ads" | "mentorship"
type UploadAccess = "public" | "private"

export function baseMime(mime: string): string {
  const idx = mime.indexOf(";")
  return idx >= 0 ? mime.slice(0, idx).trim() : mime
}

interface UploadTypeRule {
  mime: string
  extensions: string[]
  matchesSignature: (bytes: Uint8Array) => boolean
}

interface UploadCategoryConfig {
  access: UploadAccess
  rules: UploadTypeRule[]
}

const PDF_RULE: UploadTypeRule = {
  mime: "application/pdf",
  extensions: [".pdf"],
  matchesSignature: (bytes) =>
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d,
}

const PNG_RULE: UploadTypeRule = {
  mime: "image/png",
  extensions: [".png"],
  matchesSignature: (bytes) =>
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a,
}

const JPEG_RULE: UploadTypeRule = {
  mime: "image/jpeg",
  extensions: [".jpg", ".jpeg"],
  matchesSignature: (bytes) =>
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
}

const WEBP_RULE: UploadTypeRule = {
  mime: "image/webp",
  extensions: [".webp"],
  matchesSignature: (bytes) =>
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50,
}

const DOC_RULE: UploadTypeRule = {
  mime: "application/msword",
  extensions: [".doc"],
  matchesSignature: (bytes) =>
    bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0,
}

const DOCX_RULE: UploadTypeRule = {
  mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  extensions: [".docx"],
  matchesSignature: (bytes) =>
    bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04,
}

const WEBM_RULE: UploadTypeRule = {
  mime: "audio/webm",
  extensions: [".webm"],
  matchesSignature: (bytes) =>
    bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3,
}

const MP4_AUDIO_RULE: UploadTypeRule = {
  mime: "audio/mp4",
  extensions: [".m4a", ".mp4"],
  matchesSignature: (bytes) =>
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70,
}

const OGG_RULE: UploadTypeRule = {
  mime: "audio/ogg",
  extensions: [".ogg"],
  matchesSignature: (bytes) =>
    bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53,
}

const WAV_RULE: UploadTypeRule = {
  mime: "audio/wav",
  extensions: [".wav"],
  // "RIFF" .... "WAVE" (distingue de WEBP, que tem "WEBP" no offset 8)
  matchesSignature: (bytes) =>
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45,
}

const KNOWN_BINARY_PREFIXES: number[][] = [
  [0x25, 0x50, 0x44, 0x46],
  [0x89, 0x50, 0x4e, 0x47],
  [0xff, 0xd8, 0xff],
  [0x52, 0x49, 0x46, 0x46],
  [0xd0, 0xcf, 0x11, 0xe0],
  [0x50, 0x4b, 0x03, 0x04],
  [0x1a, 0x45, 0xdf, 0xa3],
  [0x4f, 0x67, 0x67, 0x53],
  [0x7f, 0x45, 0x4c, 0x46],
  [0x4d, 0x5a],
]

function isPlainText(bytes: Uint8Array): boolean {
  for (const sig of KNOWN_BINARY_PREFIXES) {
    if (sig.every((b, i) => bytes[i] === b)) return false
  }
  for (let i = 0; i < Math.min(bytes.length, 16); i++) {
    const b = bytes[i]
    if (b === 0x00) return false
    if (b === 0x0a || b === 0x0d || b === 0x09) continue
    if (b < 0x20) return false
  }
  return true
}

const TXT_RULE: UploadTypeRule = {
  mime: "text/plain",
  extensions: [".txt"],
  matchesSignature: isPlainText,
}

const UPLOAD_CONFIG: Record<UploadCategory, UploadCategoryConfig> = {
  resume: {
    access: "public",
    rules: [PDF_RULE],
  },
  content: {
    access: "public",
    rules: [PDF_RULE, PNG_RULE, JPEG_RULE, WEBP_RULE],
  },
  ads: {
    access: "public",
    rules: [PNG_RULE, JPEG_RULE, WEBP_RULE],
  },
  mentorship: {
    access: "public",
    rules: [
      PDF_RULE, DOC_RULE, DOCX_RULE,
      PNG_RULE, JPEG_RULE, WEBP_RULE,
      TXT_RULE,
      WEBM_RULE, MP4_AUDIO_RULE, OGG_RULE, WAV_RULE,
    ],
  },
}

interface UploadResult {
  url: string
  pathname: string
  access: UploadAccess
  size: number
}

function getExtension(filename: string) {
  const index = filename.lastIndexOf(".")
  return index >= 0 ? filename.slice(index).toLowerCase() : ""
}

async function validateFile(file: File, category: UploadCategory) {
  const config = UPLOAD_CONFIG[category]
  const extension = getExtension(file.name)
  const fileBaseMime = baseMime(file.type)
  const rule = config.rules.find(
    (candidate) =>
      candidate.mime === fileBaseMime &&
      candidate.extensions.includes(extension),
  )

  if (!rule) {
    const accepted = config.rules
      .flatMap((candidate) => candidate.extensions)
      .join(", ")
    throw new UploadError(
      `Tipo de arquivo nao permitido. Extensoes aceitas: ${accepted}`,
      415,
    )
  }

  const signatureBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!rule.matchesSignature(signatureBytes)) {
    throw new UploadError(
      "Assinatura do arquivo nao corresponde ao tipo enviado.",
      415,
    )
  }

  return { config, extension, mime: rule.mime }
}

/**
 * Upload de arquivo para Vercel Blob.
 *
 * Todos os uploads usam blob publico (ver UPLOAD_CONFIG). Curriculos ficam sob o
 * prefixo private/resumes/, mas a "privacidade" e feita na camada da aplicacao:
 * acesso via URLs assinadas de curta duracao + auditoria (lib/utils/resume-access.ts).
 * O blob em si e publicamente acessivel por URL.
 */
export async function uploadFile(
  file: File,
  folder: string,
  category: UploadCategory = "content",
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(
      `Arquivo muito grande. Tamanho maximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      413,
    )
  }

  const { config, extension, mime } = await validateFile(file, category)

  const pathname =
    config.access === "private"
      ? `${folder}/${randomUUID()}${extension}`
      : `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

  const blob = await put(pathname, file, {
    access: config.access,
    contentType: mime,
  })

  return {
    url: blob.url,
    pathname: blob.pathname,
    access: config.access,
    size: file.size,
  }
}

export async function uploadPrivateResume(file: File, userId: string) {
  return uploadFile(file, `private/resumes/${userId}`, "resume")
}

export async function uploadMentorshipFile(file: File, bookingId: string) {
  return uploadFile(file, `mentorship/${bookingId}`, "mentorship")
}

export async function uploadPrivateLinkedinPdf(file: File, userId: string) {
  return uploadFile(file, `private/linkedin/${userId}`, "resume")
}

export async function getPrivateFile(pathname: string) {
  const access = UPLOAD_CONFIG.resume.access
  if (access === "public") {
    const { blobs } = await list({ prefix: pathname, limit: 1 })
    const blob = blobs[0]
    if (!blob) return null
    const res = await fetch(blob.url)
    if (!res.ok) return null
    return { ...blob, stream: res.body, statusCode: 200 }
  }
  return get(pathname, { access: "private", useCache: false })
}

/**
 * Deletar arquivo do Vercel Blob.
 */
export async function deleteFile(urlOrPathname: string): Promise<void> {
  try {
    await del(urlOrPathname)
  } catch (error) {
    console.error("[upload] Delete error:", error)
    // Nao lancar erro: delecao de blob e best-effort.
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
