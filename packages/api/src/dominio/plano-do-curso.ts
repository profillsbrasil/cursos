// O que um salvamento do curso faz, decidido sem banco. Só o servidor importa este
// arquivo (versao.ts usa node:crypto). O único escritor do plano é gravarCurso, em
// consultas/edicao-do-curso.ts.

import type { ImagemDaCapa } from "./capa";
import type { DocumentoDoCurso, EdicaoDoCurso } from "./edicao-do-curso";
import type { AulaId, ModuloId, Versao } from "./tipos";
import { versaoDe } from "./versao";

/** A capa entra na versão: duas trocas de capa concorrentes dão CONFLICT. */
export function versaoDoCurso(
  documento: DocumentoDoCurso,
  capaUrl: string | null
): Versao {
  const { versao: _, ...conteudo } = documento;
  return versaoDe({ ...conteudo, capaUrl });
}

export type RecusaDaEdicao =
  | { tipo: "versao_mudou" }
  | { tipo: "sumiu" }
  | { tipo: "sem_capa" }
  | { tipo: "aula_assistida"; titulo: string; alunos: number };

export interface Apagar {
  aulas: readonly AulaId[];
  modulos: readonly ModuloId[];
  niveis: readonly number[];
}

/** `versao` é a do estado depois do salvamento, a que abrirCurso vai ler. */
export type Plano =
  | { tipo: "nada_mudou"; versao: Versao }
  | { tipo: "recusa"; recusa: RecusaDaEdicao }
  | {
      tipo: "criar";
      capa: ImagemDaCapa;
      documento: DocumentoDoCurso;
      versao: Versao;
    }
  | {
      tipo: "atualizar";
      apagar: Apagar;
      /** null: a capa do banco fica. */
      capa: ImagemDaCapa | null;
      documento: DocumentoDoCurso;
      versao: Versao;
    };

export type PlanoDeGravacao = Extract<Plano, { tipo: "criar" | "atualizar" }>;

const recusa = (r: RecusaDaEdicao): Plano => ({ recusa: r, tipo: "recusa" });

const idsDosModulos = (d: DocumentoDoCurso) => d.modulos.map((m) => m.id);
const idsDasAulas = (d: DocumentoDoCurso) =>
  d.modulos.flatMap((m) => m.aulas.map((a) => a.id));
const fora = <T>(lista: readonly T[], de: readonly T[]) => {
  const conjunto = new Set(de);
  return lista.filter((x) => !conjunto.has(x));
};

/**
 * `atual` é o que abrirCurso leu com o curso travado; `capaRecebida`, a capa que
 * subiu com este pedido. O plano descreve o estado final. Aqui só se decide o que
 * some e se pode sumir. Aula que muda de módulo mantém o id, então mantém
 * assistidas e posição do aluno.
 */
export function planejarCurso(
  atual: EdicaoDoCurso | null,
  desejado: DocumentoDoCurso,
  capaRecebida: ImagemDaCapa | null
): Plano {
  if (atual === null) {
    if (desejado.versao !== null) {
      return recusa({ tipo: "sumiu" });
    }
    if (!capaRecebida) {
      return recusa({ tipo: "sem_capa" });
    }
    return {
      capa: capaRecebida,
      documento: desejado,
      tipo: "criar",
      versao: versaoDoCurso(desejado, capaRecebida.url),
    };
  }
  const capa =
    capaRecebida && capaRecebida.url !== atual.capa?.url ? capaRecebida : null;
  const versao = versaoDoCurso(desejado, capa?.url ?? atual.capa?.url ?? null);
  // Antes da versão: duplo clique e reenvio depois de resposta perdida, inclusive
  // da criação, são sucesso.
  if (versao === atual.documento.versao) {
    return { tipo: "nada_mudou", versao };
  }
  if (desejado.versao !== atual.documento.versao) {
    return recusa({ tipo: "versao_mudou" });
  }
  const aulasQueSaem = fora(
    idsDasAulas(atual.documento),
    idsDasAulas(desejado)
  );
  for (const id of aulasQueSaem) {
    const alunos = atual.uso.assistidasPorAula[id] ?? 0;
    if (alunos > 0) {
      const titulo =
        atual.documento.modulos.flatMap((m) => m.aulas).find((a) => a.id === id)
          ?.titulo ?? id;
      return recusa({ alunos, tipo: "aula_assistida", titulo });
    }
  }
  return {
    apagar: {
      aulas: aulasQueSaem,
      modulos: fora(idsDosModulos(atual.documento), idsDosModulos(desejado)),
      niveis: fora(
        atual.documento.niveis.map((n) => n.ordem),
        desejado.niveis.map((n) => n.ordem)
      ),
    },
    capa,
    documento: desejado,
    tipo: "atualizar",
    versao,
  };
}
