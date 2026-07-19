import { escapeHtml } from "@/lib/escape-html"
import { formatWhatsAppNumber } from "@/lib/whatsapp"
import { getTimezoneDisplay } from "@/lib/timezone"

const BRAND_BG = "#0d1117"
const BRAND_PRIMARY = "#3B82F6"
const BRAND_GREEN = "#eff6ff"
const BRAND_GREEN_TEXT = "#1e40af"

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
  whatsapp?: string
  topic: string
  day: string
  time: string
  bookingType: string
  notes?: string
  sessionDate?: string
}

export function newBookingToMentorEmail(params: NewBookingToMentorParams) {
  const now = new Date()
  const dateStr = now.toLocaleDateString("pt-BR")
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const typeLabel = params.bookingType === "free" ? "Gratuita" : params.bookingType === "paid" ? "Paga" : "Particular"

  const safeName = escapeHtml(params.name)
  const safeEmail = escapeHtml(params.email)
  const safeWhatsapp = escapeHtml(params.whatsapp || "Nao informado")
  const safeTopic = escapeHtml(params.topic)
  const safeDay = escapeHtml(params.day)
  const safeTime = escapeHtml(params.time)

  const rows = [
    { label: "Nome", value: safeName },
    { label: "E-mail", value: `<a href="mailto:${safeEmail}" style="color: #0d9488; text-decoration: none;">${safeEmail}</a>` },
    {
      label: "WhatsApp",
      value: params.whatsapp
        ? `<a href="https://wa.me/${formatWhatsAppNumber(params.whatsapp)}" style="color: #0d9488; text-decoration: none;">${safeWhatsapp}</a>`
        : safeWhatsapp,
    },
    { label: "Tipo", value: typeBadge(params.bookingType) },
    { label: "Tema", value: `<span style="display: inline-block; background: ${BRAND_GREEN}; color: ${BRAND_GREEN_TEXT}; padding: 4px 12px; border-radius: 20px; font-size: 13px;">${safeTopic}</span>` },
    { label: "Dia", value: safeDay },
    { label: "Horário", value: escapeHtml(formatTimeWithTimezone(params.sessionDate, params.time, params.whatsapp)) },
  ]

  if (params.notes) {
    rows.push({ label: "Observações", value: escapeHtml(params.notes) })
  }

  const tzInfo = params.whatsapp ? getTimezoneDisplay(params.whatsapp, params.sessionDate, params.time) : null
  if (tzInfo) {
    rows.push({ label: "Fuso do mentorado", value: escapeHtml(tzInfo.countryName) })
  }

  const subject = `Nova solicitação de mentoria ${typeLabel} - ${safeName} - ${safeTopic}`

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

interface PaidMentorshipToMentorParams {
  name: string
  email: string
  whatsapp?: string
  mentorshipTitle: string
  sessionDate: string
  startTime: string
  amountFormatted: string
  notes?: string
}

export function paidMentorshipRequestToMentorEmail(params: PaidMentorshipToMentorParams) {
  const safeName = escapeHtml(params.name)
  const safeEmail = escapeHtml(params.email)
  const safeWhatsapp = escapeHtml(params.whatsapp || "Nao informado")
  const safeTitle = escapeHtml(params.mentorshipTitle)

  const rows = [
    { label: "Nome", value: safeName },
    { label: "E-mail", value: `<a href="mailto:${safeEmail}" style="color: #0d9488; text-decoration: none;">${safeEmail}</a>` },
    {
      label: "WhatsApp",
      value: params.whatsapp
        ? `<a href="https://wa.me/${formatWhatsAppNumber(params.whatsapp)}" style="color: #0d9488; text-decoration: none;">${safeWhatsapp}</a>`
        : safeWhatsapp,
    },
    { label: "Mentoria", value: safeTitle },
    { label: "Valor", value: escapeHtml(params.amountFormatted) },
    { label: "Data", value: formatDateBR(params.sessionDate) },
    { label: "Horario", value: formatTimeBR(params.startTime) },
  ]

  if (params.notes) {
    rows.push({ label: "Observacoes", value: escapeHtml(params.notes) })
  }

  return {
    subject: `Solicitacao de mentoria paga - ${safeTitle} - ${safeName}`,
    html: baseLayout(
      "Nova solicitacao de mentoria paga",
      "Aguardando confirmacao do Pix pela Stripe",
      infoTable(rows) +
        actionBox(
          "<strong>Status:</strong> o horario foi reservado como pagamento pendente. A mentoria so deve ser considerada confirmada quando a Stripe confirmar o Pix.",
        ),
    ),
  }
}

export function paidMentorshipPaidToMentorEmail(params: PaidMentorshipToMentorParams) {
  const safeName = escapeHtml(params.name)
  const safeTitle = escapeHtml(params.mentorshipTitle)

  const rows = [
    { label: "Mentorado", value: safeName },
    { label: "Mentoria", value: safeTitle },
    { label: "Valor", value: escapeHtml(params.amountFormatted) },
    { label: "Data", value: formatDateBR(params.sessionDate) },
    { label: "Horario", value: formatTimeBR(params.startTime) },
  ]

  return {
    subject: `Pix confirmado - ${safeTitle} - ${safeName}`,
    html: baseLayout(
      "Pagamento Pix confirmado",
      "A mentoria paga agora pode ser agendada",
      infoTable(rows) +
        actionBox(
          "<strong>Proximo passo:</strong> acesse o admin para agendar a mentoria e criar o evento na agenda.",
        ),
    ),
  }
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
  googleMeetUrl?: string | null
  mentorEmail?: string
  guestWhatsapp?: string | null
}

function meetRow(url?: string | null) {
  if (!url) return null
  const safeUrl = escapeHtml(url)
  return {
    label: "Google Meet",
    value: `<a href="${safeUrl}" style="color: #0d9488; text-decoration: none;">Entrar na reuniao</a>`,
  }
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

function formatTimeWithTimezone(
  sessionDate?: string,
  startTime?: string,
  guestWhatsapp?: string | null,
): string {
  if (!startTime) return "A definir"
  const brTime = startTime.substring(0, 5)
  if (!guestWhatsapp) return brTime

  const tz = getTimezoneDisplay(guestWhatsapp, sessionDate, startTime)
  if (!tz) return brTime
  return tz.label
}

function timezoneNote(guestWhatsapp?: string | null, sessionDate?: string, startTime?: string): string {
  if (!guestWhatsapp) return ""
  const tz = getTimezoneDisplay(guestWhatsapp, sessionDate, startTime)
  if (!tz) return ""
  return `
    <div style="margin-top: 12px; padding: 10px 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.5;">
        🌍 <strong>Fuso horário:</strong> ${tz.localTime && tz.localTime !== startTime?.substring(0, 5) ? `No seu horário (${escapeHtml(tz.countryName)}), a sessão será às <strong>${tz.localTime}</strong>.` : `Os horários são informados no horário de Brasília (Brasil).`}
      </p>
    </div>
  `
}

export function bookingConfirmedEmail(params: StatusChangeParams) {
  const safeName = escapeHtml(params.menteeName)
  const safeTopic = escapeHtml(params.topicName)

  const subject = `Mentoria confirmada! - ${safeTopic}`

  const rows = [
    { label: "Tema", value: safeTopic },
    { label: "Tipo", value: typeBadge(params.bookingType) },
    { label: "Data", value: formatDateBR(params.sessionDate) },
    { label: "Horário", value: escapeHtml(formatTimeWithTimezone(params.sessionDate, params.startTime, params.guestWhatsapp)) },
  ]

  const confirmedMeetRow = meetRow(params.googleMeetUrl)
  if (confirmedMeetRow) rows.push(confirmedMeetRow)

  const html = baseLayout(
    "Sua mentoria foi confirmada! ✓",
    `Olá, ${safeName}!`,
    infoTable(rows) +
      timezoneNote(params.guestWhatsapp, params.sessionDate, params.startTime) +
      actionBox(
        params.bookingType === "free"
          ? `<strong>Próximo passo:</strong> Aguarde o link da reunião que será enviado em breve.`
          : `<strong>Próximo passo:</strong> Aguarde a confirmação do agendamento e os detalhes da sessão.`,
      ),
  )

  return { subject, html }
}

export function bookingPaymentPendingEmail(params: StatusChangeParams) {
  const safeName = escapeHtml(params.menteeName)
  const safeTopic = escapeHtml(params.topicName)

  const subject = `Pagamento pendente - Mentoria: ${safeTopic}`

  const rows = [
    { label: "Tema", value: safeTopic },
    { label: "Data", value: formatDateBR(params.sessionDate) },
    { label: "Horário", value: escapeHtml(formatTimeWithTimezone(params.sessionDate, params.startTime, params.guestWhatsapp)) },
  ]

  const html = baseLayout(
    "Pagamento pendente",
    `Olá, ${safeName}!`,
    `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Sua mentoria foi confirmada e está aguardando pagamento.
    </p>` +
      infoTable(rows) +
      timezoneNote(params.guestWhatsapp, params.sessionDate, params.startTime) +
      actionBox(
        `<strong>Importante:</strong> Após realizar o pagamento, envie o comprovante por WhatsApp ou responda este email para confirmarmos.`,
      ),
  )

  return { subject, html }
}

export function bookingScheduledEmail(params: StatusChangeParams) {
  const safeName = escapeHtml(params.menteeName)
  const safeTopic = escapeHtml(params.topicName)

  const subject = `Mentoria agendada! - ${safeTopic}`

  const rows = [
    { label: "Tema", value: safeTopic },
    { label: "Data", value: formatDateBR(params.sessionDate) },
    { label: "Horário", value: escapeHtml(formatTimeWithTimezone(params.sessionDate, params.startTime, params.guestWhatsapp)) },
  ]

  const scheduledMeetRow = meetRow(params.googleMeetUrl)
  if (scheduledMeetRow) rows.push(scheduledMeetRow)

  const html = baseLayout(
    "Mentoria agendada! 📅",
    `Olá, ${safeName}!`,
    `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Sua mentoria está confirmada e agendada. Você receberá um convite no Google Calendar com o link da reunião.
    </p>` +
      infoTable(rows) +
      timezoneNote(params.guestWhatsapp, params.sessionDate, params.startTime) +
      actionBox(
        `<strong>Dica:</strong> Prepare suas dúvidas e materiais com antecedência para aproveitarmos ao máximo a sessão.`,
      ),
  )

  return { subject, html }
}

export function bookingCompletedEmail(params: StatusChangeParams) {
  const safeName = escapeHtml(params.menteeName)
  const safeTopic = escapeHtml(params.topicName)

  const subject = `Mentoria concluída - ${safeTopic}`

  const html = baseLayout(
    "Mentoria concluída! 🎉",
    `Olá, ${safeName}!`,
    `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Obrigado por participar da mentoria sobre <strong>${safeTopic}</strong>!
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
  const safeName = escapeHtml(params.menteeName)
  const safeTopic = escapeHtml(params.topicName)

  const subject = `Mentoria cancelada - ${safeTopic}`

  const html = baseLayout(
    "Mentoria cancelada",
    `Olá, ${safeName}!`,
    `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
      Infelizmente, a mentoria sobre <strong>${safeTopic}</strong>${params.sessionDate ? ` do dia ${formatDateBR(params.sessionDate)}` : ""} foi cancelada.
    </p>` +
      actionBox(
        `<strong>Quer reagendar?</strong> Acesse a plataforma e solicite uma nova mentoria. Estamos à disposição!`,
      ),
  )

  return { subject, html }
}

// ---------------------------------------------------------------------------
// Email com código de acesso para Minhas Mentorias
// ---------------------------------------------------------------------------

interface AccessCodeParams {
  code: string
  minutesValid: number
}

export function accessCodeEmail(params: AccessCodeParams) {
  const subject = `Seu código de acesso - Minhas Mentorias`

  const codeBlock = `
    <div style="margin: 0 auto 20px; padding: 24px; background: #ffffff; border: 2px dashed ${BRAND_PRIMARY}; border-radius: 10px; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Seu código de acesso</p>
      <p style="margin: 0; color: ${BRAND_BG}; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${params.code}</p>
    </div>
  `

  const html = baseLayout(
    "Código de acesso",
    "Use o código abaixo para acessar suas mentorias",
    codeBlock +
      `<p style="color: #374151; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
        Digite este código de 6 dígitos na página para visualizar o histórico de anotações das suas mentorias.
      </p>` +
      actionBox(
        `<strong>Importante:</strong> Este código é válido por ${params.minutesValid} minutos. Não compartilhe com ninguém. Caso você não tenha solicitado, pode ignorar este email.`,
      ),
  )

  return { subject, html }
}

// ---------------------------------------------------------------------------
// Notificação para o ADMIN quando recebe feedback de empresa
// ---------------------------------------------------------------------------

const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  salario_baixo: "Salário baixo",
  processo_longo: "Processo seletivo longo",
  nao_confiavel: "Não confiável",
  processos_inexistentes: "Processos inexistentes",
  outro: "Outro",
}

interface CompanyFeedbackNotificationParams {
  company: string
  category: string
  comment?: string | null
  userName?: string | null
  userEmail?: string | null
  adminUrl: string
}

export function companyFeedbackNotificationEmail(params: CompanyFeedbackNotificationParams) {
  const safeCompany = escapeHtml(params.company)
  const categoryLabel = FEEDBACK_CATEGORY_LABELS[params.category] || params.category

  const subject = `Novo feedback de empresa - ${safeCompany}`

  const rows = [
    { label: "Empresa", value: `<strong>${safeCompany}</strong>` },
    { label: "Categoria", value: escapeHtml(categoryLabel) },
    { label: "Enviado por", value: escapeHtml(params.userName || params.userEmail || "Anônimo") },
  ]

  if (params.comment) {
    rows.push({ label: "Comentário", value: escapeHtml(params.comment) })
  }

  const html = baseLayout(
    "Novo feedback de empresa",
    "Um usuário reportou uma empresa no painel de vagas",
    infoTable(rows) +
      actionBox(
        `<strong>Ação recomendada:</strong> Acesse o <a href="${escapeHtml(params.adminUrl)}" style="color: #1e40af; text-decoration: underline;">painel administrativo</a> para analisar o feedback e decidir se as vagas da empresa devem ser removidas.`,
      ),
  )

  return { subject, html }
}
