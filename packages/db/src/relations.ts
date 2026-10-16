import { defineRelations } from "drizzle-orm";

// biome-ignore lint/performance/noNamespaceImport: defineRelations needs every table in the schema module
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  aula: {
    perguntas: r.many.pergunta({ from: r.aula.id, to: r.pergunta.aulaId }),
  },
  categoria: {
    cursos: r.many.curso({ from: r.categoria.id, to: r.curso.categoriaId }),
  },
  curso: {
    categoria: r.one.categoria({
      from: r.curso.categoriaId,
      optional: false,
      to: r.categoria.id,
    }),
    liberacoes: r.many.liberacao({ from: r.curso.id, to: r.liberacao.cursoId }),
    modulos: r.many.modulo({ from: r.curso.id, to: r.modulo.cursoId }),
    niveis: r.many.nivel({ from: r.curso.id, to: r.nivel.cursoId }),
  },
  liberacao: {
    curso: r.one.curso({
      from: r.liberacao.cursoId,
      optional: false,
      to: r.curso.id,
    }),
    trocaLancamento: r.one.pontoLancamento({
      from: [r.liberacao.userId, r.liberacao.id],
      to: [r.pontoLancamento.userId, r.pontoLancamento.liberacaoId],
    }),
  },
  modulo: {
    aulas: r.many.aula({ from: r.modulo.id, to: r.aula.moduloId }),
  },
  pergunta: {
    alternativas: r.many.alternativa({
      from: r.pergunta.id,
      to: r.alternativa.perguntaId,
    }),
  },
  pontoLancamento: {
    aula: r.one.aula({ from: r.pontoLancamento.aulaId, to: r.aula.id }),
    curso: r.one.curso({ from: r.pontoLancamento.cursoId, to: r.curso.id }),
    liberacao: r.one.liberacao({
      from: [r.pontoLancamento.userId, r.pontoLancamento.liberacaoId],
      to: [r.liberacao.userId, r.liberacao.id],
    }),
  },
}));
