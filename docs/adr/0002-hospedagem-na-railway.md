# 0002. App, banco e capas ficam na Railway

Data: 19 de outubro de 2026. Situação: aceita.

## Contexto

O app nunca teve deploy. O repo estava montado para a Vercel (`vercel.json` e um script que enviava o `.env`), e o banco era o projeto cloud do Supabase em `sa-east-1`, São Paulo, que também guardava as capas no Storage público.

O dono quer tudo na Railway. A Railway tem 4 regiões: Califórnia, Virgínia, Amsterdã e Singapura. Nenhuma fica na América do Sul.

Medido daqui em 19 de outubro (mediana de 5 conexões TCP): 18 ms até o Supabase em São Paulo e 134 ms até a AWS na Virgínia.

## Decisão

O serviço `web`, o `Postgres` e o bucket `capas` ficam no projeto `cursos` da Railway, todos em `iad` (Virgínia).

- O app chega ao banco pela rede interna da Railway.
- O bucket da Railway é privado, então a capa sai pela rota `/capa/[chave]` do app. `externos/capas.ts` envia e lê pela API S3 com assinatura (`aws4fetch`).
- O `preDeployCommand` roda as migrações do Drizzle antes de cada deploy.
- Saem o `vercel.json`, o `scripts/sync-vercel-env.ts`, os scripts `deploy*` e `env:*` e as variáveis `VERCEL_*`.

App na Railway com o banco no Supabase em São Paulo foi descartado: cada consulta atravessaria cerca de 115 ms, e as consultas dentro da trava do aluno rodam em série.

## Consequências

- Cada request do aluno no Brasil paga cerca de 130 ms até a Virgínia. As consultas ao banco ficam abaixo de 1 ms.
- A Vercel em `gru1` com o Supabase em São Paulo daria cerca de 20 ms por request. Se a latência pesar, essa é a volta.
- A capa passa pelo app: a saída de rede do serviço é cobrada, e o `cache-control` de um ano (a chave é o hash) faz o browser pedir cada capa uma vez.
- O dev usa o ambiente `development` do mesmo projeto, com `Postgres-dev` e `capas-dev`. Os testes de integração rodam num container `postgres:17-alpine`, e o Supabase sai do repo.
