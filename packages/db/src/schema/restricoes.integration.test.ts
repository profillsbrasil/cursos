// Estados inválidos que o banco recusa, um caso por constraint (seção 2.8 do desenho).
// Roda só com TEST_DATABASE_URL apontando para o Supabase local. Cada caso roda numa
// transação desfeita no fim, então nada fica no banco, que é compartilhado entre worktrees.
// Com SEM_RESTRICAO=1, cada caso apaga a própria constraint antes de violar: o teste tem
// de ficar vermelho, prova de que é a constraint que segura o estado.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { Client } from "pg";

import { urlDeTeste } from "../seed/guarda-local";

const URL_TESTE = urlDeTeste();
const SEM_RESTRICAO = process.env.SEM_RESTRICAO === "1";

const sufixo = () => randomBytes(4).toString("hex");

interface Base {
  aluno: string;
  aulaId: string;
  cursoId: string;
  moduloId: string;
  trilhaId: string;
}

async function montarBase(c: Client): Promise<Base> {
  const s = sufixo();
  const aluno = `user_teste${s}`;
  const trilha = await c.query<{ id: string }>(
    "insert into trilha (slug, titulo, descricao) values ($1, 'Trilha teste', 'teste') returning id",
    [`teste-${s}`]
  );
  const curso = await c.query<{ id: string }>(
    `insert into curso (slug, titulo, tema, capa_url, capa_alt, status)
     values ($1, 'Curso teste', 'teste', '/capas/x.jpg', 'Capa de teste', 'publicado') returning id`,
    [`teste-${s}`]
  );
  const cursoId = curso.rows[0]?.id ?? "";
  const trilhaId = trilha.rows[0]?.id ?? "";
  await c.query(
    "insert into trilha_curso (curso_id, trilha_id, posicao) values ($1, $2, 1)",
    [cursoId, trilhaId]
  );
  await c.query(
    "insert into nivel (curso_id, ordem, nome) values ($1, 1, 'Nível teste')",
    [cursoId]
  );
  const modulo = await c.query<{ id: string }>(
    "insert into modulo (curso_id, numero, titulo, nivel_ordem) values ($1, 0, 'Módulo teste', 1) returning id",
    [cursoId]
  );
  const moduloId = modulo.rows[0]?.id ?? "";
  const aula = await c.query<{ id: string }>(
    "insert into aula (modulo_id, posicao, titulo, duracao_seg) values ($1, 1, 'Aula teste', 600) returning id",
    [moduloId]
  );
  return { aluno, aulaId: aula.rows[0]?.id ?? "", cursoId, moduloId, trilhaId };
}

interface Caso {
  /** SQL que remove a restrição no modo SEM_RESTRICAO. */
  apagar: string;
  constraint: string;
  nome: string;
  violar: (c: Client, b: Base) => Promise<unknown>;
}

const liberar = (c: Client, b: Base, alvo: "curso" | "trilha") =>
  c.query(
    `insert into liberacao (user_id, ${alvo}_id, liberada_por) values ($1, $2, 'user_admin')`,
    [b.aluno, alvo === "curso" ? b.cursoId : b.trilhaId]
  );

const assistir = (c: Client, b: Base) =>
  c.query("insert into aula_assistida (user_id, aula_id) values ($1, $2)", [
    b.aluno,
    b.aulaId,
  ]);

const certificar = (c: Client, b: Base) =>
  c.query(
    "insert into certificado (user_id, curso_id, codigo) values ($1, $2, $3)",
    [b.aluno, b.cursoId, `TESTE-${sufixo()}`]
  );

/** Liberação do curso feita pelo próprio aluno, como a troca grava. */
async function liberarParaTroca(c: Client, aluno: string, cursoId: string) {
  const r = await c.query<{ id: string }>(
    "insert into liberacao (user_id, curso_id, liberada_por) values ($1, $2, $1) returning id",
    [aluno, cursoId]
  );
  return r.rows[0]?.id ?? "";
}

const pagarTroca = (
  c: Client,
  aluno: string,
  liberacaoId: string,
  pontos: number
) =>
  c.query(
    "insert into ponto_lancamento (user_id, motivo, pontos, liberacao_id) values ($1, 'troca', $2, $3)",
    [aluno, pontos, liberacaoId]
  );

const CASOS: Caso[] = [
  {
    apagar: "alter table liberacao drop constraint liberacao_alvo_unico",
    constraint: "liberacao_alvo_unico",
    nome: "liberação com trilha e curso ao mesmo tempo",
    violar: (c, b) =>
      c.query(
        "insert into liberacao (user_id, trilha_id, curso_id, liberada_por) values ($1, $2, $3, 'user_admin')",
        [b.aluno, b.trilhaId, b.cursoId]
      ),
  },
  {
    apagar: "drop index liberacao_trilha_ativa_unica",
    constraint: "liberacao_trilha_ativa_unica",
    nome: "duas liberações ativas da mesma trilha",
    violar: async (c, b) => {
      await liberar(c, b, "trilha");
      await liberar(c, b, "trilha");
    },
  },
  {
    apagar: "alter table liberacao drop constraint liberacao_user_id_clerk",
    constraint: "liberacao_user_id_clerk",
    nome: "e-mail no lugar do userId",
    violar: (c, b) =>
      c.query(
        "insert into liberacao (user_id, trilha_id, liberada_por) values ('marina@x.com', $1, 'user_admin')",
        [b.trilhaId]
      ),
  },
  {
    apagar:
      "alter table liberacao drop constraint liberacao_revogacao_coerente",
    constraint: "liberacao_revogacao_coerente",
    nome: "revogação sem autor",
    violar: (c, b) =>
      c.query(
        "insert into liberacao (user_id, trilha_id, liberada_por, revogada_em) values ($1, $2, 'user_admin', now())",
        [b.aluno, b.trilhaId]
      ),
  },
  {
    apagar: "alter table trilha_curso drop constraint trilha_curso_pkey",
    constraint: "trilha_curso_pkey",
    nome: "curso em duas trilhas",
    violar: async (c, b) => {
      const outra = await c.query<{ id: string }>(
        "insert into trilha (slug, titulo, descricao) values ($1, 'Outra', 'teste') returning id",
        [`teste-${sufixo()}`]
      );
      await c.query(
        "insert into trilha_curso (curso_id, trilha_id, posicao) values ($1, $2, 1)",
        [b.cursoId, outra.rows[0]?.id]
      );
    },
  },
  {
    apagar: "alter table modulo drop constraint modulo_nivel_do_mesmo_curso",
    constraint: "modulo_nivel_do_mesmo_curso",
    nome: "módulo apontando para nível de outro curso",
    violar: async (c, b) => {
      const outro = await c.query<{ id: string }>(
        `insert into curso (slug, titulo, tema, capa_url, capa_alt)
         values ($1, 'Outro', 'teste', '/capas/x.jpg', 'Capa') returning id`,
        [`teste-${sufixo()}`]
      );
      await c.query(
        "insert into nivel (curso_id, ordem, nome) values ($1, 2, 'Nível do outro')",
        [outro.rows[0]?.id]
      );
      await c.query(
        "insert into modulo (curso_id, numero, titulo, nivel_ordem) values ($1, 1, 'Módulo', 2)",
        [b.cursoId]
      );
    },
  },
  {
    apagar: "alter table aula drop constraint aula_duracao_positiva",
    constraint: "aula_duracao_positiva",
    nome: "aula com duração zero",
    violar: (c, b) =>
      c.query(
        "insert into aula (modulo_id, posicao, titulo, duracao_seg) values ($1, 2, 'Aula', 0)",
        [b.moduloId]
      ),
  },
  {
    apagar:
      "alter table certificado drop constraint certificado_um_por_curso cascade",
    constraint: "certificado_um_por_curso",
    nome: "segundo certificado do mesmo curso",
    violar: async (c, b) => {
      await certificar(c, b);
      await certificar(c, b);
    },
  },
  {
    apagar: "alter table ponto_lancamento drop constraint ponto_aula_uma_vez",
    constraint: "ponto_aula_uma_vez",
    nome: "mesma aula pontuada duas vezes",
    violar: async (c, b) => {
      await assistir(c, b);
      const pontuar = () =>
        c.query(
          "insert into ponto_lancamento (user_id, motivo, pontos, aula_id) values ($1, 'aula_assistida', 10, $2)",
          [b.aluno, b.aulaId]
        );
      await pontuar();
      await pontuar();
    },
  },
  {
    apagar:
      "alter table ponto_lancamento drop constraint ponto_aula_assistida_fk",
    constraint: "ponto_aula_assistida_fk",
    nome: "ponto de aula que o aluno não assistiu",
    violar: (c, b) =>
      c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos, aula_id) values ($1, 'aula_assistida', 10, $2)",
        [b.aluno, b.aulaId]
      ),
  },
  {
    apagar:
      "alter table ponto_lancamento drop constraint ponto_lancamento_referencia",
    constraint: "ponto_lancamento_referencia",
    nome: "motivo que não bate com a referência",
    violar: (c, b) =>
      c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos, dia_marco) values ($1, 'curso_concluido', 100, '2026-10-07')",
        [b.aluno]
      ),
  },
  {
    apagar: "alter table ponto_lancamento drop constraint ponto_certificado_fk",
    constraint: "ponto_certificado_fk",
    nome: "ponto de curso concluído sem certificado",
    violar: (c, b) =>
      c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos, curso_id) values ($1, 'curso_concluido', 100, $2)",
        [b.aluno, b.cursoId]
      ),
  },
  {
    apagar:
      "alter table ponto_lancamento drop constraint ponto_lancamento_sinal",
    constraint: "ponto_lancamento_sinal",
    nome: "lançamento de sequência negativo",
    violar: (c, b) =>
      c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos, dia_marco) values ($1, 'sequencia_7_dias', -30, '2026-10-07')",
        [b.aluno]
      ),
  },
  {
    apagar:
      "alter table ponto_lancamento drop constraint ponto_lancamento_sinal",
    constraint: "ponto_lancamento_sinal",
    nome: "aula assistida negativa",
    violar: async (c, b) => {
      await assistir(c, b);
      await c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos, aula_id) values ($1, 'aula_assistida', -10, $2)",
        [b.aluno, b.aulaId]
      );
    },
  },
  {
    apagar:
      "alter table ponto_lancamento drop constraint ponto_lancamento_sinal",
    constraint: "ponto_lancamento_sinal",
    nome: "troca positiva",
    violar: async (c, b) =>
      pagarTroca(
        c,
        b.aluno,
        await liberarParaTroca(c, b.aluno, b.cursoId),
        200
      ),
  },
  {
    apagar:
      "alter table ponto_lancamento drop constraint ponto_lancamento_referencia",
    constraint: "ponto_lancamento_referencia",
    nome: "troca sem liberação",
    violar: (c, b) =>
      c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos) values ($1, 'troca', -200)",
        [b.aluno]
      ),
  },
  {
    apagar: "alter table ponto_lancamento drop constraint ponto_liberacao_fk",
    constraint: "ponto_liberacao_fk",
    nome: "troca que paga a liberação de outro aluno",
    violar: async (c, b) => {
      const alheia = await liberarParaTroca(c, `${b.aluno}x`, b.cursoId);
      await pagarTroca(c, b.aluno, alheia, -200);
    },
  },
  {
    apagar: "alter table ponto_lancamento drop constraint ponto_troca_uma_vez",
    constraint: "ponto_troca_uma_vez",
    nome: "dois lançamentos de troca na mesma liberação",
    violar: async (c, b) => {
      const id = await liberarParaTroca(c, b.aluno, b.cursoId);
      await pagarTroca(c, b.aluno, id, -200);
      await pagarTroca(c, b.aluno, id, -200);
    },
  },
  {
    apagar: "alter table curso drop constraint curso_preco_troca_positivo",
    constraint: "curso_preco_troca_positivo",
    nome: "preço de troca zero",
    violar: (c, b) =>
      c.query("update curso set preco_troca = 0 where id = $1", [b.cursoId]),
  },
  {
    apagar:
      "alter table aula_assistida drop constraint aula_assistida_aula_id_aula_id_fkey",
    constraint: "aula_assistida_aula_id_aula_id_fkey",
    nome: "apagar aula com histórico",
    violar: async (c, b) => {
      await assistir(c, b);
      await c.query("delete from aula where id = $1", [b.aulaId]);
    },
  },
  {
    apagar:
      "alter table posicao_aula drop constraint posicao_aula_nao_negativa",
    constraint: "posicao_aula_nao_negativa",
    nome: "posição negativa",
    violar: (c, b) =>
      c.query(
        "insert into posicao_aula (user_id, aula_id, posicao_seg) values ($1, $2, -1)",
        [b.aluno, b.aulaId]
      ),
  },
  {
    apagar: "alter table trilha drop constraint trilha_slug_formato",
    constraint: "trilha_slug_formato",
    nome: "slug com maiúscula",
    violar: (c) =>
      c.query(
        "insert into trilha (slug, titulo, descricao) values ($1, 'Trilha', 'teste')",
        [`Teste-${sufixo()}`]
      ),
  },
  {
    apagar: "alter table curso drop constraint curso_capa_alt_preenchido",
    constraint: "curso_capa_alt_preenchido",
    nome: "capa sem texto alternativo",
    violar: (c) =>
      c.query(
        "insert into curso (slug, titulo, tema, capa_url, capa_alt) values ($1, 'Curso', 'teste', '/capas/x.jpg', '   ')",
        [`teste-${sufixo()}`]
      ),
  },
  {
    apagar: "alter table aula drop constraint aula_video_completo",
    constraint: "aula_video_completo",
    nome: "provedor de vídeo sem id",
    violar: (c, b) =>
      c.query("update aula set video_provedor = 'youtube' where id = $1", [
        b.aulaId,
      ]),
  },
  {
    apagar: "alter table aula drop constraint aula_video_formato",
    constraint: "aula_video_formato",
    nome: "id do YouTube com 10 caracteres",
    violar: (c, b) =>
      c.query(
        "update aula set video_provedor = 'youtube', video_id = 'aqz-KE-bpK' where id = $1",
        [b.aulaId]
      ),
  },
  {
    apagar:
      "alter table posicao_aula drop constraint posicao_aula_trechos_nao_negativos",
    constraint: "posicao_aula_trechos_nao_negativos",
    nome: "trecho visto antes do segundo 0",
    violar: (c, b) =>
      c.query(
        "insert into posicao_aula (user_id, aula_id, posicao_seg, trechos_vistos) values ($1, $2, 10, '{[-5,10)}')",
        [b.aluno, b.aulaId]
      ),
  },
  {
    apagar: "alter table cota_video drop constraint cota_video_nao_negativa",
    constraint: "cota_video_nao_negativa",
    nome: "cota de vídeo negativa",
    violar: (c, b) =>
      c.query(
        "insert into cota_video (user_id, segundos, atualizada_em) values ($1, -1, now())",
        [b.aluno]
      ),
  },
  {
    apagar: "alter table cota_video drop constraint cota_video_user_id_clerk",
    constraint: "cota_video_user_id_clerk",
    nome: "cota de vídeo com e-mail no lugar do userId",
    violar: (c) =>
      c.query(
        "insert into cota_video (user_id, segundos, atualizada_em) values ('marina@x.com', 0, now())"
      ),
  },
];

const constraintDoErro = (e: unknown) =>
  typeof e === "object" && e !== null && "constraint" in e
    ? String(e.constraint)
    : `sem constraint: ${String(e)}`;

describe.skipIf(URL_TESTE === null)("restrições do schema", () => {
  const c = new Client({ connectionString: URL_TESTE ?? "" });

  beforeAll(async () => {
    await c.connect();
  });

  afterAll(async () => {
    await c.end();
  });

  // Roda o corpo numa transação que sempre volta atrás.
  async function emTransacao<T>(corpo: () => Promise<T>): Promise<T> {
    await c.query("begin");
    try {
      return await corpo();
    } finally {
      await c.query("rollback");
    }
  }

  for (const caso of CASOS) {
    test(`recusa ${caso.nome} (${caso.constraint})`, async () => {
      const erro = await emTransacao(async () => {
        const b = await montarBase(c);
        if (SEM_RESTRICAO) {
          await c.query(caso.apagar);
        }
        try {
          await caso.violar(c, b);
          return null;
        } catch (e) {
          return e;
        }
      });
      expect(constraintDoErro(erro)).toBe(caso.constraint);
    });
  }

  test("aceita liberar de novo depois de revogar", async () => {
    await emTransacao(async () => {
      const b = await montarBase(c);
      await liberar(c, b, "trilha");
      await c.query(
        "update liberacao set revogada_em = now(), revogada_por = 'user_admin' where user_id = $1",
        [b.aluno]
      );
      await liberar(c, b, "trilha");
      const n = await c.query<{ n: number }>(
        "select count(*)::int as n from liberacao where user_id = $1",
        [b.aluno]
      );
      expect(n.rows[0]?.n).toBe(2);
    });
  });

  test("aceita ponto de curso concluído com certificado", async () => {
    await emTransacao(async () => {
      const b = await montarBase(c);
      await certificar(c, b);
      await c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos, curso_id) values ($1, 'curso_concluido', 100, $2)",
        [b.aluno, b.cursoId]
      );
      const n = await c.query<{ n: number }>(
        "select count(*)::int as n from ponto_lancamento where user_id = $1",
        [b.aluno]
      );
      expect(n.rows[0]?.n).toBe(1);
    });
  });

  test("aceita troca: liberação do próprio aluno paga com lançamento negativo", async () => {
    await emTransacao(async () => {
      const b = await montarBase(c);
      await c.query("update curso set preco_troca = 200 where id = $1", [
        b.cursoId,
      ]);
      await pagarTroca(
        c,
        b.aluno,
        await liberarParaTroca(c, b.aluno, b.cursoId),
        -200
      );
      const r = await c.query<{ saldo: number }>(
        "select sum(pontos)::int as saldo from ponto_lancamento where user_id = $1",
        [b.aluno]
      );
      expect(r.rows[0]?.saldo).toBe(-200);
    });
  });

  test("aceita aula sem vídeo, com vídeo do YouTube e trechos vazios", async () => {
    await emTransacao(async () => {
      const b = await montarBase(c);
      await c.query(
        "insert into posicao_aula (user_id, aula_id, posicao_seg) values ($1, $2, 0)",
        [b.aluno, b.aulaId]
      );
      await c.query(
        "update aula set video_provedor = 'youtube', video_id = 'aqz-KE-bpKQ' where id = $1",
        [b.aulaId]
      );
      const r = await c.query<{ t: string }>(
        "select trechos_vistos::text as t from posicao_aula where user_id = $1",
        [b.aluno]
      );
      expect(r.rows[0]?.t).toBe("{}");
    });
  });

  test("a coluna dia guarda o dia civil de São Paulo", async () => {
    await emTransacao(async () => {
      const b = await montarBase(c);
      const r = await c.query<{ dia: string }>(
        "insert into aula_assistida (user_id, aula_id, assistida_em) values ($1, $2, '2026-10-07T02:00:00Z') returning dia::text",
        [b.aluno, b.aulaId]
      );
      expect(r.rows[0]?.dia).toBe("2026-10-06");
    });
  });
});
