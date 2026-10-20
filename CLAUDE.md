# cursos

Plataforma de cursos da Profills. Monorepo Bun + Turborepo gerado pelo Better T Stack (`bts.jsonc` guarda o comando de origem; `bunx create-better-t-stack@latest add` acrescenta addons).

Stack: Next.js 16 (App Router, React Compiler, `typedRoutes`), tRPC 11 (o browser chama pelo `trpcClient`, sem TanStack Query), Drizzle 1.0 RC sobre Postgres da Railway, Clerk para auth, shadcn (estilo `base-lyra`, Base UI), Motion para animação que o CSS não resolve, Biome via Ultracite, varlock para env, deploy na Railway.

## Mapa

O mapa arquivo por arquivo de `apps/web`, `packages/api` e `packages/db` mora em `docs/mapa.md`: o que cada arquivo possui, quem chama quem, as medidas e o teste que guarda cada regra. Antes de ler ou mudar uma pasta, leia a entrada dela lá. Quem muda o que uma entrada descreve atualiza a entrada no mesmo PR.

O pedido do browser percorre as camadas nesta ordem:

- `apps/web/src/proxy.ts`: `clerkMiddleware()` em todas as rotas, sem regra por caminho. A proteção mora em `src/server/api.ts`.
- `apps/web/src/app/`: as rotas. `(aluno)/` tem as telas do aluno, `(admin)/admin/` a área do admin, atrás de `exigirAdmin()`, `certificado/` a conferência pública sem login, `capa/` e `material/` servem os arquivos dos buckets, e `api/trpc/[trpc]/route.ts` é o único endpoint HTTP da API.
- `apps/web/src/server/api.ts`: os `carregar*` que os Server Components chamam, pelo `createCaller` no processo, com `React.cache` por request.
- `apps/web/src/context.ts` e `src/services.ts`: o contexto do tRPC por request e os serviços (banco, capas e Clerk), montados uma vez.
- `apps/web/src/components/`: `casca/` (a navegação comum), `aluno/`, `admin/`, `material-de-apoio/` (o que o editor e a página do curso dividem) e uma pasta por tela do aluno (`meus-cursos/`, `curso/`, `player/`, `conquistas/`, `comunicados-do-aluno/`, `trocar-pontos/`, `certificado/`).
- `apps/web/src/lib/`: `use-acao.ts` (toda mutação), `rotas.ts` (os endereços), `formato.ts`, `marca.ts`, as peças do editor do curso e as do player (`player/`).
- `packages/api/src/`: `index.ts` (os procedures e `ErroParaAPessoa`), `routers/`, `dominio/` (regras puras, sem banco e sem relógio próprio), `consultas/` (o SQL, as travas e o escritor único de cada tabela) e `externos/` (Storage e Clerk).
- `packages/db/src/`: o schema, as relations v2, as migrações e o seed.

As cercas abaixo valem para qualquer pasta, e um teste ou uma regra do Biome acusa a quebra:

- Só `apps/web/src/services.ts` importa `@cursos/db`, e só `src/context.ts` e `src/server/api.ts` importam `@/services` (`noRestrictedImports` do `biome.jsonc`).
- Server Component busca dados por `src/server/api.ts`, nunca pelo cliente de `utils/trpc.ts`. Server Action lê e grava pelo caller de lá.
- Toda mutação que a pessoa dispara passa pelo `useAcao` (`use-acao.test.ts`), e toda recusa de negócio sai como `ErroParaAPessoa` (`index.test.ts` acusa `new TRPCError(`).
- `routers/admin.ts` usa só `adminProcedure`, e `admin.test.ts` percorre todo `admin.*` sem sessão e com aluno.
- Cada tabela tem um escritor só em `packages/api/src/consultas/`, e o mapa diz qual. Todo débito de pontos e toda escrita de liberação rodam com o aluno travado (`trava.ts`). Dentro da transação as consultas rodam em série, nunca em `Promise.all`.
- O `package.json` do `@cursos/api` fecha os `exports`: `consultas/` e `sessao.ts` não saem do pacote.

### `packages/ui` (`@cursos/ui`)

- Todos os componentes de UI do registro `@shadcn` (estilo `base-lyra`) já estão em `src/components/`, exceto `toast` (o app usa o `sonner`), `direction` (só RTL) e `breadcrumb` (o app não tem migalha). Hooks em `src/hooks/`, `cn` em `src/lib/utils.ts`, tokens em `src/styles/globals.css`. Importe por caminho: `@cursos/ui/components/button`.
- Antes de escrever UI, liste `src/components/` e componha com o que existe. Os componentes são Base UI: composição por `render`, sem `asChild`. Ícones vêm do `lucide-react`. O `TooltipProvider` já envolve o app em `apps/web/src/components/providers.tsx`.
- Componente novo ou bloco: `bunx --bun shadcn@latest add <nome>` **dentro de `packages/ui`**, onde os aliases levam hooks para `@cursos/ui/hooks`. Rodado em `apps/web`, o hook cai no app e o componente de `packages/ui` não compila. Para buscar no registro: `bunx --bun shadcn@latest search @shadcn -q <termo>` ou o MCP `shadcn`.
- Quando o `add` pergunta se sobrescreve um arquivo existente, ele trava sem TTY. Num agente, rode `yes n | bunx --bun shadcn@latest add ...` para manter os existentes, e só use `--overwrite` com pedido do dono. O `sidebar.tsx` tem edições locais que o `--overwrite` apaga: os rótulos em pt-BR e o `setOpen` sem gravar o cookie, cujo único escritor é o `provedor-da-casca.tsx` (`nav.test.ts` acusa a volta).
- O Biome não roda lint em `src/components/`, `src/hooks/` e `src/lib/utils.ts` (override no `biome.jsonc`), porque o `shadcn add` regenera esses arquivos. Ajuste de comportamento entra no componente do app que os usa.

### Raiz

- `.railway/railway.ts`: o projeto `cursos` da Railway como código (o serviço `web` em `cursos.profills.com`, o `Postgres` e os buckets `capas` e `materiais`, todos em `iad`, Virgínia). O DNS de `profills.com` fica na KingHost: um CNAME `cursos` para o alvo que a Railway deu e o TXT `_railway-verify.cursos`. `railway config plan` mostra a diferença para o que está no ar; `railway config apply` só com pedido do dono.
- `AGENTS.md` e `apps/web/AGENTS.md`: blocos que o turbo e o `next dev` reescrevem sozinhos. Commite as mudanças deles junto com o trabalho.
- `apps/web/PRODUCT.md`: o produto, o público e as decisões do dono. `apps/web/DESIGN.md` (com o sidecar `apps/web/.impeccable/design.json`): o sistema visual tirado do código, com tokens, tipografia, formas, a casca e as regras de movimento. UI nova segue o `DESIGN.md`; mudança que o contradiz atualiza o arquivo no mesmo PR.
- `docs/marca/`: o que é cada arquivo da marca e de onde veio, e a Orbitron do lockup com a licença OFL (`fontes/orbitron/`). O logo oficial da Profills fica ali como referência, fora do `public/`.

## Env (varlock)

- O contrato fica em `apps/web/.env.schema`; os valores locais, em `apps/web/.env` (fora do git). `packages/db/.env.schema` importa `NODE_ENV` e `DATABASE_*` do app.
- `@defaultSensitive=true` marca toda variável como segredo. Valor que chega ao browser leva `@public`, senão o varlock acusa `DETECTED LEAKED SENSITIVE CONFIG` e derruba o request. Foi o que aconteceu com `CLERK_PUBLISHABLE_KEY`.
- Depois de editar o schema: `bun run env:generate` para regenerar os `env.ts`, e reinicie o `next dev`.
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` apontam o bucket das capas e são opcionais. Sem uma delas, o envio de capa do admin recusa com "não configurado" e o resto funciona. O bucket é privado: a capa sai pela rota `/capa/[chave]` do app. Na Railway elas são referências ao bucket (`${{capas.ENDPOINT}}` e as outras), menos `S3_REGION`, que vale `auto`. Endpoint, região e nome do bucket levam `@sensitive=false`: a palavra `auto` aparece em todo JS, e o varlock derrubava o build acusando vazamento.
- `S3_MATERIAIS_BUCKET`, `S3_MATERIAIS_ACCESS_KEY_ID` e `S3_MATERIAIS_SECRET_ACCESS_KEY` apontam o bucket do material de apoio e são opcionais; o endpoint e a região são os de `S3_ENDPOINT` e `S3_REGION`, que a Railway dá iguais a todo bucket. Sem uma delas, o envio de material recusa com "não configurado" e o resto funciona. O bucket é privado: o arquivo sai pela rota `/material/[id]`, só para o admin e para quem a página do curso abre. Na Railway elas são referências ao bucket `materiais` (`${{materiais.BUCKET}}` e as outras), postas no painel; o IaC só as preserva.
- Na Railway, `CORS_ORIGIN` vale `https://cursos.profills.com`, o domínio do `web`, e `DATABASE_URL` vale `${{Postgres.DATABASE_URL}}`, pela rede interna. As chaves do Clerk são as mesmas `pk_test`/`sk_test` do dev.
- A coleta de órfãos (`bun run coletar-orfaos`, da raiz) apaga dos buckets a capa trocada e o material tirado do curso, que a chave em sha256 deixaria lá para sempre. Ela roda `packages/api/scripts/coletar-orfaos.ts` pelo `varlock run` com o contrato de `apps/web/.env.schema`: o `DATABASE_URL` e as `S3_*` e `S3_MATERIAIS_*` do `.env`, ou do `process.env`, que vence. Órfão é o objeto que nenhum `curso.capa_url` (a chave depois de `/capa/`) nem `material.chave` usa, olhando as duas tabelas em todo bucket, e com mais de 7 dias (`DIAS_ATE_COLETAR`, de `dominio/orfaos.ts`): o arquivo que o editor enviou e o admin ainda não salvou fica protegido. Só entra objeto com chave no formato do app (`<sha256>.<ext>`); outro nome no bucket fica. Sem flag, ela só lista cada órfão com tamanho e idade e o total; `-- --apagar` apaga, e recusa antes de tocar no bucket quando o banco não usa nenhuma chave, que é o que um `DATABASE_URL` vazio ou de outro ambiente dá. Nunca rode o `--apagar` contra um banco local: ele tem dado de teste, e o bucket é o do `.env`. Em produção, a coleta roda pelo `railway ssh --service web`, e o `--apagar` lá só com pedido do dono.
- `CORS_ORIGIN` precisa ser exatamente a origem do browser (`http://localhost:3001` no dev). Com outro valor, o Clerk recusa o token e todo `protectedProcedure` responde `UNAUTHORIZED`. Para subir em outra porta, rode `CORS_ORIGIN=http://localhost:<porta> next dev --port <porta>` dentro de `apps/web`: o `process.env` vence o `.env`.

## Banco

- O banco de produção é o serviço `Postgres` do projeto `cursos` na Railway, em `iad` (Virgínia), ao lado do `web`. O app chega nele pela rede interna. Ele não tem proxy TCP, então nada de fora da Railway o alcança; acesso a ele passa por `railway ssh --service web`. A ADR 0002 diz por que tudo fica na Railway e o que isso custa em latência.
- O dev usa o ambiente `development` do mesmo projeto: o `Postgres-dev` e o bucket `capas-dev`, sem serviço `web`. O `.env` local aponta para eles (`railway bucket credentials --bucket capas-dev --environment development` dá as `S3_*`). O material de apoio do dev também mora no `capas-dev`: o plano da Railway permite 3 buckets por projeto, e `capas`, `capas-dev` e `materiais` já ocupam os 3. No `.env`, as `S3_MATERIAIS_*` repetem o bucket e as chaves das `S3_*`; a chave de cada objeto é o sha256 dos bytes, então capa e material não se sobrescrevem. O `DATABASE_URL` de dev passa pelo proxy TCP do `Postgres-dev` (`postgresql://<PGUSER>:<PGPASSWORD>@<RAILWAY_TCP_PROXY_DOMAIN>:<RAILWAY_TCP_PROXY_PORT>/<PGDATABASE>`, com os valores de `railway variable list --service Postgres-dev --environment development`). A Railway não cria o `DATABASE_PUBLIC_URL` quando o proxy chega depois do banco. Migração no dev: `bunx drizzle-kit migrate` dentro de `packages/db`. O Drizzle sabe o que já rodou pelo nome da pasta, gravado em `drizzle.__drizzle_migrations`: migração aplicada no dev e depois regenerada com outro nome na branch faz o `migrate` tentar criar tudo de novo e falhar. Com o schema igual, troque o `name` da linha antiga pelo novo e rode de novo.
- O `preDeployCommand` do `web` roda `drizzle-kit migrate` antes de cada deploy, então migração que entra na main vai para produção no deploy seguinte. Migração que quebra o código antigo (como a `catalogo_sem_trilha`, ADR 0001) entra no mesmo PR do código que a usa.
- O Postgres local (`bun run db:start` / `db:stop`, um container `postgres:17-alpine` na porta 54322) existe para testes isolados; para usá-lo, troque o `DATABASE_URL` para `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. O `db:stop` apaga o container e os dados.
- `bun run db:push` (e `db:generate`, `db:migrate`) da raiz é task interativa do turbo e falha num shell sem TTY. Num agente, rode `bunx drizzle-kit <comando>` dentro de `packages/db`.

## Auth (Clerk)

- App "cursos" na workspace PROFILLS DO BRASIL, só a instância Development (`pk_test`/`sk_test`). A instância de produção exige domínio próprio.
- Usuário logado no servidor: `ctx.auth.userId` dentro de `protectedProcedure`. Não existe tabela de usuários; quando precisar, sincronize pelo webhook do Clerk (skill `clerk-webhooks`).
- Papel de admin: `{ "papel": "admin" }` no Public metadata do usuário, e o claim `{ "papel": "{{user.public_metadata.papel}}" }` em Sessions, "Customize session token". Quem muda o metadata precisa sair e entrar de novo, ou esperar o token renovar (até 60 s).

## Comandos

- `bun run dev` sobe tudo; `bun run dev:web` só o app. `bun run --cwd apps/web dev:local` sobe o app contra o Postgres local (o `process.env` vence o `.env` no varlock). Não use `bun --bun next dev`: o Turbopack não resolve o `pg` no runtime do Bun. O Next aceita um `next dev` por pasta: com outro rodando na mesma cópia, mesmo em outra porta, o segundo sai com "Another next dev server is already running". Um segundo servidor pede outro worktree.
- Testes: `bun run test`. Os de integração só rodam com `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres` e recusam host que não seja local. Todo teste que chama um procedure do aluno grava a linha de `perfil_da_pessoa` do userId pelo `alunoProcedure`, e o `afterAll` dele apaga essa linha junto com o resto, no molde de `consultas/perfil.integration.test.ts`: o banco local é dividido entre worktrees, e a sobra acumula. Banco local: `bun run db:migrate:local` e `bun run db:seed -- --aluno user_xxx`, dentro de `packages/db`.
- Antes de commitar: `bun run check-types` e `bun x ultracite check` verdes. Com o `typedRoutes`, o tipo `Route` só fica estrito depois que o `next dev` ou o `next build` gera `apps/web/.next/types` (`bunx next typegen` em `apps/web` gera só os tipos): num worktree novo, sem eles, o `check-types` acusa `RouteContext` e deixa passar href de rota que não existe, então gere antes. O `tsc` do `apps/web` roda sem `incremental`, porque o do TypeScript 7 reaproveita o diagnóstico guardado no `.tsbuildinfo` quando só um tipo global muda, como a lista de rotas, e o turbo inclui `.next/types` no hash do `web#check-types`, senão repete o veredito da rota antiga. Um hook do Claude Code (`.claude/hooks/formatar-arquivo-editado.ts`) roda o Biome no arquivo editado depois de cada Edit/Write, então o arquivo pode mudar logo após a edição: releia antes do próximo Edit. O repo não tem CI (`gh pr checks` responde "no checks reported"), então essas checagens e os testes locais são o que vale antes do merge.
- Deploy: o serviço `web` da Railway builda com `bun run --cwd apps/web build` (sem turbo: os pacotes do workspace são TS e o modo estrito do turbo esconderia variáveis do build) e sobe com `bun run --cwd apps/web start`. O healthcheck é `/entrar`. O `web` está ligado à main de `profillsbrasil/cursos`: todo push na main vira deploy de produção, com as migrações no pre-deploy. `railway up --service web --ci` sobe o diretório atual sem passar pelo GitHub; `railway logs --service web` lê o log.

## Código

Biome (via Ultracite) cobre formatação e a maior parte do estilo. O que ele não pega:

- Busca assíncrona de dados vai em Server Component, não em Client Component `async`.
- Erro para o usuário sai como `ErroParaAPessoa` com `code` e `message`. Só essa mensagem chega ao toast do `useAcao`; os outros erros viram o texto genérico.
- Use o vocabulário do `GLOSSARY.md` em nomes de tabela, procedure e componente.
- Texto fica em 11 px ou mais. As exceções são as do `DESIGN.md`: o selo da área (10 px) e o "10" de 7 px do glifo de voltar 10 s. `components/texto-minimo.test.ts` acusa `text-[Npx]` abaixo de 11 em outro arquivo. Caixa alta pelo CSS (`uppercase`) só existe no selo da área; sigla e código que se escrevem em maiúsculas, como "PDF" e "RI-001", ficam como se escrevem.
- Constante de classe não mora em módulo "use client": num Server Component ela chega como client reference, e o `cn` a descarta sem erro. Ela vai para um módulo sem a diretiva (`casca/botoes.ts`, `casca/campos.ts`, `admin/partes.tsx`); `components/fronteira-do-cliente.test.ts` acusa a volta.
- O foco de teclado é o hover: a variante `hover:` do `globals.css` também casa com `:focus-visible` (e com o label ou o polegar do slider que envolve o input focado), e `focus-visible:` não pinta nada. Controle sem hover ganha a borda Céu pelo `data-slot` na regra do `index.css`; moldura própria leva `data-campo`. Nenhum contorno de foco, nem no alto contraste do Windows. Os dois `foco.test.ts` (`packages/ui/src/styles/` e `apps/web/src/components/`) acusam anel ou contorno de volta. A pílula do item ativo é irmã do link, então acende pela variante `ativo-aceso` do `index.css`, que lê o cursor e o foco do link. `components/sinal-do-foco.test.tsx` renderiza a navegação, a coluna do player e a busca de pessoas, compila o CSS do app e confere o sinal de foco de cada controle da #44, do item "Em breve", dos `summary` das revogadas, da faixa do comunicado e do Continuar da sidebar. A pílula, o Revogar em 390 px e o Tab no Continuar ele confere no Chromium da máquina, em headless (`/usr/bin/chromium`; a variável `CHROMIUM` aponta outro caminho); sem ele, essas três suítes pulam e o resto roda. O CSS compilado e o Chromium guiado pelo DevTools moram em `components/chromium-de-teste.ts`, que os testes de medida também usam.
- Linha divisória dentro de cartão, painel ou menu vai de uma borda à outra, sem recuo (The Edge To Edge Rule, no `DESIGN.md`). O cartão não tem padding lateral; o cabeçalho, cada linha e o pé têm o deles, e a divisória é o `border-t` da linha de baixo. O modelo é `components/minha-conta/partes.ts` (`CARTAO`, `LINHA`, `PE_DO_CARTAO`). `border-t`, `divide-y`, `<hr>` ou `Separator` dentro de um contêiner com padding lateral desenha a linha curta que o dono recusou.
- Animação: CSS antes de Motion; Motion (`motion/react`) só quando o CSS não resolve, como a pílula de `casca/nav-principal.tsx`. Com Motion, anime a string `transform` inteira (nunca `x`, `y` ou `scale`), use `initial={false}` para o SSR já escrever a posição e respeite `useReducedMotion()`. A curva é `cubic-bezier(0.23, 1, 0.32, 1)`, o token `--ease-forte` de `index.css` (`ease-forte` no Tailwind). Transição da interface dura de 150 a 200 ms, e `components/movimento.test.ts` acusa curva escrita à mão e duração maior. Com movimento reduzido, sai só o que desloca, gira ou cresce, e cor, opacidade e sombra continuam: o mesmo teste acusa `motion-reduce:transition-none` numa linha onde nada se move. Ação de teclado, como o Ctrl+B, não anima.

## Agent skills

Animação nova passa pela skill `animate`, e a revisão de animação, pela `review-animations`. As duas vêm de `emilkowalski/skills`, ficam em `.agents/skills/` com link em `.claude/skills/` e entram no `skills-lock.json`. A `review-animations` tem `disable-model-invocation`: só roda quando o dono digita `/review-animations`, e o agente que precisa da revisão lê o `SKILL.md` e o `STANDARDS.md` dela e aplica o checklist.

### Issue tracker

As issues ficam no GitHub Issues de `profillsbrasil/cursos` (repo público). Use o `gh` dentro do clone, que já infere o repo.

- Criar: `gh issue create --title "..." --body "..."` (heredoc para corpo de várias linhas).
- Ler: `gh issue view <n> --comments`.
- Listar: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, com `--label` e `--state` conforme o caso.
- Comentar: `gh issue comment <n> --body "..."`.
- Labels: `gh issue edit <n> --add-label "..."` / `--remove-label "..."`. Exige permissão de triage no repo; as contas do gh desta máquina hoje têm só leitura, então essa chamada falha até o dono dar acesso.
- Fechar: `gh issue close <n> --comment "..."`.
- "Publicar no issue tracker" quer dizer criar uma issue no GitHub. "Buscar o ticket" quer dizer `gh issue view <n> --comments`.
- PRs como superfície de pedidos: **não**. PRs externos não entram na triagem.
- `#42` pode ser issue ou PR (mesma numeração): tente `gh pr view 42` e caia para `gh issue view 42`.

Wayfinding (`/wayfinder`): o **mapa** é uma issue com label `wayfinder:map` e corpo Notes / Decisions-so-far / Fog. Cada ticket filho é sub-issue do mapa (`gh api` no endpoint de sub-issues), ou, sem sub-issues, entra na task list do mapa com `Part of #<mapa>` no topo; label `wayfinder:<research|prototype|grilling|task>`. Bloqueio usa as dependências nativas: `gh api --method POST repos/profillsbrasil/cursos/issues/<filho>/dependencies/blocked_by -F issue_id=<id do bloqueador>`, onde o id é o database id (`gh api repos/profillsbrasil/cursos/issues/<n> --jq .id`); sem dependências, uma linha `Blocked by: #<n>` no topo. Fronteira: filhos abertos do mapa, sem bloqueador aberto e sem assignee, na ordem do mapa. Assumir: `gh issue edit <n> --add-assignee @me`. Resolver: comentar a resposta, fechar e anexar um ponteiro (resumo + link) em Decisions-so-far do mapa.

### Triage labels

Os cinco papéis usam o nome padrão como label: `needs-triage` (o mantenedor precisa avaliar), `needs-info` (esperando quem reportou), `ready-for-agent` (especificado, pronto para um agente sozinho), `ready-for-human` (precisa de implementação humana), `wontfix` (não será feito).

### Domain docs

Contexto único: `GLOSSARY.md` e `docs/adr/` na raiz.

- Antes de explorar uma área, leia o `GLOSSARY.md` e as ADRs de `docs/adr/` que tocam nela. Se não existirem, siga em frente sem comentar; o `/domain-modeling` (via `/grill-with-docs` e `/improve-codebase-architecture`) cria os arquivos quando um termo ou decisão é resolvido.
- Nome de conceito de domínio em issue, proposta, hipótese ou teste usa o termo do glossário. Conceito ausente do glossário é sinal: ou a linguagem é inventada, ou é uma lacuna para o `/domain-modeling`.
- Saída que contradiz uma ADR diz isso explicitamente: _Contradiz a ADR-0007 (...), mas vale reabrir porque..._
