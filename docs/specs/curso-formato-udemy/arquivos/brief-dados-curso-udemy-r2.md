# Brief: dados do curso, rodada 2 (endereço automático e categorias)

Worktree exclusivo seu: `/home/othavio/.herdr/worktrees/cursos/curso-formato-udemy`, branch `feat/curso-formato-udemy`, ponta `28a0dc6`. O brief da rodada 1 é `docs/specs/curso-formato-udemy/arquivos/brief-dados-curso-udemy.md`, e o relatório dela é `relatorio-dados-curso-udemy.md`, na mesma pasta. As regras, as proibições, o database `cursos_curso_udemy` e a forma de verificar continuam valendo. Não crie input novo na tela além do que este brief pede. O visual ainda está em protótipo.

## Decisões do dono

1. **O endereço do curso é automático.** O admin não escolhe o slug. O servidor gera o slug a partir do título quando o curso é salvo pela primeira vez: minúsculas, sem acento, com hífen no lugar de espaço e pontuação, dentro do `FORMATO_DO_SLUG`. Se o slug já existir, o servidor acrescenta `-2`, `-3`, e assim por diante. Depois do primeiro salvamento o slug não muda, mesmo que o título mude, para o link do aluno não quebrar.
   - O `DocumentoDoCurso` deixa de receber o slug do editor.
   - O motivo `slug_repetido` sai do contrato se ficar sem uso. O editor e o `index.ts` param de tratá-lo.
   - O campo "Endereço" sai do editor e no lugar entra o link como texto apagado, sem input.
   - Teste com valores literais: "Profills School Comercial" vira `profills-school-comercial`, título com acento e pontuação, colisão com `-2`, e título trocado depois do primeiro salvamento mantém o slug.
2. **A categoria vem de uma tabela.**
   - Tabela nova `categoria` com `id` uuid, `nome` único (texto aparado, de 1 a 80 caracteres) e `criada_em`.
   - `curso.categoria` vira `curso.categoria_id`, NOT NULL, FK `restrict`.
   - A migração cria uma categoria para cada texto distinto que já existe em `curso.categoria` e liga cada curso à sua. Os dados são de teste, mas a migração precisa rodar sobre o banco com dados.
   - Router `admin.categorias.{lista, salvar, apagar}`. `salvar` é upsert pelo id que nasce no cliente, como em comunicados. `apagar` recusa a categoria em uso com um `ErroParaAPessoa` que diz em quantos cursos ela está. `lista` devolve cada categoria com a contagem de cursos.
   - O documento do curso recebe `categoriaId`. Categoria que não existe é recusada com frase para a pessoa.
   - O view model do aluno (`PaginaDoCurso`, capa de Meus cursos) continua recebendo o nome da categoria.
   - O editor troca o input de categoria por um select simples, com as categorias da lista. Pode ser o `Select` de `@cursos/ui` ou o que o editor já usa. O visual final vem do protótipo, mas o select precisa funcionar e salvar.
   - A tela de categorias ainda não existe: espera o protótipo. O seed cria as categorias que usa.
   - Se o nome único tiver frase própria, ele entra em `consultas/erros.ts`. Atualize as listas que o `erros.integration.test.ts` confere.
3. **Docs.** No `GLOSSARY.md`, Categoria passa a ser registro que o admin mantém, e o termo Endereço (ou o que o glossário usa para slug) diz que é automático e fixo. Atualize o `CLAUDE.md`.

## Entrega

Igual à rodada 1: as três verificações com `--force` e a saída real, commits pequenos com push, relatório em `docs/specs/curso-formato-udemy/arquivos/relatorio-dados-curso-udemy-r2.md` e o mesmo texto devolvido ao terminar.
