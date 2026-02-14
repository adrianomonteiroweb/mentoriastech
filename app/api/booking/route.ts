import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

const TO_EMAIL = "adrianomonteiroweb@gmail.com"

export async function POST(request: Request) {
  try {
    const { name, email, whatsapp, day, time, topic } = await request.json()

    if (!name || !email || !whatsapp || !day || !time || !topic) {
      return NextResponse.json(
        { error: "Todos os campos sao obrigatorios" },
        { status: 400 }
      )
    }

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT || "587")
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    console.log("[v0] SMTP config check:", {
      hasHost: !!smtpHost,
      hostValue: smtpHost ? smtpHost.substring(0, 10) + "..." : "MISSING",
      port: smtpPort,
      hasUser: !!smtpUser,
      userValue: smtpUser ? smtpUser.substring(0, 5) + "..." : "MISSING",
      hasPass: !!smtpPass,
      passLength: smtpPass ? smtpPass.length : 0,
    })

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error("[v0] Missing SMTP env vars:", {
        SMTP_HOST: smtpHost || "NOT SET",
        SMTP_USER: smtpUser || "NOT SET",
        SMTP_PASS: smtpPass ? "SET (length: " + smtpPass.length + ")" : "NOT SET",
      })
      return NextResponse.json(
        { error: "Configuracao de email ausente. Contate o administrador." },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    console.log("[v0] Verifying SMTP connection...")
    await transporter.verify()
    console.log("[v0] SMTP connection verified successfully")

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafb; border-radius: 12px;">
        <div style="background: #0d1117; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: #2dd4bf; margin: 0 0 4px 0; font-size: 20px;">
            Nova Solicitacao de Mentoria Gratuita
          </h2>
          <p style="color: #8b949e; margin: 0; font-size: 13px;">
            Recebida em ${new Date().toLocaleDateString("pt-BR")} as ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151; width: 120px; font-size: 14px;">Nome</td>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; color: #1f2937; font-size: 14px;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151; font-size: 14px;">E-mail</td>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">
              <a href="mailto:${email}" style="color: #0d9488; text-decoration: none;">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151; font-size: 14px;">WhatsApp</td>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">
              <a href="https://wa.me/${whatsapp.replace(/\D/g, "")}" style="color: #0d9488; text-decoration: none;">${whatsapp}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151; font-size: 14px;">Tema</td>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; color: #1f2937; font-size: 14px;">
              <span style="display: inline-block; background: #ecfdf5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 13px;">${topic}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151; font-size: 14px;">Dia</td>
            <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; color: #1f2937; font-size: 14px;">${day}</td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; font-weight: 600; color: #374151; font-size: 14px;">Horario</td>
            <td style="padding: 16px 20px; color: #1f2937; font-size: 14px;">${time}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 16px 20px; background: #ecfdf5; border-radius: 10px; border-left: 4px solid #2dd4bf;">
          <p style="margin: 0; color: #065f46; font-size: 13px; line-height: 1.5;">
            <strong>Acao recomendada:</strong> Responda este email ou entre em contato pelo WhatsApp para confirmar o agendamento.
          </p>
        </div>
      </div>
    `

    console.log("[v0] Sending email...")
    await transporter.sendMail({
      from: `"Mentoria - Adriano Monteiro" <${smtpUser}>`,
      to: TO_EMAIL,
      subject: `Nova solicitacao de mentoria - ${name} - ${topic}`,
      html: htmlContent,
      replyTo: email,
    })

    console.log("[v0] Email sent successfully!")
    return NextResponse.json({ success: true })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error("[v0] Booking API error:", err.message)
    console.error("[v0] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)))

    let userMessage = "Falha ao enviar email. Tente novamente."
    if (err.message.includes("Invalid login") || err.message.includes("auth")) {
      userMessage = "Erro de autenticacao SMTP. Contate o administrador."
    } else if (err.message.includes("ECONNREFUSED") || err.message.includes("ETIMEDOUT")) {
      userMessage = "Servidor de email indisponivel. Tente novamente mais tarde."
    }

    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    )
  }
}
