import { describe, expect, test } from "bun:test";

import type {
  CertificadoEmitido,
  PaginaDoCertificado,
} from "@cursos/api/dominio/pagina-do-certificado";

import { certificadoDaPagina, respostaDoPdf } from "./resposta-do-pdf";

const DA_ANA: CertificadoEmitido = {
  codigo: "7K3M-Q9TD",
  emitidoEm: "2026-10-14T15:00:00Z",
  horas: 2,
  nome: "Ana Souza",
  tituloDoCurso: "Fábrica e montagem",
};

const ORIGEM = "https://cursos.exemplo.com.br";

const pdfDaPagina = (pagina: PaginaDoCertificado | null) =>
  respostaDoPdf(certificadoDaPagina(pagina), ORIGEM);

describe("o PDF da página do aluno", () => {
  test("a dona do certificado baixa o PDF dela", async () => {
    const resposta = await pdfDaPagina({
      categoria: "Produção e montagem",
      certificado: DA_ANA,
      slug: "fabrica-e-montagem",
      tipo: "emitido",
    });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("content-disposition")).toBe(
      'attachment; filename="certificado-7K3M-Q9TD.pdf"'
    );
    expect(
      Buffer.from(await resposta.arrayBuffer())
        .subarray(0, 5)
        .toString()
    ).toBe("%PDF-");
  });

  test("outra pessoa no mesmo curso, sem certificado, recebe 404", async () => {
    const resposta = await pdfDaPagina({
      aulas: { feitas: 3, total: 7 },
      curso: { slug: "fabrica-e-montagem", titulo: "Fábrica e montagem" },
      questionarios: { aprovados: 0, total: 2 },
      tipo: "falta",
    });

    expect(resposta.status).toBe(404);
  });

  test("quem não abre o curso recebe 404", async () => {
    expect((await pdfDaPagina(null)).status).toBe(404);
  });

  test("sem nome na conta não há folha: 404", async () => {
    const resposta = await pdfDaPagina({
      categoria: "Produção e montagem",
      certificado: { ...DA_ANA, nome: null },
      slug: "fabrica-e-montagem",
      tipo: "emitido",
    });

    expect(resposta.status).toBe(404);
  });
});

describe("o PDF da conferência pública", () => {
  test("o código que existe dá o PDF", async () => {
    const resposta = await respostaDoPdf(DA_ANA, ORIGEM);
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
  });

  test("o código que não existe dá 404", async () => {
    expect((await respostaDoPdf(null, ORIGEM)).status).toBe(404);
  });
});
