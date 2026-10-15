O catálogo passa a ter só cursos no formato da Udemy, sem trilha e sem curso solto. Cada curso tem banner, título, descrição, tópicos e categoria. Ele se divide em módulos, e cada aula tem vídeo, descrição e questionário. Este issue guarda as decisões tomadas e o que falta, para retomar o trabalho depois.

O registro completo, com as imagens dos protótipos aprovados e as provas no app, está em [`docs/specs/curso-formato-udemy/README.md`](https://github.com/profillsbrasil/cursos/blob/feat/curso-formato-udemy/docs/specs/curso-formato-udemy/README.md), na branch `feat/curso-formato-udemy`.

## Decisões

- O nome é "Curso". A trilha e o curso solto deixam de existir.
- O curso tem módulos como seções, e uma aula pertence a um único curso.
- Os dados do banco cloud de hoje são de teste. O banco vai ser zerado, sem migração de dados.
- O endereço do curso é gerado a partir do título no primeiro salvamento e não muda depois. O editor não tem campo de endereço.
- A categoria é mantida pelo admin numa tela própria, no menu do admin, e escolhida por select no editor. Categoria em uso não se apaga.
- O questionário é de múltipla escolha, com de 2 a 5 alternativas e uma certa. A nota mínima é 70%, com nova tentativa, e os 5 pontos por acerto valem só na primeira.
- O curso está concluído com todas as aulas assistidas e todos os questionários aprovados. Aí sai o certificado.

## Interface aprovada

| Tela | Versão |
|---|---|
| Página do curso | Rodada 2, A: cartão preso à direita e conteúdo em sanfona com índice de livro no módulo aberto |
| Categorias | Rodada 2, A: item próprio no menu do admin |
| Editor | Vitrine da rodada 1, C, mais as aulas com questionário da rodada 2, C. Falta aprovar o refino pelo `/impeccable`. |

![Página do curso](https://github.com/profillsbrasil/cursos/blob/feat/curso-formato-udemy/docs/specs/curso-formato-udemy/prototipo-pagina-do-curso.png?raw=true)
![Editor com o questionário](https://github.com/profillsbrasil/cursos/blob/feat/curso-formato-udemy/docs/specs/curso-formato-udemy/prototipo-editor-questionario.png?raw=true)
![Categorias](https://github.com/profillsbrasil/cursos/blob/feat/curso-formato-udemy/docs/specs/curso-formato-udemy/prototipo-categorias.png?raw=true)

## Entregas

- [x] Tirar a trilha do catálogo: #64, que espera o merge.
- [x] Dados do curso no formato Udemy: categoria em tabela, descrição, tópicos, descrição da aula, endereço automático, `curso.pagina` e `admin.categorias` (branch `feat/curso-formato-udemy`).
- [ ] Página do curso e tela de categorias. Na mesma branch, o view model com os níveis já está pronto, e a tela não. Os próximos passos, arquivo por arquivo, estão no README.
- [ ] Editor do curso: Vitrine, tópicos e aulas, depois de aprovado o refino.
- [ ] Questionário, conclusão e certificado (PR seguinte).
- [ ] Banco cloud, nesta ordem:
  1. merge do #64 e deste trabalho;
  2. os worktrees abertos juntam a main;
  3. aplicar `catalogo_sem_trilha`, `formato_udemy` e `categoria` e zerar o banco no mesmo momento.
