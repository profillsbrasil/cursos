import { describe, expect, test } from "bun:test";

import {
  type DocumentoDoCurso,
  documentoDoCurso,
  edicaoDeCursoNovo,
  formularioDoCurso,
  lerFormularioDoCurso,
  SEM_CERTA,
} from "./edicao-do-curso";
import {
  aulaDeExemplo,
  documentoDeExemplo,
  EDICAO,
  perguntaDeExemplo,
  uuidDeExemplo,
} from "./exemplo";
import type {
  AlternativaId,
  AulaId,
  CursoId,
  ModuloId,
  PerguntaId,
  Versao,
} from "./tipos";

const { A1, CURSO } = EDICAO;

const documento = () => documentoDeExemplo("v1" as Versao);

const editar = (
  doc: DocumentoDoCurso,
  mudar: (d: DocumentoDoCurso) => DocumentoDoCurso
) => mudar(structuredClone(doc));

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

  test("devolve módulos por número, níveis por ordem e ids em minúscula, como o banco", () => {
    const d = documento();
    const doEditor = editar(d, (x) => {
      x.modulos.reverse();
      x.niveis.reverse();
      for (const m of x.modulos) {
        m.id = m.id.toUpperCase() as ModuloId;
        for (const a of m.aulas) {
          a.id = a.id.toUpperCase() as AulaId;
        }
      }
      return { ...x, id: x.id.toUpperCase() as CursoId };
    });
    expect(documentoDoCurso.parse(doEditor)).toEqual(d);
  });

  test("o mesmo id em caixas diferentes é repetido", () => {
    const d = editar(documento(), (x) => {
      x.modulos[1]?.aulas.push(
        aulaDeExemplo(A1.toUpperCase() as AulaId, "Cópia")
      );
      return x;
    });
    expect(erros(d)).toEqual([`Aula ${A1} aparece duas vezes.`]);
  });

  test("recusa número de módulo, id e ordem de nível repetidos", () => {
    const d = documento();
    const ruim = editar(d, (x) => {
      const [m1, m2] = x.modulos;
      if (m1 && m2) {
        m2.numero = m1.numero;
        m2.aulas.push(aulaDeExemplo(A1, "Cópia"));
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

  test("cada id repetido aparece uma vez, por mais cópias que tenha", () => {
    const d = editar(documento(), (x) => {
      x.modulos[1]?.aulas.push(
        aulaDeExemplo(A1, "Cópia 1"),
        aulaDeExemplo(A1, "Cópia 2"),
        aulaDeExemplo(uuidDeExemplo(99) as AulaId, "Única")
      );
      return x;
    });
    expect(erros(d)).toEqual([`Aula ${A1} aparece duas vezes.`]);
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

  test("descrições e tópicos são aparados, e a descrição vazia passa", () => {
    const d = editar(documento(), (x) => {
      const aula = x.modulos[0]?.aulas[0];
      if (aula) {
        aula.descricao = "  Como ligar a máquina.  ";
      }
      return { ...x, descricao: "   ", topicos: ["  Ligar a máquina  "] };
    });
    const lido = documentoDoCurso.parse(d);
    expect([
      lido.descricao,
      lido.topicos,
      lido.modulos[0]?.aulas[0]?.descricao,
    ]).toEqual(["", ["Ligar a máquina"], "Como ligar a máquina."]);
  });

  test("aceita 10 tópicos de 120 caracteres e descrições de 2000", () => {
    const d = editar(documento(), (x) => {
      const aula = x.modulos[0]?.aulas[0];
      if (aula) {
        aula.descricao = "a".repeat(2000);
      }
      return {
        ...x,
        descricao: "b".repeat(2000),
        topicos: Array.from({ length: 10 }, () => "c".repeat(120)),
      };
    });
    expect(documentoDoCurso.safeParse(d).success).toBe(true);
  });

  test("recusa o 11º tópico, o tópico vazio, o tópico longo e a descrição longa", () => {
    const caminhos = (mudar: (x: DocumentoDoCurso) => DocumentoDoCurso) =>
      documentoDoCurso
        .safeParse(editar(documento(), mudar))
        .error?.issues.map((i) => i.path.join(".")) ?? [];
    expect([
      caminhos((x) => ({
        ...x,
        topicos: Array.from({ length: 11 }, () => "t"),
      })),
      caminhos((x) => ({ ...x, topicos: ["Envase", "  "] })),
      caminhos((x) => ({ ...x, topicos: ["c".repeat(121)] })),
      caminhos((x) => ({ ...x, descricao: "b".repeat(2001) })),
      caminhos((x) => {
        const aula = x.modulos[1]?.aulas[0];
        if (aula) {
          aula.descricao = "a".repeat(2001);
        }
        return x;
      }),
    ]).toEqual([
      ["topicos"],
      ["topicos.1"],
      ["topicos.0"],
      ["descricao"],
      ["modulos.1.aulas.0.descricao"],
    ]);
  });

  test("o documento do curso novo não passa sem alt, categoria e título", () => {
    const lido = documentoDoCurso.safeParse(edicaoDeCursoNovo(CURSO).documento);
    expect(lido.error?.issues.map((i) => i.path.join("."))).toEqual([
      "capaAlt",
      "categoriaId",
      "titulo",
    ]);
  });

  test("a categoria em maiúscula chega em minúscula, como o Postgres devolve", () => {
    const lido = documentoDoCurso.parse({
      ...documento(),
      categoriaId: EDICAO.CATEGORIA.toUpperCase(),
    });
    expect(lido.categoriaId).toBe(EDICAO.CATEGORIA);
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

  test("documento inválido sai com uma frase fixa, sem o texto do zod", () => {
    const d = editar(documento(), (x) => {
      const a = x.modulos[1]?.aulas[0];
      if (a) {
        a.titulo = "";
      }
      return x;
    });
    expect(lerFormularioDoCurso(formularioDoCurso(d, null))).toEqual({
      mensagem: "Documento inválido.",
      tipo: "invalido",
    });
  });

  test("sem documento ou com JSON quebrado é inválido", () => {
    const quebrado = new FormData();
    quebrado.set("documento", "{");
    expect(lerFormularioDoCurso(new FormData()).tipo).toBe("invalido");
    expect(lerFormularioDoCurso(quebrado).tipo).toBe("invalido");
  });
});

describe("questionário da aula", () => {
  const { P1, P1A, P1B } = EDICAO;
  const comPergunta = (
    mudar: (p: ReturnType<typeof perguntaDeExemplo>) => void = () => undefined
  ) =>
    editar(documento(), (x) => {
      const a1 = x.modulos[0]?.aulas[0];
      if (a1) {
        const p = perguntaDeExemplo(P1, [P1A, P1B]);
        mudar(p);
        a1.perguntas = [p];
      }
      return x;
    });
  const issues = (d: unknown) =>
    documentoDoCurso
      .safeParse(d)
      .error?.issues.map((i) => [i.path.join("."), i.message]) ?? [];
  const alternativa = (n: number) => ({
    certa: false,
    id: uuidDeExemplo(60 + n) as AlternativaId,
    texto: `Alternativa ${n}`,
  });

  test("aceita a pergunta com duas alternativas e uma certa, e a devolve igual", () => {
    const d = comPergunta();
    expect(documentoDoCurso.parse(d)).toEqual(d);
  });

  test("aceita 5 alternativas e 20 perguntas", () => {
    const d = comPergunta((p) => {
      p.alternativas.push(alternativa(1), alternativa(2), alternativa(3));
    });
    const a1 = d.modulos[0]?.aulas[0];
    if (a1) {
      a1.perguntas = Array.from({ length: 20 }, (_, i) => ({
        ...perguntaDeExemplo(uuidDeExemplo(100 + i) as PerguntaId, [
          uuidDeExemplo(200 + i) as AlternativaId,
          uuidDeExemplo(300 + i) as AlternativaId,
        ]),
      }));
    }
    expect(documentoDoCurso.safeParse(d).success).toBe(true);
  });

  test("recusa 1 alternativa, 6 alternativas, nenhuma certa e duas certas", () => {
    const base = "modulos.0.aulas.0.perguntas.0.alternativas";
    expect([
      issues(comPergunta((p) => p.alternativas.shift())),
      issues(
        comPergunta((p) =>
          p.alternativas.push(
            alternativa(1),
            alternativa(2),
            alternativa(3),
            alternativa(4)
          )
        )
      ).map(([caminho]) => caminho),
      issues(
        comPergunta((p) => {
          for (const a of p.alternativas) {
            a.certa = false;
          }
        })
      ),
      issues(
        comPergunta((p) => {
          for (const a of p.alternativas) {
            a.certa = true;
          }
        })
      ),
    ]).toEqual([
      [[base, "Too small: expected array to have >=2 items"]],
      [base],
      [[base, SEM_CERTA]],
      [[base, SEM_CERTA]],
    ]);
  });

  test("recusa enunciado vazio, enunciado de 501 e alternativa vazia ou de 201", () => {
    const caminhos = (
      mudar: (p: ReturnType<typeof perguntaDeExemplo>) => void
    ) => issues(comPergunta(mudar)).map(([caminho]) => caminho);
    expect([
      caminhos((p) => {
        p.enunciado = "  ";
      }),
      caminhos((p) => {
        p.enunciado = "e".repeat(501);
      }),
      caminhos((p) => {
        if (p.alternativas[0]) {
          p.alternativas[0].texto = "";
        }
      }),
      caminhos((p) => {
        if (p.alternativas[1]) {
          p.alternativas[1].texto = "a".repeat(201);
        }
      }),
    ]).toEqual([
      ["modulos.0.aulas.0.perguntas.0.enunciado"],
      ["modulos.0.aulas.0.perguntas.0.enunciado"],
      ["modulos.0.aulas.0.perguntas.0.alternativas.0.texto"],
      ["modulos.0.aulas.0.perguntas.0.alternativas.1.texto"],
    ]);
  });

  test("a 21ª pergunta é recusada na lista", () => {
    const d = comPergunta();
    const a1 = d.modulos[0]?.aulas[0];
    if (a1) {
      a1.perguntas = Array.from({ length: 21 }, (_, i) =>
        perguntaDeExemplo(uuidDeExemplo(100 + i) as PerguntaId, [
          uuidDeExemplo(200 + i) as AlternativaId,
          uuidDeExemplo(300 + i) as AlternativaId,
        ])
      );
    }
    expect(issues(d).map(([caminho]) => caminho)).toEqual([
      "modulos.0.aulas.0.perguntas",
    ]);
  });

  test("pergunta ou alternativa repetida em outra aula é recusada, também em outra caixa", () => {
    const d = comPergunta();
    const a3 = d.modulos[1]?.aulas[0];
    if (a3) {
      a3.perguntas = [
        perguntaDeExemplo(P1.toUpperCase() as PerguntaId, [
          uuidDeExemplo(70) as AlternativaId,
          P1B,
        ]),
      ];
    }
    expect(issues(d).map(([, mensagem]) => mensagem)).toEqual([
      `Pergunta ${P1} aparece duas vezes.`,
      `Alternativa ${P1B} aparece duas vezes.`,
    ]);
  });
});
