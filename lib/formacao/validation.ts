import { z } from "zod"

/**
 * Schemas Zod das rotas da Órbita (route.ts do Next só exporta handlers).
 * As APIs da formação usam camelCase (módulo isolado, distinto do sim_*).
 */

const textoOpcional = z.string().max(20_000).optional().or(z.literal(""))

export const criarTurmaSchema = z.object({
  nome: z.string().min(2, "Nome da turma é obrigatório").max(120),
  empresaFicticia: z.string().max(120).optional().or(z.literal("")),
  linkMeet: z.string().url("Link do Meet inválido").max(500).optional().or(z.literal("")),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
})

export const editarTurmaSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  empresaFicticia: z.string().max(120).optional().or(z.literal("")),
  linkMeet: z.string().url("Link do Meet inválido").max(500).optional().or(z.literal("")),
  faseAtual: z.number().int().min(1).max(2).optional(),
  status: z.enum(["planejada", "ativa", "concluida", "cancelada"]).optional(),
})

export const convidarMembroSchema = z.object({
  email: z.string().email("E-mail inválido"),
  nome: z.string().max(120).optional().or(z.literal("")),
})

export const gerarEncontrosSchema = z.object({
  quantidade: z.number().int().min(1).max(52).optional(),
})

export const atribuirPapeisSchema = z.object({
  encontroId: z.string().uuid("Encontro inválido"),
  atribuicoes: z
    .array(
      z.object({
        membroId: z.string().uuid("Membro inválido"),
        papelId: z.string().uuid("Papel inválido"),
      }),
    )
    .min(1, "Informe ao menos uma atribuição"),
})

export const tarefaStatusSchema = z.object({
  // O aluno controla só estes; em_revisao vem do envio de entrega e concluida
  // vem da aprovação do instrutor.
  status: z.enum(["a_fazer", "em_andamento", "bloqueada"]),
})

export const criterioToggleSchema = z.object({
  concluido: z.boolean(),
})

export const criarEntregaSchema = z
  .object({
    tipo: z.enum([
      "texto",
      "arquivo",
      "link",
      "audio",
      "produto",
      "repositorio",
      "pull_request",
    ]),
    conteudo: z.string().max(20_000).optional().or(z.literal("")),
    arquivoUrl: z.string().url().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      d.tipo === "arquivo" || d.tipo === "audio"
        ? !!d.arquivoUrl
        : !!(d.conteudo && d.conteudo.trim()),
    { message: "Preencha o conteúdo ou anexe o arquivo da entrega" },
  )

export const revisarEntregaSchema = z.object({
  acao: z.enum(["aprovar", "solicitar_correcao"]),
  comentario: z.string().max(20_000).optional().or(z.literal("")),
})

export const criarTarefaSchema = z.object({
  titulo: z.string().min(3, "Título é obrigatório").max(200),
  contexto: textoOpcional,
  motivo: textoOpcional,
  politicaIa: textoOpcional,
  prazo: z.string().datetime().optional().or(z.literal("")),
  projetoId: z.string().uuid().optional().or(z.literal("")),
  etapaId: z.string().uuid().optional().or(z.literal("")),
  papelId: z.string().uuid().optional().or(z.literal("")),
  membroId: z.string().uuid().optional().or(z.literal("")),
  criterios: z.array(z.string().min(1).max(500)).max(20).optional(),
})
