O catálogo passa a ter um tipo só de coisa, o curso. A trilha sai inteira, junto com o curso solto, os "Cursos rápidos", a regra que travava um curso até o anterior acabar e a liberação de trilha. O curso continua com módulos como seções. A decisão está na `docs/adr/0001-catalogo-so-de-cursos.md`.

## O que muda para quem usa

- **Aluno.** Meus cursos mostra todos os cursos liberados numa seção só, "Cursos", ordenados pelo estado: em andamento, prova, não iniciado, em produção e concluído. Some o "Abre depois de".
- **Admin.** O catálogo vira uma lista de cursos, sem "Nova trilha". A tela de acesso libera e revoga só cursos. A busca de pessoas conta cursos concluídos e cursos em produção.
- **Seed.** Fábrica e montagem vira um curso com 3 módulos. Gravação de Máquinas fica em produção, para o estado aparecer no dev.

## Migração `20261015180126_catalogo_sem_trilha`

A migração apaga as liberações de trilha e os lançamentos `trilha_concluida`, depois derruba `trilha`, `trilha_curso` e as colunas `trilha_id`. Ela também recria o enum `motivo_ponto` sem `trilha_concluida`, e `liberacao.curso_id` vira NOT NULL. Os dados de hoje são de teste, então ela não converte nada.

`migracao.integration.test.ts` planta uma linha de cada motivo que fica (aula assistida, curso concluído, sequência e troca) e confere que só a trilha some. Com um `DELETE FROM ponto_lancamento` sem filtro no lugar do original, o teste falha.

**Ordem no banco cloud.** O banco cloud é dividido entre a main e os worktrees abertos. Por isso a migração só entra depois do merge e depois de os outros worktrees juntarem a main. Aplicar a migração e zerar o banco acontecem no mesmo momento, pelo dono. A ordem também está na ADR e no `CLAUDE.md`.

## Como foi verificado

- `bun run check-types`, `bun x ultracite check` e `bun run test` passam com o turbo em `--force` e o Supabase local: ui 32, db 61, web 367 e api 334 testes, nenhum falhando.
- As telas foram abertas no browser contra o banco local, sem erro no console: Meus cursos, o player de Fábrica e montagem, o catálogo, a busca e a tela de acesso.

## Fica para os próximos PRs

Descrição, tópicos e categoria do curso, descrição da aula, a página do curso para o aluno, o questionário por aula com nota mínima e a emissão do certificado.
