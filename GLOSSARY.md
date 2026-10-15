# Glossário

Vocabulário do domínio da plataforma de cursos. Nome de tabela, procedure e componente usa estes termos.

| Termo | Definição |
|---|---|
| Curso | A única coisa do catálogo, no formato da Udemy: capa, título, categoria, descrição, tópicos, módulos, aulas, prova e certificado. Existe uma vez no catálogo, e um curso não depende de outro para abrir (ver `docs/adr/0001-catalogo-so-de-cursos.md`). A descrição é texto livre de até 2000 caracteres e pode ficar vazia. |
| Categoria | Registro que o admin mantém (tabela `categoria`, procedures `admin.categorias`), com um nome único de até 80 caracteres, como "Processo de envase". Todo curso aponta para uma, e o admin a escolhe numa lista no editor. A categoria em uso por algum curso não se apaga. O aluno vê só o nome, na linha sob a capa em "Meus cursos", no cartão de "Trocar pontos" e na página do curso. Antes era texto livre chamado tema. |
| Endereço do curso | O slug do link do aluno, `/cursos/<slug>`. O servidor gera o endereço a partir do título no primeiro salvamento: minúsculas, sem acento, com hífen no lugar de espaço e pontuação. Se outro curso já usa o mesmo endereço, ganha `-2`, `-3` e assim por diante. Depois disso, o endereço é fixo, mesmo que o título mude, para o link guardado continuar abrindo. O admin não edita o endereço. |
| Tópico | Uma linha do "O que você vai aprender" do curso. O curso tem até 10, de até 120 caracteres cada, em ordem, e nenhum vazio. |
| Página do curso | O que o aluno vê de um curso antes de entrar numa aula: capa, título, categoria, descrição, tópicos, estado, progresso, a ação principal e as aulas por módulo, cada uma com a descrição e se foi assistida. A ação é começar, continuar (na aula e no segundo da retomada), fazer a prova ou rever o curso concluído. Abre só para quem tem liberação ativa do curso, pela mesma regra da aula. |
| Módulo | Grupo numerado de aulas dentro de um curso. O aluno vê o número ("Módulo 3"). Os cursos de exemplo começam em 0 ou em 1, e o admin escolhe o número. |
| Aula | Vídeo com duração em segundos e uma descrição opcional de até 2000 caracteres, numa posição dentro de um módulo. A aula mantém o id quando o admin a muda de lugar ou de módulo, e com ele a aula assistida e a posição dos alunos. |
| Documento do curso | O curso inteiro como o admin edita: campos (a categoria, pelo id, a descrição e os tópicos entre eles), capa, níveis, módulos e aulas. O endereço do curso não faz parte do documento. O admin salva o documento de uma vez, e o servidor grava o estado final. |
| Rascunho | Documento do curso no editor, antes de salvar. Os campos lidos (duração, vídeo, número do módulo e preço) ficam no texto que o admin digitou até o salvar convertê-los. O documento novo é rascunho até o primeiro salvamento, com o id já na URL, e o aluno não vê nada dele. O rascunho só some quando o admin pede "Recarregar" ou sai da página. |
| Versão | Impressão do conteúdo de um documento do admin, derivada dele e não guardada. No curso, a capa entra no conteúdo. Salvar com a versão velha dá conflito; reenviar o que já está gravado é sucesso. |
| Capa | Imagem do curso, JPG, PNG ou WebP, com até 4 MB e pelo menos 640 px de largura. Fica no bucket `capas` com o nome igual ao hash dos bytes. |
| Nível | Grupo nomeado de módulos de um curso. Cada módulo pertence a no máximo um nível. Só o curso Comercial tem níveis hoje. |
| Aluno | Pessoa logada que estuda. É identificada pelo `userId` do Clerk e não tem tabela própria. |
| Admin | Pessoa que cria cursos, libera, revoga e publica comunicados. É quem tem o papel `admin`. |
| Papel | `aluno` ou `admin`, lido do claim `papel` do session token do Clerk, que vem do Public metadata da pessoa. Claim ausente ou com outro valor vale `aluno`. |
| Liberação | Registro de que um aluno pode ver um curso. É permanente até o admin revogar. Uma pessoa tem no máximo uma liberação ativa por curso. A liberação de uma troca não se revoga. |
| Origem da liberação | De onde veio a liberação: `admin` ou `troca`. Fica gravada na liberação e não se deduz de quem liberou. Só a de `troca` não se revoga, e ela é liberada pelo próprio aluno. |
| Revogação | O admin tira uma liberação de `admin`: a linha fica, com a data e quem revogou. Revogar de novo não muda nada, e liberar o mesmo curso depois cria uma liberação nova. |
| Pessoa | Quem tem conta no Clerk, como o admin a busca: nome, e-mail e `userId`. Uma pessoa apagada do Clerk ainda aparece na tela de acesso pelo `userId`, com as liberações dela, para o admin revogar. |
| Aula assistida | Fato imutável: a cobertura do aluno numa aula chegou a 90% da duração. Acontece uma vez por aluno e aula. |
| Posição | Último segundo em que o aluno parou numa aula. É estado mutável, usado pelo "Continuar". |
| Trecho visto | Intervalo de segundos inteiros de uma aula que o vídeo tocou sem salto, `[início, fim)`. Buscar para a frente não cria trecho. Os trechos de um aluno numa aula só crescem. |
| Cobertura | Soma dos segundos distintos dos trechos vistos de uma aula. Ver o mesmo trecho duas vezes conta uma vez. O servidor calcula com a duração da aula no banco. |
| Cota de vídeo | Quantos segundos de vídeo novo o servidor ainda aceita de um aluno. Enche 2 s por segundo de relógio, até 180 s, e vale para todas as abas e aulas dele. O que passa da cota fica para o envio seguinte. |
| Progresso | Aulas assistidas sobre aulas do curso, contadas no servidor. |
| Prova | Avaliação final do curso. Abre quando todas as aulas estão assistidas. |
| Certificado | Comprovante emitido quando o aluno assistiu a todas as aulas e passou na prova. Tem código único e continua valendo se o curso ganhar aula nova. |
| Curso concluído | Curso em que o aluno tem certificado. |
| Curso começado | Curso em que o aluno tem pelo menos uma aula assistida ou uma posição acima de 0 s. Só volta a fechar como `em_breve`, quando o admin o põe em produção. |
| Ponto | Valor inteiro de um lançamento. O saldo é a soma dos lançamentos do aluno. |
| Lançamento | Fato imutável de pontos, ligado ao fato que o gerou. Entrada é positiva; saída é negativa, e hoje só a troca sai. O mesmo fato não gera dois lançamentos. |
| Saldo | Soma dos lançamentos do aluno. Toda saída lê o saldo com o aluno travado, e por isso ele nunca fica negativo. |
| Pontos da semana | Soma das entradas desde segunda. A troca não entra. |
| Extrato | Os lançamentos mais recentes do aluno, com o fato de cada um em texto. |
| Troca | Liberação de um curso trocável paga com pontos. Grava, na mesma transação, a liberação do curso e um lançamento negativo que aponta para ela. O valor do lançamento é o preço pago. Curso que a pessoa já tem liberado, pelo admin ou por troca, não se troca de novo. |
| Curso trocável | Curso publicado, com aula, em que o admin definiu um preço de troca. Some da vitrine de quem já tem liberação ativa dele. |
| Preço de troca | Pontos que a próxima troca de um curso custa. Mudar o preço não muda as trocas feitas. |
| Dia útil | Segunda a sexta no fuso `America/Sao_Paulo`. Feriado conta como dia útil. |
| Sequência | Dias úteis seguidos com pelo menos uma aula assistida pela primeira vez. Sábado e domingo não contam nem quebram. |
| Medalha | Conquista individual por critério. Ainda não existe no código. |
| Comunicado | Aviso publicado pelo admin, geral ou de um curso. |
| Estado do curso | Um de cinco valores calculados no servidor: `em_breve`, `nao_iniciado`, `em_andamento`, `prova`, `concluido`. O aluno lê `em_breve` como "Em produção". O termo é o do admin, mas o alcance é maior: `em_breve` vale para o curso com status `em_producao` e para o curso publicado ainda sem aula, que o admin vê como publicado. |
| Último estudo | O dia mais recente, em São Paulo, em que a pessoa assistiu a uma aula, salvou uma posição acima de 0 s ou recebeu um certificado. Entrar no app não conta. |
| Situação no curso | O estado do curso na palavra do admin: Nunca abriu (o "Não iniciado" do aluno), Estudando, Falta a prova, Concluído e Em produção (o "Em breve" do aluno). Quem parou de estudar não ganha situação própria: o admin lê o dia do último estudo. Evite "Parado". |
| Acompanhamento | O estudo de uma pessoa no curso de uma liberação, como o admin lê: o progresso e a situação no curso. O módulo e a aula são os da aula para onde o Continuar da pessoa leva, os mesmos da capa do curso em "Meus cursos". A liberação revogada mostra o estudo que ficou. |
| Situação da pessoa | O que a busca do admin diz de cada pessoa, decidido nesta ordem: Sem liberação (nenhuma ativa), Nunca abriu (nenhum estudo nos cursos liberados a ela), Concluiu tudo (todo curso liberado a ela e que não está em produção tem certificado) e Estudando. Evite "resumo": no código, `aluno.resumo` é o placar do aluno. |
| Retomada | A aula e o segundo para onde o banner de "Meus cursos" e o cartão "Continuar" da sidebar levam: continuar, começar ou fazer a prova. Os dois leem a mesma retomada, e sem retomada o cartão não aparece. |
| Placar | Saldo e sequência do aluno no cartão de conta da sidebar. É o único lugar da tela que os mostra fora de "Trocar pontos", da semana de "Meus cursos" e do aviso de conquista do player. |
| Casca | A moldura de navegação comum ao aluno e ao admin: a sidebar, que recolhe para ícones, a gaveta do celular e o rodapé com o cartão de conta. Cada área passa só os itens, o selo e o link para a outra área. |
