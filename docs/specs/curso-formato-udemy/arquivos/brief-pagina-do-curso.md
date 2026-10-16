# Brief: página do curso do aluno

Worktree: `/home/othavio/Work/cursos-wt-pagina`, branch `feat/udemy-pagina`, base `c9b6950`. Database: `cursos_udemy_pagina`. Siga também `brief-comum-r3.md`, na mesma pasta.

## O que construir

A página `/cursos/[slug]` do aluno, pela versão A da rodada 2, que o dono aprovou.

- O protótipo está em `docs/specs/curso-formato-udemy/arquivos/fontes/r2/fonte.html`. As funções são `alunoA` (linha 805), `rail` (755), `hero` (772), `paginaAluno` (775), `livro` (780) e `sanfona` (784), e o CSS delas está no mesmo arquivo.
- A imagem de referência é `docs/specs/curso-formato-udemy/prototipo-pagina-do-curso.png`.
- Para abrir no browser, use `arquivos/prototipos-curso-r2.html`.

O plano arquivo por arquivo está em `docs/specs/curso-formato-udemy/arquivos/relatorio-ui-pagina-e-categorias.md`, na parte "Web, página do curso". Ele vale como está, com estes três desvios planejados do protótipo, que entram:

- "Prova e certificado no módulo 15" vira "no fim do curso".
- Os estados de prova e de concluído seguem o mesmo cartão.
- Cada aula do índice de livro vira link para a aula.

## Dados

A tela lê `carregarPaginaDoCurso(slug)` de `apps/web/src/server/api.ts`, que devolve o `PaginaDoCurso` de `packages/api/src/dominio/pagina-do-curso.ts`, ou `null`. Leia esse tipo e o teste dele antes de tudo. Ele já tem `niveis`, `proximoNivel` e `modulos[].nivel`. Os textos da tela saem dos dados reais, sem nada fixo do protótipo.

## Arquivos seus, e só estes

- `apps/web/src/app/(aluno)/cursos/[slug]/page.tsx`, que deixa de redirecionar para a aula, e `loading.tsx`, que é novo. O `not-found.tsx` e a pasta `aulas/` só mudam se a página exigir.
- `apps/web/src/components/curso/`, pasta nova, com os testes dela.
- Os testes de href que já existem, se a mudança de destino os quebrar: `components/meus-cursos/conteudo.test.tsx`, `components/aluno/continuar.test.ts` e o teste da migalha do player.

## Critérios de pronto

- A página segue o protótipo em 1280 px. Abaixo de 1081 px, o cartão sobe para depois do cabeçalho e deixa de ser preso, pela mesma quebra da coluna do player.
- O módulo da aula atual abre de saída. No curso de até 3 módulos, todos abrem. O "Abrir todos" vira "Fechar todos".
- "Você parou em m:ss" só aparece com posição acima de 0. A linha do próximo nível some no curso sem níveis.
- Os textos do cartão saem de funções puras, com teste.
- Há testes de render com valores literais para os quatro estados (não iniciado, em andamento, prova e concluído), com e sem níveis.
- O `loading.tsx` usa a mesma grade da página.
- Se houver regra de layout que um teste em jsdom não prova, como o cartão preso e a quebra de 1081 px, há um `*.medida.test.tsx` no Chromium headless.
