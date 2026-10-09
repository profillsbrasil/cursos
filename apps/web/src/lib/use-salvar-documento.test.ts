import { describe, expect, test } from "bun:test";
import type { Route } from "next";

import { telaDepoisDeSalvar } from "./use-salvar-documento";

const caminho = "/admin/catalogo/cursos/x" as Route;

describe("telaDepoisDeSalvar", () => {
  test("o documento novo perde o ?novo=1 depois do primeiro salvar", () => {
    expect(
      telaDepoisDeSalvar({ tipo: "salvo" }, { caminho, novo: true })
    ).toEqual({ substituirPor: caminho, versaoMudou: false });
    expect(
      telaDepoisDeSalvar({ tipo: "salvo" }, { caminho, novo: false })
    ).toEqual({ substituirPor: null, versaoMudou: false });
  });

  test("só versao_mudou liga o aviso, e recusa nenhuma troca a URL", () => {
    const motivos = [
      "versao_mudou",
      "slug_repetido",
      "codigo_repetido",
      null,
    ] as const;
    expect(
      motivos.map((motivo) =>
        telaDepoisDeSalvar(
          { motivo, tipo: "recusado" },
          { caminho, novo: true }
        )
      )
    ).toEqual([
      { substituirPor: null, versaoMudou: true },
      { substituirPor: null, versaoMudou: false },
      { substituirPor: null, versaoMudou: false },
      { substituirPor: null, versaoMudou: false },
    ]);
  });
});
