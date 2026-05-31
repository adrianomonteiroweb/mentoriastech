import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { getPrivateFile } from "@/lib/utils/upload"

const RESUME_DOWNLOAD_TTL_SECONDS = 5 * 60
const RESUME_STORAGE_PREFIX = "private/resumes/"

interface SignedResumeInput {
  requestUrl: string
  profileId: string
  pathname: string
  signedBy: string
  scope: "self" | "admin" | "hr"
}

interface VerifiedResumeDownload {
  profileId: string
  pathname: string
  signedBy: string
  scope: "self" | "admin" | "hr"
}

function getSigningSecret() {
  const secret =
    process.env.RESUME_DOWNLOAD_SIGNING_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN

  if (!secret) {
    throw new Error("Missing resume download signing secret")
  }

  return secret
}

function signResumePayload(payload: string) {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url")
}

function buildPayload({
  profileId,
  pathname,
  expires,
  signedBy,
  scope,
}: VerifiedResumeDownload & { expires: string }) {
  return ["v1", profileId, pathname, expires, signedBy, scope].join(":")
}

function isValidScope(scope: string): scope is VerifiedResumeDownload["scope"] {
  return scope === "self" || scope === "admin" || scope === "hr"
}

export function isProtectedResumePath(value: string | null | undefined) {
  return Boolean(value && value.startsWith(RESUME_STORAGE_PREFIX))
}

export function isLegacyPublicResumeUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value))
}

export function safeProfileResumeHref(
  profileId: string,
  value: string | null | undefined,
) {
  return value ? `/api/admin/mentees/${profileId}/resume` : null
}

export function safeOwnResumeHref(value: string | null | undefined) {
  return value ? "/api/profile/resume" : null
}

export function createSignedResumeDownloadUrl({
  requestUrl,
  profileId,
  pathname,
  signedBy,
  scope,
}: SignedResumeInput) {
  const url = new URL(requestUrl)
  const expires = String(
    Math.floor(Date.now() / 1000) + RESUME_DOWNLOAD_TTL_SECONDS,
  )
  const payload = buildPayload({ profileId, pathname, expires, signedBy, scope })
  const signature = signResumePayload(payload)

  url.search = ""
  url.searchParams.set("download", "1")
  url.searchParams.set("profileId", profileId)
  url.searchParams.set("pathname", pathname)
  url.searchParams.set("expires", expires)
  url.searchParams.set("signedBy", signedBy)
  url.searchParams.set("scope", scope)
  url.searchParams.set("signature", signature)

  return url
}

export function verifySignedResumeDownload(
  url: URL,
): VerifiedResumeDownload | null {
  if (url.searchParams.get("download") !== "1") return null

  const profileId = url.searchParams.get("profileId")
  const pathname = url.searchParams.get("pathname")
  const expires = url.searchParams.get("expires")
  const signedBy = url.searchParams.get("signedBy")
  const scope = url.searchParams.get("scope")
  const signature = url.searchParams.get("signature")

  if (!profileId || !pathname || !expires || !signedBy || !scope || !signature) {
    return null
  }

  if (!isValidScope(scope) || !isProtectedResumePath(pathname)) {
    return null
  }

  const expiresAt = Number(expires)
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return null
  }

  const expected = signResumePayload(
    buildPayload({ profileId, pathname, expires, signedBy, scope }),
  )
  const receivedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null
  }

  return { profileId, pathname, signedBy, scope }
}

export async function streamPrivateResume(pathname: string) {
  const result = await getPrivateFile(pathname)

  if (!result || result.statusCode === 304 || !result.stream) {
    return NextResponse.json({ error: "Curriculo nao encontrado" }, { status: 404 })
  }

  // getPrivateFile retorna formatos diferentes para blob privado (get, expõe
  // metadados em `blob`) e público (list+fetch, sem `blob`). Currículos são
  // sempre PDF, então o fallback é seguro.
  const contentType =
    ("blob" in result ? result.blob?.contentType : undefined) || "application/pdf"

  return new Response(result.stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="curriculo.pdf"',
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
