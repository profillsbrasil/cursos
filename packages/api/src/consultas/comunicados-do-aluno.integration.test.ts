import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import { comunicado, curso, liberacao } from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type { ComunicadosDoAluno } from "../dominio/comunicado";
import { createCaller } from "../routers/index";
import { categoriaDeTeste } from "./categoria-de-teste";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ALUNO = `user_alunocomlista${S}`;
const SEM_NADA = `user_semcomunicado${S}`;
const AUTORA = `user_autora${S}`;

describe.skipIf(URL_TESTE === null)("os comunicados do aluno", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const cursos: string[] = [];
  const ids = {
    deCursoLiberado: crypto.randomUUID(),
    deCursoNaoLiberado: crypto.randomUUID(),
    deCursoRevogado: crypto.randomUUID(),
    geralNovo: crypto.randomUUID(),
    geralVelho: crypto.randomUUID(),
  };
  const nossos = new Set<string>(Object.values(ids));

  async function novoCurso(nome: string) {
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: `Capa de ${nome}`,
        capaAltura: 604,
        capaLargura: 900,
        capaUrl: "/capas/teste.jpg",
        categoriaId: await categoriaDeTeste(db),
        slug: `com-aluno-${S}-${nome}`,
        titulo: `${nome} ${S}`,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id);
    return c.id;
  }

  const lista = (userId: string) =>
    createCaller(
      contextoDeTeste({
        db,
        pessoas: [
          { email: null, foto: null, nome: "Marina Duarte", userId: AUTORA },
        ],
        userId,
      })
    ).aluno.comunicados();

  const osDesteTesteNaOrdemDaTela = (r: ComunicadosDoAluno) =>
    (r.tipo === "vazio"
      ? []
      : [r.destaque, ...r.anteriores.flatMap((m) => m.comunicados)]
    ).filter((c) => nossos.has(c.id));

  beforeAll(async () => {
    const liberado = await novoCurso("liberado");
    const naoLiberado = await novoCurso("nao-liberado");
    const revogado = await novoCurso("revogado");
    await db.insert(liberacao).values([
      {
        cursoId: liberado,
        liberadaPor: "user_admin",
        origem: "admin",
        userId: ALUNO,
      },
      {
        cursoId: revogado,
        liberadaEm: new Date(Date.now() - 60_000),
        liberadaPor: "user_admin",
        origem: "admin",
        revogadaEm: new Date(),
        revogadaPor: "user_admin",
        userId: ALUNO,
      },
    ]);
    const dia = (d: string) => new Date(`${d}T13:00:00Z`);
    await db.insert(comunicado).values([
      {
        cursoId: liberado,
        id: ids.deCursoLiberado,
        publicadoEm: dia("2020-03-10"),
        publicadoPor: AUTORA,
        texto: "Do curso liberado.",
        titulo: "Do curso liberado",
      },
      {
        cursoId: null,
        id: ids.geralNovo,
        publicadoEm: dia("2020-03-12"),
        publicadoPor: "user_saiudoclerk",
        texto: "Geral novo.",
        titulo: "Geral novo",
      },
      {
        cursoId: null,
        id: ids.geralVelho,
        publicadoEm: dia("2020-02-20"),
        publicadoPor: AUTORA,
        texto: "Geral velho.",
        titulo: "Geral velho",
      },
      {
        cursoId: naoLiberado,
        id: ids.deCursoNaoLiberado,
        publicadoEm: dia("2020-03-11"),
        publicadoPor: AUTORA,
        texto: "De curso não liberado.",
        titulo: "De curso não liberado",
      },
      {
        cursoId: revogado,
        id: ids.deCursoRevogado,
        publicadoEm: dia("2020-03-11"),
        publicadoPor: AUTORA,
        texto: "De curso revogado.",
        titulo: "De curso revogado",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(comunicado).where(inArray(comunicado.id, [...nossos]));
    await db.delete(liberacao).where(inArray(liberacao.cursoId, cursos));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("o aluno vê os gerais e o do curso liberado, do mais novo para o mais velho; nunca o de curso não liberado ou revogado", async () => {
    expect(
      osDesteTesteNaOrdemDaTela(await lista(ALUNO)).map((c) => [
        c.titulo,
        c.dia,
        c.alvo.tipo,
      ])
    ).toEqual([
      ["Geral novo", "2020-03-12", "geral"],
      ["Do curso liberado", "2020-03-10", "curso"],
      ["Geral velho", "2020-02-20", "geral"],
    ]);
  });

  test("o do curso leva o título, o link e a capa do curso, e o autor sai pelo nome do Clerk", async () => {
    const doCurso = osDesteTesteNaOrdemDaTela(await lista(ALUNO)).find(
      (c) => c.id === ids.deCursoLiberado
    );
    expect(doCurso).toMatchObject({
      alvo: {
        capa: { alt: "Capa de liberado", altura: 604, largura: 900 },
        href: `/cursos/com-aluno-${S}-liberado`,
        tipo: "curso",
        titulo: `liberado ${S}`,
      },
      publicadoPor: "Marina Duarte",
      texto: "Do curso liberado.",
    });
    const geral = osDesteTesteNaOrdemDaTela(await lista(ALUNO)).find(
      (c) => c.id === ids.geralNovo
    );
    expect(geral?.publicadoPor).toBeNull();
  });

  test("quem não tem liberação vê só os gerais", async () => {
    expect(
      osDesteTesteNaOrdemDaTela(await lista(SEM_NADA)).map((c) => c.titulo)
    ).toEqual(["Geral novo", "Geral velho"]);
  });
});
