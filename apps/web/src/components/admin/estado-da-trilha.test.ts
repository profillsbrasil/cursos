import { describe, expect, test } from "bun:test";
import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import {
  type DocumentoDaTrilha,
  LIMITES_DA_TRILHA,
} from "@cursos/api/dominio/edicao-da-trilha";
import { uuidDeExemplo } from "@cursos/api/dominio/exemplo";
import type { CursoId, TrilhaId, Versao } from "@cursos/api/dominio/tipos";

import {
  candidatos,
  focoDepois,
  ID_DA_TRILHA,
  lerRascunhoDaTrilha,
  linhasDaLista,
  type MudancaDaTrilha,
  mesmoRascunho,
  mudarTrilha,
  perdas,
  problemasNaTela,
  type RascunhoDaTrilha,
  rascunhoDaTrilha,
  recusaDaTrilha,
  textoDaBusca,
} from "./estado-da-trilha";
import { fraseDeReserva } from "./problemas";

const curso = (n: number) => uuidDeExemplo(100 + n) as CursoId;
const [A, B, C, D] = [curso(1), curso(2), curso(3), curso(4)];
const TRILHA = uuidDeExemplo(900) as TrilhaId;
const OUTRA = uuidDeExemplo(901) as TrilhaId;

describe("perdas", () => {
  const [E, F, G] = [curso(201), curso(202), curso(203)];
  const catalogo: CursoNaVisao[] = [
    {
      aulas: 1,
      id: E,
      precoTroca: null,
      status: "publicado",
      titulo: "Envasadora",
      trilha: null,
    },
    {
      aulas: 1,
      id: F,
      precoTroca: null,
      status: "publicado",
      titulo: "Fardos",
      trilha: null,
    },
  ];
  const uso = {
    comecaramSoPelaTrilha: [
      { cursoId: E, pessoas: 2 },
      { cursoId: F, pessoas: 0 },
    ],
  };
  const de = (cursos: CursoId[], salvo: CursoId[] = [E, F, G]) =>
    perdas({
      catalogo,
      rascunho: { cursos, descricao: "", slug: "", tirados: [], titulo: "" },
      salvo,
      uso,
    });

  test("só os tirados, na ordem salva, com o número do servidor", () => {
    expect(de([F])).toEqual([
      { cursoId: E, pessoas: 2, titulo: "Envasadora" },
      { cursoId: G, pessoas: null, titulo: "Curso apagado do catálogo" },
    ]);
  });

  test("reordenar e acrescentar não são perda", () => {
    expect(de([G, F, E])).toEqual([]);
    expect(de([E, F, G, curso(9)])).toEqual([]);
  });

  test("curso sem número do servidor fica sem número, não com zero", () => {
    expect(de([], [curso(8)])).toEqual([
      {
        cursoId: curso(8),
        pessoas: null,
        titulo: "Curso apagado do catálogo",
      },
    ]);
  });
});

describe("textoDaBusca", () => {
  test("escolher um curso da lista limpa a busca, em vez de guardar o título", () => {
    expect(textoDaBusca("Envasadora volumétrica", "item-press")).toBe("");
  });

  test("o que o admin digita ou apaga fica", () => {
    expect(textoDaBusca("envas", "input-change")).toBe("envas");
    expect(textoDaBusca("", "input-clear")).toBe("");
  });
});

const documento = (o: Partial<DocumentoDaTrilha> = {}): DocumentoDaTrilha => ({
  cursos: [A, B, C],
  descricao: "Do posto à máquina.",
  id: TRILHA,
  slug: "operador",
  titulo: "Operador",
  versao: "v1" as Versao,
  ...o,
});
const rascunho = (o: Partial<RascunhoDaTrilha> = {}) => ({
  ...rascunhoDaTrilha(documento()),
  ...o,
});

describe("mover pelo id", () => {
  test("subir e descer trocam o curso com o vizinho", () => {
    const r = rascunho();
    expect(
      mudarTrilha(r, { direcao: "acima", id: B, tipo: "curso_movido" }).cursos
    ).toEqual([B, A, C]);
    expect(
      mudarTrilha(r, { direcao: "abaixo", id: B, tipo: "curso_movido" }).cursos
    ).toEqual([A, C, B]);
  });

  test("na borda e com id ausente o rascunho fica o mesmo", () => {
    const r = rascunho();
    expect(
      mudarTrilha(r, { direcao: "acima", id: A, tipo: "curso_movido" })
    ).toBe(r);
    expect(
      mudarTrilha(r, { direcao: "abaixo", id: C, tipo: "curso_movido" })
    ).toBe(r);
    expect(
      mudarTrilha(r, { direcao: "acima", id: D, tipo: "curso_movido" })
    ).toBe(r);
  });
});

describe("acrescentar e tirar", () => {
  test("acrescentar põe no fim", () => {
    expect(
      mudarTrilha(rascunho(), { id: D, tipo: "curso_acrescentado" }).cursos
    ).toEqual([A, B, C, D]);
  });

  test("curso que já está na lista não entra de novo", () => {
    const r = rascunho();
    expect(mudarTrilha(r, { id: B, tipo: "curso_acrescentado" })).toBe(r);
  });

  test("a lista para no teto de cursos por trilha", () => {
    const cheia = rascunho({
      cursos: Array.from({ length: LIMITES_DA_TRILHA.cursos }, (_, i) =>
        curso(10 + i)
      ),
    });
    expect(mudarTrilha(cheia, { id: D, tipo: "curso_acrescentado" })).toBe(
      cheia
    );
  });

  test("tirar tira só o curso pedido; id ausente não muda nada", () => {
    const r = rascunho();
    expect(mudarTrilha(r, { id: B, tipo: "curso_tirado" }).cursos).toEqual([
      A,
      C,
    ]);
    expect(mudarTrilha(r, { id: D, tipo: "curso_tirado" })).toBe(r);
  });
});

describe("candidatos", () => {
  const visto = (
    id: CursoId,
    trilha: TrilhaId | null,
    titulo: string
  ): CursoNaVisao => ({
    aulas: 1,
    id,
    precoTroca: null,
    status: "publicado",
    titulo,
    trilha: trilha ? { id: trilha, posicao: 1, titulo: "T" } : null,
  });
  const catalogo = [
    visto(D, null, "Solto"),
    visto(B, TRILHA, "Na lista"),
    visto(C, TRILHA, "Tirado desta"),
    visto(curso(5), OUTRA, "De outra trilha"),
  ];

  test("fora da lista, soltos ou desta trilha, na ordem do catálogo", () => {
    const r = rascunho({ cursos: [A, B] });
    expect(candidatos(catalogo, r, TRILHA).map((c) => c.titulo)).toEqual([
      "Solto",
      "Tirado desta",
    ]);
  });
});

describe("focoDepois", () => {
  const r = rascunho();
  const movido = (id: CursoId, direcao: "acima" | "abaixo") =>
    focoDepois(r, { direcao, id, tipo: "curso_movido" }, []);

  test("mover no meio fica na mesma seta; chegar à borda passa para a outra", () => {
    expect(movido(C, "acima")).toBe(ID_DA_TRILHA.curso(C, "acima"));
    expect(movido(B, "acima")).toBe(ID_DA_TRILHA.curso(B, "abaixo"));
    expect(movido(A, "abaixo")).toBe(ID_DA_TRILHA.curso(A, "abaixo"));
    expect(movido(B, "abaixo")).toBe(ID_DA_TRILHA.curso(B, "acima"));
  });

  test("mover na borda não leva o foco a lugar nenhum", () => {
    expect(movido(A, "acima")).toBeNull();
  });

  test("tirar o que entrou neste rascunho leva ao Tirar seguinte, ao anterior no último e à busca no único", () => {
    expect(focoDepois(r, { id: A, tipo: "curso_tirado" }, [])).toBe(
      ID_DA_TRILHA.curso(B, "tirar")
    );
    expect(focoDepois(r, { id: C, tipo: "curso_tirado" }, [])).toBe(
      ID_DA_TRILHA.curso(B, "tirar")
    );
    expect(
      focoDepois(rascunho({ cursos: [A] }), { id: A, tipo: "curso_tirado" }, [])
    ).toBe(ID_DA_TRILHA.acrescentar);
  });

  test("tirar um curso salvo leva ao Desfazer da linha riscada, e desfazer volta ao Tirar", () => {
    expect(focoDepois(r, { id: B, tipo: "curso_tirado" }, [A, B, C])).toBe(
      ID_DA_TRILHA.curso(B, "desfazer")
    );
    const tirado = mudarTrilha(r, { id: B, tipo: "curso_tirado" });
    expect(
      focoDepois(tirado, { id: B, tipo: "curso_devolvido" }, [A, B, C])
    ).toBe(ID_DA_TRILHA.curso(B, "tirar"));
  });
});

describe("linha riscada e Desfazer", () => {
  const SALVO = [A, B, C, D];
  const de = (...mudancas: MudancaDaTrilha[]) =>
    mudancas.reduce(mudarTrilha, rascunho({ cursos: SALVO }));
  const linhas = (r: RascunhoDaTrilha) =>
    linhasDaLista(r, SALVO).map((l) =>
      l.tipo === "curso" ? `${l.posicao}:${l.id}` : `~${l.id}`
    );

  test("o curso tirado fica no lugar dele, riscado, e os outros renumeram", () => {
    expect(linhas(de({ id: B, tipo: "curso_tirado" }))).toEqual([
      `1:${A}`,
      `~${B}`,
      `2:${C}`,
      `3:${D}`,
    ]);
  });

  test("desfazer devolve o curso à posição de antes, em qualquer ordem", () => {
    const doisTirados = de(
      { id: B, tipo: "curso_tirado" },
      { id: D, tipo: "curso_tirado" }
    );
    expect(linhas(doisTirados)).toEqual([`1:${A}`, `~${B}`, `2:${C}`, `~${D}`]);
    expect(
      mudarTrilha(doisTirados, { id: B, tipo: "curso_devolvido" }).cursos
    ).toEqual([A, B, C]);
    expect(
      mudarTrilha(doisTirados, { id: D, tipo: "curso_devolvido" }).cursos
    ).toEqual([A, C, D]);
    const vizinhos = de(
      { id: C, tipo: "curso_tirado" },
      { id: B, tipo: "curso_tirado" }
    );
    expect(linhas(vizinhos)).toEqual([`1:${A}`, `~${B}`, `~${C}`, `2:${D}`]);
    expect(
      mudarTrilha(vizinhos, { id: C, tipo: "curso_devolvido" }).cursos
    ).toEqual([A, C, D]);
  });

  test("desfazer tudo volta ao rascunho limpo", () => {
    const r = de(
      { id: A, tipo: "curso_tirado" },
      { id: C, tipo: "curso_tirado" },
      { id: A, tipo: "curso_devolvido" },
      { id: C, tipo: "curso_devolvido" }
    );
    expect(r.cursos).toEqual(SALVO);
    expect(r.tirados).toEqual([]);
    expect(mesmoRascunho(r, rascunho({ cursos: SALVO }))).toBe(true);
  });

  test("o tirado acompanha o curso que vinha depois dele quando a lista muda de ordem", () => {
    const r = de(
      { id: B, tipo: "curso_tirado" },
      { direcao: "abaixo", id: C, tipo: "curso_movido" }
    );
    expect(linhas(r)).toEqual([`1:${A}`, `2:${D}`, `~${B}`, `3:${C}`]);
    expect(mudarTrilha(r, { id: B, tipo: "curso_devolvido" }).cursos).toEqual([
      A,
      D,
      B,
      C,
    ]);
  });

  test("curso que entrou e saiu neste rascunho não vira linha riscada", () => {
    const novo = curso(9);
    const r = de(
      { id: novo, tipo: "curso_acrescentado" },
      { id: novo, tipo: "curso_tirado" }
    );
    expect(linhas(r)).toEqual([`1:${A}`, `2:${B}`, `3:${C}`, `4:${D}`]);
  });

  test("acrescentar pela busca um curso tirado tira a linha riscada", () => {
    const r = de(
      { id: B, tipo: "curso_tirado" },
      { id: B, tipo: "curso_acrescentado" }
    );
    expect(r.tirados).toEqual([]);
    expect(linhas(r)).toEqual([`1:${A}`, `2:${C}`, `3:${D}`, `4:${B}`]);
  });
});

describe("lerRascunhoDaTrilha: toda recusa do schema aparece", () => {
  const SALVO = { id: TRILHA, versao: "v1" as Versao };
  const problemas = (
    r: RascunhoDaTrilha,
    salvo: { id: TrilhaId; versao: Versao | null } = SALVO
  ) => {
    const lido = lerRascunhoDaTrilha(r, salvo);
    if (lido.tipo !== "problemas") {
      throw new Error("o schema aceitou o rascunho");
    }
    return lido.problemas;
  };

  test("o rascunho válido vira o documento com o id e a versão do apoio", () => {
    expect(lerRascunhoDaTrilha(rascunho(), SALVO)).toEqual({
      documento: documento(),
      tipo: "lido",
    });
  });

  test("campos de texto marcam o campo, com a frase do problema", () => {
    expect(problemas(rascunho({ titulo: "   " }))).toEqual([
      { campo: ID_DA_TRILHA.campo("titulo"), mensagem: "Preencha este campo." },
    ]);
    expect(problemas(rascunho({ slug: "" }))).toEqual([
      {
        campo: ID_DA_TRILHA.campo("slug"),
        mensagem: "Use letras minúsculas, números e hífen, sem espaço.",
      },
    ]);
    expect(problemas(rascunho({ slug: "fabrica e montagem" }))[0]?.campo).toBe(
      ID_DA_TRILHA.campo("slug")
    );
    expect(
      problemas(
        rascunho({ descricao: "a".repeat(LIMITES_DA_TRILHA.descricao + 1) })
      )
    ).toEqual([
      {
        campo: ID_DA_TRILHA.campo("descricao"),
        mensagem: "Use até 600 caracteres.",
      },
    ]);
  });

  test("lista acima do teto marca a seção dos cursos e diz quantos tirar", () => {
    const cursos = Array.from(
      { length: LIMITES_DA_TRILHA.cursos + 2 },
      (_, i) => curso(10 + i)
    );
    expect(problemas(rascunho({ cursos }))).toEqual([
      {
        campo: ID_DA_TRILHA.cursos,
        mensagem: "Uma trilha tem no máximo 100 cursos. Tire 2 para salvar.",
      },
    ]);
  });

  test("curso repetido diz as duas posições", () => {
    expect(problemas(rascunho({ cursos: [A, B, A] }))).toEqual([
      {
        campo: ID_DA_TRILHA.cursos,
        mensagem: "O 3º curso da lista repete o 1º. Tire um deles.",
      },
    ]);
  });

  test("curso com identificador fora do formato diz a posição", () => {
    expect(
      problemas(rascunho({ cursos: [A, "nao-e-uuid" as CursoId] }))
    ).toEqual([
      {
        campo: ID_DA_TRILHA.cursos,
        mensagem:
          "O 2º curso da lista tem um identificador que o servidor recusa. Tire-o da trilha e salve de novo.",
      },
    ]);
  });

  test("recusa fora do que a tela mostra vira a frase de reserva", () => {
    expect(
      problemas(rascunho(), { id: "nao-e-uuid" as TrilhaId, versao: null })
    ).toEqual([{ campo: null, mensagem: fraseDeReserva("A trilha", ["id"]) }]);
  });
});

describe("problemasNaTela", () => {
  const SALVO = { id: TRILHA, versao: "v1" as Versao };
  const RECUSA = {
    campo: ID_DA_TRILHA.campo("slug"),
    mensagem: "Outra trilha já usa este endereço.",
  };

  test("os problemas da leitura só aparecem depois de tentar salvar", () => {
    const r = rascunho({ titulo: "" });
    const lido = lerRascunhoDaTrilha(r, SALVO);
    const na = (tentou: boolean) =>
      problemasNaTela({ lido, rascunho: r, recusa: null, tentou });
    expect(na(false)).toEqual([]);
    expect(na(true).map((p) => p.campo)).toEqual([
      ID_DA_TRILHA.campo("titulo"),
    ]);
  });

  test("o endereço recusado pelo servidor fica marcado até mudar", () => {
    const r = rascunho();
    const lido = lerRascunhoDaTrilha(r, SALVO);
    const recusa = recusaDaTrilha("slug_repetido", r);
    expect(
      problemasNaTela({ lido, rascunho: r, recusa, tentou: false })
    ).toEqual([RECUSA]);
    const mudado = rascunho({ slug: "operador-2" });
    expect(
      problemasNaTela({
        lido: lerRascunhoDaTrilha(mudado, SALVO),
        rascunho: mudado,
        recusa,
        tentou: false,
      })
    ).toEqual([]);
    expect(recusaDaTrilha("versao_mudou", r)).toBeNull();
  });
});
