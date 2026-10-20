import { describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { LIMITE_DA_CAPA } from "../dominio/capa";
import {
  bucketAssinado,
  capasDesligadas,
  capasNoBucket,
  lerCapa,
  lerPaginaDaListagem,
} from "./capas";

const PASTA = join(import.meta.dir, "../../../../apps/web/public/capas");

const ler = async (nome: string) =>
  new Uint8Array(await readFile(join(PASTA, nome)));

/** Só o cabeçalho de um PNG: assinatura e IHDR, que é o que a medida lê. */
function cabecalhoPng(
  largura: number,
  altura: number
): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  const v = new DataView(b.buffer);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  v.setUint32(8, 13);
  b.set([0x49, 0x48, 0x44, 0x52], 12);
  v.setUint32(16, largura);
  v.setUint32(20, altura);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}

describe("lerCapa", () => {
  test("as capas de public/capas são lidas como JPEG com a medida real", async () => {
    const nomes = (await readdir(PASTA)).filter((n) => n.endsWith(".jpg"));
    expect(nomes.length).toBeGreaterThan(0);
    const arquivos = await Promise.all(nomes.map(ler));
    for (const bytes of arquivos) {
      const lida = lerCapa(bytes);
      expect(lida).toMatchObject({ contentType: "image/jpeg", tipo: "lida" });
      if (lida.tipo === "lida") {
        expect(lida.largura).toBeGreaterThanOrEqual(
          LIMITE_DA_CAPA.larguraMinima
        );
        expect(lida.altura).toBeGreaterThan(0);
        const hash = createHash("sha256").update(bytes).digest("hex");
        expect(lida.chave).toBe(`${hash}.jpg`);
      }
    }
  });

  test("a medida de uma capa conhecida bate com a do seed (dados.ts)", async () => {
    expect(lerCapa(await ler("comercial.jpg"))).toMatchObject({
      altura: 604,
      largura: 900,
    });
  });

  test("arquivo de texto com nome de imagem é recusado pelo formato", () => {
    const texto = new TextEncoder().encode(
      "isto não é uma imagem, é um .jpg falso"
    );
    expect(lerCapa(texto)).toEqual({
      recusa: { tipo: "formato" },
      tipo: "recusa",
    });
  });

  test("GIF é imagem, mas não é formato de capa", () => {
    const gif = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x03, 0x58, 0x02, 0, 0, 0,
    ]);
    expect(lerCapa(gif)).toEqual({
      recusa: { tipo: "formato" },
      tipo: "recusa",
    });
  });

  test("PNG estreito e PNG enorme são recusados", () => {
    expect(lerCapa(cabecalhoPng(639, 400))).toEqual({
      recusa: { larguraMinima: 640, tipo: "estreita" },
      tipo: "recusa",
    });
    expect(lerCapa(cabecalhoPng(1280, 8001))).toEqual({
      recusa: { ladoMaximo: 8000, tipo: "enorme" },
      tipo: "recusa",
    });
  });

  test("PNG com altura 0 é recusado pelo formato", () => {
    expect(lerCapa(cabecalhoPng(1280, 0))).toEqual({
      recusa: { tipo: "formato" },
      tipo: "recusa",
    });
  });

  test("PNG no limite passa com content-type de PNG", () => {
    expect(lerCapa(cabecalhoPng(640, 8000))).toMatchObject({
      altura: 8000,
      contentType: "image/png",
      largura: 640,
      tipo: "lida",
    });
  });
});

const BUCKET = {
  bucket: "capas-teste",
  endpoint: "https://t3.storageapi.dev",
  idDaChave: "id-de-teste",
  regiao: "auto",
  segredo: "segredo-de-teste",
};

/**
 * Um fetch falso que guarda cada pedido assinado e responde com `resposta`.
 * `tamanhos` guarda o content-length que o S3 enxerga: só um corpo em bytes tem
 * tamanho conhecido; o corpo de um Request vai em chunked no runtime do Next.
 */
function bucketFalso(resposta: () => Response) {
  const pedidos: Request[] = [];
  const tamanhos: (number | null)[] = [];
  const enviar = ((url: Request | string, init?: RequestInit) => {
    pedidos.push(url instanceof Request ? url : new Request(url, init));
    tamanhos.push(
      init?.body instanceof Uint8Array ? init.body.byteLength : null
    );
    return Promise.resolve(resposta());
  }) as unknown as typeof fetch;
  return { enviar, pedidos, tamanhos };
}

describe("capasNoBucket", () => {
  test("envia ao bucket com PUT assinado e devolve a URL do app e a medida", async () => {
    const { enviar, pedidos, tamanhos } = bucketFalso(() => new Response(null));
    const bytes = await ler("comercial.jpg");
    const hash = createHash("sha256").update(bytes).digest("hex");

    const recebida = await capasNoBucket(BUCKET, enviar).receber(
      new Blob([bytes])
    );

    expect(recebida).toEqual({
      imagem: { altura: 604, largura: 900, url: `/capa/${hash}.jpg` },
      tipo: "guardada",
    });
    expect(pedidos.map((p) => [p.method, p.url])).toEqual([
      ["PUT", `https://capas-teste.t3.storageapi.dev/${hash}.jpg`],
    ]);
    expect(tamanhos).toEqual([bytes.length]);
    expect(await pedidos[0]?.bytes()).toEqual(bytes);
    expect(pedidos[0]?.headers.get("content-type")).toBe("image/jpeg");
    expect(pedidos[0]?.headers.get("authorization")).toStartWith(
      "AWS4-HMAC-SHA256 Credential=id-de-teste/"
    );
    expect(pedidos[0]?.headers.get("authorization")).toContain(
      "/auto/s3/aws4_request"
    );
  });

  test("capa recusada não chega ao bucket; o corpo do erro do bucket vai ao log, não à mensagem", async () => {
    const { enviar, pedidos } = bucketFalso(
      () => new Response("sem bucket", { status: 404 })
    );
    const capas = capasNoBucket(BUCKET, enviar);
    const log = spyOn(console, "error").mockImplementation(() => undefined);

    expect(await capas.receber(new Blob(["texto"]))).toMatchObject({
      tipo: "recusa",
    });
    expect(pedidos).toHaveLength(0);
    const erro = await capas
      .receber(new Blob([await ler("comercial.jpg")]))
      .catch((e: unknown) => e);
    const registrado = log.mock.calls.flat().join(" ");
    log.mockRestore();

    expect(String(erro)).toBe(
      "Error: Não foi possível enviar a capa. Tente de novo."
    );
    expect(registrado).toContain("404 sem bucket");
  });

  test("arquivo acima do teto é recusado sem ler os bytes", async () => {
    let lidos = 0;
    const pesado = {
      arrayBuffer: () => {
        lidos += 1;
        return Promise.resolve(new ArrayBuffer(0));
      },
      size: LIMITE_DA_CAPA.bytes + 1,
    } as unknown as Blob;

    expect(await capasNoBucket(BUCKET, fetch).receber(pesado)).toEqual({
      recusa: { limiteMb: 4, tipo: "pesada" },
      tipo: "recusa",
    });
    expect(lidos).toBe(0);
  });

  test("abrir lê a capa com GET assinado e devolve null quando ela não existe", async () => {
    const chave = `${"a".repeat(64)}.jpg`;
    const achada = bucketFalso(() => new Response("bytes"));
    const sumida = bucketFalso(() => new Response(null, { status: 404 }));

    const resposta = await capasNoBucket(BUCKET, achada.enviar).abrir(chave);

    expect(await resposta?.text()).toBe("bytes");
    expect(achada.pedidos.map((p) => [p.method, p.url])).toEqual([
      ["GET", `https://capas-teste.t3.storageapi.dev/${chave}`],
    ]);
    expect(await capasNoBucket(BUCKET, sumida.enviar).abrir(chave)).toBeNull();
  });

  test("abrir recusa chave que não é de capa sem chamar o bucket", async () => {
    const { enviar, pedidos } = bucketFalso(() => new Response("x"));
    const capas = capasNoBucket(BUCKET, enviar);

    const abertas = await Promise.all(
      ["../segredo", "a.jpg", `${"a".repeat(64)}.gif`].map(capas.abrir)
    );

    expect(abertas).toEqual([null, null, null]);
    expect(pedidos).toHaveLength(0);
  });

  test("sem configuração, recusa com desligado e não abre nada", async () => {
    expect(await capasDesligadas.receber(new Blob(["x"]))).toEqual({
      recusa: { tipo: "desligado" },
      tipo: "recusa",
    });
    expect(await capasDesligadas.abrir(`${"a".repeat(64)}.jpg`)).toBeNull();
  });
});

const paginaDaListagem = (
  objetos: { chave: string; bytes: number; em: string }[],
  proxima?: string
) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>capas-teste</Name>
  <KeyCount>${objetos.length}</KeyCount>
  <IsTruncated>${proxima ? "true" : "false"}</IsTruncated>
  ${proxima ? `<NextContinuationToken>${proxima}</NextContinuationToken>` : ""}
  ${objetos
    .map(
      (o) =>
        `<Contents><Key>${o.chave}</Key><LastModified>${o.em}</LastModified><ETag>&quot;x&quot;</ETag><Size>${o.bytes}</Size><StorageClass>STANDARD</StorageClass></Contents>`
    )
    .join("")}
</ListBucketResult>`;

describe("bucketAssinado", () => {
  test("listar segue o token de página em página, com GET assinado de ListObjectsV2", async () => {
    const paginas = [
      paginaDaListagem(
        [{ bytes: 10, chave: "a.jpg", em: "2026-10-01T10:00:00.000Z" }],
        "token+/="
      ),
      paginaDaListagem([
        { bytes: 20, chave: "b.pdf", em: "2026-10-02T10:00:00.000Z" },
        { bytes: 30, chave: "c.zip", em: "2026-10-03T10:00:00.000Z" },
      ]),
    ];
    const { enviar, pedidos } = bucketFalso(
      () => new Response(paginas.shift())
    );

    const objetos = await bucketAssinado(BUCKET, enviar).listar();

    expect(objetos).toEqual([
      {
        bytes: 10,
        chave: "a.jpg",
        modificadoEm: new Date("2026-10-01T10:00:00Z"),
      },
      {
        bytes: 20,
        chave: "b.pdf",
        modificadoEm: new Date("2026-10-02T10:00:00Z"),
      },
      {
        bytes: 30,
        chave: "c.zip",
        modificadoEm: new Date("2026-10-03T10:00:00Z"),
      },
    ]);
    expect(pedidos.map((p) => [p.method, p.url])).toEqual([
      ["GET", "https://capas-teste.t3.storageapi.dev/?list-type=2"],
      [
        "GET",
        "https://capas-teste.t3.storageapi.dev/?list-type=2&continuation-token=token%2B%2F%3D",
      ],
    ]);
    expect(pedidos[1]?.headers.get("authorization")).toStartWith(
      "AWS4-HMAC-SHA256 Credential=id-de-teste/"
    );
  });

  test("a listagem lê o bucket vazio e a chave com entidade de XML", () => {
    expect(lerPaginaDaListagem(paginaDaListagem([]))).toEqual({
      continuacao: undefined,
      objetos: [],
    });
    expect(
      lerPaginaDaListagem(
        paginaDaListagem([
          { bytes: 1, chave: "a&amp;b.txt", em: "2026-10-01T10:00:00Z" },
        ])
      ).objetos[0]?.chave
    ).toBe("a&b.txt");
  });

  test("apagar manda DELETE assinado do objeto e aceita o 204 e o 404", async () => {
    const respostas = [
      new Response(null, { status: 204 }),
      new Response(null, { status: 404 }),
    ];
    const { enviar, pedidos } = bucketFalso(
      () => respostas.shift() as Response
    );
    const bucket = bucketAssinado(BUCKET, enviar);

    await bucket.apagar("a.jpg");
    await bucket.apagar("b.pdf");

    expect(pedidos.map((p) => [p.method, p.url])).toEqual([
      ["DELETE", "https://capas-teste.t3.storageapi.dev/a.jpg"],
      ["DELETE", "https://capas-teste.t3.storageapi.dev/b.pdf"],
    ]);
    expect(pedidos[0]?.headers.get("authorization")).toStartWith(
      "AWS4-HMAC-SHA256 Credential=id-de-teste/"
    );
  });

  test("recusa do bucket na listagem e no apagar vira erro com o status e o corpo", async () => {
    const { enviar } = bucketFalso(
      () => new Response("AccessDenied", { status: 403 })
    );
    const bucket = bucketAssinado(BUCKET, enviar);

    expect(String(await bucket.listar().catch((e: unknown) => e))).toBe(
      "Error: Bucket capas-teste recusou a listagem: 403 AccessDenied"
    );
    expect(String(await bucket.apagar("a.jpg").catch((e: unknown) => e))).toBe(
      "Error: Bucket capas-teste recusou apagar a.jpg: 403 AccessDenied"
    );
  });
});
