import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { GRADE_CAPAS } from "@/components/meus-cursos/capa-curso";

import Carregando from "./loading";

test("o esqueleto tem a forma da seção dos cursos: as capas na grade da página, sem resumo acima delas", () => {
  const html = renderToStaticMarkup(<Carregando />);
  expect(html).not.toContain("380px");
  expect(html).not.toContain("h-[116px]");
  expect(html.split(GRADE_CAPAS).length - 1).toBe(1);
});
