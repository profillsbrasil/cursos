import { videoDoTexto } from "@cursos/api/dominio/video";

import { plural } from "@/lib/formato";

import type { RascunhoDoCurso } from "./rascunho-do-curso";

/** Um item de "Antes de publicar": só informa, nenhum impede o Salvar. */
export interface ItemAntesDePublicar {
  cumprido: boolean;
  detalhe: string | null;
  nome: string;
}

type Lido = Pick<
  RascunhoDoCurso,
  "categoriaId" | "descricao" | "modulos" | "titulo"
>;

/** `temCapa`: a capa salva ou a escolhida agora, que mora fora do rascunho. */
export function antesDePublicar(
  rascunho: Lido,
  temCapa: boolean
): ItemAntesDePublicar[] {
  const aulas = rascunho.modulos.flatMap((m) => m.aulas);
  const comVideo = aulas.filter((a) => videoDoTexto(a.video) !== null).length;
  const semQuestionario = aulas.filter((a) => a.perguntas.length === 0).length;
  return [
    { cumprido: temCapa, detalhe: null, nome: "Capa" },
    {
      cumprido:
        rascunho.titulo.trim() !== "" && rascunho.categoriaId.length > 0,
      detalhe: null,
      nome: "Título e categoria",
    },
    {
      cumprido: rascunho.descricao.trim() !== "",
      detalhe: null,
      nome: "Descrição",
    },
    {
      cumprido: aulas.length > 0 && comVideo === aulas.length,
      detalhe:
        aulas.length === 0
          ? "Nenhuma aula ainda."
          : `${comVideo} de ${aulas.length}`,
      nome: "Aulas com vídeo",
    },
    {
      cumprido: aulas.length > 0 && semQuestionario === 0,
      detalhe:
        semQuestionario === 0
          ? null
          : `${plural(semQuestionario, "aula sem questionário", "aulas sem questionário")}. Não impede publicar.`,
      nome: "Questionários",
    },
  ];
}

export interface SecaoDoIndice {
  contagem: number | null;
  /** O id do título da seção, alvo da âncora. */
  id: string;
  nome: string;
}

export function secoesDoEditor(
  rascunho: Pick<RascunhoDoCurso, "modulos" | "niveis" | "topicos">,
  novo: boolean
): SecaoDoIndice[] {
  const secoes: SecaoDoIndice[] = [
    { contagem: null, id: "vitrine", nome: "Vitrine" },
    {
      contagem: rascunho.topicos.length,
      id: "topicos",
      nome: "O que você vai aprender",
    },
    { contagem: null, id: "publicacao", nome: "Publicação" },
    { contagem: rascunho.niveis.length, id: "niveis", nome: "Níveis" },
    {
      contagem: rascunho.modulos.length,
      id: "modulos",
      nome: "Módulos e aulas",
    },
  ];
  return novo
    ? secoes
    : [...secoes, { contagem: null, id: "apagar", nome: "Apagar" }];
}
