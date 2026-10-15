# Reviewer A (opus high), resumo gravado ao chegar
Migração correta na ordem; sem critical. bun test src/dominio: 213 pass.
1. warning: alcance = dedup+map, dedup inalcançável (índice único parcial); 2 testes de estado impossível; CLAUDE.md:33 diz que tela de acesso chama alcance (falso); CursoNaTela == CursoAlcancado.
2. warning: liberar mantém máquina da trilha (liberacoesAtivas, LiberacaoAtiva.origem morto, decidirLiberar); trocar por findFirst no lock; montarAcesso Set.
3. warning: teste da migração não passa linha sobrevivente pelo enum recriado nem pelos checks restaurados.
4. warning: aplicar no cloud compartilhado quebra main e worktrees abertos (ajustes-admin, ajuste-sidebar); ordem no ADR/PR.
5. warning: use-rascunho-apoiado RegrasDoRascunho.mudar(base) vestigial; CLAUDE.md:25 "a regra de cada editor recebe a base".
6. nit: LinhaParaLiberar/Para/useLiberar um chamador; fraseDeReserva oQue; CapaCurso sizes sempre igual.
7. nit: NumerosDaPessoa.liberacoes repete cursos na frase da busca.
8. nit: seed sem em_producao; capas operacao.jpg/calibracao.jpg órfãs.
9. nit: fixture de origem_da_liberacao planta trilha que não prova nada.
10. nit: "liberados para você" repetido em Meus cursos.
