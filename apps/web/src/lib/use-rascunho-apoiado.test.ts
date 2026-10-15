import { describe, expect, test } from "bun:test";
import { documentoDeExemplo } from "@cursos/api/dominio/exemplo";
import type { Versao } from "@cursos/api/dominio/tipos";
import type { Route } from "next";
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
  urlDepoisDoSalvar,
} from "./use-rascunho-apoiado";

const V1 = "v1" as Versao;
const V2 = "v2" as Versao;
const V3 = "v3" as Versao;

describe("o rascunho apoiado do curso", () => {
  type Doc = Parameters<typeof REGRAS_DO_CURSO.deDocumento>[0];
  type R = ReturnType<typeof REGRAS_DO_CURSO.deDocumento>;
  type Acao = AcaoApoiada<Doc, R, Mudanca>;
  const passo = (e: EstadoApoiado<Doc, R>, ...acoes: Acao[]) =>
    acoes.reduce((s, a) => apoiado(REGRAS_DO_CURSO, s, a), e);
  const campos = (mudanca: Extract<Mudanca, { tipo: "campos" }>["mudanca"]) =>
    ({ mudanca: { mudanca, tipo: "campos" }, tipo: "mudou" }) as const;
  const digitar = (titulo: string) => campos({ titulo });
  const gravado = (e: EstadoApoiado<Doc, R>, versao: Versao = V2): Doc => {
    const lido = lerRascunho(e.rascunho, e.apoio.base);
    if (lido.tipo !== "lido") {
      throw new Error("o rascunho devia ler");
    }
    return { ...lido.documento, versao };
  };
  const doc = (o: Partial<Doc> = {}): Doc => ({
    ...documentoDeExemplo(V1),
    ...o,
  });
  const pagina = (p: Doc, limpo: boolean): Acao => ({
    limpo,
    pagina: p,
    tipo: "pagina",
  });
  const recarregar: Acao = { tipo: "descartado" };

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
    const depois = passo(enviando, campos({ categoria: "Outra categoria" }), {
      enviado: enviando.rascunho,
      gravado: gravado(enviando),
      tipo: "salvo",
    });
    expect([depois.rascunho.categoria, depois.rascunho.titulo]).toEqual([
      "Outra categoria",
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
      { limpo: true, pagina: outro, tipo: "pagina" }
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
      limpo: true,
      pagina: outro,
      tipo: "pagina",
    });
    expect(depois.geracao).toBe(1);
    expect(depois.rascunho.titulo).toBe("De outra aba");
    expect(depois.apoio.versaoDeFora).toBe(false);
  });

  test("Recarregar recomeça da página nova e passa à geração seguinte", () => {
    const inicio = passo(estadoApoiadoEm(REGRAS_DO_CURSO, doc()), digitar("X"));
    const nova = doc({ titulo: "De outra aba", versao: V3 });
    const emConflito = passo(inicio, pagina(nova, false));
    expect(emConflito.apoio.versaoDeFora).toBe(true);
    expect(emConflito.rascunho.titulo).toBe("X");
    expect(emConflito.geracao).toBe(0);

    const recarregado = passo(emConflito, recarregar);
    expect(recarregado.rascunho.titulo).toBe("De outra aba");
    expect(recarregado.apoio.versaoDeFora).toBe(false);
    expect(recarregado.geracao).toBe(1);
    expect(rascunhoSujo(REGRAS_DO_CURSO, recarregado)).toBe(false);

    const doRefresh = passo(recarregado, pagina(nova, true));
    expect(doRefresh.geracao).toBe(1);
  });

  test("Salvar recusado por versao_mudou com o rascunho sujo: o aviso fica até o Recarregar", () => {
    const nova = doc({ titulo: "De outra aba", versao: V2 });
    const emConflito = passo(
      estadoApoiadoEm(REGRAS_DO_CURSO, doc()),
      digitar("X"),
      { motivo: "versao_mudou", tipo: "recusado" },
      pagina(nova, false)
    );
    expect(emConflito.apoio.versaoDeFora).toBe(true);
    expect(emConflito.rascunho.titulo).toBe("X");
    expect(emConflito.geracao).toBe(0);

    const recarregado = passo(emConflito, recarregar);
    expect(recarregado.apoio.versaoDeFora).toBe(false);
    expect(recarregado.rascunho.titulo).toBe("De outra aba");
  });

  test("o aviso de versão fica durante o salvar seguinte e só sai com salvo, página da base ou Recarregar", () => {
    const avisado = passo(
      estadoApoiadoEm(REGRAS_DO_CURSO, doc()),
      digitar("X"),
      { motivo: "versao_mudou", tipo: "recusado" }
    );
    const durante = passo(avisado, digitar("XY"), {
      motivo: "slug_repetido",
      tipo: "recusado",
    });
    expect(durante.apoio.versaoDeFora).toBe(true);
    const salvo = passo(durante, {
      enviado: durante.rascunho,
      gravado: gravado(durante),
      tipo: "salvo",
    });
    expect(salvo.apoio.versaoDeFora).toBe(false);
    expect(passo(durante, pagina(doc(), false)).apoio.versaoDeFora).toBe(false);
    expect(passo(durante, recarregar).apoio.versaoDeFora).toBe(false);
  });

  test("recusa por outro motivo não liga o aviso", () => {
    const depois = passo(
      estadoApoiadoEm(REGRAS_DO_CURSO, doc()),
      { motivo: "slug_repetido", tipo: "recusado" },
      { motivo: null, tipo: "recusado" }
    );
    expect(depois.apoio.versaoDeFora).toBe(false);
  });

  test("o primeiro salvar do curso novo troca a URL pela sem ?novo=1; o do curso existente, não", () => {
    const caminho = "/admin/catalogo/cursos/x" as Route;
    const nova = estadoApoiadoEm(REGRAS_DO_CURSO, doc({ versao: null }));
    expect(urlDepoisDoSalvar(nova.apoio.base, caminho)).toBe(caminho);
    const salva = passo(nova, {
      enviado: nova.rascunho,
      gravado: gravado(nova, V1),
      tipo: "salvo",
    });
    expect(urlDepoisDoSalvar(salva.apoio.base, caminho)).toBeNull();
    const existente = estadoApoiadoEm(REGRAS_DO_CURSO, doc());
    expect(urlDepoisDoSalvar(existente.apoio.base, caminho)).toBeNull();
  });

  test("o curso novo salva e troca de URL sem recomeçar", () => {
    const inicio = estadoApoiadoEm(REGRAS_DO_CURSO, doc({ versao: null }));
    const enviando = passo(inicio, digitar("Operador"));
    const salvo = gravado(enviando, V1);
    const depois = passo(
      enviando,
      { enviado: enviando.rascunho, gravado: salvo, tipo: "salvo" },
      pagina(salvo, true)
    );
    expect(depois.geracao).toBe(0);
    expect(depois.apoio.base.versao).toBe(V1);
    expect(depois.rascunho.titulo).toBe("Operador");
  });
});
