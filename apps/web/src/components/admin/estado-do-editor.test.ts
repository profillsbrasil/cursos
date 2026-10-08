import { describe, expect, test } from "bun:test";
import {
  type DocumentoDoCurso,
  documentoDoCurso,
} from "@cursos/api/dominio/edicao-do-curso";
import {
  documentoDeExemplo,
  EDICAO,
  uuidDeExemplo,
} from "@cursos/api/dominio/exemplo";
import type { AulaId, ModuloId, VideoId } from "@cursos/api/dominio/tipos";

import { type Edicao, editar } from "./estado-do-editor";

const { A1, A2, A3, M1, M2 } = EDICAO;
const M3 = uuidDeExemplo(13) as ModuloId;
const A4 = uuidDeExemplo(24) as AulaId;

const aplicar = (doc: DocumentoDoCurso, ...edicoes: Edicao[]) =>
  edicoes.reduce(editar, doc);

/** O que o aluno vê: número e título de cada módulo, com as aulas em ordem. */
const ordem = (doc: DocumentoDoCurso) =>
  doc.modulos.map((m) => [m.numero, m.titulo, m.aulas.map((a) => a.titulo)]);

describe("campos do curso", () => {
  test("muda só os campos pedidos", () => {
    const doc = aplicar(documentoDeExemplo(), {
      mudanca: { precoTroca: 300, slug: "nr-12" },
      tipo: "campos",
    });
    expect(doc.precoTroca).toBe(300);
    expect(doc.slug).toBe("nr-12");
    expect(doc.titulo).toBe("Curso");
    expect(ordem(doc)).toEqual(ordem(documentoDeExemplo()));
  });
});

describe("níveis", () => {
  test("o nível novo recebe a maior ordem mais 1, e renomear muda só o nome", () => {
    const doc = aplicar(
      documentoDeExemplo(),
      { nome: "Especialista", tipo: "nivel_novo" },
      { nome: "Intermediário", ordem: 2, tipo: "nivel_renomeado" }
    );
    expect(doc.niveis).toEqual([
      { nome: "Básico", ordem: 1 },
      { nome: "Intermediário", ordem: 2 },
      { nome: "Especialista", ordem: 3 },
    ]);
  });

  test("no curso sem nível, o primeiro é o 1", () => {
    const vazio = { ...documentoDeExemplo(), niveis: [] };
    expect(
      editar(vazio, { nome: "Básico", tipo: "nivel_novo" }).niveis
    ).toEqual([{ nome: "Básico", ordem: 1 }]);
  });

  test("remover um nível deixa sem nível os módulos que o usavam", () => {
    const doc = editar(documentoDeExemplo(), {
      ordem: 1,
      tipo: "nivel_removido",
    });
    expect(doc.niveis).toEqual([{ nome: "Avançado", ordem: 2 }]);
    expect(doc.modulos.map((m) => m.nivelOrdem)).toEqual([null, 2]);
  });
});

describe("módulos", () => {
  test("o módulo novo vem no fim, com o maior número mais 1", () => {
    const doc = editar(documentoDeExemplo(), { id: M3, tipo: "modulo_novo" });
    expect(doc.modulos.at(-1)).toEqual({
      aulas: [],
      id: M3,
      nivelOrdem: null,
      numero: 2,
      titulo: "",
    });
  });

  test("o primeiro módulo de um curso novo é o 1", () => {
    const vazio = { ...documentoDeExemplo(), modulos: [] };
    expect(
      editar(vazio, { id: M3, tipo: "modulo_novo" }).modulos[0]?.numero
    ).toBe(1);
  });

  test("mudar o número não move o módulo até a lista ser ordenada", () => {
    const doc = aplicar(
      documentoDeExemplo(),
      { id: M1, mudanca: { titulo: "Abertura" }, tipo: "modulo_editado" },
      { id: M1, mudanca: { numero: 5 }, tipo: "modulo_editado" }
    );
    expect(ordem(doc)).toEqual([
      [5, "Abertura", ["Aula 1", "Aula 2"]],
      [1, "Módulo um", ["Aula 3"]],
    ]);
    expect(ordem(editar(doc, { tipo: "modulos_ordenados" }))).toEqual([
      [1, "Módulo um", ["Aula 3"]],
      [5, "Abertura", ["Aula 1", "Aula 2"]],
    ]);
  });

  test("subir e descer trocam o lugar e o número com o vizinho", () => {
    const desceu = editar(documentoDeExemplo(), {
      direcao: "abaixo",
      id: M1,
      tipo: "modulo_movido",
    });
    expect(ordem(desceu)).toEqual([
      [0, "Módulo um", ["Aula 3"]],
      [1, "Módulo zero", ["Aula 1", "Aula 2"]],
    ]);
    const subiu = editar(desceu, {
      direcao: "acima",
      id: M1,
      tipo: "modulo_movido",
    });
    expect(ordem(subiu)).toEqual(ordem(documentoDeExemplo()));
  });

  test("no topo e no fim o módulo não se move", () => {
    const doc = documentoDeExemplo();
    expect(
      editar(doc, { direcao: "acima", id: M1, tipo: "modulo_movido" })
    ).toBe(doc);
    expect(
      editar(doc, { direcao: "abaixo", id: M2, tipo: "modulo_movido" })
    ).toBe(doc);
  });

  test("remover o módulo leva as aulas dele", () => {
    const doc = editar(documentoDeExemplo(), {
      id: M1,
      tipo: "modulo_removido",
    });
    expect(ordem(doc)).toEqual([[1, "Módulo um", ["Aula 3"]]]);
  });
});

describe("aulas", () => {
  test("a aula nova vem no fim do módulo, vazia", () => {
    const doc = editar(documentoDeExemplo(), {
      id: A4,
      moduloId: M2,
      tipo: "aula_nova",
    });
    expect(doc.modulos[1]?.aulas.map((a) => a.id)).toEqual([A3, A4]);
    expect(doc.modulos[1]?.aulas[1]).toEqual({
      duracaoSeg: 0,
      id: A4,
      titulo: "",
      video: null,
    });
  });

  test("editar muda só a aula pedida", () => {
    const doc = editar(documentoDeExemplo(), {
      id: A2,
      mudanca: { duracaoSeg: 754, titulo: "Ajuste da válvula" },
      tipo: "aula_editada",
    });
    expect(doc.modulos[0]?.aulas).toEqual([
      { duracaoSeg: 300, id: A1, titulo: "Aula 1", video: null },
      { duracaoSeg: 754, id: A2, titulo: "Ajuste da válvula", video: null },
    ]);
  });

  test("subir e descer trocam a aula com a vizinha do mesmo módulo", () => {
    const doc = editar(documentoDeExemplo(), {
      direcao: "abaixo",
      id: A1,
      tipo: "aula_movida",
    });
    expect(ordem(doc)[0]).toEqual([0, "Módulo zero", ["Aula 2", "Aula 1"]]);
    expect(
      ordem(editar(doc, { direcao: "acima", id: A1, tipo: "aula_movida" }))
    ).toEqual(ordem(documentoDeExemplo()));
  });

  test("no topo e no fim do módulo a aula não passa para o vizinho", () => {
    const doc = documentoDeExemplo();
    expect(editar(doc, { direcao: "acima", id: A1, tipo: "aula_movida" })).toBe(
      doc
    );
    expect(
      editar(doc, { direcao: "abaixo", id: A2, tipo: "aula_movida" })
    ).toBe(doc);
    expect(editar(doc, { direcao: "acima", id: A3, tipo: "aula_movida" })).toBe(
      doc
    );
  });

  test("mover para outro módulo leva a aula, com o mesmo id, para o fim dele", () => {
    const doc = editar(documentoDeExemplo(), {
      id: A1,
      moduloId: M2,
      tipo: "aula_para_modulo",
    });
    expect(ordem(doc)).toEqual([
      [0, "Módulo zero", ["Aula 2"]],
      [1, "Módulo um", ["Aula 3", "Aula 1"]],
    ]);
    expect(doc.modulos[1]?.aulas[1]?.id).toBe(A1);
  });

  test("mover para o próprio módulo ou para um que não existe não muda nada", () => {
    const doc = documentoDeExemplo();
    expect(
      editar(doc, { id: A1, moduloId: M1, tipo: "aula_para_modulo" })
    ).toBe(doc);
    expect(
      editar(doc, { id: A1, moduloId: M3, tipo: "aula_para_modulo" })
    ).toBe(doc);
  });

  test("remover tira só a aula pedida", () => {
    const doc = editar(documentoDeExemplo(), { id: A1, tipo: "aula_removida" });
    expect(ordem(doc)[0]).toEqual([0, "Módulo zero", ["Aula 2"]]);
  });
});

test("o documento editado passa no schema que o servidor usa", () => {
  const doc = aplicar(
    documentoDeExemplo(),
    { id: M3, tipo: "modulo_novo" },
    { id: M3, mudanca: { titulo: "Manutenção" }, tipo: "modulo_editado" },
    { id: A4, moduloId: M3, tipo: "aula_nova" },
    {
      id: A4,
      mudanca: {
        duracaoSeg: 610,
        titulo: "Troca do bico",
        video: { id: "dQw4w9WgXcQ" as VideoId, provedor: "youtube" },
      },
      tipo: "aula_editada",
    },
    { id: A2, moduloId: M3, tipo: "aula_para_modulo" },
    { direcao: "acima", id: A2, tipo: "aula_movida" },
    { direcao: "acima", id: M3, tipo: "modulo_movido" },
    { ordem: 2, tipo: "nivel_removido" }
  );
  const lido = documentoDoCurso.safeParse(doc);
  expect(lido.success).toBe(true);
  expect(lido.data && ordem(lido.data)).toEqual([
    [0, "Módulo zero", ["Aula 1"]],
    [1, "Manutenção", ["Aula 2", "Troca do bico"]],
    [2, "Módulo um", ["Aula 3"]],
  ]);
});
