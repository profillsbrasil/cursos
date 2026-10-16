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
  nivel,
  posicaoAula,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import { montarBusca, type SituacaoNoCurso } from "../dominio/acompanhamento";
import { diaLocal } from "../dominio/sequencia";
import type { DiaISO, EstadoCurso, Pessoa } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { linhasDaBusca } from "./acompanhamento";
import { categoriaDeTeste } from "./categoria-de-teste";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ESTUDA = `user_teste${S}estuda`;
const NUNCA = `user_teste${S}nunca`;
const REVOGADA = `user_teste${S}revogada`;
const NADA = `user_teste${S}nada`;
const DIRETO = `user_teste${S}direto`;
const ALUNOS = [ESTUDA, NUNCA, REVOGADA, NADA, DIRETO];
/** Fora da busca: só o curso e, com níveis. */
const ONDE = `user_teste${S}onde`;
const pessoas: Pessoa[] = ALUNOS.map((userId) => ({
  email: `${userId}@exemplo.com`,
  foto: null,
  nome: userId,
  userId,
}));

/** O estado do painel do aluno, na palavra do admin. */
const NA_PALAVRA_DO_ADMIN: Record<
  EstadoCurso["tipo"],
  SituacaoNoCurso["tipo"]
> = {
  concluido: "concluido",
  em_andamento: "estudando",
  em_breve: "em_producao",
  nao_iniciado: "nunca_abriu",
  questionarios: "faltam_questionarios",
};

describe.skipIf(URL_TESTE === null)("acompanhamento do admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const admin = createCaller(
    contextoDeTeste({ db, papel: "admin", pessoas, userId: "user_admin" })
  );
  const painelDe = (userId: string) =>
    createCaller(contextoDeTeste({ db, userId })).meusCursos.painel();
  const cursos: string[] = [];
  /** Aulas por curso, em ordem: a, b, c (em produção) e d. */
  const aulas: Record<"a" | "b" | "c" | "d", string[]> = {
    a: [],
    b: [],
    c: [],
    d: [],
  };

  beforeAll(async () => {
    const chaves = ["a", "b", "c", "d"] as const;
    const categoriaId = await categoriaDeTeste(db);
    const novos = await db
      .insert(curso)
      .values(
        chaves.map((chave) => ({
          capaAlt: "Capa de teste",
          capaAltura: 720,
          capaLargura: 1280,
          capaUrl: "/capas/teste.jpg",
          categoriaId,
          slug: `teste-${S}-${chave}`,
          status:
            chave === "c" ? ("em_producao" as const) : ("publicado" as const),
          titulo: `Curso ${S} ${chave}`,
        }))
      )
      .returning({ id: curso.id });
    cursos.push(...novos.map((novo) => novo.id));
    const modulos = await db
      .insert(modulo)
      .values(
        cursos.map((cursoId) => ({ cursoId, numero: 1, titulo: "Módulo" }))
      )
      .returning({ cursoId: modulo.cursoId, id: modulo.id });
    const criadas = await db
      .insert(aula)
      .values(
        modulos.flatMap((m) =>
          [1, 2].map((posicao) => ({
            duracaoSeg: 600,
            moduloId: m.id,
            posicao,
            titulo: `Aula ${posicao}`,
          }))
        )
      )
      .returning({
        id: aula.id,
        moduloId: aula.moduloId,
        posicao: aula.posicao,
      });
    for (const [i, chave] of chaves.entries()) {
      const m = modulos.find((x) => x.cursoId === cursos[i]);
      aulas[chave] = criadas
        .filter((x) => x.moduloId === m?.id)
        .sort((x, y) => x.posicao - y.posicao)
        .map((x) => x.id);
    }
    const [a = "", b = "", c = "", d = ""] = cursos;
    const libera = (userId: string, cursoId: string, revogada = false) => ({
      cursoId,
      liberadaEm: new Date("2026-10-01T15:00:00Z"),
      liberadaPor: "user_admin",
      origem: "admin" as const,
      userId,
      ...(revogada
        ? {
            revogadaEm: new Date("2026-10-02T15:00:00Z"),
            revogadaPor: "user_admin",
          }
        : {}),
    });
    await db
      .insert(liberacao)
      .values([
        ...[a, b, c, d].map((id) => libera(ESTUDA, id)),
        ...[a, b, c].map((id) => libera(NUNCA, id)),
        libera(REVOGADA, d, true),
        ...[a, b, c].map((id) => libera(DIRETO, id)),
      ]);
    // ESTUDA concluiu a, está no meio de d. DIRETO viu a primeira aula de b.
    await db.insert(aulaAssistida).values([
      ...aulas.a.map((aulaId) => ({
        assistidaEm: new Date("2026-10-05T15:00:00Z"),
        aulaId,
        userId: ESTUDA,
      })),
      {
        assistidaEm: new Date("2026-10-06T15:00:00Z"),
        aulaId: aulas.b[0] ?? "",
        userId: DIRETO,
      },
    ]);
    await db.insert(certificado).values({
      codigo: `TESTE-${S}`,
      cursoId: a,
      emitidoEm: new Date("2026-10-07T15:00:00Z"),
      segundosDeVideo: 1200,
      userId: ESTUDA,
    });
    // 01:00 UTC de 13/10 ainda é 12/10 em São Paulo.
    await db.insert(posicaoAula).values({
      atualizadaEm: new Date("2026-10-13T01:00:00Z"),
      aulaId: aulas.d[0] ?? "",
      posicaoSeg: 120,
      userId: ESTUDA,
    });

    // Curso e, com nível: módulo 0 com 2 aulas e módulo 1 com 1. ONDE viu a aula
    // 1 do módulo 0 e parou a aula 1 do módulo 1 depois: a aula 2 do módulo 0
    // ficou para trás.
    const [e] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        categoriaId,
        slug: `teste-${S}-e`,
        status: "publicado",
        titulo: `Curso ${S} e`,
      })
      .returning({ id: curso.id });
    const cursoE = e?.id ?? "";
    cursos.push(cursoE);
    await db
      .insert(nivel)
      .values({ cursoId: cursoE, nome: "Básico", ordem: 1 });
    const modulosE = await db
      .insert(modulo)
      .values(
        [0, 1].map((numero) => ({
          cursoId: cursoE,
          nivelOrdem: 1,
          numero,
          titulo: `Módulo ${numero}`,
        }))
      )
      .returning({ id: modulo.id, numero: modulo.numero });
    const doModulo = (numero: number) =>
      modulosE.find((m) => m.numero === numero)?.id ?? "";
    const aulasE = await db
      .insert(aula)
      .values(
        [
          { moduloId: doModulo(0), posicao: 1 },
          { moduloId: doModulo(0), posicao: 2 },
          { moduloId: doModulo(1), posicao: 1 },
        ].map((nova) => ({ ...nova, duracaoSeg: 600, titulo: "Aula" }))
      )
      .returning({
        id: aula.id,
        moduloId: aula.moduloId,
        posicao: aula.posicao,
      });
    const aulaE = (numero: number, posicao: number) =>
      aulasE.find(
        (x) => x.moduloId === doModulo(numero) && x.posicao === posicao
      )?.id ?? "";
    await db.insert(liberacao).values(libera(ONDE, cursoE));
    await db.insert(aulaAssistida).values({
      assistidaEm: new Date("2026-10-08T15:00:00Z"),
      aulaId: aulaE(0, 1),
      userId: ONDE,
    });
    await db.insert(posicaoAula).values({
      atualizadaEm: new Date("2026-10-09T15:00:00Z"),
      aulaId: aulaE(1, 1),
      posicaoSeg: 120,
      userId: ONDE,
    });
  });

  afterAll(async () => {
    const todos = [...ALUNOS, ONDE];
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, todos));
    await db.delete(certificado).where(inArray(certificado.userId, todos));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, todos));
    await db.delete(liberacao).where(inArray(liberacao.userId, todos));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("a situação de cada pessoa sai de um statement e bate com Meus cursos", async () => {
    const busca = montarBusca(
      { pessoas, total: pessoas.length },
      await linhasDaBusca(db, ALUNOS),
      "2026-10-14" as DiaISO
    );
    expect(busca.pessoas.map((p) => [p.userId, p.situacao])).toEqual([
      [
        ESTUDA,
        {
          numeros: { concluidos: 1, cursos: 3, emProducao: 1 },
          tipo: "estudando",
          ultimoEstudo: "2026-10-12" as DiaISO,
        },
      ],
      [
        NUNCA,
        {
          desde: "2026-10-01" as DiaISO,
          numeros: { concluidos: 0, cursos: 2, emProducao: 1 },
          tipo: "nunca_abriu",
        },
      ],
      [
        REVOGADA,
        {
          revogadas: 1,
          tipo: "sem_liberacao",
          ultimaRevogacao: "2026-10-02" as DiaISO,
        },
      ],
      [NADA, { revogadas: 0, tipo: "sem_liberacao", ultimaRevogacao: null }],
      [
        DIRETO,
        {
          numeros: { concluidos: 0, cursos: 2, emProducao: 1 },
          tipo: "estudando",
          ultimoEstudo: "2026-10-06" as DiaISO,
        },
      ],
    ]);
    // A mesma conta pelo painel do aluno: cursos fora de em_breve, e os concluídos.
    const paineis = await Promise.all(
      busca.pessoas.map((p) => painelDe(p.userId))
    );
    const pelaBusca = busca.pessoas.map((p) =>
      p.situacao.tipo === "sem_liberacao"
        ? { concluidos: 0, cursos: 0 }
        : {
            concluidos: p.situacao.numeros.concluidos,
            cursos: p.situacao.numeros.cursos,
          }
    );
    const pelosPaineis = paineis.map((painel) => {
      const contaveis = painel.cursos.filter(
        (c) => c.estado.tipo !== "em_breve"
      );
      return {
        concluidos: contaveis.filter((c) => c.estado.tipo === "concluido")
          .length,
        cursos: contaveis.length,
      };
    });
    expect(pelaBusca).toEqual(pelosPaineis);
  });

  test("sem userId, nenhum statement e nenhuma pessoa", async () => {
    expect(await linhasDaBusca(db, [])).toEqual({ cursos: [], pessoas: [] });
  });

  test("admin.alunos.buscar devolve a página do Clerk com a situação de cada pessoa", async () => {
    const busca = await admin.admin.alunos.buscar({ termo: `${S}nunca` });
    expect(busca.total).toBe(1);
    expect(busca.pessoas.map((p) => [p.userId, p.situacao.tipo])).toEqual([
      [NUNCA, "nunca_abriu"],
    ]);
    expect(busca.pessoas[0]?.ativas.map((l) => l.origem)).toEqual([
      "admin",
      "admin",
      "admin",
    ]);
    const revogada = await admin.admin.alunos.buscar({ termo: REVOGADA });
    expect(revogada.pessoas.map((p) => p.ativas)).toEqual([[]]);
    expect(busca.hoje).toBe(diaLocal(new Date()));
    const ninguem = await admin.admin.alunos.buscar({ termo: `${S}zzz` });
    expect(ninguem).toMatchObject({ pessoas: [], total: 0 });
  });

  test("o acompanhamento de cada liberação ativa bate com o estado e o progresso de Meus cursos", async () => {
    const comparacoes = await Promise.all(
      [ESTUDA, NUNCA, DIRETO, ONDE].map(async (userId) => {
        const [acesso, painel] = await Promise.all([
          admin.admin.alunos.acesso({ userId }),
          painelDe(userId),
        ]);
        // Os títulos levam o sufixo do teste, então identificam o curso.
        const doAdmin = (acesso?.liberacoes ?? []).map((l) => ({
          ...l.acompanhamento,
          titulo: l.curso.titulo,
        }));
        const vistos: unknown[] = doAdmin.map((c) => [
          c.titulo,
          c.situacao.tipo,
          c.progresso,
        ]);
        const esperados: unknown[] = doAdmin.map((c) => {
          const p = painel.cursos.find((x) => x.titulo === c.titulo);
          return [
            c.titulo,
            p ? NA_PALAVRA_DO_ADMIN[p.estado.tipo] : "fora do painel",
            p?.progresso ?? null,
          ];
        });
        return { esperados, userId, vistos };
      })
    );
    for (const { esperados, userId, vistos } of comparacoes) {
      expect([userId, vistos.length > 0]).toEqual([userId, true]);
      expect([userId, vistos]).toEqual([userId, esperados]);
    }
  });

  test("a revogada mostra o estudo que ficou", async () => {
    const estuda = await admin.admin.alunos.acesso({ userId: ESTUDA });
    const doD = estuda?.liberacoes.find(
      (l) => l.curso.titulo === `Curso ${S} d`
    );
    expect(doD?.acompanhamento.situacao).toEqual({
      onde: { aula: 1, modulo: 1 },
      tipo: "estudando",
      ultimoEstudo: "2026-10-12" as DiaISO,
    });
    const revogada = await admin.admin.alunos.acesso({ userId: REVOGADA });
    expect(
      revogada?.liberacoes.map((l) => [l.acao.tipo, l.acompanhamento])
    ).toEqual([
      [
        "revogada",
        {
          progresso: { feitas: 0, pct: 0, total: 2 },
          situacao: { tipo: "nunca_abriu" },
        },
      ],
    ]);
  });

  test("o onde do curso em andamento é a aula para onde o Continuar da pessoa leva", async () => {
    const comparacoes = await Promise.all(
      [ESTUDA, DIRETO, ONDE].map(async (userId) => {
        const [acesso, painel] = await Promise.all([
          admin.admin.alunos.acesso({ userId }),
          painelDe(userId),
        ]);
        const r = painel.retomada;
        if (r?.tipo !== "continuar") {
          return { esperado: "retomada continuar", userId, visto: r?.tipo };
        }
        const doAdmin = acesso?.liberacoes.find(
          (l) => l.curso.titulo === r.curso.titulo
        )?.acompanhamento;
        return {
          esperado: { aula: r.aula.numeroNoModulo, modulo: r.modulo.numero },
          userId,
          visto:
            doAdmin?.situacao.tipo === "estudando"
              ? doAdmin.situacao.onde
              : doAdmin?.situacao.tipo,
        };
      })
    );
    for (const { esperado, userId, visto } of comparacoes) {
      expect([userId, visto]).toEqual([userId, esperado]);
    }
  });
});
