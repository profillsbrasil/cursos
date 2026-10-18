# 0001. O catálogo tem só cursos

Data: 15 de outubro de 2026. Situação: aceita.

## Contexto

O catálogo tinha duas coisas. A trilha era uma lista ordenada de cursos, com uma regra sequencial: o curso seguinte só abria quando o anterior tinha certificado. O curso podia estar numa trilha ou solto, fora de trilha. A liberação apontava para uma trilha ou para um curso, e o ponto `trilha_concluida` valia 500.

Na prática, a trilha guardava só título, descrição e a lista de cursos. Tudo o que o aluno estuda já era do curso: capa, módulos, aulas, progresso, prova, certificado e troca de pontos. A trilha somava uma segunda forma de liberar, um estado a mais (`bloqueado`), o "curso da vez", a seção "Cursos rápidos" e um editor só para ela.

O dono quer uma coisa só no catálogo, no formato de um curso da Udemy: banner, descrição, tópicos, categoria e uma sequência de aulas. Os dados do banco de hoje são de teste e vão ser zerados.

## Decisão

O catálogo passa a ter um tipo só de coisa: o curso. A hierarquia é curso, nível opcional, módulo e aula. Os módulos continuam como seções do curso.

Saem a trilha, a tabela `trilha_curso`, o curso solto, os "Cursos rápidos", a regra sequencial entre cursos ("Abre depois de", o estado `bloqueado` e o curso da vez), a liberação de trilha e o motivo de pontos `trilha_concluida`.

- A liberação aponta sempre para um curso: `liberacao.curso_id` é obrigatório.
- O enum `motivo_ponto` é recriado sem `trilha_concluida`.
- A migração `catalogo_sem_trilha` apaga os lançamentos e as liberações de trilha antes de derrubar as colunas e as tabelas. Ela não preserva nada que aponte para trilha, porque os dados são de teste.
- No seed, os três cursos de "Fábrica e montagem" viram um curso só, com um módulo por curso antigo.
- Meus cursos mostra os cursos numa seção só, com a capa e a grade que os "Cursos rápidos" usavam. O catálogo do admin lista só cursos, e a tela de acesso libera só cursos.

## Consequências

- O alcance de uma pessoa é a lista dos cursos liberados a ela. Nenhum curso espera outro para abrir.
- A troca recusa o curso que a pessoa já tem liberado, pelo admin ou por troca.
- O acompanhamento do admin é sempre de um curso. A situação na trilha deixa de existir.
- Comunicado, certificado, níveis, progresso, sequência e troca não mudam: já eram por curso ou por aula.
- A retomada não leva mais a trilha. Sem curso em andamento nem em prova, o Continuar vai para o primeiro curso não iniciado na ordem da tela, não mais para o primeiro de uma trilha antes dos soltos.

Fica para os próximos PRs:

1. Descrição, tópicos e categoria do curso, e descrição da aula.
2. A página do curso para o aluno, no estilo da Udemy.
3. O questionário por aula, a regra nova de conclusão e a emissão do certificado.

## Ordem de aplicação no banco cloud

A main e todos os worktrees usam o mesmo banco cloud. Aplicar a migração antes da hora quebra a main e os worktrees que ainda leem trilha. A ordem é esta:

1. O PR entra na main.
2. Os outros worktrees juntam a main.
3. O dono aplica a migração no cloud e zera o banco no mesmo momento.

A migração não tem guarda nem opt-in, porque os dados são de teste.

## Depois da decisão

Nota de 18 de outubro de 2026. A decisão continua valendo, e o texto acima fica como foi aceito.

- Os três itens de "Fica para os próximos PRs" entraram na main: descrição, tópicos e categoria no #66 e no #71, a página do curso no #66, e o questionário com o certificado no #76 e no #77.
- A "prova" do texto virou o questionário por aula. Não existe prova final: o curso com todas as aulas assistidas e algum questionário sem aprovação tem o estado `questionarios`, e a retomada leva a ele antes do primeiro curso não iniciado.
- A ordem de aplicação foi cumprida em 16 de outubro de 2026. Zerar o banco cloud segue com o dono.
