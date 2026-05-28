import { SignJWT, jwtVerify, type JWTPayload } from "jose"

export interface AuthTokenPayload extends JWTPayload {
  sub: string
  email: string
  role: string
}

const ALG = "HS256"
const TOKEN_LIFETIME = "7d"

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not set")
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: {
  userId: string
  email: string
  role: string
}): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_LIFETIME)
    .setProtectedHeader({ alg: ALG })
    .sign(getSecret())
}

export async function verifyToken(
  token: string,
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload.sub || !payload.email || !payload.role) return null
    return payload as AuthTokenPayload
  } catch {
    return null
  }
}
