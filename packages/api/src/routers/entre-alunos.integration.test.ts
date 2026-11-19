import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";

import { createDb } from "@cursos/db";
import {
  alternativa,
  aula,
  aulaAssistida,
  certificado,
  cotaVideo,
  curso,
  liberacao,
  modulo,
  perfilDaPessoa,
  pergunta,
  pontoLancamento,
  posicaoAula,
  questionarioResposta,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";

import {
  categoriaDeTeste,
  codigoDeTeste,
} from "../consultas/categoria-de-teste";
import { contextoDeTeste } from "../contexto-de-teste";
import { definido } from "../definido.test-utils";
import { diaISO, tentativaId, videoId } from "../dominio/marcas";
import type { AlternativaId, CursoId, PerguntaId } from "../dominio/tipos";
import { createCaller } from "./index";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ANA = `user_ataque${S}ana`;
const BRUNO = `user_ataque${S}bruno`;
const ALUNOS = [ANA, BRUNO];

const recusa = (p: Promise<unknown>) =>
  p.then(
    () => "passou",
    (e: unknown) => (e instanceof TRPCError ? e.code : String(e))
  );

interface PerguntaPlantada {
  certa: AlternativaId;
  errada: AlternativaId;
  id: PerguntaId;
}

describe.skipIf(URL_TESTE === null)("ataques entre alunos", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const cursos: CursoId[] = [];

  const como = (userId: string) =>
    createCaller(contextoDeTeste({ db, userId }));

  async function plantarCursoPublicadoComUmaAulaComVideoPorItem(
    perguntasPorAula: readonly number[]
  ) {
    const slug = `ataque-${S}-${cursos.length + 1}`;

    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        categoriaId: await categoriaDeTeste(db),
        codigo: codigoDeTeste(),
        slug,
        status: "publicado",
        titulo: `Curso ${slug}`,
      })
      .returning({ id: curso.id });

    if (!c) {
      throw new Error("curso não criado");
    }

    cursos.push(c.id);

    const [m] = await db
      .insert(modulo)
      .values({ cursoId: c.id, numero: 1, titulo: "Módulo" })
      .returning({ id: modulo.id });

    const aulas: { id: string; perguntas: PerguntaPlantada[] }[] = [];

    for (const [i, n] of perguntasPorAula.entries()) {
      // oxlint-disable-next-line no-await-in-loop -- as perguntas precisam do id da aula gravada.
      const [a] = await db
        .insert(aula)
        .values({
          duracaoSeg: 600,
          moduloId: definido(m?.id),
          posicao: i + 1,
          titulo: `Aula ${i + 1}`,
          videoId: videoId("aqz-KE-bpKQ"),
          videoProvedor: "youtube",
        })
        .returning({ id: aula.id });

      const perguntas: PerguntaPlantada[] = [];

      for (let p = 1; p <= n; p += 1) {
        // oxlint-disable no-await-in-loop -- as alternativas precisam do id da pergunta gravada.
        const [pg] = await db
          .insert(pergunta)
          .values({
            aulaId: definido(a?.id),
            enunciado: `Pergunta ${p}`,
            posicao: p,
          })
          .returning({ id: pergunta.id });

        const [errada, certa] = await db
          .insert(alternativa)
          .values(
            [1, 2].map((k) => ({
              certa: k === 2,
              perguntaId: definido(pg?.id),
              posicao: k,
              texto: `Alternativa ${k}`,
            }))
          )
          .returning({ id: alternativa.id });

        perguntas.push({
          certa: definido(certa?.id),
          errada: definido(errada?.id),
          id: definido(pg?.id),
        });
        // oxlint-enable no-await-in-loop
      }

      aulas.push({ id: definido(a?.id), perguntas });
    }

    return { aulas, id: c.id, slug };
  }

  const liberar = (userId: string, cursoId: CursoId) =>
    db.insert(liberacao).values({
      cursoId,
      liberadaPor: "user_admin",
      origem: "admin",
      userId,
    });

  const respostas = (ps: readonly PerguntaPlantada[], certas: boolean) =>
    ps.map((p) => ({
      alternativaId: certas ? p.certa : p.errada,
      perguntaId: p.id,
    }));

  const fatosDoEstudoEDosPontosEmOrdemEstavelDe = async (userId: string) => ({
    assistidas: await db
      .select()
      .from(aulaAssistida)
      .where(eq(aulaAssistida.userId, userId))
      .orderBy(asc(aulaAssistida.aulaId)),
    certificados: await db
      .select()
      .from(certificado)
      .where(eq(certificado.userId, userId)),
    cota: await db.select().from(cotaVideo).where(eq(cotaVideo.userId, userId)),
    pontos: await db
      .select()
      .from(pontoLancamento)
      .where(eq(pontoLancamento.userId, userId))
      .orderBy(asc(pontoLancamento.id)),
    posicoes: await db
      .select()
      .from(posicaoAula)
      .where(eq(posicaoAula.userId, userId))
      .orderBy(asc(posicaoAula.aulaId)),
    respostas: await db
      .select({
        alternativaId: questionarioResposta.alternativaId,
        certa: questionarioResposta.certa,
        perguntaId: questionarioResposta.perguntaId,
        tentativaId: questionarioResposta.tentativaId,
      })
      .from(questionarioResposta)
      .innerJoin(
        questionarioTentativa,
        eq(questionarioTentativa.id, questionarioResposta.tentativaId)
      )
      .where(eq(questionarioTentativa.userId, userId))
      .orderBy(asc(questionarioResposta.perguntaId)),
    tentativas: await db
      .select()
      .from(questionarioTentativa)
      .where(eq(questionarioTentativa.userId, userId))
      .orderBy(asc(questionarioTentativa.numero)),
  });

  let comum: Awaited<
    ReturnType<typeof plantarCursoPublicadoComUmaAulaComVideoPorItem>
  >;

  let soDoBruno: Awaited<
    ReturnType<typeof plantarCursoPublicadoComUmaAulaComVideoPorItem>
  >;

  const TENTATIVA_DO_BRUNO = tentativaId(randomUUID());

  beforeAll(async () => {
    comum = await plantarCursoPublicadoComUmaAulaComVideoPorItem([2, 0]);
    soDoBruno = await plantarCursoPublicadoComUmaAulaComVideoPorItem([1]);
    await liberar(ANA, comum.id);
    await liberar(BRUNO, comum.id);
    await liberar(BRUNO, soDoBruno.id);

    const bruno = como(BRUNO);
    const [a1] = comum.aulas;

    if (!a1) {
      throw new Error("aula não plantada");
    }

    await bruno.aula.registrar({
      aulaId: a1.id,
      posicaoSeg: 120,
      trechos: [{ fim: 120, inicio: 0 }],
    });
    await bruno.questionario.responder({
      aulaId: a1.id,
      respostas: respostas(a1.perguntas, true),
      tentativaId: TENTATIVA_DO_BRUNO,
    });
    await db.insert(pontoLancamento).values(
      Array.from({ length: 30 }, (_, i) => ({
        criadoEm: new Date(Date.UTC(2026, 0, 1 + i, 15)),
        diaMarco: diaISO(
          new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
        ),
        motivo: "sequencia_7_dias" as const,
        pontos: 10,
        userId: BRUNO,
      }))
    );
  });

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, ALUNOS));
    await db.delete(certificado).where(inArray(certificado.userId, ALUNOS));
    await db
      .delete(questionarioTentativa)
      .where(inArray(questionarioTentativa.userId, ALUNOS));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, ALUNOS));
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, ALUNOS));
    await db.delete(cotaVideo).where(inArray(cotaVideo.userId, ALUNOS));
    await db.delete(liberacao).where(inArray(liberacao.userId, ALUNOS));
    await db
      .delete(perfilDaPessoa)
      .where(inArray(perfilDaPessoa.userId, ALUNOS));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  describe("Ana troca ids para alcançar o estudo de Bruno", () => {
    test("abrir a aula que Bruno estudou mostra a posição e o questionário de Ana, não os dele", async () => {
      const [a1] = comum.aulas;
      const entrada = { aulaId: definido(a1?.id), slug: comum.slug };
      const doBruno = await como(BRUNO).aula.abrir(entrada);
      expect(doBruno?.estudo.posicaoSeg).toBe(120);
      expect(doBruno?.questionario?.ultima?.aprovada).toBe(true);

      const daAna = await como(ANA).aula.abrir(entrada);
      expect(daAna?.estudo.assistida).toBe(false);
      expect(daAna?.estudo.posicaoSeg).toBe(0);
      expect(daAna?.estudo.trechos).toHaveLength(0);
      expect(daAna?.questionario?.ultima).toBeNull();
      expect(daAna?.curso.progresso).toEqual(doBruno?.curso.progresso);
    });

    test("registrar na aula que Bruno estuda grava só o estudo e a cota de Ana", async () => {
      const antes = await fatosDoEstudoEDosPontosEmOrdemEstavelDe(BRUNO);
      const [a1] = comum.aulas;
      await como(ANA).aula.registrar({
        aulaId: definido(a1?.id),
        posicaoSeg: 60,
        trechos: [{ fim: 60, inicio: 0 }],
      });
      expect(await fatosDoEstudoEDosPontosEmOrdemEstavelDe(BRUNO)).toEqual(
        antes
      );
      const daAna = await fatosDoEstudoEDosPontosEmOrdemEstavelDe(ANA);
      expect(daAna.posicoes.map((p) => p.posicaoSeg)).toEqual([60]);
      expect(daAna.cota).toHaveLength(1);
    });

    test("responder com o tentativaId de Bruno é recusado, não devolve o resultado dele e não toca na tentativa", async () => {
      const [a1] = comum.aulas;
      const perguntas = a1?.perguntas ?? [];
      await como(ANA).questionario.responder({
        aulaId: definido(a1?.id),
        respostas: respostas(perguntas, false),
        tentativaId: randomUUID(),
      });
      const antes = await fatosDoEstudoEDosPontosEmOrdemEstavelDe(BRUNO);
      const anaAntes = await fatosDoEstudoEDosPontosEmOrdemEstavelDe(ANA);

      const codigo = await recusa(
        como(ANA).questionario.responder({
          aulaId: definido(a1?.id),
          respostas: respostas(perguntas, false),
          tentativaId: TENTATIVA_DO_BRUNO,
        })
      );

      expect(codigo).toBe("CONFLICT");
      expect(await fatosDoEstudoEDosPontosEmOrdemEstavelDe(BRUNO)).toEqual(
        antes
      );
      expect(await fatosDoEstudoEDosPontosEmOrdemEstavelDe(ANA)).toEqual(
        anaAntes
      );
    });

    test("procedimento sem entrada ignora o userId de Bruno posto no pedido: Ana vê o saldo dela", async () => {
      const ana = como(ANA);

      const comUserId = <T>(f: () => Promise<T>) =>
        (f as unknown as (entrada: unknown) => Promise<T>)({ userId: BRUNO });

      expect((await como(BRUNO).aluno.resumo()).saldo).toBe(310);
      const resumo = await comUserId(ana.aluno.resumo);
      const troca = await comUserId(ana.troca.painel);
      const painel = await comUserId(ana.meusCursos.painel);
      expect(resumo.saldo).toBe(0);
      expect(troca.saldo).toBe(0);
      expect(troca.extrato).toEqual([]);
      expect(painel.cursos.map((c) => c.slug)).toEqual([comum.slug]);
    });

    test("trocar não alcança o saldo de Bruno: sem saldo próprio, Ana é recusada e nada muda para ele", async () => {
      const antes = await fatosDoEstudoEDosPontosEmOrdemEstavelDe(BRUNO);
      await db
        .update(curso)
        .set({ precoTroca: 100 })
        .where(eq(curso.id, soDoBruno.id));

      const trocavel = await plantarCursoPublicadoComUmaAulaComVideoPorItem([
        0,
      ]);

      await db
        .update(curso)
        .set({ precoTroca: 100 })
        .where(eq(curso.id, trocavel.id));

      const codigo = await recusa(
        como(ANA).troca.trocar({ cursoId: trocavel.id, precoVisto: 100 })
      );

      expect(codigo).toBe("PRECONDITION_FAILED");
      expect(await fatosDoEstudoEDosPontosEmOrdemEstavelDe(BRUNO)).toEqual(
        antes
      );
      expect(
        (await fatosDoEstudoEDosPontosEmOrdemEstavelDe(ANA)).pontos
      ).toEqual([]);
      await db
        .update(curso)
        .set({ precoTroca: null })
        .where(inArray(curso.id, [soDoBruno.id, trocavel.id]));
    });
  });

  describe("Ana usa o curso que só Bruno tem, pedindo direto à API", () => {
    test("abrir, página do curso e página do certificado devolvem null, também com o slug de um curso dela", async () => {
      const ana = como(ANA);
      const [aulaDoBruno] = soDoBruno.aulas;
      const id = definido(aulaDoBruno?.id);
      expect(
        await Promise.all([
          ana.aula.abrir({ aulaId: id, slug: soDoBruno.slug }),
          ana.aula.abrir({ aulaId: id, slug: comum.slug }),
          ana.curso.pagina({ slug: soDoBruno.slug }),
          ana.certificado.pagina({ slug: soDoBruno.slug }),
        ])
      ).toEqual([null, null, null, null]);
    });

    test("registrar e responder no curso de Bruno dão NOT_FOUND; respostas dele na aula de Ana são incompletas; nada é gravado", async () => {
      const ana = como(ANA);
      const [aulaDoBruno] = soDoBruno.aulas;
      const [a1] = comum.aulas;
      const id = definido(aulaDoBruno?.id);
      const daBruno = respostas(aulaDoBruno?.perguntas ?? [], true);
      const antes = await fatosDoEstudoEDosPontosEmOrdemEstavelDe(ANA);

      expect(
        await Promise.all([
          recusa(
            ana.aula.registrar({
              aulaId: id,
              posicaoSeg: 60,
              trechos: [{ fim: 60, inicio: 0 }],
            })
          ),
          recusa(
            ana.questionario.responder({
              aulaId: id,
              respostas: daBruno,
              tentativaId: randomUUID(),
            })
          ),
          recusa(
            ana.questionario.responder({
              aulaId: definido(a1?.id),
              respostas: daBruno,
              tentativaId: randomUUID(),
            })
          ),
        ])
      ).toEqual(["NOT_FOUND", "NOT_FOUND", "BAD_REQUEST"]);
      expect(await fatosDoEstudoEDosPontosEmOrdemEstavelDe(ANA)).toEqual(antes);
    });
  });
});
