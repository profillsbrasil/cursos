# Brief: tela de categorias do admin

Worktree: `/home/othavio/Work/cursos-wt-categorias`, branch `feat/udemy-categorias`, base `c9b6950`. Database: `cursos_udemy_categorias`. Siga também `brief-comum-r3.md`, na mesma pasta.

## O que construir

A tela `/admin/categorias`, pela versão A da rodada 2, que o dono aprovou.

- O protótipo está em `docs/specs/curso-formato-udemy/arquivos/fontes/r2/fonte.html`. As funções são `catA` (linha 1059), `linhaCat` (1044), `criarCat` (1054), `ordenadas` (1037) e `totalCursos` (1056), e o CSS delas está no mesmo arquivo.
- A imagem de referência é `docs/specs/curso-formato-udemy/prototipo-categorias.png`.
- O roteiro de interação da rodada 2, `fontes/r2/interacao.js`, mostra o comportamento esperado da versão A (`v-cats-A`).

O plano arquivo por arquivo está em `docs/specs/curso-formato-udemy/arquivos/relatorio-ui-pagina-e-categorias.md`, na parte "Web, categorias".

## Dados e API, já prontos

- `carregarCategorias()` de `apps/web/src/server/api.ts` devolve `CategoriaNaLista[]`, de `packages/api/src/dominio/categoria.ts`. Desde `d579825`, `cursos` traz os títulos dos cursos em ordem pt-BR, e a lista vem por nome em pt-BR.
- `admin.categorias.salvar({ id, nome })` cria ou renomeia pelo id que nasce no cliente. O nome repetido volta como recusa para a pessoa: "Já existe uma categoria com este nome."
- `admin.categorias.apagar({ id })` recusa a categoria em uso com a frase de `categoriaEmUso`.
- Desde `c9b6950`, o `aoRecusar` do `useAcao` recebe `(motivo, mensagem)`, em que `mensagem` é o texto do servidor ou `null`. É assim que o erro de nome repetido aparece embaixo do campo, com o texto do servidor. Siga o precedente do editor do curso para o toast que o `useAcao` já mostra.

## Arquivos seus, e só estes

- `apps/web/src/components/admin/menu.tsx`: o item "Categorias", com o ícone `Tag`, entre Catálogo e Comunicados.
- `apps/web/src/app/(admin)/admin/categorias/page.tsx` e `loading.tsx`, os dois novos. O `casca.test.ts` exige o `loading.tsx` de toda rota do menu.
- `apps/web/src/components/admin/categorias.tsx`, novo, e o teste dele.
- `apps/web/src/components/admin/editor-do-curso.tsx`, só se o "Gerenciar categorias" do editor aprovado for um link simples para a tela nova. O editor inteiro fica para depois. Não refaça nada nele.

## Critérios de pronto

- A tela segue o protótipo:
  - o campo de criar fica no topo, com o id nascido no cliente, como em comunicados;
  - a lista "Todas" vem em ordem alfabética, com o selo de uso e os nomes dos cursos;
  - renomear abre o nome na própria linha.
- Na categoria em uso, o Apagar usa `CONTORNO_DESLIGADO`, com a dica do motivo. Na categoria livre, o Apagar abre a `ConfirmacaoNaLinha`.
- O foco segue o padrão dos comunicados.
- Toda recusa vem do servidor. O campo vazio é validação do cliente, como em comunicados.
- Há testes de render para a categoria em uso, a categoria livre e o erro de nome repetido. Além deles, o `casca.test.ts`, o `use-acao.test.ts` (a lista de quem muta) e o `fronteira-do-cliente.test.ts` continuam verdes.
