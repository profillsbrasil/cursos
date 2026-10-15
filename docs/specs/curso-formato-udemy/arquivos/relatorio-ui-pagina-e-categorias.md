# Relatório: página do curso e tela de categorias (pausado)

Branch `feat/curso-formato-udemy`, worktree `/home/othavio/.herdr/worktrees/cursos/curso-formato-udemy`. Parei a pedido, porque o dono vai desligar o PC. Não abri PR.

## Último SHA com push

`e237bf5` feat: página do curso leva os níveis. `origin/feat/curso-formato-udemy` está no mesmo SHA. A árvore está limpa. A única pasta fora do git é `.audit/`, com o todo local.

## O que ficou pronto

- `packages/api/src/dominio/pagina-do-curso.ts`: o `PaginaDoCurso` ganhou três campos.
  - `niveis` traz os níveis do curso em ordem, e vem vazio no curso sem níveis.
  - `proximoNivel` vem de `niveis(curso, assistidas).proximo`, a regra que já existia em `dominio/curso.ts`.
  - `modulos[].nivel` é `{ nome, ordem }` ou `null`.
  A tela precisa deles para "3 níveis" no resumo, "Nível 1 · Vendedor Profills Certificado" no módulo, "Próximo nível: …" no cartão e "3 módulos, sem níveis".
- `packages/api/src/dominio/pagina-do-curso.test.ts`: dois testes novos com valores literais, um sem níveis e um com níveis e o próximo nível. O teste antigo dos módulos agora confere `nivel: null`.

Verificações no `e237bf5`, só deste passo:

- `bun run check-types --force` deu `Tasks: 4 successful, 4 total`, com `Cached: 0 cached`.
- `bun x ultracite check` deu `Checked 408 files in 756ms. No fixes applied.`
- `bun test src/dominio/pagina-do-curso.test.ts` deu `7 pass, 0 fail`.
- Não rodei a suíte inteira com `TEST_DATABASE_URL`. Com o `--force` ela fica para a retomada.

## O que achei na leitura e muda o plano

- A capa de Meus cursos (`components/meus-cursos/capa-curso.tsx:170`) já leva a `/cursos/${slug}`. A migalha do player (`components/player/migalha-da-aula.tsx`) já tem o curso como link para a página. O banner e o Continuar já vão direto à aula por `hrefDaRetomada`. Esses links não mudam. O que muda é o destino, porque hoje `/cursos/[slug]/page.tsx` redireciona para a aula. Os testes de href (`meus-cursos/conteudo.test.tsx`, `aluno/continuar.test.ts`) continuam válidos. Falta rodá-los de novo depois da página nova.
- Hoje `admin.categorias.lista` devolve só a contagem (`cursos: number`). O protótipo mostra os nomes dos cursos de cada categoria, então a lista precisa devolver os títulos.
- Hoje `useAcao` entrega a `aoRecusar` só o `Motivo`, sem a mensagem. O brief pede que a mensagem de recusa venha do servidor, e o protótipo mostra o erro de nome repetido embaixo do campo. Para isso, `aoRecusar` precisa receber a mensagem `paraAPessoa` também.

## O que falta, arquivo por arquivo

API:
- `packages/api/src/dominio/categoria.ts`: trocar `CategoriaNaLista.cursos: number` por `cursos: readonly string[]`, com os títulos em ordem.
- `packages/api/src/consultas/categoria.ts`: em `listarCategorias`, usar `array_agg(curso.titulo order by curso.titulo) filter (where curso.id is not null)` no lugar do `count`, e ordenar por nome em pt-BR.
- `packages/api/src/consultas/categoria.integration.test.ts`: as linhas 83, 106 e 107 conferem `cursos: 0` e `cursos: 2`. Elas passam a conferir `[]` e os títulos `Curso ${S} 1` e `Curso ${S} 2`.
- `apps/web/src/components/admin/editor-do-curso.test.tsx`, linhas 48 e 49: os exemplos usam `cursos: 1` e `cursos: 0`.

Web, peças em comum:
- `apps/web/src/lib/use-acao.ts`: `aoRecusar(motivo, mensagem)`, em que `mensagem` é o texto `paraAPessoa`, ou `null`. Mais um caso em `use-acao.test.ts`.

Web, página do curso (versão A, `alunoA` e `rail` em `fonte.html`):
- `apps/web/src/app/(aluno)/cursos/[slug]/page.tsx`: reescrever. A página lê `carregarPaginaDoCurso`, chama `notFound()` com `null` e não redireciona mais. No topo, `TopoDoAluno` com a migalha "Meus cursos › título".
- `apps/web/src/app/(aluno)/cursos/[slug]/loading.tsx` (novo): o esqueleto na mesma grade.
- `apps/web/src/components/curso/` (novo): o cabeçalho, "O que você vai aprender", a sanfona "Conteúdo do curso" e o cartão do progresso.
  - O cabeçalho tem o título, o primeiro parágrafo da descrição, o selo da categoria e "N módulos · N aulas · duração · N níveis".
  - "O que você vai aprender" mostra os checks Céu em duas colunas.
  - A sanfona é client. O módulo da aula atual abre de saída, e todos abrem no curso de até 3 módulos. Tem "Abrir todos / Fechar todos". Cada aula aparece como índice de livro, com marca, "N. título", a descrição inteira, a duração e "Você parou em m:ss" só com posição acima de 0.
  - "Sobre o curso" leva os parágrafos depois do primeiro e some quando não há nenhum.
  - O cartão fica preso com `sticky top-6` a partir de 1081 px. Abaixo disso, ele vem logo depois do cabeçalho, sem ficar preso. A ordem no DOM é cabeçalho, cartão e resto. Acima de 1081 px, a grade é `minmax(0,1fr) 300px`, com o cartão em `row-span-2`.
  - Os textos saem de funções puras com teste: "Faltam N min desta aula", "N min na primeira aula", "Próximo nível: X" só com `proximoNivel`, "N módulos, sem níveis" e "Continuar em m:ss".
- Testes de render com valores literais, para não iniciado, em andamento, prova e concluído, com e sem níveis.

Web, categorias (versão A, `catA`):
- `apps/web/src/components/admin/menu.tsx`: o item "Categorias" (ícone `Tag`) entre Catálogo e Comunicados.
- `apps/web/src/app/(admin)/admin/categorias/page.tsx` e `loading.tsx` (novos), por `carregarCategorias`.
- `apps/web/src/components/admin/categorias.tsx` (novo).
  - Em cima fica o campo de criar, com o id nascido no cliente, como em comunicados.
  - Embaixo, a lista "Todas" em ordem alfabética, com o selo de uso e os nomes dos cursos.
  - Renomear abre o nome na própria linha. Na categoria em uso, Apagar fica com `CONTORNO_DESLIGADO` e uma dica.
  - Na livre, Apagar abre a `ConfirmacaoNaLinha`.
  - O erro de nome repetido aparece embaixo do campo, com o texto do servidor.
  - O foco segue `focarSeVoltou`, como em comunicados.
- Testes de render: categoria em uso, livre e o erro de nome repetido.

Docs: o mapa do `CLAUDE.md` (a página, a rota de categorias e o `aoRecusar`), o `apps/web/DESIGN.md` (a página do curso e a tela de categorias) e o `GLOSSARY.md`, se algum termo mudar.

Entrega: as três verificações com `--force` e `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/cursos_curso_udemy`. Depois, a prova no browser em `http://localhost:3006`.

## Desvios do protótipo que eu ia fazer, ainda sem código

- "Prova e certificado no módulo 15" vira "Prova e certificado no fim do curso". O view model não diz em que módulo fica a avaliação, e o brief proíbe texto fixo.
- No cartão, o selo de estado é o `SeloEstado` do app, com ícone, como manda o DESIGN.md para os selos. No protótipo, o selo não tem ícone.
- A prova e o concluído não estão no protótipo. Na prova, ia mostrar o selo "Falta a prova", 100%, "A prova abre em breve nesta página" e um botão em contorno "Rever aulas". No concluído, ia mostrar "Certificado emitido em <data curta>" e o botão "Rever o curso".
- O nome de cada aula no índice de livro vira link para a aula, com o mesmo visual e hover. No protótipo, a linha não é link.
- O "Escreva o nome da categoria." do campo vazio é validação do formulário no cliente, como o "Preencha o título e o texto" dos comunicados. Ela não é recusa do servidor.

## Screenshots

Nenhuma salva. A prova no browser não começou.
