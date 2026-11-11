// O primeiro acesso de quem foi convidado, pela porta que o app usa: um procedure
// do aluno. O que se confere é o que fica no banco e no login.

import { afterAll, describe, expect, spyOn, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  convite,
  curso,
  liberacao,
  perfilDaPessoa,
  pontoLancamento,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { and, eq, inArray } from "drizzle-orm";

import type { Papel } from "../context";
import { contextoDeTeste, convitesDeTeste } from "../contexto-de-teste";
import type { Email } from "../dominio/convite";
import type { Perfil } from "../dominio/perfil";
import { BONUS_DE_FUNCIONARIO } from "../dominio/regras";
import type { AdminId, ConviteId, CursoId } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import { cancelarConvite, convidar } from "./convite";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const ADMIN = `user_admchegada${S}` as AdminId;
const DIA = 86_400_000;

const semConta = { contasCom: () => Promise.resolve(new Map<Email, string>()) };

describe.skipIf(URL_TESTE === null)("chegada de quem foi convidado", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const ids: string[] = [];
  const cursos: string[] = [];

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, ids));
    await db.delete(liberacao).where(inArray(liberacao.userId, ids));
    await db.delete(perfilDaPessoa).where(inArray(perfilDaPessoa.userId, ids));
    await db.delete(convite).where(eq(convite.convidadoPor, ADMIN));
    if (cursos.length > 0) {
      await db.delete(curso).where(inArray(curso.id, cursos));
    }
    await db.$client.end();
  });

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
        slug: `chegada-${s}`,
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

  /** Uma pessoa com conta no login e nenhum acesso ao app ainda. */
  function pessoa(dominio = `cliente${S}.example`) {
    const userId = `user_chegada${S}${ids.length}`;
    ids.push(userId);
    return { email: `p${ids.length}.${hex()}@${dominio}` as Email, userId };
  }

  async function convidarComo(
    email: Email,
    oQueDa: { comoAdmin?: boolean; cursoIds?: CursoId[]; perfil: Perfil },
    agora = new Date()
  ): Promise<ConviteId> {
    await convidar(
      db,
      { convites: convitesDeTeste(), pessoas: semConta },
      ADMIN,
      {
        comoAdmin: oQueDa.comoAdmin ?? false,
        cursoIds: oQueDa.cursoIds ?? [],
        emails: [email],
        perfil: oQueDa.perfil,
      },
      agora
    );
    const [linha] = await db
      .select({ id: convite.id })
      .from(convite)
      .where(eq(convite.email, email));
    return linha?.id as ConviteId;
  }

  /** O login com esta pessoa, e quantas vezes o app gravou o papel dela. */
  function login(
    p: { email: Email; userId: string },
    o: { emailVerificado?: boolean; falhasDoPapel?: number } = {}
  ) {
    const base = contextoDeTeste({
      db,
      pessoas: [
        {
          email: p.email,
          emailVerificado: o.emailVerificado ?? true,
          foto: null,
          nome: "Pessoa",
          userId: p.userId,
        },
        {
          email: null,
          foto: null,
          nome: "Admin",
          papel: "admin",
          userId: ADMIN,
        },
      ],
      userId: p.userId,
    });
    let falhas = o.falhasDoPapel ?? 0;
    const papeisGravados: Papel[] = [];
    const pessoas = {
      ...base.pessoas,
      definirPapel: (userId: string, papel: Papel) => {
        if (falhas > 0) {
          falhas -= 1;
          return Promise.reject(new Error("o login não gravou o papel"));
        }
        papeisGravados.push(papel);
        return base.pessoas.definirPapel(userId, papel);
      },
    };
    return {
      /** Um pedido novo da pessoa: outra Sessao, como outra página. */
      entrar: () =>
        createCaller({
          ...contextoDeTeste({ db, userId: p.userId }),
          pessoas,
        }).meusCursos.painel(),
      papeisGravados,
      papelNoLogin: async () => (await pessoas.conta(p.userId))?.papel,
      pessoas,
    };
  }

  const perfilDe = async (userId: string) => {
    const [linha] = await db
      .select()
      .from(perfilDaPessoa)
      .where(eq(perfilDaPessoa.userId, userId));
    return linha;
  };

  const bonusDe = async (userId: string) =>
    (
      await db
        .select({ pontos: pontoLancamento.pontos })
        .from(pontoLancamento)
        .where(
          and(
            eq(pontoLancamento.userId, userId),
            eq(pontoLancamento.motivo, "bonus_funcionario")
          )
        )
    ).map((l) => l.pontos);

  const liberacoesDe = (userId: string) =>
    db
      .select({
        cursoId: liberacao.cursoId,
        liberadaPor: liberacao.liberadaPor,
        origem: liberacao.origem,
      })
      .from(liberacao)
      .where(eq(liberacao.userId, userId));

  const conviteDe = async (id: ConviteId) => {
    const [linha] = await db.select().from(convite).where(eq(convite.id, id));
    if (!linha) {
      throw new Error(`convite ${id} sumiu`);
    }
    return linha;
  };

  test("quem chega com convite ganha o perfil, o bônus, os cursos e o papel do convite", async () => {
    const p = pessoa();
    const [a, b] = [await cursoDeTeste(), await cursoDeTeste()];
    const id = await convidarComo(p.email, {
      comoAdmin: true,
      cursoIds: [a, b],
      perfil: "funcionario",
    });
    const eu = login(p);
    await eu.entrar();

    expect(await perfilDe(p.userId)).toMatchObject({
      definidoPor: ADMIN,
      perfil: "funcionario",
    });
    expect(await bonusDe(p.userId)).toEqual([BONUS_DE_FUNCIONARIO]);
    const liberadas = await liberacoesDe(p.userId);
    expect(liberadas.map((l) => l.cursoId).sort()).toEqual([a, b].sort());
    expect(liberadas.map((l) => [l.origem, l.liberadaPor])).toEqual([
      ["admin", ADMIN],
      ["admin", ADMIN],
    ]);
    const aceito = await conviteDe(id);
    expect(aceito.aceitoPor).toBe(p.userId);
    expect(aceito.aceitoEm).not.toBeNull();
    expect(aceito.papelAplicadoEm).not.toBeNull();
    expect(await eu.papelNoLogin()).toBe("admin");
  });

  test("convidado como Cliente com e-mail @profills.com fica Cliente e sem bônus", async () => {
    const p = pessoa("profills.com");
    await convidarComo(p.email, { perfil: "cliente" });
    const eu = login(p);
    await eu.entrar();

    expect(await perfilDe(p.userId)).toMatchObject({
      definidoPor: ADMIN,
      perfil: "cliente",
    });
    expect(await bonusDe(p.userId)).toEqual([]);
    expect(await eu.papelNoLogin()).toBe("aluno");
  });

  test("dois primeiros acessos juntos aplicam o convite uma vez", async () => {
    const p = pessoa();
    const cursoId = await cursoDeTeste();
    const id = await convidarComo(p.email, {
      comoAdmin: true,
      cursoIds: [cursoId],
      perfil: "funcionario",
    });
    const eu = login(p);
    await Promise.all([eu.entrar(), eu.entrar()]);

    const linhas = await db
      .select()
      .from(perfilDaPessoa)
      .where(eq(perfilDaPessoa.userId, p.userId));
    expect(linhas.map((l) => l.perfil)).toEqual(["funcionario"]);
    expect(await bonusDe(p.userId)).toEqual([BONUS_DE_FUNCIONARIO]);
    expect((await liberacoesDe(p.userId)).map((l) => l.cursoId)).toEqual([
      cursoId,
    ]);
    expect((await conviteDe(id)).aceitoPor).toBe(p.userId);
    expect(eu.papeisGravados).toEqual(["admin"]);
  });

  test("convite cancelado cai na regra do e-mail, e o papel de admin nunca é gravado", async () => {
    const p = pessoa("profills.com");
    const cursoId = await cursoDeTeste();
    const id = await convidarComo(p.email, {
      comoAdmin: true,
      cursoIds: [cursoId],
      perfil: "cliente",
    });
    await cancelarConvite(db, convitesDeTeste(), ADMIN, id, new Date());
    const eu = login(p);
    await eu.entrar();
    await eu.entrar();

    expect(await perfilDe(p.userId)).toMatchObject({
      definidoPor: null,
      perfil: "funcionario",
    });
    expect(await liberacoesDe(p.userId)).toEqual([]);
    expect(eu.papeisGravados).toEqual([]);
    expect(await eu.papelNoLogin()).toBe("aluno");
    expect((await conviteDe(id)).aceitoEm).toBeNull();
  });

  test("convite vencido cai na regra do e-mail e continua na lista do admin", async () => {
    const p = pessoa();
    const cursoId = await cursoDeTeste();
    const id = await convidarComo(
      p.email,
      { comoAdmin: true, cursoIds: [cursoId], perfil: "funcionario" },
      new Date(Date.now() - 31 * DIA)
    );
    const eu = login(p);
    await eu.entrar();

    expect(await perfilDe(p.userId)).toMatchObject({
      definidoPor: null,
      perfil: "publico",
    });
    expect(await bonusDe(p.userId)).toEqual([]);
    expect(await liberacoesDe(p.userId)).toEqual([]);
    expect(eu.papeisGravados).toEqual([]);
    expect((await conviteDe(id)).aceitoEm).toBeNull();
  });

  test("e-mail não verificado não aplica o convite", async () => {
    const p = pessoa();
    const id = await convidarComo(p.email, {
      comoAdmin: true,
      perfil: "funcionario",
    });
    const eu = login(p, { emailVerificado: false });
    await eu.entrar();

    expect(await perfilDe(p.userId)).toMatchObject({
      definidoPor: null,
      perfil: "publico",
    });
    expect(eu.papeisGravados).toEqual([]);
    expect((await conviteDe(id)).aceitoEm).toBeNull();
  });

  test("o login que falha ao gravar o papel deixa o papel por aplicar, e o pedido seguinte aplica", async () => {
    const p = pessoa();
    const id = await convidarComo(p.email, {
      comoAdmin: true,
      perfil: "cliente",
    });
    const eu = login(p, { falhasDoPapel: 1 });
    const aviso = spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await eu.entrar();
    } finally {
      aviso.mockRestore();
    }

    expect((await perfilDe(p.userId))?.perfil).toBe("cliente");
    expect(await eu.papelNoLogin()).toBe("aluno");
    const pendente = await conviteDe(id);
    expect(pendente.aceitoPor).toBe(p.userId);
    expect(pendente.papelAplicadoEm).toBeNull();

    await eu.entrar();
    expect(await eu.papelNoLogin()).toBe("admin");
    expect((await conviteDe(id)).papelAplicadoEm).not.toBeNull();

    await eu.entrar();
    expect(eu.papeisGravados).toEqual(["admin"]);
  });

  test("mudar o papel na ficha encerra o papel por aplicar do convite", async () => {
    const p = pessoa();
    const id = await convidarComo(p.email, {
      comoAdmin: true,
      perfil: "cliente",
    });
    const eu = login(p, { falhasDoPapel: 1 });
    const aviso = spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await eu.entrar();
    } finally {
      aviso.mockRestore();
    }
    await createCaller({
      ...contextoDeTeste({ db, papel: "admin", userId: ADMIN }),
      pessoas: eu.pessoas,
    }).admin.pessoas.definirPapel({ papel: "aluno", userId: p.userId });

    await eu.entrar();
    expect(await eu.papelNoLogin()).toBe("aluno");
    expect(eu.papeisGravados).toEqual(["aluno"]);
    expect((await conviteDe(id)).papelAplicadoEm).not.toBeNull();
  });

  test("o curso apagado depois do convite sai dele, e a chegada libera os outros", async () => {
    const p = pessoa();
    const [fica, some] = [await cursoDeTeste(), await cursoDeTeste()];
    await convidarComo(p.email, { cursoIds: [fica, some], perfil: "cliente" });
    await db.delete(curso).where(eq(curso.id, some));
    await login(p).entrar();

    expect((await liberacoesDe(p.userId)).map((l) => l.cursoId)).toEqual([
      fica,
    ]);
  });

  test("com o login fora na leitura da conta, nada se grava, e o acesso seguinte aplica o convite", async () => {
    const p = pessoa();
    const id = await convidarComo(p.email, { perfil: "cliente" });
    const eu = login(p);
    const aviso = spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await createCaller({
        ...contextoDeTeste({ db, userId: p.userId }),
        pessoas: {
          ...eu.pessoas,
          conta: () => Promise.reject(new Error("o login não respondeu")),
        },
      }).meusCursos.painel();
    } finally {
      aviso.mockRestore();
    }
    expect(await perfilDe(p.userId)).toBeUndefined();
    expect((await conviteDe(id)).aceitoEm).toBeNull();

    await eu.entrar();
    expect((await perfilDe(p.userId))?.perfil).toBe("cliente");
  });

  test("quem chega sem convite entra pela regra do e-mail, como antes", async () => {
    const p = pessoa("profills.com");
    const eu = login(p);
    await eu.entrar();

    expect(await perfilDe(p.userId)).toMatchObject({
      definidoPor: null,
      perfil: "funcionario",
    });
    expect(await bonusDe(p.userId)).toEqual([BONUS_DE_FUNCIONARIO]);
    expect(eu.papeisGravados).toEqual([]);
  });
});
