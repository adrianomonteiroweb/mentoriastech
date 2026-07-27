/**
 * Monta a planilha .xlsx do plano de estudos com a identidade visual da
 * MentoriasTech, reproduzindo as 5 abas da planilha de referência.
 *
 * Identidade: faixa de cabeçalho navy com o wordmark bicolor "MentoriasTech"
 * (via richText), headers de tabela em azul da marca (#3B82F6), zebra sutil,
 * bordas finas. Sem dependência de arquivo de imagem (o logo é SVG em React).
 */
import ExcelJS from "exceljs"
import type { StudyPlanData } from "./types"

const BRAND_BLUE = "FF3B82F6"
const BRAND_NAVY = "FF0D1117"
const WHITE = "FFFFFFFF"
const ZEBRA = "FFF1F5F9" // slate-100
const BORDER = "FFE2E8F0" // slate-200
const TEXT = "FF0F172A" // slate-900
const MUTED = "FF475569" // slate-600
const SOFT_BLUE = "FFEFF6FF" // blue-50
const SUBTLE = "FFCBD5E1" // slate-300
const FONT = "Calibri"

type WS = ExcelJS.Worksheet
type Fill = ExcelJS.Fill

function solid(argb: string): Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } }
}

function border() {
  const side = { style: "thin" as const, color: { argb: BORDER } }
  return { top: side, left: side, bottom: side, right: side }
}

function setWidths(ws: WS, widths: number[]) {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })
}

function brandBand(ws: WS, lastCol: number, subtitle: string) {
  ws.mergeCells(1, 1, 1, lastCol)
  const cell = ws.getCell(1, 1)
  cell.value = {
    richText: [
      { font: { name: FONT, size: 15, bold: true, color: { argb: WHITE } }, text: "Mentorias" },
      { font: { name: FONT, size: 15, bold: true, color: { argb: BRAND_BLUE } }, text: "Tech" },
      { font: { name: FONT, size: 11, color: { argb: SUBTLE } }, text: `    ${subtitle}` },
    ],
  }
  for (let c = 1; c <= lastCol; c++) ws.getCell(1, c).fill = solid(BRAND_NAVY)
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  ws.getRow(1).height = 30
}

function sectionTitle(ws: WS, top: number, left: number, right: number, text: string) {
  ws.mergeCells(top, left, top, right)
  for (let c = left; c <= right; c++) {
    const cell = ws.getCell(top, c)
    cell.fill = solid(SOFT_BLUE)
    cell.border = border()
  }
  const cell = ws.getCell(top, left)
  cell.value = text
  cell.font = { name: FONT, bold: true, size: 11, color: { argb: BRAND_BLUE } }
  cell.alignment = { vertical: "middle", horizontal: "left" }
}

function tableHeader(ws: WS, rowIdx: number, headers: string[], startCol = 1) {
  const row = ws.getRow(rowIdx)
  headers.forEach((h, i) => {
    const cell = row.getCell(startCol + i)
    cell.value = h
    cell.fill = solid(BRAND_BLUE)
    cell.font = { name: FONT, bold: true, color: { argb: WHITE }, size: 10.5 }
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
    cell.border = border()
  })
  row.height = 26
}

function dataCell(
  ws: WS,
  r: number,
  c: number,
  value: ExcelJS.CellValue,
  opts: { zebra?: boolean; align?: "left" | "center"; bold?: boolean } = {},
) {
  const cell = ws.getCell(r, c)
  cell.value = value
  cell.font = { name: FONT, size: 10, color: { argb: TEXT }, bold: opts.bold }
  cell.alignment = { vertical: "top", horizontal: opts.align ?? "left", wrapText: true }
  cell.border = border()
  if (opts.zebra) cell.fill = solid(ZEBRA)
  return cell
}

function labelCell(ws: WS, r: number, c: number, label: string) {
  const cell = ws.getCell(r, c)
  cell.value = label
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: MUTED } }
  cell.alignment = { vertical: "top", horizontal: "left", wrapText: true }
  cell.border = border()
}

function valueCell(
  ws: WS,
  r: number,
  left: number,
  right: number,
  value: string,
  isLink = false,
) {
  if (right > left) ws.mergeCells(r, left, r, right)
  for (let c = left; c <= right; c++) ws.getCell(r, c).border = border()
  const cell = ws.getCell(r, left)
  if (isLink && value) {
    cell.value = { text: value, hyperlink: value }
    cell.font = { name: FONT, size: 10, color: { argb: BRAND_BLUE }, underline: true }
  } else {
    cell.value = value
    cell.font = { name: FONT, size: 10, color: { argb: TEXT } }
  }
  cell.alignment = { vertical: "top", horizontal: "left", wrapText: true }
}

// ---------------------------------------------------------------------------

function buildVisaoGeral(wb: ExcelJS.Workbook, data: StudyPlanData) {
  const ws = wb.addWorksheet("Visão geral")
  setWidths(ws, [22, 34, 18, 4, 3, 26, 12, 3, 26, 10])
  const LAST = 10

  brandBand(ws, LAST, "Plano de estudos")

  ws.mergeCells(2, 1, 2, LAST)
  const title = ws.getCell(2, 1)
  title.value = data.vaga.titulo
  title.font = { name: FONT, bold: true, size: 14, color: { argb: TEXT } }
  title.alignment = { vertical: "middle", horizontal: "left" }
  ws.getRow(2).height = 22

  // Bloco esquerdo: dados da vaga (linhas 4-9)
  sectionTitle(ws, 4, 1, 3, "Dados da vaga")
  const vagaRows: [string, string, boolean][] = [
    ["Vaga", data.vaga.titulo, false],
    ["Empresa", data.vaga.empresa, false],
    ["Local", data.vaga.local, false],
    ["Modelo", data.vaga.modelo, false],
    ["Link da vaga", data.vaga.link || "Não informado", Boolean(data.vaga.link)],
    ["Objetivo", data.vaga.objetivo, false],
  ]
  vagaRows.forEach(([label, value, isLink], i) => {
    const r = 5 + i
    labelCell(ws, r, 1, label)
    valueCell(ws, r, 2, 3, value, isLink)
  })
  ws.getRow(10).height = 42 // objetivo

  // Bloco meio: indicadores (colunas F:G)
  sectionTitle(ws, 4, 6, 7, "Indicadores do plano")
  const indicadores: [string, number][] = [
    ["Semanas", data.indicadores.semanas],
    ["Carga total (h)", data.indicadores.cargaTotalHoras],
    ["Semanas concluídas", 0],
    ["Progresso médio (%)", 0],
    ["Requisitos comprovados", 0],
    ["Projeto concluído", 0],
  ]
  indicadores.forEach(([label, value], i) => {
    const r = 5 + i
    labelCell(ws, r, 6, label)
    dataCell(ws, r, 7, value, { align: "center", bold: true })
  })

  // Bloco direito: resumo por etapa (colunas I:J)
  sectionTitle(ws, 4, 9, 10, "Resumo por etapa")
  tableHeader(ws, 5, ["Etapa", "Horas"], 9)
  data.etapasResumo.forEach((e, i) => {
    const r = 6 + i
    dataCell(ws, r, 9, e.etapa, { zebra: i % 2 === 1 })
    dataCell(ws, r, 10, e.horas, { align: "center", zebra: i % 2 === 1 })
  })

  // Bloco inferior: princípios de execução
  const pStart = 13
  sectionTitle(ws, pStart, 1, 3, "Princípios de execução")
  data.principiosDeExecucao.forEach((p, i) => {
    const r = pStart + 1 + i
    dataCell(ws, r, 1, i + 1, { align: "center", bold: true })
    valueCell(ws, r, 2, 3, p)
  })
}

function buildPlanoSemanal(wb: ExcelJS.Workbook, data: StudyPlanData) {
  const ws = wb.addWorksheet("Plano semanal", {
    views: [{ state: "frozen", ySplit: 2 }],
  })
  setWidths(ws, [8, 22, 27, 40, 38, 38, 34, 9, 26, 15, 12])
  brandBand(ws, 11, "Plano semana a semana")
  tableHeader(ws, 2, [
    "Semana",
    "Etapa",
    "Foco",
    "Base lógica e conceitual",
    "Tecnologias como ferramentas",
    "Prática sugerida",
    "Entregável",
    "Horas",
    "Requisito relacionado",
    "Status",
    "Progresso",
  ])
  data.planoSemanal.forEach((w, i) => {
    const r = 3 + i
    const z = i % 2 === 1
    dataCell(ws, r, 1, w.semana, { align: "center", bold: true, zebra: z })
    dataCell(ws, r, 2, w.etapa, { zebra: z })
    dataCell(ws, r, 3, w.foco, { zebra: z })
    dataCell(ws, r, 4, w.baseLogicaConceitual, { zebra: z })
    dataCell(ws, r, 5, w.tecnologiasFerramentas, { zebra: z })
    dataCell(ws, r, 6, w.praticaSugerida, { zebra: z })
    dataCell(ws, r, 7, w.entregavel, { zebra: z })
    dataCell(ws, r, 8, w.horas, { align: "center", zebra: z })
    dataCell(ws, r, 9, w.requisitoRelacionado, { zebra: z })
    dataCell(ws, r, 10, "Não iniciado", { zebra: z })
    dataCell(ws, r, 11, 0, { align: "center", zebra: z })
    ws.getRow(r).height = 56
  })
}

function buildRequisitos(wb: ExcelJS.Workbook, data: StudyPlanData) {
  const ws = wb.addWorksheet("Requisitos da vaga", {
    views: [{ state: "frozen", ySplit: 2 }],
  })
  setWidths(ws, [18, 24, 27, 48, 20, 3, 20, 50])
  brandBand(ws, 8, "Requisitos e comprovação")
  tableHeader(ws, 2, [
    "Tipo",
    "Competência",
    "Onde estudar",
    "Evidência no portfólio",
    "Situação",
  ])
  data.requisitos.forEach((q, i) => {
    const r = 3 + i
    const z = i % 2 === 1
    dataCell(ws, r, 1, q.tipo, { zebra: z })
    dataCell(ws, r, 2, q.competencia, { bold: true, zebra: z })
    dataCell(ws, r, 3, q.ondeEstudar, { zebra: z })
    dataCell(ws, r, 4, q.evidenciaPortfolio, { zebra: z })
    dataCell(ws, r, 5, "Pendente", { zebra: z })
    ws.getRow(r).height = 34
  })

  // Bloco lateral: referência / link da vaga (colunas G:H)
  tableHeader(ws, 2, ["Referência", "Link"], 7)
  dataCell(ws, 3, 7, "Vaga oficial")
  const linkCell = ws.getCell(3, 8)
  if (data.vaga.link) {
    linkCell.value = { text: data.vaga.link, hyperlink: data.vaga.link }
    linkCell.font = { name: FONT, size: 10, color: { argb: BRAND_BLUE }, underline: true }
  } else {
    linkCell.value = "Não informado"
    linkCell.font = { name: FONT, size: 10, color: { argb: TEXT } }
  }
  linkCell.alignment = { vertical: "top", horizontal: "left", wrapText: true }
  linkCell.border = border()
  dataCell(ws, 4, 7, "Observação")
  dataCell(ws, 4, 8, "Confirme se a vaga continua ativa antes de se candidatar.")
}

function buildProjetoFinal(wb: ExcelJS.Workbook, data: StudyPlanData) {
  const ws = wb.addWorksheet("Projeto final", {
    views: [{ state: "frozen", ySplit: 3 }],
  })
  setWidths(ws, [8, 18, 55, 13, 18, 22])
  brandBand(ws, 6, "Projeto integrador de portfólio")

  ws.mergeCells(2, 1, 2, 6)
  const desc = ws.getCell(2, 1)
  desc.value =
    data.projetoFinal.descricao ||
    "Projeto que integra as principais competências da vaga em um entregável de portfólio."
  desc.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } }
  desc.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
  ws.getRow(2).height = 30

  tableHeader(ws, 3, ["ID", "Área", "Tarefa", "Prioridade", "Status", "Competência"])
  data.projetoFinal.tarefas.forEach((t, i) => {
    const r = 4 + i
    const z = i % 2 === 1
    dataCell(ws, r, 1, i + 1, { align: "center", bold: true, zebra: z })
    dataCell(ws, r, 2, t.area, { zebra: z })
    dataCell(ws, r, 3, t.tarefa, { zebra: z })
    dataCell(ws, r, 4, t.prioridade, { align: "center", zebra: z })
    dataCell(ws, r, 5, "Backlog", { zebra: z })
    dataCell(ws, r, 6, t.competencia, { zebra: z })
    ws.getRow(r).height = 30
  })
}

function buildRotina(wb: ExcelJS.Workbook, data: StudyPlanData) {
  const ws = wb.addWorksheet("Rotina semanal")
  setWidths(ws, [14, 24, 12, 65])
  brandBand(ws, 4, "Rotina semanal sugerida")
  tableHeader(ws, 2, ["Dia", "Bloco", "Horas", "Atividade"])
  data.rotinaSemanal.forEach((d, i) => {
    const r = 3 + i
    const z = i % 2 === 1
    dataCell(ws, r, 1, d.dia, { bold: true, zebra: z })
    dataCell(ws, r, 2, d.bloco, { zebra: z })
    dataCell(ws, r, 3, d.horas, { align: "center", zebra: z })
    dataCell(ws, r, 4, d.atividade, { zebra: z })
    ws.getRow(r).height = 28
  })

  const somaHoras = data.rotinaSemanal.reduce((s, d) => s + d.horas, 0)
  const base = 3 + data.rotinaSemanal.length + 1
  sectionTitle(ws, base, 1, 2, "Resumo")
  const resumo: [string, number][] = [
    ["Horas semanais", Math.round(somaHoras * 10) / 10],
    ["Semanas", data.indicadores.semanas],
    ["Carga total (h)", data.indicadores.cargaTotalHoras],
  ]
  resumo.forEach(([label, value], i) => {
    const r = base + 1 + i
    labelCell(ws, r, 1, label)
    dataCell(ws, r, 2, value, { align: "center", bold: true })
  })
}

/**
 * Gera o buffer .xlsx do plano de estudos com as 5 abas e a marca MentoriasTech.
 */
export async function buildStudyPlanWorkbook(data: StudyPlanData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "MentoriasTech"
  wb.company = "MentoriasTech"
  wb.created = new Date()

  buildVisaoGeral(wb, data)
  buildPlanoSemanal(wb, data)
  buildRequisitos(wb, data)
  buildProjetoFinal(wb, data)
  buildRotina(wb, data)

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer as unknown as ArrayBuffer)
}
