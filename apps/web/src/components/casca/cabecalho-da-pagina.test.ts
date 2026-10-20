import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CabecalhoDaPagina } from "./cabecalho-da-pagina";

const SRC = join(import.meta.dir, "../..");

/**
 * Os h1 que não são o título com resumo: a ficha e o acesso abrem com a foto
 * da pessoa, o editor tem o título que acompanha o campo, e as telas de erro,
 * de não encontrado, da aula e do curso têm a forma delas.
 */
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

/**
 * DESIGN.md, Title page: o resumo vem embaixo do título, a 6 px, nunca na
 * outra ponta da linha, e o conteúdo começa 28 px abaixo dele. Página que
 * escreve o próprio h1 volta a ser acusada aqui.
 */
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

  test("sem resumo, o cabeçalho não deixa linha pulsando na página pronta", () => {
    // O certificado emitido não tem resumo: a linha do esqueleto ficava ali para sempre.
    const html = renderToStaticMarkup(
      createElement(CabecalhoDaPagina, {
        resumo: null,
        titulo: "Seu certificado",
      })
    );
    expect(html).toContain("Seu certificado");
    expect(html).not.toContain('data-slot="skeleton"');
  });
});
