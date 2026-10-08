// Capas no Supabase Storage (bucket público "capas"). Só o servidor importa este
// arquivo: node:crypto, image-size e a chave service role, que entra por
// apps/web/src/services.ts.

import { createHash } from "node:crypto";
import { imageSize } from "image-size";

export const LIMITE_DA_CAPA = {
  /** Corpo de função na Vercel vai até 4,5 MB; sobra espaço para o documento. */
  bytes: 4 * 1024 * 1024,
  ladoMaximo: 8000,
  /** O banner mostra a capa a 44vw; abaixo disso ela fica borrada. */
  larguraMinima: 640,
} as const;

export type RecusaDaCapa =
  | { tipo: "formato" }
  | { tipo: "pesada"; limiteMb: number }
  | { tipo: "estreita"; larguraMinima: number }
  | { tipo: "enorme"; ladoMaximo: number }
  | { tipo: "desligado" };

export interface ImagemDaCapa {
  altura: number;
  largura: number;
  url: string;
}

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
  if (bytes.byteLength > LIMITE_DA_CAPA.bytes) {
    return recusa({
      limiteMb: LIMITE_DA_CAPA.bytes / 1024 / 1024,
      tipo: "pesada",
    });
  }
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
  if (largura < LIMITE_DA_CAPA.larguraMinima) {
    return recusa({
      larguraMinima: LIMITE_DA_CAPA.larguraMinima,
      tipo: "estreita",
    });
  }
  if (Math.max(largura, altura) > LIMITE_DA_CAPA.ladoMaximo) {
    return recusa({ ladoMaximo: LIMITE_DA_CAPA.ladoMaximo, tipo: "enorme" });
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
        throw new Error(
          `O Storage respondeu ${resposta.status}: ${await resposta.text()}`
        );
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
