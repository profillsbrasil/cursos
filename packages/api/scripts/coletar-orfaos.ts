// Acha e, com --apagar, apaga os objetos órfãos dos buckets de capa e de material.
// Uso: bun run coletar-orfaos [-- --apagar], da raiz. O varlock carrega o
// DATABASE_URL e as S3_* pelo contrato de apps/web/.env.schema.
// A regra mora em src/dominio/orfaos.ts.

import { parseArgs } from "node:util";
import { createDb } from "@cursos/db";

import { chavesEmUso } from "../src/consultas/orfaos";
import { tamanhoDoArquivo } from "../src/dominio/material";
import { DIAS_ATE_COLETAR, orfaosDoBucket } from "../src/dominio/orfaos";
import { type BucketDeCapas, bucketAssinado } from "../src/externos/capas";

const { values } = parseArgs({ options: { apagar: { type: "boolean" } } });
const apagar = values.apagar === true;

const {
  DATABASE_URL,
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_MATERIAIS_ACCESS_KEY_ID,
  S3_MATERIAIS_BUCKET,
  S3_MATERIAIS_SECRET_ACCESS_KEY,
  S3_REGION,
  S3_SECRET_ACCESS_KEY,
} = process.env;

function bucketDe(
  nome: string | undefined,
  idDaChave: string | undefined,
  segredo: string | undefined
): BucketDeCapas | null {
  if (!(S3_ENDPOINT && S3_REGION && nome && idDaChave && segredo)) {
    return null;
  }
  return {
    bucket: nome,
    endpoint: S3_ENDPOINT,
    idDaChave,
    regiao: S3_REGION,
    segredo,
  };
}

const configurados = [
  bucketDe(S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY),
  bucketDe(
    S3_MATERIAIS_BUCKET,
    S3_MATERIAIS_ACCESS_KEY_ID,
    S3_MATERIAIS_SECRET_ACCESS_KEY
  ),
].filter((b) => b !== null);
// No dev, capa e material moram no mesmo bucket: ele é listado uma vez.
const buckets = [...new Map(configurados.map((b) => [b.bucket, b])).values()];

if (!DATABASE_URL) {
  throw new Error("Falta o DATABASE_URL.");
}
if (buckets.length === 0) {
  throw new Error("Nenhum bucket configurado: faltam as variáveis S3_*.");
}

const db = createDb({ DATABASE_URL });
const emUso = await chavesEmUso(db);
await db.$client.end();

const agora = new Date();
const coletas = await Promise.all(
  buckets.map(async (cfg) => {
    const bucket = bucketAssinado(cfg, fetch);
    const objetos = await bucket.listar();
    return {
      bucket,
      nome: cfg.bucket,
      objetos: objetos.length,
      orfaos: orfaosDoBucket(emUso, objetos, agora),
    };
  })
);

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
console.log(
  `No banco: ${emUso.capaUrls.length} curso(s) e ${emUso.chavesDeMaterial.length} material(is).`
);
console.log(
  `Órfão: fora do banco e enviado há mais de ${DIAS_ATE_COLETAR} dias.`
);
for (const { nome, objetos, orfaos } of coletas) {
  console.log(`\nBucket ${nome}: ${objetos} objetos, ${orfaos.length} órfãos.`);
  for (const o of orfaos) {
    const tamanho = tamanhoDoArquivo(o.bytes).padStart(9);
    const idade = inteiro.format(Math.floor(o.idadeEmDias)).padStart(4);
    console.log(`  ${o.chave}  ${tamanho}  ${idade} dias`);
  }
}

const todos = coletas.flatMap((c) => c.orfaos);
const bytes = todos.reduce((soma, o) => soma + o.bytes, 0);
console.log(
  todos.length === 0
    ? "\nTotal: nenhum órfão."
    : `\nTotal: ${todos.length} órfãos, ${tamanhoDoArquivo(bytes)}.`
);

if (apagar) {
  await Promise.all(
    coletas.flatMap((c) => c.orfaos.map((o) => c.bucket.apagar(o.chave)))
  );
  console.log(`Apagados: ${todos.length}.`);
} else {
  console.log("Só a lista: nada foi apagado. Para apagar, rode com --apagar.");
}
