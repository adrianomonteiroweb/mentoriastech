# 🧪 Sprint Simulator — Simulação de Ambiente Real de Desenvolvimento

## 🎯 Objetivo

Simular o dia a dia de um desenvolvedor júnior dentro de uma empresa fictícia, reproduzindo fluxos reais de trabalho como:

- Sprints
- Kanban
- Dailies assíncronas
- Code review
- Implementação de tasks
- Feedback de mentor (Tech Lead simulado)

O foco não é apenas resolver exercícios, mas aprender como funciona o trabalho real em equipe de desenvolvimento.

---

# 🏢 Estrutura Geral da Sprint

Cada usuário participa de uma sprint com duração configurável (1 a 2 semanas).

```text
Sprint #01

Dia 1 de 10

Objetivo da Sprint:
- Criar API de produtos
- Implementar autenticação
- Estruturar arquitetura base
```

📋 Kanban da Sprint

A sprint é gerenciada através de um Kanban interativo.

Backlog

- Criar produtos
- Criar categorias

To Do

- Product Service

Doing

- Product Controller

Review

- Repository

Done

- Setup inicial

Estados possíveis:
Backlog
To Do
Doing
Review
Done

💬 Daily Assíncrona (Chat com Mentor)

A daily funciona como um chat não-síncrono entre mentor e aluno.

📌 Funcionalidades
✔ Atualizações do aluno
Progresso diário
Bloqueios
Dúvidas
Conclusão de tasks

Exemplo:

Hoje vou implementar o ProductService.
Estou com dificuldade na validação de dados.
Concluí a Task #12.

👨‍🏫 Respostas do mentor
Dicas guiadas
Feedback técnico
Direcionamento sem entregar solução pronta
Correções conceituais

Exemplo:

Boa execução até aqui.

Revise a responsabilidade do controller.
Tente mover regras de negócio para o service.

📊 Ajuste de pontuação manual

O mentor pode ajustar a pontuação do aluno:

Exemplo:

+3 pontos
Boa separação de responsabilidades.

-5 pontos
Regra de negócio dentro do controller.

💻 Workspace de Desenvolvimento

O aluno trabalha em um ambiente semelhante ao VS Code usando Monaco Editor.

Funcionalidades:
Editor de código
Múltiplos arquivos
Estrutura de pastas
Navegação tipo IDE
Suporte a TypeScript/JavaScript

📁 Exemplo de estrutura

src/
├── controllers/
├── services/
├── repositories/
├── routes/
├── middlewares/
├── app.ts
└── server.ts

🧠 Tipos de Tarefas (Tasks)

Cada sprint contém tasks reais simuladas.

Exemplo:

Task #248

Criar endpoint POST /products

Critérios:

- Controller separado
- Service implementado
- Repository utilizado
- Status 201 retornado

Tipos de tasks:
Implementação de feature
Correção de bug
Refatoração
Ajuste de arquitetura
Evolução incremental
🧪 Avaliação Automática

A plataforma avalia o aluno de forma objetiva (sem IA na primeira versão).

Critérios:
Estrutura de pastas
Nomeação de arquivos
Separação de responsabilidades
Qualidade do código
Imports corretos
Execução de testes
Regras de arquitetura

📊 Exemplo de pontuação

Estrutura: 90
Código: 85
Testes: 100
Arquitetura: 80

Nota final: 88

🧑‍💻 Papel do Mentor (Tech Lead Simulado)

O mentor atua como um Tech Lead dentro da empresa fictícia.

Responsabilidades:
Responder dúvidas na daily
Dar feedback técnico
Criar novas tasks durante a sprint
Aprovar ou reprovar entregas
Ajustar pontuação automática
Orientar boas práticas
Simular revisão de código (code review humano)
🔄 Fluxo de uma Task

Backlog → To Do → Doing → Review → Done

Possíveis ações:
Mover task entre estados
Solicitar ajustes
Reabrir task
Aprovar task
🧾 Code Review

Ao finalizar uma task, o sistema gera um review automático + mentor.

Exemplo:
✔ Boa separação de responsabilidades
✔ Service bem implementado
⚠ Controller com lógica de negócio
⚠ Falta tratamento de erro
📅 Linha do Tempo da Sprint

Toda ação fica registrada automaticamente:

Dia 1 - Sprint iniciada
Dia 1 - Task #12 em andamento
Dia 2 - Daily enviada
Dia 2 - Dica do mentor recebida
Dia 3 - Task enviada para review
Dia 4 - Ajustes solicitados
Dia 5 - Task aprovada
🧩 Progressão de Dificuldade
Nível 1

Estrutura de projeto (criação de pastas e arquivos)

Nível 2

Completar arquivos existentes

Nível 3

Corrigir estrutura de projeto

Nível 4

Corrigir bugs

Nível 5

Implementar feature completa

Nível 6

Refatoração e melhoria de arquitetura

🏢 Empresas Fictícias (Contextos de Sprint)

Cada empresa simula um ambiente real diferente:

🚀 Startup
Estrutura flexível
Alta velocidade
Pouca burocracia
🧩 SaaS
Arquitetura modular
Escalabilidade média
Boas práticas de organização
🏦 Enterprise
Clean Architecture
Regras rígidas
Forte padronização
📊 Avaliação Final da Sprint

Ao final da sprint o aluno recebe:

Nota final geral
Evolução ao longo dos dias
Feedback do mentor
Pontos fortes e fracos
Histórico completo da sprint
Recomendações de melhoria
🧠 Filosofia da Plataforma

O objetivo não é apenas avaliar código, mas sim simular um ambiente real de trabalho.

Isso inclui:

Trabalho em equipe
Comunicação com Tech Lead
Entrega contínua de tasks
Leitura de documentação
Seguir padrões de arquitetura
Evolução incremental de código
🏁 Conclusão

A Sprint Simulator transforma testes técnicos tradicionais em uma simulação completa de ambiente corporativo.

Em vez de resolver exercícios isolados, o desenvolvedor passa por um fluxo completo de:

planejamento
desenvolvimento
revisão
feedback
evolução contínua

Isso prepara o aluno para o que realmente acontece no mercado de trabalho.

o editor na plataforma será usando o https://github.com/microsoft/monaco-editor
