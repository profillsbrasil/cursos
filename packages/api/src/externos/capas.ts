// Capas num bucket S3 (o bucket "capas" da Railway, que é privado: o app serve
// cada capa em /capa/<chave>). Só o servidor importa este arquivo: node:crypto,
// image-size e as chaves do bucket, que entram por apps/web/src/services.ts. O que
// é uma capa aceitável mora em dominio/capa.ts.

import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { imageSize } from "image-size";

import {
  type ImagemDaCapa,
  type RecusaDaCapa,
  recusaDaMedida,
  recusaDoTamanho,
} from "../dominio/capa";

export type CapaRecebida =
  | { tipo: "guardada"; imagem: ImagemDaCapa }
  | { tipo: "recusa"; recusa: RecusaDaCapa };

/** Quem chama não sabe de bucket, chave, URL pública nem medida. */
export interface Capas {
  /** A capa guardada sob a chave, ou null quando a chave não é de capa ou não existe. */
  abrir: (chave: string) => Promise<Response | null>;
  receber: (arquivo: Blob) => Promise<CapaRecebida>;
}

const TIPOS = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;
type Extensao = keyof typeof TIPOS;

const ehExtensao = (tipo: string | undefined): tipo is Extensao =>
  tipo !== undefined && Object.hasOwn(TIPOS, tipo);

export type CapaLida =
  | {
      tipo: "lida";
      altura: number;
      bytes: Uint8Array<ArrayBuffer>;
      /** sha256 dos bytes mais a extensão: a mesma imagem tem sempre a mesma chave. */
      chave: string;
      contentType: (typeof TIPOS)[Extensao];
      largura: number;
    }
  | { tipo: "recusa"; recusa: RecusaDaCapa };

const recusa = (r: RecusaDaCapa) => ({ recusa: r, tipo: "recusa" }) as const;

/** Formato e medida pelo conteúdo, não pelo content-type que o navegador manda. */
export function lerCapa(bytes: Uint8Array<ArrayBuffer>): CapaLida {
  let medida: ReturnType<typeof imageSize>;
  try {
    medida = imageSize(bytes);
  } catch {
    return recusa({ tipo: "formato" });
  }
  if (!ehExtensao(medida.type)) {
    return recusa({ tipo: "formato" });
  }
  // EXIF 5 a 8 gira 90 graus: o navegador mostra a imagem com os lados trocados.
  const girada = (medida.orientation ?? 1) >= 5;
  const largura = girada ? medida.height : medida.width;
  const altura = girada ? medida.width : medida.height;
  const daMedida = recusaDaMedida(largura, altura);
  if (daMedida) {
    return recusa(daMedida);
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  return {
    altura,
    bytes,
    chave: `${hash}.${medida.type}`,
    contentType: TIPOS[medida.type],
    largura,
    tipo: "lida",
  };
}

const CHAVE = /^[0-9a-f]{64}\.(jpg|png|webp)$/;

export interface BucketDeCapas {
  bucket: string;
  /** Endereço da API S3, como https://t3.storageapi.dev. */
  endpoint: string;
  idDaChave: string;
  regiao: string;
  segredo: string;
}

/**
 * O objeto é imutável (nome = hash), então o envio é idempotente: o PUT
 * reescreve os mesmos bytes e o cache pode durar um ano. Capa trocada deixa o
 * objeto antigo no bucket; não há coleta.
 */
export function capasNoBucket(
  cfg: BucketDeCapas,
  enviar: typeof fetch = fetch
): Capas {
  const aws = new AwsClient({
    accessKeyId: cfg.idDaChave,
    region: cfg.regiao,
    secretAccessKey: cfg.segredo,
    service: "s3",
  });
  const endpoint = new URL(cfg.endpoint);
  const doObjeto = (chave: string) =>
    `${endpoint.protocol}//${cfg.bucket}.${endpoint.host}/${chave}`;

  return {
    async abrir(chave) {
      if (!CHAVE.test(chave)) {
        return null;
      }
      const resposta = await enviar(await aws.sign(doObjeto(chave)));
      if (resposta.status === 404) {
        return null;
      }
      if (!resposta.ok) {
        console.error(
          "Bucket recusou a leitura da capa:",
          resposta.status,
          await resposta.text()
        );
        throw new Error("Não foi possível ler a capa.");
      }
      return resposta;
    },
    async receber(arquivo) {
      const pesada = recusaDoTamanho(arquivo.size);
      if (pesada) {
        return recusa(pesada);
      }
      const lida = lerCapa(new Uint8Array(await arquivo.arrayBuffer()));
      if (lida.tipo === "recusa") {
        return lida;
      }
      const assinado = await aws.sign(doObjeto(lida.chave), {
        body: lida.bytes,
        headers: { "content-type": lida.contentType },
        method: "PUT",
      });
      // Os bytes vão no init: um Request o fetch do Next recria a partir do
      // stream do corpo, o PUT sai sem Content-Length e o bucket responde 411.
      const resposta = await enviar(assinado.url, {
        body: lida.bytes,
        headers: assinado.headers,
        method: "PUT",
      });
      if (!resposta.ok) {
        console.error(
          "Bucket recusou a capa:",
          resposta.status,
          await resposta.text()
        );
        throw new Error("Não foi possível enviar a capa. Tente de novo.");
      }
      return {
        imagem: {
          altura: lida.altura,
          largura: lida.largura,
          url: `/capa/${lida.chave}`,
        },
        tipo: "guardada",
      };
    },
  };
}

/** Ambiente sem as variáveis S3_*: o resto do admin funciona. */
export const capasDesligadas: Capas = {
  abrir: () => Promise.resolve(null),
  receber: () => Promise.resolve(recusa({ tipo: "desligado" })),
};
