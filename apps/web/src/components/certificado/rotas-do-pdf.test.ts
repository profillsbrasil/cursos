import { describe, expect, mock, test } from "bun:test";
import type {
  CertificadoEmitido,
  PaginaDoCertificado,
} from "@cursos/api/dominio/pagina-do-certificado";

let daSessao: PaginaDoCertificado | null = null;
let doCodigo: CertificadoEmitido | null = null;

mock.module("@/server/api", () => ({
  carregarPaginaDoCertificado: () => Promise.resolve(daSessao),
  conferirCertificado: () => Promise.resolve(doCodigo),
}));

const doAluno = await import(
  "@/app/(aluno)/cursos/[slug]/certificado/pdf/route"
);
const daConferencia = await import("@/app/certificado/[codigo]/pdf/route");

const DA_ANA: CertificadoEmitido = {
  codigo: "7K3M-Q9TD",
  emitidoEm: "2026-10-14T15:00:00Z",
  horas: 2,
  nome: "Ana Souza",
  tituloDoCurso: "Fábrica e montagem",
};

const pedido = () =>
  new Request("https://cursos.exemplo.com.br/x", {
    headers: { host: "cursos.exemplo.com.br", "x-forwarded-proto": "https" },
  });

const pdfDoAluno = () =>
  doAluno.GET(pedido(), {
    params: Promise.resolve({ slug: "fabrica-e-montagem" }),
  });

const pdfDoCodigo = () =>
  daConferencia.GET(pedido(), {
    params: Promise.resolve({ codigo: "7K3M-Q9TD" }),
  });

describe("o PDF da página do aluno", () => {
  test("a dona do certificado baixa o PDF dela", async () => {
    daSessao = {
      categoria: "Produção e montagem",
      certificado: DA_ANA,
      slug: "fabrica-e-montagem",
      tipo: "emitido",
    };
    const resposta = await pdfDoAluno();
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
    daSessao = {
      aulas: { feitas: 3, total: 7 },
      curso: { slug: "fabrica-e-montagem", titulo: "Fábrica e montagem" },
      questionarios: { aprovados: 0, total: 2 },
      tipo: "falta",
    };
    expect((await pdfDoAluno()).status).toBe(404);
  });

  test("quem não abre o curso recebe 404", async () => {
    daSessao = null;
    expect((await pdfDoAluno()).status).toBe(404);
  });

  test("sem nome na conta não há folha: 404", async () => {
    daSessao = {
      categoria: "Produção e montagem",
      certificado: { ...DA_ANA, nome: null },
      slug: "fabrica-e-montagem",
      tipo: "emitido",
    };
    expect((await pdfDoAluno()).status).toBe(404);
  });
});

describe("o PDF da conferência pública", () => {
  test("o código que existe dá o PDF", async () => {
    doCodigo = DA_ANA;
    const resposta = await pdfDoCodigo();
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
  });

  test("o código que não existe dá 404", async () => {
    doCodigo = null;
    expect((await pdfDoCodigo()).status).toBe(404);
  });
});
