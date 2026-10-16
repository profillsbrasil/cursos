import { describe, expect, test } from "bun:test";
import {
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
} from "@cursos/api/dominio/tipos";

import {
  type Abertos,
  type AcaoNosBlocos,
  abertosAoAbrir,
  abrirOsComErro,
  aulaEscolhida,
  blocoDoModulo,
  blocosAbertos,
  comGrupoDasLetrasTocado,
  despacharNosDois,
  donoDoCampo,
  errosNaAula,
  errosNaPergunta,
  escolhas,
  type Mudanca,
  modulosComErro,
  mudar,
  NADA_ESCOLHIDO,
  NENHUM_ABERTO,
  perguntaEscolhida,
  problemasNaTela,
  proximaOrdem,
} from "./estado-do-editor";
import { errosPorCampo, recusaNaTela } from "./problemas";
import {
  ID,
  lerNumeroDoModulo,
  lerPreco,
  lerRascunho as lerRascunhoSalvo,
  MINIMO_DE_ALTERNATIVAS,
  type RascunhoDoCurso,
  rascunhoDoCurso,
  recusaDoMotivo,
} from "./rascunho-do-curso";

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

describe("campos do curso", () => {
  test("muda só os campos pedidos", () => {
    const r = aplicar(exemplo(), {
      mudanca: { codigo: "NR-12", precoTroca: "300" },
      tipo: "campos",
    });
    expect(r.precoTroca).toBe("300");
    expect(r.codigo).toBe("NR-12");
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
      { mudanca: { capaAlt: "  ", titulo: "   " }, tipo: "campos" },
      { id: A3, mudanca: { titulo: " " }, tipo: "aula_editada" },
      { id: M1, mudanca: { titulo: "\t" }, tipo: "modulo_editado" },
      { nome: "  ", ordem: 2, tipo: "nivel_renomeado" }
    );
    expect(problemas(r)).toEqual([
      { campo: ID.curso("capaAlt"), mensagem: "Preencha este campo." },
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

describe("recusa de valor repetido", () => {
  test("codigo_repetido marca o campo até o valor mudar", () => {
    const r = mudar(exemplo(), {
      mudanca: { codigo: "NR-12" },
      tipo: "campos",
    });
    const marcado = (recusa: ReturnType<typeof recusaDoMotivo>, em = r) =>
      recusaNaTela(recusa, em, ID.curso);
    expect(marcado(recusaDoMotivo("codigo_repetido", r))).toEqual([
      {
        campo: ID.curso("codigo"),
        mensagem: "Outro curso já usa este código.",
      },
    ]);
    const outro = mudar(r, { mudanca: { codigo: "NR-13" }, tipo: "campos" });
    expect(marcado(recusaDoMotivo("codigo_repetido", r), outro)).toEqual([]);
    expect(recusaDoMotivo("versao_mudou", r)).toBe(null);
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
  const SEM_ERRO = new Map<string, string>();

  const com = (abertos: Abertos, ...acoes: AcaoNosBlocos[]) =>
    acoes.reduce(blocosAbertos, abertos);

  const estados = (r: RascunhoDoCurso, abertos: Abertos, erros = SEM_ERRO) =>
    r.modulos.map((m) => blocoDoModulo(m, abertos, erros).tipo);

  test("com dois módulos ou mais, todo módulo começa fechado", () => {
    const r = exemplo();
    expect(estados(r, abertosAoAbrir(r))).toEqual(["fechado", "fechado"]);
  });

  test("o curso de um módulo só abre com ele aberto, sem custar um clique", () => {
    const completo = exemplo();
    const r = { ...completo, modulos: completo.modulos.slice(0, 1) };
    expect(estados(r, abertosAoAbrir(r))).toEqual(["aberto"]);
  });

  test("o cabeçalho e o índice abrem e fecham só o módulo pedido", () => {
    const abertos = com(
      NENHUM_ABERTO,
      { id: M1, tipo: "aberto" },
      { id: M2, tipo: "aberto" },
      { id: M1, tipo: "fechado" }
    );
    expect(estados(exemplo(), abertos)).toEqual(["fechado", "aberto"]);
  });

  test("o módulo novo já vem aberto, porque o foco vai para o título dele", () => {
    const mudanca: Mudanca = { id: M3, tipo: "modulo_novo" };
    const abertos = com(NENHUM_ABERTO, { mudanca, tipo: "mudou" });
    expect(estados(mudar(exemplo(), mudanca), abertos)).toEqual([
      "fechado",
      "fechado",
      "aberto",
    ]);
  });

  test("mover uma aula para um módulo fechado abre o destino, e a origem continua aberta", () => {
    const mudanca: Mudanca = { id: A1, moduloId: M2, tipo: "aula_para_modulo" };
    const abertos = com(
      NENHUM_ABERTO,
      { id: M1, tipo: "aberto" },
      { mudanca, tipo: "mudou" }
    );
    expect(estados(mudar(exemplo(), mudanca), abertos)).toEqual([
      "aberto",
      "aberto",
    ]);
  });

  test("mudança dentro de um módulo não abre nem fecha nenhum bloco", () => {
    const abertos = com(NENHUM_ABERTO, { id: M1, tipo: "aberto" });
    const mudancas: Mudanca[] = [
      { id: A3, mudanca: { titulo: "Nova" }, tipo: "aula_editada" },
      { direcao: "abaixo", id: A1, tipo: "aula_movida" },
      { direcao: "abaixo", id: M1, tipo: "modulo_movido" },
      { tipo: "modulos_ordenados" },
      { id: A4, moduloId: M1, tipo: "aula_nova" },
      { id: A2, tipo: "aula_removida" },
    ];
    for (const mudanca of mudancas) {
      expect(blocosAbertos(abertos, { mudanca, tipo: "mudou" })).toBe(abertos);
    }
  });

  test("o módulo removido sai da lista de abertos", () => {
    const abertos = com(
      NENHUM_ABERTO,
      { id: M1, tipo: "aberto" },
      { mudanca: { id: M1, tipo: "modulo_removido" }, tipo: "mudou" }
    );
    expect(abertos.size).toBe(0);
  });

  test("o módulo com campo marcado fica aberto mesmo fechado pelo admin, e conta os campos", () => {
    const erros = new Map([
      [ID.aula(A3, "duracao"), "Escreva a duração em mm:ss, como 12:30."],
      [ID.modulo(M2, "titulo"), "Preencha este campo."],
      [ID.curso("titulo"), "Preencha este campo."],
    ]);
    const abertos = com(
      NENHUM_ABERTO,
      { id: M2, tipo: "aberto" },
      { id: M2, tipo: "fechado" }
    );
    expect(
      exemplo().modulos.map((m) => blocoDoModulo(m, abertos, erros))
    ).toEqual([{ tipo: "fechado" }, { campos: 2, tipo: "com_erro" }]);
  });

  test("o Salvar com erro abre os módulos marcados, e eles ficam abertos depois da correção", () => {
    const r = exemplo();
    const erros = new Map([[ID.aula(A3, "video"), "Cole um link do YouTube."]]);
    const ids = modulosComErro(r, erros);
    expect(ids).toEqual([M2]);
    const abertos = com(NENHUM_ABERTO, { ids, tipo: "erros_mostrados" });
    expect(estados(r, abertos, erros)).toEqual(["fechado", "com_erro"]);
    expect(estados(r, abertos)).toEqual(["fechado", "aberto"]);
  });

  test("o editor passa toda mudança ao rascunho e aos blocos", () => {
    let r = exemplo();
    let abertos = NENHUM_ABERTO;
    const despachar = despacharNosDois(
      (m) => {
        r = mudar(r, m);
      },
      (a) => {
        abertos = blocosAbertos(abertos, a);
      }
    );
    despachar({ id: M3, tipo: "modulo_novo" });
    despachar({ id: A1, moduloId: M2, tipo: "aula_para_modulo" });
    expect(r.modulos.map((m) => m.id)).toEqual([M1, M2, M3]);
    expect(estados(r, abertos)).toEqual(["fechado", "aberto", "aberto"]);
  });
});

// O que o editor faz a cada render: escolhe o que marcar, abre os blocos com
// erro e desenha cada bloco. O índice desenha o mesmo Bloco.
describe("nenhum erro fica num bloco fechado", () => {
  const tela = (
    r: RascunhoDoCurso,
    {
      abertos = NENHUM_ABERTO,
      recusa = [],
      tentou = false,
      tocados = new Set<string>(),
    }: {
      abertos?: Abertos;
      recusa?: ReturnType<typeof recusaNaTela>;
      tentou?: boolean;
      tocados?: ReadonlySet<string>;
    } = {}
  ) => {
    const erros = errosPorCampo(
      problemasNaTela({ achados: problemas(r), recusa, tentou, tocados })
    );
    const abrir = abrirOsComErro(abertos, r, erros);
    const depois = abrir ? blocosAbertos(abertos, abrir) : abertos;
    return {
      abertos: depois,
      blocos: r.modulos.map((m) => blocoDoModulo(m, depois, erros)),
      erros,
    };
  };

  const duracao = ID.aula(A3, "duracao");

  test("leitura: o campo que o admin deixou com erro abre e prende o bloco, que fica aberto depois da correção", () => {
    const r = mudar(exemplo(), {
      id: A3,
      mudanca: { duracao: "abc" },
      tipo: "aula_editada",
    });
    // Antes de sair do campo, nada marca.
    expect(tela(r).blocos).toEqual([{ tipo: "fechado" }, { tipo: "fechado" }]);

    const tocados = new Set([duracao]);
    const comErro = tela(r, { tocados });
    expect(comErro.erros.get(duracao)).toBe(
      "Escreva a duração em mm:ss, como 12:30."
    );
    expect(comErro.blocos).toEqual([
      { tipo: "fechado" },
      { campos: 1, tipo: "com_erro" },
    ]);

    // Fechar pelo cabeçalho não tira o erro da tela.
    const fechado = blocosAbertos(comErro.abertos, { id: M2, tipo: "fechado" });
    expect(tela(r, { abertos: fechado, tocados }).blocos[1]).toEqual({
      campos: 1,
      tipo: "com_erro",
    });

    const corrigido = mudar(r, {
      id: A3,
      mudanca: { duracao: "5:00" },
      tipo: "aula_editada",
    });
    expect(
      tela(corrigido, { abertos: comErro.abertos, tocados }).blocos
    ).toEqual([{ tipo: "fechado" }, { tipo: "aberto" }]);
  });

  test("leitura: depois do Salvar recusado, o erro de um módulo fechado abre o bloco", () => {
    const r = mudar(exemplo(), {
      id: A3,
      mudanca: { video: "não é vídeo" },
      tipo: "aula_editada",
    });
    const t = tela(r, { tentou: true });
    expect(t.abertos.has(M2)).toBe(true);
    expect(t.blocos[1]).toEqual({ campos: 1, tipo: "com_erro" });
  });

  test("schema: o título vazio de um módulo fechado aparece no Salvar e abre o bloco", () => {
    const r = mudar(exemplo(), {
      id: M2,
      mudanca: { titulo: "" },
      tipo: "modulo_editado",
    });
    expect(tela(r).blocos[1]).toEqual({ tipo: "fechado" });
    const t = tela(r, { tentou: true });
    expect(t.erros.get(ID.modulo(M2, "titulo"))).toBe("Preencha este campo.");
    expect(t.abertos.has(M2)).toBe(true);
    expect(t.blocos).toEqual([
      { tipo: "fechado" },
      { campos: 1, tipo: "com_erro" },
    ]);
  });

  test("recusa do servidor: marca o campo do curso, fora dos blocos, sem abrir nenhum", () => {
    const r = mudar(exemplo(), {
      mudanca: { codigo: "NR-12" },
      tipo: "campos",
    });
    const recusa = recusaNaTela(
      recusaDoMotivo("codigo_repetido", r),
      r,
      ID.curso
    );
    const t = tela(r, { recusa });
    expect(t.erros.get(ID.curso("codigo"))).toBe(
      "Outro curso já usa este código."
    );
    expect(t.abertos).toBe(NENHUM_ABERTO);
    expect(t.blocos).toEqual([{ tipo: "fechado" }, { tipo: "fechado" }]);
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
    const p = perguntas(r)[0];
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
    const r = mudar(exemplo(), nova(A1, P1, [X1, X2]));
    const parcial = new Set([ID.pergunta(P1, "enunciado"), ID.alternativa(X1)]);
    expect(comGrupoDasLetrasTocado(parcial, r)).toBe(parcial);
    const todos = new Set([...parcial, ID.alternativa(X2)]);
    expect([...comGrupoDasLetrasTocado(todos, r)]).toEqual([
      ...todos,
      ID.pergunta(P1, "alternativas"),
    ]);
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
    const e1 = escolhas(NADA_ESCOLHIDO, {
      aulaId: A2,
      moduloId: M1,
      tipo: "aula_escolhida",
    });
    const e2 = escolhas(e1, {
      aulaId: A1,
      perguntaId: P2,
      tipo: "pergunta_escolhida",
    });
    expect([aulaEscolhida(m1, e2)?.id, perguntaEscolhida(a1, e2)?.id]).toEqual([
      A2,
      P2,
    ]);
    const e3 = escolhas(e2, {
      mudanca: nova(A1, uuidDeExemplo(43) as PerguntaId, [
        uuidDeExemplo(71) as AlternativaId,
        uuidDeExemplo(72) as AlternativaId,
      ]),
      tipo: "mudou",
    });
    expect(e3.perguntaPorAula.get(A1)).toBe(uuidDeExemplo(43) as PerguntaId);
    const e4 = escolhas(e3, {
      mudanca: { id: A4, moduloId: M2, tipo: "aula_nova" },
      tipo: "mudou",
    });
    expect(e4.aulaPorModulo.get(M2)).toBe(A4);
    expect(aulaEscolhida({ ...m1, aulas: [a1] }, e2)?.id).toBe(A1);
  });

  test("o Salvar recusado leva o painel até o dono do primeiro campo marcado", () => {
    const r = mudar(exemplo(), nova(A2, P1, [X1, X2]));
    expect([
      donoDoCampo(r, ID.alternativa(X2)),
      donoDoCampo(r, ID.aula(A3, "video")),
      donoDoCampo(r, ID.modulo(M1, "titulo")),
    ]).toEqual([
      { aulaId: A2, moduloId: M1, perguntaId: P1 },
      { aulaId: A3, moduloId: M2, perguntaId: null },
      null,
    ]);
    const e = escolhas(NADA_ESCOLHIDO, {
      dono: { aulaId: A2, moduloId: M1, perguntaId: P1 },
      tipo: "campo_mostrado",
    });
    expect([e.aulaPorModulo.get(M1), e.perguntaPorAula.get(A2)]).toEqual([
      A2,
      P1,
    ]);
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
