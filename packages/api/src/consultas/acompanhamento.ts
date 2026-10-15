import type { Database } from "@cursos/db";
import { sql } from "drizzle-orm";

import type { CursoDoResumo, LinhasDoResumo } from "../dominio/acompanhamento";

/** Literal de text[] do Postgres, com aspas e barras escapadas. */
const arrayDeTexto = (itens: readonly string[]) =>
  `{${itens.map((s) => `"${s.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;

/** Instante em milissegundos desde 1970, como o node-postgres corta o timestamptz. */
type Ms = number;

interface PessoaEmJson {
  assistidas: { assistidaEm: Ms; aulaId: string }[];
  certificados: { codigo: string; cursoId: string; emitidoEm: Ms }[];
  liberacoes: {
    cursoId: string | null;
    liberadaEm: Ms;
    revogadaEm: Ms | null;
    trilhaId: string | null;
  }[];
  posicoes: { atualizadaEm: Ms; aulaId: string; posicaoSeg: number }[];
  userId: string;
}

interface LinhasEmJson {
  cursos: CursoDoResumo[];
  pessoas: PessoaEmJson[];
  trilhas: { cursos: string[]; id: string }[];
}

const SEM_PESSOAS: LinhasDoResumo = { cursos: [], pessoas: [], trilhas: [] };

/**
 * A busca de alunos: um statement para a página do Clerk (até 20 userIds), que
 * devolve um documento JSON só. Para cada pessoa, todas as liberações e o
 * histórico (as mesmas linhas dos statements 2, 3 e 4 do painel); uma vez só,
 * os cursos e as trilhas que alguma delas alcança por liberação ativa, com os
 * ids das aulas em ordem. O SQL só lê: estado, progresso e "abre" são decididos
 * em dominio/acompanhamento.ts pelas regras do painel.
 */
export async function resumoDasPessoas(
  db: Database,
  userIds: readonly string[]
): Promise<LinhasDoResumo> {
  if (userIds.length === 0) {
    return SEM_PESSOAS;
  }
  const emMs = (coluna: string) =>
    sql.raw(`floor(extract(epoch from ${coluna}) * 1000)::bigint`);
  const { rows } = await db.execute<{ linhas: LinhasEmJson }>(sql`
    with p as (
      select user_id from unnest(${arrayDeTexto(userIds)}::text[]) as p(user_id)
    ),
    lib as (
      select l.user_id, l.curso_id, l.trilha_id, l.liberada_em, l.revogada_em
        from liberacao l
       where l.user_id in (select user_id from p)
    ),
    trilhas as (
      select distinct trilha_id as id from lib
       where revogada_em is null and trilha_id is not null
    ),
    cursos as (
      select curso_id as id from lib
       where revogada_em is null and curso_id is not null
      union
      select tc.curso_id from trilha_curso tc join trilhas t on t.id = tc.trilha_id
    )
    select json_build_object(
      'pessoas', coalesce((select json_agg(json_build_object(
        'userId', p.user_id,
        'liberacoes', coalesce((select json_agg(json_build_object(
            'cursoId', lib.curso_id,
            'trilhaId', lib.trilha_id,
            'liberadaEm', ${emMs("lib.liberada_em")},
            'revogadaEm', ${emMs("lib.revogada_em")}))
          from lib where lib.user_id = p.user_id), '[]'),
        'assistidas', coalesce((select json_agg(json_build_object(
            'aulaId', a.aula_id,
            'assistidaEm', ${emMs("a.assistida_em")}))
          from aula_assistida a where a.user_id = p.user_id), '[]'),
        'posicoes', coalesce((select json_agg(json_build_object(
            'aulaId', pa.aula_id,
            'posicaoSeg', pa.posicao_seg,
            'atualizadaEm', ${emMs("pa.atualizada_em")}))
          from posicao_aula pa
         where pa.user_id = p.user_id and pa.posicao_seg > 0), '[]'),
        'certificados', coalesce((select json_agg(json_build_object(
            'codigo', ce.codigo,
            'cursoId', ce.curso_id,
            'emitidoEm', ${emMs("ce.emitido_em")}))
          from certificado ce where ce.user_id = p.user_id), '[]')
      )) from p), '[]'),
      'trilhas', coalesce((select json_agg(json_build_object(
        'id', t.id,
        'cursos', coalesce((select json_agg(tc.curso_id order by tc.posicao)
          from trilha_curso tc where tc.trilha_id = t.id), '[]')
      )) from trilhas t), '[]'),
      'cursos', coalesce((select json_agg(json_build_object(
        'id', c.id,
        'status', c.status,
        'titulo', c.titulo,
        'modulos', coalesce((select json_agg(json_build_object(
            'aulas', coalesce((select json_agg(json_build_object('id', au.id)
                order by au.posicao)
              from aula au where au.modulo_id = m.id), '[]'))
            order by m.numero)
          from modulo m where m.curso_id = c.id), '[]')
      )) from curso c where c.id in (select id from cursos)), '[]')
    ) as linhas`);
  const [linha] = rows;
  if (!linha) {
    throw new Error("O statement da busca não devolveu linha.");
  }
  const { cursos, pessoas, trilhas } = linha.linhas;
  const data = (ms: Ms) => new Date(Number(ms));
  return {
    cursos,
    pessoas: pessoas.map((p) => ({
      assistidas: p.assistidas.map((a) => ({
        assistidaEm: data(a.assistidaEm),
        aulaId: a.aulaId,
      })),
      certificados: p.certificados.map((c) => ({
        codigo: c.codigo,
        cursoId: c.cursoId,
        emitidoEm: data(c.emitidoEm),
      })),
      liberacoes: p.liberacoes.map((l) => ({
        cursoId: l.cursoId,
        liberadaEm: data(l.liberadaEm),
        revogadaEm: l.revogadaEm === null ? null : data(l.revogadaEm),
        trilhaId: l.trilhaId,
      })),
      posicoes: p.posicoes.map((x) => ({
        atualizadaEm: data(x.atualizadaEm),
        aulaId: x.aulaId,
        posicaoSeg: x.posicaoSeg,
      })),
      userId: p.userId,
    })),
    trilhas,
  };
}
