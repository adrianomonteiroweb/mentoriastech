import { NextResponse } from "next/server"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const TO_EMAIL = "adrianomonteiroweb@gmail.com"

export async function POST(request: Request) {
  try {
    const { name, email, whatsapp, date, time } = await request.json()

    if (!name || !email || !whatsapp || !date || !time) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      )
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set")
      return NextResponse.json(
        { error: "Configuração de email ausente. Contate o administrador." },
        { status: 500 }
      )
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2dd4bf; border-bottom: 2px solid #2dd4bf; padding-bottom: 10px;">
          Nova Solicitação de Agendamento
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Nome</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">E-mail</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <a href="mailto:${email}" style="color: #2dd4bf;">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">WhatsApp</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <a href="https://wa.me/${whatsapp.replace(/\D/g, "")}" style="color: #2dd4bf;">${whatsapp}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Data</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; color: #555;">Horário</td>
            <td style="padding: 12px;">${time}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; color: #166534;">
          Responda este email ou entre em contato pelo WhatsApp para confirmar.
        </p>
      </div>
    `

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Agendamento <onboarding@resend.dev>",
        to: [TO_EMAIL],
        subject: `Nova solicitação de agendamento - ${name}`,
        html: htmlContent,
        reply_to: email,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Resend API error:", errorData)
      return NextResponse.json(
        { error: "Falha ao enviar email. Tente novamente." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Booking API error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
