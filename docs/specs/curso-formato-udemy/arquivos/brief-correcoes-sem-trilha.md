# Brief: correções da revisão em feat/catalogo-sem-trilha

Worktree exclusivo seu: `/home/othavio/.herdr/worktrees/cursos/catalogo-sem-trilha`, branch `feat/catalogo-sem-trilha` (ponta `1a1a4fe`, já com push). O brief original está em `docs/specs/curso-formato-udemy/arquivos/brief-catalogo-sem-trilha.md`, e o relatório do primeiro dono em `relatorio-catalogo-sem-trilha.md`, na mesma pasta. As regras, as proibições e o modo de verificar daquele brief continuam valendo.

Os achados de três revisores estão em `review-A-opus.md`, `review-B-sonnet.md` e `review-C-opus-xhigh.md`, na mesma pasta. Abaixo está o que eu decidi aplicar. Não aplique o que não está nesta lista.

## Passo 0: juntar a main

`git fetch origin && git merge origin/main`. Entrou o PR #63 (moldura da casca), que mexe em `CLAUDE.md`, `apps/web/DESIGN.md`, `apps/web/.impeccable/design.json`, `casca/nav.ts`, `nav.test.ts` e `index.css`, sem migração. Resolva os conflitos mantendo as duas mudanças. Rode as três verificações e faça o commit do merge antes de seguir.

## Correções

1. **Teste da migração.** No bloco `catalogo_sem_trilha` de `packages/db/src/migracao.integration.test.ts`, plante também linhas que sobrevivem:
   - uma `aula_assistida` com o lançamento dela;
   - um `curso_concluido` com o certificado;
   - um `sequencia_7_dias`;
   - uma troca, isto é, uma liberação de curso com origem `troca` e o lançamento negativo que aponta para ela.

   Depois de migrar, confira com valores literais que essas linhas continuam lá com `motivo` e `pontos` intactos, que só o `trilha_concluida` sumiu e que os checks `ponto_lancamento_sinal` e `ponto_lancamento_referencia` ainda recusam uma violação. No bloco de `origem_da_liberacao`, tire a trilha plantada que não prova mais nada.
2. **`alcance`.** Saem `alcance` e `CursoAlcancado`. O painel e a busca fazem `liberados.map((curso) => ({ curso, estado: estadoDoCurso(curso, h) }))`, e o tipo único é `CursoNaTela`. Apague os dois testes de "curso liberado duas vezes", que testam um estado que o índice `liberacao_curso_ativa_unica` proíbe. O CLAUDE.md, o docstring e o cabeçalho de `dominio/acompanhamento.ts` passam a dizer que a regra única do estado é `estadoDoCurso`.
3. **Liberar.** Em `consultas/liberacao.ts`, o `liberar` procura dentro da trava a liberação ativa daquele (pessoa, curso) com um select só, e então devolve a que achou ou insere uma nova. Saem `LiberacaoAtiva`, `DecisaoDeLiberar`, `decidirLiberar`, `ativaDoCurso`, `liberacoesAtivas` e os testes deles, se ficarem sem uso. Em `montarAcesso`, use um `Set` dos ids ativos. O comportamento de quem chama não muda: liberar de novo devolve a liberação existente com `nova: false`. Prove isso no teste de integração que já existe.
4. **Parâmetros vestigiais.**
   - Sai o `base` de `RegrasDoRascunho.mudar` e da chamada em `apoiado`.
   - Sai o `oQue` de `fraseDeReserva`, de `BarraDeSalvar` e de `AvisoDeVersaoMudou`, que passam a ter o texto fixo.
   - Sai o parâmetro de `seguraATabela`.
   - `LinhaParaLiberar` se funde em `LinhaDoCurso`.
   - Sai o wrapper `grid` em volta da única `Secao` de `visao-do-catalogo`.
   - Sai `Acompanhamento.titulo`, que repete `curso.titulo`.
   - O `sizes` de `CapaCurso` vira o padrão.
   - Sai o `not.toContain("380px")` de `loading.test.tsx`.
   - Saem as frases do CLAUDE.md que falam de "cada editor" ou de "os editores".

   Mantenha o hook `use-rascunho-apoiado` genérico. Só sai o parâmetro morto.
5. **Ordem dos cursos.** `ORDEM_DOS_CURSOS` vira `Record<TipoEstado, number>`, para o compilador cobrar um estado novo. Acrescente um teste com os cinco estados liberados em ordem invertida, que confere a ordem final com um valor literal.
6. **Textos repetidos.** Em Meus cursos, a seção "Cursos" perde o subtítulo "Liberados para você", que repete o cabeçalho logo acima. Na frase da busca do admin (`fraseDaPessoa`), sai a contagem de liberações. Quando houver curso em produção, a frase diz quantos estão em produção em vez de mostrar dois números sem explicação. Atualize os testes com o texto novo literal.
7. **Seed.**
   - Um curso do seed fica `em_producao`. Escolha um dos que não são Fábrica e montagem nem Comercial.
   - As capas órfãs `apps/web/public/capas/operacao.jpg` e `calibracao.jpg` são apagadas, se ninguém mais as referenciar (confira com `rg`).
   - A data de `LIBERADOS_A` passa a ser montada sem gerar data inválida a partir do décimo item.
   - O tema de "Fábrica e montagem" deixa de ser igual ao título. Use "Produção e montagem".
8. **Nomes e comentários velhos.**
   - O `direta` de `troca.ts` ganha outro nome.
   - O comentário de `schema/pontos.ts` sobre o `ADD VALUE` passa a dar a razão certa do `::text`, ou sai, se o `::text` deixou de ser necessário.
   - A ADR 0001 corrige a frase "retomada não muda" para o que a retomada passou a fazer.
9. **Ordem de aplicação no banco.** A ADR 0001 e o CLAUDE.md dizem a ordem certa: o PR entra na main, os outros worktrees juntam a main, e só então o dono aplica a migração no cloud e zera o banco, no mesmo momento. O motivo é que aplicar antes quebra a main e os outros worktrees que usam o mesmo banco cloud. A migração não ganha guarda nem opt-in, porque os dados são de teste.

Fica de fora: o índice por `curso_id` em `liberacao` e a conversão das liberações de trilha antes do DELETE.

## Verificar e entregar

- As três verificações do brief original, com o `TEST_DATABASE_URL` do `cursos_sem_trilha` e com `--force` no turbo, para nada vir do cache. Cole a saída real.
- Para cada item de 1 a 9, um commit pequeno ou um grupo coeso, em Conventional Commits em português, com assunto de até 50 caracteres, e push depois de cada um.
- O servidor da porta 3005 serve este worktree (unidade `dev-up-3005`). Não pare esse servidor. O hot reload pega as mudanças.
- Relatório em `docs/specs/curso-formato-udemy/arquivos/relatorio-correcoes-sem-trilha.md`, com os commits, a saída das verificações, o que cada item mudou e o que ficou de fora com o motivo. Devolva o mesmo texto ao terminar.
