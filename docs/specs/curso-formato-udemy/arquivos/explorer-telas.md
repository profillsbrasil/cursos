# Explorer telas (apps/web/src), resumo gravado ao chegar
- Rota do player: /cursos/<slugDoCurso>/aulas/<aulaId> (lib/rotas.ts:4-11). /cursos/[slug]/page.tsx:29-35 só mostra "A prova chega no próximo PR".
- Somem: Cursos rápidos (conteudo.tsx:95-102, cabeçalho 14-23), editor de curso separado (catalogo/cursos/**), cursos-da-trilha.tsx, capas numeradas e "Abre depois de" (trilha.tsx), liberar curso e pelaTrilha/trocadosNaTrilha (acesso-do-aluno.tsx), Trocar pontos preso a Cartao["curso"] (cursos-para-trocar.tsx:15).
- Se fundem: editor-da-trilha + editor-do-curso; base = editor-do-curso (capa, modulos-do-curso, rascunho, estado-do-editor). use-rascunho-apoiado/abrir-ou-rascunho sobrevivem.
- Mudam pouco: player (slug vira o da trilha; coluna-do-curso:96, migalha-da-aula:39, cabecalho-da-aula:23 usam Módulo N). Falta tela de detalhe Udemy (não existe).
- Questionário/prova: nada implementado. PRODUCT.md:41,44 prevê quiz por aula (5 pts) e prova (50 pts).
- Testes que travam: conteudo.test.tsx, loading.test.tsx, vitrine-sem-troca/saldo-de-troca/extrato.test.tsx, sua-semana.test.tsx, modulos-do-curso(.medida).test.tsx, estado-do-editor.test.ts, editor-da-trilha.test.tsx, estado-da-trilha.test.ts, visao-do-catalogo.test.tsx, acompanhamento.test.ts, lib/editor.test.ts, continuar.test.ts, cartao-continuar.test.tsx, coluna-do-curso.medida.test.tsx, cabecalho-da-aula.test.tsx, player-da-aula.test.tsx, casca.test.ts.
- Docs: GLOSSARY.md (8, 31-32, 47, 50, 52, 54), PRODUCT.md:31,41,44,54-55, CLAUDE.md seções (aluno)/(admin). docs/adr não existe.
