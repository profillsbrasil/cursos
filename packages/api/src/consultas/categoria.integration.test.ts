// admin.categorias contra o Postgres local, pelo caller como admin. Roda só com
// TEST_DATABASE_URL em host local. Cada nome leva o sufixo da execução, e o
// afterAll apaga o que o teste criou.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createDb } from "@cursos/db";
import { categoria, curso } from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type { CategoriaId, CursoId } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { codigoDeTeste } from "./categoria-de-teste";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");

const resultado = (p: Promise<unknown>) =>
  p.then(
    (r) => ({ code: "ok", r }),
    (e: unknown) =>
      e instanceof TRPCError
        ? { code: e.code, message: e.message }
        : { code: "não é TRPCError", message: String(e) }
  );

describe.skipIf(URL_TESTE === null)("categorias do admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const admin = createCaller(
    contextoDeTeste({ db, papel: "admin", userId: "user_admin" })
  ).admin.categorias;
  const categorias: CategoriaId[] = [];
  const cursos: CursoId[] = [];

  afterAll(async () => {
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.delete(categoria).where(inArray(categoria.id, categorias));
    await db.$client.end();
  });

  const novoId = () => {
    const id = randomUUID() as CategoriaId;
    categorias.push(id);
    return id;
  };

  async function cursoNa(
    categoriaId: CategoriaId,
    n: number,
    titulo = `Curso ${S} ${n}`
  ) {
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        categoriaId,
        codigo: codigoDeTeste(),
        slug: `categoria-${S}-${n}`,
        titulo,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id as CursoId);
  }

  const minhas = async () =>
    (await admin.lista()).filter((c) => categorias.includes(c.id));

  test("salvar cria pelo id, reenviar não duplica, e com o mesmo id renomeia", async () => {
    const id = novoId();
    expect(await admin.salvar({ id, nome: `  Envase ${S} ` })).toEqual({
      id,
      novo: true,
    });
    expect(await admin.salvar({ id, nome: `Envase ${S}` })).toEqual({
      id,
      novo: false,
    });
    await admin.salvar({ id, nome: `Processo de envase ${S}` });
    expect(await minhas()).toEqual([
      { cursos: [], id, nome: `Processo de envase ${S}` },
    ]);
  });

  test("nome repetido é recusado com frase", async () => {
    await admin.salvar({ id: novoId(), nome: `Vendas ${S}` });
    expect(
      await resultado(admin.salvar({ id: novoId(), nome: `Vendas ${S}` }))
    ).toEqual({
      code: "CONFLICT",
      message: "Já existe uma categoria com este nome.",
    });
  });

  test("lista por nome com os títulos dos cursos, os dois em ordem pt-BR", async () => {
    const a = novoId();
    const b = novoId();
    await admin.salvar({ id: b, nome: `Ética lista ${S}` });
    await admin.salvar({ id: a, nome: `A lista ${S}` });
    await cursoNa(b, 1, `Zinco ${S}`);
    await cursoNa(b, 2, `Ácido ${S}`);
    const lista = (await admin.lista()).filter((c) => [a, b].includes(c.id));
    expect(lista).toEqual([
      { cursos: [], id: a, nome: `A lista ${S}` },
      { cursos: [`Ácido ${S}`, `Zinco ${S}`], id: b, nome: `Ética lista ${S}` },
    ]);
  });

  test("apagar recusa a categoria em uso dizendo em quantos cursos ela está", async () => {
    const id = novoId();
    await admin.salvar({ id, nome: `Em uso ${S}` });
    await cursoNa(id, 3);
    expect(await resultado(admin.apagar({ id }))).toEqual({
      code: "PRECONDITION_FAILED",
      message:
        "Esta categoria está em 1 curso. Troque a categoria dele antes de apagar.",
    });
    await cursoNa(id, 4);
    expect(await resultado(admin.apagar({ id }))).toEqual({
      code: "PRECONDITION_FAILED",
      message:
        "Esta categoria está em 2 cursos. Troque a categoria deles antes de apagar.",
    });
  });

  test("apagar a livre apaga; apagar de novo devolve apagado: false", async () => {
    const id = novoId();
    await admin.salvar({ id, nome: `Livre ${S}` });
    expect(await admin.apagar({ id })).toEqual({ apagado: true });
    expect(await admin.apagar({ id })).toEqual({ apagado: false });
    expect((await minhas()).map((c) => c.id)).not.toContain(id);
  });
});
