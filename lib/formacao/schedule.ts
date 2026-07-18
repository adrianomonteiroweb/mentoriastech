/**
 * Agenda da Órbita: encontros sempre aos domingos, 10h, America/Fortaleza.
 *
 * Fortaleza (Ceará) não observa horário de verão — o offset é sempre -03:00.
 * Por isso conseguimos construir o instante UTC corretamente apenas anexando
 * o offset fixo à data local, sem depender de bibliotecas de fuso.
 */

const FORTALEZA_OFFSET = "-03:00"
export const FORTALEZA_TZ = "America/Fortaleza"

/**
 * Gera os próximos `quantidade` domingos às 10h (Fortaleza) a partir de
 * `dataInicio` (string 'YYYY-MM-DD'). Se `dataInicio` já for domingo, ele é o
 * primeiro encontro; caso contrário, começa no primeiro domingo seguinte.
 * Retorna instantes UTC (Date) prontos para gravar em timestamptz.
 */
export function gerarDomingos(dataInicio: string, quantidade: number): Date[] {
  const [ano, mes, dia] = dataInicio.split("-").map(Number)
  if (!ano || !mes || !dia) {
    throw new Error("dataInicio inválida (esperado 'YYYY-MM-DD')")
  }

  // Meio-dia UTC evita qualquer drift de fuso no cálculo do dia da semana.
  const cursor = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))
  while (cursor.getUTCDay() !== 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  const encontros: Date[] = []
  for (let i = 0; i < quantidade; i++) {
    const yy = cursor.getUTCFullYear()
    const mm = String(cursor.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(cursor.getUTCDate()).padStart(2, "0")
    encontros.push(new Date(`${yy}-${mm}-${dd}T10:00:00${FORTALEZA_OFFSET}`))
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  return encontros
}

const FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FORTALEZA_TZ,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

/** Formata um instante para o horário de Fortaleza (ex.: "dom., 19/07/2026, 10:00"). */
export function formatarFortaleza(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return FORMATTER.format(d)
}
