"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { useTheme } from "next-themes"

// Monaco é client-only: dynamic import com ssr desabilitado.
// Servimos o Monaco da própria origem (public/monaco/vs, gerado por
// scripts/copy-monaco.mjs) em vez do CDN padrão — assim o editor inicializa
// mesmo sem acesso ao jsdelivr.
const MONACO_BASE = "/monaco/vs/"

declare global {
  interface Window {
    MonacoEnvironment?: { getWorker?: (id: string, label: string) => Worker }
    __monacoWorkersReady?: boolean
  }
}

/** Worker inócuo: mantém o editor vivo (sem IntelliSense) se algo falhar. */
function stubWorker(): Worker {
  const blob = new Blob(["self.onmessage=function(){}"], {
    type: "text/javascript",
  })
  return new Worker(URL.createObjectURL(blob))
}

/**
 * Configura os web workers do Monaco. No monaco 0.55 os workers vivem em
 * vs/assets/<label>.worker-<hash>.js (nomes com hash), e não no antigo
 * vs/base/worker/workerMain.js. Além disso, o `editor.main.js`, ao carregar,
 * executa `self.MonacoEnvironment = { getWorker: … }` (embrulhando o worker em
 * Blob + importScripts + trustedTypes) — e esse caminho falha aqui, gerando o
 * erro "[object Event]" ao abrir um arquivo. Por isso:
 *   1) só chamamos isto DEPOIS de `loader.init()` (senão o monaco sobrescreve);
 *   2) carregamos o worker clássico DIRETO do assets (sem o wrapper que quebra);
 *   3) mutamos apenas `.getWorker`, preservando o objeto do monaco;
 *   4) fallback em stub p/ a IDE nunca quebrar.
 */
async function setupMonacoWorkers() {
  if (typeof window === "undefined" || window.__monacoWorkersReady) return
  let manifest: Record<string, string> = {}
  try {
    const res = await fetch(`${MONACO_BASE}workers.json`)
    if (res.ok) manifest = await res.json()
  } catch {
    // manifesto ausente → stub (editor funciona, sem IntelliSense)
  }

  function fileForLabel(label: string): string | undefined {
    switch (label) {
      case "typescript":
      case "javascript":
        return manifest.typescript
      case "json":
        return manifest.json
      case "css":
      case "scss":
      case "less":
        return manifest.css
      case "html":
      case "handlebars":
      case "razor":
        return manifest.html
      default:
        return manifest.editor
    }
  }

  const env = (window.MonacoEnvironment = window.MonacoEnvironment || {})
  env.getWorker = (_id: string, label: string): Worker => {
    const file = fileForLabel(label)
    if (!file) return stubWorker()
    try {
      const worker = new Worker(MONACO_BASE + file)
      // Evita que um erro do worker vire "unhandled" e derrube a IDE.
      worker.addEventListener("error", (event) => event.preventDefault())
      return worker
    } catch {
      return stubWorker()
    }
  }
  window.__monacoWorkersReady = true
}

/**
 * IDE "só sintaxe": a plataforma avalia por regras estáticas (não compila nem
 * roda), e o workspace do browser não tem node_modules/@types — então imports de
 * libs externas gerariam "Cannot find module" falso-positivo. Desligamos a
 * validação semântica/de tipos (mantendo erros de sintaxe reais) e afrouxamos as
 * compiler options para tirar o ruído. Autocomplete de APIs nativas continua.
 */
function configureMonacoLanguages(monaco: typeof import("monaco-editor")) {
  // As d.ts do monaco marcam `languages.typescript` como `{ deprecated: true }`,
  // mas a API existe em runtime — daí o cast para a forma mínima que usamos.
  type Defaults = {
    setDiagnosticsOptions: (o: {
      noSemanticValidation?: boolean
      noSyntaxValidation?: boolean
      noSuggestionDiagnostics?: boolean
    }) => void
    getCompilerOptions: () => Record<string, unknown>
    setCompilerOptions: (o: Record<string, unknown>) => void
  }
  const ts = monaco.languages.typescript as unknown as {
    typescriptDefaults: Defaults
    javascriptDefaults: Defaults
    ScriptTarget: { ESNext: number }
    ModuleKind: { ESNext: number }
    ModuleResolutionKind: { NodeJs: number }
    JsxEmit: { React: number }
  }
  for (const defaults of [ts.typescriptDefaults, ts.javascriptDefaults]) {
    defaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    })
    defaults.setCompilerOptions({
      ...defaults.getCompilerOptions(),
      allowNonTsExtensions: true,
      allowJs: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      noEmit: true,
    })
  }
}

const MonacoEditor = dynamic(
  async () => {
    const mod = await import("@monaco-editor/react")
    mod.loader.config({ paths: { vs: "/monaco/vs" } })
    // init() carrega o monaco (que seta o getWorker dele); só então
    // sobrescrevemos com o nosso, garantindo que a nossa versão prevaleça.
    const monaco = await mod.loader.init()
    await setupMonacoWorkers()
    configureMonacoLanguages(monaco)
    return mod.default
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center" role="status" aria-label="Carregando editor">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  },
)

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  sql: "sql",
  yml: "yaml",
  yaml: "yaml",
  env: "ini",
}

export function languageForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() || ""
  return LANGUAGE_BY_EXTENSION[extension] || "plaintext"
}

interface Props {
  path: string
  value: string
  readOnly?: boolean
  onChange?: (value: string) => void
  /** Mobile: fonte maior, sem minimap/numeração/folding e wordWrap on. */
  compact?: boolean
  /** Sobrescreve o tema do Monaco; por padrão segue o tema claro/escuro do app. */
  theme?: "vs-dark" | "light"
}

export function CodeEditor({ path, value, readOnly, onChange, compact, theme }: Props) {
  const { resolvedTheme } = useTheme()
  const monacoTheme = theme ?? (resolvedTheme === "light" ? "light" : "vs-dark")

  return (
    <MonacoEditor
      path={path}
      language={languageForPath(path)}
      value={value}
      theme={monacoTheme}
      onChange={(next) => onChange?.(next ?? "")}
      options={{
        readOnly,
        // Fonte um pouco maior no mobile favorece leitura e baixa visão.
        fontSize: compact ? 15 : 14,
        lineHeight: compact ? 24 : 22,
        fontFamily:
          "var(--font-mono), 'Fira Code', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        fontLigatures: true,
        // Minimap/numeração ocupam espaço precioso em telas pequenas.
        minimap: { enabled: !compact },
        lineNumbers: compact ? "off" : "on",
        folding: !compact,
        wordWrap: "on",
        automaticLayout: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        tabSize: 2,
        renderWhitespace: "none",
        renderLineHighlight: "all",
        padding: { top: 12, bottom: compact ? 24 : 12 },
        scrollbar: {
          verticalScrollbarSize: compact ? 8 : 10,
          horizontalScrollbarSize: compact ? 8 : 10,
        },
        accessibilitySupport: "auto",
      }}
    />
  )
}
