// Visão do catálogo contra o Supabase local. Roda só com TEST_DATABASE_URL em host local.
// Cria trilha, cursos e alunos com sufixo aleatório e apaga tudo no afterAll.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  curso,
  liberacao,
  modulo,
  trilha,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type { CursoId, TrilhaId } from "../dominio/tipos";
import { createCaller } from "../routers/index";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ALUNOS = ["a", "b", "c"].map((l) => `user_teste${S}${l}`);

describe.skipIf(URL_TESTE === null)("visão do catálogo do admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const cursos: CursoId[] = [];
  const trilhas: TrilhaId[] = [];

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

  async function novaTrilha(titulo: string) {
    const [linha] = await db
      .insert(trilha)
      .values({
        descricao: "teste",
        slug: `teste-${S}-t${trilhas.length}`,
        titulo,
      })
      .returning({ id: trilha.id });
    if (!linha) {
      throw new Error("trilha não criada");
    }
    const id = linha.id as TrilhaId;
    trilhas.push(id);
    return id;
  }

  afterAll(async () => {
    await db.delete(liberacao).where(inArray(liberacao.userId, ALUNOS));
    await db.delete(trilha).where(inArray(trilha.id, trilhas));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("admin vê trilhas com contagens e cursos na ordem da trilha", async () => {
    const t = await novaTrilha(`Trilha ${S}`);
    const segundo = await novoCurso(`A segundo ${S}`);
    const primeiro = await novoCurso(`B primeiro ${S}`, {
      status: "publicado",
    });
    const solto = await novoCurso(`Solto ${S}`, {
      precoTroca: 300,
      status: "publicado",
    });
    await db.insert(trilhaCurso).values([
      { cursoId: primeiro, posicao: 1, trilhaId: t },
      { cursoId: segundo, posicao: 2, trilhaId: t },
    ]);
    const modulos = await db
      .insert(modulo)
      .values([
        { cursoId: primeiro, numero: 1, titulo: "M1" },
        { cursoId: primeiro, numero: 2, titulo: "M2" },
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
    const [a, b, c] = ALUNOS as [string, string, string];
    const agora = new Date();
    await db.insert(liberacao).values([
      { liberadaPor: "user_admin", origem: "admin", trilhaId: t, userId: a },
      { liberadaPor: "user_admin", origem: "admin", trilhaId: t, userId: b },
      // Revogada e liberada de novo: a pessoa conta uma vez.
      {
        liberadaEm: agora,
        liberadaPor: "user_admin",
        origem: "admin",
        revogadaEm: agora,
        revogadaPor: "user_admin",
        trilhaId: t,
        userId: b,
      },
      {
        liberadaEm: agora,
        liberadaPor: "user_admin",
        origem: "admin",
        revogadaEm: agora,
        revogadaPor: "user_admin",
        trilhaId: t,
        userId: c,
      },
    ]);

    const admin = createCaller(
      contextoDeTeste({ db, papel: "admin", userId: "user_dono" })
    );
    const visao = await admin.admin.catalogo.visao();

    expect(visao.trilhas.filter((x) => x.id === t)).toEqual([
      { alunos: 2, cursos: 2, id: t, titulo: `Trilha ${S}` },
    ]);
    expect(visao.cursos.filter((x) => cursos.includes(x.id))).toEqual([
      {
        aulas: 3,
        id: primeiro,
        precoTroca: null,
        status: "publicado",
        titulo: `B primeiro ${S}`,
        trilha: { id: t, posicao: 1, titulo: `Trilha ${S}` },
      },
      {
        aulas: 0,
        id: segundo,
        precoTroca: null,
        status: "em_producao",
        titulo: `A segundo ${S}`,
        trilha: { id: t, posicao: 2, titulo: `Trilha ${S}` },
      },
      {
        aulas: 0,
        id: solto,
        precoTroca: 300,
        status: "publicado",
        titulo: `Solto ${S}`,
        trilha: null,
      },
    ]);
  });

  test("trilhas e cursos de mesmo título desempatam por id", async () => {
    const titulo = `Mesma ${S}`;
    const [menor, maior] = [
      await novaTrilha(titulo),
      await novaTrilha(titulo),
    ].sort();
    if (!(menor && maior)) {
      throw new Error("trilhas não criadas");
    }
    // Na trilha de id maior os cursos vêm antes por título: sem o id no
    // desempate, as duas trilhas se intercalam.
    const z1 = await novoCurso(`Z1 ${S}`);
    const z2 = await novoCurso(`Z2 ${S}`);
    const a1 = await novoCurso(`A1 ${S}`);
    const a2 = await novoCurso(`A2 ${S}`);
    await db.insert(trilhaCurso).values([
      { cursoId: z1, posicao: 1, trilhaId: menor },
      { cursoId: z2, posicao: 2, trilhaId: menor },
      { cursoId: a1, posicao: 1, trilhaId: maior },
      { cursoId: a2, posicao: 2, trilhaId: maior },
    ]);
    const soltos = [
      await novoCurso(`Solto igual ${S}`),
      await novoCurso(`Solto igual ${S}`),
    ];

    const visao = await createCaller(
      contextoDeTeste({ db, papel: "admin", userId: "user_dono" })
    ).admin.catalogo.visao();

    const nossos = new Set([z1, z2, a1, a2, ...soltos]);
    expect(
      visao.trilhas.filter((t) => t.titulo === titulo).map((t) => t.id)
    ).toEqual([menor, maior]);
    expect(
      visao.cursos.filter((c) => nossos.has(c.id)).map((c) => c.id)
    ).toEqual([z1, z2, a1, a2, ...soltos.sort()]);
  });
});
