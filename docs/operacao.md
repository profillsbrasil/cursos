# Operação

O detalhe da infraestrutura, do env, do banco, do deploy e do Clerk. As regras que valem em toda sessão ficam no `CLAUDE.md` da raiz; este arquivo guarda o como e o porquê.

## Railway como código

`.railway/railway.ts` descreve o projeto `cursos` da Railway: o serviço `web` em `cursos.profills.com`, o `Postgres` e os buckets `capas` e `materiais`, todos em `iad`, Virgínia. O DNS de `profills.com` fica na KingHost: um CNAME `cursos` para o alvo que a Railway deu e o TXT `_railway-verify.cursos`. `railway config plan` mostra a diferença para o que está no ar. O workspace tem limite de gasto: e-mail de alerta em US$ 20 e teto rígido em US$ 30, que derruba os serviços de todos os projetos do workspace (`railway usage limit status`).

O CDN da Railway está ligado no `web` (`cdn` no `railway.ts`), com os padrões: o cache segue o `cache-control` da resposta e o deploy limpa só o HTML. Entram no cache o `/_next/static` e a `/capa/[chave]`, que saem da borda `gru1`, em São Paulo: 43 ms contra 168 ms da Virgínia, medido em 14 de novembro de 2026. A página dinâmica, o tRPC, o material de apoio e o PDF do certificado respondem `no-store` e ficam fora. O header `x-cache` da resposta diz `HIT`, `MISS` ou `DYNAMIC`. Rota nova com `cache-control: public` fica igual para todo mundo na borda, então resposta que depende da sessão leva `private, no-store`. `railway cdn purge all --service web` limpa o cache.

## Env (varlock)

- `packages/db/.env.schema` importa `NODE_ENV` e `DATABASE_*` do app.
- O `overrides` do `package.json` da raiz troca o `@next/env` do Next pela `@varlock/nextjs-integration`, na mesma versão da dependência do `web`: suba as duas juntas.
- `@defaultSensitive=true` marca toda variável como segredo. O caso que derrubou o request foi o `CLERK_PUBLISHABLE_KEY` sem `@public`.
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` apontam o bucket das capas e são opcionais. Sem uma delas, o envio de capa do admin recusa com "não configurado" e o resto funciona. O bucket é privado: a capa sai pela rota `/capa/[chave]` do app. Na Railway elas são referências ao bucket (`${{capas.ENDPOINT}}` e as outras), menos `S3_REGION`, que vale `auto`. Endpoint, região e nome do bucket levam `@sensitive=false`: a palavra `auto` aparece em todo JS, e o varlock derrubava o build acusando vazamento.
- `S3_MATERIAIS_BUCKET`, `S3_MATERIAIS_ACCESS_KEY_ID` e `S3_MATERIAIS_SECRET_ACCESS_KEY` apontam o bucket do material de apoio e são opcionais; o endpoint e a região são os de `S3_ENDPOINT` e `S3_REGION`, que a Railway dá iguais a todo bucket. Sem uma delas, o envio de material recusa com "não configurado" e o resto funciona. O bucket é privado: o arquivo sai pela rota `/material/[id]`, só para o admin e para quem a página do curso abre. Na Railway elas são referências ao bucket `materiais` (`${{materiais.BUCKET}}` e as outras), postas no painel; o IaC só as preserva.
- Na Railway, `CORS_ORIGIN` vale `https://cursos.profills.com`, o domínio do `web`, e `DATABASE_URL` vale `${{Postgres.DATABASE_URL}}`, pela rede interna. As chaves do Clerk são as mesmas `pk_test`/`sk_test` do dev.

## Coleta de órfãos

`bun run coletar-orfaos`, da raiz, apaga dos buckets a capa trocada e o material tirado do curso, que a chave em sha256 deixaria lá para sempre. Ela roda `packages/api/scripts/coletar-orfaos.ts` pelo `varlock run` com o contrato de `apps/web/.env.schema`: o `DATABASE_URL` e as `S3_*` e `S3_MATERIAIS_*` do `.env`, ou do `process.env`, que vence. Órfão é o objeto que nenhum `curso.capa_url` (a chave depois de `/capa/`) nem `material.chave` usa, olhando as duas tabelas em todo bucket, e com mais de 7 dias (`DIAS_ATE_COLETAR`, de `dominio/orfaos.ts`): o arquivo que o editor enviou e o admin ainda não salvou fica protegido. Só entra objeto com chave no formato do app (`<sha256>.<ext>`); outro nome no bucket fica. Sem flag, ela só lista cada órfão com tamanho e idade e o total; `-- --apagar` apaga, e recusa antes de tocar no bucket quando o banco não usa nenhuma chave, que é o que um `DATABASE_URL` vazio ou de outro ambiente dá. Em produção, a coleta roda pelo `railway ssh --service web`.

## Virada dos pontos

`bun run virada-dos-pontos`, da raiz, roda uma vez antes do deploy que faz a liberação do perfil abrir só a amostra. Ela roda `packages/api/scripts/virada-dos-pontos.ts` pelo `varlock run`, como a coleta de órfãos, e lê o `DATABASE_URL` e o `CLERK_SECRET_KEY` (sem a chave, o relatório sai só com o userId). Todo Funcionário ganha o Bônus de funcionário, se ainda não tem, e troca pelo preço de troca atual cada curso que já estudou e vê só pela liberação do perfil `funcionario`. A regra mora em `dominio/virada.ts`.

- Sem flag, é o ensaio: cada pessoa numa transação `read only`. A primeira linha diz host e banco, sem senha; depois vem uma linha por Funcionário, com o bônus, cada troca com o preço e cada curso pulado com o motivo ("sem preço", "em produção" ou "saldo curto"), e o total de pontos que entram e saem.
- `-- --gravar` grava uma pessoa por vez, cada uma na transação dela com o aluno travado, e imprime o mesmo relatório. Ela recusa quando o banco não tem nenhuma linha em `perfil_da_pessoa`, que é o que um `DATABASE_URL` vazio ou de outro ambiente dá. Rodar de novo mostra "nada a fazer" para todo mundo; o curso sem preço segue listado como pulado.
- No banco local: `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres bun run virada-dos-pontos`.
- Em produção, dentro do container: `railway ssh --service web`, e lá `bun run virada-dos-pontos` para o ensaio e, conferido o relatório, `bun run virada-dos-pontos -- --gravar`.

## Banco

- O banco de produção é o serviço `Postgres` do projeto `cursos` na Railway, em `iad`, ao lado do `web`. O app chega nele pela rede interna. A ADR 0002 diz por que tudo fica na Railway e o que isso custa em latência.
- O dev usa o ambiente `development` do mesmo projeto: o `Postgres-dev` e o bucket `capas-dev`, sem serviço `web`. O `.env` local aponta para eles (`railway bucket credentials --bucket capas-dev --environment development` dá as `S3_*`). O material de apoio do dev também mora no `capas-dev`: o plano da Railway permite 3 buckets por projeto, e `capas`, `capas-dev` e `materiais` já ocupam os 3. No `.env`, as `S3_MATERIAIS_*` repetem o bucket e as chaves das `S3_*`; a chave de cada objeto é o sha256 dos bytes, então capa e material não se sobrescrevem.
- O `DATABASE_URL` de dev passa pelo proxy TCP do `Postgres-dev` (`postgresql://<PGUSER>:<PGPASSWORD>@<RAILWAY_TCP_PROXY_DOMAIN>:<RAILWAY_TCP_PROXY_PORT>/<PGDATABASE>`, com os valores de `railway variable list --service Postgres-dev --environment development`). A Railway não cria o `DATABASE_PUBLIC_URL` quando o proxy chega depois do banco.
- O Postgres local é um container `postgres:18-alpine` na porta 54322, a mesma versão maior da produção. A versão importa: o 18 devolve `23001` quando o `ON DELETE RESTRICT` recusa, e o 17 devolvia `23503` (`FK_VIOLADA` em `consultas/erros.ts`).
- Cópia da produção para testar com dado real, sem custo: `bun run db:copiar-producao`, da raiz, com o Postgres local no ar. O script (`packages/db/scripts/copiar-producao.sh`) roda o `pg_dump` dentro do `Postgres` de produção pelo `railway ssh`, só leitura, e carrega o resultado no banco `producao` do container local, que ele apaga e recria. O banco `postgres` dos testes de integração fica como está. `bun run --cwd apps/web dev:producao-local` sobe o app contra a cópia. Com migração nova na branch, aplique-a na cópia antes: `LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/producao bunx drizzle-kit migrate --config drizzle.local.config.ts`, dentro de `packages/db`. A cópia tem o dado das pessoas reais (userId do Clerk, e-mail dos convites): fica só na máquina e some com o `db:stop`. Como o dev usa as mesmas chaves do Clerk, o login local abre a conta real em cima da cópia.
- Backup: o `Postgres` de produção tem backup semanal de volume, sábado às 17h18 UTC, com 27 dias de retenção (`railway postgres pitr schedule list --service Postgres`). O agendamento mora na Railway, fora do `railway.ts`. Restaurar troca o volume e pede um deploy do `Postgres`.

## Deploy

O serviço `web` da Railway builda com `bun run --cwd apps/web build` (sem turbo: os pacotes do workspace são TS e o modo estrito do turbo esconderia variáveis do build) e sobe com `bun run --cwd apps/web start`. O `next start` chama o CLI do varlock no boot e resolve o `.env.schema` com as variáveis do serviço, por isso o `varlock` fica nas `dependencies` do `web`. O `@varlock/nextjs-integration` 1.2.3 gravava no build uma cópia do env nos arquivos do servidor, que só valia sem o env do boot; o 2.0 só grava a cópia com `freezeIntoBundle: true` ou num build da Vercel, Netlify, Cloudflare Workers, AWS Amplify ou OpenNext, e o build da Railway sai sem ela. O healthcheck é `/entrar`. Na troca de versão, a antiga atende junto com a nova por 15 s (`overlapSeconds`) e tem 15 s para fechar os pedidos em voo (`drainingSeconds`). O `web` só tem o domínio `cursos.profills.com`: o `*.up.railway.app` foi removido. `railway up --service web --ci` sobe o diretório atual sem passar pelo GitHub; `railway logs --service web` lê o log.

## Clerk

- App "cursos" na workspace PROFILLS DO BRASIL, só a instância Development (`pk_test`/`sk_test`). A instância de produção exige domínio próprio.
- Papel de admin: `{ "papel": "admin" }` no Public metadata do usuário, e o claim `{ "papel": "{{user.public_metadata.papel}}" }` em Sessions, "Customize session token".
- Convite por e-mail (ADR 0005): o app chama `createInvitation` sem `publicMetadata`, com `ignoreExisting`, validade de 30 dias e `redirectUrl` em `<CORS_ORIGIN>/criar-conta`, onde o `<SignUp />` trata o `__clerk_ticket` do link. O perfil, o papel e os cursos ficam na tabela `convite` e valem pelo e-mail principal verificado, com ou sem o link. O Clerk aceita 100 `createInvitation` por hora na instância; no 429, o app para o envio, guarda os convites que faltam como "Não enviado" e mostra a hora do `Retry-After`. Reenviar cria outro convite no Clerk e revoga o anterior, porque o Clerk não tem reenvio.
- O papel de admin do convite vai ao Clerk depois do aceite. Se o Clerk falha, a chegada tenta de novo a cada pedido da pessoa, mas só até 1 hora depois do aceite (`PRAZO_DO_PAPEL_MS` em `packages/api/src/dominio/convite.ts`). Depois disso, o papel tirado pelo painel do Clerk não volta sozinho, e quem ficou sem o papel o recebe pela ficha da pessoa no admin.
- O texto e a marca do e-mail de convite são configuração do painel do Clerk, que só o dono edita. Nenhum teste do repo chama a API de convites do Clerk: o primeiro envio real é quem confirma o texto do e-mail, a marca e a chegada do link em `/criar-conta`.

## Tipos

O `tsc` do `apps/web` roda sem `incremental`, porque o do TypeScript 7 reaproveita o diagnóstico guardado no `.tsbuildinfo` quando só um tipo global muda, como a lista de rotas, e o turbo inclui `.next/types` no hash do `web#check-types`, senão repete o veredito da rota antiga.

## Testes no Chromium

`components/sinal-do-foco.test.tsx` renderiza a navegação, a coluna do player e a busca de pessoas, compila o CSS do app e confere o sinal de foco de cada controle da #44, do item "Em breve", dos `summary` das revogadas, da faixa do comunicado e do Continuar da sidebar. A pílula, o Revogar em 390 px, o Tab no Continuar e o primeiro Tab da casca (que mostra "Pular para o conteúdo", e o Enter leva ao conteúdo) ele confere no Chromium da máquina, em headless (`/usr/bin/chromium`; a variável `CHROMIUM` aponta outro caminho); sem ele, essas quatro suítes pulam e o resto roda. O CSS compilado e o Chromium guiado pelo DevTools moram em `components/chromium.test-utils.ts`. Os `*.medida.test.tsx` e os `*.navegador.test.tsx` medem no Chromium por ele e pulam do mesmo jeito.
