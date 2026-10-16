import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

import { CURSOS } from "./dados";
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

/** Aula que some do catálogo. Os fatos saem antes porque o banco recusa apagar aula assistida. */
async function apagarAula(c: Client, id: string) {
  await c.query("delete from ponto_lancamento where aula_id = $1", [id]);
  await c.query("delete from aula_assistida where aula_id = $1", [id]);
  await c.query("delete from posicao_aula where aula_id = $1", [id]);
  await c.query("delete from aula where id = $1", [id]);
}

const modulosDoCurso = async (c: Client, slug: string) =>
  (
    await c.query<{ numero: number; titulo: string }>(
      `select m.numero, m.titulo from modulo m join curso c on c.id = m.curso_id
       where c.slug = $1 order by m.numero`,
      [slug]
    )
  ).rows;

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
      expect(await modulosDoCurso(c, "fabrica-montagem")).toEqual([
        { numero: 1, titulo: "Segurança do posto" },
        { numero: 2, titulo: "Envasadora: conhecendo a máquina" },
        { numero: 3, titulo: "Montagem pneumática" },
      ]);
    });

    test("a segunda execução mantém título, módulos e aulas que o admin mudou", async () => {
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
      await c.query(
        `update modulo set titulo = 'Módulo do admin'
         where numero = 2 and curso_id = (select id from curso where slug = 'fabrica-montagem')`
      );
      await apagarAula(c, doProgresso ?? "");
      await apagarAula(c, daPosicao ?? "");

      await semear(url, ALUNO);

      expect(
        (await c.query("select titulo from curso where slug = 'comercial'"))
          .rows
      ).toEqual([{ titulo: "Título do admin" }]);
      expect(await modulosDoCurso(c, "fabrica-montagem")).toEqual([
        { numero: 1, titulo: "Segurança do posto" },
        { numero: 2, titulo: "Módulo do admin" },
        { numero: 3, titulo: "Montagem pneumática" },
      ]);
      expect(await contar(c, "select count(*)::int as n from aula")).toBe(
        aulasAntes - 2
      );
      expect(await contar(c, "select count(*)::int as n from curso")).toBe(
        CURSOS.length
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
