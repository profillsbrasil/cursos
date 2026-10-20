// O material de apoio do curso: o que é um arquivo aceitável, sem ler bytes. O
// editor confere o nome e o tamanho antes de enviar; externos/materiais.ts confere
// de novo no servidor e confirma o tipo pela assinatura dos bytes.

import { TIPO_DO_MATERIAL } from "@cursos/db/schema/formatos";

import type { MaterialId } from "./tipos";

export type TipoDoMaterial = (typeof TIPO_DO_MATERIAL)[number];

/**
 * Como os bytes de cada tipo começam. OOXML (docx, xlsx, pptx) é um ZIP, e os
 * antigos do Office são OLE; a imagem é lida pelo image-size.
 */
export type Assinatura = "imagem" | "ole" | "pdf" | "zip";

export interface TipoRegistrado {
  assinatura: Assinatura;
  contentType: string;
  /** O que o selo da linha mostra, como "PDF" ou "XLSX". */
  rotulo: string;
}

/** O registro dos tipos aceitos. A extensão do nome do arquivo escolhe a linha. */
export const TIPOS_DE_MATERIAL: Readonly<
  Record<TipoDoMaterial, TipoRegistrado>
> = {
  doc: {
    assinatura: "ole",
    contentType: "application/msword",
    rotulo: "DOC",
  },
  docx: {
    assinatura: "zip",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    rotulo: "DOCX",
  },
  jpg: { assinatura: "imagem", contentType: "image/jpeg", rotulo: "JPG" },
  pdf: { assinatura: "pdf", contentType: "application/pdf", rotulo: "PDF" },
  png: { assinatura: "imagem", contentType: "image/png", rotulo: "PNG" },
  ppt: {
    assinatura: "ole",
    contentType: "application/vnd.ms-powerpoint",
    rotulo: "PPT",
  },
  pptx: {
    assinatura: "zip",
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    rotulo: "PPTX",
  },
  webp: { assinatura: "imagem", contentType: "image/webp", rotulo: "WEBP" },
  xls: {
    assinatura: "ole",
    contentType: "application/vnd.ms-excel",
    rotulo: "XLS",
  },
  xlsx: {
    assinatura: "zip",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    rotulo: "XLSX",
  },
  zip: { assinatura: "zip", contentType: "application/zip", rotulo: "ZIP" },
};

/** "jpeg" é o mesmo tipo que "jpg": a chave e o selo usam "jpg". */
const SINONIMOS: Readonly<Record<string, TipoDoMaterial>> = { jpeg: "jpg" };

const EXTENSAO = /\.([A-Za-z0-9]+)$/;

/** O tipo pela extensão do nome, sem diferença de caixa; null fora da lista. */
export function tipoDoNome(nome: string): TipoDoMaterial | null {
  const ext = EXTENSAO.exec(nome.trim())?.[1]?.toLowerCase();
  if (ext === undefined) {
    return null;
  }
  const tipo = SINONIMOS[ext] ?? ext;
  return (TIPO_DO_MATERIAL as readonly string[]).includes(tipo)
    ? (tipo as TipoDoMaterial)
    : null;
}

/** O schema zod e os checks material_* do banco repetem estes tetos. */
export const LIMITE_DO_MATERIAL = {
  bytes: 50 * 1024 * 1024,
  nomeDoArquivo: 200,
  porCurso: 20,
  titulo: 120,
} as const;

/** O formato do check material_chave_formato: sha256 dos bytes e a extensão. */
export const CHAVE_DO_MATERIAL = new RegExp(
  `^[0-9a-f]{64}\\.(${TIPO_DO_MATERIAL.join("|")})$`
);

export const chaveDoMaterial = (sha256: string, tipo: TipoDoMaterial) =>
  `${sha256}.${tipo}`;

export type RecusaDoMaterial =
  | { tipo: "formato" }
  | { tipo: "assinatura"; esperado: TipoDoMaterial }
  | { tipo: "pesado"; bytes: number }
  | { tipo: "vazio" }
  | { tipo: "desligado" };

const MEGA = 1024 * 1024;
const UM_DECIMAL = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});
const INTEIRO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** "86 KB", "1,2 MB", "61,6 MB". */
export function tamanhoDoArquivo(bytes: number): string {
  if (bytes < MEGA) {
    return `${INTEIRO.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  }
  return `${UM_DECIMAL.format(bytes / MEGA)} MB`;
}

const TIPOS_PARA_LER =
  "PDF, Word, Excel, PowerPoint, imagem (PNG, JPG ou WebP) ou ZIP";

/** A frase dos tipos e do limite, que o pé do editor e a recusa de formato repetem. */
export const TIPOS_E_LIMITE = `${TIPOS_PARA_LER}, até ${LIMITE_DO_MATERIAL.bytes / MEGA} MB cada`;

/** A frase da recusa, escrita para quem não sabe o que é assinatura de arquivo. */
export function mensagemDoMaterial(r: RecusaDoMaterial): string {
  switch (r.tipo) {
    case "formato":
      return `Este tipo de arquivo não entra. Use ${TIPOS_PARA_LER}.`;
    case "assinatura":
      return `O arquivo diz ser ${TIPOS_DE_MATERIAL[r.esperado].rotulo}, mas o conteúdo não é. Exporte de novo e envie.`;
    case "pesado":
      return `Tem ${tamanhoDoArquivo(r.bytes)}. O limite é ${LIMITE_DO_MATERIAL.bytes / MEGA} MB por arquivo.`;
    case "vazio":
      return "O arquivo está vazio.";
    case "desligado":
      return "O envio de material não está configurado neste ambiente.";
    default: {
      const nenhuma: never = r;
      throw new Error(`Recusa sem frase: ${JSON.stringify(nenhuma)}`);
    }
  }
}

/** O que se confere antes de ler os bytes: o tipo pelo nome e o tamanho. */
export function recusaAntesDeLer(
  nome: string,
  bytes: number
): RecusaDoMaterial | null {
  if (tipoDoNome(nome) === null) {
    return { tipo: "formato" };
  }
  if (bytes === 0) {
    return { tipo: "vazio" };
  }
  return bytes > LIMITE_DO_MATERIAL.bytes ? { bytes, tipo: "pesado" } : null;
}

/** O nome guardado: aparado e, acima do teto, cortado antes da extensão. */
export function nomeGuardado(nome: string): string {
  const aparado = nome.trim();
  if (aparado.length <= LIMITE_DO_MATERIAL.nomeDoArquivo) {
    return aparado;
  }
  const ext = EXTENSAO.exec(aparado)?.[0] ?? "";
  return (
    aparado.slice(0, LIMITE_DO_MATERIAL.nomeDoArquivo - ext.length).trimEnd() +
    ext
  );
}

const SEPARADORES = /[-_]+/g;
const ESPACOS = /\s+/g;

/** "checklist-setup_ev400.pdf" vira "checklist setup ev400". */
export function tituloSugerido(nome: string): string {
  const semExtensao = nome.trim().replace(EXTENSAO, "");
  const titulo = semExtensao
    .replace(SEPARADORES, " ")
    .replace(ESPACOS, " ")
    .trim()
    .slice(0, LIMITE_DO_MATERIAL.titulo)
    .trim();
  return titulo || "Material de apoio";
}

/** O que admin.catalogo.enviarMaterial devolve: o arquivo guardado no bucket. */
export interface ArquivoDoMaterial {
  bytes: number;
  chave: string;
  nomeDoArquivo: string;
  tipo: TipoDoMaterial;
}

export interface MaterialEnviado extends ArquivoDoMaterial {
  tituloSugerido: string;
}

/** O material na página do curso, com o link de download. */
export interface MaterialDaPagina {
  bytes: number;
  href: string;
  id: MaterialId;
  nomeDoArquivo: string;
  tipo: TipoDoMaterial;
  titulo: string;
}

/** Nome do campo do FormData de admin.catalogo.enviarMaterial. */
const CAMPO_DO_ARQUIVO = "arquivo";

export function formularioDoMaterial(arquivo: File): FormData {
  const fd = new FormData();
  fd.set(CAMPO_DO_ARQUIVO, arquivo);
  return fd;
}

export function arquivoDoFormulario(fd: FormData): File | null {
  const arquivo = fd.get(CAMPO_DO_ARQUIVO);
  return arquivo instanceof File ? arquivo : null;
}
