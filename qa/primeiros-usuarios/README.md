# Primeiros usuários

Teste de usabilidade de 19 de outubro de 2026, antes do lançamento interno. Seis personas (subagentes com um Chromium headless cada) saíram da tela inicial e foram até o primeiro sucesso. Na rodada 1 elas acharam os pontos de travada; depois veio a correção, e na rodada 2 seis personas novas, que não viram a tabela, fizeram o mesmo caminho. Uma segunda leva corrigiu o que ficou pendente, e a rodada 3, com quatro personas novas de aluno, conferiu.

- **Primeiro sucesso do aluno:** concluir a primeira aula de um curso liberado (90% do vídeo) e responder o questionário dela.
- **Primeiro sucesso do admin:** criar um curso com capa, 1 módulo, 1 aula com vídeo e 1 pergunta, publicar e liberar para uma pessoa.
- **Ambiente:** `next dev` na porta 3001 contra o Postgres local (54322), Clerk de desenvolvimento com contas `+clerk_test`, curso "Fundamentos do envase de líquidos" liberado para cada aluno e um questionário de 2 perguntas na aula 1. O vídeo é o de exemplo do seed (10:34).
- **Prints:** cada achado tem um PNG em `r1/`, `r2/` ou `r3/`, por persona. Os PNGs ficam fora do git.

## Resultado por persona

| Persona | Rodada 1 | Rodada 2 | Rodada 3 |
|---|---|---|---|
| Impaciente (1280 px) | sucesso, 7 cliques | sucesso, 7 cliques | sucesso, 7 cliques |
| Só teclado | sucesso, 8 ativações | sucesso, 6 ativações | sucesso, 7 ativações, nenhum clique |
| Celular (375 px) | sucesso, 7 cliques | sucesso, 7 cliques | sucesso, 7 cliques |
| Quem tenta quebrar | sucesso, 7 cliques | sucesso, 11 cliques (errou o questionário de propósito) | sucesso, 8 cliques |
| Admin pela primeira vez | não chegou: o Salvar com capa falhava | chegou: curso publicado com capa e liberado (conferido no banco; o relato do agente veio vazio, então não há contagem de cliques nem observação de uso) | fora da rodada |
| Pessoa nova, sem conta | não chegou: captcha do Clerk | não chegou: captcha do Clerk | fora da rodada |

O 3G lento do roteiro original não foi simulado: o `agent-browser` não limita a rede.

## Antes e depois

Cada linha é um ponto de travada da rodada 1, com quantas personas bateram nele. A coluna "Como se conferiu" diz de onde vem o R2: um print ou o banco da rodada 2, o relato de uma persona da rodada 2, ou só o teste da correção, quando nenhuma persona da rodada 2 passou de novo pelo ponto. Nesse último caso, o 0 quer dizer "não reapareceu", não "conferido na tela".

| Ponto | R1 | R2 | Como se conferiu | Correção |
|---|---|---|---|---|
| A capa do curso não salvava, com o toast genérico "Não deu para salvar" | 1 (admin, travou) | 0 | banco: curso r2 com `capa_url` no bucket; teste | O `fetch` do Next recria o `Request` assinado a partir do stream do corpo, o PUT saía sem `Content-Length` e o bucket respondia 411. Os bytes agora vão no `init` |
| "Próxima aula" aparece 3 ou 4 vezes na mesma tela | 4 | 1 | relato r2 (celular) | Não mexido: fica para o dono decidir |
| A barra do player quebra e a Tela cheia cai sozinha numa linha | 4 | 0 | prints r2/teclado/09 e r2/celular/04 | A barra lê a própria largura (container query); o aviso da conquista não ocupa mais largura |
| Uma linha corta o enunciado de cada pergunta | 3 | 0 | print r2/teclado/09 | A divisória saiu do `fieldset`, onde o `legend` senta em cima da borda |
| Nome recusado pelo Clerk aparece como salvo no cabeçalho e no certificado | 1 | 0 | só o teste (Chromium com Clerk falso) | O cartão mostra o nome salvo; o campo explica a regra antes de enviar |
| Nome de 256 letras estoura o cartão e a folha do certificado | 1 | 0 | print r2/quebra/12 | Limite de 100 caracteres e 20 letras por palavra, medido no PDF |
| Depois de enviar o questionário, o foco cai no `body` | 1 | 0 | só o teste; não reapareceu | O foco vai ao resultado, que se anuncia pelo título e pela frase |
| O Esc dos Ajustes deixa o foco no botão que sumiu | 1 | 0 | relato r2 (teclado) | O foco volta à engrenagem no quadro da tecla |
| O cartão "Continuar" da barra lateral não mostra o foco | 1 | 0 | só o teste; não reapareceu | O play redondo acende com o foco, como no hover |
| "Salvar nome" apagado sem dizer por quê | 1 | 0 | só o teste | O campo diz "Escreva o seu nome para salvar." |
| "No file chosen" em inglês na árvore de acessibilidade | 1 | 0 | só o teste | O campo de arquivo virou `hidden` |
| O cadastro promete um campo de nome que não existe | 1 | 1 (mais leve) | relato r2 (nova) | O subtítulo agora manda conferir o nome em Minha conta |
| Captcha da Cloudflare não passa e a tela fica sem mensagem | 1 | 1 | relato r2 (nova) | Não mexido: proteção contra bot do Clerk |
| 7 paradas de Tab dentro do iframe do YouTube, em inglês | 1 | 1 | relato r3 (teclado): o iframe não entra mais na ordem de Tab | Segunda leva: `tabindex=-1` no iframe; os controles do app cobrem tudo |
| A tela de entrar não diz o que é a plataforma | 1 | 1 | relato r2 (nova) | Não mexido: texto de produto |

Fora da tabela, corrigido sem persona:

- Reaproveitar o `tentativaId` de outra pessoa dava `INTERNAL_SERVER_ERROR` com o SQL na mensagem. Agora sai `ErroParaAPessoa` com `CONFLICT`.
- O erro do link de entrada do Clerk ("This sign in token has already been used") saía em inglês. Seis códigos ganharam texto em pt-BR.

## Achados novos da rodada 2

| Ponto | Persona | Gravidade |
|---|---|---|
| Na velocidade dos Ajustes, as setas não movem o foco, e o Enter no primeiro item aplica 0,75× | teclado | média |
| Sem link de pular para o conteúdo: 7 Tabs até o "Começar curso" | teclado | média |
| O "Próxima aula" funciona com 0% visto: dá para pular a aula sem assistir. Os pontos e o progresso só contam a 90%, então não há ganho indevido; se a ordem das aulas deve travar é decisão do dono | quebra | média |
| Os controles do player ficam desligados por uns 3 s ao abrir a aula, sem sinal de carregamento | impaciente | baixa |
| A frase "as próximas não valem pontos" convive com o saldo subindo (os pontos eram da aula) | quebra | baixa |
| O nome acessível sai "Faltam190 pts", sem espaço, nos botões de Trocar pontos | quebra | baixa |
| O rótulo "sáb e dom" de Conquistas fica girado e pequeno | quebra | baixa |
| A aba da aula inexistente fica "Aula · Profills Cursos" | quebra | baixa |

## Segunda leva e rodada 3

| Ponto | Correção | Como se conferiu |
|---|---|---|
| Setas não andavam na velocidade, e o Enter no primeiro item aplicava 0,75× | A velocidade virou grupo de opções: o foco entra na marcada e as setas aplicam cada uma | relato r3 (teclado) |
| Uma seta ou o `k` dentro dos Ajustes tocava o vídeo | A tecla dentro da folha fica com ela, e o `seekTo` antes do primeiro play só guarda a posição | teste com o YouTube real num harness; a persona da r3 não viu o vídeo tocar sozinho |
| Sem link de pular para o conteúdo | "Pular para o conteúdo" é a primeira parada, no aluno e no admin | print no Chrome do dono, com o app real |
| Controles desligados por 3 s sem sinal | Os botões pulsam e a seção fica `aria-busy` enquanto o vídeo carrega | relato r3 (celular): o sinal ainda passa despercebido. Parcial |
| O esqueleto da aula pulava ao trocar pelo player | A reserva da barra segue a largura (38, 78 ou 80 px) | teste no Chromium em 6 larguras |
| "Tentar de novo" jogava o foco no `body` | O foco vai ao título "Questionário", que se anuncia com a regra | teste no Chromium com Enter real |
| "as próximas não valem pontos" | "O questionário pontua só na primeira tentativa" | teste |
| Nome longo estourava a folha do certificado | A folha desce o corpo em degraus, quebra palavra com hífen e corta com reticências | print do app real com 256 letras; PDF medido em 9 nomes |
| "Faltam190 pts" no leitor de tela, e "1 pts" | Rótulo num texto só; "1 pt" no singular | árvore de acessibilidade no Chromium; teste |
| "sáb e dom" girado | Na horizontal, 12 px, contraste 5,18:1 | teste no Chromium em 1280 e 390 px |
| A aba da aula inexistente dizia "Aula" | Aula, curso, certificado e a 404 do app têm título de não encontrado | teste |
| Dois controles "Volume", cada um com uma parada de Tab (visto na r2 e na r3) | O volume vai ao `Slider` em array; com um número ele desenhava dois polegares | teste e contagem no app real: 1 polegar |
| Duas consultas de saldo na API | Uma só, `linhasDoSaldo` | suíte da API igual antes e depois (479 pass) |
| `db:migrate:local` migrava a 54322 mesmo com outro banco local | `LOCAL_DATABASE_URL`, com host remoto recusado | antes 0 tabelas no banco pedido, depois 16 |

Ficou para depois, da rodada 3: o sinal de carregamento ainda fraco, o "% visto" que recebe Tab só para abrir a dica, e a velocidade escondida atrás da engrenagem (impaciente e celular pediram à vista).

## O que não foi verificado

- **Capa em produção.** A causa do 411 foi vista no log do `next dev` local, e o `next start` de produção usa o mesmo `fetch` do Next. O log de produção não foi lido, então o defeito em produção é inferido, e a correção lá só se confirma depois do deploy, com um admin subindo uma capa.
- **Troca de pontos pela interface.** Nenhuma persona tinha saldo para trocar. A corrida de 20 trocas está provada na API (PR #112), não no fluxo da tela.
- **3G lento** e **cadastro da pessoa nova**, pelos motivos da primeira tabela.
- **Questionário e títulos na tela logada.** O "Tentar de novo" e os títulos de não encontrado foram provados no Chromium com o componente real e no Next com rotas provisórias, não por uma persona logada.

## Decisões tomadas sem o dono, para conferir

- O nome tem limite de 100 caracteres e de 20 letras por palavra, medido no PDF do certificado. Nome com `<`, `>`, `&` ou `://` é barrado antes de enviar.
- O cartão de Minha conta mostra o nome salvo, e só a prévia do certificado acompanha a digitação, com a legenda "Prévia: este nome ainda não foi salvo". Isso muda o `DESIGN.md`.
- No celular, o slider de volume sai da barra do player; ficam o botão de som e o volume do aparelho.
- O item focado dos Ajustes ficou em `trilho`: 1,35:1 contra o fundo da folha, ainda abaixo de 3:1.
- Na velocidade, as setas já aplicam cada velocidade por onde passam, como num grupo de rádio comum, e o Enter não fecha a folha.
- O nome cortado na folha pode terminar no meio de uma palavra ("Apareci…").
