// Capas no Supabase Storage (bucket público "capas"). Só o servidor importa este
// arquivo: node:crypto, image-size e a chave service role, que entra por
// apps/web/src/services.ts. O que é uma capa aceitável mora em dominio/capa.ts.

import { createHash } from "node:crypto";
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

const BUCKET = "capas";
const BARRAS_NO_FIM = /\/+$/;

/**
 * O objeto é imutável (nome = hash), então o envio é idempotente: x-upsert
 * reescreve os mesmos bytes e o cache pode durar um ano. Capa trocada deixa o
 * objeto antigo no bucket; não há coleta.
 */
export function capasDoSupabase(
  cfg: { chave: string; url: string },
  enviar: typeof fetch = fetch
): Capas {
  const base = cfg.url.replace(BARRAS_NO_FIM, "");
  return {
    async receber(arquivo) {
      const pesada = recusaDoTamanho(arquivo.size);
      if (pesada) {
        return recusa(pesada);
      }
      const lida = lerCapa(new Uint8Array(await arquivo.arrayBuffer()));
      if (lida.tipo === "recusa") {
        return lida;
      }
      const resposta = await enviar(
        `${base}/storage/v1/object/${BUCKET}/${lida.chave}`,
        {
          body: lida.bytes,
          headers: {
            Authorization: `Bearer ${cfg.chave}`,
            apikey: cfg.chave,
            "cache-control": "max-age=31536000",
            "content-type": lida.contentType,
            "x-upsert": "true",
          },
          method: "POST",
        }
      );
      if (!resposta.ok) {
        console.error(
          "Storage recusou a capa:",
          resposta.status,
          await resposta.text()
        );
        throw new Error("Não foi possível enviar a capa. Tente de novo.");
      }
      return {
        imagem: {
          altura: lida.altura,
          largura: lida.largura,
          url: `${base}/storage/v1/object/public/${BUCKET}/${lida.chave}`,
        },
        tipo: "guardada",
      };
    },
  };
}

/** Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY: o resto do admin funciona. */
export const capasDesligadas: Capas = {
  receber: () => Promise.resolve(recusa({ tipo: "desligado" })),
};
