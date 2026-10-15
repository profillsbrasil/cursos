// Visão do catálogo contra o Supabase local. Roda só com TEST_DATABASE_URL em host local.
// Cria cursos com sufixo aleatório e apaga tudo no afterAll.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import { aula, curso, modulo } from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type { CursoId } from "../dominio/tipos";
import { createCaller } from "../routers/index";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");

describe.skipIf(URL_TESTE === null)("visão do catálogo do admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const cursos: CursoId[] = [];

  async function novoCurso(
    titulo: string,
    extra: { precoTroca?: number; status?: "publicado" } = {}
  ) {
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        slug: `teste-${S}-${cursos.length}`,
        tema: "teste",
        titulo,
        ...extra,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    const id = c.id as CursoId;
    cursos.push(id);
    return id;
  }

  const visao = () =>
    createCaller(
      contextoDeTeste({ db, papel: "admin", userId: "user_dono" })
    ).admin.catalogo.visao();

  afterAll(async () => {
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("admin vê os cursos por título, com as aulas contadas", async () => {
    const comAulas = await novoCurso(`A com aulas ${S}`, {
      status: "publicado",
    });
    const trocavel = await novoCurso(`B trocável ${S}`, {
      precoTroca: 300,
      status: "publicado",
    });
    const vazio = await novoCurso(`C vazio ${S}`);
    const modulos = await db
      .insert(modulo)
      .values([
        { cursoId: comAulas, numero: 1, titulo: "M1" },
        { cursoId: comAulas, numero: 2, titulo: "M2" },
      ])
      .returning({ id: modulo.id });
    await db.insert(aula).values(
      modulos.flatMap((m, i) =>
        Array.from({ length: i + 1 }, (_, p) => ({
          duracaoSeg: 60,
          moduloId: m.id,
          posicao: p + 1,
          titulo: "Aula",
        }))
      )
    );

    const nossos = new Set([comAulas, trocavel, vazio]);
    expect((await visao()).cursos.filter((x) => nossos.has(x.id))).toEqual([
      {
        aulas: 3,
        id: comAulas,
        precoTroca: null,
        status: "publicado",
        titulo: `A com aulas ${S}`,
      },
      {
        aulas: 0,
        id: trocavel,
        precoTroca: 300,
        status: "publicado",
        titulo: `B trocável ${S}`,
      },
      {
        aulas: 0,
        id: vazio,
        precoTroca: null,
        status: "em_producao",
        titulo: `C vazio ${S}`,
      },
    ]);
  });

  test("cursos de mesmo título desempatam por id", async () => {
    const iguais = [
      await novoCurso(`Igual ${S}`),
      await novoCurso(`Igual ${S}`),
    ];
    const nossos = new Set(iguais);
    expect(
      (await visao()).cursos.filter((c) => nossos.has(c.id)).map((c) => c.id)
    ).toEqual(iguais.sort());
  });
});
