# Brief: página do curso e tela de categorias (UI)

Worktree exclusivo seu: `/home/othavio/.herdr/worktrees/cursos/curso-formato-udemy`, branch `feat/curso-formato-udemy`, ponta `01f171e`. Leia antes:
- os relatórios `relatorio-dados-curso-udemy.md` e `relatorio-dados-curso-udemy-r2.md`, em `docs/specs/curso-formato-udemy/arquivos/`;
- o `CLAUDE.md`, o `apps/web/DESIGN.md` e o `GLOSSARY.md`.

As regras, as proibições e a forma de verificar são as do brief `docs/specs/curso-formato-udemy/arquivos/brief-dados-curso-udemy.md`, com o database `cursos_curso_udemy`.

Todo o trabalho de tela roda sob a skill `/impeccable`. O protótipo aprovado se segue à risca.

## O que o dono aprovou

O protótipo está em `docs/specs/curso-formato-udemy/arquivos/prototipos-curso-r2.html` (publicado em https://claude.ai/artifact/QzSdL3osKzQ67964gpbkpd). A fonte, com as funções de cada versão, está em `docs/specs/curso-formato-udemy/arquivos/fontes/r2/fonte.html`.

1. **Página do curso para o aluno, versão A** (`alunoA` e `rail` na fonte). Duas colunas:
   - A esquerda tem, nesta ordem: título, primeiro parágrafo da descrição, categoria e resumo; "O que você vai aprender"; "Conteúdo do curso" em sanfona; e "Sobre o curso".
   - Na sanfona, o módulo aberto mostra as aulas como índice de livro: número, título, duração e a descrição inteira.
   - A direita tem o cartão preso (`position: sticky`): capa, estado e porcentagem, barra, aulas assistidas, "Agora:" ou "Comece por:", a aula, o botão principal e as três linhas de baixo.
   - A rota é `/cursos/[slug]`, lida por `carregarPaginaDoCurso` (`curso.pagina`). Ela substitui a página de hoje, que só mostra o fim do curso: a ação `prova` e o concluído viram estados desta página.
   - O módulo da aula atual abre de saída. Num curso de até 3 módulos, todos abrem.
   - "Você parou em 3:42" só aparece com posição acima de 0.
   - Se o curso não tem níveis, a linha do próximo nível sai.
   - Na página do aluno, os textos dependem dos dados reais do view model. Não escreva texto fixo do protótipo.
   - Siga o layout do protótipo em 1280 px. Abaixo de 1081 px (a mesma quebra da coluna do player), o cartão sobe para depois do cabeçalho e deixa de ser preso.
   - Ligações: a capa de cada curso em Meus cursos passa a levar à página do curso. O banner de retomada e o Continuar da sidebar continuam levando direto à aula. Na migalha do player, o nome do curso vira link para a página do curso. Atualize os testes que fixam esses hrefs.
   - `loading.tsx` próprio com o esqueleto da página.
2. **Tela de categorias, versão A** (`catA` na fonte):
   - Item "Categorias" no menu do admin, entre Catálogo e Comunicados, com rota `/admin/categorias` e `loading.tsx` (o `casca.test.ts` exige).
   - O campo de criar fica no topo. Abaixo vem a lista em ordem alfabética, com o selo de uso e os nomes dos cursos de cada categoria.
   - Renomear abre o nome na própria linha. Apagar fica desligado na categoria em uso, com a dica do motivo. Apagar uma categoria livre abre a `ConfirmacaoNaLinha` que já existe.
   - Tudo pelo router `admin.categorias` e pelo `useAcao`. Toda mensagem de recusa vem do servidor.
   - O foco segue o padrão dos comunicados.

Fica de fora: o editor do curso (o dono pediu um refino do protótipo antes) e o questionário.

## Verificar e entregar

- As três verificações com `--force` e a saída real.
- Testes de render com valores literais para os estados da página: não iniciado, em andamento, prova e concluído; com e sem níveis.
- Testes de render para a tela de categorias: em uso, livre e erro de nome repetido.
- Prova no browser. Um servidor desta branch já roda em `http://localhost:3006`, contra o `cursos_curso_udemy`. Tente a aba do grupo. Se der "not in Claude's tab group", crie a sua com `tabs_context_mcp` (`createIfEmpty`) na mesma porta e siga sem parar.
  - O dono vai rodar o seed nesse banco. Se a página de Meus cursos vier vazia, faça o resto e diga no relatório que a prova esperou o seed.
  - Prove `/cursos/profills-school-comercial` (ou o slug que o seed gerar) em 1280 px e abaixo de 1081 px, a página de Fábrica e montagem e `/admin/categorias` com criar, renomear e a recusa de apagar.
  - Salve as screenshots em `docs/specs/curso-formato-udemy/arquivos/prova-curso-udemy/`, e não em `/tmp`.
- O servidor da 3006 faz hot reload. Não o pare.
- Commits pequenos com push. Não abra PR.
- Relatório em `docs/specs/curso-formato-udemy/arquivos/relatorio-ui-pagina-e-categorias.md`, com os commits, as verificações, os caminhos das screenshots, os desvios do protótipo e o motivo de cada um. Devolva o mesmo texto ao terminar.
