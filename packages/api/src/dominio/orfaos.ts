// A coleta dos objetos órfãos dos buckets: capa trocada e material tirado do
// curso ficam no bucket, porque a chave é o sha256 dos bytes e nada a apaga.
// Quem lista e apaga é packages/api/scripts/coletar-orfaos.ts.

/** Um objeto como o ListObjectsV2 do bucket o descreve. */
export interface ObjetoDoBucket {
  bytes: number;
  chave: string;
  modificadoEm: Date;
}

/**
 * O que o banco usa, de capa e de material juntos. A coleta de um bucket lê as
 * duas listas: no dev, capa e material moram no mesmo bucket `capas-dev`.
 */
export interface ChavesEmUso {
  /** `curso.capa_url`, como `/capa/<chave>` ou `/capas/x.jpg` do public/. */
  capaUrls: readonly string[];
  /** `material.chave`. */
  chavesDeMaterial: readonly string[];
}

/**
 * O arquivo enviado pelo editor só entra no banco quando o admin salva o curso.
 * Até lá ele é órfão, e esses dias o protegem.
 */
export const DIAS_ATE_COLETAR = 7;

const DIA_MS = 24 * 60 * 60 * 1000;
const PREFIXO_DA_CAPA = "/capa/";
/** A chave que o app grava, de capa e de material. Objeto com outro nome não é do app e fica. */
const CHAVE_DO_APP = /^[0-9a-f]{64}\.[a-z0-9]+$/;

export interface Orfao extends ObjetoDoBucket {
  idadeEmDias: number;
}

function chavesReferenciadas(emUso: ChavesEmUso): Set<string> {
  const chaves = new Set(emUso.chavesDeMaterial);
  for (const url of emUso.capaUrls) {
    if (url.startsWith(PREFIXO_DA_CAPA)) {
      chaves.add(url.slice(PREFIXO_DA_CAPA.length));
    }
  }
  return chaves;
}

/** Os objetos que nenhum curso usa e que têm mais de `DIAS_ATE_COLETAR` dias, do mais velho ao mais novo. */
export function orfaosDoBucket(
  emUso: ChavesEmUso,
  objetos: readonly ObjetoDoBucket[],
  agora: Date
): Orfao[] {
  const referenciadas = chavesReferenciadas(emUso);
  return objetos
    .filter((o) => CHAVE_DO_APP.test(o.chave) && !referenciadas.has(o.chave))
    .map((o) => ({
      ...o,
      idadeEmDias: (agora.getTime() - o.modificadoEm.getTime()) / DIA_MS,
    }))
    .filter((o) => o.idadeEmDias > DIAS_ATE_COLETAR)
    .sort((a, b) => b.idadeEmDias - a.idadeEmDias);
}

/**
 * Banco sem nenhuma chave em uso faz todo objeto com mais de 7 dias virar órfão.
 * Isso é o que um DATABASE_URL vazio ou de outro ambiente produz, então o
 * apagar recusa em vez de esvaziar o bucket.
 */
export function recusaDoApagar(emUso: ChavesEmUso): string | null {
  return chavesReferenciadas(emUso).size === 0
    ? "O banco não usa nenhuma chave dos buckets. Confira o DATABASE_URL antes de apagar."
    : null;
}
