# Plano de Testes — Plataforma de Mentoria

Este documento descreve os testes manuais e cenários de validação para todas as funcionalidades da plataforma.

---

## 0. Preparação para Testes

### 0.1 Variáveis de Ambiente

Crie `.env.local` na raiz do projeto com:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# SMTP (para testar envio de emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app

# Email do mentor (recebe notificações)
MENTOR_EMAIL=adrianomonteiroweb@gmail.com

# Vercel Blob (para upload de arquivos)
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Google Calendar (opcional, para testar integração)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALENDAR_ID=xxx@gmail.com

# Stripe (para testar pagamentos PIX)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Rbm...
STRIPE_SECRET_KEY=sk_test_51Rbm...
STRIPE_WEBHOOK_SECRET=whsec_... (gerado pelo Stripe CLI)
```

### 0.2 Banco de Dados — Seed Data

1. Execute `supabase/schema.sql` no Supabase SQL Editor (se ainda não executou)
2. Execute `supabase/seed-test.sql` para popular com dados de teste

O seed cria:
- Slots gratuitos (do schema) + slots pagos com RRule (Seg/Qua/Sex 14h, Ter/Qui 10h, Sáb 16h)
- 4 bookings de teste (pendente, confirmado, pago, completado)
- 1 pagamento de exemplo
- 3 vagas (2 aprovadas, 1 pendente)
- 2 categorias de conteúdo + 2 conteúdos publicados
- Configuração PIX atualizada

### 0.3 Usuários de Teste

Crie via Supabase Dashboard > Authentication > Users:

| Email | Senha | Role (atualizar no SQL) |
|-------|-------|------------------------|
| admin@teste.com | Test@1234 | `UPDATE profiles SET role = 'admin' WHERE email = 'admin@teste.com';` |
| mentee@teste.com | Test@1234 | (padrão é mentee) |
| hr@teste.com | Test@1234 | `UPDATE profiles SET role = 'hr' WHERE email = 'hr@teste.com';` |

### 0.4 Stripe — Teste Local com Stripe CLI

1. Instale o [Stripe CLI](https://docs.stripe.com/stripe-cli)
2. Autentique: `stripe login`
3. Encaminhe webhooks: `stripe listen --forward-to localhost:3000/api/payment/webhook`
4. Copie o `whsec_...` exibido e adicione em `STRIPE_WEBHOOK_SECRET` no `.env.local`
5. O PIX em modo teste aceita qualquer pagamento — o QR Code é simulado

**Dica:** Para simular pagamento confirmado instantaneamente via terminal:
```bash
stripe trigger payment_intent.succeeded
```

### 0.5 Executar Dev Server

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000` para testar.

---

## 1. Fluxo de Mentoria Gratuita (E2E)

### 1.1 Stepper — Seleção de Tipo
- [ ] Ao abrir a página principal, o stepper aparece com Step 1 (Tipo) ativo
- [ ] "Mentoria Gratuita" está pré-selecionada por padrão
- [ ] Clicar em "Mentoria Paga" ou "Particular" altera a seleção visual
- [ ] Barra de progresso mostra "Passo 1 de 5"
- [ ] Botão "Próximo" avança para Step 2

### 1.2 Stepper — Seleção de Tema
- [ ] Temas da categoria "free" são exibidos como cards
- [ ] Cada card mostra nome e descrição (quando disponível)
- [ ] Clicar em um tema destaca o card e auto-avança para Step 3 após ~400ms
- [ ] Barra de progresso atualiza para "Passo 2 de 5"
- [ ] Botão "Voltar" retorna ao Step 1

### 1.3 Stepper — Seleção de Data/Horário (Gratuita)
- [ ] Slots disponíveis da semana atual são exibidos
- [ ] Slots ordenados por data crescente (menor data primeiro)
- [ ] Slots com data/hora já passados NÃO aparecem
- [ ] Primeiro slot disponível tem badge "Próximo" (anchoring)
- [ ] Se restam 1-2 slots, badge "Últimos horários!" aparece (escassez)
- [ ] Se todos os slots estão ocupados, mensagem "Todos os horários já foram preenchidos"
- [ ] Clicar em um slot destaca e permite avançar
- [ ] Cada slot mostra: dia da semana, data (DD/MM), horário

### 1.4 Stepper — Informações de Contato
- [ ] Campos: Nome, Email, WhatsApp (todos obrigatórios)
- [ ] Não é possível avançar com campos vazios
- [ ] Se usuário está autenticado, campos são pré-preenchidos com dados do perfil
- [ ] Mensagem "Seus dados foram preenchidos automaticamente" aparece se autenticado
- [ ] Campo de Observações NÃO aparece na mentoria gratuita

### 1.5 Stepper — Revisão e Confirmação
- [ ] Resumo mostra: tipo, tema, data, horário, nome de contato
- [ ] Cada seção tem link "Alterar" que volta ao step correto
- [ ] Clicar "Alterar" no tema volta ao Step 2
- [ ] Clicar "Alterar" na data volta ao Step 3
- [ ] QR Code PIX de doação aparece (doação sugerida, não obrigatória)
- [ ] Barra de progresso mostra "Passo 5 de 5"
- [ ] Botão "Solicitar mentoria" envia o formulário
- [ ] Loading spinner aparece durante envio
- [ ] Tela de sucesso: checkmark + mensagem + "Solicitar nova mentoria"

### 1.6 API — POST /api/booking
- [ ] Booking é salvo na tabela `bookings` com `booking_type: "free"`, `status: "pending"`
- [ ] `slot_id`, `topic_id`, `session_date`, `start_time` são populados
- [ ] `guest_name`, `guest_email`, `guest_whatsapp` são populados
- [ ] Email é enviado para `adrianomonteiroweb@gmail.com`
- [ ] Email contém: nome, email, WhatsApp (link), tema, dia, horário
- [ ] Se SMTP falha, booking ainda é salvo (non-blocking)

### 1.7 Fallback (API indisponível)
- [ ] Se `/api/schedule` ou `/api/topics` falham, temas fallback aparecem
- [ ] Fluxo completo funciona com dados hardcoded
- [ ] Submit ainda envia email com dados básicos

---

## 2. Fluxo de Mentoria Paga (E2E)

### 2.1 Stepper — Seleção de Tipo
- [ ] Selecionar "Mentoria Paga" no Step 1
- [ ] Selecionar "Mentoria Particular" no Step 1
- [ ] Barra de progresso mostra "Passo 1 de 6" (6 steps para pago)
- [ ] Avançar para Step 2

### 2.2 Stepper — Seleção de Tema (Pago)
- [ ] Apenas temas da categoria "paid" são exibidos
- [ ] Cards com nome e descrição
- [ ] Auto-advance funciona ao clicar

### 2.3 Stepper — Data/Horário (Pago — Slots RRule)
- [ ] Slots pagos com RRule são exibidos como lista (próximas 4 semanas)
- [ ] Slots ordenados por data crescente
- [ ] Slots com data/hora passados NÃO aparecem
- [ ] Slots já reservados NÃO aparecem
- [ ] Primeiro slot tem badge "Próximo"
- [ ] Se restam poucos slots, badge "Últimos horários!" aparece
- [ ] Cada slot mostra: dia da semana, data (DD/MM), horário
- [ ] Não é possível avançar sem selecionar um slot

### 2.4 Stepper — Contato (Pago)
- [ ] Mesmos campos: Nome, Email, WhatsApp
- [ ] Campo de Observações (textarea) aparece para mentoria paga
- [ ] Observações são opcionais (pode avançar sem preencher)
- [ ] Placeholder sugere o que escrever

### 2.5 Stepper — Revisão (Pago)
- [ ] Resumo mostra tipo "Mentoria Paga" ou "Particular"
- [ ] NÃO mostra QR Code PIX (pagamento é no próximo step via Stripe)
- [ ] Mostra aviso: "R$ 50,00 via PIX — mentoria confirmada após pagamento"
- [ ] Observações aparecem se preenchidas
- [ ] Botão mostra "Ir para pagamento" (não "Solicitar mentoria")
- [ ] Clicar avança para Step 6 (Pagamento)

### 2.6 Stepper — Pagamento PIX (Stripe)
- [ ] Ao entrar, exibe "Gerando pagamento PIX..." com spinner
- [ ] Após criação do PaymentIntent, QR Code PIX é exibido
- [ ] QR Code é uma imagem SVG do Stripe
- [ ] Código PIX copia-e-cola é exibido abaixo
- [ ] Botão "Copiar" copia o código para o clipboard
- [ ] Timer de 30 minutos é exibido em contagem regressiva
- [ ] Mensagem "Aguardando confirmação do pagamento..." com spinner
- [ ] Polling verifica status do pagamento a cada 5 segundos
- [ ] Ao confirmar pagamento: tela "Pagamento confirmado!" por 1.5s
- [ ] Em seguida: tela de sucesso com checkmark
- [ ] Botão "Cancelar" volta ao step de revisão
- [ ] Se PIX expirar (30 min): mensagem "PIX expirado" + botão "Gerar novo PIX"
- [ ] Se erro: mensagem de erro + botões "Voltar" e "Tentar novamente"

### 2.7 API — POST /api/payment/create-intent
- [ ] Validação Zod: rejeita campos obrigatórios vazios (retorna 400)
- [ ] Cria PaymentIntent com amount=5000 (R$50), currency=brl, method=pix
- [ ] PIX expira em 30 minutos (1800 segundos)
- [ ] Metadata do PaymentIntent contém todos os dados do booking
- [ ] Retorna `clientSecret` e `paymentIntentId`
- [ ] NÃO cria booking na tabela (booking é criado pelo webhook)

### 2.8 API — POST /api/payment/webhook
- [ ] Valida assinatura Stripe (`stripe-signature` header)
- [ ] Rejeita requisições com assinatura inválida (400)
- [ ] Evento `payment_intent.succeeded`:
  - [ ] Cria booking com `status: "paid"` na tabela `bookings`
  - [ ] Cria registro na tabela `payments` com `status: "confirmed"`
  - [ ] `pix_txid` contém o ID do PaymentIntent
  - [ ] Email é enviado ao mentor com tag `[PAGO]`
  - [ ] Se email falha, booking ainda é criado
- [ ] Evento `payment_intent.payment_failed`: log é registrado

---

## 3. Fluxo com Usuário Autenticado

### 3.1 Auto-preenchimento
- [ ] Usuário logado tem nome, email e WhatsApp pré-preenchidos no Step 4
- [ ] Dados vêm do perfil Supabase (tabela `profiles`)
- [ ] Campos são editáveis mesmo quando pré-preenchidos
- [ ] `mentee_id` é enviado no payload de booking

### 3.2 Acesso via Dashboard
- [ ] Página `/dashboard/mentee/bookings/new` renderiza o stepper unificado
- [ ] `defaultType="paid"` pré-seleciona mentoria paga no Step 1
- [ ] Fluxo completo funciona dentro do dashboard

---

## 4. Navegação do Stepper

### 4.1 Progress e Steps
- [ ] Barra de progresso atualiza corretamente em cada step (20%, 40%, 60%, 80%, 100%)
- [ ] Indicadores de step (círculos numerados) refletem estado: completo, atual, pendente
- [ ] Steps completados mostram ícone de check
- [ ] No mobile, indicadores individuais são ocultos (só mostra barra + label atual)

### 4.2 Navegação
- [ ] Botão "Voltar" funciona em todos os steps (exceto Step 1)
- [ ] Botão "Voltar" NÃO aparece no Step 1
- [ ] Botão "Próximo" é desabilitado quando step não está preenchido
- [ ] Último step mostra "Solicitar mentoria" em vez de "Próximo"
- [ ] Links "Alterar" no review voltam ao step correto

### 4.3 Animações
- [ ] Transição fade-in ao avançar step
- [ ] Slide-in da direita ao avançar, da esquerda ao voltar
- [ ] Cards selecionados têm scale sutil

### 4.4 Mudança de Tipo
- [ ] Ao mudar tipo no Step 1 (gratuita → paga), campos dependentes são resetados
- [ ] Topic, slot, date, time são limpos ao trocar tipo
- [ ] Contato (nome, email, whatsapp) é mantido

---

## 5. Email — SMTP

### 5.1 Envio de Email (Mentor)
- [ ] Mentoria gratuita: email enviado para `adrianomonteiroweb@gmail.com`
- [ ] Mentoria paga: email enviado para `adrianomonteiroweb@gmail.com`
- [ ] Template HTML renderiza corretamente (tabela, cores, badges)
- [ ] Link WhatsApp no email funciona (`https://wa.me/55...`)
- [ ] Link email no email funciona (`mailto:...`)
- [ ] Subject contém: tipo, nome do mentorado, tema

### 5.2 Notificações ao Mentorado (Status Change)
- [ ] `confirmed` → Email "Sua mentoria foi confirmada!" enviado ao mentorado
- [ ] `payment_pending` → Email "Pagamento pendente" com chave PIX do site_settings
- [ ] `scheduled` → Email "Mentoria agendada!" com data/horário
- [ ] `completed` → Email "Mentoria concluída!" com agradecimento
- [ ] `cancelled` → Email "Mentoria cancelada" com link para reagendar
- [ ] Emails são non-blocking (falha de email não impede atualização de status)
- [ ] Email é enviado para `guest_email` (não autenticado) ou `profiles.email` (autenticado)

### 5.3 SMTP Indisponível
- [ ] Se variáveis SMTP não estão configuradas, booking é salvo sem email
- [ ] Erro de SMTP é logado no console do servidor
- [ ] Resposta da API ainda é `{ success: true }`

---

## 6. Google Calendar

### 6.1 Conexão OAuth
- [ ] Admin acessa `/dashboard/admin/settings`
- [ ] Botão "Conectar Google Calendar" gera URL de consentimento
- [ ] Após autorização, `refresh_token` é salvo em `site_settings`
- [ ] Status mostra "Conectado" com data de conexão

### 6.2 Criação de Evento
- [ ] Ao mudar status de booking para `scheduled`, evento é criado no Calendar
- [ ] Evento contém: título "Mentoria: {tema}", descrição com nome do mentorado
- [ ] Google Meet é criado automaticamente
- [ ] Timezone: America/Fortaleza
- [ ] Duração padrão: 60 minutos
- [ ] Reminders: email 60min antes, popup 15min antes
- [ ] Email do mentorado é adicionado como attendee (se disponível)
- [ ] `google_event_id` é salvo no booking

### 6.3 Erro de Calendar
- [ ] Se Calendar falha, status ainda é atualizado no banco
- [ ] Erro é logado no console
- [ ] `google_event_id` não é populado

---

## 7. Fluxo Admin — Gerenciamento de Bookings

### 7.1 Listagem
- [ ] Admin acessa `/dashboard/admin/bookings`
- [ ] Tabela mostra: Nome, Email, Tema, Tipo (badge), Status (badge colorido), Data
- [ ] Filtro por status funciona (dropdown)
- [ ] Paginação funciona (20 itens por página)
- [ ] Bookings ordenados por `created_at` DESC (mais recente primeiro)

### 7.2 Workflow de Status — Gratuita
- [ ] `pending` → botão "Confirmar" → muda para `confirmed`
- [ ] `confirmed` (free) → botão "Agendar" → muda para `scheduled`
- [ ] `scheduled` → botão "Concluir" → muda para `completed`
- [ ] Qualquer status não-terminal → botão "Cancelar" → muda para `cancelled`

### 7.3 Workflow de Status — Paga
- [ ] `pending` → botão "Confirmar" → muda para `confirmed`
- [ ] `confirmed` (paid) → botão "Solicitar Pgto" → muda para `payment_pending`
- [ ] `payment_pending` → (manual, não tem botão direto) → `paid`
- [ ] `paid` → botão "Agendar" → muda para `scheduled`
- [ ] `scheduled` → botão "Concluir" → muda para `completed`

### 7.4 Status Badges (cores)
- [ ] pending: amarelo
- [ ] confirmed: azul
- [ ] payment_pending: laranja
- [ ] paid: verde
- [ ] scheduled: teal (primary)
- [ ] completed: verde escuro
- [ ] cancelled: vermelho

---

## 8. Fluxo de Vagas (Jobs)

### 8.1 Postagem de Vaga — HR
- [ ] HR acessa `/dashboard/hr/jobs/new`
- [ ] Formulário: título (3+ chars), empresa (2+ chars), descrição (10+ chars)
- [ ] Campos opcionais: localização, tipo (remote/hybrid/onsite), salário, URL de aplicação
- [ ] Submit: POST `/api/jobs`
- [ ] Vaga é **auto-aprovada** para HR e admin (`status: "approved"`)
- [ ] Vaga aparece imediatamente na página pública `/jobs`

### 8.2 Postagem de Vaga — Mentee
- [ ] Mentee acessa link de nova vaga no dashboard
- [ ] Mesmos campos do formulário HR
- [ ] Vaga é criada com `status: "pending"` (aguarda aprovação)
- [ ] Vaga NÃO aparece na página pública até aprovação

### 8.3 Aprovação de Vaga — Admin
- [ ] Admin acessa `/dashboard/admin/jobs`
- [ ] Vê vagas pendentes
- [ ] Botão "Aprovar" → PUT `/api/admin/jobs/{id}` com `status: "approved"`
- [ ] Botão "Rejeitar" → PUT `/api/admin/jobs/{id}` com `status: "rejected"`
- [ ] Após aprovação, vaga aparece na página pública

### 8.4 Página Pública de Vagas
- [ ] `/jobs` lista apenas vagas com `status: "approved"`
- [ ] Cada vaga mostra: título, empresa, localização, tipo, salário, descrição
- [ ] Link para URL de aplicação externa funciona
- [ ] Nome do autor (posted_by) aparece

### 8.5 Edição de Vaga
- [ ] Dono da vaga pode editar enquanto `status: "pending"` via PUT `/api/jobs/{id}`
- [ ] Não é possível editar vaga já aprovada/rejeitada

---

## 9. Fluxo de Conteúdos

### 9.1 Criação — Admin
- [ ] Admin acessa `/dashboard/admin/content`
- [ ] Formulário para criar conteúdo: título, descrição, tipo (pdf/article/video)
- [ ] Upload de PDF via POST `/api/admin/content/upload` (limite 5MB)
- [ ] Para vídeo: URL do YouTube ou link externo
- [ ] Para artigo: corpo do texto em textarea
- [ ] Conteúdo salvo com `is_published: true` por padrão

### 9.2 Categorias
- [ ] Admin pode criar/listar categorias via `/api/admin/content/categories`
- [ ] Cada conteúdo pertence a uma categoria

### 9.3 Página Pública de Conteúdos
- [ ] `/content` lista todos os conteúdos publicados
- [ ] Filtro por categoria funciona
- [ ] Tipos de conteúdo são diferenciados visualmente

### 9.4 Detalhe do Conteúdo
- [ ] `/content/{id}` renderiza baseado no tipo:
  - PDF: link de download + tamanho do arquivo
  - Vídeo: embed do YouTube ou link externo
  - Artigo: texto renderizado em parágrafos
- [ ] Conteúdo não publicado retorna 404

---

## 10. Autenticação

### 10.1 Registro
- [ ] `/register` — campos: nome, email, senha (6+ chars), WhatsApp
- [ ] Submit cria usuário no Supabase Auth
- [ ] Trigger cria perfil automaticamente na tabela `profiles`
- [ ] WhatsApp é salvo via PUT `/api/profile`
- [ ] Redirect para `/login` após sucesso

### 10.2 Login
- [ ] `/login` — campos: email, senha
- [ ] Login bem-sucedido redireciona para `/dashboard`
- [ ] Suporte a query param `?redirect=/dashboard/mentee/bookings`
- [ ] Credenciais inválidas mostram mensagem de erro

### 10.3 Middleware
- [ ] Rotas `/dashboard/*` redirecionam para `/login` se não autenticado
- [ ] `/login` e `/register` redirecionam para `/dashboard` se já autenticado
- [ ] Session é refreshed em cada request

### 10.4 Roles
- [ ] Admin: acesso a todas as páginas admin
- [ ] Mentee: acesso apenas a páginas mentee
- [ ] HR: acesso a páginas HR + busca de mentorados
- [ ] Tentar acessar rota de outro role retorna 403

---

## 11. Perfil do Mentorado

### 11.1 Visualização e Edição
- [ ] `/dashboard/mentee/profile` mostra formulário de perfil
- [ ] Campos editáveis: nome, WhatsApp, LinkedIn URL, bio
- [ ] Email é read-only
- [ ] Botão salvar → PUT `/api/profile`
- [ ] Mensagem de sucesso após salvar

### 11.2 Upload de Currículo
- [ ] Botão de upload aceita PDF
- [ ] POST `/api/profile/resume` faz upload para Vercel Blob
- [ ] Limite de 5MB
- [ ] Currículo atual aparece como link de download
- [ ] `resume_url` é atualizado no perfil

---

## 12. Gerenciamento Admin — Slots e Topics

### 12.1 Slots
- [ ] Admin acessa `/dashboard/admin/schedule`
- [ ] Tabela de slots: dia da semana, horário, tipo, ativo
- [ ] Adicionar slot: dia (0-6), horário (HH:MM), tipo (free/paid/private)
- [ ] Toggle ativo/inativo via PUT `/api/admin/slots/{id}`
- [ ] Deletar slot via DELETE `/api/admin/slots/{id}`
- [ ] Mudanças refletem imediatamente no booking form

### 12.2 Topics
- [ ] Mesma página dos slots
- [ ] Tabela de topics: nome, categoria (Free/Paid badge), ativo
- [ ] Adicionar topic: nome, categoria
- [ ] Toggle ativo/inativo
- [ ] Deletar topic
- [ ] Mudanças refletem no booking form

---

## 13. Admin — Configurações

### 13.1 PIX
- [ ] Admin acessa `/dashboard/admin/settings`
- [ ] Configurar chave PIX, nome, cidade
- [ ] Dados salvos em `site_settings` com key `pix_config`
- [ ] QR Code PIX usa dados configurados

### 13.2 Google Calendar
- [ ] Botão para conectar/reconectar Google Calendar
- [ ] OAuth flow: consent → code exchange → refresh_token salvo
- [ ] Status de conexão exibido com data

---

## 14. Admin — Mentorados

- [ ] Admin acessa `/dashboard/admin/mentees`
- [ ] Lista todos os perfis com role "mentee"
- [ ] Busca por nome funciona
- [ ] Exibe: nome, email, WhatsApp, LinkedIn, currículo (badge PDF)
- [ ] HR também pode acessar busca de mentorados

---

## 15. Responsividade (Mobile)

- [ ] Stepper de booking funciona em viewport 375px
- [ ] Indicadores de step individuais ocultos no mobile
- [ ] Barra de progresso + "Passo X de Y" sempre visíveis
- [ ] Cards de tipo empilham verticalmente no mobile
- [ ] Cards de tema: 1 coluna no mobile, 2 no desktop
- [ ] Botões de navegação: largura total no mobile
- [ ] Calendário: largura total no mobile
- [ ] Tabelas admin: colunas secundárias ocultas no mobile

---

## 16. Acessibilidade

- [ ] Navegação por teclado funciona em todos os steps
- [ ] Focus management: foco move para primeiro elemento interativo ao trocar step
- [ ] Cards de seleção são acessíveis por teclado (Enter/Space)
- [ ] Labels corretos em todos os inputs
- [ ] Progress bar tem aria-label adequado
- [ ] Step indicators comunicam estado via aria

---

## 17. Edge Cases

- [ ] Submeter booking com sessão expirada: deve redirecionar para login
- [ ] Submeter booking com dados inválidos: mensagem de erro clara
- [ ] Dois usuários reservam o mesmo slot simultaneamente: segundo booking ainda é salvo (não há lock exclusivo, admin gerencia manualmente)
- [ ] Clicar "Solicitar nova mentoria" reseta todo o stepper
- [ ] Refresh da página durante o stepper: form reinicia (sem persistência local)
- [ ] URL com `#booking` ancora corretamente na seção do form
