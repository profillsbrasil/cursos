import { describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  lerMaterial,
  materiaisDesligados,
  materiaisNoBucket,
} from "./materiais";

const bytesDe = (...prefixo: number[]) =>
  new Uint8Array([
    ...prefixo,
    ...new TextEncoder().encode(" resto do arquivo"),
  ]);

const PDF = bytesDe(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37);
const ZIP = bytesDe(0x50, 0x4b, 0x03, 0x04);
const OLE = bytesDe(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);

/** Só o cabeçalho de um PNG: assinatura e IHDR, que é o que o image-size lê. */
function cabecalhoPng(): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  const v = new DataView(b.buffer);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  v.setUint32(8, 13);
  b.set([0x49, 0x48, 0x44, 0x52], 12);
  v.setUint32(16, 10);
  v.setUint32(20, 10);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

describe("lerMaterial", () => {
  test("cada família de assinatura confirma o tipo da extensão", () => {
    const lidos = [
      lerMaterial("checklist.pdf", PDF),
      lerMaterial("planilha.xlsx", ZIP),
      lerMaterial("slides.PPTX", ZIP),
      lerMaterial("arquivos.zip", ZIP),
      lerMaterial("antigo.doc", OLE),
      lerMaterial("antiga.xls", OLE),
      lerMaterial("foto.png", cabecalhoPng()),
    ];
    expect(lidos.map((l) => (l.tipo === "lido" ? l.arquivo.tipo : l))).toEqual([
      "pdf",
      "xlsx",
      "pptx",
      "zip",
      "doc",
      "xls",
      "png",
    ]);
  });

  test("a chave é o sha256 dos bytes e a extensão do tipo; o nome original fica", () => {
    expect(lerMaterial("Checklist de setup.PDF", PDF)).toMatchObject({
      arquivo: {
        bytes: PDF.length,
        chave: `${sha(PDF)}.pdf`,
        nomeDoArquivo: "Checklist de setup.PDF",
        tipo: "pdf",
      },
      contentType: "application/pdf",
      tipo: "lido",
    });
  });

  test("assinatura que não bate com a extensão é recusada", () => {
    expect(
      [
        lerMaterial("planilha.xlsx", PDF),
        lerMaterial("manual.pdf", ZIP),
        lerMaterial("antigo.doc", ZIP),
        lerMaterial("foto.jpg", cabecalhoPng()),
        lerMaterial("texto.pdf", new TextEncoder().encode("só texto")),
      ].map((l) => (l.tipo === "recusa" ? l.recusa : l))
    ).toEqual([
      { esperado: "xlsx", tipo: "assinatura" },
      { esperado: "pdf", tipo: "assinatura" },
      { esperado: "doc", tipo: "assinatura" },
      { esperado: "jpg", tipo: "assinatura" },
      { esperado: "pdf", tipo: "assinatura" },
    ]);
  });

  test("extensão fora da lista é recusada mesmo com bytes de PDF", () => {
    expect(lerMaterial("manual.exe", PDF)).toEqual({
      recusa: { tipo: "formato" },
      tipo: "recusa",
    });
  });
});

const BUCKET = {
  bucket: "materiais-teste",
  endpoint: "https://t3.storageapi.dev",
  idDaChave: "id-de-teste",
  regiao: "auto",
  segredo: "segredo-de-teste",
};

/** Um fetch falso que guarda cada Request assinado e responde com `resposta`. */
function bucketFalso(resposta: (pedido: Request) => Response) {
  const pedidos: Request[] = [];
  const enviar = ((url: Request | string, init?: RequestInit) => {
    const pedido = new Request(url, init);
    pedidos.push(pedido);
    return Promise.resolve(resposta(pedido));
  }) as unknown as typeof fetch;
  return { enviar, pedidos };
}

describe("materiaisNoBucket", () => {
  test("envia com PUT assinado e o content-type do tipo, e devolve a chave e o nome", async () => {
    const { enviar, pedidos } = bucketFalso(() => new Response(null));
    const arquivo = new File([ZIP], "controle-volume-lote.xlsx", {
      type: "application/octet-stream",
    });

    const recebido = await materiaisNoBucket(BUCKET, enviar).receber(arquivo);

    expect(recebido).toEqual({
      arquivo: {
        bytes: ZIP.length,
        chave: `${sha(ZIP)}.xlsx`,
        nomeDoArquivo: "controle-volume-lote.xlsx",
        tipo: "xlsx",
      },
      tipo: "guardado",
    });
    expect(pedidos.map((p) => [p.method, p.url])).toEqual([
      ["PUT", `https://materiais-teste.t3.storageapi.dev/${sha(ZIP)}.xlsx`],
    ]);
    expect(pedidos[0]?.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(pedidos[0]?.headers.get("authorization")).toStartWith(
      "AWS4-HMAC-SHA256 Credential=id-de-teste/"
    );
  });

  test("arquivo recusado não chega ao bucket; o pesado nem é lido", async () => {
    const { enviar, pedidos } = bucketFalso(() => new Response(null));
    const materiais = materiaisNoBucket(BUCKET, enviar);
    let lidos = 0;
    const pesado = {
      arrayBuffer: () => {
        lidos += 1;
        return Promise.resolve(new ArrayBuffer(0));
      },
      name: "manual.pdf",
      size: 50 * 1024 * 1024 + 1,
    } as unknown as File;

    expect(await materiais.receber(pesado)).toEqual({
      recusa: { bytes: 50 * 1024 * 1024 + 1, tipo: "pesado" },
      tipo: "recusa",
    });
    expect(
      await materiais.receber(new File([ZIP], "manual.pdf"))
    ).toMatchObject({ recusa: { tipo: "assinatura" }, tipo: "recusa" });
    expect(lidos).toBe(0);
    expect(pedidos).toHaveLength(0);
  });

  test("o corpo do erro do bucket vai ao log, não à mensagem", async () => {
    const { enviar } = bucketFalso(
      () => new Response("sem bucket", { status: 403 })
    );
    const log = spyOn(console, "error").mockImplementation(() => undefined);

    const erro = await materiaisNoBucket(BUCKET, enviar)
      .receber(new File([PDF], "a.pdf"))
      .catch((e: unknown) => e);
    const registrado = log.mock.calls.flat().join(" ");
    log.mockRestore();

    expect(String(erro)).toBe(
      "Error: Não foi possível enviar o material. Tente de novo."
    );
    expect(registrado).toContain("403 sem bucket");
  });

  test("abrir lê com GET assinado; existe pergunta com HEAD; 404 é null e false", async () => {
    const chave = `${"a".repeat(64)}.pdf`;
    const achado = bucketFalso(() => new Response("bytes"));
    const sumido = bucketFalso(() => new Response(null, { status: 404 }));

    const resposta = await materiaisNoBucket(BUCKET, achado.enviar).abrir(
      chave
    );
    const existe = await materiaisNoBucket(BUCKET, achado.enviar).existe(chave);

    expect(await resposta?.text()).toBe("bytes");
    expect(existe).toBe(true);
    expect(achado.pedidos.map((p) => [p.method, p.url])).toEqual([
      ["GET", `https://materiais-teste.t3.storageapi.dev/${chave}`],
      ["HEAD", `https://materiais-teste.t3.storageapi.dev/${chave}`],
    ]);
    const semNada = materiaisNoBucket(BUCKET, sumido.enviar);
    expect([await semNada.abrir(chave), await semNada.existe(chave)]).toEqual([
      null,
      false,
    ]);
  });

  test("chave que não é de material não chama o bucket", async () => {
    const { enviar, pedidos } = bucketFalso(() => new Response("x"));
    const materiais = materiaisNoBucket(BUCKET, enviar);
    const chaves = ["../segredo", "a.pdf", `${"a".repeat(64)}.exe`];

    expect(await Promise.all(chaves.map(materiais.abrir))).toEqual([
      null,
      null,
      null,
    ]);
    expect(await Promise.all(chaves.map(materiais.existe))).toEqual([
      false,
      false,
      false,
    ]);
    expect(pedidos).toHaveLength(0);
  });

  test("sem configuração, recusa com desligado, não abre nada e nada existe", async () => {
    const chave = `${"a".repeat(64)}.pdf`;
    expect(await materiaisDesligados.receber(new File([PDF], "a.pdf"))).toEqual(
      { recusa: { tipo: "desligado" }, tipo: "recusa" }
    );
    expect(await materiaisDesligados.abrir(chave)).toBeNull();
    expect(await materiaisDesligados.existe(chave)).toBe(false);
  });
});
