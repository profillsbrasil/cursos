import { describe, expect, test } from "bun:test";

import {
  LIMITE_DO_MATERIAL,
  mensagemDoMaterial,
  nomeGuardado,
  recusaAntesDeLer,
  tamanhoDoArquivo,
  tipoDoNome,
  tituloSugerido,
} from "./material";

describe("tipo do material pelo nome", () => {
  test("a extensão escolhe o tipo, sem diferença de caixa, e jpeg vale jpg", () => {
    expect(
      [
        "Manual.PDF",
        "planilha.xlsx",
        "foto.jpeg",
        "slides.pptx",
        "a.b.zip",
      ].map(tipoDoNome)
    ).toEqual(["pdf", "xlsx", "jpg", "pptx", "zip"]);
  });

  test("extensão fora da lista ou sem extensão não tem tipo", () => {
    expect(
      ["video.mp4", "script.exe", "LEIAME", "imagem.gif", "pdf"].map(tipoDoNome)
    ).toEqual([null, null, null, null, null]);
  });
});

describe("recusa antes de ler os bytes", () => {
  test("tipo fora da lista, arquivo vazio e arquivo acima de 50 MB", () => {
    expect(recusaAntesDeLer("video.mp4", 10)).toEqual({ tipo: "formato" });
    expect(recusaAntesDeLer("vazio.pdf", 0)).toEqual({ tipo: "vazio" });
    expect(recusaAntesDeLer("manual.pdf", LIMITE_DO_MATERIAL.bytes)).toBeNull();
    expect(
      recusaAntesDeLer("manual.pdf", LIMITE_DO_MATERIAL.bytes + 1)
    ).toEqual({
      bytes: LIMITE_DO_MATERIAL.bytes + 1,
      tipo: "pesado",
    });
  });

  test("a frase do pesado diz o tamanho do arquivo e o limite, para leigo", () => {
    const bytes = Math.round(61.6 * 1024 * 1024);
    expect(mensagemDoMaterial({ bytes, tipo: "pesado" })).toBe(
      "Tem 61,6 MB. O limite é 50 MB por arquivo."
    );
    expect(mensagemDoMaterial({ esperado: "xlsx", tipo: "assinatura" })).toBe(
      "O arquivo diz ser XLSX, mas o conteúdo não é. Exporte de novo e envie."
    );
  });
});

describe("tamanho do arquivo", () => {
  test("abaixo de 1 MB em KB inteiros; acima, em MB com uma casa", () => {
    expect(
      [88_064, 1_258_291, 15_518_924, 50 * 1024 * 1024, 10].map(
        tamanhoDoArquivo
      )
    ).toEqual(["86 KB", "1,2 MB", "14,8 MB", "50 MB", "1 KB"]);
  });
});

describe("título sugerido e nome guardado", () => {
  test("o título sai do nome, sem extensão, com hífen e sublinhado virando espaço", () => {
    expect(
      [
        "checklist-setup_ev400.pdf",
        "  Manual   do fabricante.PDF ",
        "--.pdf",
      ].map(tituloSugerido)
    ).toEqual([
      "checklist setup ev400",
      "Manual do fabricante",
      "Material de apoio",
    ]);
  });

  test("o título sugerido para no teto do título", () => {
    expect(tituloSugerido(`${"a".repeat(300)}.pdf`)).toHaveLength(
      LIMITE_DO_MATERIAL.titulo
    );
  });

  test("o nome acima do teto é cortado antes da extensão", () => {
    const nome = nomeGuardado(`${"n".repeat(250)}.xlsx`);
    expect(nome).toHaveLength(LIMITE_DO_MATERIAL.nomeDoArquivo);
    expect(nome.endsWith("n.xlsx")).toBe(true);
    expect(nomeGuardado(" curto.pdf ")).toBe("curto.pdf");
  });
});
