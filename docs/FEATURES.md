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
