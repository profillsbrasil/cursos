# Reviewer B (sonnet high), resumo gravado ao chegar
1. warning: migracao.integration.test só planta linhas de trilha; nenhum lançamento sobrevivente (aula_assistida, curso_concluido, sequencia_7_dias, troca) nem liberação de troca; USING e checks só rodam com tabela vazia; sumiu asserção "liberação de trilha vira admin" no teste de origem_da_liberacao.
2. warning: DELETE sem guarda; ADR põe "zerar" depois de migrar; origin/main remoto avançou 6d18291..aa1834a, reconferir timestamp da migração.
3. warning: LiberacaoAtiva.origem morto (dominio/liberacao.ts:28-32, consultas/liberacao.ts:62); decidirLiberar/liberacoesAtivas pode virar select por (user,curso); montarAcesso O(n·m).
4. warning: alcance (curso.ts:93-104) com dedup inalcançável; testes de estado impossível (curso.test.ts:82, painel.test.ts); CLAUDE.md/comentário dizem que tela de acesso chama alcance (não chama).
5. warning: parâmetros de um valor só: problemas.ts fraseDeReserva oQue, barra-de-salvar/aviso-de-versao-mudou oQue, corrida-de-teste seguraATabela, use-rascunho-apoiado genérico.
6. nit: seed tema = título em Fábrica; nenhum curso em_producao no seed; capas operacao.jpg/calibracao.jpg órfãs.
7. nit: loading.test not.toContain("380px") histórico; "liberados para você" duas vezes em conteudo.tsx.
8. nit: sem índice liberacao(curso_id).
