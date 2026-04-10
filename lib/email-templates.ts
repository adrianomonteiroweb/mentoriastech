import { formatWhatsAppNumber } from "@/lib/whatsapp"

const BRAND_BG = "#0d1117"
const BRAND_PRIMARY = "#2dd4bf"
const BRAND_GREEN = "#ecfdf5"
const BRAND_GREEN_TEXT = "#065f46"

function baseLayout(title: string, subtitle: string, content: string) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafb; border-radius: 12px;">
      <div style="background: ${BRAND_BG}; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: ${BRAND_PRIMARY}; margin: 0 0 4px 0; font-size: 20px;">${title}</h2>
        <p style="color: #8b949e; margin: 0; font-size: 13px;">${subtitle}</p>
      </div>
      ${content}
    </div>
  `
}

function infoTable(rows: { label: string; value: string }[]) {
  const rowsHtml = rows
    .map(
      (row, i) => `
      <tr>
        <td style="padding: 16px 20px; ${i < rows.length - 1 ? "border-bottom: 1px solid #f0f0f0;" : ""} font-weight: 600; color: #374151; width: 140px; font-size: 14px;">${row.label}</td>
        <td style="padding: 16px 20px; ${i < rows.length - 1 ? "border-bottom: 1px solid #f0f0f0;" : ""} color: #1f2937; font-size: 14px;">${row.value}</td>
      </tr>
    `,
    )
    .join("")

  return `
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      ${rowsHtml}
    </table>
  `
}

function actionBox(text: string) {
  return `
    <div style="margin-top: 20px; padding: 16px 20px; background: ${BRAND_GREEN}; border-radius: 10px; border-left: 4px solid ${BRAND_PRIMARY};">
      <p style="margin: 0; color: ${BRAND_GREEN_TEXT}; font-size: 13px; line-height: 1.5;">${text}</p>
    </div>
  `
}

function typeBadge(type: string) {
  const labels: Record<string, string> = {
    free: "Gratuita",
    paid: "Paga",
    private: "Particular",
  }
  const colors: Record<string, { bg: string; text: string }> = {
    free: { bg: "#ecfdf5", text: "#065f46" },
    paid: { bg: "#eff6ff", text: "#1e40af" },
    private: { bg: "#fef3c7", text: "#92400e" },
  }
  const color = colors[type] || colors.free
  return `<span style="display: inline-block; background: ${color.bg}; color: ${color.text}; padding: 4px 12px; border-radius: 20px; font-size: 13px;">${labels[type] || type}</span>`
}

// ---------------------------------------------------------------------------
// Email para o MENTOR quando recebe nova solicitação
// ---------------------------------------------------------------------------

interface NewBookingToMentorParams {
  name: string
  email: string
  whatsapp: string
  topic: string
  day: string
  time: string
  bookingType: string
  notes?: string
}

export function newBookingToMentorEmail(params: NewBookingToMentorParams) {
  const now = new Date()
  const dateStr = now.toLocaleDateString("pt-BR")
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const typeLabel = params.bookingType === "free" ? "Gratuita" : params.bookingType === "paid" ? "Paga" : "Particular"

  const rows = [
    { label: "Nome", value: params.name },
    { label: "E-mail", value: `<a href="mailto:${params.email}" style="color: #0d9488; text-decoration: none;">${params.email}</a>` },
    { label: "WhatsApp", value: `<a href="https://wa.me/${formatWhatsAppNumber(params.whatsapp)}" style="color: #0d9488; text-decoration: none;">${params.whatsapp}</a>` },
    { label: "Tipo", value: typeBadge(params.bookingType) },
    { label: "Tema", value: `<span style="display: inline-block; background: ${BRAND_GREEN}; color: ${BRAND_GREEN_TEXT}; padding: 4px 12px; border-radius: 20px; font-size: 13px;">${params.topic}</span>` },
    { label: "Dia", value: params.day },
    { label: "Horário", value: params.time },
  ]

  if (params.notes) {
    rows.push({ label: "Observações", value: params.notes })
  }

  const subject = `Nova solicitação de mentoria ${typeLabel} - ${params.name} - ${params.topic}`

  const html = baseLayout(
    `Nova Solicitação de Mentoria ${typeLabel}`,
    `Recebida em ${dateStr} às ${timeStr}`,
    infoTable(rows) +
      actionBox(
        `<strong>Ação recomendada:</strong> Responda este email ou entre em contato pelo WhatsApp para confirmar o agendamento.`,
      ),
  )

  return { subject, html }
}

// ---------------------------------------------------------------------------
// Emails para o MENTORADO quando status do booking muda
// ---------------------------------------------------------------------------

interface StatusChangeParams {
  menteeName: string
  topicName: string
  sessionDate?: string
  startTime?: string
  bookingType: string
  googleEventId?: string | null
  mentorEmail?: string
}

function formatDateBR(dateStr?: string) {
  if (!dateStr) return "A definir"
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

function formatTimeBR(timeStr?: string) {
  if (!timeStr) return "A definir"
  return timeStr.substring(0, 5)
}

export function bookingConfirmedEmail(params: StatusChangeParams) {
  const subject = `Mentoria confirmada! - ${params.topicName}`

  const rows = [
    { label: "Tema", value: params.topicName },
    { label: "Tipo", value: typeBadge(params.bookingType) },
    { label: "Data", value: formatDateBR(params.sessionDate) },
    { label: "Horário", value: formatTimeBR(params.startTime) },
  ]

  const html = baseLayout(
    "Sua mentoria foi confirmada! ✓",
    `Olá, ${params.menteeName}!`,
    infoTable(rows) +
      actionBox(
        params.bookingType === "free"
          ? `<strong>Próximo passo:</strong> Aguarde o link da reunião que será enviado em breve.`
          : `<strong>Próximo passo:</strong> Aguarde as informações de pagamento que serão enviadas em breve.`,
      ),
  )

  return { subject, html }
}

export function bookingPaymentPendingEmail(params: StatusChangeParams & { pixKey?: string; pixName?: string; pixCity?: string }) {
  const subject = `Pagamento pendente - Mentoria: ${params.topicName}`

  const rows = [
    { label: "Tema", value: params.topicName },
    { label: "Data", value: formatDateBR(params.sessionDate) },
    { label: "Horário", value: formatTimeBR(params.startTime) },
  ]

  if (params.pixKey) {
    rows.push({ label: "Chave PIX", value: `<strong>${params.pixKey}</strong>` })
    if (params.pixName) rows.push({ label: "Titular", value: params.pixName })
  }

  const html = baseLayout(
    "Pagamento pendente",
    `Olá, ${params.menteeName}!`,
    `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Sua mentoria foi confirmada e está aguardando pagamento via PIX.
    </p>` +
      infoTable(rows) +
      actionBox(
        `<strong>Importante:</strong> Após realizar o pagamento, envie o comprovante por WhatsApp ou responda este email para confirmarmos.`,
      ),
  )

  return { subject, html }
}

export function bookingScheduledEmail(params: StatusChangeParams) {
  const subject = `Mentoria agendada! - ${params.topicName}`

  const rows = [
    { label: "Tema", value: params.topicName },
    { label: "Data", value: formatDateBR(params.sessionDate) },
    { label: "Horário", value: formatTimeBR(params.startTime) },
  ]

  const html = baseLayout(
    "Mentoria agendada! 📅",
    `Olá, ${params.menteeName}!`,
    `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Sua mentoria está confirmada e agendada. Você receberá um convite no Google Calendar com o link da reunião.
    </p>` +
      infoTable(rows) +
      actionBox(
        `<strong>Dica:</strong> Prepare suas dúvidas e materiais com antecedência para aproveitarmos ao máximo a sessão.`,
      ),
  )

  return { subject, html }
}

export function bookingCompletedEmail(params: StatusChangeParams) {
  const subject = `Mentoria concluída - ${params.topicName}`

  const html = baseLayout(
    "Mentoria concluída! 🎉",
    `Olá, ${params.menteeName}!`,
    `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Obrigado por participar da mentoria sobre <strong>${params.topicName}</strong>!
    </p>
    <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Espero que a sessão tenha sido útil. Se tiver mais dúvidas ou quiser agendar outra mentoria, acesse a plataforma.
    </p>` +
      actionBox(
        `<strong>Feedback:</strong> Sua opinião é importante! Responda este email com sugestões ou comentários sobre a sessão.`,
      ),
  )

  return { subject, html }
}

export function bookingCancelledEmail(params: StatusChangeParams) {
  const subject = `Mentoria cancelada - ${params.topicName}`

  const html = baseLayout(
    "Mentoria cancelada",
    `Olá, ${params.menteeName}!`,
    `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Infelizmente, a mentoria sobre <strong>${params.topicName}</strong>${params.sessionDate ? ` do dia ${formatDateBR(params.sessionDate)}` : ""} foi cancelada.
    </p>` +
      actionBox(
        `<strong>Quer reagendar?</strong> Acesse a plataforma e solicite uma nova mentoria. Estamos à disposição!`,
      ),
  )

  return { subject, html }
}
