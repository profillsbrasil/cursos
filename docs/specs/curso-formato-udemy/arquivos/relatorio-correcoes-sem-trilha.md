# Relatório: correções da revisão em feat/catalogo-sem-trilha

Worktree `/home/othavio/.herdr/worktrees/cursos/catalogo-sem-trilha`, branch `feat/catalogo-sem-trilha`. A ponta é `8bb13bb`, com push feito. Nenhum PR aberto. O servidor `dev-up-3005` continua de pé (`systemctl --user is-active dev-up-3005` respondeu `active`).

## Commits

| SHA | Assunto | Item |
| --- | --- | --- |
| `40b1fdd` | Merge remote-tracking branch 'origin/main' into feat/catalogo-sem-trilha | Passo 0 |
| `914f33f` | test: migração preserva o livro-razão | 1 |
| `e74eadc` | refactor: estado do curso sem alcance | 2 |
| `beaea60` | refactor: liberar lê só a ativa do curso | 3 |
| `44ab7ae` | refactor: tira parâmetros que sobraram da trilha | 4 |
| `411edb7` | refactor: ordem dos cursos por estado em Record | 5 |
| `11c8b29` | fix: tira textos repetidos de Meus cursos e da busca | 6 |
| `428b92a` | chore: seed com curso em produção e capas órfãs | 7 |
| `2168f4c` | chore: corrige nomes, check sem ::text e ADR | 8 |
| `8bb13bb` | docs: ordem de aplicar a migração no cloud | 9 |

O assunto de `11c8b29` tem 52 caracteres, dois acima do teto de 50. Corrigir pede amend e `--force`, que o brief proíbe, então ficou assim.

## Verificações

As três rodaram antes de cada commit, com `--force` no turbo e `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/cursos_sem_trilha`. A saída completa de cada rodada está em `docs/specs/curso-formato-udemy/arquivos/correcoes/<item>-{tipos,lint,test}.txt`. Na ponta (`8bb13bb`, rodada `item9`):

`bun run check-types --force`:

```
web:check-types: cache bypass, force executing c2c9344c87052aae
 Tasks:    4 successful, 4 total
Cached:    0 cached, 4 total
tipos exit 0
```

`bun x ultracite check`:

```
Checked 395 files in 566ms. No fixes applied.
ultracite exit 0
```

`bun run test --force`:

```
@cursos/ui:test:  32 pass
@cursos/ui:test:  0 fail
@cursos/db:test:  61 pass
@cursos/db:test:  0 fail
web:test:  367 pass
web:test:  0 fail
@cursos/api:test:  334 pass
@cursos/api:test:  0 fail
 Tasks:    4 successful, 4 total
test exit 0
```

Nenhum teste exigiu o database `postgres`. Antes da rodada, a ponta `1a1a4fe` tinha 59 testes no db, 359 no web e 339 na api. As diferenças vêm dos testes novos, dos testes apagados no item 2 e no item 3, e dos 6 testes que o merge da main trouxe para o web.

## Passo 0: merge da main

`git merge origin/main` trouxe o PR #63. O único conflito foi a linha de `src/components/casca/` do `CLAUDE.md`. Resolvi com um script que parte da nossa linha e aplica as três mudanças da main: 68 px recolhida, o parágrafo da Moldura com `moldura.medida.test.tsx`, e a largura recolhida sem a borda de 1 px. Os outros arquivos (`DESIGN.md`, `design.json`, `nav.ts`, `nav.test.ts`, `index.css`) entraram sem conflito. A main não trouxe migração, então o timestamp de `20261015180126_catalogo_sem_trilha` continua o último.

## O que cada item mudou

1. **Teste da migração.** O bloco `catalogo_sem_trilha` planta também uma `aula_assistida` com o lançamento de 10 pontos, um `certificado` com o `curso_concluido` de 100, um `sequencia_7_dias` de 50 e uma troca. A troca é a liberação de origem `troca` de um terceiro curso, com o lançamento de -200 que aponta para ela. Depois de migrar, o teste confere com valores literais que os quatro lançamentos ficam com `motivo` e `pontos` intactos, e que a troca ainda aponta para o curso. Com isso, o único lançamento que some é o `trilha_concluida`. Confere também que as liberações `solto/admin` e `trocado/troca` ficam, e que `ponto_lancamento_sinal` e `ponto_lancamento_referencia` recusam uma violação cada um. Prova de que o teste pega o erro: troquei o `DELETE` da migração por `DELETE FROM "ponto_lancamento";` e o teste novo falhou (`(fail) ... só o lançamento trilha_concluida some do livro-razão`, `10 pass, 1 fail`). Com o SQL original de volta, deu `11 pass`. No bloco de `origem_da_liberacao`, saíram a trilha plantada, a liberação dela e o comentário.
2. **`alcance`.** Saíram `alcance` e `CursoAlcancado`. `CursoNaTela<C extends CursoComAulas = CursoCatalogo>` agora mora em `curso.ts` e é o tipo único. `montarPainel` faz `liberados.map((curso) => ({ curso, estado: estadoDoCurso(curso, h) }))`, e a busca faz o mesmo `map` sobre os cursos das liberações ativas. Apaguei o teste "curso liberado duas vezes" de `curso.test.ts` e o de `painel.test.ts`. Saiu também o outro teste do bloco `alcance`, que testava a função apagada. O estado por curso continua coberto pelos testes de `estadoDoCurso`. O docstring de `estadoDoCurso`, o cabeçalho de `dominio/acompanhamento.ts` e as duas frases do `CLAUDE.md` dizem que `estadoDoCurso` é a regra única do estado.
3. **Liberar.** Dentro da trava, `liberar` chama `ativaDoCurso(tx, userId, cursoId)`, um `findFirst` com `{ ...filtroLiberacaoAtiva(userId), cursoId }`. A função devolve a liberação que achou com `nova: false` ou insere uma nova. Saíram `LiberacaoAtiva`, `DecisaoDeLiberar`, `decidirLiberar`, o `ativaDoCurso` do domínio, `liberacoesAtivas` e os três testes de `decidirLiberar`. `montarAcesso` usa um `Set` dos ids ativos. O teste de integração "liberar duas vezes, em série ou em paralelo, grava uma linha" já conferia `nova: false` e o mesmo id na terceira chamada. Acrescentei `expect(b.liberacaoId).toBe(a.liberacaoId)` para as duas chamadas paralelas. A corrida "troca antes de liberar" continua devolvendo a liberação da troca com `nova: false`. O `CLAUDE.md` deixou de dizer que o domínio "decide liberar" e passou a descrever a busca dentro da trava.
4. **Parâmetros vestigiais.**
   - O `base` saiu de `RegrasDoRascunho.mudar` e da chamada em `apoiado`. O hook continua genérico.
   - O `oQue` saiu de `fraseDeReserva`, `BarraDeSalvar` e `AvisoDeVersaoMudou`. O aviso diz "Outra pessoa salvou este curso". O teste da frase de reserva confere as duas frases inteiras.
   - `seguraATabela(db)` não recebe mais a tabela. Ela usa `sql\`lock table liberacao in share mode\``, sem o `sql.raw`.
   - `LinhaParaLiberar` se fundiu em `LinhaDoCurso`. O comentário perdeu a frase da confirmação, que essa linha não tem.
   - Saiu o `div.grid` em volta da `Secao` de `visao-do-catalogo`.
   - Saiu `Acompanhamento.titulo`. Os testes que liam o título passaram a ler `l.curso.titulo`, nos dois testes de integração do acompanhamento, nos testes de domínio, no `acompanhamento.test.ts` do web e no `sinal-do-foco.test.tsx`.
   - `CapaCurso` não recebe mais `sizes`. A constante `SIZES_DA_GRADE` ficou interna ao arquivo.
   - Saiu o `not.toContain("380px")` de `loading.test.tsx`.
   - O `CLAUDE.md` deixou de dizer "cada editor" (duas frases) e "os editores de documento". O texto agora diz "o estado próprio do editor" e "as peças de apoio do editor".
5. **Ordem dos cursos.** `ORDEM_DOS_CURSOS` virou `Record<TipoEstado, number>`, e o sort subtrai os dois pesos. O teste novo em `painel.test.ts` libera os cinco estados na ordem inversa (concluído, em breve, não iniciado, prova, em andamento). Ele confere `[["em-andamento","em_andamento"],["prova","prova"],["nao-iniciado","nao_iniciado"],["em-breve","em_breve"],["concluido","concluido"]]`. A ordem já era essa antes, então o teste protege contra regressão e não prova um bug.
6. **Textos repetidos.**
   - A seção "Cursos" de Meus cursos perdeu o subtítulo. `Secao` passou a aceitar `subtitulo` opcional, porque Trocar pontos ainda usa o subtítulo. Um teste novo confere que "liberados para você" aparece uma vez só.
   - Em `NumerosDaPessoa`, `liberacoes` virou `emProducao`, que conta os cursos ativos fora de `cursos`. A frase da busca ficou "2 de 5 cursos concluídos · último estudo em 21 de set.". Com curso em produção, ela fica "1 de 3 cursos concluídos · 2 em produção · último estudo em 21 de set.". O `nunca_abriu` diz "Com acesso desde 2 de out. · nenhuma aula aberta". Os fixtures de número foram reescritos por um script, `emProducao = liberacoes - cursos`, em 7 lugares. O `DESIGN.md` foi atualizado com a frase nova e a seção sem subtítulo.
7. **Seed.**
   - "Gravação de Máquinas" virou `em_producao`. É um dos cursos liberados ao aluno A, então o protótipo de Meus cursos agora mostra uma capa "Em produção". Os testes de `conteudo.test.tsx` mudaram junto. O link de Gravação sai da lista, a linha sob a capa vira "Produtos e aplicações · Regra 5x4" sem o tamanho, e a etiqueta vira "Em produção". As provas de duração e de NBSP que usavam Gravação passaram para Nova Rotina ("9 aulas · 1 h 35 min") e para Fábrica (`7 aulas · 1 h 14 min`). Em `painel.test.ts`, Gravação passou a ser `em_breve`.
   - `rg` não achou nenhuma referência a `operacao.jpg` nem a `calibracao.jpg`, nem nas migrações. As duas capas foram apagadas com `git rm`.
   - Em `dominio/exemplo.ts`, a data de `LIBERADOS_A` passou a ser `new Date(Date.UTC(2026, 7, 1 + i, 12))` no lugar de `` `2026-08-0${i + 1}` ``.
   - O tema de "Fábrica e montagem" passou a ser "Produção e montagem".
8. **Nomes e comentários.**
   - Em `troca.ts`, `direta` passou a se chamar `ativa`, porque a consulta só traz a ativa. No teste, a variável passou a se chamar `doAdmin`.
   - O `::text` deixou de ser necessário, e saiu. Medi num banco novo com um script em `docs/specs/curso-formato-udemy/arquivos/sem-text.sh`. Ele aplicou todas as migrações numa transação só, com os dois checks de `ponto_lancamento` sem o `::text`, e a transação passou: `exit 0`, com o check gravado como `CASE motivo WHEN 'troca'::motivo_ponto`. O `'troca'` agora vem do `CREATE TYPE` da mesma migração, não de um `ADD VALUE`, então o "unsafe use of new value" não dispara. Tirei o `::text` dos dois checks em `schema/pontos.ts`, na `migration.sql` e no `snapshot.json` da `catalogo_sem_trilha`, que ainda não foi aplicada no cloud. O comentário saiu junto. `env -u DATABASE_URL bunx drizzle-kit generate --config drizzle.wt.config.ts` respondeu "No schema changes, nothing to migrate". O teste da migração (item 1), que roda as migrações num banco novo, prova que os dois checks ainda recusam a violação.
   - A ADR 0001 tirou a retomada da lista do que não muda. Ela agora diz que a retomada não leva mais a trilha, e que o Continuar vai ao primeiro curso não iniciado na ordem da tela, não mais ao primeiro de uma trilha antes dos soltos.
9. **Ordem de aplicação.** A ADR 0001 ganhou a seção "Ordem de aplicação no banco cloud". A ordem é esta: o PR entra na main, os outros worktrees juntam a main, e o dono aplica a migração e zera o banco no mesmo momento. O motivo também está lá: aplicar antes quebra a main e os worktrees que ainda leem trilha. A seção diz que a migração não ganha guarda nem opt-in, porque os dados são de teste. Saiu o item 4 da lista "Fica para os próximos PRs", porque a seção nova o substitui. O `CLAUDE.md` ganhou a mesma regra na seção Banco.

## `rg` de trilha

`rg -il "trilha" apps packages GLOSSARY.md CLAUDE.md -g '!packages/db/src/migrations/**' -g '!**/node_modules/**'` acha dois arquivos.

- `packages/db/src/migracao.integration.test.ts` planta trilha antes da migração que a apaga.
- `CLAUDE.md` cita o nome da migração `catalogo_sem_trilha` na regra nova do item 9.

## Fora do escopo, com o motivo

- O índice por `curso_id` em `liberacao` e a conversão das liberações de trilha antes do DELETE ficaram de fora, porque o brief os exclui.
- O curso "Limpeza CIP e troca de formato" ainda tem o tema "Fábrica e montagem". O item 7 só pedia o tema do curso Fábrica e montagem, e o brief manda não aplicar o que não está na lista. Agora existe um tema com o nome de outro curso. Vale decidir se Limpeza também passa para "Produção e montagem".
- A afirmação `not.toContain("h-[116px]")` de `loading.test.tsx` ficou. Ela é tão histórica quanto a de 380 px, mas o brief só citou a de 380 px.

## Escolhas feitas sem o brief

- O curso em produção é Gravação de Máquinas, um curso liberado. Assim, o protótipo do aluno mostra o estado "Em produção". Um curso não liberado só apareceria para o admin.
- A frase `nunca_abriu` sem contagem ficou "Com acesso desde ...". Ela é neutra de gênero e fala do acesso ativo mais antigo.
- O `::text` saiu (item 8) em vez de ganhar um comentário novo. Para isso editei a migração e o snapshot ainda não aplicados, sem gerar migração nova. O banco local `cursos_sem_trilha` continua com os checks da versão com `::text`, que se comportam igual.
- Em `Secao`, o `subtitulo` passou a ser opcional, porque Trocar pontos ainda usa o subtítulo.

## Pendente e avisos

- **Prova em browser.** As mudanças de tela não foram vistas no browser: o subtítulo que saiu, a frase da busca, a linha de Liberar, o wrapper do catálogo e a capa "Em produção" do seed. Elas foram implementadas e verificadas só pelos testes de render. Não tirei screenshot.
- **Formatter.** O hook do Biome não formatou os arquivos deste worktree depois de cada Edit. Na rodada do item 2, o `ultracite check` acusou `painel.ts`. Desde então, rodei `bun x ultracite fix` nos arquivos tocados antes de cada verificação.
- **Banco cloud.** Não toquei nele.
