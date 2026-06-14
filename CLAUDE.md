# Plataforma de Mentoria — Adriano Monteiro

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript 5.7
- **Styling**: Tailwind CSS 3.4, shadcn/ui (Radix UI primitives)
- **Database**: Supabase (PostgreSQL) com Row Level Security
- **Auth**: Supabase Auth (email/senha)
- **File Storage**: Vercel Blob
- **Email**: Nodemailer (SMTP)
- **Package Manager**: pnpm

## Comandos

```bash
pnpm dev          # Dev server com Turbopack
pnpm build        # Build de produção
pnpm lint         # Linting
```

## Estrutura do Projeto

```
app/
  page.tsx                    # Landing page (linktree + booking)
  layout.tsx                  # Root layout (fonts, metadata)
  globals.css                 # Estilos globais
  schedule/page.tsx           # Agenda semanal pública
  content/
    page.tsx                  # Biblioteca de conteúdos pública + PIX
    [id]/page.tsx             # Detalhe do conteúdo (PDF/video/artigo)
  jobs/page.tsx               # Quadro de vagas público + PIX
  api/
    booking/route.ts          # POST booking (email + DB)
    auth/callback/route.ts    # Supabase auth callback
    schedule/route.ts         # GET agenda semanal
    topics/route.ts           # GET topics ativos
    content/route.ts          # GET conteúdos publicados
    content/[id]/route.ts     # GET detalhe do conteúdo
    jobs/route.ts             # GET vagas aprovadas, POST criar vaga
    jobs/[id]/route.ts        # PUT editar vaga própria
    profile/route.ts          # GET/PUT perfil do usuário
    profile/resume/route.ts   # POST upload de currículo
    admin/
      stats/route.ts          # GET estatísticas
      slots/route.ts          # GET/POST slots
      slots/[id]/route.ts     # PUT/DELETE slot
      topics/route.ts         # GET/POST topics
      topics/[id]/route.ts    # PUT/DELETE topic
      bookings/route.ts       # GET bookings com filtros
      bookings/[id]/route.ts  # PUT status (+ Google Calendar)
      jobs/[id]/route.ts      # PUT aprovar/rejeitar vaga
      settings/route.ts       # GET/PUT configurações
      mentees/route.ts        # GET mentorados
      content/route.ts        # POST criar conteúdo
      content/[id]/route.ts   # PUT/DELETE conteúdo
      content/upload/route.ts # POST upload arquivo
      content/categories/route.ts # GET/POST categorias
      calendar/auth/route.ts  # GET/POST OAuth Google Calendar
      calendar/route.ts       # POST criar evento
  (auth)/
    login/page.tsx            # Login
    register/page.tsx         # Registro
  (dashboard)/
    layout.tsx                # Auth guard + sidebar
    dashboard/page.tsx        # Redirect por role
    admin/
      page.tsx                # Stats cards
      schedule/page.tsx       # Gerenciar slots e topics
      bookings/page.tsx       # Tabela de bookings
      content/page.tsx        # Gerenciar conteúdos
      jobs/page.tsx           # Aprovar/rejeitar vagas
      mentees/page.tsx        # Lista de mentorados
      settings/page.tsx       # Config PIX + Google Calendar
    mentee/
      page.tsx                # Overview do mentorado
      profile/page.tsx        # Editar perfil
      bookings/page.tsx       # Histórico de mentorias
      bookings/new/page.tsx   # Solicitar mentoria paga
    hr/
      page.tsx                # Overview HR
      jobs/page.tsx           # Vagas publicadas
      jobs/new/page.tsx       # Nova vaga
      mentees/page.tsx        # Buscar mentorados
components/
  booking-form.tsx            # Formulário de agendamento
  mentoring-info.tsx          # Info do programa de mentoria
  profile-header.tsx          # Avatar e bio
  social-links.tsx            # Links sociais
  pix-qrcode.tsx              # QR Code PIX para doações
  ui/                         # shadcn/ui components
  dashboard/
    sidebar-nav.tsx           # Sidebar role-based
    dashboard-header.tsx      # Header com título
    profile-form.tsx          # Form de perfil (compartilhado)
    admin/                    # Componentes admin (stats, tables, forms)
    mentee/                   # Componentes mentee (booking history, paid form)
    hr/                       # Componentes HR (job form)
lib/
  utils.ts                    # cn() utility
  whatsapp.ts                 # Formatação de número WhatsApp
  google-calendar.ts          # Google Calendar API (OAuth2, criar/deletar evento)
  types/
    database.ts               # TypeScript types para todas as tabelas
  utils/
    auth.ts                   # getSession, requireAuth, requireRole helpers
    upload.ts                 # uploadFile wrapper (Vercel Blob, 5MB max)
  supabase/
    client.ts                 # Browser client (createBrowserClient)
    server.ts                 # Server client (createServerClient)
    admin.ts                  # Admin client (service role, sem cookies)
supabase/
  schema.sql                  # DDL completo (tabelas, RLS, triggers, seed)
docs/
  FEATURES.md                 # Documentação de funcionalidades
middleware.ts                 # Refresh token + proteção de rotas
```

## Convenções

### Código
- **Server Components por padrão**. Usar `"use client"` apenas para componentes interativos
- **API routes para mutations** (POST/PUT/DELETE). Server Components apenas para leitura
- **Supabase client direto** (sem ORM). RLS cuida da autorização no nível do banco
- **Zod** para validação de dados de entrada nas API routes
- **Idioma pt-BR** em toda a UI (textos, mensagens de erro, labels)

### Estilo
- Usar componentes shadcn/ui existentes em `components/ui/` antes de criar novos
- Tailwind CSS para styling — não usar CSS modules ou styled-components
- Dark theme padrão: background `#0d1117`, primary teal `#2dd4bf`
- Mobile-first responsive design

### Segurança
- Env vars nunca commitadas — usar `.env.local` (já no `.gitignore`)
- `NEXT_PUBLIC_*` apenas para variáveis seguras para o browser (URL, anon key)
- `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor (API routes)
- Validar inputs em API routes antes de queries ao banco

### Database
- Todas as tabelas devem ter RLS habilitado
- UUIDs como primary keys (gerados pelo Postgres via `gen_random_uuid()`)
- Timestamps com `timestamptz` e default `now()`
- Foreign keys com `ON DELETE CASCADE` quando apropriado

### Variáveis de Ambiente

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL        # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Chave anônima (segura para browser)
SUPABASE_SERVICE_ROLE_KEY       # Chave admin (apenas servidor)

# Vercel Blob
BLOB_READ_WRITE_TOKEN           # Token de leitura/escrita

# SMTP (Nodemailer)
SMTP_HOST                       # Servidor SMTP
SMTP_PORT                       # Porta (587 padrão)
SMTP_USER                       # Usuário SMTP
SMTP_PASS                       # Senha SMTP

# Google Calendar (OAuth2)
GOOGLE_CLIENT_ID                # Client ID do Google Cloud
GOOGLE_CLIENT_SECRET            # Client Secret do Google Cloud
GOOGLE_CALENDAR_ID              # Email do calendário

# Google Gemini (melhoria de currículo com IA)
GEMINI_API_KEY                  # API key do Google AI Studio (obrigatória p/ a ferramenta)
GEMINI_MODEL                    # Opcional, default gemini-2.5-flash

# Pagar.me (PIX — mentorias pagas)
PAGARME_SECRET_KEY              # Secret key (sk_test_... ou sk_live_...)
PAGARME_BASE_URL                # Host unico v5: https://api.pagar.me/core/v5 (ambiente definido pela chave sk_test_/sk_live_; sdx-api esta morto)
PAGARME_WEBHOOK_USER            # Usuário Basic Auth do webhook (configurado no dashboard)
PAGARME_WEBHOOK_PASSWORD        # Senha Basic Auth do webhook
```

## Roles de Usuário

- **admin**: Acesso total (Adriano). Role setado manualmente no banco
- **mentee**: Usuário padrão. Pode agendar mentorias, ver conteúdos, postar vagas (com aprovação)
- **hr**: Pode postar vagas sem aprovação, pesquisar mentorados. Atribuído pelo admin

## Fases de Desenvolvimento

1. **Fundação** — Supabase, Auth, fix WhatsApp, PIX QR code (concluída)
2. **Schedule** — Agenda visível, bookings no banco (concluída)
3. **Dashboard + Conteúdos + Vagas + Calendar** — Painel admin/mentee/HR, biblioteca, vagas, Google Calendar, uploads (concluída)
4. **Polish** — Emails, SEO, performance (planejado)
