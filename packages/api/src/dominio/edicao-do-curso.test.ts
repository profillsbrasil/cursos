import { describe, expect, test } from "bun:test";

import {
  type DocumentoDoCurso,
  documentoDoCurso,
  type EdicaoDoCurso,
  edicaoDeCursoNovo,
  formularioDoCurso,
  lerFormularioDoCurso,
  planejarCurso,
} from "./edicao-do-curso";
import type { AulaId, CursoId, ModuloId } from "./tipos";
import { versaoDe } from "./versao";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const CURSO = id(1) as CursoId;
const M1 = id(11) as ModuloId;
const M2 = id(12) as ModuloId;
const A1 = id(21) as AulaId;
const A2 = id(22) as AulaId;
const A3 = id(23) as AulaId;

const aula = (aulaId: AulaId, titulo: string) => ({
  duracaoSeg: 300,
  id: aulaId,
  titulo,
  video: null,
});

function documento(): DocumentoDoCurso {
  const d: DocumentoDoCurso = {
    capaAlt: "Capa",
    codigo: null,
    destaque: null,
    id: CURSO,
    modulos: [
      {
        aulas: [aula(A1, "Aula 1"), aula(A2, "Aula 2")],
        id: M1,
        nivelOrdem: 1,
        numero: 0,
        titulo: "Módulo zero",
      },
      {
        aulas: [aula(A3, "Aula 3")],
        id: M2,
        nivelOrdem: 2,
        numero: 1,
        titulo: "Módulo um",
      },
    ],
    niveis: [
      { nome: "Básico", ordem: 1 },
      { nome: "Avançado", ordem: 2 },
    ],
    precoTroca: null,
    slug: "curso-teste",
    status: "publicado",
    tema: "teste",
    titulo: "Curso",
    versao: null,
  };
  return { ...d, versao: versaoDe(d) };
}

function edicao(
  doc: DocumentoDoCurso,
  assistidasPorAula: Record<string, number> = {}
): EdicaoDoCurso {
  return {
    capa: { alt: "Capa", altura: 720, largura: 1280, url: "/capas/x.jpg" },
    documento: doc,
    podeApagar: false,
    uso: { assistidasPorAula, certificados: 0, liberacoes: 0, trilha: null },
  };
}

const editar = (
  doc: DocumentoDoCurso,
  mudar: (d: DocumentoDoCurso) => DocumentoDoCurso
) => mudar(structuredClone(doc));

describe("versaoDe", () => {
  test("ignora a ordem das chaves e o próprio campo versao", () => {
    const d = documento();
    const invertido = Object.fromEntries(
      Object.entries(d).reverse()
    ) as DocumentoDoCurso;
    expect(versaoDe({ ...invertido, versao: null })).toBe(versaoDe(d));
  });

  test("muda quando uma aula muda de lugar", () => {
    const d = documento();
    const trocado = editar(d, (x) => {
      const [m1] = x.modulos;
      m1?.aulas.reverse();
      return x;
    });
    expect(versaoDe(trocado)).not.toBe(versaoDe(d));
  });
});

describe("planejarCurso", () => {
  test("curso que sumiu com o editor aberto é recusado", () => {
    expect(planejarCurso(null, documento(), true)).toEqual({
      recusa: { tipo: "sumiu" },
      tipo: "recusa",
    });
  });

  test("curso novo sem capa é recusado; com capa é criado sem nada a apagar", () => {
    const novo = { ...documento(), versao: null };
    expect(planejarCurso(null, novo, false)).toEqual({
      recusa: { tipo: "sem_capa" },
      tipo: "recusa",
    });
    expect(planejarCurso(null, novo, true)).toEqual({
      apagar: { aulas: [], modulos: [], niveis: [] },
      criar: true,
      documento: novo,
      novos: { aulas: [A1, A2, A3], modulos: [M1, M2] },
      tipo: "gravar",
    });
  });

  test("conteúdo igual sem capa nova é nada_mudou, mesmo com versão velha ou null", () => {
    const d = documento();
    const atual = edicao(d);
    expect(planejarCurso(atual, d, false)).toEqual({ tipo: "nada_mudou" });
    expect(planejarCurso(atual, { ...d, versao: null }, false)).toEqual({
      tipo: "nada_mudou",
    });
  });

  test("capa nova com o mesmo conteúdo grava", () => {
    const d = documento();
    expect(planejarCurso(edicao(d), d, true).tipo).toBe("gravar");
  });

  test("versão diferente da atual é versao_mudou", () => {
    const d = documento();
    const outroAdmin = editar(d, (x) => ({ ...x, titulo: "Outro título" }));
    const atual = edicao({ ...outroAdmin, versao: versaoDe(outroAdmin) });
    const meu = editar(d, (x) => ({ ...x, tema: "meu tema" }));
    expect(planejarCurso(atual, meu, false)).toEqual({
      recusa: { tipo: "versao_mudou" },
      tipo: "recusa",
    });
  });

  test("aula assistida fora do documento é recusada com título e contagem", () => {
    const d = documento();
    const semA2 = editar(d, (x) => {
      x.modulos[0]?.aulas.pop();
      return x;
    });
    expect(planejarCurso(edicao(d, { [A2]: 3 }), semA2, false)).toEqual({
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
    const plano = planejarCurso(edicao(d, { [A2]: 3 }), movida, false);
    expect(plano).toMatchObject({
      apagar: { aulas: [], modulos: [], niveis: [] },
      tipo: "gravar",
    });
  });

  test("gravar lista as aulas, módulos e níveis que saem", () => {
    const d = documento();
    const enxuto = editar(d, (x) => ({
      ...x,
      modulos: x.modulos.slice(0, 1).map((m) => ({ ...m, nivelOrdem: 1 })),
      niveis: x.niveis.slice(0, 1),
    }));
    expect(planejarCurso(edicao(d, { [A1]: 1 }), enxuto, false)).toEqual({
      apagar: { aulas: [A3], modulos: [M2], niveis: [2] },
      criar: false,
      documento: enxuto,
      novos: { aulas: [], modulos: [] },
      tipo: "gravar",
    });
  });

  test("gravar separa os ids novos dos que o curso já tem", () => {
    const d = documento();
    const M3 = id(13) as ModuloId;
    const A4 = id(24) as AulaId;
    const maior = editar(d, (x) => {
      x.modulos[0]?.aulas.push(aula(A4, "Aula 4"));
      x.modulos.push({
        aulas: [],
        id: M3,
        nivelOrdem: null,
        numero: 7,
        titulo: "Novo",
      });
      return x;
    });
    expect(planejarCurso(edicao(d), maior, false)).toMatchObject({
      apagar: { aulas: [], modulos: [], niveis: [] },
      novos: { aulas: [A4], modulos: [M3] },
      tipo: "gravar",
    });
  });
});

describe("documentoDoCurso", () => {
  const erros = (d: unknown) =>
    documentoDoCurso
      .safeParse(d)
      .error?.issues.map((i) => i.message)
      .sort() ?? [];

  test("aceita o documento de exemplo e o devolve igual", () => {
    const d = documento();
    expect(documentoDoCurso.parse(d)).toEqual(d);
  });

  test("recusa número de módulo, id e ordem de nível repetidos", () => {
    const d = documento();
    const ruim = editar(d, (x) => {
      const [m1, m2] = x.modulos;
      if (m1 && m2) {
        m2.numero = m1.numero;
        m2.aulas.push(aula(A1, "Cópia"));
      }
      x.niveis.push({ nome: "Outro", ordem: 1 });
      return x;
    });
    expect(erros(ruim)).toEqual([
      `Aula ${A1} aparece duas vezes.`,
      "Dois módulos com o número 0.",
      "Dois níveis com a ordem 1.",
    ]);
  });

  test("recusa módulo apontando para nível que não existe", () => {
    const d = editar(documento(), (x) => ({
      ...x,
      niveis: x.niveis.slice(0, 1),
    }));
    expect(erros(d)).toEqual(["O nível 2 não existe."]);
  });

  test("texto opcional vazio vira null e título é aparado", () => {
    const d = { ...documento(), codigo: "  ", titulo: "  Curso  " };
    expect(documentoDoCurso.parse(d)).toMatchObject({
      codigo: null,
      titulo: "Curso",
    });
  });

  test("o documento do curso novo não passa sem título, slug, tema e alt", () => {
    const novo = edicaoDeCursoNovo(CURSO).documento;
    expect(documentoDoCurso.safeParse(novo).success).toBe(false);
  });
});

describe("formulário do curso", () => {
  test("ida e volta com capa", () => {
    const d = documento();
    const capa = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const lido = lerFormularioDoCurso(formularioDoCurso(d, capa));
    expect(lido.tipo).toBe("lido");
    if (lido.tipo === "lido") {
      expect(lido.documento).toEqual(d);
      expect(lido.capa?.size).toBe(3);
    }
  });

  test("arquivo vazio conta como sem capa", () => {
    const fd = formularioDoCurso(documento(), new Blob([]));
    expect(lerFormularioDoCurso(fd)).toMatchObject({
      capa: null,
      tipo: "lido",
    });
  });

  test("documento inválido diz onde, com módulo e aula contados de 1", () => {
    const d = editar(documento(), (x) => {
      const a = x.modulos[1]?.aulas[0];
      if (a) {
        a.titulo = "";
      }
      return x;
    });
    const lido = lerFormularioDoCurso(formularioDoCurso(d, null));
    expect(lido.tipo).toBe("invalido");
    if (lido.tipo === "invalido") {
      expect(lido.mensagem.startsWith("Módulo 2, aula 1, titulo:")).toBe(true);
    }
  });

  test("sem documento ou com JSON quebrado é inválido", () => {
    const quebrado = new FormData();
    quebrado.set("documento", "{");
    expect(lerFormularioDoCurso(new FormData()).tipo).toBe("invalido");
    expect(lerFormularioDoCurso(quebrado).tipo).toBe("invalido");
  });
});
