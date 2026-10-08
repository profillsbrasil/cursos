// Comunicados do admin contra o Supabase local. Roda só com TEST_DATABASE_URL em host local.
// Cria cursos com sufixo aleatório; o afterAll apaga os comunicados e os cursos.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import { comunicado, curso } from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type { ComunicadoId, CursoId } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { createCaller } from "../routers/index";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const DONO = `user_donocom${S}`;
const OUTRO_ADMIN = `user_saiudoclerk${S}`;
const ALUNO = `user_alunocom${S}`;

describe.skipIf(URL_TESTE === null)("comunicados do admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const cursos: CursoId[] = [];
  const comunicados: string[] = [];

  const comoAdmin = (userId = DONO) =>
    createCaller(
      contextoDeTeste({
        db,
        papel: "admin",
        pessoas: [
          { email: null, foto: null, nome: "Dona do admin", userId: DONO },
        ],
        userId,
      })
    ).admin.comunicados;

  function novoId() {
    const id = crypto.randomUUID() as ComunicadoId;
    comunicados.push(id);
    return id;
  }

  async function novoCurso() {
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        slug: `teste-com-${S}-${cursos.length}`,
        tema: "teste",
        titulo: `Curso do comunicado ${S} ${cursos.length}`,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id as CursoId);
    return c.id as CursoId;
  }

  const linhasDe = (id: string) =>
    db.select().from(comunicado).where(eq(comunicado.id, id));

  afterAll(async () => {
    await db.delete(comunicado).where(inArray(comunicado.id, comunicados));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("salvar duas vezes o mesmo id grava uma linha, com o admin como autor", async () => {
    const id = novoId();
    const c = { cursoId: null, id, texto: "Texto.", titulo: `Geral ${S}` };
    const primeiro = await comoAdmin().salvar(c);
    const segundo = await comoAdmin().salvar(c);
    expect([primeiro, segundo]).toEqual([
      { id, novo: true },
      { id, novo: false },
    ]);
    expect(await linhasDe(id)).toMatchObject([
      {
        cursoId: null,
        publicadoPor: DONO,
        texto: "Texto.",
        titulo: `Geral ${S}`,
      },
    ]);
  });

  test("editar troca título, texto e alvo e mantém publicado_em e publicado_por", async () => {
    const id = novoId();
    const alvo = await novoCurso();
    await comoAdmin().salvar({
      cursoId: null,
      id,
      texto: "Antes.",
      titulo: "Antes",
    });
    const [antes] = await linhasDe(id);
    await comoAdmin(OUTRO_ADMIN).salvar({
      cursoId: alvo,
      id,
      texto: "Depois.",
      titulo: "Depois",
    });
    expect(await linhasDe(id)).toEqual([
      {
        cursoId: alvo,
        id,
        publicadoEm: antes?.publicadoEm as Date,
        publicadoPor: DONO,
        texto: "Depois.",
        titulo: "Depois",
      },
    ]);
  });

  test("apagar duas vezes não falha, e a segunda diz que não havia o que apagar", async () => {
    const id = novoId();
    await comoAdmin().salvar({ cursoId: null, id, texto: "x", titulo: "x" });
    expect(await comoAdmin().apagar({ id })).toEqual({ apagado: true });
    expect(await comoAdmin().apagar({ id })).toEqual({ apagado: false });
    expect(await linhasDe(id)).toEqual([]);
  });

  test("comunicado de curso some junto com o curso", async () => {
    const id = novoId();
    const alvo = await novoCurso();
    await comoAdmin().salvar({ cursoId: alvo, id, texto: "x", titulo: "x" });
    await db.delete(curso).where(eq(curso.id, alvo));
    expect(await linhasDe(id)).toEqual([]);
  });

  test("curso que não existe é recusado com mensagem para a pessoa e não grava", async () => {
    const id = novoId();
    const erro = await comoAdmin()
      .salvar({ cursoId: crypto.randomUUID(), id, texto: "x", titulo: "x" })
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroParaAPessoa);
    expect(erro).toMatchObject({ code: "NOT_FOUND" });
    expect(await linhasDe(id)).toEqual([]);
  });

  test("a lista traz o mais recente primeiro, o curso e o nome de quem publicou", async () => {
    const alvo = await novoCurso();
    const antigo = novoId();
    const recente = novoId();
    await comoAdmin(OUTRO_ADMIN).salvar({
      cursoId: alvo,
      id: antigo,
      texto: "a",
      titulo: `Antigo ${S}`,
    });
    await comoAdmin().salvar({
      cursoId: null,
      id: recente,
      texto: "b",
      titulo: `Recente ${S}`,
    });
    const lista = await comoAdmin().lista();
    const meus = lista.comunicados.filter((c) => c.titulo.endsWith(S));
    expect(meus.slice(0, 2)).toMatchObject([
      { curso: null, id: recente, publicadoPor: "Dona do admin" },
      {
        curso: {
          id: alvo,
          titulo: `Curso do comunicado ${S} ${cursos.length - 1}`,
        },
        id: antigo,
        publicadoPor: OUTRO_ADMIN,
      },
    ]);
    expect(lista.cursos).toContainEqual({
      id: alvo,
      titulo: `Curso do comunicado ${S} ${cursos.length - 1}`,
    });
  });

  test("o geral chega ao painel do aluno, e um de curso fora do alcance não toma o lugar", async () => {
    const aluno = createCaller(contextoDeTeste({ db, userId: ALUNO }));
    const geral = novoId();
    await comoAdmin().salvar({
      cursoId: null,
      id: geral,
      texto: "g",
      titulo: `Para todos ${S}`,
    });
    await comoAdmin().salvar({
      cursoId: await novoCurso(),
      id: novoId(),
      texto: "c",
      titulo: `Só do curso ${S}`,
    });
    expect((await aluno.meusCursos.painel()).comunicado?.id).toBe(geral);
  });
});
