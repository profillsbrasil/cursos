import type { Retomada } from "@cursos/api/dominio/painel";
import {
  type CaminhoDaAula,
  type CaminhoDaConferencia,
  type CaminhoDoCertificado,
  type CaminhoDoCurso,
  type CaminhoDoQuestionario,
  caminhoDaAula as aula,
  caminhoDoCertificado as certificado,
  caminhoDaConferencia as conferencia,
  caminhoDoCurso as curso,
  caminhoDoQuestionario as questionario,
} from "@cursos/api/dominio/rotas";
import type { Route } from "next";

/**
 * Devolve o próprio href, conferido pelo typedRoutes: o Next infere T do
 * template literal e o compara com as rotas dinâmicas do app. Com T = string,
 * Route só aceita rota estática.
 */
export const rota = <T extends string>(href: Route<T>): Route<T> => href;

/**
 * O href que uma prop guarda: uma rota estática ou um dos caminhos dinâmicos
 * que o app monta. Route sozinho aceita só a estática.
 */
export type Endereco =
  | Route
  | Route<CaminhoDoCurso>
  | Route<CaminhoDaAula>
  | Route<CaminhoDoQuestionario>
  | Route<CaminhoDoCertificado>
  | Route<CaminhoDaConferencia>;

export const caminhoDoCurso = (slug: string) => rota(curso(slug));

export const caminhoDaAula = (slug: string, aulaId: string) =>
  rota(aula(slug, aulaId));

export const caminhoDoQuestionario = (slug: string, aulaId: string) =>
  rota(questionario(slug, aulaId));

/** Para onde a retomada leva: a aula, ou o questionário dela quando só ele falta. O banner e o cartão do rodapé usam a mesma regra. */
export const hrefDaRetomada = (r: Retomada): Endereco =>
  r.tipo === "questionario"
    ? caminhoDoQuestionario(r.curso.slug, r.aula.id)
    : caminhoDaAula(r.curso.slug, r.aula.id);

export const caminhoDoCertificado = (slug: string) => rota(certificado(slug));

export const caminhoDaConferencia = (codigo: string) =>
  rota(conferencia(codigo));

/** O login e o cadastro do Clerk moram no app, e não no Account Portal. */
export const ENTRAR = "/entrar";
export const CRIAR_CONTA = "/criar-conta";

export const MINHA_CONTA = "/minha-conta" as Route;
