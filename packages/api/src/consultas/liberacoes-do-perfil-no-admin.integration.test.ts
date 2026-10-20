// O que o admin lê da liberação do perfil: a aba Por perfil, a busca de pessoas
// e a tela de acesso de cada uma.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  curso,
  liberacaoDoPerfil,
  modulo,
  perfilDaPessoa,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type { AdminId, CursoId } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import { definirPerfil } from "./perfil";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const AGORA = new Date("2026-10-20T15:00:00Z");

describe.skipIf(URL_TESTE === null)("liberação do perfil no admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const DONA = `user_dona${S}`;
  const CLIENTE = `user_cliente${S}`;
  const cursos: string[] = [];
  const admin = createCaller(
    contextoDeTeste({
      db,
      papel: "admin",
      pessoas: [
        { email: null, foto: null, nome: "Dona", userId: DONA },
        { email: null, foto: null, nome: `Cliente ${S}`, userId: CLIENTE },
      ],
      userId: DONA,
    })
  );

  async function criarCurso() {
    const slug = `teste-${randomBytes(4).toString("hex")}`;
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
      .values({ cursoId: c.id, numero: 0, titulo: "Módulo" })
      .returning({ id: modulo.id });
    await db.insert(aula).values({
      duracaoSeg: 60,
      moduloId: m?.id ?? "",
      posicao: 1,
      titulo: "Aula",
    });
    return c.id as CursoId;
  }

  afterAll(async () => {
    await db
      .delete(perfilDaPessoa)
      .where(inArray(perfilDaPessoa.userId, [DONA, CLIENTE]));
    if (cursos.length > 0) {
      await db
        .delete(liberacaoDoPerfil)
        .where(inArray(liberacaoDoPerfil.cursoId, cursos));
      await db.delete(curso).where(inArray(curso.id, cursos));
    }
    await db.$client.end();
  });

  test("a aba Por perfil mostra a liberação de cada perfil, e liberar e revogar mudam a grade", async () => {
    const id = await criarCurso();
    const naGrade = async () =>
      (await admin.admin.perfis.grade()).cursos.find((c) => c.id === id)
        ?.liberacoes;
    expect(await naGrade()).toEqual({
      cliente: null,
      funcionario: null,
      publico: null,
    });
    const { id: liberacao } = await admin.admin.perfis.liberar({
      cursoId: id,
      perfil: "cliente",
    });
    expect((await naGrade())?.cliente).toBe(liberacao);
    expect(await admin.admin.perfis.revogar({ id: liberacao })).toEqual({
      revogada: true,
    });
    expect((await naGrade())?.cliente).toBeNull();
  });

  test("a busca e a tela de acesso contam o curso que a pessoa vê pelo perfil", async () => {
    const id = await criarCurso();
    await definirPerfil(db, DONA as AdminId, CLIENTE, "cliente", AGORA);
    const situacao = async () =>
      (await admin.admin.alunos.buscar({ termo: `Cliente ${S}` })).pessoas[0]
        ?.situacao.tipo;
    expect(await situacao()).toBe("sem_liberacao");

    await admin.admin.perfis.liberar({ cursoId: id, perfil: "cliente" });
    expect(await situacao()).toBe("nunca_abriu");

    const acesso = await admin.admin.alunos.acesso({ userId: CLIENTE });
    expect(
      acesso?.liberacoes.map((l) => [l.curso.id, l.origem, l.acao.tipo])
    ).toEqual([[id, "perfil", "pelo_perfil"]]);
    expect(acesso?.cursos.find((c) => c.curso.id === id)?.liberado).toBe(false);
  });
});
