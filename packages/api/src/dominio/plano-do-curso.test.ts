import { describe, expect, test } from "bun:test";

import type { ImagemDaCapa } from "./capa";
import type { DocumentoDoCurso, EdicaoDoCurso } from "./edicao-do-curso";
import {
  aulaDeExemplo,
  documentoDeExemplo,
  EDICAO,
  uuidDeExemplo,
} from "./exemplo";
import { planejarCurso, versaoDoCurso } from "./plano-do-curso";
import type { AulaId, ModuloId } from "./tipos";

const { A1, A2, A3, M2 } = EDICAO;

const CAPA_ATUAL = "/capas/atual.jpg";
const capa = (url: string): ImagemDaCapa => ({
  altura: 720,
  largura: 1280,
  url,
});

/** O documento como abrirCurso devolve: versão da árvore com a capa do banco. */
function documento(): DocumentoDoCurso {
  const d = documentoDeExemplo();
  return { ...d, versao: versaoDoCurso(d, CAPA_ATUAL) };
}

function edicao(
  doc: DocumentoDoCurso,
  assistidasPorAula: Record<string, number> = {}
): EdicaoDoCurso {
  return {
    capa: { alt: "Capa", altura: 720, largura: 1280, url: CAPA_ATUAL },
    documento: doc,
    podeApagar: false,
    uso: { assistidasPorAula, certificados: 0, liberacoes: 0, trilha: null },
  };
}

const editar = (
  doc: DocumentoDoCurso,
  mudar: (d: DocumentoDoCurso) => DocumentoDoCurso
) => mudar(structuredClone(doc));

describe("versaoDoCurso", () => {
  test("ignora a ordem das chaves e o próprio campo versao", () => {
    const d = documento();
    const invertido = Object.fromEntries(
      Object.entries(d).reverse()
    ) as DocumentoDoCurso;
    expect(versaoDoCurso({ ...invertido, versao: null }, CAPA_ATUAL)).toBe(
      versaoDoCurso(d, CAPA_ATUAL)
    );
  });

  test("muda quando uma aula muda de lugar ou quando a capa muda", () => {
    const d = documento();
    const trocado = editar(d, (x) => {
      x.modulos[0]?.aulas.reverse();
      return x;
    });
    const versao = versaoDoCurso(d, CAPA_ATUAL);
    expect(versaoDoCurso(trocado, CAPA_ATUAL)).not.toBe(versao);
    expect(versaoDoCurso(d, "/capas/outra.jpg")).not.toBe(versao);
  });
});

describe("planejarCurso", () => {
  test("curso que sumiu com o editor aberto é recusado", () => {
    expect(planejarCurso(null, documento(), capa(CAPA_ATUAL))).toEqual({
      recusa: { tipo: "sumiu" },
      tipo: "recusa",
    });
  });

  test("curso novo sem capa é recusado; com capa é criado com a versão que vai ser lida", () => {
    const novo = { ...documento(), versao: null };
    expect(planejarCurso(null, novo, null)).toEqual({
      recusa: { tipo: "sem_capa" },
      tipo: "recusa",
    });
    expect(planejarCurso(null, novo, capa("/capas/nova.jpg"))).toEqual({
      capa: capa("/capas/nova.jpg"),
      documento: novo,
      tipo: "criar",
      versao: versaoDoCurso(novo, "/capas/nova.jpg"),
    });
  });

  test("reenvio da criação, com a mesma capa e versão null, é nada_mudou", () => {
    const d = documento();
    expect(
      planejarCurso(edicao(d), { ...d, versao: null }, capa(CAPA_ATUAL))
    ).toEqual({ tipo: "nada_mudou", versao: versaoDoCurso(d, CAPA_ATUAL) });
  });

  test("conteúdo igual sem capa é nada_mudou, mesmo com versão velha ou null", () => {
    const d = documento();
    const atual = edicao(d);
    const nada = {
      tipo: "nada_mudou",
      versao: versaoDoCurso(d, CAPA_ATUAL),
    } as const;
    expect(planejarCurso(atual, d, null)).toEqual(nada);
    expect(planejarCurso(atual, { ...d, versao: null }, null)).toEqual(nada);
  });

  test("capa nova com o mesmo conteúdo atualiza a capa e muda a versão", () => {
    const d = documento();
    expect(planejarCurso(edicao(d), d, capa("/capas/nova.jpg"))).toMatchObject({
      capa: capa("/capas/nova.jpg"),
      tipo: "atualizar",
      versao: versaoDoCurso(d, "/capas/nova.jpg"),
    });
  });

  test("a capa do banco que volta com o pedido não é capa nova", () => {
    const d = documento();
    const meu = { ...d, tema: "meu tema" };
    expect(planejarCurso(edicao(d), meu, capa(CAPA_ATUAL))).toMatchObject({
      capa: null,
      tipo: "atualizar",
      versao: versaoDoCurso(meu, CAPA_ATUAL),
    });
  });

  test("versão diferente da atual é versao_mudou, inclusive para troca de capa", () => {
    const d = documento();
    const outroAdmin = editar(d, (x) => ({ ...x, titulo: "Outro título" }));
    const atual = edicao({
      ...outroAdmin,
      versao: versaoDoCurso(outroAdmin, CAPA_ATUAL),
    });
    const meu = editar(d, (x) => ({ ...x, tema: "meu tema" }));
    const recusa = {
      recusa: { tipo: "versao_mudou" },
      tipo: "recusa",
    } as const;
    expect(planejarCurso(atual, meu, null)).toEqual(recusa);
    expect(planejarCurso(atual, d, capa("/capas/minha.jpg"))).toEqual(recusa);
  });

  test("aula assistida fora do documento é recusada com título e contagem", () => {
    const d = documento();
    const semA2 = editar(d, (x) => {
      x.modulos[0]?.aulas.pop();
      return x;
    });
    expect(planejarCurso(edicao(d, { [A2]: 3 }), semA2, null)).toEqual({
      recusa: { alunos: 3, tipo: "aula_assistida", titulo: "Aula 2" },
      tipo: "recusa",
    });
  });

  test("aula assistida que só muda de módulo não é recusada", () => {
    const d = documento();
    const movida = editar(d, (x) => {
      const a2 = x.modulos[0]?.aulas.pop();
      if (a2) {
        x.modulos[1]?.aulas.unshift(a2);
      }
      return x;
    });
    expect(planejarCurso(edicao(d, { [A2]: 3 }), movida, null)).toMatchObject({
      apagar: { aulas: [], modulos: [], niveis: [] },
      tipo: "atualizar",
    });
  });

  test("atualizar lista as aulas, módulos e níveis que saem", () => {
    const d = documento();
    const enxuto = editar(d, (x) => ({
      ...x,
      modulos: x.modulos.slice(0, 1).map((m) => ({ ...m, nivelOrdem: 1 })),
      niveis: x.niveis.slice(0, 1),
    }));
    expect(planejarCurso(edicao(d, { [A1]: 1 }), enxuto, null)).toEqual({
      apagar: { aulas: [A3], modulos: [M2], niveis: [2] },
      capa: null,
      documento: enxuto,
      tipo: "atualizar",
      versao: versaoDoCurso(enxuto, CAPA_ATUAL),
    });
  });

  test("módulo e aula novos não saem de nada", () => {
    const d = documento();
    const maior = editar(d, (x) => {
      x.modulos[0]?.aulas.push(
        aulaDeExemplo(uuidDeExemplo(24) as AulaId, "Aula 4")
      );
      x.modulos.push({
        aulas: [],
        id: uuidDeExemplo(13) as ModuloId,
        nivelOrdem: null,
        numero: 7,
        titulo: "Novo",
      });
      return x;
    });
    expect(planejarCurso(edicao(d), maior, null)).toMatchObject({
      apagar: { aulas: [], modulos: [], niveis: [] },
      tipo: "atualizar",
    });
  });
});
