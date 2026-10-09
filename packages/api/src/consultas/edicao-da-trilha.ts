import type { Database } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  certificado,
  curso,
  liberacao,
  modulo,
  pontoLancamento,
  posicaoAula,
  trilha,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  type DocumentoDaTrilha,
  type EdicaoDaTrilha,
  type PessoasNoCurso,
  podeApagarTrilha,
  TRILHA_EM_USO,
  type UsoDaTrilha,
} from "../dominio/edicao-da-trilha";
import {
  type CursoDaLista,
  type PlanoDaTrilha,
  planejarTrilha,
  type RecusaDaTrilha,
  versaoDaTrilha,
} from "../dominio/plano-da-trilha";
import type { CursoId, TrilhaId, Versao } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { type Executor, liberacaoAtiva, type Transacao } from "./comum";
import { violacaoDe } from "./erros";
import { comTrava, travarCursos } from "./trava";

async function lerDocumento(
  exec: Executor,
  id: TrilhaId
): Promise<DocumentoDaTrilha | null> {
  const linha = await exec.query.trilha.findFirst({
    columns: { descricao: true, id: true, slug: true, titulo: true },
    where: { id },
    with: {
      cursos: { columns: { cursoId: true }, orderBy: { posicao: "asc" } },
    },
  });
  if (!linha) {
    return null;
  }
  const semVersao: DocumentoDaTrilha = {
    cursos: linha.cursos.map((c) => c.cursoId as CursoId),
    descricao: linha.descricao,
    id: linha.id as TrilhaId,
    slug: linha.slug,
    titulo: linha.titulo,
    versao: null,
  };
  return { ...semVersao, versao: versaoDaTrilha(semVersao) };
}

type Contagens = Omit<UsoDaTrilha, "comecaramSoPelaTrilha">;

async function contarUso(exec: Executor, id: TrilhaId): Promise<Contagens> {
  const {
    rows: [contagens],
  } = await exec.execute<Contagens>(sql`
    select
      (select count(distinct ${liberacao.userId})::int from ${liberacao}
        where ${liberacao.trilhaId} = ${id} and ${liberacaoAtiva(liberacao)}) as "alunosComATrilha",
      (select count(*)::int from ${pontoLancamento} where ${pontoLancamento.trilhaId} = ${id}) as conclusoes,
      (select count(*)::int from ${liberacao} where ${liberacao.trilhaId} = ${id}) as liberacoes`);
  return {
    alunosComATrilha: contagens?.alunosComATrilha ?? 0,
    conclusoes: contagens?.conclusoes ?? 0,
    liberacoes: contagens?.liberacoes ?? 0,
  };
}

/**
 * A lista vem do documento, não de outra leitura de trilha_curso: um salvar que
 * comita entre as duas leituras não desencontra os cursos. "Começou" é a regra
 * de estadoDoCurso no painel (aula assistida ou posição acima de 0 s), mais o
 * certificado, também no curso em produção, que o painel mostra como em_breve:
 * quem o começou também perde o acesso. O teste de integração confere esta conta
 * contra meusCursos.painel. "Só pela trilha" é não ter liberação ativa do
 * próprio curso.
 */
async function comecaramSoPelaTrilha(
  db: Database,
  { cursos, id }: Pick<DocumentoDaTrilha, "cursos" | "id">
): Promise<PessoasNoCurso[]> {
  if (cursos.length === 0) {
    return [];
  }
  const l = alias(liberacao, "l");
  const d = alias(liberacao, "d");
  const { rows } = await db.execute<{ cursoId: string; pessoas: number }>(sql`
    select tc.curso_id as "cursoId",
      (select count(distinct ${l.userId})::int from ${liberacao} as ${sql.identifier("l")}
        where ${l.trilhaId} = ${id} and ${liberacaoAtiva(l)}
          and not exists (
            select 1 from ${liberacao} as ${sql.identifier("d")}
            where ${d.userId} = ${l.userId} and ${d.cursoId} = tc.curso_id
              and ${liberacaoAtiva(d)})
          and (
            exists (
              select 1 from ${certificado}
              where ${certificado.userId} = ${l.userId}
                and ${certificado.cursoId} = tc.curso_id)
            or exists (
              select 1 from ${aula} join ${modulo} on ${modulo.id} = ${aula.moduloId}
              where ${modulo.cursoId} = tc.curso_id
                and (
                  exists (
                    select 1 from ${aulaAssistida}
                    where ${aulaAssistida.userId} = ${l.userId}
                      and ${aulaAssistida.aulaId} = ${aula.id})
                  or exists (
                    select 1 from ${posicaoAula}
                    where ${posicaoAula.userId} = ${l.userId}
                      and ${posicaoAula.aulaId} = ${aula.id}
                      and ${posicaoAula.posicaoSeg} > 0))))) as pessoas
    from unnest(${`{${cursos.join(",")}}`}::uuid[]) with ordinality as tc(curso_id, n)
    order by tc.n`);
  return rows.map((r) => ({
    cursoId: r.cursoId as CursoId,
    pessoas: r.pessoas,
  }));
}

export async function abrirTrilha(
  db: Database,
  id: TrilhaId
): Promise<EdicaoDaTrilha | null> {
  const documento = await lerDocumento(db, id);
  if (!documento) {
    return null;
  }
  const [contagens, comecaram] = await Promise.all([
    contarUso(db, id),
    comecaramSoPelaTrilha(db, documento),
  ]);
  return {
    documento,
    uso: { ...contagens, comecaramSoPelaTrilha: comecaram },
  };
}

async function cursosDaLista(
  exec: Executor,
  ids: readonly CursoId[]
): Promise<Map<CursoId, CursoDaLista>> {
  if (ids.length === 0) {
    return new Map();
  }
  const linhas = await exec
    .select({
      id: curso.id,
      titulo: curso.titulo,
      trilhaId: trilha.id,
      trilhaTitulo: trilha.titulo,
    })
    .from(curso)
    .leftJoin(trilhaCurso, eq(trilhaCurso.cursoId, curso.id))
    .leftJoin(trilha, eq(trilha.id, trilhaCurso.trilhaId))
    .where(inArray(curso.id, [...ids]));
  return new Map(
    linhas.map((l) => [
      l.id as CursoId,
      {
        id: l.id as CursoId,
        titulo: l.titulo,
        trilha:
          l.trilhaId && l.trilhaTitulo
            ? { id: l.trilhaId as TrilhaId, titulo: l.trilhaTitulo }
            : null,
      },
    ])
  );
}

function erroDaTrilha(r: RecusaDaTrilha): ErroParaAPessoa {
  switch (r.tipo) {
    case "versao_mudou":
      return new ErroParaAPessoa({
        code: "CONFLICT",
        message:
          "Outra pessoa salvou esta trilha depois que você abriu. Recarregue para ver a versão nova.",
        motivo: "versao_mudou",
      });
    case "sumiu":
      return new ErroParaAPessoa({
        code: "NOT_FOUND",
        message: "Esta trilha foi apagada enquanto você editava.",
      });
    case "curso_desconhecido":
      return new ErroParaAPessoa({
        code: "PRECONDITION_FAILED",
        message:
          "Um curso da lista foi apagado do catálogo. Tire-o da lista e salve de novo.",
      });
    case "curso_em_outra_trilha":
      return new ErroParaAPessoa({
        code: "CONFLICT",
        message: `O curso "${r.curso}" já está na trilha "${r.trilha}". Tire-o de lá antes de pôr nesta.`,
      });
    default: {
      const nenhuma: never = r;
      throw new Error(`Recusa sem mensagem: ${JSON.stringify(nenhuma)}`);
    }
  }
}

export interface TrilhaSalva {
  trilhaId: TrilhaId;
  versao: Versao;
}

/**
 * A trava trilha:<id> serializa dois salvamentos da mesma trilha, inclusive a
 * criação repetida. Depois dela, curso:<id> dos cursos de hoje e dos desejados:
 * duas trilhas com um curso em comum se serializam, e a segunda decide com a
 * lista que a primeira gravou. Não pega trava de aluno: a troca que comitou antes
 * continua valendo, porque o aluno trocou quando o curso não estava na trilha.
 */
export function salvarTrilha(
  db: Database,
  documento: DocumentoDaTrilha
): Promise<TrilhaSalva> {
  return comTrava(db, `trilha:${documento.id}`, async (tx) => {
    const atual = await lerDocumento(tx, documento.id);
    await travarCursos(tx, [...(atual?.cursos ?? []), ...documento.cursos]);
    const plano = planejarTrilha(
      atual,
      documento,
      await cursosDaLista(tx, documento.cursos)
    );
    if (plano.tipo === "recusa") {
      throw erroDaTrilha(plano.recusa);
    }
    if (plano.tipo === "gravar") {
      await gravarTrilha(tx, plano);
    }
    return { trilhaId: documento.id, versao: plano.versao };
  });
}

/**
 * Apagar e reinserir é seguro porque nada referencia trilha_curso, e o unique não
 * deferrable trilha_curso_posicao_unica nunca vê duas linhas na mesma posição: no
 * INSERT a trilha está vazia. Curso de outra trilha não chega aqui pelo app: as
 * travas curso:<id> de salvarTrilha serializam duas trilhas que disputam um
 * curso, e o planejador da segunda já recusa. trilha_curso_pkey é a rede para
 * quem escreve fora do app.
 */
async function gravarTrilha(
  tx: Transacao,
  plano: Extract<PlanoDaTrilha, { tipo: "gravar" }>
) {
  const { documento: d } = plano;
  const campos = { descricao: d.descricao, slug: d.slug, titulo: d.titulo };
  if (plano.criar) {
    await tx.insert(trilha).values({ ...campos, id: d.id });
  } else {
    await tx.update(trilha).set(campos).where(eq(trilha.id, d.id));
  }
  await tx.delete(trilhaCurso).where(eq(trilhaCurso.trilhaId, d.id));
  if (d.cursos.length > 0) {
    await tx.insert(trilhaCurso).values(
      d.cursos.map((cursoId, i) => ({
        cursoId,
        posicao: i + 1,
        trilhaId: d.id,
      }))
    );
  }
}

/**
 * trilha_curso cai em cascade. Id que não existe conta uso zero e o DELETE não
 * acha linha: { apagado: false }, sem erro.
 */
export async function apagarTrilha(
  db: Database,
  id: TrilhaId
): Promise<{ apagado: boolean }> {
  try {
    return await comTrava(db, `trilha:${id}`, async (tx) => {
      if (!podeApagarTrilha(await contarUso(tx, id))) {
        throw new ErroParaAPessoa({
          code: "PRECONDITION_FAILED",
          message: TRILHA_EM_USO,
        });
      }
      const apagadas = await tx
        .delete(trilha)
        .where(eq(trilha.id, id))
        .returning({ id: trilha.id });
      return { apagado: apagadas.length > 0 };
    });
  } catch (erro) {
    // Liberar trava o aluno, não a trilha: a liberação que entra depois da conta
    // de uso para no FK restrict.
    if (violacaoDe(erro)?.codigo === "23503") {
      // biome-ignore lint/style/useErrorCause: o ErroParaAPessoa leva a causa nas opções.
      throw new ErroParaAPessoa({
        cause: erro,
        code: "PRECONDITION_FAILED",
        message: TRILHA_EM_USO,
      });
    }
    throw erro;
  }
}
