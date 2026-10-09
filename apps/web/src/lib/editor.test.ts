import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Versao } from "@cursos/api/dominio/tipos";

import {
  apoioEm,
  apoioSalvo,
  primeiroNaPagina,
  setaDepoisDeMover,
  sincronizarComAPagina,
  trocado,
} from "./editor";

describe("trocado", () => {
  test("troca o item com o vizinho de cima ou de baixo", () => {
    expect(trocado(["a", "b", "c"], 1, "acima")).toEqual(["b", "a", "c"]);
    expect(trocado(["a", "b", "c"], 1, "abaixo")).toEqual(["a", "c", "b"]);
  });

  test("na borda e fora da lista não troca", () => {
    expect(trocado(["a", "b"], 0, "acima")).toBeNull();
    expect(trocado(["a", "b"], 1, "abaixo")).toBeNull();
    expect(trocado(["a", "b"], -1, "abaixo")).toBeNull();
  });

  test("não mexe na lista recebida", () => {
    const lista = ["a", "b"] as const;
    trocado(lista, 0, "abaixo");
    expect(lista).toEqual(["a", "b"]);
  });
});

describe("setaDepoisDeMover", () => {
  test("longe da borda, o foco fica na seta clicada", () => {
    expect(setaDepoisDeMover("acima", false)).toBe("acima");
    expect(setaDepoisDeMover("abaixo", false)).toBe("abaixo");
  });

  test("na borda, a seta clicada desliga e o foco vai para a outra", () => {
    expect(setaDepoisDeMover("acima", true)).toBe("abaixo");
    expect(setaDepoisDeMover("abaixo", true)).toBe("acima");
  });
});

interface Campo {
  compareDocumentPosition: (outro: Campo) => number;
  id: string;
}

const ANTES = 2;
const DEPOIS = 4;

function camposEmOrdem(...ids: string[]): Record<string, Campo> {
  const campos: Record<string, Campo> = {};
  for (const id of ids) {
    campos[id] = {
      compareDocumentPosition: (outro) =>
        ids.indexOf(outro.id) < ids.indexOf(id) ? ANTES : DEPOIS,
      id,
    };
  }
  return campos;
}

describe("primeiroNaPagina", () => {
  const c = camposEmOrdem(
    "curso-titulo",
    "curso-slug",
    "curso-tema",
    "curso-capaAlt",
    "aula-duracao"
  );

  test("escolhe o campo que vem antes na página, não o primeiro da lista", () => {
    expect(
      primeiroNaPagina([
        c["curso-capaAlt"],
        c["curso-slug"],
        c["curso-tema"],
        c["curso-titulo"],
      ])?.id
    ).toBe("curso-titulo");
  });

  test("uma aula com erro não passa na frente do título", () => {
    expect(primeiroNaPagina([c["aula-duracao"], c["curso-titulo"]])?.id).toBe(
      "curso-titulo"
    );
  });

  test("lista vazia não escolhe nada", () => {
    expect(primeiroNaPagina<Campo>([])).toBeUndefined();
  });
});

describe("sincronizarComAPagina", () => {
  interface Doc {
    titulo: string;
    versao: Versao | null;
  }
  const doc = (versao: string | null, titulo = "Curso"): Doc => ({
    titulo,
    versao: versao as Versao | null,
  });
  const sujo = { descartes: 0, limpo: false };
  const limpo = { descartes: 0, limpo: true };

  test("a página com a versão da base não mexe no rascunho", () => {
    const apoio = apoioEm(doc("v1"), 0);
    const pagina = doc("v1");
    expect(sincronizarComAPagina(apoio, { ...sujo, pagina })).toEqual({
      apoio: { ...apoio, pagina },
      recomecar: false,
    });
  });

  test("o refresh do próprio salvar não apaga o que o admin digitou depois", () => {
    const salvo = doc("v2", "Título novo");
    const apoio = apoioSalvo(apoioEm(doc("v1"), 0), salvo);
    const pagina = doc("v2", "Título novo");
    const r = sincronizarComAPagina(apoio, { ...sujo, pagina });
    expect(r.recomecar).toBe(false);
    expect(r.apoio.base).toBe(salvo);
    expect(r.apoio.versaoDeFora).toBe(false);
  });

  test("o primeiro salvar do curso novo e a troca de URL não descartam nada", () => {
    const salvo = doc("v1");
    const apoio = apoioSalvo(apoioEm(doc(null), 0), salvo);
    const r = sincronizarComAPagina(apoio, { ...sujo, pagina: doc("v1") });
    expect(r.recomecar).toBe(false);
    expect(r.apoio.base).toBe(salvo);
  });

  test("a versão de fora com o rascunho limpo recomeça da página", () => {
    const pagina = doc("v3", "De outra aba");
    const r = sincronizarComAPagina(apoioEm(doc("v1"), 0), {
      ...limpo,
      pagina,
    });
    expect(r).toEqual({ apoio: apoioEm(pagina, 0), recomecar: true });
  });

  test("a versão de fora com o rascunho sujo fica no rascunho e avisa", () => {
    const base = doc("v1");
    const pagina = doc("v3", "De outra aba");
    const r = sincronizarComAPagina(apoioEm(base, 0), { ...sujo, pagina });
    expect(r.recomecar).toBe(false);
    expect(r.apoio.base).toBe(base);
    expect(r.apoio.versaoDeFora).toBe(true);
  });

  test("a página que volta à versão da base desliga o aviso", () => {
    const base = doc("v1");
    const emConflito = sincronizarComAPagina(apoioEm(base, 0), {
      ...sujo,
      pagina: doc("v3", "De outra aba"),
    }).apoio;
    const pagina = doc("v1");
    expect(sincronizarComAPagina(emConflito, { ...sujo, pagina })).toEqual({
      apoio: { ...emConflito, pagina, versaoDeFora: false },
      recomecar: false,
    });
  });

  test("Recarregar descarta o rascunho sujo e recomeça da página", () => {
    const pagina = doc("v3", "De outra aba");
    const emConflito = sincronizarComAPagina(apoioEm(doc("v1"), 0), {
      ...sujo,
      pagina,
    }).apoio;
    const r = sincronizarComAPagina(emConflito, {
      descartes: 1,
      limpo: false,
      pagina,
    });
    expect(r).toEqual({ apoio: apoioEm(pagina, 1), recomecar: true });
    expect(
      sincronizarComAPagina(r.apoio, {
        descartes: 1,
        limpo: true,
        pagina: doc("v3", "De outra aba"),
      }).recomecar
    ).toBe(false);
  });
});

// Key pela versão remonta o editor no refresh do salvar e apaga o que o admin
// digitou com o salvar pendente; o Apoio decide quando recomeçar.
describe("a página monta o editor pela key do id, nunca da versão", () => {
  const EDITORES = [
    { editor: "EditorDoCurso", pasta: "cursos" },
    { editor: "EditorDaTrilha", pasta: "trilhas" },
  ];
  for (const { editor, pasta } of EDITORES) {
    test(pasta, () => {
      const pagina = readFileSync(
        join(
          import.meta.dir,
          `../app/(admin)/admin/catalogo/${pasta}/[id]/page.tsx`
        ),
        "utf8"
      );
      const keys = [
        ...pagina.matchAll(
          new RegExp(`<${editor}\\b[^>]*?\\bkey=\\{([^}]*)\\}`, "g")
        ),
      ];
      expect(keys.map((k) => k[1]?.trim())).toEqual(["edicao.documento.id"]);
      expect(pagina).toContain("abrirOuRascunho(");
    });
  }
});
