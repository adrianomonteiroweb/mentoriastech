# Funcionalidades da Plataforma de Mentoria

## Visao Geral

Plataforma de mentoria de programacao criada por Adriano Monteiro. Permite agendamento de mentorias gratuitas e pagas, acesso a conteudos educacionais, quadro de vagas e perfil do mentorado.

---

## Funcionalidades Implementadas

### Landing Page (Linktree)
- **Status**: Implementado
- Pagina principal com perfil, links sociais e formulario de agendamento
- Links para LinkedIn, WhatsApp e Instagram
- Design responsivo com tema escuro

### Agendamento de Mentoria Gratuita
- **Status**: Implementado
- Formulario com nome, email, WhatsApp, tema e horario
- Slots e topics carregados do banco de dados (com fallback hardcoded)
- Envio de email de notificacao para o mentor via SMTP (Nodemailer)
- Persistencia no banco de dados Supabase com FKs (slot_id, topic_id, session_date)
- Tela de confirmacao apos envio

### Agenda Semanal Publica
- **Status**: Implementado
- Pagina `/schedule` mostrando agenda da semana com slots e bookings
- Slots disponiveis com link para agendar
- Slots ocupados mostram tema e primeiro nome do mentorado

### Formatacao do Numero WhatsApp
- **Status**: Implementado
- Numeros brasileiros com 10-11 digitos recebem automaticamente o codigo do pais 55
- Aplicado no link do email de notificacao

### QR Code PIX para Doacoes
- **Status**: Implementado
- QR Code gerado automaticamente a partir da chave PIX (CPF)
- Formato EMV padrao do Banco Central
- Botao para copiar codigo PIX (Copia e Cola)
- Exibido nas paginas de conteudos e vagas

### Autenticacao
- **Status**: Implementado
- Login com email e senha (Supabase Auth)
- Registro de novos mentorados
- Middleware de protecao de rotas do dashboard
- Criacao automatica de perfil ao registrar (trigger)

### Banco de Dados
- **Status**: Implementado
- Supabase (PostgreSQL) com Row Level Security
- 9 tabelas: profiles, mentoring_slots, mentoring_topics, bookings, payments, content_categories, content_items, jobs, site_settings
- Triggers para auto-criacao de perfis e atualizacao de timestamps
- Seeds com slots e topics iniciais

### Dashboard Admin
- **Status**: Implementado
- Visao geral com cards de estatisticas (bookings, mentees, vagas, conteudos)
- Gerenciamento de slots e topics (CRUD)
- Tabela de bookings com filtros e acoes de status (confirmar, solicitar pagamento, agendar, concluir, cancelar)
- Gerenciamento de conteudos (upload PDF, YouTube, artigos)
- Fila de aprovacao de vagas
- Lista de mentorados com busca
- Configuracoes (PIX, Google Calendar OAuth)

### Dashboard Mentee
- **Status**: Implementado
- Overview com proximos bookings
- Edicao de perfil (nome, email, WhatsApp, LinkedIn, upload de curriculo)
- Historico de mentorias
- Solicitacao de mentoria paga/privada com QR Code PIX

### Dashboard HR
- **Status**: Implementado
- Overview de vagas publicadas
- Publicacao de vagas (auto-aprovadas) com link direto para LinkedIn/site (application_url)
- Busca de mentorados

### Biblioteca de Conteudos
- **Status**: Implementado
- Pagina publica `/content` com filtro por categoria
- Detalhe do conteudo: download PDF, embed YouTube, artigo renderizado
- Upload de PDFs pelo admin (Vercel Blob, max 5MB)
- Categorias gerenciaveis pelo admin

### Quadro de Vagas
- **Status**: Implementado
- Pagina publica `/jobs` com vagas aprovadas
- Botao "Candidatar-se" abre link direto (LinkedIn/site da empresa)
- Mentorados podem postar vagas (pendente aprovacao)
- HR/admin: vagas auto-aprovadas
- Cards com empresa, localizacao, tipo (remoto/hibrido/presencial), salario

### Upload de Arquivos
- **Status**: Implementado
- Vercel Blob para armazenamento
- Validacao de tamanho (max 5MB) e tipo MIME
- Upload de curriculos (PDF) e conteudos

### Google Calendar
- **Status**: Implementado
- Integracao via OAuth2 (googleapis)
- Fluxo de consentimento na pagina de configuracoes do admin
- Criacao automatica de eventos com Google Meet ao agendar mentoria paga
- Timezone America/Fortaleza, lembretes por email

---

## Funcionalidades Planejadas

### Fase 4: Polish

#### Melhorias Gerais
- **Status**: Planejado
- Emails de confirmacao de booking, lembrete de pagamento, aprovacao de vagas
- SEO e metadata dinamica para paginas de conteudo e vagas
- Indices de banco de dados para queries comuns
- Auditoria de responsividade

---

## Roles de Usuario

| Role | Descricao | Permissoes |
|------|-----------|------------|
| **admin** | Adriano (mentor) | Acesso total: gerenciar schedule, bookings, conteudos, vagas, mentorados, configuracoes |
| **mentee** | Mentorado | Agendar mentorias, ver conteudos, postar vagas (com aprovacao), completar perfil |
| **hr** | RH / Gestor | Postar vagas sem aprovacao, pesquisar mentorados, ver historico de mentorias |

---

## Temas de Mentoria

### Gratuitos
1. Programacao para outras profissoes
2. Carreira em programacao
3. Preparacao para entrevistas
4. Busca de oportunidades
5. Desenvolvimento Web
6. Automacoes RPA

### Pagos
7. Acompanhamento de processo seletivo
8. Projetos pessoais
9. Aulas de RPA
10. Aulas de Next.js

---

## Horarios Disponiveis (Mentoria Gratuita)

| Dia | Horario |
|-----|---------|
| Sexta-feira | 20:00 |
| Sabado | 09:00 |
| Sabado | 14:00 |
| Domingo | 09:00 |
| Domingo | 14:00 |

---

## Integracoes

| Servico | Uso | Status |
|---------|-----|--------|
| Supabase | Banco de dados + Auth | Implementado |
| Vercel Blob | Armazenamento de arquivos (curriculos, PDFs) | Implementado |
| Nodemailer (SMTP) | Envio de emails de notificacao | Implementado |
| Google Calendar API | Agendamento automatico de mentorias pagas | Implementado |
| PIX (Banco Central) | QR Code para doacoes e pagamentos manuais | Implementado |
| Stripe (PIX) | Pagamento de mentorias pagas via PIX (PaymentIntent) | Implementado |

---

## Testes

### Infraestrutura

- **Framework**: Vitest v2.1.9 com ambiente jsdom
- **Bibliotecas**: @testing-library/react, @testing-library/user-event, @testing-library/jest-dom
- **Diretorio**: `__tests__/` (components, api, integration, lib)
- **Comandos**:
  - `pnpm test` — executa todos os testes (single run)
  - `pnpm run test:watch` — modo watch

### Cobertura de Testes

| Arquivo | Escopo | Testes |
|---------|--------|--------|
| **Componentes** | | |
| `components/type-step.test.tsx` | Selecao de tipo de mentoria (free/paid/private) | 6 |
| `components/topic-step.test.tsx` | Filtragem e selecao de temas | 9 |
| `components/datetime-step.test.tsx` | Slots free/paid, disponibilidade, scarcity badge | 10 |
| `components/contact-step.test.tsx` | Campos obrigatorios, banner autenticado, notes paid-only | 13 |
| `components/review-step.test.tsx` | Revisao free (PIX doacao) e paid (R$50, pagamento) | 11 |
| `components/payment-step.test.tsx` | Estados: creating, awaiting (QR/timer), succeeded, failed, expired | 13 |
| `components/booking-success.test.tsx` | Mensagem free vs paid, reset | 6 |
| `components/booking-stepper.test.tsx` | Barra de progresso, step indicators | 5 |
| `components/step-navigation.test.tsx` | Botoes Voltar/Proximo, estados disabled | 8 |
| **API Routes** | | |
| `api/booking.test.ts` | POST /api/booking: validacao, Supabase insert, email SMTP | 13 |
| `api/payment-create-intent.test.ts` | POST /api/payment/create-intent: validacao Zod, Stripe PaymentIntent | 9 |
| `api/payment-webhook.test.ts` | POST /api/payment/webhook: assinatura, booking+payment insert, email [PAGO] | 11 |
| `api/admin-bookings.test.ts` | PUT /api/admin/bookings/[id]: auth, status flow, Google Calendar, emails por status | 18 |
| `api/admin-calendar.test.ts` | Calendar auth (OAuth consent/tokens), criar evento, validacao | 14 |
| **Integracao** | | |
| `integration/unified-booking-form.test.tsx` | Fluxo completo: free (5 steps) e paid (6 steps), fallback, erro | 8 |
| `integration/booking-lifecycle.test.ts` | Ciclo de vida completo: free e paid (booking → confirm → schedule → complete) | 8 |
| **Lib** | | |
| `lib/booking-reducer.test.ts` | Reducer: todas as actions, step config, reset | 19 |
| `lib/rrule-utils.test.ts` | RRule: construcao e expansao de datas recorrentes | 15 |
| `lib/email-templates.test.ts` | Todos os templates: mentor, confirmed, payment, scheduled, completed, cancelled | 33 |
| `lib/google-calendar.test.ts` | OAuth, createCalendarEvent (attendees, timezone, Meet), deleteCalendarEvent | 22 |
| **Total** | | **251** |

### Estrategia de Mocking

| Dependencia | Abordagem |
|---|---|
| Supabase (server/admin/client) | `vi.mock` com fake `from().insert()`, `auth.getUser()`, chains encadeados |
| Stripe (`@/lib/stripe`) | `vi.hoisted` + `vi.mock` para `paymentIntents.create`, `webhooks.constructEvent` |
| Stripe JS (`@stripe/stripe-js`) | Mock de `loadStripe` com `confirmPixPayment`, `retrievePaymentIntent` |
| Nodemailer | Mock de `createTransport` → `{ verify, sendMail }` |
| Email templates | Mock de todas as funcoes: `newBookingToMentorEmail`, `bookingConfirmedEmail`, etc. |
| Google Calendar (`googleapis`) | Mock de `google.auth.OAuth2`, `google.calendar` → `events.insert/delete` |
| Google Calendar (`@/lib/google-calendar`) | Mock de `createCalendarEvent`, `getConsentUrl`, `exchangeCodeForTokens` |
| Auth (`@/lib/utils/auth`) | Mock de `requireRole` para simular admin/nao-autenticado/forbidden |
| PixQrCode | Mock de componente para evitar dependencia de canvas |
| fetch (global) | Mock por URL para schedule, topics, booking, payment APIs |

### Fluxo de Agendamento Gratuito (Testado)

```
Passo 1: Tipo → Seleciona "Mentoria Gratuita"
Passo 2: Tema → Seleciona topic (category: free), auto-avanca
Passo 3: Data e horario → Seleciona slot disponivel (slotType: free)
Passo 4: Seus dados → Preenche nome, email, WhatsApp
Passo 5: Confirmacao → Revisao + QR PIX doacao + "Solicitar mentoria"
         → POST /api/booking (guest_name, guest_email, booking_type: free)
         → Email SMTP para mentor
         → Tela de sucesso

Ciclo de vida (admin):
  → PUT status=confirmed → Email confirmacao para mentorado
  → PUT status=scheduled → Google Calendar event criado + email agendamento
  → PUT status=completed → Email conclusao
```

### Fluxo de Agendamento Pago (Testado)

```
Passo 1: Tipo → Seleciona "Mentoria Paga"
Passo 2: Tema → Seleciona topic (category: paid), auto-avanca
Passo 3: Data e horario → Seleciona slot disponivel (slotType: paid)
Passo 4: Seus dados → Preenche nome, email, WhatsApp, observacoes (opcional)
Passo 5: Revisao → Mostra R$50,00 + "Ir para pagamento"
Passo 6: Pagamento → POST /api/payment/create-intent (Stripe PIX)
         → Stripe confirmPixPayment → QR Code PIX (30min timeout)
         → Polling a cada 5s para confirmacao
         → Webhook /api/payment/webhook cria booking (status: paid) + payment
         → Email [PAGO] para mentor
         → Tela de sucesso

Ciclo de vida (admin):
  → PUT status=scheduled → Google Calendar event criado (com Google Meet)
  → PUT status=completed → Email conclusao
  → PUT status=cancelled → Email cancelamento
```

### Integracoes Externas Testadas

| Integracao | O que e testado |
|---|---|
| **Google Calendar** | OAuth consent URL, troca de code por tokens, criacao de evento (timezone America/Fortaleza, Google Meet, attendees, reminders), delecao de evento, fallback sem refresh_token |
| **Stripe (PIX)** | Criacao de PaymentIntent (R$50, currency brl, metodo pix, 30min expiracao), validacao de webhook signature, criacao de booking+payment no succeeded, tratamento de payment_failed |
| **SMTP (Nodemailer)** | Envio de email ao mentor (nova solicitacao), emails de status ao mentorado (confirmado, pagamento pendente com PIX, agendado, concluido, cancelado), fallback quando SMTP nao configurado |
| **Supabase** | Insert de bookings (free/paid), insert de payments, update de status, upsert de site_settings, queries com joins (profiles, mentoring_topics) |
