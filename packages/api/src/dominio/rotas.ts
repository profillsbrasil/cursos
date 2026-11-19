/**
 * Os endereços do aluno que o servidor devolve prontos. apps/web/src/lib/rotas.ts
 * os tipa como Route; nenhum outro lugar monta "/cursos/..." nem "/material/...".
 */
export type CaminhoDoCurso = `/cursos/${string}`;

export type CaminhoDaAula = `${CaminhoDoCurso}/aulas/${string}`;

export type CaminhoDoQuestionario = `${CaminhoDaAula}#questionario`;

export type CaminhoDoCertificado = `${CaminhoDoCurso}/certificado`;

export type CaminhoDaConferencia = `/certificado/${string}`;

export type CaminhoDoMaterial = `/material/${string}`;

export const caminhoDoCurso = (slug: string): CaminhoDoCurso =>
  `/cursos/${slug}`;

export const caminhoDaAula = (slug: string, aulaId: string): CaminhoDaAula =>
  `${caminhoDoCurso(slug)}/aulas/${aulaId}`;

/** O questionário mora na página da aula, depois do vídeo: a âncora rola até ele. */
export const caminhoDoQuestionario = (
  slug: string,
  aulaId: string
): CaminhoDoQuestionario => `${caminhoDaAula(slug, aulaId)}#questionario`;

export const caminhoDoCertificado = (slug: string): CaminhoDoCertificado =>
  `${caminhoDoCurso(slug)}/certificado`;

export const caminhoDaConferencia = (codigo: string): CaminhoDaConferencia =>
  `/certificado/${codigo}`;

/** O download de um arquivo do material de apoio, pela rota app/material/[id]. */
export const caminhoDoMaterial = (id: string): CaminhoDoMaterial =>
  `/material/${id}`;
