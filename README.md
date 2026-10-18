# Profills Cursos

A plataforma de cursos da Profills Brasil (repositório `cursos`). As regras de trabalho estão em `CLAUDE.md`, e o mapa do código arquivo por arquivo em `docs/mapa.md`. O produto está em `apps/web/PRODUCT.md`, o sistema visual em `apps/web/DESIGN.md`, a marca em `docs/marca/README.md`, o vocabulário do domínio em `GLOSSARY.md` e as decisões de arquitetura em `docs/adr/`.

O monorepo é Bun e Turborepo, gerado pelo [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack): Next.js 16, tRPC 11, Drizzle sobre o Postgres do Supabase, Clerk e shadcn (Base UI), com deploy na Vercel.

## Estrutura

```
cursos/
├── apps/web/          # o app Next.js (porta 3001)
├── packages/api/      # @cursos/api: routers do tRPC, regras do domínio e consultas
├── packages/db/       # @cursos/db: schema, migrações e seed do Drizzle
├── packages/ui/       # @cursos/ui: componentes shadcn e tokens
├── packages/config/   # @cursos/config: tsconfig compartilhado
├── scripts/           # sync-vercel-env.ts
└── docs/              # ADRs, marca e specs
```

## Primeiros passos

1. Instale as dependências com `bun install`. O `postinstall` gera os `env.ts` pelo varlock.
2. Preencha o `apps/web/.env` seguindo o contrato de `apps/web/.env.schema`. O `CORS_ORIGIN` precisa ser exatamente a origem do browser (`http://localhost:3001`); com outro valor, o Clerk recusa o token e toda chamada protegida responde `UNAUTHORIZED`.
3. Suba o app com `bun run dev:web`, ou tudo com `bun run dev`, e abra http://localhost:3001.

O `DATABASE_URL` do `.env` aponta para o banco cloud do Supabase, que é o banco real. `db:push` e `db:migrate` contra ele são escrita em produção: só rode com o OK do dono. Para trabalhar isolado, use o Supabase local:

```bash
bun run db:start                                   # sobe o Supabase local (porta 54322)
cd packages/db && bun run db:migrate:local         # aplica as migrações no banco local
bun run --cwd apps/web dev:local                   # sobe o app contra o banco local
```

O seed de exemplo roda dentro de `packages/db` com `bun run db:seed -- --aluno <userId do Clerk>` e recusa host que não seja o local.

## Scripts da raiz

| Script | O que faz |
|---|---|
| `bun run dev` e `dev:web` | Sobe tudo, ou só o app |
| `bun run build` | Builda todos os pacotes |
| `bun run test` | Roda os testes; os de integração pedem `TEST_DATABASE_URL` no banco local |
| `bun run check-types` | Confere os tipos de todos os pacotes |
| `bun run check` e `fix` | Lint e formato pelo Ultracite (Biome) |
| `bun run env:generate` | Regenera os `env.ts` depois de mudar um `.env.schema` |
| `bun run db:start` e `db:stop` | Sobe e derruba o Supabase local |
| `bun run db:generate` | Gera a migração SQL a partir do schema (`drizzle-kit generate`) |
| `bun run db:migrate`, `db:push` e `db:studio` | `drizzle-kit` contra o `DATABASE_URL`; são tasks interativas do turbo, então num shell sem TTY rode `bunx drizzle-kit <comando>` dentro de `packages/db` |
| `bun run deploy:setup` | Liga o repo a um projeto da Vercel |
| `bun run env:preview` e `env:production` | Envia o env para a Vercel |
| `bun run deploy`, `deploy:prod` e `deploy:check` | Deploy de preview, deploy de produção e a simulação sem envio |

## Componentes de UI

Os componentes shadcn moram em `packages/ui` e se importam por caminho, como `@cursos/ui/components/button`. Para acrescentar um, rode o CLI **dentro de `packages/ui`**: `bunx --bun shadcn@latest add <nome>`. Rodado em `apps/web`, o hook do componente cai no app e o componente não compila. Sem TTY, o `add` trava quando pergunta se sobrescreve um arquivo; use `yes n | bunx --bun shadcn@latest add <nome>`.

## Env

Cada pacote tem o próprio `.env.schema`, e o varlock gera o `src/env.ts` dele. O código de servidor do app importa `ENV` de `apps/web/src/env.server.ts`. O carregamento automático de env do Bun está desligado em `bunfig.toml`: quem carrega é a integração do varlock com o Next. Rode ferramentas que usam o varlock de dentro do pacote dono do schema.

## Deploy

O `vercel.json` declara um serviço só, `web`, com raiz em `apps/web` e install na raiz do monorepo. O deploy não envia o `.env` local: rode `bun run env:preview` ou `env:production` antes do primeiro deploy. Sem argumento, o `env:production` envia o `apps/web/.env` de dev, com as chaves `pk_test` e o banco do dev. Para produção, monte um `apps/web/.env.production.local` (ignorado pelo git) e rode `bun run env:production apps/web/.env.production.local`.
