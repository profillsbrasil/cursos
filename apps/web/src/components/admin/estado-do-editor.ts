// As mudanças que o editor do curso faz no documento, sem React e sem rede. O
// servidor confere tudo de novo no salvamento; aqui fica só o que a tela mostra.

import type {
  AulaDoDocumento,
  DocumentoDoCurso,
  ModuloDoDocumento,
} from "@cursos/api/dominio/edicao-do-curso";
import type { AulaId, ModuloId } from "@cursos/api/dominio/tipos";

type CampoDoCurso = Exclude<
  keyof DocumentoDoCurso,
  "id" | "modulos" | "niveis" | "versao"
>;

export type Direcao = "acima" | "abaixo";

export type Edicao =
  | { tipo: "campos"; mudanca: Partial<Pick<DocumentoDoCurso, CampoDoCurso>> }
  | { tipo: "nivel_novo"; nome: string }
  | { tipo: "nivel_renomeado"; ordem: number; nome: string }
  | { tipo: "nivel_removido"; ordem: number }
  | { tipo: "modulo_novo"; id: ModuloId }
  | {
      tipo: "modulo_editado";
      id: ModuloId;
      mudanca: Partial<
        Pick<ModuloDoDocumento, "nivelOrdem" | "numero" | "titulo">
      >;
    }
  /** Põe os módulos na ordem do número, quando o admin termina de digitar um. */
  | { tipo: "modulos_ordenados" }
  | { tipo: "modulo_movido"; id: ModuloId; direcao: Direcao }
  | { tipo: "modulo_removido"; id: ModuloId }
  | { tipo: "aula_nova"; moduloId: ModuloId; id: AulaId }
  | {
      tipo: "aula_editada";
      id: AulaId;
      mudanca: Partial<Omit<AulaDoDocumento, "id">>;
    }
  | { tipo: "aula_movida"; id: AulaId; direcao: Direcao }
  | { tipo: "aula_para_modulo"; id: AulaId; moduloId: ModuloId }
  | { tipo: "aula_removida"; id: AulaId };

const maior = (valores: readonly number[], vazio: number) =>
  valores.length === 0 ? vazio : Math.max(...valores);

/** Troca o item i com o vizinho; fora dos limites devolve null. */
function trocado<T>(lista: readonly T[], i: number, direcao: Direcao) {
  const j = direcao === "acima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) {
    return null;
  }
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j] as T, nova[i] as T];
  return nova;
}

/** A ordem que o aluno vê é a do número; o sort é estável para números repetidos. */
const porNumero = (modulos: ModuloDoDocumento[]) =>
  modulos.toSorted((a, b) => a.numero - b.numero);

const comAulas = (
  doc: DocumentoDoCurso,
  moduloId: ModuloId,
  mudar: (aulas: AulaDoDocumento[]) => AulaDoDocumento[] | null
): DocumentoDoCurso => {
  let mudou = false;
  const modulos = doc.modulos.map((m) => {
    if (m.id !== moduloId) {
      return m;
    }
    const aulas = mudar(m.aulas);
    if (aulas === null) {
      return m;
    }
    mudou = true;
    return { ...m, aulas };
  });
  return mudou ? { ...doc, modulos } : doc;
};

const moduloDaAula = (doc: DocumentoDoCurso, id: AulaId) =>
  doc.modulos.find((m) => m.aulas.some((a) => a.id === id));

/**
 * Regras:
 *  - o módulo novo recebe o maior número mais 1 (1 no curso vazio); mudar o
 *    número não move o módulo enquanto o admin digita, e modulos_ordenados
 *    põe a lista na ordem do número;
 *  - subir ou descer um módulo troca o lugar e o número com o vizinho;
 *  - o nível novo recebe a maior ordem mais 1; remover um nível deixa sem nível
 *    os módulos que o usavam;
 *  - a posição da aula é o índice: subir e descer trocam com a vizinha do mesmo
 *    módulo, e a aula que muda de módulo vai para o fim do outro;
 *  - mudança impossível (topo, fim, id que não existe) devolve o mesmo documento.
 */
export function editar(doc: DocumentoDoCurso, e: Edicao): DocumentoDoCurso {
  switch (e.tipo) {
    case "campos":
      return { ...doc, ...e.mudanca };
    case "nivel_novo": {
      const ordem = maior(
        doc.niveis.map((n) => n.ordem),
        0
      );
      return {
        ...doc,
        niveis: [...doc.niveis, { nome: e.nome, ordem: ordem + 1 }],
      };
    }
    case "nivel_renomeado":
      return {
        ...doc,
        niveis: doc.niveis.map((n) =>
          n.ordem === e.ordem ? { ...n, nome: e.nome } : n
        ),
      };
    case "nivel_removido":
      return {
        ...doc,
        modulos: doc.modulos.map((m) =>
          m.nivelOrdem === e.ordem ? { ...m, nivelOrdem: null } : m
        ),
        niveis: doc.niveis.filter((n) => n.ordem !== e.ordem),
      };
    case "modulo_novo": {
      const numero = maior(
        doc.modulos.map((m) => m.numero),
        0
      );
      return {
        ...doc,
        modulos: [
          ...doc.modulos,
          {
            aulas: [],
            id: e.id,
            nivelOrdem: null,
            numero: numero + 1,
            titulo: "",
          },
        ],
      };
    }
    case "modulo_editado":
      return {
        ...doc,
        modulos: doc.modulos.map((m) =>
          m.id === e.id ? { ...m, ...e.mudanca } : m
        ),
      };
    case "modulos_ordenados":
      return { ...doc, modulos: porNumero(doc.modulos) };
    case "modulo_movido": {
      const i = doc.modulos.findIndex((m) => m.id === e.id);
      const modulos = trocado(doc.modulos, i, e.direcao);
      if (modulos === null) {
        return doc;
      }
      const j = e.direcao === "acima" ? i - 1 : i + 1;
      const a = modulos[i] as ModuloDoDocumento;
      const b = modulos[j] as ModuloDoDocumento;
      modulos[i] = { ...a, numero: b.numero };
      modulos[j] = { ...b, numero: a.numero };
      return { ...doc, modulos };
    }
    case "modulo_removido":
      return { ...doc, modulos: doc.modulos.filter((m) => m.id !== e.id) };
    case "aula_nova":
      return comAulas(doc, e.moduloId, (aulas) => [
        ...aulas,
        { duracaoSeg: 0, id: e.id, titulo: "", video: null },
      ]);
    case "aula_editada": {
      const m = moduloDaAula(doc, e.id);
      return m
        ? comAulas(doc, m.id, (aulas) =>
            aulas.map((a) => (a.id === e.id ? { ...a, ...e.mudanca } : a))
          )
        : doc;
    }
    case "aula_movida": {
      const m = moduloDaAula(doc, e.id);
      return m
        ? comAulas(doc, m.id, (aulas) =>
            trocado(
              aulas,
              aulas.findIndex((a) => a.id === e.id),
              e.direcao
            )
          )
        : doc;
    }
    case "aula_para_modulo": {
      const de = moduloDaAula(doc, e.id);
      const aula = de?.aulas.find((a) => a.id === e.id);
      if (
        !(de && aula) ||
        de.id === e.moduloId ||
        !doc.modulos.some((m) => m.id === e.moduloId)
      ) {
        return doc;
      }
      const sem = comAulas(doc, de.id, (aulas) =>
        aulas.filter((a) => a.id !== e.id)
      );
      return comAulas(sem, e.moduloId, (aulas) => [...aulas, aula]);
    }
    case "aula_removida": {
      const m = moduloDaAula(doc, e.id);
      return m
        ? comAulas(doc, m.id, (aulas) => aulas.filter((a) => a.id !== e.id))
        : doc;
    }
    default: {
      const nenhuma: never = e;
      throw new Error(`Edição sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}
