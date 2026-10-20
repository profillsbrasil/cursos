import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import { createDb } from "@cursos/db";
import {
  curso,
  liberacaoDoPerfil,
  perfilDaPessoa,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type {
  AdminId,
  Conta,
  CursoId,
  LiberacaoDoPerfilId,
} from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import { apagarCurso } from "./edicao-do-curso";
import { liberarParaPerfil, revogarDoPerfil } from "./liberacao-do-perfil";
import { definirPerfil, perfilDe } from "./perfil";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const AGORA = new Date("2026-10-20T13:00:00Z");
const ADMIN = "user_admin" as AdminId;

const conta = (email: string | null, emailVerificado = true): Conta => ({
  criadaEm: AGORA,
  email,
  emailVerificado,
  foto: null,
  jeitosDeEntrar: [],
  nome: "Pessoa",
  papel: "aluno",
  ultimoAcesso: null,
  userId: "user_x",
});

describe.skipIf(URL_TESTE === null)("perfil da pessoa", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const pessoas: string[] = [];

  const linhaDe = async (userId: string) =>
    (
      await db
        .select()
        .from(perfilDaPessoa)
        .where(eq(perfilDaPessoa.userId, userId))
    )[0];

  const pessoa = () => {
    const userId = `user_perfil${S}${pessoas.length}`;
    pessoas.push(userId);
    return userId;
  };

  afterAll(async () => {
    await db
      .delete(perfilDaPessoa)
      .where(inArray(perfilDaPessoa.userId, pessoas));
    await db.$client.end();
  });

  test("o primeiro acesso grava o perfil do cadastro, e o segundo não lê o Clerk", async () => {
    const userId = pessoa();
    let leituras = 0;
    const lerConta = () => {
      leituras += 1;
      return Promise.resolve(conta("bruno@profills.com"));
    };
    expect(await perfilDe(db, userId, lerConta)).toBe("funcionario");
    expect(await perfilDe(db, userId, lerConta)).toBe("funcionario");
    expect(leituras).toBe(1);
    const [linha] = await db
      .select()
      .from(perfilDaPessoa)
      .where(eq(perfilDaPessoa.userId, userId));
    expect(linha?.definidoPor).toBeNull();
  });

  test("com o Clerk fora no primeiro acesso, vale público aberto sem gravar, e o acesso seguinte grava", async () => {
    const userId = pessoa();
    expect(
      await perfilDe(db, userId, () =>
        Promise.reject(new Error("Clerk respondeu 429"))
      )
    ).toBe("publico");
    expect(await linhaDe(userId)).toBeUndefined();
    expect(
      await perfilDe(db, userId, () =>
        Promise.resolve(conta("nova@profills.com"))
      )
    ).toBe("funcionario");
  });

  test("duas chamadas do mesmo pedido leem a conta no Clerk uma vez só", async () => {
    const userId = pessoa();
    let leituras = 0;
    const base = contextoDeTeste({
      db,
      pessoas: [{ email: "x@exemplo.com", foto: null, nome: "X", userId }],
      userId,
    });
    const caller = createCaller({
      ...base,
      pessoas: {
        ...base.pessoas,
        // A espera põe as duas chamadas no ar ao mesmo tempo, antes de a linha nascer.
        conta: async (id) => {
          leituras += 1;
          await esperar(50);
          return base.pessoas.conta(id);
        },
      },
    });
    await Promise.all([
      caller.meusCursos.painel(),
      caller.troca.temCursoTrocavelNaVitrine(),
    ]);
    expect(leituras).toBe(1);
  });

  test("quem o Clerk não conhece entra como público aberto", async () => {
    expect(await perfilDe(db, pessoa(), () => Promise.resolve(null))).toBe(
      "publico"
    );
  });

  test("dois primeiros acessos ao mesmo tempo gravam uma linha e leem a mesma", async () => {
    const userId = pessoa();
    const respostas = await Promise.all([
      perfilDe(db, userId, () => Promise.resolve(conta("ana@profills.com"))),
      perfilDe(db, userId, () => Promise.resolve(conta("ana@profills.com"))),
    ]);
    expect(respostas).toEqual(["funcionario", "funcionario"]);
    const linhas = await db
      .select()
      .from(perfilDaPessoa)
      .where(eq(perfilDaPessoa.userId, userId));
    expect(linhas).toHaveLength(1);
  });

  test("o admin muda o perfil, com quem mudou e quando", async () => {
    const userId = pessoa();
    await perfilDe(db, userId, () => Promise.resolve(conta("c@exemplo.com")));
    await definirPerfil(db, ADMIN, userId, "cliente", AGORA);
    expect(
      await perfilDe(db, userId, () => {
        throw new Error("não lê o Clerk com a linha gravada");
      })
    ).toBe("cliente");
    const [linha] = await db
      .select()
      .from(perfilDaPessoa)
      .where(eq(perfilDaPessoa.userId, userId));
    expect(linha).toMatchObject({
      definidoEm: AGORA,
      definidoPor: ADMIN,
      perfil: "cliente",
    });
  });

  test("o admin define o perfil de quem ainda não entrou no app", async () => {
    const userId = pessoa();
    await definirPerfil(db, ADMIN, userId, "funcionario", AGORA);
    expect(await perfilDe(db, userId, () => Promise.resolve(null))).toBe(
      "funcionario"
    );
  });
});

describe.skipIf(URL_TESTE === null)("liberação do perfil", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const cursos: string[] = [];

  async function cursoDeTeste(): Promise<CursoId> {
    const s = hex();
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        categoriaId: await categoriaDeTeste(db),
        codigo: codigoDeTeste(),
        slug: `teste-${s}`,
        status: "publicado",
        titulo: `Curso ${s}`,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id);
    return c.id as CursoId;
  }

  const ativasDe = (cursoId: CursoId) =>
    db.query.liberacaoDoPerfil.findMany({
      where: { cursoId, revogadaEm: { isNull: true } },
    });

  afterAll(async () => {
    if (cursos.length > 0) {
      await db
        .delete(liberacaoDoPerfil)
        .where(inArray(liberacaoDoPerfil.cursoId, cursos));
      await db.delete(curso).where(inArray(curso.id, cursos));
    }
    await db.$client.end();
  });

  test("liberar de novo devolve a liberação que já está ativa", async () => {
    const cursoId = await cursoDeTeste();
    const primeira = await liberarParaPerfil(
      db,
      ADMIN,
      "cliente",
      cursoId,
      AGORA
    );
    const segunda = await liberarParaPerfil(
      db,
      ADMIN,
      "cliente",
      cursoId,
      AGORA
    );
    expect(primeira.nova).toBe(true);
    expect(segunda).toEqual({ id: primeira.id, nova: false });
    expect(await ativasDe(cursoId)).toHaveLength(1);
  });

  test("cada perfil tem a própria liberação do curso", async () => {
    const cursoId = await cursoDeTeste();
    await liberarParaPerfil(db, ADMIN, "funcionario", cursoId, AGORA);
    await liberarParaPerfil(db, ADMIN, "publico", cursoId, AGORA);
    const perfis = (await ativasDe(cursoId)).map((l) => l.perfil).sort();
    expect(perfis).toEqual(["funcionario", "publico"]);
  });

  test("dois admins liberando ao mesmo tempo ficam com uma liberação só", async () => {
    const cursoId = await cursoDeTeste();
    const [a, b] = await Promise.all([
      liberarParaPerfil(db, ADMIN, "cliente", cursoId, AGORA),
      liberarParaPerfil(db, ADMIN, "cliente", cursoId, AGORA),
    ]);
    expect(a?.id).toBe(b?.id);
    expect(await ativasDe(cursoId)).toHaveLength(1);
  });

  test("curso que não existe recusa com a frase para a pessoa", async () => {
    const promessa = liberarParaPerfil(
      db,
      ADMIN,
      "cliente",
      "00000000-0000-4000-8000-000000000000" as CursoId,
      AGORA
    );
    await expect(promessa).rejects.toBeInstanceOf(ErroParaAPessoa);
    await expect(promessa).rejects.toThrow("Este curso não existe mais.");
  });

  test("revogar guarda a linha, revogar de novo não muda nada, e liberar depois cria outra", async () => {
    const cursoId = await cursoDeTeste();
    const { id } = await liberarParaPerfil(
      db,
      ADMIN,
      "cliente",
      cursoId,
      AGORA
    );
    expect(await revogarDoPerfil(db, ADMIN, id, AGORA)).toEqual({
      revogada: true,
    });
    expect(await revogarDoPerfil(db, ADMIN, id, AGORA)).toEqual({
      revogada: false,
    });
    const [revogada] = await db
      .select()
      .from(liberacaoDoPerfil)
      .where(eq(liberacaoDoPerfil.id, id));
    expect(revogada?.revogadaPor).toBe(ADMIN);
    const nova = await liberarParaPerfil(db, ADMIN, "cliente", cursoId, AGORA);
    expect(nova.nova).toBe(true);
    expect(nova.id).not.toBe(id);
  });

  test("revogar um id que não existe não muda nada", async () => {
    expect(
      await revogarDoPerfil(
        db,
        ADMIN,
        "00000000-0000-4000-8000-000000000000" as LiberacaoDoPerfilId,
        AGORA
      )
    ).toEqual({ revogada: false });
  });

  test("curso liberado a um perfil não se apaga", async () => {
    const cursoId = await cursoDeTeste();
    await liberarParaPerfil(db, ADMIN, "cliente", cursoId, AGORA);
    await expect(apagarCurso(db, cursoId)).rejects.toThrow(
      "Este curso já tem aluno"
    );
  });
});
