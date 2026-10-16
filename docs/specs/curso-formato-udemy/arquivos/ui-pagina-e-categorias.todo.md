# Feature: página do curso e categorias

- [x] 1. `how` over the affected subsystem. (lido à mão: pagina-do-curso.ts, api.ts, capa-curso, migalha, comunicados, categoria)
- [x] 2. `architect` for parallel design exploration. skip: protótipo aprovado fixa a forma; sou delegado sem fan-out
- [x] 3. Throughput checkpoint
  - Blocking first steps: VM com níveis e lista com nomes de cursos (api) antes da web
  - Independent workstreams: n/a, um dono só (delegado sem spawn)
  - Shared mutable state: n/a, worktree exclusivo
  - Smallest safe decomposition: um worker; commits api → página → categorias → docs
- [ ] 4. Delegate code-writing. skip: delegado proibido de spawn, dono do diff
- [ ] 5. Verify on the matching surface (browser 3006, 1280 e <1081)
- [ ] 6. Small ordered commits with push
- [ ] 7. interrogate: skip, revisão é da sessão principal
- [ ] 8. Opening a PR: skip, brief proíbe PR

## Tarefas
- [ ] api: PaginaDoCurso com níveis e próximo nível
- [ ] api: categorias.lista com os títulos dos cursos
- [ ] web: useAcao entrega a mensagem da recusa
- [ ] web: página /cursos/[slug] + loading + testes
- [ ] web: /admin/categorias + menu + loading + testes
- [ ] docs: CLAUDE.md, DESIGN.md, GLOSSARY
- [ ] três verificações --force
- [ ] prova no browser + screenshots
- [ ] relatório
