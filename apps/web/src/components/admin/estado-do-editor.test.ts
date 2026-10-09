import { describe, expect, test } from "bun:test";
import { documentoDoCurso } from "@cursos/api/dominio/edicao-do-curso";
import {
  documentoDeExemplo,
  EDICAO,
  uuidDeExemplo,
} from "@cursos/api/dominio/exemplo";
import type { AulaId, ModuloId } from "@cursos/api/dominio/tipos";

import {
  type CapaEscolhida,
  capaDepoisDeSalvar,
  type Mudanca,
  mudar,
  proximaOrdem,
} from "./estado-do-editor";
import { recusaNaTela } from "./problemas";
import {
  ID,
  lerNumeroDoModulo,
  lerPreco,
  lerRascunho as lerRascunhoSalvo,
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
      mudanca: { precoTroca: "300", slug: "nr-12" },
      tipo: "campos",
    });
    expect(r.precoTroca).toBe("300");
    expect(r.slug).toBe("nr-12");
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
      duracao: "",
      id: A4,
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
      { duracao: "05:00", id: A1, titulo: "Aula 1", video: "" },
      { duracao: "12:34", id: A2, titulo: "Ajuste da válvula", video: "" },
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
      duracao: "12:3",
      id: A1,
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
      { mudanca: { tema: "  ", titulo: "   " }, tipo: "campos" },
      { id: A3, mudanca: { titulo: " " }, tipo: "aula_editada" },
      { id: M1, mudanca: { titulo: "\t" }, tipo: "modulo_editado" },
      { nome: "  ", ordem: 2, tipo: "nivel_renomeado" }
    );
    expect(problemas(r)).toEqual([
      { campo: ID.modulo(M1, "titulo"), mensagem: "Preencha este campo." },
      { campo: ID.aula(A3, "titulo"), mensagem: "Preencha este campo." },
      { campo: ID.nivel(2), mensagem: "Preencha este campo." },
      { campo: ID.curso("tema"), mensagem: "Preencha este campo." },
      { campo: ID.curso("titulo"), mensagem: "Preencha este campo." },
    ]);
  });

  test("endereço fora do formato marca o endereço", () => {
    const r = mudar(exemplo(), { mudanca: { slug: "NR 12" }, tipo: "campos" });
    expect(problemas(r)).toEqual([
      {
        campo: ID.curso("slug"),
        mensagem: "Use letras minúsculas, números e hífen, sem espaço.",
      },
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
  test("slug_repetido e codigo_repetido marcam o campo até o valor mudar", () => {
    const r = mudar(exemplo(), {
      mudanca: { codigo: "NR-12", slug: "nr-12" },
      tipo: "campos",
    });
    const marcado = (recusa: ReturnType<typeof recusaDoMotivo>, em = r) =>
      recusaNaTela(recusa, em, ID.curso);
    expect(marcado(recusaDoMotivo("slug_repetido", r))).toEqual([
      {
        campo: ID.curso("slug"),
        mensagem: "Outro curso já usa este endereço.",
      },
    ]);
    expect(marcado(recusaDoMotivo("codigo_repetido", r))).toEqual([
      {
        campo: ID.curso("codigo"),
        mensagem: "Outro curso já usa este código.",
      },
    ]);
    const outro = mudar(r, { mudanca: { slug: "nr-12-b" }, tipo: "campos" });
    expect(marcado(recusaDoMotivo("slug_repetido", r), outro)).toEqual([]);
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

describe("capaDepoisDeSalvar: o campo da capa só remonta depois de enviar uma capa", () => {
  const foto = new File(["a"], "capa.jpg", { type: "image/jpeg" });
  const outra = new File(["b"], "outra.png", { type: "image/png" });
  const capa = (arquivo: File | null): CapaEscolhida => ({
    arquivo,
    geracao: 0,
    montagem: 3,
  });

  test("o salvar que enviou a capa esvazia o arquivo e remonta o campo", () => {
    expect(capaDepoisDeSalvar(capa(foto), foto)).toEqual({
      arquivo: null,
      geracao: 0,
      montagem: 4,
    });
  });

  test("o salvar sem capa não remonta: o foco no texto alternativo fica", () => {
    const atual = capa(null);
    expect(capaDepoisDeSalvar(atual, null)).toBe(atual);
  });

  test("a capa escolhida durante o salvar fica, e o campo não remonta", () => {
    const comOutra = capa(outra);
    expect(capaDepoisDeSalvar(comOutra, foto)).toBe(comOutra);
    expect(capaDepoisDeSalvar(comOutra, null)).toBe(comOutra);
  });
});
