import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Secao } from "./partes";

const H2 = /<h2[^>]*>/;

describe("Secao", () => {
  const h2 = (descritoPor?: string) =>
    renderToStaticMarkup(
      <Secao
        descritoPor={descritoPor}
        id="trilha-cursos"
        resumo=""
        titulo="Cursos"
      >
        <p>conteúdo</p>
      </Secao>
    ).match(H2)?.[0] ?? "";

  test("o título focado pelo erro aponta para a mensagem", () => {
    expect(h2("trilha-cursos-erro")).toContain(
      'aria-describedby="trilha-cursos-erro"'
    );
  });

  test("sem erro, o título não aponta para nada", () => {
    expect(h2()).not.toContain("aria-describedby");
  });
});
