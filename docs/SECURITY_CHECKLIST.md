# Checklist de Seguranca e Privacidade

Este checklist organiza os pontos levantados na revisao defensiva da plataforma, com foco em reduzir risco de roubo de dados, abuso de contas, exposicao indevida de PII e falhas de conformidade com LGPD.

## Como Usar

- Prioridade **P0**: corrigir antes de novas funcionalidades sensiveis.
- Prioridade **P1**: corrigir na proxima sprint de seguranca.
- Prioridade **P2**: hardening continuo.
- Marcar cada item somente quando houver implementacao, teste e revisao.

---

## P0 - Controle de Acesso e Dados Sensiveis

### 1. Bloquear escalada de `role` via RLS

**Risco:** usuario alterar o proprio `role` no Supabase e ganhar acesso `admin` ou `hr`.

- [ ] Revisar a policy `Users can update own profile` em `supabase/schema.sql`.
- [ ] Impedir que usuarios comuns atualizem `role`, `email`, `password_hash` e campos administrativos.
- [ ] Criar trigger no banco para rejeitar mudanca de `role` quando o ator nao for admin.
- [ ] Separar roles em tabela dedicada, se for manter Supabase Auth como fonte principal.
- [ ] Adicionar teste de RLS tentando atualizar `profiles.role` como usuario `mentee`.
- [ ] Adicionar teste garantindo que admin autorizado ainda consegue alterar role quando necessario.

**Criterio de aceite:** nenhuma requisicao autenticada como `mentee` consegue mudar `role`, mesmo usando client Supabase direto.

### 2. Proteger `site_settings` e tokens do Google Calendar

**Risco:** `site_settings` tem leitura publica e pode conter `refresh_token` do Google Calendar.

- [ ] Remover leitura publica ampla de `site_settings`.
- [ ] Mover `google_calendar.refresh_token` para secret store/env var ou tabela privada sem acesso anonimo.
- [ ] Se a tabela continuar existindo, criar allowlist de chaves publicas que podem ser lidas.
- [ ] Redigir valores sensiveis no endpoint `/api/admin/settings`.
- [ ] Criar migracao para remover tokens ja salvos em texto claro, apos migrar para local seguro.
- [ ] Adicionar teste garantindo que anonimo nao le `google_calendar`.
- [ ] Adicionar teste garantindo que admin recebe apenas metadados seguros, como `connected_at` e `is_connected`.

**Criterio de aceite:** nenhum token OAuth aparece em resposta publica, resposta admin, logs ou payload do browser.

### 3. Unificar modelo de autenticacao

**Risco:** registro via Supabase Auth e login por cookie proprio podem causar sessao, RLS e permissoes inconsistentes.

- [ ] Decidir fonte unica de autenticacao: Supabase Auth ou auth propria.
- [ ] Se usar Supabase Auth, remover `password_hash` proprio e fazer login via Supabase.
- [ ] Se usar auth propria, remover fluxos Supabase Auth do registro e ajustar RLS para nao depender de `auth.uid()`.
- [ ] Revisar middleware para validar sessao real, nao apenas existencia do cookie.
- [ ] Rotacionar sessoes antigas apos a migracao.
- [ ] Adicionar MFA obrigatoria para `admin` e recomendada para `hr`.
- [ ] Adicionar teste de login, logout, expiracao e acesso a rotas protegidas.

**Criterio de aceite:** o mesmo usuario, sessao e role sao usados por API routes, dashboard e politicas de banco.

### 4. Tornar curriculos e uploads pessoais privados

**Risco:** curriculos sao enviados para Vercel Blob com `access: "public"`.

- [ ] Separar categorias de upload publicas e privadas.
- [ ] Alterar upload de curriculo para storage privado ou caminho protegido por rota autenticada.
- [ ] Gerar URL assinada de curta duracao para admin/HR autorizado.
- [ ] Remover nome original do arquivo do pathname quando o arquivo contiver PII.
- [ ] Validar MIME real e extensao, nao apenas `file.type`.
- [ ] Registrar auditoria de acesso/download de curriculo.
- [ ] Criar job ou rotina para apagar blobs antigos substituidos.
- [ ] Adicionar teste: usuario nao autenticado nao acessa curriculo.
- [ ] Adicionar teste: HR/admin autorizado acessa curriculo via endpoint protegido.

**Criterio de aceite:** curriculos nao sao acessiveis por URL publica permanente.

### 5. Reduzir dados expostos para HR

**Risco:** perfil de mentorado retorna email, WhatsApp, curriculo, bio e portfolio para `hr` sem minimizacao.

- [ ] Criar DTO separado para `admin` e `hr` em `/api/admin/mentees`.
- [ ] Para `hr`, retornar somente campos necessarios para busca profissional.
- [ ] Ocultar email, WhatsApp e curriculo ate uma acao autorizada ou consentimento explicito.
- [ ] Limitar `pageSize` maximo e exigir busca minima quando houver dados sensiveis.
- [ ] Registrar auditoria de consultas por HR.
- [ ] Adicionar filtros de finalidade, por exemplo "busca de candidatos".
- [ ] Adicionar teste garantindo que HR nao recebe campos de contato por padrao.
- [ ] Adicionar teste garantindo que admin continua recebendo visao completa.

**Criterio de aceite:** HR nao consegue listar PII de contato em massa sem permissao/finalidade.

---

## P1 - Conta, Sessao e Abuso de API

### 6. Proteger login contra credential stuffing

**Risco:** tentativas automatizadas de senha reutilizada contra contas admin/HR.

- [ ] Implementar rate limit por IP, email e combinacao IP+email.
- [ ] Aplicar backoff progressivo apos falhas.
- [ ] Registrar tentativas falhas, sucesso apos muitas falhas e login em admin/HR.
- [ ] Alertar admin em padroes suspeitos.
- [ ] Bloquear senhas fracas e revisar politica minima atual.
- [ ] Adicionar checagem de senhas comprometidas quando possivel.
- [ ] Exigir MFA para admin.
- [ ] Adicionar teste de rate limit em `/api/auth/login`.
- [ ] Adicionar teste garantindo que mensagem de erro nao enumera usuarios.

**Criterio de aceite:** ataques automatizados de login sao desacelerados, auditados e alertados.

### 7. Evitar atualizacao de perfil por email em bookings publicos

**Risco:** endpoint publico de booking pode sobrescrever nome/WhatsApp de perfil existente apenas por email.

- [ ] Alterar `ensureMenteeProfile` para nao atualizar dados de perfil existente em fluxo publico.
- [ ] Salvar nome/WhatsApp do formulario apenas no booking quando usuario nao estiver autenticado.
- [ ] Atualizar perfil somente apos login ou verificacao por codigo enviado ao email.
- [ ] Criar teste: booking publico com email existente nao altera `profiles.whatsapp`.
- [ ] Criar teste: usuario autenticado consegue atualizar seu proprio perfil via endpoint correto.

**Criterio de aceite:** dados permanentes do perfil nao sao modificados por terceiros que apenas conhecem o email.

### 8. Adicionar defesa contra CSRF em mutations

**Risco:** POST/PUT/DELETE sensiveis usam cookie e podem ser acionados por origem maliciosa.

- [ ] Validar `Origin` e `Host` em todas as API routes autenticadas com mutacao.
- [ ] Adicionar CSRF token para formularios/admin dashboard, se necessario.
- [ ] Manter cookies `httpOnly`, `secure` em producao e avaliar `sameSite: "strict"` para sessoes sensiveis.
- [ ] Bloquear requests com `Content-Type` inesperado em JSON endpoints.
- [ ] Adicionar teste de mutation com `Origin` externo.
- [ ] Adicionar teste de mutation com `Origin` valido.

**Criterio de aceite:** rotas autenticadas de escrita rejeitam chamadas cross-site nao autorizadas.

### 9. Restringir URLs externas

**Risco:** campos como `application_url`, `link_url`, `portfolio_url` e `linkedin_url` aceitam qualquer URL valida.

- [ ] Criar helper de validacao para permitir somente `http://` e `https://`.
- [ ] Preferir `https://` para links publicos.
- [ ] Bloquear protocolos como `javascript:`, `data:`, `file:`, `blob:` e similares.
- [ ] Normalizar e salvar URLs em formato canonico.
- [ ] Aplicar validacao nos endpoints de vagas, anuncios, conteudos e perfil.
- [ ] Adicionar teste para rejeicao de protocolos perigosos.
- [ ] Adicionar teste para links validos `https://`.

**Criterio de aceite:** nenhum link salvo no banco pode executar script ou abrir protocolo perigoso no browser.

### 10. Adicionar headers de seguranca

**Risco:** falta de CSP, HSTS, frame protection e politicas de browser.

- [ ] Configurar `Content-Security-Policy` em `next.config.mjs` ou middleware.
- [ ] Incluir `frame-ancestors 'none'` ou origem permitida para prevenir clickjacking.
- [ ] Incluir `Strict-Transport-Security` em producao.
- [ ] Incluir `Referrer-Policy`.
- [ ] Incluir `Permissions-Policy`.
- [ ] Avaliar `X-Content-Type-Options: nosniff`.
- [ ] Validar que CSP permite apenas scripts, imagens e conexoes necessarias.
- [ ] Adicionar teste ou script que verifica headers em rotas principais.

**Criterio de aceite:** paginas publicas e dashboard retornam headers de seguranca consistentes em producao.

### 11. Escapar HTML em templates de email

**Risco:** campos de usuario sao interpolados em HTML de email.

- [ ] Criar helper `escapeHtml`.
- [ ] Escapar nome, email, WhatsApp, tema, observacoes e qualquer texto livre.
- [ ] Validar links antes de inserir em atributos `href`.
- [ ] Manter apenas HTML controlado pela aplicacao sem escape.
- [ ] Adicionar teste snapshot com caracteres especiais e tentativa de tag HTML.
- [ ] Adicionar teste garantindo que links `mailto:` e WhatsApp continuam funcionando.

**Criterio de aceite:** dados enviados por usuario aparecem como texto no email, nunca como HTML executavel.

---

## P1 - LGPD e "Minhas mentorias"

### 12. Solicitar exclusao total de dados em "Minhas mentorias"

**Risco:** usuario nao tem fluxo claro para exercer direito de exclusao; dados continuam ativos enquanto a exclusao manual nao acontece.

- [ ] Adicionar acao visivel em `/minhas-mentorias/historico`: "Solicitar exclusao dos meus dados".
- [ ] Exibir modal explicando impacto: acesso ao historico sera inativado imediatamente e a exclusao definitiva sera processada pelo admin.
- [ ] Exigir confirmacao explicita antes de enviar a solicitacao.
- [ ] Criar tabela `data_deletion_requests` com `id`, `email`, `requested_at`, `status`, `auto_inactivated_at`, `admin_notified_at`, `completed_at`, `notes`.
- [ ] Criar endpoint autenticado pela sessao de "Minhas mentorias", por exemplo `POST /api/minhas-mentorias/data-deletion/request`.
- [ ] No momento da solicitacao, inativar automaticamente os dados do usuario na plataforma:
  - [ ] Encerrar sessoes em `mentee_access_sessions`.
  - [ ] Invalidar codigos em `mentee_access_codes`.
  - [ ] Marcar perfil/mentorias como inativos ou anonimizados para areas publicas e listagens operacionais.
  - [ ] Remover acesso a historico e PDF de "Minhas mentorias".
  - [ ] Bloquear novos usos do mesmo email ate decisao admin ou recriacao consentida.
- [ ] Notificar Adriano por email/notification interna com dados minimos para concluir a exclusao.
- [ ] Criar tela/admin badge para solicitacoes LGPD pendentes.
- [ ] Criar acao admin de conclusao:
  - [ ] Apagar ou anonimizar `profiles`.
  - [ ] Apagar ou anonimizar `bookings`, observacoes, pontos fortes, pontos de melhoria e notas.
  - [ ] Apagar `payments` quando nao houver obrigacao legal de retencao; caso haja, reter apenas o minimo legal.
  - [ ] Apagar `job_actions`.
  - [ ] Apagar curriculo no Blob/storage.
  - [ ] Apagar sessoes e codigos de acesso.
  - [ ] Registrar `completed_at` e operador admin.
- [ ] Enviar confirmacao ao usuario quando a exclusao for concluida, se ainda houver email permitido para contato.
- [ ] Garantir que respostas publicas nao revelem se o email existe.
- [ ] Adicionar teste: solicitacao valida inativa acesso imediatamente.
- [ ] Adicionar teste: apos solicitacao, PDF e historico retornam 401/403 ou tela de dados inativados.
- [ ] Adicionar teste: admin recebe notificacao ou registro pendente.
- [ ] Adicionar teste: execucao admin remove/anonimiza dados conforme politica.

**Criterio de aceite:** a simples solicitacao do usuario ja remove seus dados da experiencia ativa da plataforma e gera notificacao para exclusao definitiva.

**Observacao LGPD:** se existir obrigacao legal ou contratual de reter algum dado, manter apenas o minimo necessario, com finalidade documentada, acesso restrito e dados pessoais anonimizados sempre que possivel.

---

## P2 - Monitoramento, Auditoria e Resiliencia

### 13. Criar auditoria de acesso a PII

**Risco:** roubo de dados muitas vezes ocorre por conta valida e so aparece como leitura anormal.

- [ ] Criar tabela `audit_logs`.
- [ ] Registrar login admin/HR, falhas de login, leitura de mentorados, download de curriculos e mudanca de role.
- [ ] Registrar IP, user agent, usuario, rota, acao e timestamp.
- [ ] Evitar salvar segredos, tokens ou conteudo completo de PII no log.
- [ ] Criar painel simples de eventos recentes para admin.
- [ ] Alertar em volume anormal de leituras/exportacoes.
- [ ] Adicionar teste unitario para helper de auditoria.

**Criterio de aceite:** acessos sensiveis ficam rastreaveis sem expor mais dados no proprio log.

### 14. Limitar paginacao e consultas amplas

**Risco:** endpoints com `pageSize` livre podem facilitar scraping de dados.

- [ ] Definir limite maximo global de `pageSize`, por exemplo 50.
- [ ] Validar `page` e `pageSize` com Zod.
- [ ] Exigir filtros ou busca minima para endpoints com PII.
- [ ] Aplicar rate limit a listagens admin/HR.
- [ ] Adicionar teste para `pageSize` acima do maximo.

**Criterio de aceite:** nenhuma listagem sensivel retorna volume alto de dados por uma unica chamada.

### 15. Revisar endpoints publicos de tracking e contadores

**Risco:** contadores publicos podem ser abusados para inflar metricas ou causar carga.

- [ ] Aplicar rate limit em `/api/share`, `/api/jobs/[id]/track`, `/api/ads/[id]/track` e `/api/content/[id]/view`.
- [ ] Validar UUID dos parametros antes de consultar banco.
- [ ] Ignorar eventos repetidos por visitante quando possivel.
- [ ] Para anuncios com `max_clicks`, impedir que trafego falso desative anuncio indevidamente.
- [ ] Adicionar teste de rate limit e evento invalido.

**Criterio de aceite:** tracking publico nao permite degradar metricas ou desativar anuncio por spam simples.

### 16. Endurecer pipeline de build e tipos

**Risco:** `ignoreBuildErrors: true` pode esconder falhas de tipo em producao.

- [ ] Remover `typescript.ignoreBuildErrors` de `next.config.mjs`.
- [ ] Corrigir erros de TypeScript existentes.
- [ ] Garantir `pnpm build` em CI.
- [ ] Garantir `pnpm test` em CI.
- [ ] Adicionar checagem de migracoes/schema antes de deploy.

**Criterio de aceite:** build de producao falha quando houver erro de tipo relevante.

---

## Ordem Recomendada de Execucao

1. Corrigir RLS de `role` e proteger `site_settings`.
2. Decidir e unificar autenticacao.
3. Privar curriculos e reduzir dados para HR.
4. Implementar rate limit, MFA e CSRF/origin checks.
5. Implementar fluxo LGPD de exclusao em "Minhas mentorias".
6. Adicionar headers, escape de email e validacao de URLs.
7. Criar auditoria, limites de consulta e hardening de build.
