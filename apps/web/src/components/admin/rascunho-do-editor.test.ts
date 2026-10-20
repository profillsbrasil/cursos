import { describe, expect, test } from "bun:test";
import type { Motivo } from "@cursos/api";
import {
  type DocumentoDoCurso,
  documentoDoCurso,
  SEM_CERTA,
} from "@cursos/api/dominio/edicao-do-curso";
import {
  documentoDeExemplo,
  EDICAO,
  uuidDeExemplo,
} from "@cursos/api/dominio/exemplo";
import type {
  AlternativaId,
  AulaId,
  CategoriaId,
  ModuloId,
  PerguntaId,
  Versao,
} from "@cursos/api/dominio/tipos";
import { errosPorCampo } from "./problemas";
import {
  ID,
  lerNumeroDoModulo,
  lerPreco,
  lerRascunho as lerRascunhoSalvo,
  MINIMO_DE_ALTERNATIVAS,
  mesmoRascunho,
  type RascunhoDoCurso,
  rascunhoDoCurso,
} from "./rascunho-do-curso";
import {
  type AcaoDoEditor,
  aulaEscolhida,
  blocoDoModulo,
  type Envio,
  errosNaAula,
  errosNaPergunta,
  type Mudanca,
  mudar,
  NADA_ESCOLHIDO,
  NENHUM_ABERTO,
  perguntaEscolhida,
  proximaOrdem,
  type RascunhoDoEditor,
  rascunhoDoEditor,
  rascunhoDoEditorEm,
  telaDo,
} from "./rascunho-do-editor";

const lerRascunho = (r: RascunhoDoCurso) =>
  lerRascunhoSalvo(r, { versao: null });

const { A1, A2, A3, M1, M2 } = EDICAO;
const M3 = uuidDeExemplo(13) as ModuloId;
const A4 = uuidDeExemplo(24) as AulaId;

const exemplo = () => rascunhoDoCurso(documentoDeExemplo());

const aplicar = (r: RascunhoDoCurso, ...mudancas: Mudanca[]) =>
  mudancas.reduce(mudar, r);

const ordem = (r: RascunhoDoCurso) =>
  r.modulos.map((m) => [m.numero, m.titulo, m.aulas.map((a) => a.titulo)]);

const aula = (r: RascunhoDoCurso, id: AulaId) =>
  r.modulos.flatMap((m) => m.aulas).find((a) => a.id === id);

const problemas = (r: RascunhoDoCurso) => {
  const lido = lerRascunho(r);
  return lido.tipo === "problemas" ? lido.problemas : [];
};

const V1 = "v1" as Versao;

const documento = (o: Partial<DocumentoDoCurso> = {}): DocumentoDoCurso => ({
  ...documentoDeExemplo(V1),
  ...o,
});

const editor = (d: DocumentoDoCurso = documento()) => rascunhoDoEditorEm(d);

const fazer = (e: RascunhoDoEditor, ...acoes: AcaoDoEditor[]) =>
  acoes.reduce(rascunhoDoEditor, e);

const envioDe = (e: RascunhoDoEditor): Envio => {
  const { envio } = telaDo(e);
  if (envio === null) {
    throw new Error("o rascunho devia ler");
  }
  return envio;
};

const blocos = (e: RascunhoDoEditor) => {
  const { erros } = telaDo(e);
  return e.rascunho.modulos.map((m) => blocoDoModulo(m, e.abertos, erros));
};

const estados = (e: RascunhoDoEditor) => blocos(e).map((b) => b.tipo);

const saiu = (id: string): AcaoDoEditor => ({ id, tipo: "saiu_do_campo" });

/** A aula que o painel do primeiro módulo mostra e a pergunta da aula pedida. */
const painel = (e: RascunhoDoEditor, aulaId: AulaId) => {
  const [m1] = e.rascunho.modulos;
  const a = aula(e.rascunho, aulaId);
  return [
    m1 ? aulaEscolhida(m1, e.escolhas)?.id : null,
    a ? perguntaEscolhida(a, e.escolhas)?.id : null,
  ];
};

describe("campos do curso", () => {
  test("muda só os campos pedidos", () => {
    const r = aplicar(exemplo(), {
      mudanca: { descricao: "Nova", precoTroca: "300" },
      tipo: "campos",
    });
    expect(r.precoTroca).toBe("300");
    expect(r.descricao).toBe("Nova");
    expect(r.titulo).toBe("Curso");
    expect(ordem(r)).toEqual(ordem(exemplo()));
  });
});

describe("níveis", () => {
  test("o nível novo entra com a ordem que o componente mandou, e renomear muda só o nome", () => {
    const base = exemplo();
    const r = aplicar(
      base,
      { ordem: proximaOrdem(base.niveis), tipo: "nivel_novo" },
      { nome: "Especialista", ordem: 3, tipo: "nivel_renomeado" },
      { nome: "Intermediário", ordem: 2, tipo: "nivel_renomeado" }
    );
    expect(r.niveis).toEqual([
      { nome: "Básico", ordem: 1 },
      { nome: "Intermediário", ordem: 2 },
      { nome: "Especialista", ordem: 3 },
    ]);
  });

  test("no curso sem nível, o primeiro é o 1", () => {
    expect(proximaOrdem([])).toBe(1);
  });

  test("remover um nível deixa sem nível os módulos que o usavam", () => {
    const r = mudar(exemplo(), { ordem: 1, tipo: "nivel_removido" });
    expect(r.niveis).toEqual([{ nome: "Avançado", ordem: 2 }]);
    expect(r.modulos.map((m) => m.nivelOrdem)).toEqual([null, 2]);
  });
});

describe("módulos", () => {
  test("o módulo novo vem no fim, com o maior número mais 1", () => {
    const r = mudar(exemplo(), { id: M3, tipo: "modulo_novo" });
    expect(r.modulos.at(-1)).toEqual({
      aulas: [],
      id: M3,
      nivelOrdem: null,
      numero: "2",
      titulo: "",
    });
  });

  test("o primeiro módulo de um curso novo é o 1", () => {
    const vazio = { ...exemplo(), modulos: [] };
    expect(
      mudar(vazio, { id: M3, tipo: "modulo_novo" }).modulos[0]?.numero
    ).toBe("1");
  });

  test("mudar o número não move o módulo até a lista ser ordenada", () => {
    const r = aplicar(
      exemplo(),
      { id: M1, mudanca: { titulo: "Abertura" }, tipo: "modulo_editado" },
      { id: M1, mudanca: { numero: "5" }, tipo: "modulo_editado" }
    );
    expect(ordem(r)).toEqual([
      ["5", "Abertura", ["Aula 1", "Aula 2"]],
      ["1", "Módulo um", ["Aula 3"]],
    ]);
    expect(ordem(mudar(r, { tipo: "modulos_ordenados" }))).toEqual([
      ["1", "Módulo um", ["Aula 3"]],
      ["5", "Abertura", ["Aula 1", "Aula 2"]],
    ]);
  });

  test("número que não lê fica com o texto e vai para o fim ao ordenar", () => {
    const r = aplicar(
      exemplo(),
      { id: M1, mudanca: { numero: "1e3" }, tipo: "modulo_editado" },
      { tipo: "modulos_ordenados" }
    );
    expect(ordem(r).map(([n]) => n)).toEqual(["1", "1e3"]);
  });

  test("subir e descer trocam o lugar e o número com o vizinho", () => {
    const desceu = mudar(exemplo(), {
      direcao: "abaixo",
      id: M1,
      tipo: "modulo_movido",
    });
    expect(ordem(desceu)).toEqual([
      ["0", "Módulo um", ["Aula 3"]],
      ["1", "Módulo zero", ["Aula 1", "Aula 2"]],
    ]);
    const subiu = mudar(desceu, {
      direcao: "acima",
      id: M1,
      tipo: "modulo_movido",
    });
    expect(ordem(subiu)).toEqual(ordem(exemplo()));
  });

  test("no topo e no fim o módulo não se move", () => {
    const r = exemplo();
    expect(mudar(r, { direcao: "acima", id: M1, tipo: "modulo_movido" })).toBe(
      r
    );
    expect(mudar(r, { direcao: "abaixo", id: M2, tipo: "modulo_movido" })).toBe(
      r
    );
  });

  test("remover o módulo leva as aulas dele", () => {
    const r = mudar(exemplo(), { id: M1, tipo: "modulo_removido" });
    expect(ordem(r)).toEqual([["1", "Módulo um", ["Aula 3"]]]);
  });
});

describe("aulas", () => {
  test("a aula nova vem no fim do módulo, vazia", () => {
    const r = mudar(exemplo(), { id: A4, moduloId: M2, tipo: "aula_nova" });
    expect(r.modulos[1]?.aulas.map((a) => a.id)).toEqual([A3, A4]);
    expect(r.modulos[1]?.aulas[1]).toEqual({
      descricao: "",
      duracao: "",
      id: A4,
      perguntas: [],
      titulo: "",
      video: "",
    });
  });

  test("editar muda só a aula pedida", () => {
    const r = mudar(exemplo(), {
      id: A2,
      mudanca: { duracao: "12:34", titulo: "Ajuste da válvula" },
      tipo: "aula_editada",
    });
    expect(r.modulos[0]?.aulas).toEqual([
      {
        descricao: "",
        duracao: "05:00",
        id: A1,
        perguntas: [],
        titulo: "Aula 1",
        video: "",
      },
      {
        descricao: "",
        duracao: "12:34",
        id: A2,
        perguntas: [],
        titulo: "Ajuste da válvula",
        video: "",
      },
    ]);
  });

  test("subir e descer trocam a aula com a vizinha do mesmo módulo", () => {
    const r = mudar(exemplo(), {
      direcao: "abaixo",
      id: A1,
      tipo: "aula_movida",
    });
    expect(ordem(r)[0]).toEqual(["0", "Módulo zero", ["Aula 2", "Aula 1"]]);
    expect(
      ordem(mudar(r, { direcao: "acima", id: A1, tipo: "aula_movida" }))
    ).toEqual(ordem(exemplo()));
  });

  test("no topo e no fim do módulo a aula não passa para o vizinho", () => {
    const r = exemplo();
    expect(mudar(r, { direcao: "acima", id: A1, tipo: "aula_movida" })).toBe(r);
    expect(mudar(r, { direcao: "abaixo", id: A2, tipo: "aula_movida" })).toBe(
      r
    );
    expect(mudar(r, { direcao: "acima", id: A3, tipo: "aula_movida" })).toBe(r);
  });

  test("mover para outro módulo leva a aula, com o mesmo id, para o fim dele", () => {
    const r = mudar(exemplo(), {
      id: A1,
      moduloId: M2,
      tipo: "aula_para_modulo",
    });
    expect(ordem(r)).toEqual([
      ["0", "Módulo zero", ["Aula 2"]],
      ["1", "Módulo um", ["Aula 3", "Aula 1"]],
    ]);
    expect(r.modulos[1]?.aulas[1]?.id).toBe(A1);
  });

  test("mover a aula com a duração inválida não perde o texto digitado", () => {
    const r = aplicar(
      exemplo(),
      {
        id: A1,
        mudanca: { duracao: "12:3", video: "youtu.be/x" },
        tipo: "aula_editada",
      },
      { id: A1, moduloId: M2, tipo: "aula_para_modulo" },
      { direcao: "acima", id: A1, tipo: "aula_movida" },
      { direcao: "acima", id: M2, tipo: "modulo_movido" }
    );
    expect(aula(r, A1)).toEqual({
      descricao: "",
      duracao: "12:3",
      id: A1,
      perguntas: [],
      titulo: "Aula 1",
      video: "youtu.be/x",
    });
    expect(problemas(r)).toContainEqual({
      campo: ID.aula(A1, "duracao"),
      mensagem: "Escreva a duração em mm:ss, como 12:30.",
    });
  });

  test("mover para o próprio módulo ou para um que não existe não muda nada", () => {
    const r = exemplo();
    expect(mudar(r, { id: A1, moduloId: M1, tipo: "aula_para_modulo" })).toBe(
      r
    );
    expect(mudar(r, { id: A1, moduloId: M3, tipo: "aula_para_modulo" })).toBe(
      r
    );
  });

  test("remover tira só a aula pedida", () => {
    const r = mudar(exemplo(), { id: A1, tipo: "aula_removida" });
    expect(ordem(r)[0]).toEqual(["0", "Módulo zero", ["Aula 2"]]);
  });
});

describe("campos lidos", () => {
  test("inteiro só com algarismos: 1e6, 0x10 e espaço não leem", () => {
    for (const texto of ["1e6", "0x10", " ", "", "1.5", "-1"]) {
      expect(lerPreco(texto)).toEqual({
        erro: "Use um preço de 1 a 1.000.000 pontos.",
      });
    }
    expect(lerPreco(" 300 ")).toEqual({ valor: 300 });
    expect(lerNumeroDoModulo("0x10")).toEqual({
      erro: "Use um número de 0 a 999.",
    });
    expect(lerNumeroDoModulo("0")).toEqual({ valor: 0 });
  });

  test("duração acima de 24 horas aponta o teto", () => {
    const r = mudar(exemplo(), {
      id: A1,
      mudanca: { duracao: "24:00:01" },
      tipo: "aula_editada",
    });
    expect(problemas(r)).toEqual([
      {
        campo: ID.aula(A1, "duracao"),
        mensagem: "Uma aula tem no máximo 24 horas.",
      },
    ]);
  });
});

describe("lerRascunho: toda recusa do schema aparece", () => {
  test("texto só com espaços marca o campo dele", () => {
    const r = aplicar(
      exemplo(),
      { mudanca: { titulo: "   " }, tipo: "campos" },
      { id: A3, mudanca: { titulo: " " }, tipo: "aula_editada" },
      { id: M1, mudanca: { titulo: "\t" }, tipo: "modulo_editado" },
      { nome: "  ", ordem: 2, tipo: "nivel_renomeado" }
    );
    expect(problemas(r)).toEqual([
      { campo: ID.modulo(M1, "titulo"), mensagem: "Preencha este campo." },
      { campo: ID.aula(A3, "titulo"), mensagem: "Preencha este campo." },
      { campo: ID.nivel(2), mensagem: "Preencha este campo." },
      { campo: ID.curso("titulo"), mensagem: "Preencha este campo." },
    ]);
  });

  test("curso sem categoria marca o select da categoria", () => {
    const r = mudar(exemplo(), {
      mudanca: { categoriaId: "" as CategoriaId },
      tipo: "campos",
    });
    expect(problemas(r)).toEqual([
      { campo: ID.curso("categoriaId"), mensagem: "Escolha a categoria." },
    ]);
  });

  test("regra entre módulos vira frase, sem campo", () => {
    const r = mudar(exemplo(), {
      id: M2,
      mudanca: { numero: "0" },
      tipo: "modulo_editado",
    });
    expect(problemas(r)).toEqual([
      { campo: null, mensagem: "Dois módulos com o número 0." },
    ]);
  });

  test("lista acima do teto vira frase com o número", () => {
    const muitos = Array.from({ length: 51 }, (_, i) => ({
      nome: `N${i + 1}`,
      ordem: i + 1,
    }));
    const r = { ...exemplo(), niveis: muitos };
    expect(problemas(r)).toContainEqual({
      campo: null,
      mensagem: "O limite é de 50 níveis.",
    });
  });

  test("número inválido marca só o campo, sem acusar número repetido", () => {
    const r = aplicar(
      exemplo(),
      { id: M1, mudanca: { numero: "x" }, tipo: "modulo_editado" },
      { id: M2, mudanca: { numero: "" }, tipo: "modulo_editado" }
    );
    expect(problemas(r)).toEqual([
      { campo: ID.modulo(M1, "numero"), mensagem: "Use um número de 0 a 999." },
      { campo: ID.modulo(M2, "numero"), mensagem: "Use um número de 0 a 999." },
    ]);
  });
});

test("o rascunho editado vira um documento que passa no schema do servidor", () => {
  const r = aplicar(
    exemplo(),
    { id: M3, tipo: "modulo_novo" },
    { id: M3, mudanca: { titulo: "Manutenção" }, tipo: "modulo_editado" },
    { id: A4, moduloId: M3, tipo: "aula_nova" },
    {
      id: A4,
      mudanca: {
        duracao: "10:10",
        titulo: "Troca do bico",
        video: "https://youtu.be/dQw4w9WgXcQ",
      },
      tipo: "aula_editada",
    },
    { id: A2, moduloId: M3, tipo: "aula_para_modulo" },
    { direcao: "acima", id: A2, tipo: "aula_movida" },
    { direcao: "acima", id: M3, tipo: "modulo_movido" },
    { ordem: 2, tipo: "nivel_removido" },
    { mudanca: { precoTroca: "300" }, tipo: "campos" }
  );
  const lido = lerRascunho(r);
  expect(lido.tipo).toBe("lido");
  const doc = lido.tipo === "lido" ? lido.documento : null;
  const servidor = documentoDoCurso.safeParse(doc);
  expect(servidor.success).toBe(true);
  expect(
    servidor.data?.modulos.map((m) => [
      m.numero,
      m.titulo,
      m.aulas.map((a) => [a.titulo, a.duracaoSeg, a.video?.id ?? null]),
    ])
  ).toEqual([
    [0, "Módulo zero", [["Aula 1", 300, null]]],
    [
      1,
      "Manutenção",
      [
        ["Aula 2", 300, null],
        ["Troca do bico", 610, "dQw4w9WgXcQ"],
      ],
    ],
    [2, "Módulo um", [["Aula 3", 300, null]]],
  ]);
  expect(servidor.data?.precoTroca).toBe(300);
});

test("salvar sem campo na tela devolve a descrição, os tópicos e a descrição da aula que o banco tinha", () => {
  const base = documentoDeExemplo();
  const [m0] = base.modulos;
  const salvo = {
    ...base,
    descricao: "Curso de envase.",
    modulos: [
      {
        ...m0,
        aulas: (m0?.aulas ?? []).map((a, i) =>
          i === 1 ? { ...a, descricao: "Como trocar o bico." } : a
        ),
      },
      ...base.modulos.slice(1),
    ],
    topicos: ["Ligar a máquina", "Dosar o volume"],
  } as typeof base;
  const r = aplicar(
    rascunhoDoCurso(salvo),
    { mudanca: { titulo: "Curso novo" }, tipo: "campos" },
    { direcao: "acima", id: A2, tipo: "aula_movida" },
    { id: A2, moduloId: M2, tipo: "aula_para_modulo" }
  );
  const lido = lerRascunho(r);
  const doc = lido.tipo === "lido" ? lido.documento : null;
  expect([
    doc?.descricao,
    doc?.topicos,
    doc?.modulos.flatMap((m) => m.aulas.map((a) => [a.titulo, a.descricao])),
  ]).toEqual([
    "Curso de envase.",
    ["Ligar a máquina", "Dosar o volume"],
    [
      ["Aula 1", ""],
      ["Aula 3", ""],
      ["Aula 2", "Como trocar o bico."],
    ],
  ]);
});

describe("blocos dos módulos", () => {
  test("com dois módulos ou mais, todo módulo começa fechado", () => {
    expect(estados(editor())).toEqual(["fechado", "fechado"]);
  });

  test("o curso de um módulo só abre com ele aberto, sem custar um clique", () => {
    const d = documento();
    expect(estados(editor({ ...d, modulos: d.modulos.slice(0, 1) }))).toEqual([
      "aberto",
    ]);
  });

  test("o cabeçalho e o índice abrem e fecham só o módulo pedido", () => {
    const e = fazer(
      editor(),
      { id: M1, tipo: "aberto" },
      { id: M2, tipo: "aberto" },
      { id: M1, tipo: "fechado" }
    );
    expect(estados(e)).toEqual(["fechado", "aberto"]);
  });

  test("o módulo novo já vem aberto, porque o foco vai para o título dele", () => {
    expect(estados(fazer(editor(), { id: M3, tipo: "modulo_novo" }))).toEqual([
      "fechado",
      "fechado",
      "aberto",
    ]);
  });

  test("mover uma aula para um módulo fechado abre o destino, e a origem continua aberta", () => {
    const e = fazer(
      editor(),
      { id: M1, tipo: "aberto" },
      { id: A1, moduloId: M2, tipo: "aula_para_modulo" }
    );
    expect(estados(e)).toEqual(["aberto", "aberto"]);
  });

  test("mudança dentro de um módulo não abre nem fecha nenhum bloco", () => {
    const aberto = fazer(editor(), { id: M1, tipo: "aberto" });
    const mudancas: Mudanca[] = [
      { id: A3, mudanca: { titulo: "Nova" }, tipo: "aula_editada" },
      { direcao: "abaixo", id: A1, tipo: "aula_movida" },
      { direcao: "abaixo", id: M1, tipo: "modulo_movido" },
      { tipo: "modulos_ordenados" },
      { id: A4, moduloId: M1, tipo: "aula_nova" },
      { id: A2, tipo: "aula_removida" },
    ];
    for (const mudanca of mudancas) {
      expect(fazer(aberto, mudanca).abertos).toBe(aberto.abertos);
    }
  });

  test("o módulo removido sai da lista de abertos", () => {
    const e = fazer(
      editor(),
      { id: M1, tipo: "aberto" },
      { id: M1, tipo: "modulo_removido" }
    );
    expect(e.abertos.size).toBe(0);
  });

  test("o módulo com campo marcado fica aberto mesmo fechado pelo admin, e conta os campos", () => {
    const erros = new Map([
      [ID.aula(A3, "duracao"), "Escreva a duração em mm:ss, como 12:30."],
      [ID.modulo(M2, "titulo"), "Preencha este campo."],
      [ID.curso("titulo"), "Preencha este campo."],
    ]);
    expect(
      exemplo().modulos.map((m) => blocoDoModulo(m, NENHUM_ABERTO, erros))
    ).toEqual([{ tipo: "fechado" }, { campos: 2, tipo: "com_erro" }]);
  });

  test("toda mudança chega ao rascunho e aos blocos", () => {
    const e = fazer(
      editor(),
      { id: M3, tipo: "modulo_novo" },
      { id: A1, moduloId: M2, tipo: "aula_para_modulo" }
    );
    expect(e.rascunho.modulos.map((m) => m.id)).toEqual([M1, M2, M3]);
    expect(estados(e)).toEqual(["fechado", "aberto", "aberto"]);
  });
});

describe("nenhum erro fica num bloco fechado", () => {
  const duracao = ID.aula(A3, "duracao");

  test("leitura: o campo que o admin deixou com erro abre e prende o bloco, que fica aberto depois da correção", () => {
    const digitado = fazer(editor(), {
      id: A3,
      mudanca: { duracao: "abc" },
      tipo: "aula_editada",
    });
    // Antes de sair do campo, nada marca.
    expect(blocos(digitado)).toEqual([
      { tipo: "fechado" },
      { tipo: "fechado" },
    ]);

    const deixado = fazer(digitado, { id: duracao, tipo: "saiu_do_campo" });
    expect(telaDo(deixado).erros.get(duracao)).toBe(
      "Escreva a duração em mm:ss, como 12:30."
    );
    expect(blocos(deixado)).toEqual([
      { tipo: "fechado" },
      { campos: 1, tipo: "com_erro" },
    ]);

    // Fechar pelo cabeçalho não tira o erro da tela.
    const fechado = fazer(deixado, { id: M2, tipo: "fechado" });
    expect(blocos(fechado)[1]).toEqual({ campos: 1, tipo: "com_erro" });

    const corrigido = fazer(fechado, {
      id: A3,
      mudanca: { duracao: "5:00" },
      tipo: "aula_editada",
    });
    expect(blocos(corrigido)).toEqual([
      { tipo: "fechado" },
      { tipo: "aberto" },
    ]);
  });

  test("leitura: depois do Salvar recusado, o erro de um módulo fechado abre o bloco", () => {
    const e = fazer(
      editor(),
      { id: A3, mudanca: { video: "não é vídeo" }, tipo: "aula_editada" },
      { tipo: "salvar" }
    );
    expect(e.abertos.has(M2)).toBe(true);
    expect(blocos(e)[1]).toEqual({ campos: 1, tipo: "com_erro" });
  });

  test("schema: o título vazio de um módulo fechado aparece no Salvar e abre o bloco", () => {
    const vazio = fazer(editor(), {
      id: M2,
      mudanca: { titulo: "" },
      tipo: "modulo_editado",
    });
    expect(blocos(vazio)[1]).toEqual({ tipo: "fechado" });
    const e = fazer(vazio, { tipo: "salvar" });
    expect(telaDo(e).erros.get(ID.modulo(M2, "titulo"))).toBe(
      "Preencha este campo."
    );
    expect(blocos(e)).toEqual([
      { tipo: "fechado" },
      { campos: 1, tipo: "com_erro" },
    ]);
  });
});

describe("questionário da aula", () => {
  const P1 = uuidDeExemplo(41) as PerguntaId;
  const P2 = uuidDeExemplo(42) as PerguntaId;
  const X1 = uuidDeExemplo(51) as AlternativaId;
  const X2 = uuidDeExemplo(52) as AlternativaId;
  const X3 = uuidDeExemplo(53) as AlternativaId;
  const Y1 = uuidDeExemplo(61) as AlternativaId;
  const Y2 = uuidDeExemplo(62) as AlternativaId;
  const nova = (
    aulaId: AulaId,
    id: PerguntaId,
    alternativas: [AlternativaId, AlternativaId]
  ): Mudanca => ({ alternativas, aulaId, id, tipo: "pergunta_nova" });
  const perguntas = (r: RascunhoDoCurso) => aula(r, A1)?.perguntas ?? [];
  const completa = (r: RascunhoDoCurso) =>
    aplicar(
      r,
      { enunciado: "Por onde começa?", id: P1, tipo: "pergunta_editada" },
      { id: X1, texto: "Pelo pedido", tipo: "alternativa_editada" },
      { id: X2, texto: "Pela data", tipo: "alternativa_editada" },
      { alternativaId: X2, perguntaId: P1, tipo: "certa_marcada" }
    );

  test("a pergunta nova nasce no fim da aula, com duas alternativas vazias e nenhuma certa", () => {
    const r = mudar(exemplo(), nova(A1, P1, [X1, X2]));
    expect(perguntas(r)).toEqual([
      {
        alternativas: [
          { certa: false, id: X1, texto: "" },
          { certa: false, id: X2, texto: "" },
        ],
        enunciado: "",
        id: P1,
      },
    ]);
    expect(aula(r, A2)?.perguntas).toEqual([]);
  });

  test("marcar a certa desmarca a outra; a alternativa nova entra até 5 e a tirada sai até 2", () => {
    const r = completa(mudar(exemplo(), nova(A1, P1, [X1, X2])));
    expect(perguntas(r)[0]?.alternativas.map((x) => x.certa)).toEqual([
      false,
      true,
    ]);
    const comTres = mudar(r, {
      id: X3,
      perguntaId: P1,
      tipo: "alternativa_nova",
    });
    expect(perguntas(comTres)[0]?.alternativas.map((x) => x.id)).toEqual([
      X1,
      X2,
      X3,
    ]);
    const cheia = [54, 55, 56].reduce(
      (acc, n) =>
        mudar(acc, {
          id: uuidDeExemplo(n) as AlternativaId,
          perguntaId: P1,
          tipo: "alternativa_nova",
        }),
      comTres
    );
    expect(perguntas(cheia)[0]?.alternativas.length).toBe(5);
    const semA = mudar(r, { id: X1, tipo: "alternativa_removida" });
    expect(semA).toEqual(r);
    const semC = mudar(comTres, { id: X2, tipo: "alternativa_removida" });
    expect(perguntas(semC)[0]?.alternativas).toEqual([
      { certa: false, id: X1, texto: "Pelo pedido" },
      { certa: false, id: X3, texto: "" },
    ]);
  });

  test("tirar a pergunta e desfazer a devolve ao mesmo lugar", () => {
    const r = aplicar(
      exemplo(),
      nova(A1, P1, [X1, X2]),
      nova(A1, P2, [Y1, Y2])
    );
    const [p1] = perguntas(r);
    if (!p1) {
      throw new Error("sem P1");
    }
    const tirada = mudar(r, { id: P1, tipo: "pergunta_removida" });
    expect(perguntas(tirada).map((p) => p.id)).toEqual([P2]);
    const devolvida = mudar(tirada, {
      aulaId: A1,
      indice: 0,
      pergunta: p1,
      tipo: "pergunta_restaurada",
    });
    expect(devolvida).toEqual(r);
  });

  test("a pergunta incompleta marca o enunciado, as alternativas vazias e o grupo sem certa", () => {
    const r = mudar(exemplo(), nova(A1, P1, [X1, X2]));
    expect(problemas(r)).toEqual([
      { campo: ID.alternativa(X1), mensagem: "Preencha este campo." },
      { campo: ID.alternativa(X2), mensagem: "Preencha este campo." },
      { campo: ID.pergunta(P1, "enunciado"), mensagem: "Preencha este campo." },
      { campo: ID.pergunta(P1, "alternativas"), mensagem: SEM_CERTA },
    ]);
    expect(problemas(completa(r))).toEqual([]);
  });

  test("uma alternativa só, vinda de fora do editor, marca o grupo com a regra do mínimo", () => {
    const r = completa(mudar(exemplo(), nova(A1, P1, [X1, X2])));
    const [p] = perguntas(r);
    const quebrado = {
      ...r,
      modulos: r.modulos.map((m) => ({
        ...m,
        aulas: m.aulas.map((a) =>
          a.id === A1 && p
            ? {
                ...a,
                perguntas: [{ ...p, alternativas: p.alternativas.slice(1) }],
              }
            : a
        ),
      })),
    };
    expect(problemas(quebrado)).toEqual([
      {
        campo: ID.pergunta(P1, "alternativas"),
        mensagem: MINIMO_DE_ALTERNATIVAS,
      },
    ]);
  });

  test("a lista de aulas e a de perguntas contam os campos marcados, e o módulo soma tudo", () => {
    const r = mudar(exemplo(), nova(A1, P1, [X1, X2]));
    const marcados = errosPorCampo(problemas(r));
    const a1 = aula(r, A1);
    const a2 = aula(r, A2);
    const [m1] = r.modulos;
    if (!(a1 && a2 && m1)) {
      throw new Error("sem o exemplo");
    }
    expect([
      errosNaAula(a1, marcados),
      errosNaAula(a2, marcados),
      errosNaPergunta(
        a1.perguntas[0] as NonNullable<(typeof a1.perguntas)[0]>,
        marcados
      ),
      blocoDoModulo(m1, NENHUM_ABERTO, marcados),
    ]).toEqual([4, 0, 4, { campos: 4, tipo: "com_erro" }]);
  });

  test("o grupo das letras conta como deixado quando o enunciado e todas as alternativas foram deixados", () => {
    const grupo = ID.pergunta(P1, "alternativas");
    const parcial = fazer(
      editor(),
      nova(A1, P1, [X1, X2]),
      saiu(ID.pergunta(P1, "enunciado")),
      saiu(ID.alternativa(X1))
    );
    expect(telaDo(parcial).erros.has(grupo)).toBe(false);
    const todos = fazer(parcial, saiu(ID.alternativa(X2)));
    expect(telaDo(todos).erros.get(grupo)).toBe(SEM_CERTA);
  });

  test("o painel mostra a primeira aula e a primeira pergunta até o admin escolher, e segue a nova e a restaurada", () => {
    const r = aplicar(
      exemplo(),
      nova(A1, P1, [X1, X2]),
      nova(A1, P2, [Y1, Y2])
    );
    const [m1] = r.modulos;
    const a1 = aula(r, A1);
    if (!(m1 && a1)) {
      throw new Error("sem o exemplo");
    }
    expect([
      aulaEscolhida(m1, NADA_ESCOLHIDO)?.id,
      perguntaEscolhida(a1, NADA_ESCOLHIDO)?.id,
    ]).toEqual([A1, P1]);

    const escolhido = fazer(
      editor(),
      nova(A1, P1, [X1, X2]),
      nova(A1, P2, [Y1, Y2]),
      { aulaId: A2, moduloId: M1, tipo: "aula_escolhida" },
      { aulaId: A1, perguntaId: P1, tipo: "pergunta_escolhida" }
    );
    expect(painel(escolhido, A1)).toEqual([A2, P1]);

    const P3 = uuidDeExemplo(43) as PerguntaId;
    const comNova = fazer(
      escolhido,
      nova(A1, P3, [
        uuidDeExemplo(71) as AlternativaId,
        uuidDeExemplo(72) as AlternativaId,
      ])
    );
    expect(painel(comNova, A1)[1]).toBe(P3);

    const [p1] = perguntas(comNova.rascunho);
    if (!p1) {
      throw new Error("sem P1");
    }
    const restaurada = fazer(
      comNova,
      { id: P1, tipo: "pergunta_removida" },
      { aulaId: A1, indice: 0, pergunta: p1, tipo: "pergunta_restaurada" }
    );
    expect(painel(restaurada, A1)[1]).toBe(P1);

    const comAula = fazer(restaurada, {
      id: A4,
      moduloId: M2,
      tipo: "aula_nova",
    });
    expect(comAula.escolhas.aulaPorModulo.get(M2)).toBe(A4);
    expect(aulaEscolhida({ ...m1, aulas: [a1] }, escolhido.escolhas)?.id).toBe(
      A1
    );
  });

  test("o Salvar recusado abre o módulo fechado, leva o painel à pergunta do primeiro campo marcado e põe o foco nos campos marcados", () => {
    const antes = fazer(
      editor(),
      nova(A2, P1, [X1, X2]),
      nova(A2, P2, [Y1, Y2]),
      { enunciado: "Por onde começa?", id: P2, tipo: "pergunta_editada" },
      { id: Y1, texto: "Pelo pedido", tipo: "alternativa_editada" },
      { id: Y2, texto: "Pela data", tipo: "alternativa_editada" },
      { alternativaId: Y2, perguntaId: P2, tipo: "certa_marcada" },
      { aulaId: A1, moduloId: M1, tipo: "aula_escolhida" }
    );
    expect([
      estados(antes),
      painel(antes, A2),
      telaDo(antes).erros.size,
      antes.foco,
    ]).toEqual([["fechado", "fechado"], [A1, P2], 0, null]);

    const depois = fazer(antes, { tipo: "salvar" });
    expect(telaDo(depois).envio).toBeNull();
    expect(painel(depois, A2)).toEqual([A2, P1]);
    expect(blocos(depois)).toEqual([
      { campos: 4, tipo: "com_erro" },
      { tipo: "fechado" },
    ]);
    expect(new Set(depois.foco)).toEqual(
      new Set([
        ID.alternativa(X1),
        ID.alternativa(X2),
        ID.pergunta(P1, "enunciado"),
        ID.pergunta(P1, "alternativas"),
      ])
    );
    expect(telaDo(depois).erros.get(ID.pergunta(P1, "alternativas"))).toBe(
      SEM_CERTA
    );

    const corrigido = fazer(
      depois,
      { enunciado: "Quem confere?", id: P1, tipo: "pergunta_editada" },
      { id: X1, texto: "O operador", tipo: "alternativa_editada" },
      { id: X2, texto: "O líder", tipo: "alternativa_editada" },
      { alternativaId: X1, perguntaId: P1, tipo: "certa_marcada" }
    );
    expect(estados(corrigido)).toEqual(["aberto", "fechado"]);
    expect(telaDo(corrigido).envio).not.toBeNull();
  });

  test("o Salvar recusado por um campo da aula leva o painel até a aula, e o foco vai só para ele", () => {
    const e = fazer(
      editor(),
      { id: A2, mudanca: { video: "não é vídeo" }, tipo: "aula_editada" },
      { tipo: "salvar" }
    );
    expect(painel(e, A2)[0]).toBe(A2);
    expect(e.foco).toEqual([ID.aula(A2, "video")]);
  });

  test("o rascunho com questionário vira um documento que o servidor aceita, com as perguntas na ordem", () => {
    const r = completa(mudar(exemplo(), nova(A1, P1, [X1, X2])));
    const lido = lerRascunho(r);
    expect(lido.tipo).toBe("lido");
    if (lido.tipo === "lido") {
      expect(documentoDoCurso.safeParse(lido.documento).success).toBe(true);
      expect(lido.documento.modulos[0]?.aulas[0]?.perguntas).toEqual([
        {
          alternativas: [
            { certa: false, id: X1, texto: "Pelo pedido" },
            { certa: true, id: X2, texto: "Pela data" },
          ],
          enunciado: "Por onde começa?",
          id: P1,
        },
      ]);
    }
  });
});

describe("o rascunho apoiado na página", () => {
  const V2 = "v2" as Versao;
  const V3 = "v3" as Versao;
  const digitar = (titulo: string): Mudanca => ({
    mudanca: { titulo },
    tipo: "campos",
  });
  const salvo = (e: RascunhoDoEditor, versao: Versao = V2): AcaoDoEditor => ({
    envio: envioDe(e),
    tipo: "salvo",
    versao,
  });
  const recusado = (
    e: RascunhoDoEditor,
    motivo: Motivo | null
  ): AcaoDoEditor => ({ envio: envioDe(e), motivo, tipo: "recusado" });
  const pagina = (p: DocumentoDoCurso): AcaoDoEditor => ({
    pagina: p,
    tipo: "pagina",
  });
  const recarregar: AcaoDoEditor = { tipo: "descartado" };
  const sujo = (e: RascunhoDoEditor) => telaDo(e).sujo;

  test("o rascunho normalizado pelo servidor deixa de estar sujo", () => {
    const enviando = fazer(editor(), digitar("Curso   "));
    expect(sujo(enviando)).toBe(true);
    const depois = fazer(enviando, salvo(enviando));
    expect(depois.rascunho.titulo).toBe("Curso");
    expect(sujo(depois)).toBe(false);
  });

  test("o que o admin digitou com o salvar pendente fica, apoiado na versão nova", () => {
    const enviando = fazer(editor(), digitar("Curso   "));
    const depois = fazer(
      enviando,
      { mudanca: { descricao: "Outra descrição" }, tipo: "campos" },
      salvo(enviando)
    );
    expect([depois.rascunho.descricao, depois.rascunho.titulo]).toEqual([
      "Outra descrição",
      "Curso   ",
    ]);
    expect(depois.apoio.base.versao).toBe(V2);
    expect(telaDo(depois).envio?.documento.versao).toBe(V2);
  });

  test("a versão de fora com o rascunho limpo recomeça inteiro da página", () => {
    const outro = documento({ titulo: "De outra aba", versao: V3 });
    const depois = fazer(editor(), pagina(outro));
    expect(depois.geracao).toBe(1);
    expect(mesmoRascunho(depois.rascunho, rascunhoDoCurso(outro))).toBe(true);
  });

  test("Salvar sem mudança recusado por versao_mudou: a versão nova recomeça o editor e o aviso sai", () => {
    const inicio = editor();
    const avisado = fazer(inicio, recusado(inicio, "versao_mudou"));
    expect(telaDo(avisado).versaoMudou).toBe(true);
    const depois = fazer(
      avisado,
      pagina(documento({ titulo: "De outra aba", versao: V3 }))
    );
    expect(depois.geracao).toBe(1);
    expect(depois.rascunho.titulo).toBe("De outra aba");
    expect(telaDo(depois).versaoMudou).toBe(false);
  });

  test("Recarregar recomeça da página nova, passa à geração seguinte e zera o que a tela marcava", () => {
    const inicio = fazer(
      editor(),
      digitar(""),
      { id: ID.curso("titulo"), tipo: "saiu_do_campo" },
      { tipo: "salvar" }
    );
    const nova = documento({ titulo: "De outra aba", versao: V3 });
    const emConflito = fazer(inicio, pagina(nova));
    expect(telaDo(emConflito).versaoMudou).toBe(true);
    expect(emConflito.rascunho.titulo).toBe("");
    expect(emConflito.geracao).toBe(0);

    const recarregado = fazer(emConflito, recarregar);
    expect(recarregado.rascunho.titulo).toBe("De outra aba");
    expect(recarregado.geracao).toBe(1);
    expect(telaDo(recarregado)).toMatchObject({
      problemas: [],
      sujo: false,
      versaoMudou: false,
    });

    expect(fazer(recarregado, pagina(nova)).geracao).toBe(1);
  });

  test("Salvar recusado por versao_mudou com o rascunho sujo: o aviso fica até o Recarregar", () => {
    const sujoAntes = fazer(editor(), digitar("X"));
    const emConflito = fazer(
      sujoAntes,
      recusado(sujoAntes, "versao_mudou"),
      pagina(documento({ titulo: "De outra aba", versao: V2 }))
    );
    expect(telaDo(emConflito).versaoMudou).toBe(true);
    expect(emConflito.rascunho.titulo).toBe("X");
    expect(emConflito.geracao).toBe(0);

    const recarregado = fazer(emConflito, recarregar);
    expect(telaDo(recarregado).versaoMudou).toBe(false);
    expect(recarregado.rascunho.titulo).toBe("De outra aba");
  });

  test("o aviso de versão fica durante o salvar seguinte e só sai com salvo, página da base ou Recarregar", () => {
    const x = fazer(editor(), digitar("X"));
    const avisado = fazer(x, recusado(x, "versao_mudou"));
    const xy = fazer(avisado, digitar("XY"));
    const durante = fazer(xy, recusado(xy, null));
    expect(telaDo(durante).versaoMudou).toBe(true);
    expect(telaDo(fazer(durante, salvo(durante))).versaoMudou).toBe(false);
    expect(telaDo(fazer(durante, pagina(documento()))).versaoMudou).toBe(false);
    expect(telaDo(fazer(durante, recarregar)).versaoMudou).toBe(false);
  });

  test("recusa por outro motivo não liga o aviso", () => {
    const inicio = editor();
    const depois = fazer(inicio, recusado(inicio, null));
    expect(telaDo(depois).versaoMudou).toBe(false);
  });

  test("o curso novo pede a capa, troca a URL no primeiro salvar e não recomeça", () => {
    const capa = new File(["capa"], "capa.png", { type: "image/png" });
    const inicio = editor(documento({ versao: null }));
    expect(telaDo(inicio).envio).toBeNull();
    const enviando = fazer(
      inicio,
      digitar("Operador"),
      { arquivo: capa, tipo: "capa_escolhida" },
      { tipo: "salvar" }
    );
    const envio = envioDe(enviando);
    expect([envio.novo, envio.capa]).toEqual([true, capa]);
    const depois = fazer(enviando, salvo(enviando, V1));
    expect(depois.daGeracao.capa).toBeNull();
    expect(envioDe(depois).novo).toBe(false);
    const doRefresh = fazer(depois, pagina({ ...envio.documento, versao: V1 }));
    expect(doRefresh.geracao).toBe(0);
    expect(doRefresh.apoio.base.versao).toBe(V1);
    expect(doRefresh.rascunho.titulo).toBe("Operador");
    expect(envioDe(editor()).novo).toBe(false);
  });
});
