import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Glob } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CabecalhoDaPagina } from "./cabecalho-da-pagina";

const SRC = join(import.meta.dir, "../..");
const RESUMO_FIXO = /resumo="([^"]*)"/;
const ESQUELETO = /loading\.tsx$/;

const H1_PROPRIO = new Set([
  "components/admin/editor-do-curso.tsx",
  "components/admin/pessoas/ficha-da-pessoa.tsx",
  "components/admin/acesso-do-aluno.tsx",
  "components/casca/cabecalho-da-pagina.tsx",
  "components/casca/tela-de-erro.tsx",
  "components/aluno/tela-nao-encontrada.tsx",
  "components/player/cabecalho-da-aula.tsx",
  "components/curso/tela-do-curso.tsx",
  "components/certificado/conferencia.tsx",
]);

describe("cabeçalho da página", () => {
  test("toda página com título e resumo usa o CabecalhoDaPagina", () => {
    const fora: string[] = [];

    for (const arquivo of new Glob("{app,components}/**/*.tsx").scanSync(SRC)) {
      if (arquivo.includes(".test.") || H1_PROPRIO.has(arquivo)) {
        continue;
      }

      if (readFileSync(join(SRC, arquivo), "utf8").includes("<h1")) {
        fora.push(arquivo);
      }
    }

    expect(fora).toEqual([]);
  });

  test("sem resumo, como no certificado emitido, o cabeçalho não deixa a linha do esqueleto pulsando na página pronta", () => {
    const html = renderToStaticMarkup(
      createElement(CabecalhoDaPagina, {
        resumo: null,
        titulo: "Seu certificado",
      })
    );

    expect(html).toContain("Seu certificado");
    expect(html).not.toContain('data-slot="skeleton"');
  });

  test("o esqueleto repete o resumo fixo da página, para quebrar nas mesmas linhas", () => {
    const resumo = (arquivo: string) =>
      readFileSync(join(SRC, arquivo), "utf8").match(RESUMO_FIXO)?.[1];

    const diferentes: string[] = [];

    for (const esqueleto of new Glob("app/**/loading.tsx").scanSync(SRC)) {
      const pagina = esqueleto.replace(ESQUELETO, "page.tsx");

      const daPagina = existsSync(join(SRC, pagina))
        ? resumo(pagina)
        : undefined;

      if (daPagina !== undefined && resumo(esqueleto) !== daPagina) {
        diferentes.push(esqueleto);
      }
    }

    expect(diferentes).toEqual([]);
  });
});
