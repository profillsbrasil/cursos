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
import type { ObjetoDoBucket } from "../dominio/orfaos";

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

/** O bucket com pedido assinado (`aws4fetch`), que capas e materiais dividem. */
export function bucketAssinado(cfg: BucketDeCapas, enviar: typeof fetch) {
  const aws = new AwsClient({
    accessKeyId: cfg.idDaChave,
    region: cfg.regiao,
    secretAccessKey: cfg.segredo,
    service: "s3",
  });
  const endpoint = new URL(cfg.endpoint);
  const doObjeto = (chave: string) =>
    `${endpoint.protocol}//${cfg.bucket}.${endpoint.host}/${chave}`;

  const recusado = async (etapa: string, resposta: Response) =>
    new Error(
      `Bucket ${cfg.bucket} recusou ${etapa}: ${resposta.status} ${await resposta.text()}`
    );

  return {
    /** DeleteObject. O S3 responde 204 também para a chave que não existe. */
    async apagar(chave: string) {
      const resposta = await enviar(
        await aws.sign(doObjeto(chave), { method: "DELETE" })
      );
      if (!(resposta.ok || resposta.status === 404)) {
        throw await recusado(`apagar ${chave}`, resposta);
      }
    },
    async guardar(
      chave: string,
      bytes: Uint8Array<ArrayBuffer>,
      contentType: string
    ) {
      const assinado = await aws.sign(doObjeto(chave), {
        body: bytes,
        headers: { "content-type": contentType },
        method: "PUT",
      });
      // Os bytes vão de novo, e não o corpo do Request assinado: o fetch do Next
      // manda o corpo de um Request em chunked, sem content-length, e o S3 que
      // exige o tamanho responde 411.
      return enviar(assinado.url, {
        body: bytes,
        headers: assinado.headers,
        method: "PUT",
      });
    },
    /** ListObjectsV2, página a página, até o fim do bucket. */
    async listar(): Promise<ObjetoDoBucket[]> {
      const objetos: ObjetoDoBucket[] = [];
      let continuacao: string | undefined;
      do {
        const url = new URL(doObjeto(""));
        url.searchParams.set("list-type", "2");
        if (continuacao) {
          url.searchParams.set("continuation-token", continuacao);
        }
        // biome-ignore lint/performance/noAwaitInLoops: cada página pede o token da anterior.
        const resposta = await enviar(await aws.sign(url.toString()));
        if (!resposta.ok) {
          throw await recusado("a listagem", resposta);
        }
        const pagina = lerPaginaDaListagem(await resposta.text());
        objetos.push(...pagina.objetos);
        ({ continuacao } = pagina);
      } while (continuacao);
      return objetos;
    },
    pedir: async (chave: string, method: "GET" | "HEAD" = "GET") =>
      enviar(await aws.sign(doObjeto(chave), { method })),
  };
}

const ENTIDADES: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&gt;": ">",
  "&lt;": "<",
  "&quot;": '"',
};
const ENTIDADE = /&(amp|apos|gt|lt|quot);/g;
const CONTEUDO = /<Contents>([\s\S]*?)<\/Contents>/g;

function campo(xml: string, nome: string): string | undefined {
  const achado = new RegExp(`<${nome}>([^<]*)</${nome}>`).exec(xml)?.[1];
  return achado?.replace(ENTIDADE, (e) => ENTIDADES[e] ?? e);
}

/** O XML de uma página do ListObjectsV2: os objetos e o token da próxima, se houver. */
export function lerPaginaDaListagem(xml: string): {
  continuacao: string | undefined;
  objetos: ObjetoDoBucket[];
} {
  const objetos = [...xml.matchAll(CONTEUDO)].map(([, item = ""]) => {
    const chave = campo(item, "Key");
    const modificadoEm = new Date(campo(item, "LastModified") ?? "");
    const bytes = Number(campo(item, "Size"));
    if (!chave || Number.isNaN(modificadoEm.getTime()) || Number.isNaN(bytes)) {
      throw new Error(`Objeto ilegível na listagem do bucket: ${item}`);
    }
    return { bytes, chave, modificadoEm };
  });
  const truncada = campo(xml, "IsTruncated") === "true";
  return {
    continuacao: truncada ? campo(xml, "NextContinuationToken") : undefined,
    objetos,
  };
}

/**
 * O objeto é imutável (nome = hash), então o envio é idempotente: o PUT
 * reescreve os mesmos bytes e o cache pode durar um ano. Capa trocada deixa o
 * objeto antigo no bucket até a coleta de órfãos (scripts/coletar-orfaos.ts).
 */
export function capasNoBucket(
  cfg: BucketDeCapas,
  enviar: typeof fetch = fetch
): Capas {
  const bucket = bucketAssinado(cfg, enviar);

  return {
    async abrir(chave) {
      if (!CHAVE.test(chave)) {
        return null;
      }
      const resposta = await bucket.pedir(chave);
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
      const resposta = await bucket.guardar(
        lida.chave,
        lida.bytes,
        lida.contentType
      );
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
