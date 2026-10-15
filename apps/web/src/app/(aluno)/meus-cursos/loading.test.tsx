import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { GRADE_CAPAS } from "@/components/meus-cursos/capa-curso";

import Carregando from "./loading";

test("o esqueleto tem a forma da trilha: resumo de largura cheia e as capas na grade da página", () => {
  const html = renderToStaticMarkup(<Carregando />);
  // A grade de cartões de trilha lado a lado saiu da página.
  expect(html).not.toContain("380px");
  expect(html).toContain(GRADE_CAPAS);
  const resumo = html.indexOf('data-esqueleto="resumo-da-trilha"');
  expect(resumo).toBeGreaterThan(-1);
  expect(html.indexOf(GRADE_CAPAS)).toBeGreaterThan(resumo);
});
