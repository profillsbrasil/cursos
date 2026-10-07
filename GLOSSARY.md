# Glossário

Vocabulário do domínio da plataforma de cursos. Nome de tabela, procedure e componente usa estes termos.

| Termo | Definição |
|---|---|
| Trilha | Lista ordenada de cursos. O curso seguinte só abre quando o anterior está concluído. |
| Curso | Unidade com módulos, aulas, prova e certificado. Existe uma vez no catálogo e está em no máximo uma trilha. |
| Curso solto | Curso que a pessoa recebeu por liberação direta e que não está numa trilha liberada a ela. Na tela, aparece em "Cursos rápidos". |
| Módulo | Grupo numerado de aulas dentro de um curso. O número começa em 0. |
| Aula | Vídeo com duração em segundos, numa posição dentro de um módulo. |
| Nível | Grupo nomeado de módulos de um curso. Cada módulo pertence a no máximo um nível. Só o curso Comercial tem níveis hoje. |
| Aluno | Pessoa logada que estuda. É identificada pelo `userId` do Clerk e não tem tabela própria. |
| Admin | Pessoa que cria trilhas, libera, revoga e publica comunicados. |
| Liberação | Registro de que um aluno pode ver uma trilha ou um curso. É permanente até o admin revogar. |
| Aula assistida | Fato imutável: a cobertura do aluno numa aula chegou a 90% da duração. Acontece uma vez por aluno e aula. |
| Posição | Último segundo em que o aluno parou numa aula. É estado mutável, usado pelo "Continuar". |
| Trecho visto | Intervalo de segundos inteiros de uma aula que o vídeo tocou sem salto, `[início, fim)`. Buscar para a frente não cria trecho. Os trechos de um aluno numa aula só crescem. |
| Cobertura | Soma dos segundos distintos dos trechos vistos de uma aula. Ver o mesmo trecho duas vezes conta uma vez. O servidor calcula com a duração da aula no banco. |
| Cota de vídeo | Quantos segundos de vídeo novo o servidor ainda aceita de um aluno. Enche 2 s por segundo de relógio, até 180 s, e vale para todas as abas e aulas dele. O que passa da cota fica para o envio seguinte. |
| Progresso | Aulas assistidas sobre aulas do curso, contadas no servidor. |
| Prova | Avaliação final do curso. Abre quando todas as aulas estão assistidas. |
| Certificado | Comprovante emitido quando o aluno assistiu a todas as aulas e passou na prova. Tem código único e continua valendo se o curso ganhar aula nova. |
| Curso concluído | Curso em que o aluno tem certificado. |
| Ponto | Valor inteiro de um lançamento. O saldo é a soma dos lançamentos do aluno. |
| Lançamento | Fato imutável de pontos, ligado ao fato que o gerou. Entrada é positiva; saída é negativa, e hoje só a troca sai. O mesmo fato não gera dois lançamentos. |
| Saldo | Soma dos lançamentos do aluno. Toda saída lê o saldo com o aluno travado, e por isso ele nunca fica negativo. |
| Pontos da semana | Soma das entradas desde segunda. A troca não entra. |
| Extrato | Os lançamentos mais recentes do aluno, com o fato de cada um em texto. |
| Troca | Liberação de um curso trocável paga com pontos. Grava, na mesma transação, a liberação do curso e um lançamento negativo que aponta para ela. O valor do lançamento é o preço pago. |
| Curso trocável | Curso publicado, com aula, em que o admin definiu um preço de troca. Some da vitrine de quem já o alcança por liberação direta ou por trilha. |
| Preço de troca | Pontos que a próxima troca de um curso custa. Mudar o preço não muda as trocas feitas. |
| Dia útil | Segunda a sexta no fuso `America/Sao_Paulo`. Feriado conta como dia útil. |
| Sequência | Dias úteis seguidos com pelo menos uma aula assistida pela primeira vez. Sábado e domingo não contam nem quebram. |
| Medalha | Conquista individual por critério. Ainda não existe no código. |
| Comunicado | Aviso publicado pelo admin, geral ou de um curso. |
| Estado do curso | Um de seis valores calculados no servidor: `em_breve`, `bloqueado`, `nao_iniciado`, `em_andamento`, `prova`, `concluido`. |
| Curso da vez | Primeiro curso de uma trilha que abre e não está concluído. |
| Retomada | A aula e o segundo para onde o banner leva: continuar, começar ou fazer a prova. |
