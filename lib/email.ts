import nodemailer from "nodemailer"

let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || "587")
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  })

  return cachedTransporter
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  replyTo?: string
  fromName?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  fromName = "Mentoria - Adriano Monteiro",
}: SendEmailParams): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn("[email] SMTP not configured; email skipped to:", to)
    return false
  }

  const fromAddress = process.env.SMTP_USER
  if (!fromAddress) return false

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html,
      replyTo,
    })
    return true
  } catch (error) {
    console.error("[email] Send error:", error)
    return false
  }
}
