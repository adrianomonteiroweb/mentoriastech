import { config } from "dotenv"
config({ path: ".env.local" })
config()

import { neon } from "@neondatabase/serverless"
import { list, put, del } from "@vercel/blob"

// Migra TODOS os blobs do store antigo (OLD_BLOB_READ_WRITE_TOKEN) para o novo
// (BLOB_READ_WRITE_TOKEN), preservando o pathname, e remapeia as URLs salvas no
// banco (host antigo -> host novo). O store antigo NAO e apagado (fica de backup).
// Idempotente: pode rodar de novo sem efeitos colaterais.
const OLD = process.env.OLD_BLOB_READ_WRITE_TOKEN
const NEW = process.env.BLOB_READ_WRITE_TOKEN
const DB = process.env.DATABASE_URL

async function main() {
  if (!OLD) throw new Error("OLD_BLOB_READ_WRITE_TOKEN ausente")
  if (!NEW) throw new Error("BLOB_READ_WRITE_TOKEN ausente")
  if (!DB) throw new Error("DATABASE_URL ausente")

  // ---- Fase 0: validar que o store novo aceita acesso publico ----
  console.log("== Fase 0: validando acesso PUBLICO do store novo ==")
  try {
    const pre = await put(`__preflight__/${Date.now()}.txt`, "ok", {
      token: NEW,
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/plain",
    })
    await del(pre.url, { token: NEW })
    console.log("OK: o store novo aceita blobs publicos.")
  } catch (e) {
    console.error("FALHA: o store novo NAO aceita acesso publico:", (e as Error).message)
    console.error("Crie um Blob store PUBLICO na Vercel e atualize BLOB_READ_WRITE_TOKEN no .env.local.")
    process.exit(1)
  }

  // ---- Fase 1: listar blobs do store antigo ----
  console.log("\n== Fase 1: listando store ANTIGO ==")
  const oldBlobs: { url: string; pathname: string; size: number }[] = []
  let cursor: string | undefined
  do {
    const r = await list({ token: OLD, cursor, limit: 1000 })
    for (const b of r.blobs) oldBlobs.push({ url: b.url, pathname: b.pathname, size: b.size })
    cursor = r.hasMore ? r.cursor : undefined
  } while (cursor)
  console.log(`Total no store antigo: ${oldBlobs.length}`)
  if (oldBlobs.length === 0) {
    console.log("Nada para migrar.")
    return
  }
  const oldHost = new URL(oldBlobs[0].url).host

  // ---- Fase 2: copiar para o store novo (fetch + put, mesmo pathname) ----
  console.log("\n== Fase 2: copiando para o store NOVO ==")
  let newHost = ""
  let firstNewUrl = ""
  let copied = 0
  let failed = 0
  for (const b of oldBlobs) {
    try {
      const res = await fetch(b.url)
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      const contentType = res.headers.get("content-type") || undefined
      const uploaded = await put(b.pathname, buf, {
        token: NEW,
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
      })
      if (!newHost) {
        newHost = new URL(uploaded.url).host
        firstNewUrl = uploaded.url
      }
      copied++
      console.log(`  ok   ${b.pathname}`)
    } catch (e) {
      failed++
      console.error(`  ERRO ${b.pathname}: ${(e as Error).message}`)
    }
  }
  console.log(`Copiados: ${copied} | Falhas: ${failed}`)
  if (failed > 0) {
    console.error("Ha falhas na copia. Abortando antes de remapear o banco.")
    process.exit(1)
  }
  console.log(`oldHost = ${oldHost}`)
  console.log(`newHost = ${newHost}`)
  if (!newHost || newHost === oldHost) {
    console.error("newHost invalido. Abortando remap.")
    process.exit(1)
  }

  // ---- Fase 3: remapear URLs no banco (todas as colunas text) ----
  console.log("\n== Fase 3: remapeando URLs no banco ==")
  const sql = neon(DB)
  const cols: any = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying')
    ORDER BY table_name, column_name`
  let totalRows = 0
  for (const c of cols) {
    const t = c.table_name as string
    const col = c.column_name as string
    const countRes: any = await sql.query(
      `SELECT count(*)::int AS n FROM "${t}" WHERE "${col}" LIKE $1`,
      [`%${oldHost}%`],
    )
    const n = countRes[0]?.n ?? 0
    if (n > 0) {
      await sql.query(
        `UPDATE "${t}" SET "${col}" = REPLACE("${col}", $1, $2) WHERE "${col}" LIKE $3`,
        [oldHost, newHost, `%${oldHost}%`],
      )
      totalRows += n
      console.log(`  ${t}.${col}: ${n} linha(s)`)
    }
  }
  console.log(`Total de linhas atualizadas: ${totalRows}`)

  // ---- Fase 4: verificacao + teste round-trip do store novo ----
  console.log("\n== Fase 4: verificacao ==")
  let newCount = 0
  cursor = undefined
  do {
    const r = await list({ token: NEW, cursor, limit: 1000 })
    newCount += r.blobs.length
    cursor = r.hasMore ? r.cursor : undefined
  } while (cursor)
  console.log(`Store novo: ${newCount} blobs (antigo: ${oldBlobs.length})`)

  const spot = await fetch(firstNewUrl)
  console.log(`Spot-check GET ${firstNewUrl} -> HTTP ${spot.status}`)

  const testKey = `__migration_test__/${Date.now()}.txt`
  const testBody = `ok ${new Date().toISOString()}`
  const testPut = await put(testKey, testBody, {
    token: NEW,
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/plain",
  })
  const testGet = await fetch(testPut.url)
  const testText = await testGet.text()
  console.log(`Round-trip novo store: PUT ok | GET HTTP ${testGet.status} | conteudo confere: ${testText === testBody}`)
  await del(testPut.url, { token: NEW })
  console.log("Objeto de teste removido.")

  console.log("\nConcluido. O store ANTIGO permanece intacto (backup).")
}

main().catch((err) => {
  console.error("Erro:", err)
  process.exit(1)
})
