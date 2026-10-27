import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  curso,
  liberacao,
  liberacaoDoPerfil,
  modulo,
  perfilDaPessoa,
  pontoLancamento,
  posicaoAula,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { asc, inArray } from "drizzle-orm";

import type { Perfil } from "../dominio/perfil";
import { BONUS_DE_FUNCIONARIO } from "../dominio/regras";
import type { AdminId, CursoId } from "../dominio/tipos";
import { nadaAFazer } from "../dominio/virada";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import { liberarParaPerfil } from "./liberacao-do-perfil";
import { rodarVirada } from "./virada";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const ADMIN = "user_admin" as AdminId;
const AGORA = new Date("2026-10-27T12:00:00Z");
const PRECO = 800;

describe.skipIf(URL_TESTE === null)("virada dos pontos", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const alunos: string[] = [];
  const cursos: string[] = [];

  async function pessoa(perfil: Perfil) {
    const userId = `user_virada${S}x${alunos.length}`;
    alunos.push(userId);
    // Direto na tabela: quem já era Funcionário antes do bônus não o tem.
    await db.insert(perfilDaPessoa).values({ perfil, userId });
    return userId;
  }

  async function cursoDoPerfil(precoTroca: number | null, ...perfis: Perfil[]) {
    const slug = `teste-${hex()}`;
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        categoriaId: await categoriaDeTeste(db),
        codigo: codigoDeTeste(),
        precoTroca,
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
    const [a] = await db
      .insert(aula)
      .values({
        duracaoSeg: 600,
        moduloId: m?.id ?? "",
        posicao: 1,
        titulo: "Aula",
      })
      .returning({ id: aula.id });
    for (const perfil of perfis) {
      // biome-ignore lint/performance/noAwaitInLoops: poucas linhas de preparo.
      await liberarParaPerfil(db, ADMIN, perfil, c.id as CursoId, AGORA);
    }
    return { aulaId: a?.id ?? "", id: c.id as CursoId };
  }

  const assistir = (userId: string, aulaId: string) =>
    db.insert(aulaAssistida).values({ assistidaEm: AGORA, aulaId, userId });

  /** Tudo o que a virada pode gravar das pessoas plantadas. */
  async function gravado() {
    const lancamentos = await db
      .select({
        motivo: pontoLancamento.motivo,
        pontos: pontoLancamento.pontos,
        userId: pontoLancamento.userId,
      })
      .from(pontoLancamento)
      .where(inArray(pontoLancamento.userId, alunos))
      .orderBy(asc(pontoLancamento.userId), asc(pontoLancamento.pontos));
    const liberacoes = await db
      .select({
        cursoId: liberacao.cursoId,
        origem: liberacao.origem,
        userId: liberacao.userId,
      })
      .from(liberacao)
      .where(inArray(liberacao.userId, alunos))
      .orderBy(asc(liberacao.userId));
    return { lancamentos, liberacoes };
  }

  let estudou: string;
  let naoEstudou: string;
  let jaTemBonus: string;
  let cliente: string;
  let comPreco: { aulaId: string; id: CursoId };
  let semPreco: { aulaId: string; id: CursoId };

  beforeAll(async () => {
    comPreco = await cursoDoPerfil(PRECO, "funcionario", "cliente");
    semPreco = await cursoDoPerfil(null, "funcionario");
    estudou = await pessoa("funcionario");
    naoEstudou = await pessoa("funcionario");
    jaTemBonus = await pessoa("funcionario");
    cliente = await pessoa("cliente");
    await assistir(estudou, comPreco.aulaId);
    await assistir(estudou, semPreco.aulaId);
    await db.insert(posicaoAula).values({
      atualizadaEm: AGORA,
      aulaId: comPreco.aulaId,
      posicaoSeg: 42,
      userId: jaTemBonus,
    });
    await db.insert(pontoLancamento).values({
      criadoEm: AGORA,
      motivo: "bonus_funcionario",
      pontos: BONUS_DE_FUNCIONARIO,
      userId: jaTemBonus,
    });
    await assistir(cliente, comPreco.aulaId);
  });

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, alunos));
    await db.delete(liberacao).where(inArray(liberacao.userId, alunos));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, alunos));
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, alunos));
    await db
      .delete(perfilDaPessoa)
      .where(inArray(perfilDaPessoa.userId, alunos));
    if (cursos.length > 0) {
      await db
        .delete(liberacaoDoPerfil)
        .where(inArray(liberacaoDoPerfil.cursoId, cursos));
      await db.delete(curso).where(inArray(curso.id, cursos));
    }
    await db.$client.end();
  });

  const rodar = (gravar: boolean) =>
    rodarVirada(db, { agora: AGORA, entre: alunos, gravar });

  test("o ensaio planeja e não grava nada", async () => {
    const antes = await gravado();
    const planos = await rodar(false);
    expect(planos.map((p) => p.userId).sort()).toEqual(
      [estudou, naoEstudou, jaTemBonus].sort()
    );
    const de = (userId: string) => planos.find((p) => p.userId === userId);
    expect(de(estudou)).toEqual({
      bonus: BONUS_DE_FUNCIONARIO,
      pulados: [
        {
          cursoId: semPreco.id,
          motivo: { tipo: "sem_preco" },
          titulo: expect.any(String),
        },
      ],
      trocas: [
        { cursoId: comPreco.id, preco: PRECO, titulo: expect.any(String) },
      ],
      userId: estudou,
    });
    expect(de(naoEstudou)).toEqual({
      bonus: BONUS_DE_FUNCIONARIO,
      pulados: [],
      trocas: [],
      userId: naoEstudou,
    });
    expect(de(jaTemBonus)).toMatchObject({
      bonus: 0,
      trocas: [{ cursoId: comPreco.id, preco: PRECO }],
    });
    expect(await gravado()).toEqual(antes);
  });

  test("gravando, dá o bônus, troca o que estudou e pula o sem preço", async () => {
    await rodar(true);
    const { lancamentos, liberacoes } = await gravado();
    const doAluno = (userId: string) =>
      lancamentos
        .filter((l) => l.userId === userId)
        .map((l) => [l.motivo, l.pontos]);
    expect(doAluno(estudou)).toEqual([
      ["troca", -PRECO],
      ["bonus_funcionario", BONUS_DE_FUNCIONARIO],
    ]);
    expect(doAluno(naoEstudou)).toEqual([
      ["bonus_funcionario", BONUS_DE_FUNCIONARIO],
    ]);
    expect(doAluno(jaTemBonus)).toEqual([
      ["troca", -PRECO],
      ["bonus_funcionario", BONUS_DE_FUNCIONARIO],
    ]);
    expect(doAluno(cliente)).toEqual([]);
    expect(
      liberacoes.map((l) => [l.userId, l.cursoId, l.origem]).sort()
    ).toEqual(
      [
        [estudou, comPreco.id, "troca"],
        [jaTemBonus, comPreco.id, "troca"],
      ].sort()
    );
  });

  test("rodar de novo não muda nada: nada a fazer para todo mundo", async () => {
    const antes = await gravado();
    const planos = await rodar(true);
    expect(await gravado()).toEqual(antes);
    expect(planos).toHaveLength(3);
    expect(planos.every(nadaAFazer)).toBe(true);
    expect(planos.find((p) => p.userId === estudou)).toMatchObject({
      bonus: 0,
      pulados: [{ cursoId: semPreco.id, motivo: { tipo: "sem_preco" } }],
      trocas: [],
    });
  });
});
