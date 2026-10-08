import type { Database } from "@cursos/db";
import { pontoLancamento } from "@cursos/db/schema/index";
import { TRPCError } from "@trpc/server";
import { DrizzleQueryError } from "drizzle-orm";

import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { CursoId } from "../dominio/tipos";
import {
  CODIGO_DA_RECUSA,
  type CursoDaTroca,
  decidirTroca,
  montarPainelDeTroca,
  type PainelDeTroca,
  paraCursoDaTroca,
  type RecusaDaTroca,
} from "../dominio/troca";
import {
  COLUNAS_DA_CAPA,
  type Executor,
  filtroLiberacaoAtiva,
  relacaoLiberacoesAtivas,
} from "./comum";
import { inserirLiberacao } from "./liberacao";
import { comSaldoTravado, linhasDoExtrato, linhasDoSaldo } from "./pontos";
import type { AlunoTravado } from "./trava";

const LIMITE_DO_EXTRATO = 10;

export async function linhasDosCursos(
  exec: Executor,
  userId: string,
  filtro: { cursoId: CursoId } | "vitrine"
): Promise<CursoDaTroca[]> {
  const ativas = filtroLiberacaoAtiva(userId);
  const linhas = await exec.query.curso.findMany({
    columns: {
      ...COLUNAS_DA_CAPA,
      id: true,
      precoTroca: true,
      slug: true,
      status: true,
      tema: true,
      titulo: true,
    },
    where:
      filtro === "vitrine"
        ? {
            OR: [
              { precoTroca: { isNotNull: true } },
              { liberacoes: { ...ativas, origem: "troca" } },
            ],
          }
        : { id: filtro.cursoId },
    with: {
      liberacoes: {
        columns: { origem: true },
        where: ativas,
        with: { trocaLancamento: { columns: { id: true, pontos: true } } },
      },
      modulos: {
        columns: {},
        with: { aulas: { columns: { duracaoSeg: true } } },
      },
      naTrilha: {
        columns: {},
        with: {
          trilha: {
            columns: {},
            with: { liberacoes: relacaoLiberacoesAtivas(userId) },
          },
        },
      },
    },
  });
  return linhas.map(paraCursoDaTroca);
}

export async function carregarPainelDeTroca(
  db: Database,
  userId: string,
  agora: Date
): Promise<PainelDeTroca> {
  const hoje = diaLocal(agora);
  const [cursos, pontos, extrato] = await Promise.all([
    linhasDosCursos(db, userId, "vitrine"),
    linhasDoSaldo(db, userId, segundaDaSemana(hoje)),
    linhasDoExtrato(db, userId, LIMITE_DO_EXTRATO),
  ]);
  return montarPainelDeTroca({ cursos, extrato, pontos }, hoje);
}

export interface ResultadoDaTroca {
  lancamentoId: string;
}

function erroDaRecusa(r: RecusaDaTroca): TRPCError {
  switch (r.tipo) {
    case "indisponivel":
      return new TRPCError({
        code: CODIGO_DA_RECUSA[r.tipo],
        message: "Este curso não está disponível para troca.",
      });
    case "ja_tem":
      return new TRPCError({
        code: CODIGO_DA_RECUSA[r.tipo],
        message: "Você já tem este curso. Ele está em Meus cursos.",
      });
    case "preco_mudou":
      return new TRPCError({
        code: CODIGO_DA_RECUSA[r.tipo],
        message: `O preço deste curso mudou para ${r.preco} pts. Confira e troque de novo.`,
      });
    case "saldo_curto":
      return new TRPCError({
        code: CODIGO_DA_RECUSA[r.tipo],
        message: `Faltam ${r.faltam} pts para trocar este curso.`,
      });
    default:
      return r satisfies never;
  }
}

const violou = (e: unknown, constraint: string): boolean => {
  const causa = e instanceof DrizzleQueryError ? e.cause : undefined;
  return (
    causa !== undefined &&
    "code" in causa &&
    causa.code === "23505" &&
    "constraint" in causa &&
    causa.constraint === constraint
  );
};

async function gravarTroca(
  aluno: AlunoTravado,
  cursoId: CursoId,
  preco: number,
  agora: Date
): Promise<{ lancamentoId: string }> {
  const liberacaoId = await inserirLiberacao(
    aluno,
    { alvo: { id: cursoId, tipo: "curso" }, origem: "troca" },
    agora
  ).catch((e: unknown) => {
    throw violou(e, "liberacao_curso_ativa_unica")
      ? erroDaRecusa({ tipo: "ja_tem" })
      : e;
  });
  const [lancamento] = await aluno.tx
    .insert(pontoLancamento)
    .values({
      criadoEm: agora,
      liberacaoId,
      motivo: "troca",
      pontos: -preco,
      userId: aluno.userId,
    })
    .returning({ id: pontoLancamento.id });
  if (!lancamento) {
    throw new Error("O insert do lançamento não devolveu a linha.");
  }
  return { lancamentoId: lancamento.id };
}

export function trocar(
  db: Database,
  userId: string,
  cursoId: CursoId,
  precoVisto: number,
  agora: Date
): Promise<ResultadoDaTroca> {
  return comSaldoTravado(db, userId, async (aluno, saldo) => {
    const [curso] = await linhasDosCursos(aluno.tx, aluno.userId, { cursoId });
    const d = decidirTroca(curso ?? null, saldo, precoVisto);
    switch (d.tipo) {
      case "recusa":
        throw erroDaRecusa(d.recusa);
      case "ja_trocado":
        return { lancamentoId: d.lancamentoId };
      case "debitar":
        return gravarTroca(aluno, cursoId, d.preco, agora);
      default:
        return d satisfies never;
    }
  });
}
