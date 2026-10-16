# Curso no formato Udemy: decisões e plano

Este arquivo é a fonte única para retomar o trabalho numa máquina nova. Ele guarda as decisões do dono, o estado de cada entrega, o que falta, as provas e todo o material de trabalho em `arquivos/`. Vale até o trabalho fechar. Depois, ele é apagado, e o que ficar de regra vai para o `GLOSSARY.md`, a ADR e o `CLAUDE.md`.

O issue de acompanhamento é o #65. Este trabalho está no PR #66 (rascunho), que depende do #64.

## Como retomar

Cole esta mensagem num agente aberto no clone do repo:

> Retome o curso no formato Udemy em profillsbrasil/cursos. Faça `git fetch` e trabalhe na branch `feat/curso-formato-udemy` (PR #66, em rascunho, empilhado no #64). Leia, nesta ordem:
> 1. `docs/specs/curso-formato-udemy/README.md`, inteiro;
> 2. `gh issue view 65 --comments`;
> 3. o `CLAUDE.md` da raiz.
>
> Antes de escrever código, me pergunte duas coisas:
> 1. Se o #64 já entrou na main. Se entrou, junte a main na branch.
> 2. Se eu aprovo o refino do editor com o questionário (`docs/specs/curso-formato-udemy/arquivos/prototipo-editor-r3.html`). Antes de perguntar, termine a verificação dele, conforme a seção "Editor" deste README, e publique o HTML como Artifact para eu ver.
>
> Depois, continue a página do curso e a tela de categorias pela seção "Próximos passos" deste README, sob `/impeccable` e seguindo os protótipos aprovados à risca. Para a prova no browser, crie um database próprio no Supabase local e migre-o. Depois me peça para rodar o seed com `!`, porque o classificador nega o seed ao agente.

## Decisões do dono

Nenhuma destas decisões se reabre.

### Catálogo

1. O catálogo tem um tipo só de coisa: o **curso**, no formato da Udemy. Não existem trilha nem curso solto. O nome no produto e no código é "Curso".
2. O curso tem módulos como seções. Cada módulo agrupa aulas.
3. Um vídeo, isto é, uma aula, pertence a um único curso. No caso raro de repetir um vídeo, o admin cadastra a aula de novo.
4. Os dados do banco cloud de hoje são de teste. O banco vai ser zerado, e nenhuma migração precisa preservar dados.
5. No seed, "Fábrica e montagem" virou um curso só, com 3 módulos: Segurança do posto, Envasadora e Montagem pneumática.

### Curso

6. O curso tem banner (a capa), título, descrição, tópicos ("O que você vai aprender") e categoria.
7. O endereço (`/cursos/<slug>`) é automático. O servidor gera o slug a partir do título no primeiro salvamento e acrescenta `-2`, `-3` quando o slug já existe. Depois disso o slug não muda, para o link do aluno não quebrar. O editor não tem campo de endereço.
8. A categoria é um registro que o admin mantém numa tela própria. O editor escolhe a categoria num select. Categoria em uso por algum curso não se apaga.
9. Cada aula tem vídeo, descrição e questionário.

### Questionário e conclusão

10. Cada pergunta do questionário é de múltipla escolha, com de 2 a 5 alternativas e uma certa.
11. A nota mínima é **70%**, a mesma em todo curso. Quem não passa tenta de novo. Os 5 pontos por acerto valem só na primeira tentativa.
12. O curso está concluído quando a pessoa assistiu a todas as aulas e foi aprovada em todos os questionários. Aí sai o certificado.
13. Com 3 perguntas, 70% exige acertar as 3, porque 2 de 3 dá 67%. Com 4 perguntas, bastam 3 acertos. O editor mostra essa conta para o admin.

### Interface aprovada

Os protótipos aprovados se seguem à risca.

14. **Página do curso para o aluno: rodada 2, versão A.** À direita fica um cartão preso com a capa, o progresso, a aula atual e o botão principal. À esquerda vêm o título, a descrição, os tópicos e o conteúdo em sanfona. O módulo aberto mostra as aulas como índice de livro, com a descrição de cada uma.
15. **Tela de categorias: rodada 2, versão A.** É um item próprio no menu do admin, entre Catálogo e Comunicados. O campo de criar fica no topo, e a lista mostra a contagem e os nomes dos cursos de cada categoria.
16. **Editor do curso.** O topo é a "Vitrine" da rodada 1, versão C: capa à esquerda e, à direita, título com o link gerado, categoria em select e descrição. As aulas seguem a rodada 2, versão C: lista estreita das aulas, painel largo da aula escolhida e, dentro dele, a lista das perguntas com a pergunta em edição. O refino dessa versão pelo `/impeccable` é a rodada 3 (`arquivos/prototipo-editor-r3.html`), que o dono aprovou.

### Escolhas assumidas

O dono pode trocar qualquer uma destas sem custo.

- Limites: descrição do curso e da aula com até 2000 caracteres, até 10 tópicos de até 120 caracteres e nome de categoria com até 80 caracteres.
- A capa de cada curso em Meus cursos leva à página do curso. O banner de retomada e o Continuar da sidebar levam direto à aula.
- No player, o nome do curso na migalha leva à página do curso.
- Abaixo de 1081 px, o cartão preso da página do curso sobe para baixo do cabeçalho e deixa de ser preso.

## Protótipos e provas

Os protótipos estão publicados em links privados do dono:
- rodada 1: https://claude.ai/artifact/GLjpXQQ6P1Sy8pEssGGjBW
- rodada 2: https://claude.ai/artifact/QzSdL3osKzQ67964gpbkpd
- rodada 3, o editor aprovado: https://claude.ai/artifact/15rtE3njWqnN7wYuzYJd8G
- análise do raio de impacto: https://claude.ai/artifact/PYURW5PTtVqXTWqr39dpiA

Os mesmos HTML estão em `arquivos/` e abrem direto no browser.

| Arquivo | O que é |
|---|---|
| `prototipo-pagina-do-curso.png` | Página do curso, rodada 2, versão A (aprovada) |
| `prototipo-editor-questionario.png` | Editor com o questionário, rodada 2, versão C (aprovada, antes do refino) |
| `prototipo-categorias.png` | Tela de categorias, rodada 2, versão A (aprovada) |
| `prova-meus-cursos.jpg` | Meus cursos sem trilha, no app (branch do #64) |
| `prova-meus-cursos-em-producao.jpg` | Meus cursos com um curso em produção |
| `prova-catalogo.jpg` | Catálogo do admin com uma lista só de cursos |
| `prova-player-fabrica.jpg` | Player de Fábrica e montagem, com os 3 módulos |
| `arquivos/prototipos-curso.html` | Rodada 1: 4 versões da página do curso e 4 do editor |
| `arquivos/prototipos-curso-r2.html` | Rodada 2: 4 da página, 4 do editor com questionário e 4 das categorias |
| `arquivos/prototipo-editor-r3.html` | Refino do editor C, verificado e aprovado (rodada 3) |
| `arquivos/fontes/r1`, `r2` e `r3` | A fonte de cada rodada (`fonte.html`), o `montar.py`, que embute as imagens, e os scripts de foto e de interação |
| `arquivos/catalogo-sem-trilha.html` | A análise que levou à decisão de tirar a trilha |

## Entregas

| Entrega | Branch | Estado |
|---|---|---|
| Tirar a trilha do catálogo | `feat/catalogo-sem-trilha`, PR #64 | Pronto e revisado. Espera o merge. |
| Curso no formato Udemy: dados | `feat/curso-formato-udemy` | Pronto: categoria em tabela, descrição, tópicos, descrição da aula, endereço automático, `curso.pagina` e `admin.categorias` |
| Curso no formato Udemy: página do curso e tela de categorias | `feat/curso-formato-udemy` | Começou. O view model da página com os níveis está pronto (`e237bf5`). A tela ainda não. |
| Curso no formato Udemy: editor (Vitrine, tópicos e aulas) | `feat/curso-formato-udemy` | Protótipo aprovado (rodada 3). Não começou. |
| Questionário, conclusão e certificado | PR seguinte | Não começou |

## Próximos passos da página do curso e das categorias

O trabalho parou em `e237bf5`. O todo do delegado está em `arquivos/ui-pagina-e-categorias.todo.md`, e o relatório em `arquivos/relatorio-ui-pagina-e-categorias.md`. Falta o seguinte:

1. **API.**
   - `admin.categorias.lista` passa a devolver os títulos dos cursos de cada categoria, em ordem pt-BR. Hoje ela devolve só a contagem, e o protótipo mostra os nomes.
   - `categoria.integration.test.ts` e `editor-do-curso.test.tsx` acompanham o formato novo.
2. **`useAcao`.** `aoRecusar` passa a receber também a mensagem para a pessoa, além do `Motivo`. Sem isso, o campo não mostra o texto do servidor quando o nome se repete.
3. **Página do curso.**
   - `(aluno)/cursos/[slug]/page.tsx` sai do redirect para a aula e passa a montar a página a partir de `carregarPaginaDoCurso`. Ganha um `loading.tsx` próprio.
   - Componentes novos em `components/curso/`: cabeçalho, "O que você vai aprender", a sanfona com índice de livro e "Abrir todos", e o cartão preso a partir de 1081 px.
   - A capa de Meus cursos e a migalha do player já apontam para `/cursos/[slug]`. Os testes de href rodam de novo.
   - Testes de render para os quatro estados (não iniciado, em andamento, prova e concluído), com e sem níveis.
4. **Tela de categorias.**
   - Item "Categorias" em `admin/menu.tsx`, mais `(admin)/admin/categorias/page.tsx` e `loading.tsx`.
   - `components/admin/categorias.tsx` cria, renomeia na linha, desliga o Apagar com a dica e confirma o apagar com a `ConfirmacaoNaLinha`.
   - Testes de render: categoria em uso, livre e com nome repetido.
5. **Docs e prova.** Atualizar o `CLAUDE.md` e o `DESIGN.md`, rodar as três verificações e provar as telas no browser.

Desvios planejados em relação ao protótipo, que o dono pode recusar:
- "Prova e certificado no módulo 15" vira "no fim do curso", porque o curso não diz em que módulo fica a prova.
- Os estados de prova e de concluído do cartão não estão no protótipo e vão seguir o mesmo cartão.
- Cada aula do índice vira link para a aula.

O brief completo desta rodada é `arquivos/brief-ui-pagina-e-categorias.md`. Os caminhos de máquina citados nos briefs e relatórios (`/home/othavio/.herdr/worktrees/...`) são da máquina antiga.

## Editor: refino aprovado

O dono aprovou a rodada 3, que é a versão C refinada pelo `/impeccable`. A fonte é `arquivos/fontes/r3/fonte.html`.
- `fontes/r3/interacao.sh` monta o HTML e roda `interacao.js` no Chromium headless, com 25 passos de interação. Ele precisa terminar com `erros: []`.
- `fontes/r3/fotos.sh <pasta>` tira as fotos da janela, da página inteira, de 390 px e dos estados vazio, erro e salvo.
- Os dois scripts criam o `seguranca.jpg` vazio que o `montar.py` pede.

Na verificação, o roteiro achou uma reentrada: o `focusout` redesenhava o painel no meio do próprio redesenho, e cada tecla mostrava o erro antes de a pessoa sair do campo. A correção ignora o `focusout` enquanto o painel se redesenha.

O detector do `/impeccable`, rodado na página renderizada, deixou só falsos positivos já conhecidos:
- o selo "Admin" de 10 px;
- a fonte Geist;
- os cartões dentro do painel da Moldura;
- a seção de tópicos, que o protótipo apaga de propósito.

## Ordem no banco cloud

O banco cloud é dividido entre a main e os worktrees abertos. Siga esta ordem:

1. O dono faz o merge do #64 e depois o do #66.
2. Os worktrees abertos juntam a main.
3. O dono aplica as migrações na ordem `catalogo_sem_trilha`, `formato_udemy` e `categoria`, e zera o banco no mesmo momento.

Aplicar antes quebra a main e os outros worktrees, porque eles ainda leem trilha.

## Notas para o agente

Estas notas viviam na memória da máquina antiga.

- A migração só entra no banco cloud com o OK do dono no chat da sessão, porque o cloud é o banco real. O PR não aplica a migração. O classificador nega o `drizzle-kit migrate` contra o cloud ao agente, então o dono roda o comando com `!` dentro de `apps/web`:

  `bunx varlock run -- bash -c 'export DATABASE_URL="${DATABASE_URL/:6543\//:5432/}"; cd ../../packages/db && bunx drizzle-kit migrate'`

  Depois, o agente confere o resultado com `psql` dentro de `begin read only`.
- **Seed local.** O classificador nega o seed ao agente, mesmo num database local. O dono roda com `!`:

  `cd packages/db && SEED_DATABASE_URL=<url do database local> bun run src/seed/index.ts --aluno <userId do dono no Clerk dev>`

  O `ln -s` do `.env` do checkout principal para `apps/web/.env` de um worktree passa sem bloqueio.
- **Database por worktree.**
  - Crie o database com `create database <nome>` no Supabase local, que ouve na porta 54322.
  - Crie também `packages/db/drizzle.wt.config.ts` apontando para ele e liste o arquivo em `.git/info/exclude`.
  - Migre com `env -u DATABASE_URL bunx drizzle-kit migrate --config drizzle.wt.config.ts`.
  - Rode os testes com `TEST_DATABASE_URL` apontando para esse database.
- **Servidor fora da porta 3001.** Rode `DATABASE_URL=<database local> CORS_ORIGIN=http://localhost:<porta> next dev --port <porta>`. Sem o `CORS_ORIGIN`, o Clerk recusa o token. O cookie do Clerk vale para qualquer porta de localhost.
- Toda interface nova sai em 4 protótipos lado a lado para o dono escolher, e o aprovado se segue à risca.
- Não proponha de novo:
  - anel ou contorno de foco;
  - tirar os itens "Em breve" do menu do aluno;
  - botão de legenda no player, ou qualquer elemento por cima do iframe do YouTube.

## Pendências pequenas

- No seed, o curso "Limpeza CIP e troca de formato" tem a categoria "Fábrica e montagem", que é também o título de outro curso.
- `apps/web/DESIGN.md` ainda fala em "pé dos editores".
- Na busca do admin, a frase de quem nunca abriu um curso não conta os cursos em produção.
- As críticas anteriores do `/impeccable` sobre o app inteiro estão em `arquivos/critica-impeccable/`, com `shape-admin.md`. As pendências que o dono não fechou são:
  - o trilho da barra de progresso, a 1,5:1;
  - a largura do extrato e de Sua semana;
  - os três selos em Céu na linha de liberar;
  - os pontos no cartão de conta do admin;
  - a tela Trocar pontos, que não tem saída.

## Como verificar

- `bun run check-types`, `bun x ultracite check` e `bun run test`. O último roda com `TEST_DATABASE_URL` apontando para um database do Supabase local.
- Antes de commitar, os três precisam estar verdes. Cole a saída real no relatório.
