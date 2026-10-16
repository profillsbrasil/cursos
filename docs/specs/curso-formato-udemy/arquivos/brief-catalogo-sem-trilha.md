# Brief: tirar a trilha do catálogo (profillsbrasil/cursos)

Worktree exclusivo seu: `/home/othavio/.herdr/worktrees/cursos/catalogo-sem-trilha`, branch `feat/catalogo-sem-trilha`, base `6d18291` (origin/main). Já tem `bun install`. Ninguém mais escreve nele enquanto você trabalha.

Leia antes: o `CLAUDE.md` da raiz do worktree, o `GLOSSARY.md` e a análise em `docs/specs/curso-formato-udemy/arquivos/catalogo-sem-trilha.html` (raio de impacto, com caminhos). Os resumos de leitura do código estão em `docs/specs/curso-formato-udemy/arquivos/explorer-banco.md`, `explorer-dominio.md` e `explorer-telas.md`.

## Decisão do dono (fechada, não reabrir)

O catálogo passa a ter um tipo só de coisa: o **Curso** (Curso → Nível opcional → Módulo → Aula). Não existe mais Trilha, nem "curso solto", nem "Cursos rápidos", nem regra sequencial entre cursos ("Abre depois de", estado `bloqueado`, curso da vez), nem liberação de trilha, nem o motivo de pontos `trilha_concluida`. Os módulos continuam como seções do curso. Os dados do banco cloud são só de teste e vão ser zerados pelo dono depois. Por isso a migração não precisa preservar nada que aponte para trilha: ela pode apagar essas linhas antes de derrubar colunas e tabelas.

Fora do escopo deste PR (vêm depois, não comece): descrição, tópicos e categoria do curso, descrição da aula, página do curso no estilo Udemy, questionário, regra nova de conclusão, emissão de certificado.

## Forma alvo dos dados

Nomeie e escolha a estrutura antes de escrever lógica. O ponto de partida é o caminho que o "curso solto" já percorre hoje: tudo vira esse caminho, e o ramo da trilha some.

- Banco (`packages/db/src/schema`):
  - Saem `trilha` e `trilha_curso`.
  - Em `liberacao`, saem `trilha_id`, o check de alvo único e o índice de trilha ativa, e `curso_id` vira NOT NULL. Ajuste os checks de troca que citam o alvo.
  - Em `ponto_lancamento`, saem `trilha_id`, a FK e o unique dela. O enum `motivo_ponto` perde `trilha_concluida`, o que exige recriar o tipo. O check `ponto_lancamento_referencia` muda junto.
  - Relations v2 (`relations.ts`) sem `naTrilha`/`cursos` de trilha.
  - Migração nova por `bunx drizzle-kit generate` dentro de `packages/db`. Revise o SQL à mão. Ela precisa rodar sobre um banco que tem linhas de trilha, liberação de trilha e lançamento `trilha_concluida`, então apague essas linhas antes de derrubar. Acrescente o caso dela no `migracao.integration.test.ts`.
- Domínio (`packages/api/src/dominio`):
  - `EstadoCurso` sem `bloqueado`. Sai `Antecessor`.
  - `alcance` devolve só a lista de cursos alcançados.
  - `PainelMeusCursos` sem `trilhas` e `soltos`, com uma lista de cursos.
  - `retomada` sem "trilhas antes dos soltos".
  - `Alvo` da liberação só curso. Saem `trocadosNaTrilha`, `trocadosVistos` e `trocados_mudaram`.
  - Acompanhamento só por curso. Saem `acompanharTrilha` e `SituacaoNaTrilha`.
  - `registro.ts` sem conquista de trilha. `pontos.ts` sem a linha de trilha no extrato nem no "Como ganhar".
  - `regras.ts` sem `trilha_concluida`.
  - Saem `edicao-da-trilha.ts` e `plano-da-trilha.ts`.
- Consultas e routers (`packages/api/src/consultas`, `routers`):
  - Saem `edicao-da-trilha.ts`, a trava `trilha:` e `travarCursos`, se ficar sem uso.
  - Saem os ramos de trilha em `meus-cursos.ts`, `liberacao.ts`, `acompanhamento.ts`, `troca.ts`, `catalogo.ts` e `comunicado.ts`.
  - Saem `admin.catalogo.{abrirTrilha,salvarTrilha,apagarTrilha}`. O `admin.alunos.liberar` recebe só o curso.
  - Atualize `erros.ts` e as duas listas que o `erros.integration.test.ts` confere. Atualize as contagens de statements que os testes de integração conferem, e diga no relatório quais números mudaram.
- Web (`apps/web/src`):
  - Saem as rotas `admin/catalogo/trilhas/**` e os componentes `editor-da-trilha.tsx`, `cursos-da-trilha.tsx` e `estado-da-trilha.ts`, com os testes deles.
  - `visao-do-catalogo` vira uma lista só de cursos, sem o "Nova trilha".
  - Meus cursos mostra os cursos numa seção só, com a mesma `CapaCurso` e a mesma grade que "Cursos rápidos" usa hoje. Sai `trilha.tsx`, e o esqueleto de `loading.tsx` acompanha a grade.
  - `acesso-do-aluno` e `acompanhamento` mostram só cursos.
  - `lib/editor.test.ts` passa a conferir só a página `[id]` do curso.
  - Toda mudança de tela segue o `apps/web/DESIGN.md` e roda sob a skill `/impeccable`. A tela nova é uma remoção, não um redesenho: mantenha o visual que já existe.
- Seed (`packages/db/src/seed`): sem trilha. Junte os três cursos de "Fábrica e montagem" num curso só com 3 módulos numerados de 1 a 3, cada módulo com o título do curso antigo.
- Docs no mesmo PR:
  - `GLOSSARY.md`: tire Trilha, Curso solto, Documento da trilha, Curso da vez e Situação na trilha. Ajuste Curso, Liberação, Origem, Estado do curso, Acompanhamento, Situação da pessoa e Troca.
  - Crie `docs/adr/0001-catalogo-so-de-cursos.md` com contexto, decisão e consequências, citando as decisões acima e o que vem depois.
  - Atualize as seções do `CLAUDE.md`, do `apps/web/PRODUCT.md` e do `apps/web/DESIGN.md` que descrevem trilha. Commite junto o `AGENTS.md`, se o turbo ou o next o reescreverem.
  - Prosa em pt-BR, frases curtas, sem travessão, no estilo dos arquivos que já existem.

## Como verificar

- Banco local próprio, já criado: `postgresql://postgres:postgres@127.0.0.1:54322/cursos_sem_trilha`. Para migrar: crie `packages/db/drizzle.wt.config.ts` apontando para ele, liste o arquivo em `.git/info/exclude` e rode `env -u DATABASE_URL bunx drizzle-kit migrate --config drizzle.wt.config.ts` dentro de `packages/db`. Os testes de integração rodam com `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/cursos_sem_trilha`. Se algum teste exigir o database `postgres`, diga no relatório em vez de apontar para ele.
- Verde antes de cada commit: `bun run check-types`, `bun x ultracite check` e `bun run test` com o `TEST_DATABASE_URL` acima. Cole a saída real (o resumo de cada um) no relatório. Erro que já existia em `6d18291` vai no relatório como pré-existente e não se conserta.
- `rg -i "trilha" apps packages GLOSSARY.md CLAUDE.md -g '!packages/db/src/migrations/**' -g '!**/node_modules/**'` só pode achar o ADR, a migração nova e o que for histórico de verdade. Liste cada achado que sobrar e o motivo.
- Teste novo ou alterado chama o código como o usuário chama e confere um valor literal. Teste de comportamento que sumiu é apagado, não esvaziado.

## Regras

- Um hook roda o Biome depois de cada Edit/Write: releia o arquivo antes do próximo Edit nele. Prefira vários Edit pequenos a um Write grande.
- Commit por unidade verde (banco, domínio e consultas, web, docs, ou como fizer sentido), em Conventional Commits em português, com assunto de até 50 caracteres e sem atribuição de IA. Depois de cada commit: `git push -u origin HEAD:feat/catalogo-sem-trilha` (o primeiro push) e `git push` (os seguintes). Não abra PR: eu abro depois de revisar.
- Proibido: tocar o banco cloud, ler, ligar ou copiar `apps/web/.env`, rodar `drizzle-kit` fora do config local, usar `git stash`, `reset --hard`, `checkout --`, `clean`, `--force` ou `--no-verify`, editar arquivos fora deste worktree (exceto o relatório abaixo) e instalar pacote novo.
- Se um passo pedir decisão de produto que este brief não cobre, escolha o menor caminho que remove a trilha, registre a escolha no relatório e siga.

## Relatório

Grave em `docs/specs/curso-formato-udemy/arquivos/relatorio-catalogo-sem-trilha.md`:
- os commits (SHA e assunto);
- a saída real das três verificações;
- o resultado do `rg` de trilha;
- as contagens de statements que mudaram;
- as escolhas que você fez sem o brief;
- o que ficou pendente.

Devolva o mesmo texto ao terminar.
