# 0004. A liberação do perfil dá a amostra do curso

Data: 27 de outubro de 2026. Situação: aceita. Substitui a regra de acesso da ADR 0003 (o item "Acesso" da decisão); o resto da 0003 continua valendo.

## Contexto

Pela ADR 0003, a liberação do perfil abria o curso inteiro a todo mundo do perfil, como a liberação própria. Com o programa de pontos, o dono mudou a regra: todo curso custa pontos, e o funcionário usa o Bônus de funcionário (5.000 pts) para trocar os cursos que quer fazer. Se o perfil desse o curso inteiro, o bônus não teria o que comprar, e a troca de quem já vê o curso pelo perfil seria recusada como "já tem".

O dono ainda quer que o perfil mostre o curso: a pessoa acha o curso em Meus cursos, assiste à primeira aula e decide se troca.

## Decisão

- **Acesso ao curso inteiro.** Só a liberação própria ativa, do admin ou de troca. Ela abre todas as aulas, o questionário, o material de apoio, o certificado e o certificado por ganhar em Conquistas.
- **Amostra.** Quem tem uma liberação do perfil ativa do curso, sem liberação própria, vê o curso em Meus cursos, na página do curso e na vitrine de troca, e assiste só à aula de amostra: a primeira aula do primeiro módulo com aula, na ordem do curso. O servidor recusa as outras aulas em todo procedure que abre conteúdo (`aula.abrir`, `aula.registrar`, `questionario.responder`, `curso.material`, `certificado.pagina`), pela porta única de `dominio/aula.ts`: `montarCursoVisto` devolve o curso com a `amostra` (o curso sem aula não tem amostra, e o curso inteiro abre sem aula como antes), `abreAAula` decide a aula e `montarCursoAberto` só abre o curso inteiro.
- **A amostra não pontua.** Ela grava a aula assistida, a posição e os trechos, mas sem lançamento, sem questionário e sem conclusão do curso. Quando a pessoa passa a ter o curso inteiro, pela troca ou pela liberação do admin, a mesma transação da liberação lança o `aula_assistida` de cada aula do curso que ela já assistiu e conclui o curso que ela já completou (`abrirOCursoInteiro`, em `consultas/liberacao.ts`). Assim ninguém perde os pontos da aula 1, e ninguém junta pontos de amostra sem ter o curso inteiro.
- **Todo curso publicado tem preço de troca.** O `salvarCurso` recusa o documento publicado sem preço, também o do curso publicado antes da regra, e o editor mostra o item "Preço de troca" em "Antes de publicar". O curso sem preço salva em produção. Nenhuma migração força preço: o curso publicado antes da regra fica sem troca até o admin pôr o preço.

## Consequências

- Clientes e Público aberto que assistiam a um curso pelo perfil passam a ver a amostra dele. O estudo deles fica guardado, e a troca ou a liberação do admin lança os pontos das aulas já assistidas. O certificado já emitido continua valendo e abrindo pela página do certificado. O dono aceitou.
- Os Funcionários de hoje ganham o curso que estudavam por um script de virada, rodado antes do deploy desta regra. Este registro não grava nada para eles.
- A troca ou a liberação do admin de um curso de uma aula só, já assistida na amostra e sem questionário, emite o certificado na mesma transação.
- A sequência conta o dia da aula de amostra, porque a aula assistida é o mesmo fato; o lançamento da sequência continua só nas aulas que pontuam.
- A tela Liberações e a Situação da pessoa do admin continuam contando a liberação do perfil como antes. Mostrar a amostra ali fica para um PR depois.
