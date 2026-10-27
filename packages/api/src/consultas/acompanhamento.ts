import { sql } from "drizzle-orm";

import type { CursoDaBusca, LinhasDaBusca } from "../dominio/acompanhamento";
import type { OrigemDoAcesso } from "../dominio/tipos";
import type { Executor } from "./comum";

/** Literal de text[] do Postgres, com aspas e barras escapadas. */
const arrayDeTexto = (itens: readonly string[]) =>
  `{${itens.map((s) => `"${s.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;

/** Instante em milissegundos desde 1970, como o node-postgres corta o timestamptz. */
type Ms = number;

interface PessoaEmJson {
  assistidas: { assistidaEm: Ms; aulaId: string }[];
  certificados: { codigo: string; cursoId: string; emitidoEm: Ms }[];
  liberacoes: {
    cursoId: string;
    liberadaEm: Ms;
    origem: OrigemDoAcesso;
    revogadaEm: Ms | null;
  }[];
  posicoes: { atualizadaEm: Ms; aulaId: string; posicaoSeg: number }[];
  questionarios: {
    aprovada: boolean;
    aulaId: string;
    tentativas: number;
    ultimaEm: Ms;
    ultimosAcertos: number;
    ultimoTotal: number;
  }[];
  userId: string;
}

interface LinhasEmJson {
  cursos: CursoDaBusca[];
  pessoas: PessoaEmJson[];
}

const SEM_PESSOAS: LinhasDaBusca = { cursos: [], pessoas: [] };

/**
 * A busca de alunos: um statement para a página do Clerk (até 20 userIds), que
 * devolve um documento JSON só. Para cada pessoa, todas as liberações, as ativas
 * do perfil dela (origem `perfil`) e o histórico (as mesmas linhas dos statements 2, 3 e 4 do painel); uma vez só,
 * os cursos que alguma delas alcança por liberação ativa, com os ids das aulas
 * em ordem. O SQL só lê: estado, progresso e "abre" são decididos
 * em dominio/acompanhamento.ts pelas regras do painel.
 */
export async function linhasDaBusca(
  db: Executor,
  userIds: readonly string[]
): Promise<LinhasDaBusca> {
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
      select l.user_id, l.curso_id, l.liberada_em, l.origem::text as origem, l.revogada_em
        from liberacao l
       where l.user_id in (select user_id from p)
      union all
      select pp.user_id, lp.curso_id, lp.liberada_em, 'perfil', lp.revogada_em
        from perfil_da_pessoa pp
        join liberacao_do_perfil lp on lp.perfil = pp.perfil
       where pp.user_id in (select user_id from p)
         and lp.revogada_em is null
    ),
    cursos as (
      select distinct curso_id as id from lib where revogada_em is null
    )
    select json_build_object(
      'pessoas', coalesce((select json_agg(json_build_object(
        'userId', p.user_id,
        'liberacoes', coalesce((select json_agg(json_build_object(
            'cursoId', lib.curso_id,
            'liberadaEm', ${emMs("lib.liberada_em")},
            'origem', lib.origem,
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
          from certificado ce where ce.user_id = p.user_id), '[]'),
        'questionarios', coalesce((select json_agg(json_build_object(
            'aulaId', q.aula_id,
            'aprovada', q.aprovada,
            'tentativas', q.tentativas,
            'ultimaEm', q.ultima_em,
            'ultimosAcertos', q.ultimos_acertos,
            'ultimoTotal', q.ultimo_total))
          from (select t.aula_id,
                       bool_or(t.aprovada) as aprovada,
                       count(*)::int as tentativas,
                       ${emMs("max(t.enviada_em)")} as ultima_em,
                       (array_agg(t.acertos order by t.numero desc))[1] as ultimos_acertos,
                       (array_agg(t.total order by t.numero desc))[1] as ultimo_total
                  from questionario_tentativa t
                 where t.user_id = p.user_id
                 group by t.aula_id) q), '[]')
      )) from p), '[]'),
      'cursos', coalesce((select json_agg(json_build_object(
        'id', c.id,
        'status', c.status,
        'titulo', c.titulo,
        'modulos', coalesce((select json_agg(json_build_object(
            'numero', m.numero,
            'titulo', m.titulo,
            'aulas', coalesce((select json_agg(json_build_object(
                  'id', au.id,
                  'perguntas', (select count(*)::int from pergunta pe where pe.aula_id = au.id))
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
  const { cursos, pessoas } = linha.linhas;
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
        origem: l.origem,
        revogadaEm: l.revogadaEm === null ? null : data(l.revogadaEm),
      })),
      posicoes: p.posicoes.map((x) => ({
        atualizadaEm: data(x.atualizadaEm),
        aulaId: x.aulaId,
        posicaoSeg: x.posicaoSeg,
      })),
      questionarios: p.questionarios.map((q) => ({
        ...q,
        ultimaEm: data(q.ultimaEm),
      })),
      userId: p.userId,
    })),
  };
}
