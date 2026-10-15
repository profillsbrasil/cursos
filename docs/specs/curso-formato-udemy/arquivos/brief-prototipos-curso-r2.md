# Brief: rodada 2 dos protótipos do curso no formato Udemy

SOMENTE LEITURA no repo `/home/othavio/.herdr/worktrees/cursos/curso-formato-udemy`. A única coisa que você escreve é `docs/specs/curso-formato-udemy/arquivos/prototipos-curso-r2.html`.

A rodada 1 está em `docs/specs/curso-formato-udemy/arquivos/prototipos-curso.html`. A fonte e os scripts dela estão em `docs/specs/curso-formato-udemy/arquivos/fontes/r1/` (`fonte.html`, `montar.py`, `fotos.sh`, `inteira.sh`). Copie para uma pasta nova (`.../scratchpad/prototipos-curso-r2/`) e trabalhe na cópia. O brief da rodada 1 (`brief-prototipos-curso.md`, na mesma pasta do cache) continua valendo para visual, formato de Artifact, conteúdo real e prova por screenshot.

## O que o dono respondeu sobre a rodada 1

**Página do curso para o aluno.** Ele gostou do cartão preso à direita da versão A: capa, selo "Em andamento" com 51%, barra, "46 de 90 aulas assistidas", "Agora: Módulo 8, Pilar Urgência", "Aula 4 · Cronograma reverso", o botão "Continuar em 3:42" e as três linhas de baixo (faltam 7 min, próximo nível, prova e certificado). Ele quer mais protótipos que mantenham esse cartão preso e que misturem a divisão de conteúdo da versão C (o índice de livro, com cada aula e a descrição dela) com a da versão A (módulos em sanfona).

**Editor do curso.**
- O endereço (`/cursos/<slug>`) não é decisão de quem cria. Ele é gerado sozinho a partir do título. O campo sai do editor. No máximo, o editor mostra o link como texto.
- A categoria vem de uma lista que o admin mantém numa tela própria de categorias. No editor, a categoria é um select com as categorias que já existem.
- O topo do editor segue a "Vitrine" da versão C: capa à esquerda com "Trocar capa", e à direita título, categoria e descrição.
- A criação da aula segue a versão D: a lista das aulas do módulo e a aula escolhida num painel ao lado. O ponto principal é ter um jeito prático de pôr o questionário naquela aula, dentro desse painel. Ele quer mais opções para decidir.

## O que fazer

Faça 4 versões (A, B, C e D) de cada uma das três telas abaixo, todas visíveis ao mesmo tempo, como na rodada 1. As 4 versões de cada tela diferem na estrutura.

1. **Página do curso para o aluno.** As quatro mantêm o cartão preso à direita da rodada 1, versão A, igual ao do print. O que varia é a coluna da esquerda: como a descrição, os tópicos e o conteúdo se dividem, misturando o índice de livro da C com a sanfona da A. Algumas ideias:
   - sanfona em que o módulo aberto mostra as aulas no formato de índice, com a descrição de cada uma;
   - índice de livro só para o módulo atual, e o resto em sanfona;
   - abas ou âncoras entre "Sobre" e "Conteúdo";
   - índice compacto, em que a descrição da aula abre ao passar o mouse ou ao clicar.

   Não precisa seguir essas ideias. Mostre o Comercial em andamento (90 aulas) em duas versões e Fábrica e montagem não iniciado (7 aulas) nas outras duas. Diga na linha de estado de cada versão como ela fica no outro curso.
2. **Editor do curso.** As quatro têm o topo "Vitrine" da rodada 1, versão C, com a categoria como select e sem o campo de endereço. Sob o título, o link aparece como texto apagado (`/cursos/profills-school-comercial`) com a frase "gerado a partir do título".

   O que varia é a criação da aula com o questionário, sempre partindo da versão D: lista das aulas à esquerda e painel da aula escolhida à direita. O questionário tem perguntas de múltipla escolha, cada uma com de 2 a 5 alternativas e uma marcada como certa. A nota mínima é 70%, fixa para todo curso, e o aluno pode tentar de novo. Algumas ideias:
   - o painel com abas "Aula" e "Questionário";
   - o questionário embaixo da descrição, no mesmo painel, com as perguntas em sanfona;
   - um painel mais largo com a pergunta em edição à direita e a lista de perguntas à esquerda;
   - cada pergunta como um cartão com as alternativas em linha e um botão para marcar a certa.

   Mostre o módulo 8 do Comercial com a aula 4 escolhida e 3 perguntas plausíveis sobre "Cronograma reverso". Na lista, as aulas com questionário mostram quantas perguntas têm.
3. **Tela de categorias do admin** (tela nova). O admin cria, renomeia e apaga categorias. A categoria em uso por algum curso não se apaga, e a tela diz em quantos cursos ela está. As categorias são as 5 que o seed usa hoje, com os cursos de cada uma. Varie onde a tela mora e como ela funciona:
   - item próprio no menu do admin;
   - seção dentro do Catálogo;
   - diálogo aberto a partir do select do editor;
   - criar categoria direto do select ("+ Nova categoria"), com uma lista simples para renomear e apagar.

## Entrega

A mesma da rodada 1: o caminho do HTML, o tamanho, uma tabela com as 12 versões e a ideia de cada uma, e o que você inventou de conteúdo. Não publique. Eu publico.
