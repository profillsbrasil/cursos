Rascunho. Este PR leva o curso para o formato da Udemy: descrição, tópicos, categoria mantida pelo admin, endereço gerado a partir do título, descrição da aula e a página do curso para o aluno. As decisões e o plano ficam em #65 e em `docs/specs/curso-formato-udemy/README.md`.

A branch parte da ponta de #64 (catálogo sem trilha). Por isso, o diff deste PR mostra também os commits de #64 até ele entrar na main.

## O que já está pronto

- **Migração `formato_udemy`.** `curso.tema` vira `categoria`, e entram `curso.descricao`, `curso.topicos` e `aula.descricao`, com checks de tamanho.
- **Migração `categoria`.** Cria a tabela `categoria`, liga o curso a ela por `categoria_id` com FK `restrict` e traz o router `admin.categorias.{lista, salvar, apagar}`. Categoria em uso não se apaga.
- **Endereço automático.** O servidor gera o slug a partir do título no primeiro salvamento, acrescenta `-2` ou `-3` quando ele já existe e não o muda depois. O editor perde o campo "Endereço", e o motivo `slug_repetido` sai do contrato.
- **`curso.pagina({ slug })`.** Entrega o view model da página do curso, com os níveis, e abre nos mesmos casos que `aula.entrada`.
- **Editor.** O campo de categoria vira select, e o link aparece como texto.

As verificações rodaram em `01f171e`, com `--force` e o Supabase local:
- `check-types` passou nas 4 tarefas;
- `ultracite` checou 408 arquivos sem ajuste;
- os testes passaram com ui 32, db 78, web 371 e api 363, nenhum falhando.

## O que falta

- A página do curso e a tela de categorias, que seguem os protótipos aprovados em #65.
- O editor, com a Vitrine, os tópicos, as aulas e a descrição da aula. Ele espera o dono aprovar o refino do protótipo.
- A prova no browser.

## Banco cloud

Este PR tem duas migrações, `formato_udemy` e `categoria`. Elas vão para o cloud depois da `catalogo_sem_trilha`, na ordem descrita em #65.
