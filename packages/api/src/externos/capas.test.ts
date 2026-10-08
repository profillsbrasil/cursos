import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  capasDesligadas,
  capasDoSupabase,
  LIMITE_DA_CAPA,
  lerCapa,
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

  test("PNG estreito, PNG enorme e arquivo pesado são recusados", () => {
    expect(lerCapa(cabecalhoPng(639, 400))).toEqual({
      recusa: { larguraMinima: 640, tipo: "estreita" },
      tipo: "recusa",
    });
    expect(lerCapa(cabecalhoPng(1280, 8001))).toEqual({
      recusa: { ladoMaximo: 8000, tipo: "enorme" },
      tipo: "recusa",
    });
    const pesado = new Uint8Array(LIMITE_DA_CAPA.bytes + 1);
    pesado.set(cabecalhoPng(1280, 720));
    expect(lerCapa(pesado)).toEqual({
      recusa: { limiteMb: 4, tipo: "pesada" },
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

describe("capasDoSupabase", () => {
  test("envia ao bucket capas com a chave e devolve a URL pública e a medida", async () => {
    const pedidos: { url: string; init: RequestInit | undefined }[] = [];
    const enviar = ((url: string, init?: RequestInit) => {
      pedidos.push({ init, url });
      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as unknown as typeof fetch;
    const capas = capasDoSupabase(
      { chave: "chave-de-teste", url: "https://exemplo.supabase.co/" },
      enviar
    );
    const bytes = await ler("comercial.jpg");
    const hash = createHash("sha256").update(bytes).digest("hex");

    const recebida = await capas.receber(new Blob([bytes]));

    expect(recebida).toEqual({
      imagem: {
        altura: 604,
        largura: 900,
        url: `https://exemplo.supabase.co/storage/v1/object/public/capas/${hash}.jpg`,
      },
      tipo: "guardada",
    });
    expect(pedidos.map((p) => p.url)).toEqual([
      `https://exemplo.supabase.co/storage/v1/object/capas/${hash}.jpg`,
    ]);
    expect(pedidos[0]?.init?.headers).toMatchObject({
      Authorization: "Bearer chave-de-teste",
      apikey: "chave-de-teste",
      "content-type": "image/jpeg",
      "x-upsert": "true",
    });
  });

  test("capa recusada não chega ao Storage; erro do Storage sobe", async () => {
    let chamadas = 0;
    const falha = (() => {
      chamadas += 1;
      return Promise.resolve(new Response("sem bucket", { status: 404 }));
    }) as unknown as typeof fetch;
    const capas = capasDoSupabase(
      { chave: "k", url: "https://x.supabase.co" },
      falha
    );

    expect(await capas.receber(new Blob(["texto"]))).toMatchObject({
      tipo: "recusa",
    });
    expect(chamadas).toBe(0);
    await expect(
      capas.receber(new Blob([await ler("comercial.jpg")]))
    ).rejects.toThrow("O Storage respondeu 404: sem bucket");
  });

  test("sem configuração, recusa com desligado", async () => {
    expect(await capasDesligadas.receber(new Blob(["x"]))).toEqual({
      recusa: { tipo: "desligado" },
      tipo: "recusa",
    });
  });
});
