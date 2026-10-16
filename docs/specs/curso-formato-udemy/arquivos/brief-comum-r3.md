# Regras comuns dos delegados da página do curso e das categorias

Estas regras valem para os dois briefs: `brief-pagina-do-curso.md` e `brief-tela-de-categorias.md`.

## Antes de escrever código

1. Leia o `CLAUDE.md` da raiz do seu worktree, o `apps/web/DESIGN.md` inteiro e o `GLOSSARY.md`.
2. Leia `docs/specs/curso-formato-udemy/README.md`, nas seções "Decisões do dono" e "Próximos passos".
3. Rode a skill `impeccable` pela ferramenta Skill. O modo é Operate: uma tela de produto que segue um protótipo aprovado. Siga o Setup da skill.
   - Rode `~/.claude/skills/impeccable/scripts/impeccable context --target <a rota que você constrói>` uma vez, dentro do seu worktree.
   - Leia `~/.claude/skills/impeccable/reference/craft-floor.md` antes de qualquer edição de UI.
   - Esta é uma implementação de um protótipo aprovado. Ela não é um redesenho. O protótipo aprovado se segue à risca, e o `DESIGN.md` vence em token, fonte, cor e componente.
4. Antes de qualquer lógica, escreva a forma dos dados que a tela consome, e o estado como união discriminada, nunca como booleanos espalhados.

## Ambiente

- O worktree e a branch são seus e de mais ninguém. A dependência já está instalada, e o `apps/web/.env` é um link para o checkout principal. Nunca imprima o conteúdo dele.
- O seu database do Supabase local já está migrado. Rode os testes com `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/<seu database>`.
- Job pesado, como `bun run test` ou `check-types`, roda por `systemd-run --user --quiet --pipe --wait -p MemoryMax=8G -p WorkingDirectory=$PWD -E PATH="$PATH" -E HOME="$HOME" -E TEST_DATABASE_URL=... <comando>`. Sem isso, o systemd-oomd derruba a sessão.
- Um hook formata cada arquivo depois de cada Edit ou Write. Releia o arquivo antes do próximo Edit no mesmo trecho.
- Não rode o servidor do Next. A prova no browser é da sessão principal. Para medir layout, siga o padrão dos testes `*.medida.test.tsx` do repo, no Chromium headless (`components/chromium-de-teste.ts`).

## O que você não toca

- `CLAUDE.md`, `apps/web/DESIGN.md`, `apps/web/.impeccable/`, `GLOSSARY.md` e `docs/`. A sessão principal atualiza os docs depois de juntar as duas frentes. No relatório, diga o que cada um desses arquivos precisa ganhar.
- `apps/web/src/index.css`, `packages/ui/`, `packages/db/` e `packages/api/`. Se a tela precisar de mudança num deles, pare e diga no relatório qual mudança e por quê.
- Arquivos fora da lista do seu brief.

## Verificar e entregar

- Todo teste novo usa valores literais e confere o que a pessoa vê. Ele falha quando o comportamento quebra.
- As três verificações:
  - `bun run check-types`;
  - `bun x ultracite check apps/web packages/api`. O `ultracite check` da raiz está vermelho por causa do material arquivado em `docs/specs/`, que é pré-existente e fica de fora;
  - `bun run test` com o seu `TEST_DATABASE_URL`.
- Commits pequenos, em Conventional Commits, em português, com o subject até 50 caracteres e sem atribuição de IA. Não faça push e não abra PR.
- Rode a skill `/deslop` e depois a `/no-comments` antes do último commit.
- O relatório final traz:
  - os commits;
  - a saída real das três verificações;
  - os arquivos criados;
  - cada desvio do protótipo, com o motivo;
  - o que o `CLAUDE.md` e o `DESIGN.md` precisam ganhar;
  - o que ficou sem prova.
