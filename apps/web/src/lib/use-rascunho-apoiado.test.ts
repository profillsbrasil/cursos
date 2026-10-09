import { describe, expect, test } from "bun:test";
import { documentoDeExemplo } from "@cursos/api/dominio/exemplo";
import type { CursoId, TrilhaId, Versao } from "@cursos/api/dominio/tipos";
import {
  cursosDoRascunho,
  type MudancaDaTrilha,
  REGRAS_DA_TRILHA,
} from "@/components/admin/estado-da-trilha";
import {
  type Mudanca,
  REGRAS_DO_CURSO,
} from "@/components/admin/estado-do-editor";
import { lerRascunho } from "@/components/admin/rascunho-do-curso";

import {
  type AcaoApoiada,
  apoiado,
  type EstadoApoiado,
  estadoApoiadoEm,
  rascunhoSujo,
} from "./use-rascunho-apoiado";

const V1 = "v1" as Versao;
const V2 = "v2" as Versao;
const V3 = "v3" as Versao;

describe("o rascunho apoiado da trilha", () => {
  type Doc = Parameters<typeof REGRAS_DA_TRILHA.deDocumento>[0];
  type R = ReturnType<typeof REGRAS_DA_TRILHA.deDocumento>;
  type Acao = AcaoApoiada<Doc, R, MudancaDaTrilha>;
  const [A, B, D] = ["a", "b", "d"].map(
    (c) => `00000000-0000-4000-8000-00000000000${c}` as CursoId
  ) as [CursoId, CursoId, CursoId];
  const doc = (o: Partial<Doc> = {}): Doc => ({
    cursos: [A, B],
    descricao: "Do posto à máquina.",
    id: "00000000-0000-4000-8000-000000000900" as TrilhaId,
    slug: "operador",
    titulo: "Operador",
    versao: V1,
    ...o,
  });
  const passo = (e: EstadoApoiado<Doc, R>, ...acoes: Acao[]) =>
    acoes.reduce((s, a) => apoiado(REGRAS_DA_TRILHA, s, a), e);
  const digitar = (titulo: string): Acao => ({
    mudanca: { mudanca: { titulo }, tipo: "campos" },
    tipo: "mudou",
  });
  const pagina = (p: Doc, limpo: boolean, descartes = 0): Acao => ({
    descartes,
    limpo,
    pagina: p,
    tipo: "pagina",
  });
  const sujo = (e: EstadoApoiado<Doc, R>) => rascunhoSujo(REGRAS_DA_TRILHA, e);

  test("o rascunho normalizado pelo servidor deixa de estar sujo", () => {
    const inicio = estadoApoiadoEm(REGRAS_DA_TRILHA, doc());
    const enviado = passo(inicio, digitar("Operador ")).rascunho;
    const depois = passo(inicio, digitar("Operador "), {
      enviado,
      gravado: doc({ titulo: "Operador", versao: V2 }),
      tipo: "salvo",
    });
    expect(depois.rascunho.titulo).toBe("Operador");
    expect(depois.apoio.base.versao).toBe(V2);
    expect(sujo(depois)).toBe(false);
  });

  test("o que o admin digitou com o salvar pendente fica, e o refresh do salvar não apaga", () => {
    const inicio = estadoApoiadoEm(REGRAS_DA_TRILHA, doc());
    const enviando = passo(inicio, digitar("Operador 2"));
    const gravado = doc({ titulo: "Operador 2", versao: V2 });
    const depois = passo(
      enviando,
      {
        mudanca: { id: D, salvo: false, tipo: "curso_acrescentado" },
        tipo: "mudou",
      },
      { enviado: enviando.rascunho, gravado, tipo: "salvo" },
      pagina(doc({ titulo: "Operador 2", versao: V2 }), false)
    );
    expect(cursosDoRascunho(depois.rascunho)).toEqual([A, B, D]);
    expect(depois.geracao).toBe(0);
    expect(depois.apoio.versaoDeFora).toBe(false);
    expect(sujo(depois)).toBe(true);
  });

  test("Recarregar recomeça da página nova e passa à geração seguinte", () => {
    const inicio = passo(
      estadoApoiadoEm(REGRAS_DA_TRILHA, doc()),
      digitar("X")
    );
    const nova = doc({ titulo: "De outra aba", versao: V3 });
    const emConflito = passo(inicio, pagina(nova, false));
    expect(emConflito.apoio.versaoDeFora).toBe(true);
    expect(emConflito.rascunho.titulo).toBe("X");
    expect(emConflito.geracao).toBe(0);

    const recarregado = passo(emConflito, pagina(nova, false, 1));
    expect(recarregado.rascunho.titulo).toBe("De outra aba");
    expect(recarregado.apoio.versaoDeFora).toBe(false);
    expect(recarregado.geracao).toBe(1);
    expect(sujo(recarregado)).toBe(false);
  });

  test("Salvar recusado por versao_mudou com o rascunho limpo: a página nova recomeça e o aviso sai", () => {
    const recusado = passo(estadoApoiadoEm(REGRAS_DA_TRILHA, doc()), {
      motivo: "versao_mudou",
      tipo: "recusado",
    });
    expect(recusado.apoio.versaoDeFora).toBe(true);
    const depois = passo(
      recusado,
      pagina(doc({ titulo: "De outra aba", versao: V2 }), true)
    );
    expect(depois.geracao).toBe(1);
    expect(depois.rascunho.titulo).toBe("De outra aba");
    expect(depois.apoio.versaoDeFora).toBe(false);
  });

  test("Salvar recusado por versao_mudou com o rascunho sujo: o aviso fica até o Recarregar", () => {
    const nova = doc({ titulo: "De outra aba", versao: V2 });
    const emConflito = passo(
      estadoApoiadoEm(REGRAS_DA_TRILHA, doc()),
      digitar("X"),
      { motivo: "versao_mudou", tipo: "recusado" },
      pagina(nova, false)
    );
    expect(emConflito.apoio.versaoDeFora).toBe(true);
    expect(emConflito.rascunho.titulo).toBe("X");
    expect(emConflito.geracao).toBe(0);

    const recarregado = passo(emConflito, pagina(nova, false, 1));
    expect(recarregado.apoio.versaoDeFora).toBe(false);
    expect(recarregado.rascunho.titulo).toBe("De outra aba");
  });

  test("recusa por outro motivo não liga o aviso", () => {
    const depois = passo(
      estadoApoiadoEm(REGRAS_DA_TRILHA, doc()),
      { motivo: "slug_repetido", tipo: "recusado" },
      { motivo: null, tipo: "recusado" }
    );
    expect(depois.apoio.versaoDeFora).toBe(false);
  });

  test("a trilha nova salva e troca de URL sem recomeçar", () => {
    const nova = doc({ cursos: [], titulo: "", versao: null });
    const inicio = estadoApoiadoEm(REGRAS_DA_TRILHA, nova);
    const enviando = passo(inicio, digitar("Operador"));
    const gravado = { ...nova, titulo: "Operador", versao: V1 };
    const depois = passo(
      enviando,
      { enviado: enviando.rascunho, gravado, tipo: "salvo" },
      pagina(gravado, true)
    );
    expect(depois.geracao).toBe(0);
    expect(depois.apoio.base.versao).toBe(V1);
    expect(depois.rascunho.titulo).toBe("Operador");
  });
});

describe("o rascunho apoiado do curso", () => {
  type Doc = Parameters<typeof REGRAS_DO_CURSO.deDocumento>[0];
  type R = ReturnType<typeof REGRAS_DO_CURSO.deDocumento>;
  type Acao = AcaoApoiada<Doc, R, Mudanca>;
  const passo = (e: EstadoApoiado<Doc, R>, ...acoes: Acao[]) =>
    acoes.reduce((s, a) => apoiado(REGRAS_DO_CURSO, s, a), e);
  const campos = (mudanca: Extract<Mudanca, { tipo: "campos" }>["mudanca"]) =>
    ({ mudanca: { mudanca, tipo: "campos" }, tipo: "mudou" }) as const;
  const gravado = (e: EstadoApoiado<Doc, R>): Doc => {
    const lido = lerRascunho(e.rascunho, e.apoio.base);
    if (lido.tipo !== "lido") {
      throw new Error("o rascunho devia ler");
    }
    return { ...lido.documento, versao: V2 };
  };

  test("o rascunho normalizado pelo servidor deixa de estar sujo", () => {
    const enviando = passo(
      estadoApoiadoEm(REGRAS_DO_CURSO, documentoDeExemplo()),
      campos({ titulo: "Curso   " })
    );
    expect(rascunhoSujo(REGRAS_DO_CURSO, enviando)).toBe(true);
    const depois = passo(enviando, {
      enviado: enviando.rascunho,
      gravado: gravado(enviando),
      tipo: "salvo",
    });
    expect(depois.rascunho.titulo).toBe("Curso");
    expect(rascunhoSujo(REGRAS_DO_CURSO, depois)).toBe(false);
  });

  test("o que o admin digitou com o salvar pendente fica, apoiado na versão nova", () => {
    const enviando = passo(
      estadoApoiadoEm(REGRAS_DO_CURSO, documentoDeExemplo()),
      campos({ titulo: "Curso   " })
    );
    const depois = passo(enviando, campos({ tema: "Outro tema" }), {
      enviado: enviando.rascunho,
      gravado: gravado(enviando),
      tipo: "salvo",
    });
    expect([depois.rascunho.tema, depois.rascunho.titulo]).toEqual([
      "Outro tema",
      "Curso   ",
    ]);
    expect(depois.apoio.base.versao).toBe(V2);
    const lido = lerRascunho(depois.rascunho, depois.apoio.base);
    expect(lido.tipo === "lido" ? lido.documento.versao : null).toBe(V2);
  });

  test("a versão de fora com o rascunho limpo recomeça inteiro da página", () => {
    const outro = {
      ...documentoDeExemplo(),
      titulo: "De outra aba",
      versao: V3,
    };
    const depois = passo(
      estadoApoiadoEm(REGRAS_DO_CURSO, documentoDeExemplo()),
      {
        descartes: 0,
        limpo: true,
        pagina: outro,
        tipo: "pagina",
      }
    );
    expect(depois.geracao).toBe(1);
    expect(
      REGRAS_DO_CURSO.mesmo(depois.rascunho, REGRAS_DO_CURSO.deDocumento(outro))
    ).toBe(true);
  });

  test("Salvar sem mudança recusado por versao_mudou: a versão nova recomeça o editor e o aviso sai", () => {
    const outro = {
      ...documentoDeExemplo(),
      titulo: "De outra aba",
      versao: V3,
    };
    const recusado = passo(
      estadoApoiadoEm(REGRAS_DO_CURSO, documentoDeExemplo()),
      { motivo: "versao_mudou", tipo: "recusado" }
    );
    expect(recusado.apoio.versaoDeFora).toBe(true);
    const depois = passo(recusado, {
      descartes: 0,
      limpo: true,
      pagina: outro,
      tipo: "pagina",
    });
    expect(depois.geracao).toBe(1);
    expect(depois.rascunho.titulo).toBe("De outra aba");
    expect(depois.apoio.versaoDeFora).toBe(false);
  });
});
