# cursos

Plataforma de cursos da Profills. Monorepo Bun + Turborepo gerado pelo Better T Stack (`bts.jsonc` guarda o comando de origem; `bunx create-better-t-stack@latest add` acrescenta addons).

Stack: Next.js 16 (App Router, React Compiler, `typedRoutes`), tRPC 11 (o browser chama pelo `trpcClient`, sem TanStack Query), Drizzle 1.0 RC sobre Postgres do Supabase, Clerk para auth, shadcn (estilo `base-lyra`, Base UI), Motion para animação que o CSS não resolve, Biome via Ultracite, varlock para env, deploy na Vercel.

## Mapa

O mapa arquivo por arquivo de `apps/web`, `packages/api` e `packages/db` mora em `docs/mapa.md`: o que cada arquivo possui, quem chama quem, as medidas e o teste que guarda cada regra. Antes de ler ou mudar uma pasta, leia a entrada dela lá. Quem muda o que uma entrada descreve atualiza a entrada no mesmo PR.

O pedido do browser percorre as camadas nesta ordem:

- `apps/web/src/proxy.ts`: `clerkMiddleware()` em todas as rotas, sem regra por caminho. A proteção mora em `src/server/api.ts`.
- `apps/web/src/app/`: as rotas. `(aluno)/` tem as telas do aluno, `(admin)/admin/` a área do admin, atrás de `exigirAdmin()`, `certificado/` a conferência pública sem login, e `api/trpc/[trpc]/route.ts` é o único endpoint HTTP da API.
- `apps/web/src/server/api.ts`: os `carregar*` que os Server Components chamam, pelo `createCaller` no processo, com `React.cache` por request.
- `apps/web/src/context.ts` e `src/services.ts`: o contexto do tRPC por request e os serviços (banco, capas e Clerk), montados uma vez.
- `apps/web/src/components/`: `casca/` (a navegação comum), `aluno/`, `admin/` e uma pasta por tela do aluno (`meus-cursos/`, `curso/`, `player/`, `conquistas/`, `comunicados-do-aluno/`, `trocar-pontos/`, `certificado/`).
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
- Quando o `add` pergunta se sobrescreve um arquivo existente, ele trava sem TTY. Num agente, rode `yes n | bunx --bun shadcn@latest add ...` para manter os existentes, e só use `--overwrite` com pedido do dono.
- O Biome não roda lint em `src/components/`, `src/hooks/` e `src/lib/utils.ts` (override no `biome.jsonc`), porque o `shadcn add` regenera esses arquivos. Ajuste de comportamento entra no componente do app que os usa.

### Raiz

- `scripts/sync-vercel-env.ts`: atrás de `bun run env:preview` e `env:production`.
- `vercel.json`: serviço `web` com raiz em `apps/web` e install na raiz do monorepo.
- `AGENTS.md` e `apps/web/AGENTS.md`: blocos que o turbo e o `next dev` reescrevem sozinhos. Commite as mudanças deles junto com o trabalho.
- `apps/web/PRODUCT.md`: o produto, o público e as decisões do dono. `apps/web/DESIGN.md` (com o sidecar `apps/web/.impeccable/design.json`): o sistema visual tirado do código, com tokens, tipografia, formas, a casca e as regras de movimento. UI nova segue o `DESIGN.md`; mudança que o contradiz atualiza o arquivo no mesmo PR.
- `docs/marca/`: o que é cada arquivo da marca e de onde veio, e a Orbitron do lockup com a licença OFL (`fontes/orbitron/`). O logo oficial da Profills fica ali como referência, fora do `public/`.

## Env (varlock)

- O contrato fica em `apps/web/.env.schema`; os valores locais, em `apps/web/.env` (fora do git). `packages/db/.env.schema` importa `NODE_ENV` e `DATABASE_*` do app.
- `@defaultSensitive=true` marca toda variável como segredo. Valor que chega ao browser leva `@public`, senão o varlock acusa `DETECTED LEAKED SENSITIVE CONFIG` e derruba o request. Foi o que aconteceu com `CLERK_PUBLISHABLE_KEY`.
- Depois de editar o schema: `bun run env:generate` para regenerar os `env.ts`, e reinicie o `next dev`.
- `SUPABASE_URL` (`@public`, porque a URL da capa leva o host ao browser) e `SUPABASE_SERVICE_ROLE_KEY` são opcionais. Sem uma delas, o envio de capa do admin recusa com "não configurado" e o resto funciona.
- `CORS_ORIGIN` precisa ser exatamente a origem do browser (`http://localhost:3001` no dev). Com outro valor, o Clerk recusa o token e todo `protectedProcedure` responde `UNAUTHORIZED`.

## Banco

- O `DATABASE_URL` do `.env` aponta para o projeto **cloud** do Supabase (`lsatugtpqwiylnfutolg`, org profillsbrasil, `sa-east-1`), pelo pooler de transação na porta 6543. É decisão do dono: o dev usa o banco real. Trate `db:push` e `db:migrate` como escrita em produção e confirme antes.
- `drizzle-kit` contra o cloud usa o mesmo host na porta 5432 (session pooler).
- A main e todos os worktrees usam esse mesmo banco, então migração que quebra o código antigo (como a `catalogo_sem_trilha`, ADR 0001) espera a ordem: o PR entra na main, os outros worktrees juntam a main, e só então o dono aplica a migração no cloud e zera o banco, no mesmo momento. Aplicar antes quebra a main e os worktrees abertos.
- O app conecta como `postgres`, que tem `BYPASSRLS`. O projeto cloud tem o event trigger `ensure_rls`, que liga RLS em toda tabela nova do `public`, e a Data API não expõe tabelas novas. RLS só protege acesso via `anon`/`authenticated`; a autorização do app mora nos procedures do tRPC.
- O Supabase local (`bun run db:start` / `db:stop`) existe para testes isolados; para usá-lo, troque o `DATABASE_URL` para `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- `bun run db:push` (e `db:generate`, `db:migrate`) da raiz é task interativa do turbo e falha num shell sem TTY. Num agente, rode `bunx drizzle-kit <comando>` dentro de `packages/db`.
- O MCP `supabase` deste ambiente pode estar logado em outra conta e não enxergar o projeto. Confira com `list_projects` antes de usá-lo; se o projeto não aparecer, use o dashboard.

## Auth (Clerk)

- App "cursos" na workspace PROFILLS DO BRASIL, só a instância Development (`pk_test`/`sk_test`). A instância de produção exige domínio próprio.
- Usuário logado no servidor: `ctx.auth.userId` dentro de `protectedProcedure`. Não existe tabela de usuários; quando precisar, sincronize pelo webhook do Clerk (skill `clerk-webhooks`).
- Papel de admin: `{ "papel": "admin" }` no Public metadata do usuário, e o claim `{ "papel": "{{user.public_metadata.papel}}" }` em Sessions, "Customize session token". Quem muda o metadata precisa sair e entrar de novo, ou esperar o token renovar (até 60 s).

## Comandos

- `bun run dev` sobe tudo; `bun run dev:web` só o app. `bun run --cwd apps/web dev:local` sobe o app contra o Supabase local (o `process.env` vence o `.env` no varlock). Não use `bun --bun next dev`: o Turbopack não resolve o `pg` no runtime do Bun.
- Testes: `bun run test`. Os de integração só rodam com `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres` e recusam host que não seja local. Banco local: `bun run db:migrate:local` e `bun run db:seed -- --aluno user_xxx`, dentro de `packages/db`.
- Antes de commitar: `bun run check-types` e `bun x ultracite check` verdes. Com o `typedRoutes`, o tipo `Route` só fica estrito depois que o `next dev` ou o `next build` gera `apps/web/.next/types`: num worktree novo, o `check-types` passa com href que a branch principal recusa, então rode um dos dois antes. Um hook do Claude Code (`.claude/hooks/formatar-arquivo-editado.ts`) roda o Biome no arquivo editado depois de cada Edit/Write, então o arquivo pode mudar logo após a edição: releia antes do próximo Edit.
- Deploy: `bun run deploy:setup` linka a Vercel. `bun run env:production` sem argumento envia o `apps/web/.env` (menos `CORS_ORIGIN` e `NODE_ENV`), que tem as chaves `pk_test` e o banco do dev. Para produção, monte um `apps/web/.env.production.local` (já ignorado pelo git) e rode `bun run env:production apps/web/.env.production.local`.

## Código

Biome (via Ultracite) cobre formatação e a maior parte do estilo. O que ele não pega:

- Busca assíncrona de dados vai em Server Component, não em Client Component `async`.
- Erro para o usuário sai como `ErroParaAPessoa` com `code` e `message`. Só essa mensagem chega ao toast do `useAcao`; os outros erros viram o texto genérico.
- Use o vocabulário do `GLOSSARY.md` em nomes de tabela, procedure e componente.
- Constante de classe não mora em módulo "use client": num Server Component ela chega como client reference, e o `cn` a descarta sem erro. Ela vai para um módulo sem a diretiva (`casca/botoes.ts`, `casca/campos.ts`, `admin/partes.tsx`); `components/fronteira-do-cliente.test.ts` acusa a volta.
- O foco de teclado é o hover: a variante `hover:` do `globals.css` também casa com `:focus-visible` (e com o label ou o polegar do slider que envolve o input focado), e `focus-visible:` não pinta nada. Controle sem hover ganha a borda Céu pelo `data-slot` na regra do `index.css`; moldura própria leva `data-campo`. Nenhum contorno de foco, nem no alto contraste do Windows. Os dois `foco.test.ts` (`packages/ui/src/styles/` e `apps/web/src/components/`) acusam anel ou contorno de volta. A pílula do item ativo é irmã do link, então acende pela variante `ativo-aceso` do `index.css`, que lê o cursor e o foco do link. `components/sinal-do-foco.test.tsx` renderiza a navegação, a coluna do player e a busca de pessoas, compila o CSS do app e confere o sinal de foco de cada controle da #44, do item "Em breve", dos `summary` das revogadas e da faixa do comunicado. A pílula e o Revogar em 390 px ele confere no Chromium da máquina, em headless (`/usr/bin/chromium`; a variável `CHROMIUM` aponta outro caminho); sem ele, essas duas suítes pulam e o resto roda. O CSS compilado e o Chromium guiado pelo DevTools moram em `components/chromium-de-teste.ts`, que os testes de medida também usam.
- Animação: CSS antes de Motion; Motion (`motion/react`) só quando o CSS não resolve, como a pílula de `casca/nav-principal.tsx`. Com Motion, anime a string `transform` inteira (nunca `x`, `y` ou `scale`), use `initial={false}` para o SSR já escrever a posição e respeite `useReducedMotion()`. A curva é `cubic-bezier(0.23, 1, 0.32, 1)`, o token `--ease-forte` de `index.css` (`ease-forte` no Tailwind). Transição da interface dura de 150 a 200 ms, e `components/movimento.test.ts` acusa curva escrita à mão e duração maior. Ação de teclado, como o Ctrl+B, não anima.

## Agent skills

Animação nova passa pela skill `animate`, e a revisão de animação, pela `review-animations` (as duas instaladas globalmente).

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
