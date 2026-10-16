# Curso no formato Udemy: decisões e plano

Este arquivo é a fonte única para retomar o trabalho numa máquina nova. Ele guarda as decisões do dono, o estado de cada entrega, o que falta, as provas e todo o material de trabalho em `arquivos/`. Vale até o trabalho fechar. Depois, ele é apagado, e o que ficar de regra vai para o `GLOSSARY.md`, a ADR e o `CLAUDE.md`.

O issue de acompanhamento é o #65. **O trabalho fechou em 16 de outubro de 2026**: todos os PRs abaixo estão na main, e as cinco migrações estão no banco cloud. Este arquivo fica como registro das decisões e das provas, e pode ser apagado quando o dono quiser. As regras que continuam valendo já estão no `GLOSSARY.md`, no `apps/web/PRODUCT.md`, no `apps/web/DESIGN.md` e no `CLAUDE.md`.

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
- No player, o nome do curso no topo da coluna de aulas leva à página do curso. O app não tem migalha.
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

| Entrega | PR | Estado |
|---|---|---|
| Tirar a trilha do catálogo | #64 | Na main |
| Curso no formato Udemy: dados, página do curso e tela de categorias | #66 | Na main. O dono aceitou os desvios listados abaixo |
| Polimento: críticas do `/impeccable`, menu sem Início e pendências pequenas | #70 | Na main |
| Editor do curso (Vitrine, tópicos, aulas e questionário) | #71 | Na main |
| Sidebar recolhe na aula, app sem migalha | #72 | Na main |
| Conquistas | #73 | Na main |
| Liberar um curso para várias pessoas | #74 | Na main |
| Questionário do aluno, pontos e conclusão | #76 | Na main |
| Certificado (página, PDF e conferência) junto do questionário | #77, que contém o #75 | Na main |
| Comunicados do aluno | #78 | Na main |

## Página do curso e categorias: entregue

O plano desta seção está todo feito, com os briefs `arquivos/brief-comum-r3.md`, `brief-pagina-do-curso.md` e `brief-tela-de-categorias.md`. A prova no browser, contra um database local semeado, está em `arquivos/prova-curso-udemy/`.

Depois de juntar as duas frentes, a prova no browser achou dois defeitos, e uma revisão independente achou mais quatro. Cada um ganhou um teste que falhava antes:
- abaixo de 1081 px, a capa ao lado do texto esticava e era cortada;
- o resumo abria linha com um "·" sozinho e punha um "·" depois do selo da categoria;
- a prova e o concluído davam erro quando o primeiro módulo estava vazio;
- o módulo vazio aparecia como concluído;
- depois de apagar uma categoria, o foco caía no `body`;
- depois da recusa de apagar, a linha ficava sem o nome e sem o Renomear.

Desvios do protótipo, todos aceitos pelo dono:
- "Prova e certificado no módulo 15" virou "no fim do curso".
- A prova mostra "Você assistiu a todas as aulas", "Prova e certificado", o botão "Rever aulas" e "A prova abre em breve nesta página". O concluído mostra "Certificado emitido em <data>", "Rever o curso" e "Código do certificado". Esses textos não estão no protótipo.
- Cada aula do índice de livro é link para a aula.
- O selo do cartão tem ícone, como o DESIGN.md pede.
- Abaixo de 1081 px, o cartão ocupa a largura toda, com a capa ao lado do texto.
- Nas categorias, o confirmar do Apagar é o botão amarelo da `ConfirmacaoNaLinha`, e a dica do Apagar desligado usa a frase do servidor.
- Os selos vazios ("Nenhum curso", a categoria da página) usam contorno em `texto-apagado`, como o "Sem liberação", porque o `trilho` dava 1,5:1. O dono pediu os três iguais.

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

Feito em 16 de outubro de 2026: o dono aplicou `catalogo_sem_trilha`, `formato_udemy`, `categoria`, `questionario` e `questionario_do_aluno`, e a tabela `drizzle.__drizzle_migrations` do cloud tem as 12 migrações da main. Zerar o banco, como pede a ADR 0001, fica com o dono.

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
  - botão de legenda no player, ou qualquer elemento por cima do iframe do YouTube.

## Pendências pequenas

Todas as pendências que estavam aqui foram resolvidas no #70. Ficam como sugestão:

- A faixa de comunicado de Meus cursos pode ganhar um link para `/comunicados`.
- O certificado em Conquistas ainda não tem link para a página do certificado.
- Nenhum item do menu usa mais o estado "Em breve"; ele só sobrevive no teste de foco.

## Como verificar

- `bun run check-types`, `bun x ultracite check` e `bun run test`. O último roda com `TEST_DATABASE_URL` apontando para um database do Supabase local.
- Antes de commitar, os três precisam estar verdes. Cole a saída real no relatório.
