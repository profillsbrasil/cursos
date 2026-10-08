// Edição do curso inteiro contra o Supabase local, pelo caller do tRPC como admin.
// Roda só com TEST_DATABASE_URL em host local. Cada teste cria o próprio curso com
// sufixo aleatório, e o afterAll apaga tudo.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  curso,
  liberacao,
  modulo,
  posicaoAula,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import {
  type DocumentoDoCurso,
  type EdicaoDoCurso,
  formularioDoCurso,
} from "../dominio/edicao-do-curso";
import type { AulaId, CursoId, ModuloId } from "../dominio/tipos";
import type { Capas } from "../externos/capas";
import { createCaller } from "../routers/index";
import { violacaoDe } from "./erros";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ALUNO = `user_teste${S}edicao`;
const UUID = /^[0-9a-f-]{36}$/;

const CAPA = { altura: 720, largura: 1280, url: `/capas/teste-${S}.jpg` };
const capasDeTeste: Capas = {
  receber: () => Promise.resolve({ imagem: CAPA, tipo: "guardada" }),
};
const arquivoDaCapa = () => new Blob([new Uint8Array([1])]);

/** Erro sem tradução mostra a restrição violada no lugar do texto do Postgres. */
const resultado = (p: Promise<unknown>) =>
  p.then(
    () => ({ code: "ok", message: "" }),
    (e: unknown) => {
      if (!(e instanceof TRPCError)) {
        return { code: "não é TRPCError", message: String(e) };
      }
      const v = e.code === "INTERNAL_SERVER_ERROR" ? violacaoDe(e) : null;
      return {
        code: e.code,
        message: v ? `violou ${v.restricao} (${v.codigo})` : e.message,
      };
    }
  );

describe.skipIf(URL_TESTE === null)("edição do curso", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const admin = createCaller(
    contextoDeTeste({
      capas: capasDeTeste,
      db,
      papel: "admin",
      userId: "user_admin",
    })
  );
  const cursos: CursoId[] = [];

  afterAll(async () => {
    await db.delete(aulaAssistida).where(eq(aulaAssistida.userId, ALUNO));
    await db.delete(posicaoAula).where(eq(posicaoAula.userId, ALUNO));
    await db.delete(liberacao).where(eq(liberacao.userId, ALUNO));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  const novaAula = (titulo: string) => ({
    duracaoSeg: 120,
    id: randomUUID() as AulaId,
    titulo,
    video: null,
  });

  /** Curso salvo pelo admin com dois módulos (0: A1, A2, A3; 1: B1) e um nível. */
  async function cursoSalvo(): Promise<EdicaoDoCurso> {
    const id = randomUUID() as CursoId;
    cursos.push(id);
    const documento: DocumentoDoCurso = {
      capaAlt: "Capa de teste",
      codigo: null,
      destaque: null,
      id,
      modulos: [
        {
          aulas: [novaAula("A1"), novaAula("A2"), novaAula("A3")],
          id: randomUUID() as ModuloId,
          nivelOrdem: 1,
          numero: 0,
          titulo: "Módulo A",
        },
        {
          aulas: [novaAula("B1")],
          id: randomUUID() as ModuloId,
          nivelOrdem: null,
          numero: 1,
          titulo: "Módulo B",
        },
      ],
      niveis: [{ nome: "Básico", ordem: 1 }],
      precoTroca: null,
      slug: `teste-${S}-${cursos.length}`,
      status: "em_producao",
      tema: "teste",
      titulo: `Curso ${S} ${cursos.length}`,
      versao: null,
    };
    await admin.admin.catalogo.salvarCurso(
      formularioDoCurso(documento, arquivoDaCapa())
    );
    return abrir(id);
  }

  async function abrir(id: CursoId): Promise<EdicaoDoCurso> {
    const edicao = await admin.admin.catalogo.abrirCurso({ id });
    if (!edicao) {
      throw new Error("curso não abriu");
    }
    return edicao;
  }

  const salvar = (documento: DocumentoDoCurso) =>
    admin.admin.catalogo.salvarCurso(formularioDoCurso(documento, null));

  const modulos = (d: DocumentoDoCurso) => {
    const [a, b] = d.modulos;
    if (!(a && b)) {
      throw new Error("o curso de teste tem dois módulos");
    }
    return [a, b] as const;
  };

  function aulasNoBanco(moduloId: string) {
    return db
      .select({ id: aula.id, posicao: aula.posicao, titulo: aula.titulo })
      .from(aula)
      .where(eq(aula.moduloId, moduloId))
      .orderBy(asc(aula.posicao));
  }

  async function assistir(aulaId: AulaId) {
    await db.insert(aulaAssistida).values({ aulaId, userId: ALUNO });
    await db
      .insert(posicaoAula)
      .values({ aulaId, posicaoSeg: 42, userId: ALUNO });
  }

  test("criar curso sem capa é recusado; com capa grava url, largura e altura", async () => {
    const id = randomUUID() as CursoId;
    cursos.push(id);
    const documento: DocumentoDoCurso = {
      ...(await cursoSalvo()).documento,
      id,
      modulos: [],
      slug: `teste-${S}-sem-capa`,
      versao: null,
    };
    expect(
      await resultado(
        admin.admin.catalogo.salvarCurso(formularioDoCurso(documento, null))
      )
    ).toEqual({
      code: "PRECONDITION_FAILED",
      message: "Curso novo precisa de capa.",
    });

    await admin.admin.catalogo.salvarCurso(
      formularioDoCurso(documento, arquivoDaCapa())
    );
    const [linha] = await db
      .select({
        altura: curso.capaAltura,
        largura: curso.capaLargura,
        url: curso.capaUrl,
      })
      .from(curso)
      .where(eq(curso.id, id));
    expect(linha).toEqual(CAPA);
  });

  test("trocar a ordem das aulas do módulo passa pelo unique não deferrable", async () => {
    const { documento } = await cursoSalvo();
    const [a] = modulos(documento);
    const [a1, a2, a3] = a.aulas;
    a.aulas = [a3, a1, a2].filter((x) => x !== undefined);

    await salvar(documento);

    expect(
      (await aulasNoBanco(a.id)).map((x) => [x.titulo, x.posicao])
    ).toEqual([
      ["A3", 1],
      ["A1", 2],
      ["A2", 3],
    ]);
  });

  test("trocar os números de dois módulos passa por modulo_numero_unico", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    a.numero = 1;
    b.numero = 0;

    expect(await resultado(salvar(documento))).toEqual({
      code: "ok",
      message: "",
    });

    const linhas = await db
      .select({ id: modulo.id, numero: modulo.numero })
      .from(modulo)
      .where(eq(modulo.cursoId, documento.id))
      .orderBy(asc(modulo.numero));
    expect(linhas).toEqual([
      { id: b.id, numero: 0 },
      { id: a.id, numero: 1 },
    ]);
  });

  test("aula muda de módulo e mantém aula assistida e posição do aluno", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    const [a2] = a.aulas.splice(1, 1);
    if (!a2) {
      throw new Error("sem A2");
    }
    await assistir(a2.id);
    b.aulas.unshift(a2);

    await salvar(documento);

    expect(
      (await aulasNoBanco(b.id)).map((x) => [
        x.id === a2.id,
        x.titulo,
        x.posicao,
      ])
    ).toEqual([
      [true, "A2", 1],
      [false, "B1", 2],
    ]);
    expect((await aulasNoBanco(a.id)).map((x) => x.titulo)).toEqual([
      "A1",
      "A3",
    ]);
    const assistidas = await db
      .select({ aulaId: aulaAssistida.aulaId })
      .from(aulaAssistida)
      .where(eq(aulaAssistida.aulaId, a2.id));
    const posicoes = await db
      .select({ seg: posicaoAula.posicaoSeg })
      .from(posicaoAula)
      .where(eq(posicaoAula.aulaId, a2.id));
    expect([assistidas.length, posicoes]).toEqual([1, [{ seg: 42 }]]);
  });

  test("módulo esvaziado some, e as aulas dele ficam no outro", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    a.aulas.push(...b.aulas);
    documento.modulos = [a];

    await salvar(documento);

    const restantes = await db
      .select({ id: modulo.id })
      .from(modulo)
      .where(eq(modulo.cursoId, documento.id));
    expect(restantes).toEqual([{ id: a.id }]);
    expect((await aulasNoBanco(a.id)).map((x) => x.titulo)).toEqual([
      "A1",
      "A2",
      "A3",
      "B1",
    ]);
  });

  test("apagar aula assistida é recusado com o título da aula e nada muda", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    const [, , a3] = a.aulas;
    if (!a3) {
      throw new Error("sem A3");
    }
    await assistir(a3.id);
    const antes = await abrir(documento.id);
    a.aulas.pop();
    b.titulo = "Título que não pode entrar";

    expect(await resultado(salvar(documento))).toEqual({
      code: "PRECONDITION_FAILED",
      message:
        'A aula "A3" já foi assistida por 1 aluno e não se apaga. Troque o vídeo ou o título dela.',
    });
    expect(await abrir(documento.id)).toEqual(antes);
  });

  test("salvar com versão velha dá CONFLICT; salvar o mesmo conteúdo de novo é sucesso", async () => {
    const { documento } = await cursoSalvo();
    const primeiro = { ...documento, titulo: `${documento.titulo} editado` };
    const salvo = await salvar(primeiro);
    expect(await resultado(salvar(primeiro))).toEqual({
      code: "ok",
      message: "",
    });

    const velho = { ...documento, tema: "outro tema" };
    expect((await resultado(salvar(velho))).code).toBe("CONFLICT");
    expect((await abrir(documento.id)).documento.versao).toBe(salvo.versao);
  });

  test("slug repetido dá CONFLICT com mensagem", async () => {
    const um = await cursoSalvo();
    const { documento } = await cursoSalvo();
    expect(
      await resultado(salvar({ ...documento, slug: um.documento.slug }))
    ).toEqual({
      code: "CONFLICT",
      message: "Já existe um curso com este endereço.",
    });
  });

  test("curso com liberação não se apaga; curso sem uso se apaga", async () => {
    const usado = await cursoSalvo();
    await db.insert(liberacao).values({
      cursoId: usado.documento.id,
      liberadaPor: "user_admin",
      origem: "admin",
      userId: ALUNO,
    });
    expect(usado.podeApagar).toBe(true);
    expect((await abrir(usado.documento.id)).podeApagar).toBe(false);

    const recusa = await resultado(
      admin.admin.catalogo.apagarCurso({ id: usado.documento.id })
    );
    expect(recusa.code).toBe("PRECONDITION_FAILED");
    expect(recusa.message).toContain("Em produção");
    expect(
      await admin.admin.catalogo.abrirCurso({ id: usado.documento.id })
    ).not.toBeNull();

    const livre = await cursoSalvo();
    expect(
      await admin.admin.catalogo.apagarCurso({ id: livre.documento.id })
    ).toEqual({ apagado: true });
    expect(
      await admin.admin.catalogo.abrirCurso({ id: livre.documento.id })
    ).toBeNull();
  });

  test("abrir 'novo' devolve edição vazia com id; id fora do formato é null", async () => {
    const novo = await admin.admin.catalogo.abrirCurso({ id: "novo" });
    expect(novo?.documento.versao).toBeNull();
    expect(novo?.documento.id).toMatch(UUID);
    expect(
      await admin.admin.catalogo.abrirCurso({ id: "nao-e-uuid" })
    ).toBeNull();
  });
});
