// O material de apoio num bucket S3 (o bucket "materiais" da Railway, privado: o
// app serve cada arquivo em /material/<id>, só para quem pode ver o curso). No
// molde de capas.ts: só o servidor importa este arquivo, e as chaves do bucket
// entram por apps/web/src/services.ts. O que é um arquivo aceitável mora em
// dominio/material.ts.

import { createHash } from "node:crypto";
import { imageSize } from "image-size";

import {
  type ArquivoDoMaterial,
  CHAVE_DO_MATERIAL,
  chaveDoMaterial,
  nomeGuardado,
  type RecusaDoMaterial,
  recusaAntesDeLer,
  TIPOS_DE_MATERIAL,
  type TipoDoMaterial,
  tipoDoNome,
} from "../dominio/material";
import { type BucketDeCapas, bucketAssinado } from "./capas";

export type BucketDeMateriais = BucketDeCapas;

export type MaterialRecebido =
  | { tipo: "guardado"; arquivo: ArquivoDoMaterial }
  | { tipo: "recusa"; recusa: RecusaDoMaterial };

/** Quem chama não sabe de bucket, URL nem assinatura de arquivo. */
export interface Materiais {
  /** O arquivo guardado sob a chave, ou null quando a chave não é de material ou não existe. */
  abrir: (chave: string) => Promise<Response | null>;
  /** O salvar do curso confere que a chave nova chegou ao bucket. */
  existe: (chave: string) => Promise<boolean>;
  receber: (arquivo: File) => Promise<MaterialRecebido>;
}

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];
/** O cabeçalho local do ZIP, e o fim de diretório do ZIP vazio. */
const ZIP = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const comeca = (bytes: Uint8Array, prefixo: readonly number[]) =>
  bytes.length >= prefixo.length && prefixo.every((b, i) => bytes[i] === b);

function imagemDoTipo(bytes: Uint8Array, tipo: TipoDoMaterial): boolean {
  try {
    return imageSize(bytes).type === tipo;
  } catch {
    return false;
  }
}

/** Os bytes confirmam a família que a extensão promete. */
function confirmaOTipo(bytes: Uint8Array, tipo: TipoDoMaterial): boolean {
  switch (TIPOS_DE_MATERIAL[tipo].assinatura) {
    case "pdf":
      return comeca(bytes, PDF);
    case "zip":
      return ZIP.some((p) => comeca(bytes, p));
    case "ole":
      return comeca(bytes, OLE);
    case "imagem":
      return imagemDoTipo(bytes, tipo);
    default:
      return false;
  }
}

export type MaterialLido =
  | {
      tipo: "lido";
      arquivo: ArquivoDoMaterial;
      bytes: Uint8Array<ArrayBuffer>;
      contentType: string;
    }
  | { tipo: "recusa"; recusa: RecusaDoMaterial };

const recusa = (r: RecusaDoMaterial) =>
  ({ recusa: r, tipo: "recusa" }) as const;

/** O tipo vem da extensão do nome e os bytes o confirmam; o content-type do navegador não conta. */
export function lerMaterial(
  nome: string,
  bytes: Uint8Array<ArrayBuffer>
): MaterialLido {
  const antes = recusaAntesDeLer(nome, bytes.length);
  if (antes) {
    return recusa(antes);
  }
  const tipo = tipoDoNome(nome) as TipoDoMaterial;
  if (!confirmaOTipo(bytes, tipo)) {
    return recusa({ esperado: tipo, tipo: "assinatura" });
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  return {
    arquivo: {
      bytes: bytes.length,
      chave: chaveDoMaterial(hash, tipo),
      nomeDoArquivo: nomeGuardado(nome),
      tipo,
    },
    bytes,
    contentType: TIPOS_DE_MATERIAL[tipo].contentType,
    tipo: "lido",
  };
}

/**
 * O objeto é imutável (nome = hash), então o envio é idempotente: o PUT reescreve
 * os mesmos bytes. Material tirado do curso deixa o objeto no bucket até a coleta
 * de órfãos (scripts/coletar-orfaos.ts).
 */
export function materiaisNoBucket(
  cfg: BucketDeMateriais,
  enviar: typeof fetch = fetch
): Materiais {
  const bucket = bucketAssinado(cfg, enviar);

  const falha = async (etapa: string, resposta: Response) => {
    console.error(
      `Bucket recusou ${etapa} do material:`,
      resposta.status,
      await resposta.text()
    );
  };

  return {
    async abrir(chave) {
      if (!CHAVE_DO_MATERIAL.test(chave)) {
        return null;
      }
      const resposta = await bucket.pedir(chave);
      if (resposta.status === 404) {
        return null;
      }
      if (!resposta.ok) {
        await falha("a leitura", resposta);
        throw new Error("Não foi possível ler o material.");
      }
      return resposta;
    },
    async existe(chave) {
      if (!CHAVE_DO_MATERIAL.test(chave)) {
        return false;
      }
      const resposta = await bucket.pedir(chave, "HEAD");
      if (resposta.status === 404) {
        return false;
      }
      if (!resposta.ok) {
        await falha("a consulta", resposta);
        throw new Error("Não foi possível conferir o material.");
      }
      return true;
    },
    async receber(arquivo) {
      const antes = recusaAntesDeLer(arquivo.name, arquivo.size);
      if (antes) {
        return recusa(antes);
      }
      const lido = lerMaterial(
        arquivo.name,
        new Uint8Array(await arquivo.arrayBuffer())
      );
      if (lido.tipo === "recusa") {
        return lido;
      }
      const resposta = await bucket.guardar(
        lido.arquivo.chave,
        lido.bytes,
        lido.contentType
      );
      if (!resposta.ok) {
        await falha("o envio", resposta);
        throw new Error("Não foi possível enviar o material. Tente de novo.");
      }
      return { arquivo: lido.arquivo, tipo: "guardado" };
    },
  };
}

/** Ambiente sem as variáveis do bucket de materiais: o resto do admin funciona. */
export const materiaisDesligados: Materiais = {
  abrir: () => Promise.resolve(null),
  existe: () => Promise.resolve(false),
  receber: () => Promise.resolve(recusa({ tipo: "desligado" })),
};
