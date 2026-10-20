import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  certificado,
  curso,
  liberacao,
  modulo,
  pontoLancamento,
  posicaoAula,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { inArray } from "drizzle-orm";

import { alunoDeTeste, contextoDeTeste } from "../contexto-de-teste";
import type { Conquistas } from "../dominio/conquistas";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import { carregarConquistas } from "./conquistas";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const ALUNA = `user_teste${S}a`;
const NOVO = `user_teste${S}b`;
const ALUNOS = [ALUNA, NOVO];

const SEXTA_15H = new Date("2026-10-16T15:00:00-03:00");

const resumo = (c: Conquistas) => ({
  certificados: c.certificados.map((x) =>
    x.estado === "ganha"
      ? [x.curso.slug, x.dia, x.codigo, x.horas]
      : [x.curso.slug, x.categoria, x.feitas, x.total]
  ),
  marcos: Object.fromEntries(
    c.marcos.map((m): [string, object] => [
      m.tipo === "aulas" ? `aulas_${m.meta}` : m.tipo,
      m.medalha,
    ])
  ),
});

describe.skipIf(URL_TESTE === null)("consultas de Conquistas", () => {
  let statements = 0;
  const db = createDb(
    { DATABASE_URL: URL_TESTE ?? "" },
    {
      logger: {
        logQuery: () => {
          statements += 1;
        },
      },
    }
  );
  const cursos: string[] = [];
  const sufixo = hex();

  async function criarCurso(
    nome: string,
    aulas: number,
    o: { precoTroca?: number; status?: "publicado" | "em_producao" } = {}
  ) {
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: `Capa de ${nome}`,
        capaAltura: 604,
        capaLargura: 900,
        capaUrl: `/capas/${nome}.jpg`,
        categoriaId: await categoriaDeTeste(db),
        codigo: codigoDeTeste(),
        precoTroca: o.precoTroca ?? null,
        slug: `teste-${sufixo}-${nome}`,
        status: o.status ?? "publicado",
        titulo: `${nome} ${sufixo}`,
      })
      .returning({ id: curso.id, titulo: curso.titulo });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id);
    const [m] = await db
      .insert(modulo)
      .values({ cursoId: c.id, numero: 1, titulo: "Módulo" })
      .returning({ id: modulo.id });
    const criadas = await db
      .insert(aula)
      .values(
        Array.from({ length: aulas }, (_, i) => ({
          duracaoSeg: 600,
          moduloId: m?.id ?? "",
          posicao: i + 1,
          titulo: `${nome} aula ${i + 1}`,
        }))
      )
      .returning({ id: aula.id });
    return { aulas: criadas.map((a) => a.id), id: c.id, titulo: c.titulo };
  }

  const liberar = (userId: string, cursoId: string) =>
    db.insert(liberacao).values({
      cursoId,
      liberadaPor: "user_admin",
      origem: "admin",
      userId,
    });

  beforeAll(async () => {
    const auto = await criarCurso("auto", 2);
    const comercial = await criarCurso("comercial", 3);
    const gravacao = await criarCurso("gravacao", 2, { status: "em_producao" });
    const revogado = await criarCurso("revogado", 1);
    const bpf = await criarCurso("bpf", 1, { precoTroca: 200 });
    const fabrica = await criarCurso("fabrica", 4);
    await criarCurso("portfolio", 1, { precoTroca: 500 });

    await liberar(ALUNA, auto.id);
    await liberar(ALUNA, comercial.id);
    await liberar(ALUNA, gravacao.id);
    await db.insert(liberacao).values({
      cursoId: revogado.id,
      liberadaEm: new Date("2026-08-01T12:00:00Z"),
      liberadaPor: "user_admin",
      origem: "admin",
      revogadaEm: new Date("2026-09-30T12:00:00Z"),
      revogadaPor: "user_admin",
      userId: ALUNA,
    });
    const [troca] = await db
      .insert(liberacao)
      .values({
        cursoId: bpf.id,
        liberadaPor: ALUNA,
        origem: "troca",
        userId: ALUNA,
      })
      .returning({ id: liberacao.id });
    await db.insert(aulaAssistida).values(
      [
        [auto.aulas[1], "2026-08-18T20:00:00Z"],
        [auto.aulas[0], "2026-08-18T14:00:00Z"],
        [comercial.aulas[0], "2026-09-03T14:00:00Z"],
        [revogado.aulas[0], "2026-09-04T14:00:00Z"],
      ].map(([aulaId, iso]) => ({
        assistidaEm: new Date(iso ?? ""),
        aulaId: aulaId ?? "",
        userId: ALUNA,
      }))
    );
    await db.insert(certificado).values([
      {
        codigo: `PS-TESTE-${S}-1`,
        cursoId: auto.id,
        emitidoEm: new Date("2026-09-02T12:00:00Z"),
        segundosDeVideo: 3601,
        userId: ALUNA,
      },
      {
        codigo: `PS-TESTE-${S}-2`,
        cursoId: revogado.id,
        emitidoEm: new Date("2026-09-10T12:00:00Z"),
        segundosDeVideo: 0,
        userId: ALUNA,
      },
    ]);
    await db.insert(pontoLancamento).values([
      {
        criadoEm: new Date("2026-09-25T15:00:00Z"),
        diaMarco: "2026-09-25",
        motivo: "sequencia_7_dias",
        pontos: 30,
        userId: ALUNA,
      },
      {
        criadoEm: new Date("2026-10-09T15:00:00Z"),
        diaMarco: "2026-10-09",
        motivo: "sequencia_7_dias",
        pontos: 30,
        userId: ALUNA,
      },
      {
        criadoEm: new Date("2026-10-13T15:00:00Z"),
        liberacaoId: troca?.id,
        motivo: "troca",
        pontos: -200,
        userId: ALUNA,
      },
    ]);

    await liberar(NOVO, fabrica.id);
    await db.insert(posicaoAula).values({
      aulaId: fabrica.aulas[1] ?? "",
      posicaoSeg: 0,
      userId: NOVO,
    });
  });

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, ALUNOS));
    await db.delete(certificado).where(inArray(certificado.userId, ALUNOS));
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, ALUNOS));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, ALUNOS));
    await db.delete(liberacao).where(inArray(liberacao.userId, ALUNOS));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("a aluna: medalhas pelos fatos do banco, em 7 statements", async () => {
    statements = 0;
    const c = resumo(
      await carregarConquistas(db, alunoDeTeste(ALUNA), SEXTA_15H)
    );
    expect(statements).toBe(7);
    expect(c.marcos).toEqual({
      aulas_10: { estado: "por_ganhar", feitas: 4 },
      aulas_50: { estado: "por_ganhar", feitas: 4 },
      aulas_100: { estado: "por_ganhar", feitas: 4 },
      primeira_aula: {
        aula: "auto aula 1",
        curso: `auto ${sufixo}`,
        dia: "2026-08-18",
        estado: "ganha",
      },
      primeira_troca: {
        curso: `bpf ${sufixo}`,
        dia: "2026-10-13",
        estado: "ganha",
        pontos: 200,
      },
      primeiro_curso: {
        curso: `auto ${sufixo}`,
        dia: "2026-09-02",
        estado: "ganha",
      },
      sequencia: { dia: "2026-09-25", estado: "ganha", vezes: 2 },
    });
    expect(c.certificados).toEqual([
      [`teste-${sufixo}-auto`, "2026-09-02", `PS-TESTE-${S}-1`, 2],
      [`teste-${sufixo}-revogado`, "2026-09-10", `PS-TESTE-${S}-2`, 0],
      [`teste-${sufixo}-comercial`, "Categoria dos testes", 1, 3],
      [`teste-${sufixo}-bpf`, "Categoria dos testes", 0, 1],
    ]);
  });

  test("o aluno novo, pelo procedure: tudo por ganhar, com o próximo passo", async () => {
    const c = resumo(
      await createCaller(
        contextoDeTeste({ db, userId: NOVO })
      ).aluno.conquistas()
    );
    expect(c.marcos.primeira_aula).toEqual({
      estado: "por_ganhar",
      proxima: {
        aula: "fabrica aula 1",
        curso: `fabrica ${sufixo}`,
        tipo: "comecar",
      },
    });
    expect(c.marcos.primeiro_curso).toEqual({
      estado: "por_ganhar",
      maisPerto: { curso: `fabrica ${sufixo}`, feitas: 0, total: 4 },
    });
    expect(c.marcos.primeira_troca).toMatchObject({
      estado: "por_ganhar",
      pontosPorAula: 10,
    });
    expect(c.certificados).toEqual([
      [`teste-${sufixo}-fabrica`, "Categoria dos testes", 0, 4],
    ]);
  });

  test("sem login, conquistas lança UNAUTHORIZED", async () => {
    const erro = await createCaller(contextoDeTeste({ db, userId: null }))
      .aluno.conquistas()
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(TRPCError);
    expect((erro as TRPCError).code).toBe("UNAUTHORIZED");
  });
});
