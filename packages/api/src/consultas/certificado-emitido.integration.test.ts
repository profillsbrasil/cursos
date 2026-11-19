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
  perfilDaPessoa,
  pergunta,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import { definido } from "../definido.test-utils";
import { gerarCodigo } from "../dominio/certificado";
import { novaTentativaId } from "../dominio/marcas";
import type { CursoId, ModuloId, Pessoa } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ANA = `user_teste${S}a`;
const BRUNO = `user_teste${S}b`;
const CAIO = `user_teste${S}c`;
const SO_EMAIL = `user_teste${S}d`;
const SUMIU = `user_teste${S}e`;
const ALUNOS = [ANA, BRUNO, CAIO, SO_EMAIL, SUMIU];

const PESSOAS: Pessoa[] = [
  {
    email: "ana@exemplo.com",
    foto: null,
    nome: "Ana Souza",
    nomeProprio: "Ana Souza",
    userId: ANA,
  },
  {
    email: "bruno@exemplo.com",
    foto: null,
    nome: "Bruno Lima",
    nomeProprio: "Bruno Lima",
    userId: BRUNO,
  },
  {
    email: "caio@exemplo.com",
    foto: null,
    nome: "Caio Reis",
    nomeProprio: "Caio Reis",
    userId: CAIO,
  },
  {
    email: "so@exemplo.com",
    foto: null,
    nome: "so@exemplo.com",
    nomeProprio: null,
    userId: SO_EMAIL,
  },
];

const CODIGO_DA_ANA = gerarCodigo();
const CODIGO_SO_EMAIL = gerarCodigo();
const CODIGO_DE_QUEM_SUMIU = gerarCodigo();
const EMITIDO_EM = new Date("2026-10-14T15:00:00Z");
const SLUG = `teste-${S}-fabrica`;

describe.skipIf(URL_TESTE === null)("certificado.pagina e conferir", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  let cursoId: CursoId;
  let moduloId: ModuloId;

  const como = (userId: string | null) =>
    createCaller(contextoDeTeste({ db, pessoas: PESSOAS, userId }));

  beforeAll(async () => {
    const categoriaId = await categoriaDeTeste(db);

    const [novo] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 604,
        capaLargura: 900,
        capaUrl: "/capas/teste.jpg",
        categoriaId,
        codigo: codigoDeTeste(),
        slug: SLUG,
        status: "publicado",
        titulo: "Fábrica e montagem",
      })
      .returning({ id: curso.id });

    cursoId = definido(novo?.id);

    const [mod] = await db
      .insert(modulo)
      .values({ cursoId, numero: 1, titulo: "Segurança do posto" })
      .returning({ id: modulo.id });

    moduloId = definido(mod?.id);

    const aulas = await db
      .insert(aula)
      .values(
        Array.from({ length: 7 }, (_, i) => ({
          duracaoSeg: 634,
          moduloId,
          posicao: i + 1,
          titulo: `Aula ${i + 1}`,
        }))
      )
      .returning({ id: aula.id });

    await db.insert(liberacao).values(
      [ANA, BRUNO].map((userId) => ({
        cursoId,
        liberadaPor: "user_admin",
        origem: "admin" as const,
        userId,
      }))
    );
    await db
      .insert(aulaAssistida)
      .values(aulas.slice(0, 3).map((a) => ({ aulaId: a.id, userId: BRUNO })));
    await db.insert(pergunta).values(
      aulas.slice(0, 3).map((a) => ({
        aulaId: a.id,
        enunciado: "Qual é o EPI do posto?",
        posicao: 1,
      }))
    );
    await db.insert(questionarioTentativa).values(
      [true, false].map((aprovada, i) => ({
        acertos: aprovada ? 1 : 0,
        aprovada,
        aulaId: definido(aulas[i]?.id),
        id: novaTentativaId(),
        numero: 1,
        total: 1,
        userId: BRUNO,
      }))
    );
    await db.insert(certificado).values([
      {
        codigo: CODIGO_DA_ANA,
        cursoId,
        emitidoEm: EMITIDO_EM,
        segundosDeVideo: 7 * 634,
        userId: ANA,
      },
      {
        codigo: CODIGO_SO_EMAIL,
        cursoId,
        segundosDeVideo: 7 * 634,
        userId: SO_EMAIL,
      },
      {
        codigo: CODIGO_DE_QUEM_SUMIU,
        cursoId,
        segundosDeVideo: 7 * 634,
        userId: SUMIU,
      },
    ]);
  });

  afterAll(async () => {
    await db
      .delete(questionarioTentativa)
      .where(inArray(questionarioTentativa.userId, ALUNOS));
    await db.delete(certificado).where(inArray(certificado.userId, ALUNOS));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, ALUNOS));
    await db.delete(liberacao).where(inArray(liberacao.userId, ALUNOS));
    await db.delete(curso).where(eq(curso.id, cursoId));
    await db
      .delete(perfilDaPessoa)
      .where(inArray(perfilDaPessoa.userId, ALUNOS));
    await db.$client.end();
  });

  const DA_ANA = {
    codigo: CODIGO_DA_ANA,
    emitidoEm: EMITIDO_EM.toISOString(),
    horas: 2,
    nome: "Ana Souza",
    tituloDoCurso: "Fábrica e montagem",
  };

  test("a conferência acha o certificado pelo código, sem login", async () => {
    expect(
      await como(null).certificado.conferir({ codigo: CODIGO_DA_ANA })
    ).toEqual(DA_ANA);
  });

  test("a conferência lê o código em minúscula e sem hífen", async () => {
    const digitado = CODIGO_DA_ANA.replace("-", "").toLowerCase();
    expect(await como(null).certificado.conferir({ codigo: digitado })).toEqual(
      DA_ANA
    );
  });

  test("código que não existe, ou fora do formato, não acha nada", async () => {
    const anonimo = como(null).certificado;
    let inexistente = gerarCodigo();

    while (
      [CODIGO_DA_ANA, CODIGO_SO_EMAIL, CODIGO_DE_QUEM_SUMIU].includes(
        inexistente
      )
    ) {
      inexistente = gerarCodigo();
    }

    expect(await anonimo.conferir({ codigo: inexistente })).toBeNull();
    expect(await anonimo.conferir({ codigo: "PS-M0-2026-A1B2C3" })).toBeNull();
  });

  test("quem só tem e-mail, ou sumiu do Clerk, tem o certificado sem nome", async () => {
    const anonimo = como(null).certificado;
    expect(
      (await anonimo.conferir({ codigo: CODIGO_SO_EMAIL }))?.nome
    ).toBeNull();

    const deQuemSumiu = await anonimo.conferir({
      codigo: CODIGO_DE_QUEM_SUMIU,
    });

    expect(deQuemSumiu?.codigo).toBe(CODIGO_DE_QUEM_SUMIU);
    expect(deQuemSumiu?.nome).toBeNull();
  });

  test("a página do aluno com certificado mostra o dele", async () => {
    expect(await como(ANA).certificado.pagina({ slug: SLUG })).toEqual({
      categoria: "Categoria dos testes",
      certificado: DA_ANA,
      slug: SLUG,
      tipo: "emitido",
    });
  });

  test("no mesmo curso, quem não concluiu vê o que falta, não o certificado da Ana", async () => {
    expect(await como(BRUNO).certificado.pagina({ slug: SLUG })).toEqual({
      aulas: { feitas: 3, total: 7 },
      curso: { slug: SLUG, titulo: "Fábrica e montagem" },
      questionarios: { aprovados: 1, total: 3 },
      tipo: "falta",
    });
  });

  test("quem não tem o curso liberado não abre a página", async () => {
    expect(await como(CAIO).certificado.pagina({ slug: SLUG })).toBeNull();
  });

  test("a liberação revogada não tira o certificado de quem concluiu", async () => {
    await db
      .update(liberacao)
      .set({ revogadaEm: new Date(), revogadaPor: "user_admin" })
      .where(and(eq(liberacao.userId, ANA), eq(liberacao.cursoId, cursoId)));
    expect((await como(ANA).certificado.pagina({ slug: SLUG }))?.tipo).toBe(
      "emitido"
    );
  });

  test("a carga horária fica a da emissão quando o curso ganha aula depois", async () => {
    await db
      .insert(aula)
      .values({ duracaoSeg: 3600, moduloId, posicao: 8, titulo: "Aula nova" });
    const anonimo = como(null).certificado;
    expect((await anonimo.conferir({ codigo: CODIGO_DA_ANA }))?.horas).toBe(2);
    const pagina = await como(ANA).certificado.pagina({ slug: SLUG });
    expect(pagina?.tipo === "emitido" && pagina.certificado.horas).toBe(2);
  });

  test("sem login, a página do aluno lança UNAUTHORIZED", async () => {
    const erro = await como(null)
      .certificado.pagina({ slug: SLUG })
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(TRPCError);

    if (!(erro instanceof TRPCError)) {
      throw new TypeError("A chamada sem login devia lançar um TRPCError.");
    }

    expect(erro.code).toBe("UNAUTHORIZED");
  });
});
