import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

import { CURSOS, TRILHAS } from "./dados";
import { urlDeTeste } from "./guarda-local";
import { semear } from "./index";

const URL_TESTE = urlDeTeste();
const ALUNO = "user_seedA";

async function contar(c: Client, consulta: string, params: unknown[] = []) {
  const r = await c.query<{ n: number }>(consulta, params);
  return r.rows[0]?.n ?? -1;
}

const idDaAula = async (
  c: Client,
  curso: string,
  modulo: number,
  posicao: number
) => {
  const r = await c.query<{ id: string }>(
    `select a.id from aula a join modulo m on m.id = a.modulo_id join curso c on c.id = m.curso_id
     where c.slug = $1 and m.numero = $2 and a.posicao = $3`,
    [curso, modulo, posicao]
  );
  return r.rows[0]?.id ?? null;
};

/** O que o admin faz pela tela: apaga os fatos que apontam para a aula e depois a aula. */
async function apagarAula(c: Client, id: string) {
  await c.query("delete from ponto_lancamento where aula_id = $1", [id]);
  await c.query("delete from aula_assistida where aula_id = $1", [id]);
  await c.query("delete from posicao_aula where aula_id = $1", [id]);
  await c.query("delete from aula where id = $1", [id]);
}

const ordemDaTrilha = async (c: Client, slug: string) =>
  (
    await c.query<{ slug: string }>(
      `select c.slug from trilha_curso tc join trilha t on t.id = tc.trilha_id
       join curso c on c.id = tc.curso_id where t.slug = $1 order by tc.posicao`,
      [slug]
    )
  ).rows.map((r) => r.slug);

describe.skipIf(URL_TESTE === null)(
  "seed planta o catálogo e não sobrescreve o admin",
  () => {
    const nomeBanco = `seed_${randomBytes(4).toString("hex")}`;
    const admin = new Client({ connectionString: URL_TESTE ?? "" });
    let url = "";
    let c: Client;

    beforeAll(async () => {
      await admin.connect();
      await admin.query(`create database ${nomeBanco}`);
      const destino = new URL(URL_TESTE ?? "");
      destino.pathname = `/${nomeBanco}`;
      url = destino.toString();
      const db = drizzle(url);
      await migrate(db, {
        migrationsFolder: join(import.meta.dir, "..", "migrations"),
      });
      await db.$client.end();
      c = new Client({ connectionString: url });
      await c.connect();
    });

    afterAll(async () => {
      await c?.end();
      await admin.query(`drop database if exists ${nomeBanco}`);
      await admin.end();
    });

    test("a primeira execução planta todo o catálogo de dados.ts", async () => {
      await semear(url, ALUNO);
      expect(await contar(c, "select count(*)::int as n from curso")).toBe(
        CURSOS.length
      );
      expect(await contar(c, "select count(*)::int as n from trilha")).toBe(
        TRILHAS.length
      );
    });

    test("a segunda execução mantém título, ordem e aulas que o admin mudou", async () => {
      const assistidasAntes = await contar(
        c,
        "select count(*)::int as n from aula_assistida where user_id = $1",
        [ALUNO]
      );
      const aulasAntes = await contar(c, "select count(*)::int as n from aula");
      const doProgresso = await idDaAula(c, "autoavaliacao", 0, 2);
      const daPosicao = await idDaAula(c, "comercial", 8, 4);
      expect(doProgresso).not.toBeNull();
      expect(daPosicao).not.toBeNull();

      await c.query(
        "update curso set titulo = 'Título do admin' where slug = 'comercial'"
      );
      expect(await ordemDaTrilha(c, "fabrica-montagem")).toEqual([
        "seguranca-posto",
        "envasadora",
        "montagem",
      ]);
      await c.query(
        `update trilha_curso set posicao = posicao + 100
         where trilha_id = (select id from trilha where slug = 'fabrica-montagem')`
      );
      await c.query(
        `update trilha_curso tc
         set posicao = case c.slug when 'envasadora' then 1 when 'seguranca-posto' then 2 else 3 end
         from curso c where c.id = tc.curso_id
         and tc.trilha_id = (select id from trilha where slug = 'fabrica-montagem')`
      );
      await apagarAula(c, doProgresso ?? "");
      await apagarAula(c, daPosicao ?? "");

      await semear(url, ALUNO);

      expect(
        (await c.query("select titulo from curso where slug = 'comercial'"))
          .rows
      ).toEqual([{ titulo: "Título do admin" }]);
      expect(await ordemDaTrilha(c, "fabrica-montagem")).toEqual([
        "envasadora",
        "seguranca-posto",
        "montagem",
      ]);
      expect(await contar(c, "select count(*)::int as n from aula")).toBe(
        aulasAntes - 2
      );
      expect(await contar(c, "select count(*)::int as n from curso")).toBe(
        CURSOS.length
      );
      expect(await contar(c, "select count(*)::int as n from trilha")).toBe(
        TRILHAS.length
      );
      expect(
        await contar(
          c,
          "select count(*)::int as n from aula_assistida where user_id = $1",
          [ALUNO]
        )
      ).toBe(assistidasAntes - 1);
      expect(
        await contar(
          c,
          "select count(*)::int as n from posicao_aula where user_id = $1",
          [ALUNO]
        )
      ).toBe(0);
    });
  }
);
