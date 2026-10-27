# 0003. Papel e perfil são eixos separados

Data: 20 de outubro de 2026. Situação: aceita. A regra de acesso (o item "Acesso" da decisão) foi substituída pela ADR 0004: a liberação do perfil passa a dar a amostra do curso, e o curso inteiro abre só pela liberação própria.

## Contexto

O `PRODUCT.md` fala em três públicos na mesma plataforma: os funcionários da Profills, os clientes e o público aberto. Ele também diz que cada pessoa vê os cursos liberados para o perfil dela. O código só conhecia o papel, `aluno` ou `admin`, lido do claim do Clerk, e a liberação era sempre de uma pessoa. O admin não tinha como dizer "este curso é de todos os funcionários" nem mudar o papel de alguém pelo app. O papel só mudava pelo painel do Clerk.

O dono pediu três níveis: usuário, funcionário e admin. Com um campo só, o admin deixaria de ser funcionário e perderia os cursos de funcionário. Por isso o nível vira dois eixos.

## Decisão

- **Papel.** Diz o que a pessoa pode fazer: `aluno` ou `admin`. Continua no Public metadata do Clerk, porque o session token o carrega e o `exigirAdmin` o lê sem ir ao banco. O app passa a gravá-lo pela Backend API (`updateUserMetadata`), e a mudança só vale quando o token renova, em até 60 s.
- **Perfil.** Diz que cursos a pessoa vê pelo perfil: `funcionario`, `cliente` ou `publico`. Mora no Postgres, na tabela `perfil_da_pessoa`, porque entra no SQL do acesso e no filtro da tela Pessoas. A Backend API do Clerk não filtra a lista de usuários por metadata.
- **Perfil do cadastro.** A linha nasce no primeiro acesso ao app. Quem tem o e-mail principal verificado em `@profills.com` entra como funcionário, e todo o resto entra como público aberto. O admin muda o perfil depois.
- **Liberação do perfil.** A tabela `liberacao_do_perfil` abre um curso a todo mundo de um perfil, inclusive a quem ganhar o perfil depois. Ela tem a mesma vida da liberação: data, quem liberou, revogação com data e autor, e no máximo uma ativa por perfil e curso. "Liberado para todos" é o curso liberado aos três perfis.
- **Acesso.** A pessoa vê um curso quando tem uma liberação própria ativa (do admin ou de troca) ou quando o perfil dela tem uma liberação ativa do curso. Substituído pela ADR 0004: a liberação do perfil dá só a amostra.
- **Empresa cliente.** Não vira conceito. O admin libera à mão cada pessoa do cliente, pela liberação por pessoa.

## Consequências

- Mudar o perfil grava com o aluno travado (`ponto:<userId>`), então uma troca do mesmo aluno espera e lê o perfil novo. A liberação do perfil não trava aluno nenhum. Uma troca que corre junto com ela pode cobrar um curso que acabou de abrir ao perfil, e a liberação de troca continua valendo depois.
- Revogar a liberação do perfil fecha o curso a quem só o via pelo perfil. O estudo dessas pessoas fica guardado, como na revogação por pessoa.
- Curso com liberação do perfil, ativa ou revogada, não se apaga, como o curso com liberação por pessoa.
- O primeiro acesso de cada pessoa lê a conta no Clerk uma vez por pedido, por mais procedures que a página chame. Os acessos seguintes leem só a linha do banco. Com o Clerk fora nesse primeiro acesso, o pedido vale como Público aberto, o perfil de menos acesso, e nada se grava: o acesso seguinte tenta de novo.

A decisão entra em quatro PRs:

1. O schema, os escritores e este registro.
2. A regra de acesso com o perfil, em todo leitor do aluno: Meus cursos, a página do curso, a aula, o questionário, o certificado, Conquistas, os comunicados e a troca.
3. A tela Pessoas do admin, com o perfil, o papel e os dados da conta.
4. A tela de Alunos vira Liberações, com as abas Por pessoa e Por perfil. O acompanhamento e a situação da pessoa passam a contar a liberação do perfil.
