// Os endereços do aluno que o servidor devolve prontos. apps/web/src/lib/rotas.ts
// os tipa como Route; nenhum outro lugar monta "/cursos/...".

export const caminhoDoCurso = (slug: string) => `/cursos/${slug}`;

export const caminhoDaAula = (slug: string, aulaId: string) =>
  `${caminhoDoCurso(slug)}/aulas/${aulaId}`;
