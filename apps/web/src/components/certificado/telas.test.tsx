import { describe, expect, test } from "bun:test";
import type {
  CertificadoEmitido,
  PaginaDoCertificado,
} from "@cursos/api/dominio/pagina-do-certificado";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { ReciboDaConferencia, SemCertificado } from "./conferencia";
import { enderecoDaConferencia, origemDoPedido } from "./folha";
import { TelaDoCertificado } from "./tela-do-certificado";

const HOJE = "2026-10-16" as DiaISO;
const ANA: CertificadoEmitido = {
  codigo: "7K3M-Q9TD",
  emitidoEm: "2026-10-14T15:00:00Z",
  horas: 2,
  nome: "Ana Souza",
  tituloDoCurso: "Fábrica e montagem",
};
const EMITIDO: PaginaDoCertificado = {
  categoria: "Produção e montagem",
  certificado: ANA,
  slug: "fabrica-e-montagem",
  tipo: "emitido",
};

const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

const tela = (pagina: PaginaDoCertificado) =>
  renderToStaticMarkup(
    <TelaDoCertificado
      hoje={HOJE}
      origem="https://cursos.exemplo.com.br"
      pagina={pagina}
    />
  );

describe("a página do aluno", () => {
  test("com o certificado, mostra a folha, os dados e o PDF da sessão", () => {
    const html = tela(EMITIDO);
    const lido = texto(html);
    expect(lido).toContain("Ana Souza");
    expect(lido).toContain("Concluído em 14 de out.");
    expect(lido).toContain("Carga horária 2 horas");
    expect(lido).toContain(
      "com carga horária de 2 horas , em 14 de outubro de 2026."
    );
    expect(lido).toContain(
      "Confira em cursos.exemplo.com.br/certificado/7K3M-Q9TD"
    );
    expect(html).toContain('href="/cursos/fabrica-e-montagem/certificado/pdf"');
    expect(lido).toContain("Copiar link de conferência");
  });

  test("sem nome na conta, não há folha nem PDF, e a página diz por quê", () => {
    const html = tela({ ...EMITIDO, certificado: { ...ANA, nome: null } });
    expect(texto(html)).toContain("Falta o seu nome na conta");
    expect(html).not.toContain("<figure");
    expect(html).not.toContain("/certificado/pdf");
  });

  test("sem certificado, diz o que falta e leva à página do curso", () => {
    const html = tela({
      aulas: { feitas: 3, total: 7 },
      curso: { slug: "fabrica-e-montagem", titulo: "Fábrica e montagem" },
      questionarios: { aprovados: 0, total: 0 },
      tipo: "falta",
    });
    expect(texto(html)).toContain(
      "O certificado sai quando você concluir o curso"
    );
    expect(texto(html)).toContain("3 de 7 aulas assistidas");
    expect(texto(html)).not.toContain("aprovado");
    expect(html).toContain('href="/cursos/fabrica-e-montagem"');
    expect(html).not.toContain("<figure");
  });

  test("sem certificado, conta os questionários aprovados ao lado das aulas", () => {
    const lido = texto(
      tela({
        aulas: { feitas: 7, total: 7 },
        curso: { slug: "fabrica-e-montagem", titulo: "Fábrica e montagem" },
        questionarios: { aprovados: 4, total: 7 },
        tipo: "falta",
      })
    );
    expect(lido).toContain("7 de 7 aulas assistidas");
    expect(lido).toContain("4 de 7 questionários aprovados");
    expect(lido.indexOf("aulas assistidas")).toBeLessThan(
      lido.indexOf("questionários aprovados")
    );
  });

  test("um questionário só fica no singular", () => {
    expect(
      texto(
        tela({
          aulas: { feitas: 2, total: 3 },
          curso: { slug: "fabrica-e-montagem", titulo: "Fábrica e montagem" },
          questionarios: { aprovados: 0, total: 1 },
          tipo: "falta",
        })
      )
    ).toContain("0 de 1 questionário aprovado");
  });
});

describe("a conferência pública", () => {
  test("o certificado válido mostra nome, curso, os fatos e o PDF do código", () => {
    const html = renderToStaticMarkup(
      <ReciboDaConferencia certificado={ANA} hoje={HOJE} />
    );
    const lido = texto(html);
    for (const trecho of [
      "Certificado válido",
      "Ana Souza",
      "Fábrica e montagem",
      "Concluído em 14 de out.",
      "Carga horária 2 horas",
      "Código 7K3M-Q9TD",
      "Emitido por Profills Brasil",
    ]) {
      expect(lido).toContain(trecho);
    }
    expect(html).toContain('href="/certificado/7K3M-Q9TD/pdf"');
  });

  test("sem nome, confirma o certificado sem mostrar nome nem PDF", () => {
    const html = renderToStaticMarkup(
      <ReciboDaConferencia certificado={{ ...ANA, nome: null }} hoje={HOJE} />
    );
    expect(texto(html)).toContain("Nome não disponível");
    expect(html).not.toContain("/pdf");
  });

  test("o código que não existe aparece na frase e no campo", () => {
    const html = renderToStaticMarkup(<SemCertificado digitado="7K3M-Q9TX" />);
    expect(texto(html)).toContain("Nenhum certificado com este código");
    expect(texto(html)).toContain("7K3M-Q9TX não existe");
    expect(html).toContain('value="7K3M-Q9TX"');
  });
});

describe("o endereço da conferência", () => {
  test("sai da origem do pedido, atrás do proxy", () => {
    const origem = origemDoPedido(
      new Headers({
        host: "interno:3000",
        "x-forwarded-host": "cursos-git-pr.vercel.app",
        "x-forwarded-proto": "https",
      })
    );
    expect(enderecoDaConferencia(origem, "7K3M-Q9TD")).toEqual({
      exibido: "cursos-git-pr.vercel.app/certificado/7K3M-Q9TD",
      url: "https://cursos-git-pr.vercel.app/certificado/7K3M-Q9TD",
    });
  });

  test("no next dev, sem proxy, é o localhost em http", () => {
    expect(origemDoPedido(new Headers({ host: "localhost:3001" }))).toBe(
      "http://localhost:3001"
    );
  });
});
