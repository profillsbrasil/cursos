import { describe, expect, test } from "bun:test";

import { textoDaTrocaDePerfil } from "./perfis";

describe("textoDaTrocaDePerfil", () => {
  test("diz o bônus só quando ele nasceu na troca", () => {
    expect(textoDaTrocaDePerfil("Ana", "funcionario", true)).toBe(
      "Ana agora é Funcionário. +5.000 pts de bônus."
    );
    expect(textoDaTrocaDePerfil("Ana", "funcionario", false)).toBe(
      "Ana agora é Funcionário."
    );
    expect(textoDaTrocaDePerfil("Ana", "cliente", false)).toBe(
      "Ana agora é Cliente."
    );
  });
});
