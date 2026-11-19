import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { Glob } from "bun";

const APP = import.meta.dir;

function erroDe(pagina: string) {
  let pasta = dirname(pagina);

  while (pasta.startsWith(APP)) {
    if (existsSync(join(pasta, "error.tsx"))) {
      return relative(APP, pasta);
    }

    pasta = dirname(pasta);
  }

  return null;
}

const paginasDe = (pasta: string) =>
  [...new Glob("**/page.tsx").scanSync(join(APP, pasta))].map((p) =>
    join(APP, pasta, p)
  );

describe("o error.tsx mais perto da página dá o título da tela de erro", () => {
  test.each(paginasDe("(aluno)").map((p) => [relative(APP, p)]))(
    "%s tem error.tsx com o nome da tela, abaixo do grupo",
    (pagina) => {
      expect(erroDe(join(APP, pagina))).not.toBe("(aluno)");
    }
  );

  test.each(paginasDe("certificado").map((p) => [relative(APP, p)]))(
    "%s cai no erro da conferência, dentro da faixa com a marca",
    (pagina) => {
      expect(erroDe(join(APP, pagina))).toBe("certificado");
    }
  );
});
