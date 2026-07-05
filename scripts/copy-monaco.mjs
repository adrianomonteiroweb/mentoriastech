// Copia o build AMD do Monaco (min/vs) para public/monaco/vs, para servir o
// editor a partir da própria origem em vez de baixá-lo de um CDN em runtime.
// Sem isto, @monaco-editor/react tenta carregar o Monaco do jsdelivr e falha
// ("Monaco initialization: error") quando o CDN não está acessível.
// Roda no postinstall e é idempotente.
import { access, cp, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = join(root, "node_modules", "monaco-editor", "min", "vs")
const dest = join(root, "public", "monaco", "vs")

try {
  await access(src)
} catch {
  console.warn(
    "[copy-monaco] monaco-editor nao encontrado em node_modules; pulando copia.",
  )
  process.exit(0)
}

await mkdir(dirname(dest), { recursive: true })
await cp(src, dest, { recursive: true })
console.log(`[copy-monaco] Monaco copiado para ${dest}`)
