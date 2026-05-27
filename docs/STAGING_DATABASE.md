# Banco Stage

O banco stage deve ser recriado a partir de um dump atual de producao e, logo
depois, anonimizado. O script versionado faz as duas etapas em sequencia para
evitar que dados reais fiquem disponiveis no ambiente de testes.

## Variaveis

Configure localmente, sem commitar:

```env
PROD_DATABASE_URL=postgres://...
STAGE_DATABASE_URL=postgres://...
STAGE_RESET_CONFIRM=RESET STAGE
```

`PROD_DATABASE_URL` e `STAGE_DATABASE_URL` precisam apontar para bancos
diferentes. O script apaga e recria objetos do banco stage durante o restore.

## Executar

```bash
pnpm db:stage:from-prod
```

Requisitos locais:

- `pg_dump`, `pg_restore` e `psql` no `PATH`.
- Permissao de leitura no banco de producao.
- Permissao de escrita/reset no banco stage.

Ao final, o dump temporario e removido automaticamente de `.tmp/stage-dumps/`.
Use `--keep-dump` apenas para diagnostico local e apague o arquivo depois.

## Dados Ficticios

O SQL em `supabase/stage/anonymize.sql` substitui emails, nomes, WhatsApp,
links pessoais, curriculos, sessoes, tokens privados e metadados sensiveis por
valores ficticios. Contagens, relacionamentos e status operacionais sao
preservados para manter o comportamento parecido com producao.

Senha conhecida para perfis anonimizados que usam o auth proprio:

```text
Stage123!Senha
```
