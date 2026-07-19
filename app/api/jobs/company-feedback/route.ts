import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import nodemailer from "nodemailer"
import { z } from "zod"
import { getSession } from "@/lib/utils/auth"
import { db, companyFeedbacks, profiles } from "@/lib/db"
import { companyFeedbackNotificationEmail } from "@/lib/email-templates"

const feedbackSchema = z.object({
  company: z.string().min(1).max(200),
  category: z.enum(["salario_baixo", "processo_longo", "nao_confiavel", "processos_inexistentes", "outro"]),
  comment: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = feedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const { company, category, comment } = parsed.data

    await db.insert(companyFeedbacks).values({
      company,
      category,
      comment: comment || null,
      profileId: session.id,
    })

    try {
      const smtpHost = process.env.SMTP_HOST
      const smtpPort = Number(process.env.SMTP_PORT || "587")
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS

      if (smtpHost && smtpUser && smtpPass) {
        const admins = await db
          .select({ email: profiles.email, fullName: profiles.fullName })
          .from(profiles)
          .where(eq(profiles.role, "admin"))

        if (admins.length > 0) {
          const origin = request.headers.get("origin") || request.headers.get("x-forwarded-host") || ""
          const adminUrl = origin ? `${origin}/admin/jobs` : "/admin/jobs"

          const [userProfile] = await db
            .select({ fullName: profiles.fullName })
            .from(profiles)
            .where(eq(profiles.id, session.id))
            .limit(1)

          const { subject, html } = companyFeedbackNotificationEmail({
            company,
            category,
            comment,
            userName: userProfile?.fullName,
            userEmail: session.email,
            adminUrl,
          })

          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false },
          })

          const adminEmails = admins.map((a) => a.email).filter(Boolean)

          if (adminEmails.length > 0) {
            await transporter.sendMail({
              from: `"MentoriasTech" <${smtpUser}>`,
              to: adminEmails.join(", "),
              subject,
              html,
            })
          }
        }
      }
    } catch (emailError) {
      console.error("[company-feedback] Email notification error (non-blocking):", emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[company-feedback] Error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
