# Brief: dados do curso no formato Udemy (sem UI nova)

Worktree exclusivo seu: `/home/othavio/.herdr/worktrees/cursos/curso-formato-udemy`, branch `feat/curso-formato-udemy`, base `8bb13bb`. Essa base é a ponta de `feat/catalogo-sem-trilha` (PR #64, ainda sem merge). O worktree já tem `bun install`. Ninguém mais escreve nele.

Leia antes o `CLAUDE.md` da raiz, o `GLOSSARY.md` e a `docs/adr/0001-catalogo-so-de-cursos.md`. As regras, as proibições e a forma de verificar são as do brief anterior, `docs/specs/curso-formato-udemy/arquivos/brief-catalogo-sem-trilha.md`, seções "Como verificar" e "Regras". Há duas trocas: o database local é `cursos_curso_udemy` (já criado e vazio) e a branch é esta.

## Decisão do dono

O curso fica como na Udemy: banner (a capa que já existe), título, descrição, tópicos ("O que você vai aprender"), categoria e aulas em módulos, cada aula com descrição. A interface ainda vai ser escolhida entre 4 protótipos. Por isso este PR faz só dados, domínio, API e a passagem dos campos pelo editor, sem input novo na tela.

## Forma dos dados

Crie uma migração nova. A de `catalogo_sem_trilha` não muda. Os dados do banco são de teste.

- `curso.tema` passa a se chamar `categoria` em todo lugar: coluna, tipos, documento, rascunho, telas, testes, seed e glossário. O texto continua livre, até 80 caracteres.
- Colunas novas em `curso`:
  - `descricao`: text NOT NULL, default `''`, até 2000 caracteres;
  - `topicos`: `text[]` NOT NULL, default `'{}'`, até 10 itens de até 120 caracteres, sem item vazio.
- Coluna nova em `aula`: `descricao`, text NOT NULL, default `''`, até 2000 caracteres.
- Os limites moram junto dos que já existem em `dominio/edicao-do-curso.ts`, e o schema zod do `DocumentoDoCurso` os aplica. A `versaoDoCurso` inclui os campos novos.
- O check no banco cobre o que o zod também cobre (tamanho e item vazio), com frase em `consultas/erros.ts` se for unique ou check com mensagem. Atualize as listas que o `erros.integration.test.ts` confere.
- Editor: o rascunho e a leitura do documento (`rascunho-do-curso.ts`, `estado-do-editor.ts`) carregam `descricao`, `topicos` e a descrição de cada aula, para o salvar não apagar o que já está gravado. Não crie input. O rótulo "Tema" que já existe na tela vira "Categoria".
- Página do curso para o aluno: crie `curso.pagina({ slug })` no router do aluno, com um `carregarPaginaDoCurso` em `server/api.ts`. Ela devolve um view model com estes campos:
  - capa, título, categoria, descrição, tópicos, estado e progresso;
  - a ação principal (começar, continuar com a aula e o segundo, ou prova) com o href;
  - os módulos, com número e título;
  - as aulas de cada módulo, com id, título, duração, descrição e se foi assistida.

  Só quem tem liberação ativa vê a página, com a mesma regra de `aula.entrada`. Prove a regra no teste. Reaproveite `estadoDoCurso`, `progresso` e `ondeNoCurso`. Não repita regra. A rota `/cursos/[slug]` ainda não muda.
- O `AulaNoPlayer` passa a levar a descrição da aula. O player ainda não a mostra.
- Seed: escreva descrição e de 3 a 6 tópicos para cada curso de `dados.ts`, mais uma descrição curta de uma frase para as aulas que têm título próprio (as do módulo 8 do Comercial e as de Fábrica e montagem). Tudo em pt-BR plausível. As aulas geradas ficam sem descrição.
- Docs: no `GLOSSARY.md`, o termo Curso ganha a descrição, os tópicos e a categoria. Entram os termos Categoria, Tópico e Página do curso. Atualize o mapa do `CLAUDE.md`.

## Entrega

- As três verificações com `--force` no turbo e `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/cursos_curso_udemy`, com a saída real. Antes de rodar, migre esse database pelo `drizzle.wt.config.ts`. Ele está fora do git, então crie o arquivo de novo neste worktree e liste-o em `.git/info/exclude`.
- Commits pequenos em Conventional Commits em português, com assunto de até 50 caracteres e push depois de cada um. O primeiro push é `git push -u origin HEAD:feat/curso-formato-udemy`. Não abra PR.
- Use a tool Edit, nunca heredoc nem sed, e releia o arquivo antes de cada Edit.
- Relatório em `docs/specs/curso-formato-udemy/arquivos/relatorio-dados-curso-udemy.md`, com os commits, as verificações, a forma do view model, as escolhas que você fez sozinho e o que ficou pendente. Devolva o mesmo texto ao terminar.
