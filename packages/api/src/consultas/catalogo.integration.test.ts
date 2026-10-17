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
import { categoriaDeTeste } from "./categoria-de-teste";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");

describe.skipIf(URL_TESTE === null)("visão do catálogo do admin", () => {
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
  const cursos: CursoId[] = [];

  async function novoCurso(
    titulo: string,
    extra: {
      codigo?: string;
      destaque?: string;
      precoTroca?: number;
      status?: "publicado";
    } = {}
  ) {
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        categoriaId: await categoriaDeTeste(db),
        slug: `teste-${S}-${cursos.length}`,
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

  const CAPA = {
    alt: "Capa de teste",
    altura: 720,
    largura: 1280,
    url: "/capas/teste.jpg",
  };

  test("admin vê os cursos por título, com a capa, os módulos, as aulas e os vídeos somados, em 1 statement", async () => {
    const comAulas = await novoCurso(`A com aulas ${S}`, {
      codigo: `POP-${S}`,
      status: "publicado",
    });
    const trocavel = await novoCurso(`B trocável ${S}`, {
      destaque: "Regra 5x4",
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
          duracaoSeg: 60 * (p + 1),
          moduloId: m.id,
          posicao: p + 1,
          titulo: "Aula",
        }))
      )
    );

    await db
      .insert(modulo)
      .values({ cursoId: trocavel, numero: 1, titulo: "M1" });

    const nossos = new Set([comAulas, trocavel, vazio]);
    statements = 0;
    const cursosNaVisao = (await visao()).cursos;
    expect(statements).toBe(1);
    expect(cursosNaVisao.filter((x) => nossos.has(x.id))).toEqual([
      {
        aulas: 3,
        capa: CAPA,
        categoria: "Categoria dos testes",
        codigo: `POP-${S}`,
        destaque: null,
        id: comAulas,
        modulos: 2,
        precoTroca: null,
        segundosDeVideo: 60 + 60 + 120,
        status: "publicado",
        titulo: `A com aulas ${S}`,
      },
      {
        aulas: 0,
        capa: CAPA,
        categoria: "Categoria dos testes",
        codigo: null,
        destaque: "Regra 5x4",
        id: trocavel,
        modulos: 1,
        precoTroca: 300,
        segundosDeVideo: 0,
        status: "publicado",
        titulo: `B trocável ${S}`,
      },
      {
        aulas: 0,
        capa: CAPA,
        categoria: "Categoria dos testes",
        codigo: null,
        destaque: null,
        id: vazio,
        modulos: 0,
        precoTroca: null,
        segundosDeVideo: 0,
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
