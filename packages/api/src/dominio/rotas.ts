// Os endereços do aluno que o servidor devolve prontos. apps/web/src/lib/rotas.ts
// os tipa como Route; nenhum outro lugar monta "/cursos/...".

export const caminhoDoCurso = (slug: string) => `/cursos/${slug}`;

export const caminhoDaAula = (slug: string, aulaId: string) =>
  `${caminhoDoCurso(slug)}/aulas/${aulaId}`;

/** O questionário mora na página da aula, depois do vídeo: a âncora rola até ele. */
export const caminhoDoQuestionario = (slug: string, aulaId: string) =>
  `${caminhoDaAula(slug, aulaId)}#questionario`;

export const caminhoDoCertificado = (slug: string) =>
  `${caminhoDoCurso(slug)}/certificado`;

export const caminhoDaConferencia = (codigo: string) =>
  `/certificado/${codigo}`;
