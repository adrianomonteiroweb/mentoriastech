"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { useTheme } from "next-themes"

// Monaco é client-only: dynamic import com ssr desabilitado.
// Servimos o Monaco da própria origem (public/monaco/vs, gerado por
// scripts/copy-monaco.mjs) em vez do CDN padrão — assim o editor inicializa
// mesmo sem acesso ao jsdelivr.
const MonacoEditor = dynamic(
  async () => {
    const mod = await import("@monaco-editor/react")
    mod.loader.config({ paths: { vs: "/monaco/vs" } })
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
