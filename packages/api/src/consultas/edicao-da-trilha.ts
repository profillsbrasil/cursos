// Único escritor de trilha e trilha_curso no app (o seed só planta trilhas novas).

import type { Database } from "@cursos/db";
import {
  curso,
  liberacao,
  pontoLancamento,
  trilha,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { eq, inArray, sql } from "drizzle-orm";

import {
  type DocumentoDaTrilha,
  type EdicaoDaTrilha,
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
import type { Executor, Transacao } from "./comum";
import { violacaoDe } from "./erros";
import { comTrava } from "./trava";

/** O documento como está no banco, com a versão. null: o id não existe. */
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

/** As contagens de uso, num statement. */
async function contarUso(exec: Executor, id: TrilhaId): Promise<UsoDaTrilha> {
  const {
    rows: [contagens],
  } = await exec.execute<{ [K in keyof UsoDaTrilha]: number }>(sql`
    select
      (select count(distinct ${liberacao.userId})::int from ${liberacao}
        where ${liberacao.trilhaId} = ${id} and ${liberacao.revogadaEm} is null) as "alunosComATrilha",
      (select count(*)::int from ${pontoLancamento} where ${pontoLancamento.trilhaId} = ${id}) as conclusoes,
      (select count(*)::int from ${liberacao} where ${liberacao.trilhaId} = ${id}) as liberacoes`);
  return {
    alunosComATrilha: contagens?.alunosComATrilha ?? 0,
    conclusoes: contagens?.conclusoes ?? 0,
    liberacoes: contagens?.liberacoes ?? 0,
  };
}

/**
 * A trilha como o editor abre: documento (com versão) e uso. null quando o id não
 * existe. Statements em série, porque dentro da transação eles dividem um client.
 */
export async function abrirTrilha(
  exec: Executor,
  id: TrilhaId
): Promise<EdicaoDaTrilha | null> {
  const documento = await lerDocumento(exec, id);
  if (!documento) {
    return null;
  }
  const uso = await contarUso(exec, id);
  return { documento, podeApagar: podeApagarTrilha(uso), uso };
}

/** Os cursos da lista que existem, cada um com a trilha em que está hoje. */
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
 * admin.catalogo.salvarTrilha. A trava trilha:<id> serializa dois salvamentos da
 * mesma trilha, inclusive a criação repetida. Não pega trava de aluno: a troca
 * que comitou antes continua valendo, porque o aluno trocou quando o curso não
 * estava na trilha.
 */
export function salvarTrilha(
  db: Database,
  documento: DocumentoDaTrilha
): Promise<TrilhaSalva> {
  return comTrava(db, `trilha:${documento.id}`, async (tx) => {
    const atual = await lerDocumento(tx, documento.id);
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
 * Estado final em três statements:
 *
 *   1. trilha: INSERT ou UPDATE de slug, título e descrição.
 *   2. DELETE de todo trilha_curso da trilha.
 *   3. INSERT de trilha_curso com posição = índice + 1.
 *
 * Apagar e reinserir é seguro porque nada referencia trilha_curso, e o unique não
 * deferrable trilha_curso_posicao_unica nunca vê duas linhas na mesma posição: no
 * passo 3 a trilha está vazia. Curso de outra trilha bate em trilha_curso_pkey; o
 * planejador já recusou antes, e o adminProcedure traduz a corrida.
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
 * admin.catalogo.apagarTrilha. trilha_curso cai em cascade. Id que não existe
 * conta uso zero e o DELETE não acha linha: { apagado: false }, sem erro.
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
