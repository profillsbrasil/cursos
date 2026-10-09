import { describe, expect, test } from "bun:test";

import {
  type DocumentoDaTrilha,
  documentoDaTrilha,
  edicaoDeTrilhaNova,
  podeApagarTrilha,
} from "./edicao-da-trilha";
import { uuidDeExemplo } from "./exemplo";
import {
  type CursoDaLista,
  planejarTrilha,
  versaoDaTrilha,
} from "./plano-da-trilha";
import type { CursoId, TrilhaId, Versao } from "./tipos";

const TRILHA = uuidDeExemplo(1) as TrilhaId;
const OUTRA = uuidDeExemplo(2) as TrilhaId;
const A = uuidDeExemplo(11) as CursoId;
const B = uuidDeExemplo(12) as CursoId;
const C = uuidDeExemplo(13) as CursoId;

const cursoDaLista = (
  id: CursoId,
  titulo: string,
  trilha: CursoDaLista["trilha"] = { id: TRILHA, titulo: "Operador" }
): CursoDaLista => ({ id, titulo, trilha });

const CURSOS = new Map<CursoId, CursoDaLista>([
  [A, cursoDaLista(A, "Segurança")],
  [B, cursoDaLista(B, "Envasadora")],
  [C, cursoDaLista(C, "Montagem", null)],
]);

/** O documento como lerDocumento devolve: com a versão do que está gravado. */
function documento(cursos: CursoId[] = [A, B]): DocumentoDaTrilha {
  const d: DocumentoDaTrilha = {
    cursos,
    descricao: "Do posto à máquina.",
    id: TRILHA,
    slug: "operador",
    titulo: "Operador",
    versao: null,
  };
  return { ...d, versao: versaoDaTrilha(d) };
}

describe("documentoDaTrilha", () => {
  test("põe os ids em minúscula e recusa curso repetido", () => {
    const bruto = {
      ...documento(),
      cursos: [A.toUpperCase(), B],
      id: TRILHA.toUpperCase(),
    };
    const lido = documentoDaTrilha.parse(bruto);
    expect(lido.id).toBe(TRILHA);
    expect(lido.cursos).toEqual([A, B]);

    const repetido = documentoDaTrilha.safeParse({
      ...documento(),
      cursos: [A, B, A],
    });
    expect(repetido.error?.issues.map((i) => i.path)).toEqual([["cursos", 2]]);
  });

  test("recusa slug fora do formato e título vazio", () => {
    const r = documentoDaTrilha.safeParse({
      ...documento(),
      slug: "Com Espaço",
      titulo: "   ",
    });
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual([
      "slug",
      "titulo",
    ]);
  });
});

describe("versaoDaTrilha", () => {
  test("muda com a ordem dos cursos e ignora o próprio campo versao", () => {
    const d = documento([A, B]);
    expect(versaoDaTrilha({ ...d, versao: null })).toBe(versaoDaTrilha(d));
    expect(versaoDaTrilha(documento([B, A]))).not.toBe(versaoDaTrilha(d));
  });
});

describe("planejarTrilha", () => {
  test("trilha nova grava com criar", () => {
    const d = { ...documento([C]), versao: null };
    expect(planejarTrilha(null, d, CURSOS)).toEqual({
      criar: true,
      documento: d,
      tipo: "gravar",
      versao: versaoDaTrilha(d),
    });
  });

  test("trilha que sumiu enquanto o admin editava recusa", () => {
    expect(planejarTrilha(null, documento(), CURSOS)).toEqual({
      recusa: { tipo: "sumiu" },
      tipo: "recusa",
    });
  });

  test("reenvio igual, mesmo com versão velha ou nula, é nada_mudou", () => {
    const atual = documento();
    for (const versao of [atual.versao, null, "velha" as Versao]) {
      expect(planejarTrilha(atual, { ...atual, versao }, CURSOS)).toEqual({
        tipo: "nada_mudou",
        versao: atual.versao as Versao,
      });
    }
  });

  test("versão diferente da gravada recusa com versao_mudou", () => {
    const atual = documento();
    const desejado = { ...documento([B, A]), versao: "velha" as Versao };
    expect(planejarTrilha(atual, desejado, CURSOS)).toEqual({
      recusa: { tipo: "versao_mudou" },
      tipo: "recusa",
    });
  });

  test("inserir no meio, reordenar e tirar gravam a lista desejada", () => {
    const atual = documento([A, B]);
    for (const cursos of [[A, C, B], [B, A], [A]]) {
      const desejado = { ...atual, cursos };
      expect(planejarTrilha(atual, desejado, CURSOS)).toEqual({
        criar: false,
        documento: desejado,
        tipo: "gravar",
        versao: versaoDaTrilha(desejado),
      });
    }
  });

  test("curso de outra trilha recusa com o nome do curso e o da trilha", () => {
    const atual = documento([A]);
    const cursos = new Map(CURSOS).set(
      C,
      cursoDaLista(C, "Montagem", { id: OUTRA, titulo: "Comercial" })
    );
    expect(planejarTrilha(atual, { ...atual, cursos: [A, C] }, cursos)).toEqual(
      {
        recusa: {
          curso: "Montagem",
          tipo: "curso_em_outra_trilha",
          trilha: "Comercial",
        },
        tipo: "recusa",
      }
    );
  });

  test("curso que não existe recusa com o id", () => {
    const atual = documento([A]);
    const sumido = uuidDeExemplo(99) as CursoId;
    expect(
      planejarTrilha(atual, { ...atual, cursos: [A, sumido] }, CURSOS)
    ).toEqual({
      recusa: { id: sumido, tipo: "curso_desconhecido" },
      tipo: "recusa",
    });
  });
});

describe("podeApagarTrilha e trilha nova", () => {
  test("liberação, mesmo revogada, ou conclusão seguram a trilha", () => {
    const sem = { alunosComATrilha: 0, conclusoes: 0, liberacoes: 0 };
    expect(podeApagarTrilha(sem)).toBe(true);
    expect(podeApagarTrilha({ ...sem, liberacoes: 1 })).toBe(false);
    expect(podeApagarTrilha({ ...sem, conclusoes: 1 })).toBe(false);
  });

  test("o rascunho novo usa o id recebido e não se apaga", () => {
    const nova = edicaoDeTrilhaNova(TRILHA);
    expect(nova.documento).toMatchObject({
      cursos: [],
      id: TRILHA,
      versao: null,
    });
    expect(nova.podeApagar).toBe(false);
  });
});
