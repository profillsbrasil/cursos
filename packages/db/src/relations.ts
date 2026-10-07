import { defineRelations } from "drizzle-orm";

// biome-ignore lint/performance/noNamespaceImport: defineRelations needs every table in the schema module
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  curso: {
    liberacoes: r.many.liberacao({ from: r.curso.id, to: r.liberacao.cursoId }),
    modulos: r.many.modulo({ from: r.curso.id, to: r.modulo.cursoId }),
    naTrilha: r.one.trilhaCurso({
      from: r.curso.id,
      to: r.trilhaCurso.cursoId,
    }),
    niveis: r.many.nivel({ from: r.curso.id, to: r.nivel.cursoId }),
  },
  liberacao: {
    curso: r.one.curso({ from: r.liberacao.cursoId, to: r.curso.id }),
    trilha: r.one.trilha({ from: r.liberacao.trilhaId, to: r.trilha.id }),
    trocaLancamento: r.one.pontoLancamento({
      from: [r.liberacao.userId, r.liberacao.id],
      to: [r.pontoLancamento.userId, r.pontoLancamento.liberacaoId],
    }),
  },
  modulo: {
    aulas: r.many.aula({ from: r.modulo.id, to: r.aula.moduloId }),
  },
  pontoLancamento: {
    aula: r.one.aula({ from: r.pontoLancamento.aulaId, to: r.aula.id }),
    curso: r.one.curso({ from: r.pontoLancamento.cursoId, to: r.curso.id }),
    liberacao: r.one.liberacao({
      from: [r.pontoLancamento.userId, r.pontoLancamento.liberacaoId],
      to: [r.liberacao.userId, r.liberacao.id],
    }),
    trilha: r.one.trilha({
      from: r.pontoLancamento.trilhaId,
      to: r.trilha.id,
    }),
  },
  trilha: {
    cursos: r.many.trilhaCurso({
      from: r.trilha.id,
      to: r.trilhaCurso.trilhaId,
    }),
    liberacoes: r.many.liberacao({
      from: r.trilha.id,
      to: r.liberacao.trilhaId,
    }),
  },
  trilhaCurso: {
    curso: r.one.curso({
      from: r.trilhaCurso.cursoId,
      optional: false,
      to: r.curso.id,
    }),
    trilha: r.one.trilha({
      from: r.trilhaCurso.trilhaId,
      optional: false,
      to: r.trilha.id,
    }),
  },
}));
