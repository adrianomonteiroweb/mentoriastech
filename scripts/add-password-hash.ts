import { config } from "dotenv"
config({ path: ".env.local" })
import { neon } from "@neondatabase/serverless"

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'password_hash'
  `

  if (cols.length > 0) {
    console.log("Coluna password_hash ja existe na tabela profiles.")
    return
  }

  await sql`ALTER TABLE profiles ADD COLUMN password_hash text`
  console.log("Coluna password_hash adicionada com sucesso.")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
