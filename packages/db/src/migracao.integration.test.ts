import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

import { urlDeTeste } from "./seed/guarda-local";

const URL_TESTE = urlDeTeste();
const PASTA = join(import.meta.dir, "migrations");
const PLAYER = "_player";

async function migracoes() {
  const pastas = (await readdir(PASTA, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return Promise.all(
    pastas.map(async (nome) => ({
      nome,
      sql: await readFile(join(PASTA, nome, "migration.sql"), "utf8"),
    }))
  );
}

// Sem parâmetros, o pg manda o texto pelo protocolo simples, que aceita vários statements.
const aplicar = (c: Client, lista: readonly { sql: string }[]) =>
  c.query(
    lista
      .map((m) => m.sql.replaceAll("--> statement-breakpoint", ""))
      .join("\n")
  );

const codigoDoErro = (e: unknown) =>
  typeof e === "object" && e !== null && "constraint" in e
    ? String(e.constraint)
    : `sem constraint: ${String(e)}`;

describe.skipIf(URL_TESTE === null)("migração do player", () => {
  const nomeBanco = `migracao_${randomBytes(4).toString("hex")}`;
  const admin = new Client({ connectionString: URL_TESTE ?? "" });
  let c: Client;

  beforeAll(async () => {
    await admin.connect();
    await admin.query(`create database ${nomeBanco}`);
    const url = new URL(URL_TESTE ?? "");
    url.pathname = `/${nomeBanco}`;
    c = new Client({ connectionString: url.toString() });
    await c.connect();
    const todas = await migracoes();
    const ate = todas.findIndex((m) => m.nome.endsWith(PLAYER));
    expect(ate).toBeGreaterThan(0);
    await aplicar(c, todas.slice(0, ate));
    const curso = await c.query<{ id: string }>(
      `insert into curso (slug, titulo, tema, capa_url, capa_alt, status)
       values ('comercial', 'Comercial', 'vendas', '/capas/c.jpg', 'Capa', 'publicado') returning id`
    );
    const modulo = await c.query<{ id: string }>(
      "insert into modulo (curso_id, numero, titulo) values ($1, 0, 'Boas-vindas') returning id",
      [curso.rows[0]?.id]
    );
    const aula = await c.query<{ id: string }>(
      "insert into aula (modulo_id, posicao, titulo, duracao_seg) values ($1, 1, 'Abertura', 300) returning id",
      [modulo.rows[0]?.id]
    );
    await c.query(
      "insert into posicao_aula (user_id, aula_id, posicao_seg) values ('user_a', $1, 120)",
      [aula.rows[0]?.id]
    );
    await aplicar(c, todas.slice(ate));
  });

  afterAll(async () => {
    await c?.end();
    await admin.query(`drop database if exists ${nomeBanco}`);
    await admin.end();
  });

  test("aula existente fica sem vídeo e posição existente ganha trechos vazios", async () => {
    const aula = await c.query("select video_provedor, video_id from aula");
    expect(aula.rows).toEqual([{ video_id: null, video_provedor: null }]);
    const posicao = await c.query<{ trechos: string }>(
      "select trechos_vistos::text as trechos from posicao_aula"
    );
    expect(posicao.rows).toEqual([{ trechos: "{}" }]);
  });

  test("os checks novos valem para as linhas depois da migração", async () => {
    const erro = await c
      .query("update aula set video_provedor = 'youtube'")
      .then(() => null, codigoDoErro);
    expect(erro).toBe("aula_video_completo");
    await c.query(
      "update aula set video_provedor = 'youtube', video_id = 'aqz-KE-bpKQ'"
    );
    const trechos = await c.query<{ t: string }>(
      "update posicao_aula set trechos_vistos = trechos_vistos + '{[0,30)}' + '{[30,60)}' returning trechos_vistos::text as t"
    );
    expect(trechos.rows[0]?.t).toBe("{[0,60)}");
  });
});
