# Primeiros usuários

Teste de usabilidade de 19 de outubro de 2026, antes do lançamento interno. Seis personas (subagentes com um Chromium headless cada) saíram da tela inicial e foram até o primeiro sucesso. Na rodada 1 elas acharam os pontos de travada; depois veio a correção, e na rodada 2 seis personas novas, que não viram a tabela, fizeram o mesmo caminho.

- **Primeiro sucesso do aluno:** concluir a primeira aula de um curso liberado (90% do vídeo) e responder o questionário dela.
- **Primeiro sucesso do admin:** criar um curso com capa, 1 módulo, 1 aula com vídeo e 1 pergunta, publicar e liberar para uma pessoa.
- **Ambiente:** `next dev` na porta 3001 contra o Postgres local (54322), Clerk de desenvolvimento com contas `+clerk_test`, curso "Fundamentos do envase de líquidos" liberado para cada aluno e um questionário de 2 perguntas na aula 1. O vídeo é o de exemplo do seed (10:34).
- **Prints:** cada achado tem um PNG em `r1/<persona>/` ou `r2/<persona>/`. Os PNGs ficam fora do git.

## Resultado por persona

| Persona | Rodada 1 | Rodada 2 |
|---|---|---|
| Impaciente (1280 px) | sucesso, 7 cliques | sucesso, 7 cliques |
| Só teclado | sucesso, 8 ativações | sucesso, 6 ativações |
| Celular (375 px) | sucesso, 7 cliques | sucesso, 7 cliques |
| Quem tenta quebrar | sucesso, 7 cliques | sucesso, 11 cliques (errou o questionário de propósito) |
| Admin pela primeira vez | não chegou: o Salvar com capa falhava | chegou: curso publicado com capa e liberado |
| Pessoa nova, sem conta | não chegou: captcha do Clerk | não chegou: captcha do Clerk |

O 3G lento do roteiro original não foi simulado: o `agent-browser` não limita a rede.

## Antes e depois

Cada linha é um ponto de travada da rodada 1, com quantas personas bateram nele.

| Ponto | R1 | R2 | Correção |
|---|---|---|---|
| A capa do curso não salvava, com o toast genérico "Não deu para salvar" | 1 (admin, travou) | 0 | O `fetch` do Next recria o `Request` assinado a partir do stream do corpo, o PUT saía sem `Content-Length` e o bucket respondia 411. Os bytes agora vão no `init` |
| "Próxima aula" aparece 3 ou 4 vezes na mesma tela | 4 | 4 | Não mexido: decisão de produto |
| A barra do player quebra e a Tela cheia cai sozinha numa linha | 4 | 0 | A barra lê a própria largura (container query); o aviso da conquista não ocupa mais largura |
| Uma linha corta o enunciado de cada pergunta | 3 | 0 | A divisória saiu do `fieldset`, onde o `legend` senta em cima da borda |
| Nome recusado pelo Clerk aparece como salvo no cabeçalho e no certificado | 1 | 0 | O cartão mostra o nome salvo; o campo explica a regra antes de enviar |
| Nome de 256 letras estoura o cartão e a folha do certificado | 1 | 0 | Limite de 100 caracteres e 20 letras por palavra, medido no PDF |
| Depois de enviar o questionário, o foco cai no `body` | 1 | 0 | O foco vai ao resultado, que se anuncia pelo título e pela frase |
| O Esc dos Ajustes deixa o foco no botão que sumiu | 1 | 0 | O foco volta à engrenagem no quadro da tecla |
| O cartão "Continuar" da barra lateral não mostra o foco | 1 | 0 | O play redondo acende com o foco, como no hover |
| "Salvar nome" apagado sem dizer por quê | 1 | 0 | O campo diz "Escreva o seu nome para salvar." |
| "No file chosen" em inglês na árvore de acessibilidade | 1 | 0 | O campo de arquivo virou `hidden` |
| O cadastro promete um campo de nome que não existe | 1 | 1 (mais leve) | O subtítulo agora manda conferir o nome em Minha conta |
| Captcha da Cloudflare não passa e a tela fica sem mensagem | 1 | 1 | Não mexido: proteção contra bot do Clerk |
| 7 paradas de Tab dentro do iframe do YouTube, em inglês | 1 | 1 | Não mexido nesta rodada |
| A tela de entrar não diz o que é a plataforma | 1 | 1 | Não mexido: texto de produto |

Fora da tabela, corrigido sem persona:

- Reaproveitar o `tentativaId` de outra pessoa dava `INTERNAL_SERVER_ERROR` com o SQL na mensagem. Agora sai `ErroParaAPessoa` com `CONFLICT`.
- O erro do link de entrada do Clerk ("This sign in token has already been used") saía em inglês. Seis códigos ganharam texto em pt-BR.

## Achados novos da rodada 2

| Ponto | Persona | Gravidade |
|---|---|---|
| Na velocidade dos Ajustes, as setas não movem o foco, e o Enter no primeiro item aplica 0,75× | teclado | média |
| Sem link de pular para o conteúdo: 7 Tabs até o "Começar curso" | teclado | média |
| Os controles do player ficam desligados por uns 3 s ao abrir a aula, sem sinal de carregamento | impaciente | baixa |
| A frase "as próximas não valem pontos" convive com o saldo subindo (os pontos eram da aula) | quebra | baixa |
| O nome acessível sai "Faltam190 pts", sem espaço, nos botões de Trocar pontos | quebra | baixa |
| O rótulo "sáb e dom" de Conquistas fica girado e pequeno | quebra | baixa |
| A aba da aula inexistente fica "Aula · Profills Cursos" | quebra | baixa |
