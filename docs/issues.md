# Issues e wayfinding

As issues ficam no GitHub Issues de `profillsbrasil/cursos`. O `gh` dentro do clone já infere o repo.

## Comandos

- Criar: `gh issue create --title "..." --body "..."` (heredoc para corpo de várias linhas).
- Ler: `gh issue view <n> --comments`.
- Listar: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, com `--label` e `--state` conforme o caso.
- Comentar: `gh issue comment <n> --body "..."`.
- Labels: `gh issue edit <n> --add-label "..."` / `--remove-label "..."`.
- Fechar: `gh issue close <n> --comment "..."`.

## Wayfinding (`/wayfinder`)

O **mapa** é uma issue com label `wayfinder:map` e corpo Notes / Decisions-so-far / Fog. Cada ticket filho é sub-issue do mapa (`gh api` no endpoint de sub-issues), ou, sem sub-issues, entra na task list do mapa com `Part of #<mapa>` no topo; label `wayfinder:<research|prototype|grilling|task>`. Bloqueio usa as dependências nativas: `gh api --method POST repos/profillsbrasil/cursos/issues/<filho>/dependencies/blocked_by -F issue_id=<id do bloqueador>`, onde o id é o database id (`gh api repos/profillsbrasil/cursos/issues/<n> --jq .id`); sem dependências, uma linha `Blocked by: #<n>` no topo. Fronteira: filhos abertos do mapa, sem bloqueador aberto e sem assignee, na ordem do mapa. Assumir: `gh issue edit <n> --add-assignee @me`. Resolver: comentar a resposta, fechar e anexar um ponteiro (resumo + link) em Decisions-so-far do mapa.
