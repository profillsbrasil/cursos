import { PRECO_PARA_PUBLICAR } from "@cursos/api/dominio/limites-do-curso";
import { videoDoTexto } from "@cursos/api/dominio/video";

import { fmtHoras, plural } from "@/lib/formato";

import {
  lerPreco,
  type RascunhoDoCurso,
  segundosDas,
} from "./rascunho-do-curso";

/**
 * Um item de "Antes de publicar": só informa, nenhum impede o Salvar. O Preço
 * de troca é o único que o servidor exige para publicar; o curso sem preço
 * salva em produção.
 */
export interface ItemAntesDePublicar {
  cumprido: boolean;
  detalhe: string | null;
  nome: string;
}

type Lido = Pick<
  RascunhoDoCurso,
  "categoriaId" | "descricao" | "modulos" | "precoTroca" | "titulo"
>;

/** `temCapa`: a capa salva ou a escolhida agora, que mora fora do rascunho. */
export function antesDePublicar(
  rascunho: Lido,
  temCapa: boolean
): ItemAntesDePublicar[] {
  const aulas = rascunho.modulos.flatMap((m) => m.aulas);
  const comVideo = aulas.filter((a) => videoDoTexto(a.video) !== null).length;
  const semQuestionario = aulas.filter((a) => a.perguntas.length === 0).length;
  const temPreco =
    rascunho.precoTroca !== null && "valor" in lerPreco(rascunho.precoTroca);
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
      cumprido: temPreco,
      detalhe: temPreco ? null : PRECO_PARA_PUBLICAR,
      nome: "Preço de troca",
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

/** "3 módulos, 14 aulas, 2 h", no alto do índice; sem vídeo, sem a duração. */
export function resumoDoCurso(
  rascunho: Pick<RascunhoDoCurso, "modulos">
): string {
  const aulas = rascunho.modulos.reduce((s, m) => s + m.aulas.length, 0);
  const duracao = rascunho.modulos.reduce(
    (s, m) => s + segundosDas(m.aulas),
    0
  );
  return [
    plural(rascunho.modulos.length, "módulo", "módulos"),
    plural(aulas, "aula", "aulas"),
    ...(duracao > 0 ? [fmtHoras(duracao)] : []),
  ].join(", ");
}

export interface SecaoDoIndice {
  contagem: number | null;
  /** O id do título da seção, alvo da âncora. */
  id: string;
  nome: string;
}

export function secoesDoEditor(
  rascunho: Pick<
    RascunhoDoCurso,
    "materiais" | "modulos" | "niveis" | "topicos"
  >,
  novo: boolean
): SecaoDoIndice[] {
  const secoes: SecaoDoIndice[] = [
    { contagem: null, id: "capa-e-descricao", nome: "Capa e descrição" },
    {
      contagem: rascunho.topicos.length,
      id: "topicos",
      nome: "O que você vai aprender",
    },
    {
      contagem: rascunho.materiais.length,
      id: "material",
      nome: "Material de apoio",
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
