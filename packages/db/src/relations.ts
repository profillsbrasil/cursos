import { defineRelations } from "drizzle-orm";

// biome-ignore lint/performance/noNamespaceImport: defineRelations needs every table in the schema module
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  curso: {
    modulos: r.many.modulo({ from: r.curso.id, to: r.modulo.cursoId }),
    niveis: r.many.nivel({ from: r.curso.id, to: r.nivel.cursoId }),
  },
  liberacao: {
    curso: r.one.curso({ from: r.liberacao.cursoId, to: r.curso.id }),
    trilha: r.one.trilha({ from: r.liberacao.trilhaId, to: r.trilha.id }),
  },
  modulo: {
    aulas: r.many.aula({ from: r.modulo.id, to: r.aula.moduloId }),
  },
  trilha: {
    cursos: r.many.trilhaCurso({
      from: r.trilha.id,
      to: r.trilhaCurso.trilhaId,
    }),
  },
  trilhaCurso: {
    curso: r.one.curso({
      from: r.trilhaCurso.cursoId,
      optional: false,
      to: r.curso.id,
    }),
  },
}));
