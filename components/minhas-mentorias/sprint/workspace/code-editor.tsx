"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

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
}

export function CodeEditor({ path, value, readOnly, onChange }: Props) {
  return (
    <MonacoEditor
      path={path}
      language={languageForPath(path)}
      value={value}
      theme="vs-dark"
      onChange={(next) => onChange?.(next ?? "")}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineHeight: 22,
        wordWrap: "on",
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 2,
        renderWhitespace: "none",
        accessibilitySupport: "auto",
      }}
    />
  )
}
