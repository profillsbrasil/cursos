import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

import { urlDeTeste } from "./seed/guarda-local";

const URL_TESTE = urlDeTeste();
const PASTA = join(import.meta.dir, "migrations");

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

/**
 * Banco novo com as migrações anteriores a `<timestamp>_<migracao>`, as linhas de
 * `plantar` e depois o resto: as linhas já existem quando a migração roda.
 */
function migracaoComLinhas(
  titulo: string,
  migracao: string,
  plantar: (c: Client) => Promise<void>,
  testes: (banco: () => Client) => void
) {
  describe.skipIf(URL_TESTE === null)(titulo, () => {
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
      const ate = todas.findIndex((m) => m.nome.endsWith(`_${migracao}`));
      expect(ate).toBeGreaterThan(0);
      await aplicar(c, todas.slice(0, ate));
      await plantar(c);
      await aplicar(c, todas.slice(ate));
    });

    afterAll(async () => {
      await c?.end();
      await admin.query(`drop database if exists ${nomeBanco}`);
      await admin.end();
    });

    testes(() => c);
  });
}

async function inserirCurso(c: Client, slug: string, capaUrl: string) {
  const r = await c.query<{ id: string }>(
    `insert into curso (slug, titulo, tema, capa_url, capa_alt, status)
     values ($1, 'Curso', 'tema', $2, 'Capa', 'publicado') returning id`,
    [slug, capaUrl]
  );
  return r.rows[0]?.id ?? "";
}

migracaoComLinhas(
  "migração do player",
  "player",
  async (c) => {
    const cursoId = await inserirCurso(c, "comercial", "/capas/c.jpg");
    const modulo = await c.query<{ id: string }>(
      "insert into modulo (curso_id, numero, titulo) values ($1, 0, 'Boas-vindas') returning id",
      [cursoId]
    );
    const aula = await c.query<{ id: string }>(
      "insert into aula (modulo_id, posicao, titulo, duracao_seg) values ($1, 1, 'Abertura', 300) returning id",
      [modulo.rows[0]?.id]
    );
    await c.query(
      "insert into posicao_aula (user_id, aula_id, posicao_seg) values ('user_a', $1, 120)",
      [aula.rows[0]?.id]
    );
  },
  (banco) => {
    test("aula existente fica sem vídeo e posição existente ganha trechos vazios", async () => {
      const c = banco();
      const aula = await c.query("select video_provedor, video_id from aula");
      expect(aula.rows).toEqual([{ video_id: null, video_provedor: null }]);
      const posicao = await c.query<{ trechos: string }>(
        "select trechos_vistos::text as trechos from posicao_aula"
      );
      expect(posicao.rows).toEqual([{ trechos: "{}" }]);
    });

    test("os checks novos valem para as linhas depois da migração", async () => {
      const c = banco();
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
  }
);

const ALUNO = "user_aluno";
const ADMIN = "user_admin";

migracaoComLinhas(
  "migração da origem da liberação",
  "origem_da_liberacao",
  async (c) => {
    const trocado = await inserirCurso(c, "trocado", "/capas/t.jpg");
    const proprio = await inserirCurso(c, "proprio", "/capas/p.jpg");
    const troca = await c.query<{ id: string }>(
      "insert into liberacao (user_id, curso_id, liberada_por) values ($1, $2, $1) returning id",
      [ALUNO, trocado]
    );
    await c.query(
      "insert into ponto_lancamento (user_id, motivo, pontos, liberacao_id) values ($1, 'troca', -200, $2)",
      [ALUNO, troca.rows[0]?.id]
    );
    // Admin que liberou para si mesmo: antes da origem, o banco a lia como troca.
    await c.query(
      "insert into liberacao (user_id, curso_id, liberada_por) values ($1, $2, $1)",
      [ADMIN, proprio]
    );
  },
  (banco) => {
    test("troca com lançamento vira troca e o resto vira admin", async () => {
      const r = await banco().query(
        `select c.slug as alvo, l.origem::text as origem
         from liberacao l
         join curso c on c.id = l.curso_id
         order by alvo`
      );
      expect(r.rows).toEqual([
        { alvo: "proprio", origem: "admin" },
        { alvo: "trocado", origem: "troca" },
      ]);
    });

    test("revogar a troca continua recusado", async () => {
      const erro = await banco()
        .query(
          `update liberacao set revogada_em = now(), revogada_por = $1
           where curso_id = (select id from curso where slug = 'trocado')`,
          [ADMIN]
        )
        .then(() => null, codigoDoErro);
      expect(erro).toBe("liberacao_troca_nao_revoga");
    });

    test("revogar a liberação que o admin deu a si mesmo passa", async () => {
      const r = await banco().query(
        `update liberacao set revogada_em = now(), revogada_por = $1
         where user_id = $1 returning id`,
        [ADMIN]
      );
      expect(r.rowCount).toBe(1);
    });
  }
);

migracaoComLinhas(
  "migração da medida da capa",
  "dimensoes_da_capa",
  async (c) => {
    await inserirCurso(c, "comercial", "/capas/comercial.jpg");
    await inserirCurso(c, "desconhecida", "/capas/desconhecida.jpg");
  },
  (banco) => {
    test("capa do mapa recebe a medida real e capa fora dele 1280x720", async () => {
      const r = await banco().query(
        "select slug, capa_largura, capa_altura from curso order by slug"
      );
      expect(r.rows).toEqual([
        { capa_altura: 604, capa_largura: 900, slug: "comercial" },
        { capa_altura: 720, capa_largura: 1280, slug: "desconhecida" },
      ]);
    });
  }
);

migracaoComLinhas(
  "migração do catálogo sem trilha",
  "catalogo_sem_trilha",
  async (c) => {
    const trilha = await c.query<{ id: string }>(
      "insert into trilha (slug, titulo, descricao) values ('fabrica', 'Fábrica', 'teste') returning id"
    );
    const trilhaId = trilha.rows[0]?.id;
    const curso = async (slug: string) => {
      const r = await c.query<{ id: string }>(
        `insert into curso (slug, titulo, tema, capa_url, capa_alt, capa_largura, capa_altura, status)
         values ($1, 'Curso', 'tema', '/capas/c.jpg', 'Capa', 1280, 720, 'publicado') returning id`,
        [slug]
      );
      return r.rows[0]?.id ?? "";
    };
    const naTrilha = await curso("na-trilha");
    const solto = await curso("solto");
    const trocado = await curso("trocado");
    await c.query(
      "insert into trilha_curso (curso_id, trilha_id, posicao) values ($1, $2, 1)",
      [naTrilha, trilhaId]
    );
    await c.query(
      "insert into liberacao (user_id, trilha_id, liberada_por, origem) values ($1, $2, $3, 'admin')",
      [ALUNO, trilhaId, ADMIN]
    );
    await c.query(
      "insert into liberacao (user_id, curso_id, liberada_por, origem) values ($1, $2, $3, 'admin')",
      [ALUNO, solto, ADMIN]
    );
    await c.query(
      "insert into ponto_lancamento (user_id, motivo, pontos, trilha_id) values ($1, 'trilha_concluida', 500, $2)",
      [ALUNO, trilhaId]
    );

    const modulo = await c.query<{ id: string }>(
      "insert into modulo (curso_id, numero, titulo) values ($1, 1, 'Início') returning id",
      [solto]
    );
    const aula = await c.query<{ id: string }>(
      "insert into aula (modulo_id, posicao, titulo, duracao_seg) values ($1, 1, 'Abertura', 300) returning id",
      [modulo.rows[0]?.id]
    );
    const aulaId = aula.rows[0]?.id;
    await c.query(
      "insert into aula_assistida (user_id, aula_id) values ($1, $2)",
      [ALUNO, aulaId]
    );
    await c.query(
      "insert into ponto_lancamento (user_id, motivo, pontos, aula_id) values ($1, 'aula_assistida', 10, $2)",
      [ALUNO, aulaId]
    );
    await c.query(
      "insert into certificado (user_id, curso_id, codigo) values ($1, $2, 'CERT-1')",
      [ALUNO, solto]
    );
    await c.query(
      "insert into ponto_lancamento (user_id, motivo, pontos, curso_id) values ($1, 'curso_concluido', 100, $2)",
      [ALUNO, solto]
    );
    await c.query(
      "insert into ponto_lancamento (user_id, motivo, pontos, dia_marco) values ($1, 'sequencia_7_dias', 50, '2026-10-09')",
      [ALUNO]
    );
    const troca = await c.query<{ id: string }>(
      "insert into liberacao (user_id, curso_id, liberada_por, origem) values ($1, $2, $1, 'troca') returning id",
      [ALUNO, trocado]
    );
    await c.query(
      "insert into ponto_lancamento (user_id, motivo, pontos, liberacao_id) values ($1, 'troca', -200, $2)",
      [ALUNO, troca.rows[0]?.id]
    );
  },
  (banco) => {
    test("a trilha e o que aponta para ela somem, e o curso fica", async () => {
      const c = banco();
      const tabelas = await c.query(
        "select table_name from information_schema.tables where table_schema = 'public' and table_name like 'trilha%'"
      );
      expect(tabelas.rows).toEqual([]);
      const cursos = await c.query("select slug from curso order by slug");
      expect(cursos.rows).toEqual([
        { slug: "na-trilha" },
        { slug: "solto" },
        { slug: "trocado" },
      ]);
      const liberacoes = await c.query(
        `select c.slug, l.origem::text as origem
         from liberacao l join curso c on c.id = l.curso_id
         order by c.slug`
      );
      expect(liberacoes.rows).toEqual([
        { origem: "admin", slug: "solto" },
        { origem: "troca", slug: "trocado" },
      ]);
    });

    test("só o lançamento trilha_concluida some do livro-razão", async () => {
      const r = await banco().query(
        `select p.motivo::text as motivo, p.pontos, c.slug as troca
         from ponto_lancamento p
         left join liberacao l on l.id = p.liberacao_id
         left join curso c on c.id = l.curso_id
         order by motivo`
      );
      expect(r.rows).toEqual([
        { motivo: "aula_assistida", pontos: 10, troca: null },
        { motivo: "curso_concluido", pontos: 100, troca: null },
        { motivo: "sequencia_7_dias", pontos: 50, troca: null },
        { motivo: "troca", pontos: -200, troca: "trocado" },
      ]);
    });

    test("os checks do lançamento continuam recusando", async () => {
      const c = banco();
      const sinal = await c
        .query(
          "insert into ponto_lancamento (user_id, motivo, pontos, dia_marco) values ($1, 'sequencia_7_dias', -50, '2026-10-16')",
          [ALUNO]
        )
        .then(() => null, codigoDoErro);
      expect(sinal).toBe("ponto_lancamento_sinal");
      const referencia = await c
        .query(
          "insert into ponto_lancamento (user_id, motivo, pontos) values ($1, 'sequencia_7_dias', 50)",
          [ALUNO]
        )
        .then(() => null, codigoDoErro);
      expect(referencia).toBe("ponto_lancamento_referencia");
    });

    test("o motivo trilha_concluida sai do enum", async () => {
      const r = await banco().query<{ valores: string }>(
        "select enum_range(null::motivo_ponto)::text as valores"
      );
      expect(r.rows[0]?.valores).toBe(
        "{aula_assistida,curso_concluido,sequencia_7_dias,troca}"
      );
    });

    test("liberação sem curso é recusada", async () => {
      const erro = await banco()
        .query(
          "insert into liberacao (user_id, liberada_por, origem) values ($1, $2, 'admin')",
          [ALUNO, ADMIN]
        )
        .then(
          () => null,
          (e: unknown) =>
            typeof e === "object" && e !== null && "column" in e
              ? String(e.column)
              : String(e)
        );
      expect(erro).toBe("curso_id");
    });
  }
);
