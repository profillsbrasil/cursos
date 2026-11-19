import { describe, expect, test } from "bun:test";

import type {
  CertificadoEmitido,
  PaginaDoCertificado,
} from "@cursos/api/dominio/pagina-do-certificado";

import { rotaDoPdfDaConferencia, rotaDoPdfDoAluno } from "./resposta-do-pdf";

const DA_ANA: CertificadoEmitido = {
  codigo: "7K3M-Q9TD",
  emitidoEm: "2026-10-14T15:00:00Z",
  horas: 2,
  nome: "Ana Souza",
  tituloDoCurso: "Fábrica e montagem",
};

const SLUG = "fabrica-e-montagem";

const pedido = () =>
  new Request("https://cursos.exemplo.com.br/x", {
    headers: { host: "cursos.exemplo.com.br", "x-forwarded-proto": "https" },
  });

async function pdfDoAluno(pagina: PaginaDoCertificado | null, pedida = SLUG) {
  const pedidos: string[] = [];

  const resposta = await rotaDoPdfDoAluno((slug) => {
    pedidos.push(slug);

    return Promise.resolve(slug === SLUG ? pagina : null);
  })(pedido(), { params: Promise.resolve({ slug: pedida }) });

  return { pedidos, resposta };
}

async function pdfDoCodigo(codigo: string) {
  const conferidos: string[] = [];

  const resposta = await rotaDoPdfDaConferencia((c) => {
    conferidos.push(c);

    return Promise.resolve(c === DA_ANA.codigo ? DA_ANA : null);
  })(pedido(), { params: Promise.resolve({ codigo }) });

  return { conferidos, resposta };
}

const inicioDoPdf = async (resposta: Response) =>
  Buffer.from(await resposta.arrayBuffer())
    .subarray(0, 5)
    .toString();

describe("o PDF da página do aluno", () => {
  test("a dona do certificado baixa o PDF dela", async () => {
    const { pedidos, resposta } = await pdfDoAluno({
      categoria: "Produção e montagem",
      certificado: DA_ANA,
      slug: SLUG,
      tipo: "emitido",
    });

    expect(pedidos).toEqual([SLUG]);
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("content-disposition")).toBe(
      'attachment; filename="certificado-7K3M-Q9TD.pdf"'
    );
    expect(await inicioDoPdf(resposta)).toBe("%PDF-");
  });

  test("outra pessoa no mesmo curso, sem certificado, recebe 404", async () => {
    const { resposta } = await pdfDoAluno({
      aulas: { feitas: 3, total: 7 },
      curso: { slug: SLUG, titulo: "Fábrica e montagem" },
      questionarios: { aprovados: 0, total: 2 },
      tipo: "falta",
    });

    expect(resposta.status).toBe(404);
  });

  test("quem não abre o curso recebe 404", async () => {
    expect((await pdfDoAluno(null)).resposta.status).toBe(404);
  });

  test("o slug de outro curso não leva o certificado deste: 404", async () => {
    const { pedidos, resposta } = await pdfDoAluno(
      {
        categoria: "Produção e montagem",
        certificado: DA_ANA,
        slug: SLUG,
        tipo: "emitido",
      },
      "outro-curso"
    );

    expect(pedidos).toEqual(["outro-curso"]);
    expect(resposta.status).toBe(404);
  });

  test("sem nome na conta não há folha: 404", async () => {
    const { resposta } = await pdfDoAluno({
      categoria: "Produção e montagem",
      certificado: { ...DA_ANA, nome: null },
      slug: SLUG,
      tipo: "emitido",
    });

    expect(resposta.status).toBe(404);
  });
});

describe("o PDF da conferência pública", () => {
  test("o código que existe dá o PDF dele", async () => {
    const { conferidos, resposta } = await pdfDoCodigo(DA_ANA.codigo);
    expect(conferidos).toEqual([DA_ANA.codigo]);
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("content-disposition")).toBe(
      'attachment; filename="certificado-7K3M-Q9TD.pdf"'
    );
    expect(await inicioDoPdf(resposta)).toBe("%PDF-");
  });

  test("o código que não existe dá 404", async () => {
    const { conferidos, resposta } = await pdfDoCodigo("ZZZZ-ZZZZ");
    expect(conferidos).toEqual(["ZZZZ-ZZZZ"]);
    expect(resposta.status).toBe(404);
  });
});
