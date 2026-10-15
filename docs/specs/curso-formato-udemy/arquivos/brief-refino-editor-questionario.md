# Brief: refinar o editor com o questionário (protótipo)

SOMENTE LEITURA no repo `/home/othavio/.herdr/worktrees/cursos/curso-formato-udemy`. Escreva só:
- `docs/specs/curso-formato-udemy/arquivos/prototipo-editor-r3.html`;
- a pasta de trabalho `docs/specs/curso-formato-udemy/arquivos/fontes/r3/`.

## O que o dono pediu

Na rodada 2 (`docs/specs/curso-formato-udemy/arquivos/prototipos-curso-r2.html`), ele escolheu o editor da versão C: a Vitrine no topo e, no módulo aberto, a lista estreita das aulas com o painel largo da aula escolhida. Dentro do painel ficam a lista das perguntas do questionário à esquerda e a pergunta em edição à direita. As funções da versão são `editor("C")` e `painelC`, na fonte em `.../scratchpad/prototipos-curso-r2/fonte.html`.

As palavras dele foram "eu gostei bastante da C, só precisa refinar mais com o /impeccable". Rode a skill `/impeccable` sobre essa versão: crítica, depois polimento. Entregue a versão C refinada.

Pontos que a rodada 2 já mostrou e que o refino deve resolver:
- A lista das aulas, de 236 px, corta os títulos.
- No painel, a hierarquia entre os dados da aula (título, duração, vídeo, descrição) e o questionário está fraca.
- A regra da nota precisa ficar clara: com 3 perguntas, a nota de 70% exige 3 acertos.
- A marcação da alternativa certa, os estados de vazio e de erro (pergunta sem texto, alternativa vazia, nenhuma certa) e o foco de teclado. O foco é o hover, sem anel, como diz o CLAUDE.md.

A Vitrine (capa, título com o link gerado, categoria em select e descrição) também passa pelo refino. A categoria vem da tela própria de categorias, que já foi aprovada (versão A da rodada 2). Por isso o select pode ter um link "Gerenciar categorias" que leva a ela.

Mantenha o mesmo sistema visual, o mesmo formato de Artifact e o mesmo conteúdo real das rodadas anteriores. Isso quer dizer: o tema escuro, a janela de 1280 px reduzida, a interação real e a prova por screenshot. É uma versão só, então o arquivo mostra o editor inteiro e, ao lado, um quadro curto com o que mudou em relação à rodada 2.

## Entrega

Devolva:
- o caminho do HTML e o tamanho;
- a lista do que a crítica do `/impeccable` apontou e do que você mudou;
- as screenshots que conferiu.

Não publique. Eu publico.
