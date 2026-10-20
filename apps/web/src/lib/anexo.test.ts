import { describe, expect, test } from "bun:test";

import { disposicaoDoAnexo } from "./anexo";

describe("disposicaoDoAnexo", () => {
  test("o nome com acento vai em UTF-8 no filename* e sem acento na reserva", () => {
    expect(disposicaoDoAnexo("Planilha de controle (versão 2).xlsx")).toBe(
      "attachment; filename=\"Planilha de controle (versao 2).xlsx\"; filename*=UTF-8''Planilha%20de%20controle%20%28vers%C3%A3o%202%29.xlsx"
    );
  });

  test("aspas, barra invertida e caractere fora do ASCII não quebram o cabeçalho", () => {
    expect(disposicaoDoAnexo('a"b\\c✓.pdf')).toBe(
      "attachment; filename=\"a_b_c_.pdf\"; filename*=UTF-8''a%22b%5Cc%E2%9C%93.pdf"
    );
  });
});
