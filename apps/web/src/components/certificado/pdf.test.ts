import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "bun";

import { enderecoDaConferencia, folhaDo } from "./folha";
import { FOLHA_EM_PX } from "./medidas-da-folha";
import { NOMES_DA_FOLHA } from "./nomes-de-teste";
import { pdfDaFolha } from "./pdf";

const ANA = {
  codigo: "7K3M-Q9TD",
  emitidoEm: "2026-10-14T15:00:00Z",
  horas: 2,
  nome: "Ana Souza",
  tituloDoCurso: "Fábrica e montagem",
};
const ORIGEM = "https://cursos.exemplo.com.br";
const LONGO = {
  ...ANA,
  nome: "Maria Aparecida dos Santos Albuquerque Figueiredo",
  tituloDoCurso:
    "Operação, ajuste, limpeza e manutenção preventiva da envasadora volumétrica pneumática de pistão para produtos pastosos e líquidos",
};

const pdfDe = async (c: typeof ANA) =>
  Buffer.from(
    await pdfDaFolha(folhaDo(c, enderecoDaConferencia(ORIGEM, c.codigo)))
  );

const PAGINA = /\/Type\s*\/Page\b/g;
const MEDIDA = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/;

describe("o PDF do certificado", () => {
  test.each([
    ["curtos", ANA],
    ["longos", LONGO],
  ])("com nome e curso %s, é uma página A4 em paisagem", async (_, c) => {
    const texto = (await pdfDe(c)).toString("latin1");
    expect(texto.match(PAGINA)?.length).toBe(1);
    const [, largura, altura] = MEDIDA.exec(texto) ?? [];
    expect([largura, altura].map((n) => Number(Number(n).toFixed(2)))).toEqual([
      841.89, 595.28,
    ]);
  });
});

const POPPLER = ["/usr/bin/pdftoppm", "/usr/bin/pdftotext"].every(existsSync);
const ZBAR = existsSync("/usr/bin/zbarimg");

function emDisco<T>(pdf: Buffer, ler: (arquivo: string) => T): T {
  const pasta = mkdtempSync(join(tmpdir(), "certificado-"));
  try {
    const arquivo = join(pasta, "certificado.pdf");
    writeFileSync(arquivo, pdf);
    return ler(arquivo);
  } finally {
    rmSync(pasta, { force: true, recursive: true });
  }
}

const textoDoPdf = (pdf: Buffer) =>
  emDisco(pdf, (arquivo) =>
    spawnSync(["pdftotext", "-layout", arquivo, "-"]).stdout.toString()
  );

interface Palavra {
  direita: number;
  esquerda: number;
  pe: number;
  texto: string;
  topo: number;
}

const PAGINA_LIDA = /<page\b/g;
const PALAVRA =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;

const palavrasDoPdf = (pdf: Buffer) =>
  emDisco(pdf, (arquivo) => {
    const xml = spawnSync([
      "pdftotext",
      "-bbox",
      arquivo,
      "-",
    ]).stdout.toString();
    const palavras: Palavra[] = [...xml.matchAll(PALAVRA)].map(
      ([, x0, y0, x1, y1, texto = ""]) => ({
        direita: Number(x1),
        esquerda: Number(x0),
        pe: Number(y1),
        texto,
        topo: Number(y0),
      })
    );
    return { paginas: xml.match(PAGINA_LIDA)?.length ?? 0, palavras };
  });

const emPt = (px: number) => (px * 841.89) / FOLHA_EM_PX.largura;
const { centro, confere, pe } = FOLHA_EM_PX;
const DA_FOLHA = {
  direita: emPt(FOLHA_EM_PX.largura - centro.lado),
  esquerda: emPt(centro.lado),
  faixa: emPt(FOLHA_EM_PX.faixa.altura),
  pe: emPt(FOLHA_EM_PX.altura - pe.baixo - pe.acima - confere.qr),
};
const SEM_ESPACO = /\s+/g;
const HIFEN = /-/g;

describe.skipIf(!POPPLER)("o nome de qualquer tamanho no PDF", () => {
  test.each(NOMES_DA_FOLHA)(
    "%s: uma página, o nome entre a faixa e o pé, dentro das margens, inteiro ou cortado com reticências",
    async (_, nome) => {
      const { paginas, palavras } = palavrasDoPdf(
        await pdfDe({ ...LONGO, nome })
      );
      expect(paginas).toBe(1);
      const abre = palavras.findIndex((p) => p.texto === "Certificamos");
      const fecha = palavras.findIndex((p) => p.texto === "concluiu");
      const certificamos = palavras[abre];
      const doNome = palavras.slice(abre + 2, fecha);
      const ultima = palavras.find((p) => p.texto === "2026.");
      expect(certificamos?.topo).toBeGreaterThan(DA_FOLHA.faixa + 1);
      expect(doNome.length).toBeGreaterThan(0);
      for (const p of doNome) {
        expect(p.topo).toBeGreaterThanOrEqual(certificamos?.pe ?? 0);
        expect(p.esquerda).toBeGreaterThanOrEqual(DA_FOLHA.esquerda - 0.5);
        expect(p.direita).toBeLessThanOrEqual(DA_FOLHA.direita + 0.5);
      }
      expect(ultima?.pe ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
        DA_FOLHA.pe
      );
      const lido = doNome
        .map((p) => p.texto)
        .join("")
        .replace(HIFEN, "");
      const inteiro = nome.replace(SEM_ESPACO, "");
      if (lido !== inteiro) {
        expect(lido.endsWith("…")).toBe(true);
        expect(inteiro.startsWith(lido.slice(0, -1))).toBe(true);
      }
    }
  );
});

describe.skipIf(!POPPLER)("o PDF lido pelo poppler", () => {
  test("traz nome, curso, carga horária, data, código e o endereço da conferência", async () => {
    const texto = textoDoPdf(await pdfDe(ANA));
    for (const trecho of [
      "Certificado de conclusão",
      "Ana Souza",
      "Fábrica e montagem",
      "com carga horária de 2 horas, em 14 de outubro de 2026.",
      "7K3M-Q9TD",
      "Confira em cursos.exemplo.com.br/certificado/7K3M-Q9TD",
    ]) {
      expect(texto).toContain(trecho);
    }
  });

  test("o nome e o curso longos entram inteiros", async () => {
    const texto = textoDoPdf(await pdfDe(LONGO)).replace(/\s+/g, " ");
    expect(texto).toContain(LONGO.nome);
    expect(texto).toContain(LONGO.tituloDoCurso);
  });

  test.skipIf(!ZBAR)("o QR leva à conferência do código", async () => {
    const lido = emDisco(await pdfDe(ANA), (arquivo) => {
      spawnSync([
        "pdftoppm",
        "-r",
        "150",
        "-png",
        "-singlefile",
        arquivo,
        arquivo,
      ]);
      return spawnSync(["zbarimg", "-q", "--raw", `${arquivo}.png`])
        .stdout.toString()
        .trim();
    });
    expect(lido).toBe("https://cursos.exemplo.com.br/certificado/7K3M-Q9TD");
  });
});
