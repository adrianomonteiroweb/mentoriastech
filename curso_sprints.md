# Órbita — Formação em Squad

Rastreador de implementação da plataforma de formação em squad integrada ao MentoriasTech.

**Protótipo de referência:** `C:\Users\Gabriele Bernardo\Downloads\plataforma-de-curso`
**Stack do protótipo:** Next.js 16, Tailwind v4, shadcn base-nova — adaptar para Tailwind v3 + shadcn padrão do projeto.

> Princípio central: o aluno **nunca** entra na plataforma sem saber onde parou, o que precisa fazer agora, por que aquilo importa e qual é sua responsabilidade na squad.

---

## Legenda de status

| Símbolo | Significado |
|---|---|
| `[ ]` | Não iniciado |
| `[~]` | Em andamento |
| `[x]` | Concluído |

---

## Acesso durante o desenvolvimento

O curso fica acessível **apenas em ambiente de desenvolvimento** a partir da tela pública, sem login.

```
# .env.local
NEXT_PUBLIC_FORMACAO_PREVIEW=true
```

| Arquivo | Comportamento |
|---|---|
| `app/page.tsx` | Renderiza `<FormacaoDevBanner />` somente quando `NEXT_PUBLIC_FORMACAO_PREVIEW === 'true'` |
| `app/formacao/layout.tsx` | Chama `notFound()` se a variável estiver ausente — retorna 404 em produção |
| Rota aluno | `/formacao` → redireciona para turma ativa ou tela de aguardo |
| Rota instrutor | `/formacao/instrutor` → reusa auth do dashboard (`admin` ou `mentor`) |

O banner no `app/page.tsx` é visualmente discreto (não polui a landing page em produção) e abre `/formacao` em nova aba.

---

## Princípios de UX / AX e vieses cognitivos

Projetado com foco em **pessoas neurodivergentes** (TDAH, autismo, dislexia). Menos cliques, hierarquia clara, recompensa previsível.

| Princípio | Como implementar | Viés / fundamento |
|---|---|---|
| **Bloco de continuidade sempre visível** | Componente `ContinuityLine`: 4 blocos coloridos — parei / estou / importa / próxima ação | Reduz carga cognitiva de re-entrada; elimina "onde eu estava?" a cada sessão |
| **Uma ação primária por tela** | Botão principal `default`; ação secundária `ghost` ou `outline`; nunca dois CTAs do mesmo peso | Sobrecarga de escolha (paradoxo de Schwartz) paralisa usuários com TDAH |
| **Progresso fragmentado e visível** | Progress bar da sprint + barra do projeto + pills de etapas | Efeito Zeigarnik: tarefas incompletas persistem na memória motivando conclusão |
| **Micro-recompensa imediata** | Animação (scale + cor) ao concluir tarefa, registrar daily ou confirmar presença | Dopamina previsível — ciclo de reforço positivo crítico para TDAH |
| **Perda ancorada em streaks** | "6 domingos seguidos · Confirme para não perder a sequência" | Loss-aversion (Kahneman): a dor de perder é 2× maior que o prazer de ganhar |
| **Por que antes de como** | Campo "Por que isso importa" visível antes do formulário em toda tarefa e etapa | Cria sentido antes de exigir ação — reduz resistência de início (task-initiation) |
| **Cor constante por papel** | Badge colorido por papel replicado em todo componente que menciona o papel | Reduz carga de reconhecimento; apoia memória visual e associação rápida |
| **Daily como formulário estruturado** | 5 campos nomeados: Concluído / Andamento / Próximo / Bloqueio / Ajuda | Elimina ansiedade da "página em branco"; estrutura reduz demanda executiva |
| **Inglês por repetição incremental (Slow English)** | 4 frases crescentes da mais curta à completa + vocab badges isolados | Comprehensible input (Krashen); processamento serial favorece autismo e dislexia |
| **Simulação explícita sempre visível** | Badge "empresa fictícia · ambiente de simulação" persistente no topo | Segurança psicológica: erro não tem consequência real — reduz ansiedade de desempenho |
| **Detalhe de etapa sob demanda** | Pills de sequência clicáveis revelam: o que é / por que existe / o que entregar / o que desbloqueia | Progressive disclosure: não sobrecarrega com informação antes da hora |
| **Transparência de histórico** | Atrasos de encontro e daily visíveis no próprio painel do aluno | Responsabilidade sem julgamento externo — o dado é do aluno, não do instrutor |

---

## Diferença em relação ao Sprint Simulator existente

O `sim_*` existente é um **simulador individual**: 1 aluno + 1 mentor, kanban + Monaco IDE + avaliação de código. Produto diferente.

A Órbita é uma **plataforma de formação em squad**: até 5 alunos + 1 instrutor, papéis rotativos, projetos obrigatórios, dailies bilíngues, encontros semanais, certificados. Não reutiliza as tabelas `sim_*`.

---

## Banco de dados — tabelas novas

Prefixo `formacao_*`. Arquivo: `drizzle/manual/formacao_schema.sql`.
Aplicar **manualmente** no Neon (não rodar drizzle-kit — journal dessincronizado).

```
formacao_turmas              cohort: instrutor_id, nome, link_meet, data_inicio, status
formacao_membros             profile_id, turma_id, convidado_em, ativo
formacao_fases               fases 1 e 2 — seed fixo (não editável pelo usuário)
formacao_projetos            5 projetos fixos por fase — seed: landing, site, sistema, sistema_medio, rpa
formacao_requisitos_projeto  itens de requisitos mínimos por projeto (seed)
formacao_etapas              learning_steps por projeto: label, ordem, fase_id, projeto_id
formacao_conteudos           título, explicação, por_que_importa, exemplo, tipo, ordem, status
formacao_conteudo_arquivos   blob_url, nome, tipo, tamanho — vinculado a conteudo_id
formacao_tarefas             título, contexto, motivo, papel_id, projeto_id, etapa_id, prazo, politica_ia, status
formacao_criterios_aceite    texto, ordem, tarefa_id
formacao_entregas            membro_id, tarefa_id, tipo, conteudo, status, versao, criado_em
formacao_feedbacks           instrutor_id, entrega_id, comentario, status_solicitado, criado_em
formacao_encontros           turma_id, numero, data, link_meet, tipo, pauta[], status
formacao_presencas           membro_id, encontro_id, confirmado_em, presenca (confirmado/presente/atrasado/ausente)
formacao_daily_entries       membro_id, encontro_id, concluido_pt, andamento_pt, proximo_pt, bloqueio_pt, ajuda_pt, registrado_em
formacao_daily_ingles        daily_entry_id, frase_completa_en, incrementos jsonb, vocab jsonb, status, observacao_instrutor
formacao_papeis              nome, nome_curto, fase_id, responsabilidades[], cor_token — seed fixo
formacao_atribuicoes_papel   membro_id, papel_id, encontro_id, atribuido_em — imutável (sem DELETE/UPDATE)
formacao_competencias        nome, descricao, fase_id — seed fixo
formacao_certificados        membro_id, fase_id, codigo uuid, emitido_em, emitido_por, competencias_complementares[]
```

### Dados de seed (fixos, não editáveis)

**Fases:**
- Fase 1: Criador de Produtos Digitais com IA
- Fase 2: Desenvolvedor de Software Júnior

**Projetos:**
| # | Nome | Fase |
|---|---|---|
| 1 | Landing page | 1 |
| 2 | Site corporativo | 1 |
| 3 | Sistema simples | 1 |
| 4 | Sistema de complexidade média | 2 |
| 5 | RPA | 2 |

**Papéis da Fase 1** (mínimo 1x cada para Certificado 1):
| Chave | Nome | Cor |
|---|---|---|
| `facilitador` | Facilitador | amber |
| `produto` | Produto e cliente | blue |
| `requisitos` | Processos e requisitos | green |
| `ux` | UX e conteúdo | purple |
| `ia` | Construção com IA e qualidade | cyan |

**Papéis da Fase 2** (mínimo 2x cada para Certificado 2):
| Chave | Nome |
|---|---|
| `facilitador_tecnico` | Facilitador técnico |
| `frontend` | Front-end |
| `backend` | Back-end e banco de dados |
| `qualidade` | Qualidade |
| `automacao` | Automação, deploy e suporte |

---

## Rotas novas

```
app/formacao/
  layout.tsx                   dev gate + auth (aluno via getMenteeAccessSession)
  page.tsx                     redirect para turma ativa ou tela de aguardo

  turma/
    page.tsx                   tela inicial: ContinuityLine + SequenceTrack + role + squad
    tarefa/[id]/page.tsx       detalhe da tarefa + critérios + formulário de entrega
    conteudo/[id]/page.tsx     conteúdo vinculado à etapa
    daily/page.tsx             preparação da daily (5 campos PT+EN)
    ingles/page.tsx            slow english card + incrementos
    rotacao/page.tsx           matriz de papéis do aluno
    encontro/page.tsx          próximo encontro + agenda + squad
    certificados/page.tsx      certificados do aluno

app/formacao/instrutor/
  layout.tsx                   requireRole(['admin', 'mentor'])
  page.tsx                     dashboard do instrutor (alertas + resumo)

  turma/[id]/
    page.tsx                   visão geral da turma
    encontro/[id]/page.tsx     condutor do encontro (daily docs + presença)
    tarefas/page.tsx           gestão de tarefas
    entregas/page.tsx          revisão de entregas
    rotacao/page.tsx           atribuição de papéis
    certificados/page.tsx      emissão de certificados

app/formacao/verificar/[codigo]/page.tsx   verificação pública de certificado

app/api/formacao/              rotas do aluno (getMenteeAccessSession)
app/api/formacao/instrutor/    rotas do instrutor (requireRole admin/mentor)
```

**Padrão de auth para páginas do aluno** (reusa padrão `minhas-mentorias`):
```ts
const session = await getMenteeAccessSession()
if (!session) redirect('/minhas-mentorias')
const profile = await ensureProfileForMenteeEmail(session.email)
// verificar se profile é membro de turma ativa
```

**Padrão de auth para páginas do instrutor** (reusa padrão dashboard):
```ts
import { requireRole } from '@/lib/utils/auth'
await requireRole(['admin', 'mentor'])
```

---

## Rastreador de implementação

### Sprint 1 — Fundação e banco de dados ✅

```
[x] drizzle/manual/formacao_schema.sql — 20 tabelas (sem RLS, padrão sim_*: authz nas rotas)
[x] Seed SQL: fases, projetos, requisitos_projeto, etapas, papéis, competências (idempotente)
[x] Drizzle: 20 tabelas formacao_* + type exports em lib/db/schema.ts
[x] Documentar NEXT_PUBLIC_FORMACAO_PREVIEW em .env.example e .env.local
[x] app/page.tsx: <FormacaoDevBanner /> condicional (só quando NEXT_PUBLIC_FORMACAO_PREVIEW=true)
[x] app/formacao/layout.tsx: notFound() quando variável ausente + metadata noindex
[x] app/formacao/page.tsx: tela de status (sem sessão / sem turma / aguardando / ativa)
[x] lib/db/formacao.ts: getActiveTurmaMembershipForEmail, getAnyTurmaMembershipForEmail, getTurmaById
[x] lib/formacao/preview.ts: isFormacaoPreviewEnabled()
[x] Build OK (pnpm build) + tsc sem erros novos + verificado no browser
```

> **Pendente de ação manual:** aplicar `drizzle/manual/formacao_schema.sql` no console do Neon
> (o journal do drizzle-kit está dessincronizado — não rodar drizzle-kit).
> A rota `/formacao` já funciona (tela de status); as queries de turma retornam vazio até
> o SQL ser aplicado e uma turma ser criada (Sprint 2).

### Sprint 2 — Gestão de turma (instrutor) ✅ (código; verificação DB pendente)

```
[x] Tela: app/formacao/instrutor/turma/[id]/page.tsx — gestão completa da turma
[x] Dashboard: app/formacao/instrutor/page.tsx — lista de turmas + criar turma
[x] Formulário: criar turma (nome, empresa fictícia, link_meet, data_inicio)
[x] Convidar alunos por email + nome — bloqueia 6º no servidor, vincula profile existente
[x] Geração automática de encontros de domingo às 10h (America/Fortaleza, offset -03:00)
[x] Atribuição de papéis por encontro (grade membro→papel, valida fase/turma)
[x] Publicar etapa/tarefas: criação de tarefa c/ projeto/etapa/papel/responsável/critérios
[x] Toggle de status da turma (planejada/ativa/concluída/cancelada)
[x] API: GET/POST /api/formacao/instrutor/turmas
[x] API: GET/PATCH/DELETE /api/formacao/instrutor/turmas/[id]
[x] API: POST /api/formacao/instrutor/turmas/[id]/membros + DELETE [membroId]
[x] API: POST /api/formacao/instrutor/turmas/[id]/encontros/gerar
[x] API: POST /api/formacao/instrutor/turmas/[id]/papeis
[x] API: POST /api/formacao/instrutor/turmas/[id]/tarefas
[x] API: GET /api/formacao/instrutor/referencia (fases/papéis/projetos/etapas)
[x] lib/formacao: schedule.ts (gerarDomingos), validation.ts (zod), auth.ts (guard)
[x] Build OK + tsc sem erros novos
[x] Browser: gate de papel (redireciona p/ login) + regressão /formacao OK
[~] Verificação end-to-end (criar turma etc.) — depende do SQL aplicado no Neon
```

> **Bloqueio de verificação:** o fluxo do instrutor grava nas tabelas `formacao_*`, que
> ainda não existem no Neon. Aplicar `drizzle/manual/formacao_schema.sql` destrava o uso real.
>
> **Nota:** APIs da formação usam **camelCase** (módulo isolado, difere do `sim_*`).

### Sprint 3 — Tela inicial do aluno (re-entrada) ✅

```
[x] ContinuityLine: 4 blocos coloridos (onde parei / onde estou / por que importa / próxima ação)
[x] SequenceTrack: pills horizontais — done (✓) / current (destaque) / locked (🔒)
[x] Detail panel da etapa atual: o que é / por que existe / o que entregar / o que desbloqueia
[x] Header: meta da semana (etapa), countdown em dias, day-track Seg–Dom, barra de progresso
[x] RoleCard: papel atual + responsabilidades + cor constante (lib/formacao/role-colors.ts)
[x] MeetingCard: próximo domingo 10h, número do encontro, pauta, link do Meet
[x] ProjectProgress: nome do projeto, % , entregas (concluída/atual/bloqueada)
[x] SquadPanel: membros, papel, status da daily, confirmação de presença
[x] getTurmaHome: agrega tudo em 1 consulta consolidada (deriva projeto/etapa do encontro)
[x] API: GET /api/formacao/turma/home (mentee-access)
[x] Rota app/formacao/turma/page.tsx + redirect de /formacao quando turma ativa
[x] Build OK + tsc sem erros novos
[x] Smoke check: guards de /formacao/turma redirecionam sem erro (teste do fluxo é manual)
```

> **Derivação de progresso (Sprint 3):** projeto/etapa "atual" vêm do `projeto_id`/`etapa_id`
> do próximo encontro (o instrutor define); fallback = 1º projeto da fase + 1ª etapa. Etapas
> anteriores = concluídas, posteriores = bloqueadas. O detalhamento fino de conclusão chega
> com entregas/aprovações (Sprints 4+).

### Sprint 4 — Tarefa e entrega ✅

```
[x] TaskDetail: título, contexto, "Por que importa" (bloco laranja), critérios, política de IA
[x] Critérios de aceite: checkboxes individuais (toggle via API)
[x] Badge de papel do responsável com cor constante (role-colors)
[x] Formulário de entrega: texto / link / arquivo / áudio / produto / repositório / pull request
[x] Upload de arquivo (Vercel Blob, máx 5MB, categoria "mentorship" — reusa uploadFile)
[x] Status: rascunho → enviada → correção solicitada → aprovada
[x] Histórico de versões: cada reenvio é nova linha (versao = max+1, não sobrescreve)
[x] Feedback do instrutor: comentário + status (tarefa-review-dialog no turma-manager)
[x] Micro-recompensa: banner "Concluída e aprovada!" com animação (RewardBanner)
[x] Fluxo de status: enviar entrega → em_revisão; aprovar → concluída; correção → em_andamento
[x] Link da home para a tarefa atual ("Abrir minha tarefa")
[x] API: GET/PATCH /api/formacao/tarefas/[id] (aluno; status a_fazer/em_andamento/bloqueada)
[x] API: POST /api/formacao/tarefas/[id]/entregas + /entregas/upload
[x] API: PATCH /api/formacao/tarefas/[id]/criterios/[criterioId] (toggle)
[x] API: GET /api/formacao/instrutor/tarefas/[id]
[x] API: PATCH /api/formacao/instrutor/entregas/[id] (aprovar / solicitar correção)
[x] Build OK + tsc sem erros novos
```

> **Regra de conclusão (PRD):** o aluno não conclui a tarefa sozinho — enviar entrega move
> para "em revisão"; só a aprovação do instrutor conclui. Correção devolve para "em andamento".

### Sprint 5 — Daily e presença

```
[ ] DailyCard: 5 campos nomeados com placeholder em PT e tradução EN ao lado
[ ] Status badge: "Pendente · faltam N dias" → "Registrada" (verde) após submit
[ ] Submit registra no feed de atividades da squad
[ ] PresencePanel: streak de encontros seguidos + streak de dailies em dia
[ ] Copy de loss-aversion: "N domingos seguidos · Confirme para não perder a sequência"
[ ] Botão de confirmação de presença no encontro da semana
[ ] Seção de atrasos registrados: transparência sem punição (encontro / daily)
[ ] Histórico mini: 4 sprints anteriores com ícones de status
[ ] API: POST /api/formacao/daily — valida encontro da semana + membro da turma
[ ] API: POST /api/formacao/presenca/confirmar
[ ] API: GET /api/formacao/turma/presenca — streaks e histórico
```

### Sprint 6 — Rotação de papéis

```
[ ] RolesMatrix: tabela membros × 5 papéis com contadores coloridos (≥1 = cor do papel, 0 = muted)
[ ] Indicador pessoal: "Você: N/5 papéis" + progress bar até o certificado
[ ] Painel do instrutor: atribuir papel por membro por encontro (dropdown)
[ ] Validação: cada membro tem 1 papel por encontro (Fase 1); 1+ papéis possíveis em turmas menores
[ ] Histórico imutável: sem DELETE ou UPDATE em formacao_atribuicoes_papel
[ ] Alerta visual: papel ainda não exercido por algum membro (antes do encontro seguinte)
[ ] API: GET /api/formacao/turma/rotacao
[ ] API: POST /api/formacao/instrutor/turmas/[id]/papeis — atribuir papel
[ ] API: GET /api/formacao/instrutor/turmas/[id]/rotacao — matriz completa
```

### Sprint 7 — Condutor do encontro (instrutor)

```
[ ] Tela do encontro: lista de alunos + papel + status da preparação da daily
[ ] Seção por aluno: campo para documentar fala em PT
[ ] Campo para versão em inglês (instrutor digita ou cola, editável)
[ ] Botão de confirmação de presença por membro (toggle)
[ ] Registrar decisões da reunião (campo livre)
[ ] Registrar próximos passos (campo livre)
[ ] Botão "Liberar próxima etapa" (requer: todos com presença registrada)
[ ] API: GET /api/formacao/instrutor/encontros/[id] — dados completos do encontro
[ ] API: PATCH /api/formacao/instrutor/encontros/[id] — atualizar decisões/próximos passos/status
[ ] API: POST /api/formacao/instrutor/encontros/[id]/daily/[membroId] — salvar fala PT + EN
[ ] API: PATCH /api/formacao/instrutor/encontros/[id]/presenca — marcar presença por membro
[ ] API: POST /api/formacao/instrutor/encontros/[id]/liberar-etapa
```

### Sprint 8 — Inglês (Slow English)

```
[ ] EnglishCard: frase-alvo completa + 4 incrementos progressivos numerados
[ ] Vocab badges: palavras-chave isoladas da frase (pill colorida)
[ ] Status de prática: não iniciada / repetida com leitura / repetida com apoio / repetida sem leitura / usada na daily
[ ] Instrutor marca manualmente o estágio atingido (sem avaliação automática de pronúncia)
[ ] Campo de observação do instrutor (feedback qualitativo)
[ ] Botão "Ouvir áudio" (link externo ou Vercel Blob — opcional por frase)
[ ] Aluno vê seu histórico de evoluções de inglês por encontro
[ ] API: GET /api/formacao/turma/daily-ingles/[encontroId]
[ ] API: PATCH /api/formacao/instrutor/daily-ingles/[id] — status + observação
[ ] API: POST /api/formacao/instrutor/daily-ingles/[id]/audio — upload de áudio de referência
```

### Sprint 9 — Projetos, conteúdos e arquivos

```
[ ] 5 projetos com requisitos mínimos e lista de evidências obrigatórias (seed)
[ ] Instrutor pode criar etapas dentro de cada projeto e vincular conteúdos/tarefas
[ ] Conteúdos: tipos texto / vídeo externo / áudio / arquivo / link / checklist
[ ] Upload de arquivos via Vercel Blob — aceitar: PDF, imagem, apresentação, áudio, vídeo-link, código, .pas, GitHub link, link do produto
[ ] Conteúdo sem vínculo (etapa/tarefa/encontro) não aparece na trilha principal do aluno
[ ] Aluno vê materiais da etapa atual de forma contextualizada
[ ] Instrutor pode reordenar conteúdos (campo `ordem`)
[ ] API: GET /api/formacao/conteudos?etapa_id= — retorna conteúdos da etapa
[ ] API: POST /api/formacao/instrutor/conteudos — criar conteúdo
[ ] API: PUT /api/formacao/instrutor/conteudos/[id]
[ ] API: DELETE /api/formacao/instrutor/conteudos/[id]
[ ] API: POST /api/formacao/instrutor/conteudos/upload — Vercel Blob
```

### Sprint 10 — Dashboard do instrutor e alertas

```
[ ] Painel geral: próximo domingo, turma, alunos, papel de cada um, tarefas bloqueadas, entregas pendentes, projetos concluídos
[ ] Alertas automáticos calculados em /api/formacao/instrutor/turmas/[id]/dashboard:
    [ ] Aluno sem tarefa atribuída
    [ ] Aluno sem daily registrada (faltam < 2 dias para o encontro)
    [ ] Aluno repetindo o mesmo papel (Fase 1: deveria rodar)
    [ ] Papel obrigatório ainda não exercido por algum membro
    [ ] Projeto com entrega atrasada
    [ ] Fala em inglês ainda não praticada (status = não iniciada próximo ao encontro)
    [ ] Aluno sem evolução na sequência (etapa não avançou em N semanas)
[ ] Rotações pendentes destacadas com badge vermelho
[ ] Requisitos do certificado: checklist de pré-condições por membro
[ ] API: GET /api/formacao/instrutor/turmas/[id]/dashboard
```

### Sprint 11 — Certificados

```
[ ] Verificação automática de pré-condições (bloqueio com motivo claro):
    Certificado 1: landing ✓ + site ✓ + sistema ✓ + 5 papéis (1x cada) ✓ + dailies ✓ + apresentação ✓
    Certificado 2: sistema_medio ✓ + rpa ✓ + 5 papéis (2x cada) ✓ + fundamentos técnicos ✓ + defesa ✓
[ ] Inglês como competência complementar (texto: "Participou de dailies documentadas e exercícios de comunicação profissional em inglês…")
[ ] Emissão pelo instrutor com 1 clique após todas as condições atendidas
[ ] Certificado com: nome do aluno, fase, data, código UUID verificável
[ ] Tela pública /formacao/verificar/[codigo] (sem auth) — mostra dados do certificado ou "inválido"
[ ] Aluno vê certificados na tela /formacao/turma/certificados
[ ] API: POST /api/formacao/instrutor/certificados — emitir (valida pré-condições no servidor)
[ ] API: GET /api/formacao/verificar/[codigo] — público, sem auth
```

### Sprint 12 — Feed de atividades e polish

```
[ ] SprintActivity: feed cronológico da squad por encontro (daily, nota, arquivo, entrega, decisão, presença)
[ ] Badge "novo" no item mais recente
[ ] Meu item: bg levemente diferenciado; item do colega: padrão
[ ] SprintComposer: registrar anotação / áudio / arquivo — propaga para o feed
[ ] Micro-feedback com animação ao:
    [ ] Concluir uma tarefa
    [ ] Registrar a daily
    [ ] Confirmar presença no encontro
    [ ] Atingir novo nível de prática no inglês
    [ ] Receber aprovação do instrutor em uma entrega
[ ] Acessibilidade:
    [ ] aria-labels em todos os ícones sem texto visível
    [ ] Contraste mínimo WCAG AA (4.5:1 para texto, 3:1 para UI)
    [ ] Focus trap em modais e drawers
    [ ] Navegação por teclado em todos os formulários
[ ] Responsividade mobile-first (breakpoints sm/md/lg do Tailwind)
[ ] Tela pública de verificação de certificado responsiva
[ ] Build sem erros: pnpm build (lint com tsc --noEmit)
```

---

## Telas mapeadas — 21 telas do PRD

### Aluno (12 telas)

| # | Nome no PRD | Rota | Sprint | Status |
|---|---|---|---|---|
| 1 | Login | `/minhas-mentorias` | — | Existe |
| 2 | Início | `/formacao/turma` | 3 | `[ ]` |
| 3 | Minha sequência | `/formacao/turma` (SequenceTrack) | 3 | `[ ]` |
| 4 | Projeto | `/formacao/turma` (ProjectProgress sidebar) | 3+9 | `[ ]` |
| 5 | Tarefa | `/formacao/turma/tarefa/[id]` | 4 | `[ ]` |
| 6 | Conteúdo | `/formacao/turma/conteudo/[id]` | 9 | `[ ]` |
| 7 | Entrega | `/formacao/turma/tarefa/[id]` (formulário inline) | 4 | `[ ]` |
| 8 | Próximo encontro | `/formacao/turma` (NextMeetingCard sidebar) | 3 | `[ ]` |
| 9 | Preparação da daily | `/formacao/turma/daily` | 5 | `[ ]` |
| 10 | Minha daily em inglês | `/formacao/turma/ingles` | 8 | `[ ]` |
| 11 | Minha rotação | `/formacao/turma/rotacao` | 6 | `[ ]` |
| 12 | Certificados | `/formacao/turma/certificados` | 11 | `[ ]` |

### Instrutor (11 telas)

| # | Nome no PRD | Rota | Sprint | Status |
|---|---|---|---|---|
| 1 | Login | `/login` | — | Existe |
| 2 | Turma | `/formacao/instrutor/turma/[id]` | 2 | `[ ]` |
| 3 | Sequência da turma | `/formacao/instrutor/turma/[id]` (visão completa) | 2+10 | `[ ]` |
| 4 | Projetos | `/formacao/instrutor/turma/[id]` (seção projetos) | 9 | `[ ]` |
| 5 | Tarefas | `/formacao/instrutor/turma/[id]/tarefas` | 4 | `[ ]` |
| 6 | Entregas | `/formacao/instrutor/turma/[id]/entregas` | 4 | `[ ]` |
| 7 | Encontro de domingo | `/formacao/instrutor/turma/[id]/encontro/[id]` | 7 | `[ ]` |
| 8 | Dailies | `/formacao/instrutor/turma/[id]/encontro/[id]` (seção daily) | 7+8 | `[ ]` |
| 9 | Rotações | `/formacao/instrutor/turma/[id]/rotacao` | 6 | `[ ]` |
| 10 | Avaliação | `/formacao/instrutor/turma/[id]/entregas` | 4 | `[ ]` |
| 11 | Certificados | `/formacao/instrutor/turma/[id]/certificados` | 11 | `[ ]` |

### Pública (1 tela)

| # | Nome | Rota | Sprint | Status |
|---|---|---|---|---|
| 1 | Verificação de certificado | `/formacao/verificar/[codigo]` | 11 | `[ ]` |

---

## Regras críticas de negócio

Manter aqui para consulta durante implementação. Não implementar fora dessas regras.

### Turma
- Máximo de 5 alunos por turma. O 6º deve ser bloqueado no servidor (não só na UI).
- Cada turma tem exatamente 1 instrutor (role `admin` ou `mentor`).
- Cada turma percorre as 2 fases sequencialmente. Fase 2 exige conclusão da Fase 1 (ou liberação manual do instrutor).

### Agenda
- Encontros sempre aos domingos, 10h, fuso `America/Fortaleza`.
- A geração automática calcula os próximos N domingos a partir de `data_inicio` da turma.
- O link do Google Meet é único por turma, mas pode ser alterado pelo instrutor. Alteração reflete imediatamente para todos os membros.

### Projetos
- Fase 1: landing page → site corporativo → sistema simples (nesta ordem, cada um desbloqueado após aprovação do anterior).
- Fase 2: sistema médio → RPA (mesma lógica).
- Cada projeto tem requisitos mínimos fixos (seed) e evidências obrigatórias.
- O projeto seguinte permanece bloqueado até aprovação do atual.

### Papéis
- Fase 1: cada aluno deve exercer cada um dos 5 papéis ao menos **1 vez** → Certificado 1.
- Fase 2: cada aluno deve exercer cada um dos 5 papéis ao menos **2 vezes** → Certificado 2.
- Toda atribuição registra `atribuido_em` e `encontro_id` — não pode ser apagada ou editada.
- Em turmas com menos de 5 alunos: um aluno pode ter mais de 1 papel no mesmo encontro, mas os papéis são registrados separadamente.

### Daily
- Cada aluno tem 1 registro de daily por encontro (5 campos estruturados em PT).
- Cada daily tem 1 versão em inglês (campo separado), com incrementos e vocabulário.
- A prática em inglês é marcada manualmente pelo instrutor — sem avaliação automática de pronúncia.
- Daily registrada fora do prazo (após o encontro) conta como "atrasada" (não bloqueia, mas fica visível no histórico).

### Progresso
- O progresso não depende apenas de conteúdos abertos. Depende de: tarefas concluídas, entregas aprovadas, papéis exercidos, projetos finalizados e presença nos encontros.
- O aluno sempre visualiza a etapa atual e o motivo (campo "por que existe").
- A próxima etapa só é liberada pelo instrutor após o encontro de fechamento.

### Certificados
- O sistema verifica automaticamente todas as condições antes de habilitar o botão "Emitir".
- O código de verificação é um UUID gerado no momento da emissão. Não pode ser regenerado.
- O inglês aparece como competência complementar — nunca como certificação de proficiência.

---

## O que não entra no MVP

Manter aqui para evitar scope creep durante o desenvolvimento.

- Marketplace de freelancers
- Pagamentos ou faturamento
- Chat em tempo real
- Videoconferência própria
- Criação automática de Google Meet
- Integração avançada com Google Calendar
- Transcrição automática de áudio/vídeo
- Avaliação automática de pronúncia em inglês
- Geração automática de conteúdos com IA
- Editor visual de processos ou fluxogramas
- IDE dentro da plataforma (não confundir com o Sprint Simulator existente — este é separado)
- Execução de Pascal
- Integração avançada com GitHub (pull requests automáticos, CI/CD)
- Gamificação com pontos, ranking ou badges colecionáveis
- Aplicativo mobile nativo
- Múltiplas escolas ou organizações
- Múltiplos instrutores por turma
- Acesso de cliente externo
- Relatórios financeiros
- Notificações por push ou e-mail (pode vir em fase posterior)

---

## Componentes do protótipo para adaptar

O protótipo usa Tailwind v4 com tokens OKLCH. Adaptar para Tailwind v3 + CSS vars do projeto (`#0d1117` background, `#3B82F6` primary).

| Componente do protótipo | Arquivo | Adaptar para |
|---|---|---|
| `ContinuityLine` | `components/continuity-line.tsx` | `components/formacao/continuity-line.tsx` |
| `SequenceTrack` | `components/sequence-track.tsx` | `components/formacao/sequence-track.tsx` |
| `SprintHeader` | `components/sprint-header.tsx` | `components/formacao/formacao-header.tsx` |
| `CurrentTaskCard` | `components/current-task-card.tsx` | `components/formacao/task-card.tsx` |
| `DailyCard` | `components/daily-card.tsx` | `components/formacao/daily-card.tsx` |
| `EnglishCard` | `components/english-card.tsx` | `components/formacao/english-card.tsx` |
| `PresencePanel` | `components/presence-panel.tsx` | `components/formacao/presence-panel.tsx` |
| `CurrentRoleCard` | `components/meeting-role-cards.tsx` | `components/formacao/role-card.tsx` |
| `NextMeetingCard` | `components/meeting-role-cards.tsx` | `components/formacao/meeting-card.tsx` |
| `ProjectProgress` | `components/project-progress.tsx` | `components/formacao/project-progress.tsx` |
| `SquadPanel` | `components/squad-panel.tsx` | `components/formacao/squad-panel.tsx` |
| `RolesMatrix` | `components/roles-matrix.tsx` | `components/formacao/roles-matrix.tsx` |
| `SprintActivity` | `components/sprint-activity.tsx` | `components/formacao/activity-feed.tsx` |
| `SprintComposer` | `components/sprint-composer.tsx` | `components/formacao/composer.tsx` |
| `RoleBadge` | `components/role-badge.tsx` | `components/formacao/role-badge.tsx` |
| `TopBar` | `components/top-bar.tsx` | integrar no layout `/formacao` |
