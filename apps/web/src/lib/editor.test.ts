import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ehVersao, marcar } from "@cursos/api/dominio/marcas";
import type { Versao } from "@cursos/api/dominio/tipos";

import {
  apoioEm,
  apoioSalvo,
  focarOPrimeiroCom,
  primeiroNaPagina,
  setaDepoisDeMover,
  sincronizarComAPagina,
  trocado,
  vizinhoQueFica,
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

describe("vizinhoQueFica", () => {
  test("o foco vai para o item que toma o lugar do removido; no fim, para o anterior", () => {
    expect(vizinhoQueFica(["a", "b", "c"], 0)).toBe("b");
    expect(vizinhoQueFica(["a", "b", "c"], 1)).toBe("c");
    expect(vizinhoQueFica(["a", "b", "c"], 2)).toBe("b");
  });

  test("o item sozinho não deixa vizinho", () => {
    expect(vizinhoQueFica(["a"], 0)).toBeNull();
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
    "curso-categoriaId",
    "curso-descricao",
    "aula-duracao"
  );

  test("escolhe o campo que vem antes na página, não o primeiro da lista", () => {
    expect(
      primeiroNaPagina([
        c["curso-descricao"],
        c["curso-categoriaId"],
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

describe("focarOPrimeiroCom", () => {
  test("procura o campo só depois do render: o Salvar recusado abre o bloco do campo no mesmo render que marca o erro, e procurar antes do quadro seguinte não o acha", () => {
    const quadros: (() => void)[] = [];
    const focados: string[] = [];
    const naPagina = new Map<string, Campo & { focus: () => void }>();

    focarOPrimeiroCom(
      ["aula-duracao"],
      (depois) => quadros.push(depois),
      (id) => naPagina.get(id) ?? null
    );
    naPagina.set("aula-duracao", {
      compareDocumentPosition: () => DEPOIS,
      focus: () => {
        focados.push("aula-duracao");
      },
      id: "aula-duracao",
    });
    expect(focados).toEqual([]);

    for (const depois of quadros) {
      depois();
    }

    expect(focados).toEqual(["aula-duracao"]);
  });

  test("foca o campo que vem antes na página, não o primeiro da lista", () => {
    const focados: string[] = [];
    const c = camposEmOrdem("curso-titulo", "aula-duracao");

    const focavel = (campo: Campo | undefined) =>
      campo
        ? {
            ...campo,
            focus: () => {
              focados.push(campo.id);
            },
          }
        : null;

    focarOPrimeiroCom(
      ["aula-duracao", "curso-titulo", "sumiu"],
      (depois) => depois(),
      (id) => focavel(c[id])
    );

    expect(focados).toEqual(["curso-titulo"]);
  });
});

describe("sincronizarComAPagina", () => {
  interface Doc {
    titulo: string;
    versao: Versao | null;
  }

  const doc = (versao: string | null, titulo = "Curso"): Doc => ({
    titulo,
    versao: versao === null ? null : marcar(ehVersao, versao),
  });

  const sujo = { limpo: false };
  const limpo = { limpo: true };

  test("a página com a versão da base não mexe no rascunho", () => {
    const apoio = apoioEm(doc("v1"));
    const pagina = doc("v1");
    expect(sincronizarComAPagina(apoio, { ...sujo, pagina })).toEqual({
      apoio: { ...apoio, pagina },
      recomecar: false,
    });
  });

  test("o refresh do próprio salvar não apaga o que o admin digitou depois", () => {
    const salvo = doc("v2", "Título novo");
    const apoio = apoioSalvo(apoioEm(doc("v1")), salvo);
    const pagina = doc("v2", "Título novo");
    const r = sincronizarComAPagina(apoio, { ...sujo, pagina });
    expect(r.recomecar).toBe(false);
    expect(r.apoio.base).toBe(salvo);
    expect(r.apoio.versaoDeFora).toBe(false);
  });

  test("o primeiro salvar do curso novo e a troca de URL não descartam nada", () => {
    const salvo = doc("v1");
    const apoio = apoioSalvo(apoioEm(doc(null)), salvo);
    const r = sincronizarComAPagina(apoio, { ...sujo, pagina: doc("v1") });
    expect(r.recomecar).toBe(false);
    expect(r.apoio.base).toBe(salvo);
  });

  test("a versão de fora com o rascunho limpo recomeça da página", () => {
    const pagina = doc("v3", "De outra aba");

    const r = sincronizarComAPagina(apoioEm(doc("v1")), {
      ...limpo,
      pagina,
    });

    expect(r).toEqual({ apoio: apoioEm(pagina), recomecar: true });
  });

  test("a versão de fora com o rascunho sujo fica no rascunho e avisa", () => {
    const base = doc("v1");
    const pagina = doc("v3", "De outra aba");
    const r = sincronizarComAPagina(apoioEm(base), { ...sujo, pagina });
    expect(r.recomecar).toBe(false);
    expect(r.apoio.base).toBe(base);
    expect(r.apoio.versaoDeFora).toBe(true);
  });

  test("a página que volta à versão da base desliga o aviso", () => {
    const base = doc("v1");

    const emConflito = sincronizarComAPagina(apoioEm(base), {
      ...sujo,
      pagina: doc("v3", "De outra aba"),
    }).apoio;

    const pagina = doc("v1");
    expect(sincronizarComAPagina(emConflito, { ...sujo, pagina })).toEqual({
      apoio: { ...emConflito, pagina, versaoDeFora: false },
      recomecar: false,
    });
  });
});

describe("a página monta o editor pela key do id, nunca da versão", () => {
  test("cursos", () => {
    const pagina = readFileSync(
      join(
        import.meta.dir,
        "../app/(admin)/admin/catalogo/cursos/[id]/page.tsx"
      ),
      "utf8"
    );

    const keys = [
      ...pagina.matchAll(/<EditorDoCurso\b[^>]*?\bkey=\{([^}]*)\}/g),
    ];

    expect(keys.map((k) => k[1]?.trim())).toEqual(["edicao.documento.id"]);
    expect(pagina).toContain("abrirOuRascunho(");
  });
});
