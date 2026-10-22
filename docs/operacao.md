# Operação

O detalhe da infraestrutura, do env, do banco, do deploy e do Clerk. As regras que valem em toda sessão ficam no `CLAUDE.md` da raiz; este arquivo guarda o como e o porquê.

## Railway como código

`.railway/railway.ts` descreve o projeto `cursos` da Railway: o serviço `web` em `cursos.profills.com`, o `Postgres` e os buckets `capas` e `materiais`, todos em `iad`, Virgínia. O DNS de `profills.com` fica na KingHost: um CNAME `cursos` para o alvo que a Railway deu e o TXT `_railway-verify.cursos`. `railway config plan` mostra a diferença para o que está no ar.

## Env (varlock)

- `packages/db/.env.schema` importa `NODE_ENV` e `DATABASE_*` do app.
- `@defaultSensitive=true` marca toda variável como segredo. O caso que derrubou o request foi o `CLERK_PUBLISHABLE_KEY` sem `@public`.
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` apontam o bucket das capas e são opcionais. Sem uma delas, o envio de capa do admin recusa com "não configurado" e o resto funciona. O bucket é privado: a capa sai pela rota `/capa/[chave]` do app. Na Railway elas são referências ao bucket (`${{capas.ENDPOINT}}` e as outras), menos `S3_REGION`, que vale `auto`. Endpoint, região e nome do bucket levam `@sensitive=false`: a palavra `auto` aparece em todo JS, e o varlock derrubava o build acusando vazamento.
- `S3_MATERIAIS_BUCKET`, `S3_MATERIAIS_ACCESS_KEY_ID` e `S3_MATERIAIS_SECRET_ACCESS_KEY` apontam o bucket do material de apoio e são opcionais; o endpoint e a região são os de `S3_ENDPOINT` e `S3_REGION`, que a Railway dá iguais a todo bucket. Sem uma delas, o envio de material recusa com "não configurado" e o resto funciona. O bucket é privado: o arquivo sai pela rota `/material/[id]`, só para o admin e para quem a página do curso abre. Na Railway elas são referências ao bucket `materiais` (`${{materiais.BUCKET}}` e as outras), postas no painel; o IaC só as preserva.
- Na Railway, `CORS_ORIGIN` vale `https://cursos.profills.com`, o domínio do `web`, e `DATABASE_URL` vale `${{Postgres.DATABASE_URL}}`, pela rede interna. As chaves do Clerk são as mesmas `pk_test`/`sk_test` do dev.

## Coleta de órfãos

`bun run coletar-orfaos`, da raiz, apaga dos buckets a capa trocada e o material tirado do curso, que a chave em sha256 deixaria lá para sempre. Ela roda `packages/api/scripts/coletar-orfaos.ts` pelo `varlock run` com o contrato de `apps/web/.env.schema`: o `DATABASE_URL` e as `S3_*` e `S3_MATERIAIS_*` do `.env`, ou do `process.env`, que vence. Órfão é o objeto que nenhum `curso.capa_url` (a chave depois de `/capa/`) nem `material.chave` usa, olhando as duas tabelas em todo bucket, e com mais de 7 dias (`DIAS_ATE_COLETAR`, de `dominio/orfaos.ts`): o arquivo que o editor enviou e o admin ainda não salvou fica protegido. Só entra objeto com chave no formato do app (`<sha256>.<ext>`); outro nome no bucket fica. Sem flag, ela só lista cada órfão com tamanho e idade e o total; `-- --apagar` apaga, e recusa antes de tocar no bucket quando o banco não usa nenhuma chave, que é o que um `DATABASE_URL` vazio ou de outro ambiente dá. Em produção, a coleta roda pelo `railway ssh --service web`.

## Banco

- O banco de produção é o serviço `Postgres` do projeto `cursos` na Railway, em `iad`, ao lado do `web`. O app chega nele pela rede interna. A ADR 0002 diz por que tudo fica na Railway e o que isso custa em latência.
- O dev usa o ambiente `development` do mesmo projeto: o `Postgres-dev` e o bucket `capas-dev`, sem serviço `web`. O `.env` local aponta para eles (`railway bucket credentials --bucket capas-dev --environment development` dá as `S3_*`). O material de apoio do dev também mora no `capas-dev`: o plano da Railway permite 3 buckets por projeto, e `capas`, `capas-dev` e `materiais` já ocupam os 3. No `.env`, as `S3_MATERIAIS_*` repetem o bucket e as chaves das `S3_*`; a chave de cada objeto é o sha256 dos bytes, então capa e material não se sobrescrevem.
- O `DATABASE_URL` de dev passa pelo proxy TCP do `Postgres-dev` (`postgresql://<PGUSER>:<PGPASSWORD>@<RAILWAY_TCP_PROXY_DOMAIN>:<RAILWAY_TCP_PROXY_PORT>/<PGDATABASE>`, com os valores de `railway variable list --service Postgres-dev --environment development`). A Railway não cria o `DATABASE_PUBLIC_URL` quando o proxy chega depois do banco.
- O Postgres local é um container `postgres:17-alpine` na porta 54322.

## Deploy

O serviço `web` da Railway builda com `bun run --cwd apps/web build` (sem turbo: os pacotes do workspace são TS e o modo estrito do turbo esconderia variáveis do build) e sobe com `bun run --cwd apps/web start`. O healthcheck é `/entrar`. `railway up --service web --ci` sobe o diretório atual sem passar pelo GitHub; `railway logs --service web` lê o log.

## Clerk

- App "cursos" na workspace PROFILLS DO BRASIL, só a instância Development (`pk_test`/`sk_test`). A instância de produção exige domínio próprio.
- Papel de admin: `{ "papel": "admin" }` no Public metadata do usuário, e o claim `{ "papel": "{{user.public_metadata.papel}}" }` em Sessions, "Customize session token".

## Tipos

O `tsc` do `apps/web` roda sem `incremental`, porque o do TypeScript 7 reaproveita o diagnóstico guardado no `.tsbuildinfo` quando só um tipo global muda, como a lista de rotas, e o turbo inclui `.next/types` no hash do `web#check-types`, senão repete o veredito da rota antiga.

## Testes no Chromium

`components/sinal-do-foco.test.tsx` renderiza a navegação, a coluna do player e a busca de pessoas, compila o CSS do app e confere o sinal de foco de cada controle da #44, do item "Em breve", dos `summary` das revogadas, da faixa do comunicado e do Continuar da sidebar. A pílula, o Revogar em 390 px, o Tab no Continuar e o primeiro Tab da casca (que mostra "Pular para o conteúdo", e o Enter leva ao conteúdo) ele confere no Chromium da máquina, em headless (`/usr/bin/chromium`; a variável `CHROMIUM` aponta outro caminho); sem ele, essas quatro suítes pulam e o resto roda. O CSS compilado e o Chromium guiado pelo DevTools moram em `components/chromium-de-teste.ts`. Os `*.medida.test.tsx` e os `*.navegador.test.tsx` medem no Chromium por ele e pulam do mesmo jeito.
