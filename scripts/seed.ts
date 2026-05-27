import { config } from "dotenv"
config({ path: ".env.local" })
config()

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import {
  profiles,
  mentoringSlots,
  mentoringTopics,
  contentCategories,
  contentItems,
  jobs,
  siteSettings,
} from "../lib/db/schema"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const sql = neon(process.env.DATABASE_URL)
const db = drizzle({ client: sql })

async function main() {
  console.log("🌱 Seeding database...")

  // -----------------------------------------------------------------------------
  // 1. Admin user (Adriano Monteiro)
  // -----------------------------------------------------------------------------
  const [admin] = await db
    .insert(profiles)
    .values({
      email: "adrianomonteiroweb@gmail.com",
      fullName: "Adriano Monteiro",
      role: "admin",
    })
    .onConflictDoNothing({ target: profiles.email })
    .returning()
  console.log(`✓ Admin user: ${admin?.email || "already exists"}`)

  // -----------------------------------------------------------------------------
  // 2. Mentoring slots
  // -----------------------------------------------------------------------------
  await db.insert(mentoringSlots).values([
    { dayOfWeek: 1, startTime: "21:00:00", slotType: "free" },
    { dayOfWeek: 2, startTime: "21:00:00", slotType: "free" },
    { dayOfWeek: 3, startTime: "21:00:00", slotType: "free" },
    { dayOfWeek: 4, startTime: "21:00:00", slotType: "free" },
    { dayOfWeek: 5, startTime: "21:00:00", slotType: "free" },
    { dayOfWeek: 6, startTime: "10:00:00", slotType: "free" },
    { dayOfWeek: 6, startTime: "14:00:00", slotType: "free" },
    { dayOfWeek: 0, startTime: "10:00:00", slotType: "free" },
    { dayOfWeek: 0, startTime: "14:00:00", slotType: "free" },
  ])
  console.log("✓ 9 mentoring slots")

  // -----------------------------------------------------------------------------
  // 3. Mentoring topics
  // -----------------------------------------------------------------------------
  await db.insert(mentoringTopics).values([
    { name: "Programação para outras profissões", category: "free", sortOrder: 1 },
    { name: "Carreira em programação", category: "free", sortOrder: 2 },
    { name: "Preparação para entrevistas", category: "free", sortOrder: 3 },
    { name: "Busca de oportunidades", category: "free", sortOrder: 4 },
    { name: "Desenvolvimento Web", category: "free", sortOrder: 5 },
    { name: "Automações RPA", category: "free", sortOrder: 6 },
    { name: "Acompanhamento de processo seletivo", category: "paid", sortOrder: 7 },
    { name: "Projetos pessoais", category: "paid", sortOrder: 8 },
    { name: "Aulas de RPA", category: "paid", sortOrder: 9 },
    { name: "Aulas de Next.js", category: "paid", sortOrder: 10 },
  ])
  console.log("✓ 10 mentoring topics")

  // -----------------------------------------------------------------------------
  // 4. Content categories + items
  // -----------------------------------------------------------------------------
  const insertedCategories = await db
    .insert(contentCategories)
    .values([
      { name: "Carreira", slug: "carreira", description: "Dicas sobre carreira em tech", sortOrder: 1 },
      { name: "Programação", slug: "programacao", description: "Tutoriais e materiais", sortOrder: 2 },
      { name: "Entrevistas", slug: "entrevistas", description: "Preparação para processos seletivos", sortOrder: 3 },
    ])
    .returning()

  const catByslug = Object.fromEntries(insertedCategories.map((c) => [c.slug, c.id]))

  await db.insert(contentItems).values([
    {
      categoryId: catByslug.programacao,
      title: "Como iniciar na programação em 2025",
      description: "Guia completo para quem quer começar a programar do zero, com dicas de linguagens, recursos gratuitos e plano de estudos.",
      contentType: "article",
      isPublished: true,
    },
    {
      categoryId: catByslug.entrevistas,
      title: "Preparação para entrevistas técnicas",
      description: "Vídeo com as principais perguntas de entrevistas para desenvolvedores júnior.",
      contentType: "video",
      url: "https://youtube.com",
      isPublished: true,
    },
    {
      categoryId: catByslug.carreira,
      title: "Roadmap de carreira em tecnologia",
      description: "PDF com o mapa de carreira desde estágio até sênior, com habilidades esperadas em cada nível.",
      contentType: "pdf",
      isPublished: true,
    },
    {
      categoryId: catByslug.programacao,
      title: "Introdução ao Next.js com App Router",
      description: "Tutorial passo a passo para criar sua primeira aplicação com Next.js, React e TypeScript.",
      contentType: "video",
      url: "https://youtube.com",
      isPublished: true,
    },
    {
      categoryId: catByslug.carreira,
      title: "Como montar um portfólio que se destaca",
      description: "Dicas práticas para criar um portfólio de desenvolvedor que chama atenção dos recrutadores.",
      contentType: "article",
      isPublished: true,
    },
    {
      categoryId: catByslug.programacao,
      title: "Guia de automações com RPA",
      description: "Material em PDF sobre como automatizar processos repetitivos usando ferramentas de RPA.",
      contentType: "pdf",
      isPublished: true,
    },
  ])
  console.log("✓ 3 categories + 6 content items")

  // -----------------------------------------------------------------------------
  // 5. Jobs
  // -----------------------------------------------------------------------------
  if (admin) {
    await db.insert(jobs).values([
      {
        postedBy: admin.id,
        title: "Estagiário(a) de Desenvolvimento Web",
        company: "TechStart",
        description: "Vaga de estágio para estudantes de TI. Atuação em React e TypeScript.",
        location: "Fortaleza, CE",
        jobType: "hybrid",
        level: "internship",
        salaryRange: "R$ 1.200 - R$ 1.800",
        applicationUrl: "https://linkedin.com",
        status: "approved",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
      {
        postedBy: admin.id,
        title: "Desenvolvedor(a) Front-end Júnior",
        company: "DigitalFlow",
        description: "Buscamos dev júnior com conhecimento em React, Next.js e Tailwind. Trabalho 100% remoto.",
        jobType: "remote",
        level: "junior",
        salaryRange: "R$ 3.000 - R$ 4.500",
        applicationUrl: "https://linkedin.com",
        status: "approved",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
      {
        postedBy: admin.id,
        title: "Pessoa Desenvolvedora Full-Stack Pleno",
        company: "Inovare Solutions",
        description: "Node.js, React e PostgreSQL. Experiência com APIs REST, testes automatizados e CI/CD.",
        location: "São Paulo, SP",
        jobType: "remote",
        level: "mid",
        salaryRange: "R$ 8.000 - R$ 12.000",
        applicationUrl: "https://linkedin.com",
        status: "approved",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
      {
        postedBy: admin.id,
        title: "Dev Back-end Sênior (Node.js)",
        company: "ScaleTech",
        description: "Liderança técnica em arquitetura de microsserviços. Node.js, TypeScript, PostgreSQL, AWS.",
        jobType: "remote",
        level: "senior",
        salaryRange: "R$ 15.000 - R$ 22.000",
        applicationUrl: "https://linkedin.com",
        status: "approved",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
      {
        postedBy: admin.id,
        title: "Trainee de Automação RPA",
        company: "AutomateNow",
        description: "Programa de trainee focado em automação de processos com RPA. Treinamento completo.",
        location: "Fortaleza, CE",
        jobType: "onsite",
        level: "internship",
        salaryRange: "R$ 2.000 - R$ 2.800",
        applicationUrl: "https://linkedin.com",
        status: "approved",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
      {
        postedBy: admin.id,
        title: "Desenvolvedor(a) React Native Júnior",
        company: "AppMasters",
        description: "Desenvolvimento de apps mobile com React Native e Expo. Mentoria contínua.",
        jobType: "remote",
        level: "junior",
        salaryRange: "R$ 3.500 - R$ 5.000",
        applicationUrl: "https://linkedin.com",
        status: "approved",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
    ])
    console.log("✓ 6 approved jobs")
  }

  // -----------------------------------------------------------------------------
  // 6. Site settings
  // -----------------------------------------------------------------------------
  await db.insert(siteSettings).values({
    key: "pix_config",
    value: { key: "", name: "Adriano Monteiro", city: "Fortaleza", type: "email" },
  })
  console.log("✓ Site settings")

  console.log("\n✅ Seed completo!")
  console.log("\n👤 Login admin:")
  console.log("   Email: adrianomonteiroweb@gmail.com")
  console.log("   Senha: definida no Supabase Auth")
}

main().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
