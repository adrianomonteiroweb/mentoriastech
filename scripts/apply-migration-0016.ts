/**
 * Aplica a migracao 0016 (Painel de Oportunidades) diretamente no banco,
 * contornando o drizzle-kit migrate que nao consegue lidar com as migracoes
 * manuais 0005-0015.
 *
 * Uso: npx tsx scripts/apply-migration-0016.ts
 */
import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

config({ path: ".env.local" })
config()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL nao definida")
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function run(label: string, query: string) {
  try {
    await sql.query(query)
    console.log(`  OK: ${label}`)
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("already exists")) {
      console.log(`  SKIP (ja existe): ${label}`)
    } else {
      console.error(`  ERRO: ${label}`)
      console.error(`    ${msg}`)
      process.exit(1)
    }
  }
}

async function main() {
  console.log("Aplicando migracao 0016 (Painel de Oportunidades)...\n")

  // 1. Tabelas
  await run("CREATE companies", `
    CREATE TABLE IF NOT EXISTS "companies" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "profile_id" uuid NOT NULL,
      "name" text NOT NULL,
      "linkedin_url" text,
      "website" text,
      "industry" text,
      "notes" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `)

  await run("CREATE opportunity_resumes", `
    CREATE TABLE IF NOT EXISTS "opportunity_resumes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "profile_id" uuid NOT NULL,
      "label" text NOT NULL,
      "file_url" text NOT NULL,
      "file_size_bytes" integer,
      "is_default" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `)

  await run("CREATE opportunities", `
    CREATE TABLE IF NOT EXISTS "opportunities" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "profile_id" uuid NOT NULL,
      "company_id" uuid NOT NULL,
      "title" text,
      "url" text,
      "description" text,
      "category" text,
      "city" text,
      "state" text,
      "status" text DEFAULT 'evaluating' NOT NULL,
      "finalization_type" text,
      "priority" text DEFAULT 'medium' NOT NULL,
      "work_model" text,
      "job_level" text,
      "salary_range" text,
      "contact_name" text,
      "contact_role" text,
      "contact_linkedin" text,
      "interview_type" text,
      "resume_id" uuid,
      "checklist" jsonb,
      "application_date" timestamp with time zone,
      "next_follow_up_at" timestamp with time zone,
      "next_interview_at" timestamp with time zone,
      "metadata" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `)

  await run("CREATE opportunity_events", `
    CREATE TABLE IF NOT EXISTS "opportunity_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "opportunity_id" uuid NOT NULL,
      "event_type" text NOT NULL,
      "title" text,
      "body" text,
      "from_status" text,
      "to_status" text,
      "scheduled_at" timestamp with time zone,
      "is_completed" boolean DEFAULT false NOT NULL,
      "completed_at" timestamp with time zone,
      "author_id" uuid,
      "metadata" jsonb,
      "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `)

  await run("CREATE message_templates", `
    CREATE TABLE IF NOT EXISTS "message_templates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "category" text NOT NULL,
      "title" text NOT NULL,
      "body" text NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_by" uuid,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `)

  // 2. Foreign keys (idempotent)
  const fks = [
    { name: "companies_profile_id_profiles_id_fk", table: "companies", col: "profile_id", ref: "profiles", refCol: "id", onDelete: "cascade" },
    { name: "opportunity_resumes_profile_id_profiles_id_fk", table: "opportunity_resumes", col: "profile_id", ref: "profiles", refCol: "id", onDelete: "cascade" },
    { name: "opportunities_profile_id_profiles_id_fk", table: "opportunities", col: "profile_id", ref: "profiles", refCol: "id", onDelete: "cascade" },
    { name: "opportunities_company_id_companies_id_fk", table: "opportunities", col: "company_id", ref: "companies", refCol: "id", onDelete: "cascade" },
    { name: "opportunities_resume_id_opportunity_resumes_id_fk", table: "opportunities", col: "resume_id", ref: "opportunity_resumes", refCol: "id", onDelete: "set null" },
    { name: "opportunity_events_opportunity_id_opportunities_id_fk", table: "opportunity_events", col: "opportunity_id", ref: "opportunities", refCol: "id", onDelete: "cascade" },
    { name: "opportunity_events_author_id_profiles_id_fk", table: "opportunity_events", col: "author_id", ref: "profiles", refCol: "id", onDelete: "set null" },
    { name: "message_templates_created_by_profiles_id_fk", table: "message_templates", col: "created_by", ref: "profiles", refCol: "id", onDelete: "set null" },
  ]

  for (const fk of fks) {
    await run(`FK ${fk.name}`, `
      DO $$ BEGIN
        ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.name}"
          FOREIGN KEY ("${fk.col}") REFERENCES "public"."${fk.ref}"("${fk.refCol}")
          ON DELETE ${fk.onDelete} ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
  }

  // 3. Indexes
  await run("INDEX idx_opportunities_profile_status",
    `CREATE INDEX IF NOT EXISTS "idx_opportunities_profile_status" ON "opportunities" ("profile_id", "status")`)

  await run("INDEX idx_opportunity_events_opportunity",
    `CREATE INDEX IF NOT EXISTS "idx_opportunity_events_opportunity" ON "opportunity_events" ("opportunity_id", "occurred_at" DESC)`)

  // 4. Seed message templates (only if table is empty)
  const existing = await sql.query(`SELECT count(*)::int AS c FROM "message_templates"`)
  if (existing[0]?.c === 0) {
    await run("SEED message_templates", `
      INSERT INTO "message_templates" ("category", "title", "body", "sort_order") VALUES
      ('connect_recruiter', 'Conectar com recrutador', 'Ola, {{contato}}. Tudo bem?

Vi a oportunidade de {{vaga}} na {{empresa}} e realizei minha candidatura.

Tenho experiencia em {{area}} e acredito que posso contribuir com o time.

Fico a disposicao para conversar melhor sobre a oportunidade.

Obrigado!', 1),
      ('connect_employee', 'Conectar com pessoa da empresa', 'Ola, {{contato}}. Tudo bem?

Vi que voce trabalha na {{empresa}} e achei muito interessante o trabalho de voces.

Estou acompanhando algumas oportunidades na area de tecnologia e gostaria de me conectar.', 2),
      ('send_resume', 'Enviar curriculo', 'Ola, {{contato}}.

Segue meu curriculo para a vaga de {{vaga}} na {{empresa}}.

Destaco minha experiencia em {{area}}, que acredito ser relevante para a posicao.

Fico a disposicao para qualquer duvida.

Obrigado!', 3),
      ('reply_recruiter', 'Responder recrutador', 'Ola, {{contato}}. Obrigado pelo contato!

Tenho muito interesse na oportunidade de {{vaga}} na {{empresa}}.

Estou disponivel para conversar nos proximos dias.

Qual seria o melhor horario para voce?', 4),
      ('thank_interview', 'Agradecer entrevista', 'Ola, {{contato}}.

Obrigado pela oportunidade de conversar sobre a vaga de {{vaga}} na {{empresa}}.

Foi muito bom conhecer mais sobre o time e os desafios da posicao.

Fico no aguardo dos proximos passos.

Obrigado!', 5),
      ('follow_up', 'Follow-up', 'Ola, {{contato}}. Tudo bem?

Estou entrando em contato para saber se ha novidades sobre o processo seletivo para a vaga de {{vaga}} na {{empresa}}.

Continuo muito interessado na oportunidade.

Fico a disposicao!', 6),
      ('ask_status', 'Perguntar status', 'Ola, {{contato}}.

Gostaria de saber como esta o andamento do processo seletivo para {{vaga}} na {{empresa}}.

Sigo a disposicao para qualquer etapa adicional.

Obrigado!', 7),
      ('negotiate_offer', 'Negociar proposta', 'Ola, {{contato}}.

Agradeco muito pela proposta para a vaga de {{vaga}} na {{empresa}}.

Estou muito animado com a oportunidade. Gostaria de conversar sobre alguns pontos da proposta para garantir que seja positiva para ambos os lados.

Podemos agendar uma conversa?', 8),
      ('decline_offer', 'Recusar proposta', 'Ola, {{contato}}.

Agradeco imensamente pela proposta para {{vaga}} na {{empresa}}.

Apos considerar com cuidado, decidi seguir em outra direcao neste momento.

Foi um prazer conhecer o time e espero que possamos manter contato para futuras oportunidades.

Obrigado!', 9),
      ('ask_feedback', 'Pedir feedback apos negativa', 'Ola, {{contato}}.

Obrigado pelo retorno e pela oportunidade de participar do processo.

Mesmo nao avancando desta vez, continuo interessado em futuras oportunidades na {{empresa}}.

Se possivel, gostaria de saber se ha algum feedback sobre minha participacao que possa me ajudar a melhorar.

Obrigado pelo tempo dedicado!', 10)
    `)
  } else {
    console.log(`  SKIP (ja tem ${existing[0]?.c} templates): SEED message_templates`)
  }

  console.log("\nMigracao 0016 aplicada com sucesso!")
}

main().catch((err) => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
