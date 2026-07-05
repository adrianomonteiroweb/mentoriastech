// Copia o build AMD do Monaco (min/vs) para public/monaco/vs, para servir o
// editor a partir da própria origem em vez de baixá-lo de um CDN em runtime.
// Sem isto, @monaco-editor/react tenta carregar o Monaco do jsdelivr e falha
// ("Monaco initialization: error") quando o CDN não está acessível.
// Roda no postinstall e é idempotente.
import { access, cp, mkdir, readdir, writeFile } from "node:fs/promises"
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

// Gera manifesto dos web workers. O monaco 0.55 serve os workers em
// vs/assets/<label>.worker-<hash>.js (nomes com hash do build), e não no antigo
// vs/base/worker/workerMain.js que o @monaco-editor/loader busca por padrão.
// Sem configurar MonacoEnvironment.getWorker com estes caminhos, abrir um
// arquivo dispara erro de worker ("[object Event]"). O app lê este manifesto.
const PREFIX_TO_LABEL = {
  "editor.worker": "editor",
  "ts.worker": "typescript",
  "json.worker": "json",
  "css.worker": "css",
  "html.worker": "html",
}
try {
  const assetsDir = join(dest, "assets")
  const files = await readdir(assetsDir)
  const manifest = {}
  for (const file of files) {
    for (const [prefix, label] of Object.entries(PREFIX_TO_LABEL)) {
      if (file.startsWith(`${prefix}-`) && file.endsWith(".js")) {
        manifest[label] = `assets/${file}`
      }
    }
  }
  await writeFile(
    join(dest, "workers.json"),
    JSON.stringify(manifest, null, 2),
  )
  console.log(
    `[copy-monaco] workers.json gerado (${Object.keys(manifest).join(", ") || "vazio"})`,
  )
} catch (error) {
  console.warn(
    `[copy-monaco] nao foi possivel gerar workers.json: ${error.message}`,
  )
}
