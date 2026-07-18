/**
 * Gate de acesso da Órbita (Formação em Squad).
 *
 * Durante o desenvolvimento, o curso fica acessível apenas quando
 * NEXT_PUBLIC_FORMACAO_PREVIEW=true. Sem a variável, as rotas /formacao/*
 * retornam 404 (ver app/formacao/layout.tsx) e o link some da tela pública.
 */
export function isFormacaoPreviewEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FORMACAO_PREVIEW === "true"
}
