// Estados inválidos que o banco recusa, um caso por constraint (seção 2.8 do desenho).
// Roda só com TEST_DATABASE_URL apontando para o Postgres local. Cada caso roda numa
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
  categoriaId: string;
  cursoId: string;
  moduloId: string;
}

async function montarBase(c: Client): Promise<Base> {
  const s = sufixo();
  const aluno = `user_teste${s}`;
  const categoria = await c.query<{ id: string }>(
    "insert into categoria (nome) values ($1) returning id",
    [`Categoria ${s}`]
  );
  const categoriaId = categoria.rows[0]?.id ?? "";
  const curso = await c.query<{ id: string }>(
    `insert into curso (slug, codigo, titulo, categoria_id, capa_url, capa_alt, capa_largura, capa_altura, status)
     values ($1, $1, 'Curso teste', $2, '/capas/x.jpg', 'Capa de teste', 1280, 720, 'publicado') returning id`,
    [`teste-${s}`, categoriaId]
  );
  const cursoId = curso.rows[0]?.id ?? "";
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
  return {
    aluno,
    aulaId: aula.rows[0]?.id ?? "",
    categoriaId,
    cursoId,
    moduloId,
  };
}

interface Caso {
  /** SQL que remove a restrição no modo SEM_RESTRICAO. */
  apagar: string;
  constraint: string;
  nome: string;
  violar: (c: Client, b: Base) => Promise<unknown>;
}

const liberar = (c: Client, b: Base) =>
  c.query(
    "insert into liberacao (user_id, curso_id, liberada_por, origem) values ($1, $2, 'user_admin', 'admin')",
    [b.aluno, b.cursoId]
  );

const assistir = (c: Client, b: Base) =>
  c.query("insert into aula_assistida (user_id, aula_id) values ($1, $2)", [
    b.aluno,
    b.aulaId,
  ]);

const certificar = (c: Client, b: Base) =>
  c.query(
    "insert into certificado (user_id, curso_id, codigo, segundos_de_video) values ($1, $2, $3, 600)",
    [b.aluno, b.cursoId, `TESTE-${sufixo()}`]
  );

async function liberarParaTroca(c: Client, aluno: string, cursoId: string) {
  const r = await c.query<{ id: string }>(
    "insert into liberacao (user_id, curso_id, liberada_por, origem) values ($1, $2, $1, 'troca') returning id",
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
    apagar: "drop index liberacao_curso_ativa_unica",
    constraint: "liberacao_curso_ativa_unica",
    nome: "duas liberações ativas do mesmo curso",
    violar: async (c, b) => {
      await liberar(c, b);
      await liberar(c, b);
    },
  },
  {
    apagar: "alter table liberacao drop constraint liberacao_user_id_clerk",
    constraint: "liberacao_user_id_clerk",
    nome: "e-mail no lugar do userId",
    violar: (c, b) =>
      c.query(
        "insert into liberacao (user_id, curso_id, liberada_por, origem) values ('marina@x.com', $1, 'user_admin', 'admin')",
        [b.cursoId]
      ),
  },
  {
    apagar:
      "alter table liberacao drop constraint liberacao_revogacao_coerente",
    constraint: "liberacao_revogacao_coerente",
    nome: "revogação sem autor",
    violar: (c, b) =>
      c.query(
        "insert into liberacao (user_id, curso_id, liberada_por, origem, revogada_em) values ($1, $2, 'user_admin', 'admin', now())",
        [b.aluno, b.cursoId]
      ),
  },
  {
    apagar: "alter table liberacao drop constraint liberacao_troca_nao_revoga",
    constraint: "liberacao_troca_nao_revoga",
    nome: "revogar a liberação de uma troca",
    violar: async (c, b) => {
      const id = await liberarParaTroca(c, b.aluno, b.cursoId);
      await c.query(
        "update liberacao set revogada_em = now(), revogada_por = 'user_admin' where id = $1",
        [id]
      );
    },
  },
  {
    apagar: "alter table liberacao drop constraint liberacao_troca_pelo_aluno",
    constraint: "liberacao_troca_pelo_aluno",
    nome: "troca liberada por outra pessoa",
    violar: (c, b) =>
      c.query(
        "insert into liberacao (user_id, curso_id, liberada_por, origem) values ($1, $2, 'user_admin', 'troca')",
        [b.aluno, b.cursoId]
      ),
  },
  {
    apagar: "alter table modulo drop constraint modulo_nivel_do_mesmo_curso",
    constraint: "modulo_nivel_do_mesmo_curso",
    nome: "módulo apontando para nível de outro curso",
    violar: async (c, b) => {
      const outro = await c.query<{ id: string }>(
        `insert into curso (slug, codigo, titulo, categoria_id, capa_url, capa_alt, capa_largura, capa_altura)
         values ($1, $1, 'Outro', $2, '/capas/x.jpg', 'Capa', 1280, 720) returning id`,
        [`teste-${sufixo()}`, b.categoriaId]
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
    apagar:
      "alter table certificado drop constraint certificado_segundos_nao_negativos",
    constraint: "certificado_segundos_nao_negativos",
    nome: "certificado com carga horária negativa",
    violar: (c, b) =>
      c.query(
        "insert into certificado (user_id, curso_id, codigo, segundos_de_video) values ($1, $2, $3, -1)",
        [b.aluno, b.cursoId, `TESTE-${sufixo()}`]
      ),
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
    apagar: "alter table curso drop constraint curso_capa_alt_preenchido",
    constraint: "curso_capa_alt_preenchido",
    nome: "capa sem texto alternativo",
    violar: (c, b) =>
      c.query(
        "insert into curso (slug, codigo, titulo, categoria_id, capa_url, capa_alt, capa_largura, capa_altura) values ($1, $1, 'Curso', $2, '/capas/x.jpg', '   ', 1280, 720)",
        [`teste-${sufixo()}`, b.categoriaId]
      ),
  },
  {
    apagar: "alter table categoria drop constraint categoria_nome_unico",
    constraint: "categoria_nome_unico",
    nome: "duas categorias com o mesmo nome",
    violar: (c) =>
      c.query(
        "insert into categoria (nome) values ('Vendas repetida'), ('Vendas repetida')"
      ),
  },
  {
    apagar: "alter table categoria drop constraint categoria_nome_formato",
    constraint: "categoria_nome_formato",
    nome: "categoria com espaço nas pontas",
    violar: (c) => c.query("insert into categoria (nome) values (' Vendas ')"),
  },
  {
    apagar: "alter table categoria drop constraint categoria_nome_formato",
    constraint: "categoria_nome_formato",
    nome: "categoria vazia",
    violar: (c) => c.query("insert into categoria (nome) values ('')"),
  },
  {
    apagar: "alter table categoria drop constraint categoria_nome_formato",
    constraint: "categoria_nome_formato",
    nome: "categoria com 81 caracteres",
    violar: (c) =>
      c.query("insert into categoria (nome) values (repeat('a', 81))"),
  },
  {
    apagar:
      "alter table curso drop constraint curso_categoria_id_categoria_id_fkey",
    constraint: "curso_categoria_id_categoria_id_fkey",
    nome: "categoria em uso apagada",
    violar: (c, b) =>
      c.query("delete from categoria where id = $1", [b.categoriaId]),
  },
  {
    apagar: "alter table curso drop constraint curso_descricao_tamanho",
    constraint: "curso_descricao_tamanho",
    nome: "descrição do curso com 2001 caracteres",
    violar: (c, b) =>
      c.query("update curso set descricao = repeat('a', 2001) where id = $1", [
        b.cursoId,
      ]),
  },
  {
    apagar: "alter table aula drop constraint aula_descricao_tamanho",
    constraint: "aula_descricao_tamanho",
    nome: "descrição da aula com 2001 caracteres",
    violar: (c, b) =>
      c.query("update aula set descricao = repeat('a', 2001) where id = $1", [
        b.aulaId,
      ]),
  },
  {
    apagar: "alter table curso drop constraint curso_topicos_validos",
    constraint: "curso_topicos_validos",
    nome: "11 tópicos",
    violar: (c, b) =>
      c.query(
        "update curso set topicos = array_fill('Tópico'::text, array[11]) where id = $1",
        [b.cursoId]
      ),
  },
  {
    apagar: "alter table curso drop constraint curso_topicos_validos",
    constraint: "curso_topicos_validos",
    nome: "tópico só com espaços",
    violar: (c, b) =>
      c.query(
        "update curso set topicos = array['Envase', '   '] where id = $1",
        [b.cursoId]
      ),
  },
  {
    apagar: "alter table curso drop constraint curso_topicos_validos",
    constraint: "curso_topicos_validos",
    nome: "tópico com 121 caracteres",
    violar: (c, b) =>
      c.query(
        "update curso set topicos = array[repeat('a', 121)] where id = $1",
        [b.cursoId]
      ),
  },
  {
    apagar: "alter table curso drop constraint curso_topicos_validos",
    constraint: "curso_topicos_validos",
    nome: "tópico nulo",
    violar: (c, b) =>
      c.query("update curso set topicos = array[null::text] where id = $1", [
        b.cursoId,
      ]),
  },
  {
    apagar: "alter table curso drop constraint curso_capa_dimensoes_positivas",
    constraint: "curso_capa_dimensoes_positivas",
    nome: "capa com largura zero",
    violar: (c, b) =>
      c.query("update curso set capa_largura = 0 where id = $1", [b.cursoId]),
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
  {
    apagar: "alter table pergunta drop constraint pergunta_posicao_unica",
    constraint: "pergunta_posicao_unica",
    nome: "duas perguntas na mesma posição da aula",
    violar: async (c, b) => {
      await perguntar(c, b.aulaId, 1);
      await perguntar(c, b.aulaId, 1);
    },
  },
  {
    apagar: "alter table pergunta drop constraint pergunta_enunciado_formato",
    constraint: "pergunta_enunciado_formato",
    nome: "pergunta com 501 caracteres",
    violar: (c, b) => perguntar(c, b.aulaId, 1, "p".repeat(501)),
  },
  {
    apagar: "alter table pergunta drop constraint pergunta_enunciado_formato",
    constraint: "pergunta_enunciado_formato",
    nome: "pergunta só com espaços",
    violar: (c, b) => perguntar(c, b.aulaId, 1, "  "),
  },
  {
    apagar: "alter table pergunta drop constraint pergunta_posicao_positiva",
    constraint: "pergunta_posicao_positiva",
    nome: "pergunta na posição 0",
    violar: (c, b) => perguntar(c, b.aulaId, 0),
  },
  {
    apagar: "drop index alternativa_certa_unica",
    constraint: "alternativa_certa_unica",
    nome: "duas alternativas certas na mesma pergunta",
    violar: async (c, b) => {
      const p = await perguntar(c, b.aulaId, 1);
      await alternar(c, p, 1, true);
      await alternar(c, p, 2, true);
    },
  },
  {
    apagar: "alter table alternativa drop constraint alternativa_posicao_unica",
    constraint: "alternativa_posicao_unica",
    nome: "duas alternativas na mesma posição",
    violar: async (c, b) => {
      const p = await perguntar(c, b.aulaId, 1);
      await alternar(c, p, 1, true);
      await alternar(c, p, 1, false);
    },
  },
  {
    apagar: "alter table alternativa drop constraint alternativa_texto_formato",
    constraint: "alternativa_texto_formato",
    nome: "alternativa com 201 caracteres",
    violar: async (c, b) =>
      alternar(c, await perguntar(c, b.aulaId, 1), 1, true, "a".repeat(201)),
  },
  {
    apagar:
      "alter table alternativa drop constraint alternativa_posicao_positiva",
    constraint: "alternativa_posicao_positiva",
    nome: "alternativa na posição 0",
    violar: async (c, b) =>
      alternar(c, await perguntar(c, b.aulaId, 1), 0, true),
  },
  {
    apagar:
      "alter table questionario_tentativa drop constraint tentativa_acertos_no_total",
    constraint: "tentativa_acertos_no_total",
    nome: "tentativa com mais acertos que perguntas",
    violar: (c, b) => tentar(c, b.aluno, b.aulaId, { acertos: 4, total: 3 }),
  },
  {
    apagar:
      "alter table questionario_tentativa drop constraint tentativa_numero_unico",
    constraint: "tentativa_numero_unico",
    nome: "duas tentativas com o mesmo número na mesma aula",
    violar: async (c, b) => {
      await tentar(c, b.aluno, b.aulaId, { numero: 1 });
      await tentar(c, b.aluno, b.aulaId, { numero: 1 });
    },
  },
  {
    apagar: "drop index tentativa_aprovada_unica",
    constraint: "tentativa_aprovada_unica",
    nome: "segunda tentativa aprovada na mesma aula",
    violar: async (c, b) => {
      await tentar(c, b.aluno, b.aulaId, { aprovada: true, numero: 1 });
      await tentar(c, b.aluno, b.aulaId, { aprovada: true, numero: 2 });
    },
  },
  {
    apagar:
      "alter table questionario_tentativa drop constraint tentativa_user_id_clerk",
    constraint: "tentativa_user_id_clerk",
    nome: "tentativa com e-mail no lugar do userId",
    violar: (c, b) => tentar(c, "marina@x.com", b.aulaId, {}),
  },
  {
    apagar:
      "alter table questionario_tentativa drop constraint questionario_tentativa_aula_id_aula_id_fkey",
    constraint: "questionario_tentativa_aula_id_aula_id_fkey",
    nome: "apagar a aula de uma tentativa",
    violar: async (c, b) => {
      await tentar(c, b.aluno, b.aulaId, {});
      await c.query("delete from aula where id = $1", [b.aulaId]);
    },
  },
  {
    apagar: "alter table ponto_lancamento drop constraint ponto_tentativa_fk",
    constraint: "ponto_tentativa_fk",
    nome: "ponto de questionário de tentativa de outro aluno",
    violar: async (c, b) => {
      const id = await tentar(c, b.aluno, b.aulaId, {});
      await c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos, tentativa_id) values ('user_outro', 'questionario', 5, $1)",
        [id]
      );
    },
  },
  {
    apagar:
      "alter table ponto_lancamento drop constraint ponto_questionario_uma_vez",
    constraint: "ponto_questionario_uma_vez",
    nome: "mesma tentativa pontuada duas vezes",
    violar: async (c, b) => {
      const id = await tentar(c, b.aluno, b.aulaId, {});
      const pontuar = () =>
        c.query(
          "insert into ponto_lancamento (user_id, motivo, pontos, tentativa_id) values ($1, 'questionario', 5, $2)",
          [b.aluno, id]
        );
      await pontuar();
      await pontuar();
    },
  },
  {
    apagar:
      "alter table ponto_lancamento drop constraint ponto_lancamento_referencia",
    constraint: "ponto_lancamento_referencia",
    nome: "ponto de questionário sem a tentativa",
    violar: (c, b) =>
      c.query(
        "insert into ponto_lancamento (user_id, motivo, pontos, aula_id) values ($1, 'questionario', 5, $2)",
        [b.aluno, b.aulaId]
      ),
  },
];

async function perguntar(
  c: Client,
  aulaId: string,
  posicao: number,
  enunciado = "Qual é a pergunta?"
) {
  const r = await c.query<{ id: string }>(
    "insert into pergunta (aula_id, posicao, enunciado) values ($1, $2, $3) returning id",
    [aulaId, posicao, enunciado]
  );
  return r.rows[0]?.id ?? "";
}

const alternar = (
  c: Client,
  perguntaId: string,
  posicao: number,
  certa: boolean,
  texto = "Uma alternativa"
) =>
  c.query(
    "insert into alternativa (pergunta_id, posicao, texto, certa) values ($1, $2, $3, $4)",
    [perguntaId, posicao, texto, certa]
  );

async function tentar(
  c: Client,
  aluno: string,
  aulaId: string,
  o: { acertos?: number; aprovada?: boolean; numero?: number; total?: number }
) {
  const r = await c.query<{ id: string }>(
    `insert into questionario_tentativa (id, user_id, aula_id, numero, acertos, total, aprovada)
     values (gen_random_uuid(), $1, $2, $3, $4, $5, $6) returning id`,
    [
      aluno,
      aulaId,
      o.numero ?? 1,
      o.acertos ?? 1,
      o.total ?? 3,
      o.aprovada ?? false,
    ]
  );
  return r.rows[0]?.id ?? "";
}

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

  test("aceita a descrição de 2000 caracteres e 10 tópicos de 120", async () => {
    const lido = await emTransacao(async () => {
      const b = await montarBase(c);
      await c.query(
        "update curso set descricao = repeat('a', 2000), topicos = array_fill(repeat('b', 120), array[10]) where id = $1",
        [b.cursoId]
      );
      await c.query(
        "update aula set descricao = repeat('c', 2000) where id = $1",
        [b.aulaId]
      );
      const r = await c.query<{ aula: number; curso: number; topicos: number }>(
        `select char_length(c.descricao) as curso, cardinality(c.topicos) as topicos,
                char_length(a.descricao) as aula
           from curso c join aula a on a.id = $2 where c.id = $1`,
        [b.cursoId, b.aulaId]
      );
      return r.rows[0];
    });
    expect(lido).toEqual({ aula: 2000, curso: 2000, topicos: 10 });
  });

  test("aceita liberar de novo depois de revogar", async () => {
    await emTransacao(async () => {
      const b = await montarBase(c);
      await liberar(c, b);
      await c.query(
        "update liberacao set revogada_em = now(), revogada_por = 'user_admin' where user_id = $1",
        [b.aluno]
      );
      await liberar(c, b);
      const n = await c.query<{ n: number }>(
        "select count(*)::int as n from liberacao where user_id = $1",
        [b.aluno]
      );
      expect(n.rows[0]?.n).toBe(2);
    });
  });

  test("aceita revogar o curso que o admin liberou para si mesmo", async () => {
    await emTransacao(async () => {
      const b = await montarBase(c);
      await c.query(
        "insert into liberacao (user_id, curso_id, liberada_por, origem) values ($1, $2, $1, 'admin')",
        [b.aluno, b.cursoId]
      );
      const r = await c.query(
        "update liberacao set revogada_em = now(), revogada_por = $1 where user_id = $1",
        [b.aluno]
      );
      expect(r.rowCount).toBe(1);
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
