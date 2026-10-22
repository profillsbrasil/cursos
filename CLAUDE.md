# cursos

Plataforma de cursos da Profills. Monorepo Bun + Turborepo. O browser chama o tRPC pelo `trpcClient`, sem TanStack Query.

## Mapa

As camadas e o mapa arquivo por arquivo de `apps/web`, `packages/api` e `packages/db` moram em `docs/mapa.md`. Antes de ler ou mudar uma pasta, leia a entrada dela lá. Quem muda o que uma entrada descreve atualiza a entrada no mesmo PR. Infra, env, banco, deploy e Clerk em detalhe: `docs/operacao.md`. Comandos de issue e wayfinding: `docs/issues.md`.

As cercas abaixo valem para qualquer pasta, e um teste ou uma regra do Biome acusa a quebra:

- Só `apps/web/src/services.ts` importa `@cursos/db`, e só `src/context.ts` e `src/server/api.ts` importam `@/services` (`noRestrictedImports` do `biome.jsonc`).
- Server Component busca dados por `src/server/api.ts`, nunca pelo cliente de `utils/trpc.ts`. Server Action lê e grava pelo caller de lá.
- Toda mutação que a pessoa dispara passa pelo `useAcao` (`use-acao.test.ts`), e toda recusa de negócio sai como `ErroParaAPessoa` (`index.test.ts` acusa `new TRPCError(`). A exceção é Minha conta, que fala direto com o Clerk, fora do tRPC, pelo `useAcaoDaConta` (`minha-conta/use-acao-da-conta.ts`).
- O cartão, o selo e o rótulo de campo vêm de `casca/cartoes.ts`, `casca/selos.ts` e `casca/campos.ts` (`components/cartao-selo-e-rotulo.test.ts` acusa cópia à mão). O `h1` de página sai só do `CabecalhoDaPagina`, com as exceções em `H1_PROPRIO` (`components/casca/cabecalho-da-pagina.test.ts`). Só o grafo de `admin/editor-do-curso.tsx` chega ao `zod` num módulo "use client" (`components/zod-no-cliente.test.ts`); os tetos do curso moram em `packages/api/src/dominio/limites-do-curso.ts`, sem Zod. O app não tem migalha (`components/sem-migalha.test.ts`).
- `routers/admin.ts` usa só `adminProcedure`, e `admin.test.ts` percorre todo `admin.*` sem sessão e com aluno.
- Cada tabela tem um escritor só em `packages/api/src/consultas/`, e o mapa diz qual. Todo débito de pontos e toda escrita de liberação rodam com o aluno travado (`trava.ts`). Dentro da transação as consultas rodam em série, nunca em `Promise.all`.
- O `package.json` do `@cursos/api` fecha os `exports`: `consultas/` e `sessao.ts` não saem do pacote.

### `packages/ui` (`@cursos/ui`)

- Todos os componentes do registro `@shadcn` (estilo `base-lyra`) já estão em `src/components/`, exceto `toast` (o app usa o `sonner`), `direction` e `breadcrumb`. Importe por caminho: `@cursos/ui/components/button`.
- Antes de escrever UI, liste `src/components/` e componha com o que existe. Os componentes são Base UI: composição por `render`, sem `asChild`. O `TooltipProvider` já envolve o app em `apps/web/src/components/providers.tsx`.
- Componente novo ou bloco: `bunx --bun shadcn@latest add <nome>` **dentro de `packages/ui`**, onde os aliases levam hooks para `@cursos/ui/hooks`. Rodado em `apps/web`, o hook cai no app e o componente de `packages/ui` não compila.
- Quando o `add` pergunta se sobrescreve um arquivo existente, ele trava sem TTY. Num agente, rode `yes n | bunx --bun shadcn@latest add ...` para manter os existentes, e só use `--overwrite` com pedido do dono. O `sidebar.tsx` tem edições locais que o `--overwrite` apaga: os rótulos em pt-BR e o `setOpen` sem gravar o cookie, cujo único escritor é o `provedor-da-casca.tsx` (`nav.test.ts` acusa a volta).
- O Biome não roda lint em `src/components/`, `src/hooks/` e `src/lib/utils.ts` (override no `biome.jsonc`), porque o `shadcn add` regenera esses arquivos. Ajuste de comportamento entra no componente do app que os usa.

### Raiz

- `.railway/railway.ts`: o projeto `cursos` da Railway como código. `railway config apply` só com pedido do dono.
- `AGENTS.md` e `apps/web/AGENTS.md`: blocos que o turbo e o `next dev` reescrevem sozinhos. Commite as mudanças deles junto com o trabalho.
- `apps/web/PRODUCT.md`: o produto, o público e as decisões do dono. `apps/web/DESIGN.md` (com o sidecar `apps/web/.impeccable/design.json`): o sistema visual. UI nova segue o `DESIGN.md`; mudança que o contradiz atualiza o arquivo no mesmo PR.
- `docs/marca/`: os arquivos da marca. O logo oficial da Profills fica ali como referência, fora do `public/`.

## Env (varlock)

- O contrato fica em `apps/web/.env.schema`; os valores locais, em `apps/web/.env` (fora do git).
- Toda variável é segredo por padrão. Valor que chega ao browser leva `@public`, senão o varlock acusa `DETECTED LEAKED SENSITIVE CONFIG` e derruba o request.
- Depois de editar o schema: `bun run env:generate` para regenerar os `env.ts`, e reinicie o `next dev`.
- As `S3_*` e `S3_MATERIAIS_*` são opcionais: sem elas, o envio de capa ou de material recusa com "não configurado" e o resto funciona.
- Coleta de órfãos dos buckets (`bun run coletar-orfaos`, detalhe em `docs/operacao.md`): sem flag, só lista. Nunca rode o `--apagar` contra um banco local: ele tem dado de teste, e o bucket é o do `.env`. Em produção, o `--apagar` só com pedido do dono.
- `CORS_ORIGIN` precisa ser exatamente a origem do browser (`http://localhost:3001` no dev). Com outro valor, o Clerk recusa o token e todo `protectedProcedure` responde `UNAUTHORIZED`. Para subir em outra porta, rode `CORS_ORIGIN=http://localhost:<porta> next dev --port <porta>` dentro de `apps/web`: o `process.env` vence o `.env`.

## Banco

- O banco de produção (`Postgres` da Railway) não tem proxy TCP, então nada de fora da Railway o alcança; acesso a ele passa por `railway ssh --service web`.
- O dev usa o ambiente `development` do mesmo projeto: o `Postgres-dev` e o bucket `capas-dev`. O `.env` local aponta para eles. O `capas-dev` guarda também o material de apoio do dev, porque o plano só permite 3 buckets.
- O `Postgres-dev` da Railway é compartilhado entre worktrees. Migração entra nele depois do merge na main; teste de migração usa o Postgres local do docker.
- Migração no dev: `bunx drizzle-kit migrate` dentro de `packages/db`. O Drizzle sabe o que já rodou pelo nome da pasta, gravado em `drizzle.__drizzle_migrations`: migração aplicada no dev e depois regenerada com outro nome na branch faz o `migrate` tentar criar tudo de novo e falhar. Com o schema igual, troque o `name` da linha antiga pelo novo e rode de novo.
- O `preDeployCommand` do `web` roda `drizzle-kit migrate` antes de cada deploy, então migração que entra na main vai para produção no deploy seguinte. Migração que quebra o código antigo (como a `catalogo_sem_trilha`, ADR 0001) entra no mesmo PR do código que a usa.
- O Postgres local (`bun run db:start` / `db:stop`) existe para testes isolados; para usá-lo, troque o `DATABASE_URL` para `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. O `db:stop` apaga o container e os dados.
- `bun run db:push` (e `db:generate`, `db:migrate`) da raiz é task interativa do turbo e falha num shell sem TTY. Num agente, rode `bunx drizzle-kit <comando>` dentro de `packages/db`.

## Auth (Clerk)

- Só a instância Development do Clerk existe, e produção usa as mesmas chaves `pk_test`/`sk_test`.
- Não existe tabela de usuários; quando precisar, sincronize pelo webhook do Clerk (skill `clerk-webhooks`).
- Papel de admin vem do Public metadata pelo claim `papel` do session token (`docs/operacao.md`). Quem muda o metadata precisa sair e entrar de novo, ou esperar o token renovar (até 60 s).

## Comandos

- `bun run dev` sobe tudo; `bun run dev:web` só o app. `bun run --cwd apps/web dev:local` sobe o app contra o Postgres local (o `process.env` vence o `.env` no varlock). Não use `bun --bun next dev`: o Turbopack não resolve o `pg` no runtime do Bun. O Next aceita um `next dev` por pasta: com outro rodando na mesma cópia, mesmo em outra porta, o segundo sai com "Another next dev server is already running". Um segundo servidor pede outro worktree.
- Testes: `bun run test`. Os de integração só rodam com `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres` e recusam host que não seja local. Todo teste que chama um procedure do aluno grava a linha de `perfil_da_pessoa` do userId pelo `alunoProcedure`, e o `afterAll` dele apaga essa linha junto com o resto, no molde de `consultas/perfil.integration.test.ts`: o banco local é dividido entre worktrees, e a sobra acumula. Banco local: `bun run db:migrate:local` e `bun run db:seed -- --aluno user_xxx`, dentro de `packages/db`.
- Antes de commitar: `bun run check-types` e `bun x ultracite check` verdes. Com o `typedRoutes`, o tipo `Route` só fica estrito depois que o `next dev` ou o `next build` gera `apps/web/.next/types` (`bunx next typegen` em `apps/web` gera só os tipos): num worktree novo, sem eles, o `check-types` acusa `RouteContext` e deixa passar href de rota que não existe, então gere antes. Não ligue o `incremental` no `tsc` do `apps/web` (motivo em `docs/operacao.md`). Um hook do Claude Code (`.claude/hooks/formatar-arquivo-editado.ts`) roda o Biome no arquivo editado depois de cada Edit/Write, então o arquivo pode mudar logo após a edição: releia antes do próximo Edit. Todo PR roda o `.github/workflows/ci.yml`: `check-types`, `check` e os testes sem banco e sem Chromium (ficam de fora os `*.integration.test.*` e as suítes que medem no Chromium). Antes do merge, `gh pr checks` verde, mais os testes de integração e de Chromium rodados na máquina quando a mudança toca neles.
- Deploy: o `web` da Railway está ligado à main de `profillsbrasil/cursos`: todo push na main vira deploy de produção, com as migrações no pre-deploy. Build, start e comandos da Railway em `docs/operacao.md`.

## Código

Biome (via Ultracite) cobre formatação e a maior parte do estilo. O que ele não pega:

- Busca assíncrona de dados vai em Server Component, não em Client Component `async`.
- Erro para o usuário sai como `ErroParaAPessoa` com `code` e `message`. Só essa mensagem chega ao toast do `useAcao`; os outros erros viram o texto genérico.
- Use o vocabulário do `GLOSSARY.md` em nomes de tabela, procedure e componente.
- Texto fica em 11 px ou mais. As exceções são as do `DESIGN.md`: o selo da área (10 px) e o "10" de 7 px do glifo de voltar 10 s. `components/texto-minimo.test.ts` acusa `text-[Npx]` abaixo de 11 em outro arquivo. Caixa alta pelo CSS (`uppercase`) só existe no selo da área; sigla e código que se escrevem em maiúsculas, como "PDF" e "RI-001", ficam como se escrevem. O `body` tem 14/20 px e algarismos tabulares (`@layer base` de `index.css`): texto sem classe de tamanho sai em 14 px, e só quem precisa de outro tamanho o declara. Não escreva `text-sm` onde o elemento já herda o body; ele fica onde vence o tamanho base de um componente, como em `BOTAO`, `CAMPO` e `ROTULO`. `components/escala-do-texto.medida.test.tsx` mede.
- Constante de classe não mora em módulo "use client": num Server Component ela chega como client reference, e o `cn` a descarta sem erro. Ela vai para um módulo sem a diretiva (`casca/botoes.ts`, `casca/campos.ts`, `casca/cartoes.ts`, `casca/selos.ts`, `admin/partes.tsx`, `minha-conta/partes.ts`, `player/partes.ts`); `components/fronteira-do-cliente.test.ts` acusa a volta.
- O foco de teclado é o hover: a variante `hover:` do `globals.css` também casa com `:focus-visible` (e com o label ou o polegar do slider que envolve o input focado), e `focus-visible:` não pinta nada. Controle sem hover ganha a borda Céu pelo `data-slot` na regra do `index.css`; moldura própria leva `data-campo`. Nenhum contorno de foco, nem no alto contraste do Windows. Os dois `foco.test.ts` (`packages/ui/src/styles/` e `apps/web/src/components/`) acusam anel ou contorno de volta. A pílula do item ativo é irmã do link, então acende pela variante `ativo-aceso` do `index.css`, que lê o cursor e o foco do link. `components/sinal-do-foco.test.tsx` confere o sinal de foco de cada controle. Os `*.medida.test.tsx` e os `*.navegador.test.tsx` medem no Chromium da máquina (`/usr/bin/chromium`, ou a variável `CHROMIUM`) e pulam sem ele; detalhe em `docs/operacao.md`.
- Linha divisória dentro de cartão, painel ou menu vai de uma borda à outra, sem recuo (The Edge To Edge Rule, no `DESIGN.md`). O cartão não tem padding lateral; o cabeçalho, cada linha e o pé têm o deles, e a divisória é o `border-t` da linha de baixo. O modelo é `components/minha-conta/partes.ts` (`CARTAO`, `LINHA`, `PE_DO_CARTAO`). `border-t`, `divide-y`, `<hr>` ou `Separator` dentro de um contêiner com padding lateral desenha a linha curta que o dono recusou. Onde o contêiner já tem padding, como um menu ou uma lista dentro de seção, a divisória leva margem negativa igual ao recuo (`-mx-5` em `admin/coluna-do-lote.tsx`, `DIVISORIA` em `casca/cartao-de-conta.tsx`).
- Animação: CSS antes de Motion; Motion (`motion/react`) só quando o CSS não resolve, como a pílula de `casca/nav-principal.tsx`. Com Motion, anime a string `transform` inteira (nunca `x`, `y` ou `scale`), use `initial={false}` para o SSR já escrever a posição e respeite `useReducedMotion()`. A curva é `cubic-bezier(0.23, 1, 0.32, 1)`, o token `--ease-forte` de `index.css` (`ease-forte` no Tailwind). Ele é a `--default-transition-timing-function`, então classe de transição sem curva já o herda. Transição da interface dura de 150 a 200 ms, e `components/movimento.test.ts` acusa curva escrita à mão, `ease-out`, `ease-in`, `ease-in-out`, `ease-linear` e duração maior; `components/movimento.medida.test.tsx` mede no Chromium. O toast (`sonner`) segue os 200 ms e o `ease-forte` por `!important` no `index.css`. Com movimento reduzido, sai só o que desloca, gira ou cresce, e cor, opacidade e sombra continuam: o mesmo teste acusa `motion-reduce:transition-none` numa linha onde nada se move. Ação de teclado, como o Ctrl+B, não anima.

## Agent skills

Animação nova passa pela skill `animate`, e a revisão de animação, pela `review-animations`. As duas vêm de `emilkowalski/skills`, ficam em `.agents/skills/` com link em `.claude/skills/` e entram no `skills-lock.json`. A `review-animations` tem `disable-model-invocation`: só roda quando o dono digita `/review-animations`, e o agente que precisa da revisão lê o `SKILL.md` e o `STANDARDS.md` dela e aplica o checklist.

### Issue tracker

As issues ficam no GitHub Issues de `profillsbrasil/cursos` (repo público), pelo `gh`. Comandos e wayfinding (`/wayfinder`): `docs/issues.md`.

- Labels exigem permissão de triage no repo; as contas do gh desta máquina hoje têm só leitura, então `gh issue edit --add-label` falha até o dono dar acesso.
- "Publicar no issue tracker" quer dizer criar uma issue no GitHub. "Buscar o ticket" quer dizer `gh issue view <n> --comments`.
- PRs como superfície de pedidos: **não**. PRs externos não entram na triagem.
- `#42` pode ser issue ou PR (mesma numeração): tente `gh pr view 42` e caia para `gh issue view 42`.

### Triage labels

Os cinco papéis usam o nome padrão como label: `needs-triage` (o mantenedor precisa avaliar), `needs-info` (esperando quem reportou), `ready-for-agent` (especificado, pronto para um agente sozinho), `ready-for-human` (precisa de implementação humana), `wontfix` (não será feito).

### Domain docs

Contexto único: `GLOSSARY.md` e `docs/adr/` na raiz.

- Antes de explorar uma área, leia o `GLOSSARY.md` e as ADRs de `docs/adr/` que tocam nela.
- Nome de conceito de domínio em issue, proposta, hipótese ou teste usa o termo do glossário. Conceito ausente do glossário é sinal: ou a linguagem é inventada, ou é uma lacuna para o `/domain-modeling`.
- Saída que contradiz uma ADR diz isso explicitamente: _Contradiz a ADR-0007 (...), mas vale reabrir porque..._
