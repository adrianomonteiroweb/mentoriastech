import { RRule, Weekday } from "rrule"

const WEEKDAY_MAP: Record<number, Weekday> = {
  0: RRule.SU,
  1: RRule.MO,
  2: RRule.TU,
  3: RRule.WE,
  4: RRule.TH,
  5: RRule.FR,
  6: RRule.SA,
}

const WEEKDAY_ABBR: Record<number, string> = {
  0: "SU",
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
}

/**
 * Gera uma string RRule a partir de dias da semana selecionados.
 * Ex: daysOfWeek [1, 3, 5] → "FREQ=WEEKLY;BYDAY=MO,WE,FR"
 */
export function buildRRule(daysOfWeek: number[]): string {
  const byDay = daysOfWeek.map((d) => WEEKDAY_ABBR[d]).join(",")
  return `FREQ=WEEKLY;BYDAY=${byDay}`
}

/**
 * Expande um RRule em datas concretas dentro de um range.
 * Retorna array de strings "YYYY-MM-DD".
 */
export function expandRRuleDates(
  rruleStr: string,
  recurrenceStart: string,
  recurrenceEnd: string | null,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  try {
    // Parse the RRULE string
    const dtstart = new Date(recurrenceStart + "T00:00:00Z")

    // Build full RRULE with DTSTART
    const fullRRule = `DTSTART:${formatRRuleDate(dtstart)}\nRRULE:${rruleStr}`

    let rule: RRule
    if (recurrenceEnd) {
      const until = new Date(recurrenceEnd + "T23:59:59Z")
      rule = RRule.fromString(fullRRule)
      // Override with UNTIL
      rule = new RRule({
        ...rule.origOptions,
        until,
      })
    } else {
      rule = RRule.fromString(fullRRule)
    }

    // Get dates within range
    const dates = rule.between(rangeStart, rangeEnd, true)

    return dates.map((d) => {
      const year = d.getUTCFullYear()
      const month = String(d.getUTCMonth() + 1).padStart(2, "0")
      const day = String(d.getUTCDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    })
  } catch (error) {
    console.error("[rrule-utils] Error expanding RRule:", rruleStr, error)
    return []
  }
}

function formatRRuleDate(d: Date): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${year}${month}${day}T000000Z`
}

/**
 * Descreve um RRule em texto legível pt-BR.
 * Ex: "FREQ=WEEKLY;BYDAY=MO,WE" → "Seg, Qua (semanal)"
 */
export function describeRRule(rruleStr: string): string {
  const DAY_LABELS: Record<string, string> = {
    MO: "Seg",
    TU: "Ter",
    WE: "Qua",
    TH: "Qui",
    FR: "Sex",
    SA: "Sáb",
    SU: "Dom",
  }

  const byDayMatch = rruleStr.match(/BYDAY=([A-Z,]+)/)
  if (byDayMatch) {
    const days = byDayMatch[1].split(",").map((d) => DAY_LABELS[d] || d).join(", ")
    return `${days} (semanal)`
  }

  return rruleStr
}
