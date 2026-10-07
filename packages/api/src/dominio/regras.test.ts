import { describe, expect, test } from "bun:test";
import { PONTOS_AULA, PONTOS_CURSO } from "@cursos/db/seed/dados";

import { PONTOS } from "./regras";

describe("pontos do seed", () => {
  test("o seed lança os mesmos valores que as regras", () => {
    expect({ aula: PONTOS_AULA, curso: PONTOS_CURSO }).toEqual({
      aula: PONTOS.aula_assistida,
      curso: PONTOS.curso_concluido,
    });
  });
});
