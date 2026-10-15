import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import CarregandoAula from "@/app/(aluno)/cursos/[slug]/aulas/[aulaId]/loading";

import { LINHA_DO_MODULO, TITULO_DA_AULA } from "./cabecalho-da-aula";

// O esqueleto desenha cada linha do cabeçalho com 1lh dentro de um bloco com a mesma
// tipografia do cabeçalho real: a altura bate em toda largura, e o vídeo não pula
// quando a página chega.
describe("esqueleto da aula", () => {
  test("o título e a linha do módulo do esqueleto usam a tipografia do cabeçalho", () => {
    const h = renderToStaticMarkup(<CarregandoAula />);
    expect(h).toContain(`class="${TITULO_DA_AULA}"`);
    expect(h).toContain(`class="${LINHA_DO_MODULO}"`);
    expect(h.match(/h-\[1lh\]/g)?.length).toBe(2);
  });
});
