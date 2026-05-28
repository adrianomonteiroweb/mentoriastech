import { config } from "dotenv"
config({ path: ".env.local" })
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const BCRYPT_ROUNDS = 12

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error("Uso: pnpm tsx scripts/set-admin-password.ts <email> <nova-senha>")
    process.exit(1)
  }

  if (password.length < 6) {
    console.error("A senha deve ter pelo menos 6 caracteres.")
    process.exit(1)
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }

  const sql = neon(databaseUrl)
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const result = await sql`
    UPDATE profiles
    SET password_hash = ${hash}, updated_at = now()
    WHERE email = ${email.toLowerCase()}
    RETURNING id, email, role
  `

  if (result.length === 0) {
    console.error(`Nenhum usuario encontrado com email: ${email}`)
    process.exit(1)
  }

  const user = result[0]
  console.log(`Senha atualizada para ${user.email} (role: ${user.role}, id: ${user.id})`)
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
