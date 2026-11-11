import { afterAll, describe, expect, spyOn, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import { convite, conviteCurso, curso } from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { eq, inArray } from "drizzle-orm";

import { contextoDeTeste, convitesDeTeste } from "../contexto-de-teste";
import { type Email, lerEmail } from "../dominio/convite";
import type { AdminId, ConviteId, CursoId, Pessoa } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import {
  cancelarConvite,
  convidar,
  linhasDosConvites,
  reenviarConvite,
} from "./convite";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const ADMIN = `user_adminconvite${S}` as AdminId;
const OUTRO_ADMIN = `user_outroadmin${S}` as AdminId;
const AGORA = new Date("2026-11-11T15:00:00Z");
const MIN = 60_000;
const DIA = 86_400_000;

/** Um e-mail só deste teste e desta execução: o banco local é dividido entre worktrees. */
const email = (nome: string) => `${nome}.${hex()}@convite${S}.com` as Email;

const semConta = { contasCom: () => Promise.resolve(new Map<Email, string>()) };

const recusa = (promessa: Promise<unknown>) =>
  promessa.then(
    () => "passou",
    (e: unknown) =>
      e instanceof ErroParaAPessoa ? [e.code, e.message] : String(e)
  );

describe.skipIf(URL_TESTE === null)("convite pelo admin", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const cursos: string[] = [];

  async function cursoDeTeste(titulo: string): Promise<CursoId> {
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
        slug: `convite-${s}`,
        status: "publicado",
        titulo: `${titulo} ${s}`,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id);
    return c.id as CursoId;
  }

  const linhaDe = async (e: Email) => {
    const linhas = await db.select().from(convite).where(eq(convite.email, e));
    return linhas;
  };

  const umaLinha = async (e: Email) => {
    const [linha] = await linhaDe(e);
    if (!linha) {
      throw new Error(`sem convite para ${e}`);
    }
    return linha;
  };

  const pedido = (emails: Email[], cursoIds: CursoId[] = []) => ({
    comoAdmin: false,
    cursoIds,
    emails,
    perfil: "cliente" as const,
  });

  afterAll(async () => {
    await db
      .delete(convite)
      .where(inArray(convite.convidadoPor, [ADMIN, OUTRO_ADMIN]));
    if (cursos.length > 0) {
      await db.delete(curso).where(inArray(curso.id, cursos));
    }
    await db.$client.end();
  });

  test("o e-mail novo ganha a linha, os cursos e o envio; o de quem já tem conta não", async () => {
    const [ana, bia] = [email("ana"), email("bia")];
    const cursoId = await cursoDeTeste("Envase");
    const carteiro = convitesDeTeste();
    const r = await convidar(
      db,
      {
        convites: carteiro,
        pessoas: {
          contasCom: () => Promise.resolve(new Map([[bia, "user_bia"]])),
        },
      },
      ADMIN,
      { ...pedido([ana, bia], [cursoId]), comoAdmin: true },
      AGORA
    );
    expect(r.convites).toEqual([
      { email: ana, tipo: "enviado" },
      { email: bia, tipo: "ja_tem_conta", userId: "user_bia" },
    ]);
    expect(carteiro.enviados).toEqual([
      { clerkConviteId: "inv_teste1", email: ana },
    ]);
    expect(await umaLinha(ana)).toMatchObject({
      aceitoEm: null,
      canceladoEm: null,
      clerkConviteId: "inv_teste1",
      comoAdmin: true,
      convidadoEm: AGORA,
      convidadoPor: ADMIN,
      enviadoEm: AGORA,
      expiraEm: new Date(AGORA.getTime() + 30 * DIA),
      perfil: "cliente",
    });
    const doConvite = await db
      .select({ cursoId: conviteCurso.cursoId })
      .from(conviteCurso)
      .where(eq(conviteCurso.conviteId, (await umaLinha(ana)).id));
    expect(doConvite).toEqual([{ cursoId }]);
    expect(await linhaDe(bia)).toEqual([]);
  });

  test("ana@ é convidada mesmo com a conta de diana@ no login", async () => {
    const sufixo = `${hex()}@convite${S}.com`;
    const [ana, diana] = [`ana.${sufixo}` as Email, `diana.${sufixo}` as Email];
    const ctx = contextoDeTeste({
      db,
      papel: "admin",
      pessoas: [
        { email: diana, foto: null, nome: "Diana", userId: "user_diana" },
      ],
      userId: ADMIN,
    });
    const r = await createCaller(ctx).admin.convites.enviar(
      pedido([ana, diana])
    );
    expect(r.convites).toEqual([
      { email: ana, tipo: "enviado" },
      { email: diana, tipo: "ja_tem_conta", userId: "user_diana" },
    ]);
  });

  test("enviar duas vezes o mesmo pedido grava uma vez e manda um e-mail", async () => {
    const [ana, bia] = [email("ana"), email("bia")];
    const carteiro = convitesDeTeste(new Map([[bia, "erro"]]));
    const portas = { convites: carteiro, pessoas: semConta };
    const erro = spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const primeira = await convidar(
        db,
        portas,
        ADMIN,
        pedido([ana, bia, ana]),
        AGORA
      );
      expect(primeira.convites).toEqual([
        { email: ana, tipo: "enviado" },
        { email: bia, motivo: { tipo: "falha" }, tipo: "nao_enviado" },
      ]);
    } finally {
      erro.mockRestore();
    }
    const segunda = await convidar(
      db,
      portas,
      OUTRO_ADMIN,
      { ...pedido([ana, bia]), perfil: "funcionario" },
      new Date(AGORA.getTime() + MIN)
    );
    expect(segunda.convites).toEqual([
      { email: ana, enviado: true, tipo: "ja_convidado" },
      { email: bia, enviado: false, tipo: "ja_convidado" },
    ]);
    expect(carteiro.enviados.map((e) => e.email)).toEqual([ana]);
    expect(await linhaDe(ana)).toHaveLength(1);
    expect(await umaLinha(ana)).toMatchObject({
      convidadoPor: ADMIN,
      perfil: "cliente",
    });
    expect(await umaLinha(bia)).toMatchObject({
      clerkConviteId: null,
      enviadoEm: null,
    });
  });

  test("dois admins convidando o mesmo e-mail ao mesmo tempo gravam um convite", async () => {
    const ana = email("ana");
    const carteiro = convitesDeTeste();
    const portas = { convites: carteiro, pessoas: semConta };
    const [a, b] = await Promise.all([
      convidar(db, portas, ADMIN, pedido([ana]), AGORA),
      convidar(db, portas, OUTRO_ADMIN, pedido([ana]), AGORA),
    ]);
    const tipos = [a.convites[0]?.tipo, b.convites[0]?.tipo].sort();
    expect(tipos).toEqual(["enviado", "ja_convidado"]);
    expect(await linhaDe(ana)).toHaveLength(1);
    expect(carteiro.enviados).toHaveLength(1);
  });

  test("o 429 no meio do lote para os envios e guarda os que faltam", async () => {
    const lote = ["a", "b", "c", "d", "e"].map(email);
    const [a, b, c, d, e] = lote as [Email, Email, Email, Email, Email];
    const carteiro = convitesDeTeste(new Map([[c, "limite"]]));
    const pedidos: string[] = [];
    const r = await convidar(
      db,
      {
        convites: {
          ...carteiro,
          enviar: (destino, agora) => {
            pedidos.push(destino);
            return carteiro.enviar(destino, agora);
          },
        },
        pessoas: semConta,
      },
      ADMIN,
      pedido(lote),
      AGORA
    );
    const limite = {
      motivo: { tentarEm: "2026-11-11T16:00:00.000Z", tipo: "limite" },
      tipo: "nao_enviado",
    };
    expect<unknown>(r.convites).toEqual([
      { email: a, tipo: "enviado" },
      { email: b, tipo: "enviado" },
      { email: c, ...limite },
      { email: d, ...limite },
      { email: e, ...limite },
    ]);
    expect(pedidos).toEqual([a, b, c]);
    const guardados = await Promise.all([c, d, e].map(umaLinha));
    expect(guardados.map((l) => [l.enviadoEm, l.clerkConviteId])).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  test("com o login fora na checagem das contas, recusa sem gravar nem enviar", async () => {
    const ana = email("ana");
    const carteiro = convitesDeTeste();
    expect(
      await recusa(
        convidar(
          db,
          {
            convites: carteiro,
            pessoas: {
              contasCom: () => Promise.reject(new Error("Clerk fora")),
            },
          },
          ADMIN,
          pedido([ana]),
          AGORA
        )
      )
    ).toEqual([
      "SERVICE_UNAVAILABLE",
      "O login da plataforma não respondeu. Nenhum convite foi criado.",
    ]);
    expect(await linhaDe(ana)).toEqual([]);
    expect(carteiro.enviados).toEqual([]);
  });

  test("curso que sumiu recusa o pedido inteiro, sem gravar nem enviar", async () => {
    const [ana, bia] = [email("ana"), email("bia")];
    const carteiro = convitesDeTeste();
    expect(
      await recusa(
        convidar(
          db,
          { convites: carteiro, pessoas: semConta },
          ADMIN,
          pedido(
            [ana, bia],
            ["00000000-0000-4000-8000-000000000000" as CursoId]
          ),
          AGORA
        )
      )
    ).toEqual([
      "NOT_FOUND",
      "Um dos cursos escolhidos não existe mais. Nenhum convite foi criado.",
    ]);
    expect(await linhaDe(ana)).toEqual([]);
    expect(await linhaDe(bia)).toEqual([]);
    expect(carteiro.enviados).toEqual([]);
  });

  test("dar o papel de admin pelo convite pede que quem convida ainda seja admin no login", async () => {
    const ana = email("ana");
    const eu = (
      papel: "admin" | "aluno"
    ): Pessoa & { papel: typeof papel } => ({
      email: "dono@profills.com",
      foto: null,
      nome: "Dono",
      papel,
      userId: ADMIN,
    });
    const chamar = (papel: "admin" | "aluno", comoAdmin: boolean) =>
      createCaller(
        contextoDeTeste({
          db,
          papel: "admin",
          pessoas: [eu(papel)],
          userId: ADMIN,
        })
      ).admin.convites.enviar({ ...pedido([ana]), comoAdmin });
    expect(await recusa(chamar("aluno", true))).toEqual([
      "FORBIDDEN",
      "Você não é mais admin.",
    ]);
    expect(await linhaDe(ana)).toEqual([]);
    expect((await chamar("admin", true)).convites).toEqual([
      { email: ana, tipo: "enviado" },
    ]);
    expect((await umaLinha(ana)).comoAdmin).toBe(true);
  });

  describe("reenviar", () => {
    async function convidado(falhas?: Map<string, "erro" | "limite">) {
      const destino = email("reenvio");
      const carteiro = convitesDeTeste(falhas);
      await convidar(
        db,
        { convites: carteiro, pessoas: semConta },
        ADMIN,
        pedido([destino]),
        AGORA
      );
      const linha = await umaLinha(destino);
      return { carteiro, destino, id: linha.id as ConviteId, linha };
    }

    test("dentro de 60 s devolve o envio que existe, sem outro e-mail", async () => {
      const { carteiro, destino, id, linha } = await convidado();
      const r = await reenviarConvite(
        db,
        carteiro,
        id,
        new Date(AGORA.getTime() + 59_000)
      );
      expect(r).toEqual({ enviadoEm: AGORA });
      expect(carteiro.enviados).toHaveLength(1);
      expect(carteiro.revogados).toEqual([]);
      expect(await umaLinha(destino)).toEqual(linha);
    });

    test("depois de 60 s manda outro link, renova a validade e revoga o anterior", async () => {
      const { carteiro, destino, id } = await convidado();
      const depois = new Date(AGORA.getTime() + 3 * DIA);
      expect(await reenviarConvite(db, carteiro, id, depois)).toEqual({
        enviadoEm: depois,
      });
      expect(carteiro.enviados.map((e) => e.clerkConviteId)).toEqual([
        "inv_teste1",
        "inv_teste2",
      ]);
      expect(carteiro.revogados).toEqual(["inv_teste1"]);
      expect(await umaLinha(destino)).toMatchObject({
        clerkConviteId: "inv_teste2",
        enviadoEm: depois,
        expiraEm: new Date(depois.getTime() + 30 * DIA),
      });
    });

    test("o convite expirado e o não enviado se reenviam pelo mesmo caminho", async () => {
      const falhas = new Map<string, "erro" | "limite">();
      const destino = email("naoenviado");
      falhas.set(destino, "limite");
      const carteiro = convitesDeTeste(falhas);
      await convidar(
        db,
        { convites: carteiro, pessoas: semConta },
        ADMIN,
        pedido([destino]),
        AGORA
      );
      const id = (await umaLinha(destino)).id as ConviteId;
      falhas.clear();
      const vencido = new Date(AGORA.getTime() + 40 * DIA);
      await reenviarConvite(db, carteiro, id, vencido);
      expect(await umaLinha(destino)).toMatchObject({
        clerkConviteId: "inv_teste1",
        enviadoEm: vencido,
        expiraEm: new Date(vencido.getTime() + 30 * DIA),
      });
      expect(carteiro.revogados).toEqual([]);
    });

    test("com o Clerk recusando, pelo limite ou por falha, a linha fica como estava", async () => {
      const falhas = new Map<string, "erro" | "limite">();
      const { carteiro, destino, id, linha } = await convidado(falhas);
      const depois = new Date(AGORA.getTime() + 3 * DIA);
      falhas.set(destino, "limite");
      expect(await recusa(reenviarConvite(db, carteiro, id, depois))).toEqual([
        "TOO_MANY_REQUESTS",
        // 3 dias depois das 15h UTC, mais a hora do Retry-After: 13h em São Paulo.
        "O limite de envios desta hora acabou. Tente de novo depois das 13h00.",
      ]);
      falhas.set(destino, "erro");
      expect(await recusa(reenviarConvite(db, carteiro, id, depois))).toEqual([
        "SERVICE_UNAVAILABLE",
        "O e-mail não saiu. O convite ficou como estava.",
      ]);
      expect(await umaLinha(destino)).toEqual(linha);
      expect(carteiro.revogados).toEqual([]);
    });

    test("convite cancelado, aceito ou que não existe recusa sem mandar e-mail", async () => {
      const cancelado = await convidado();
      await cancelarConvite(db, cancelado.carteiro, ADMIN, cancelado.id, AGORA);
      const aceito = await convidado();
      await db
        .update(convite)
        .set({ aceitoEm: AGORA, aceitoPor: `user_aceitou${hex()}` })
        .where(eq(convite.id, aceito.id));
      const depois = new Date(AGORA.getTime() + DIA);
      expect(
        await recusa(
          reenviarConvite(db, cancelado.carteiro, cancelado.id, depois)
        )
      ).toEqual(["PRECONDITION_FAILED", "Este convite foi cancelado."]);
      expect(
        await recusa(reenviarConvite(db, aceito.carteiro, aceito.id, depois))
      ).toEqual(["PRECONDITION_FAILED", "Esta pessoa já aceitou o convite."]);
      expect(
        await recusa(
          reenviarConvite(
            db,
            aceito.carteiro,
            "00000000-0000-4000-8000-000000000000" as ConviteId,
            depois
          )
        )
      ).toEqual(["NOT_FOUND", "Este convite não existe."]);
      expect(cancelado.carteiro.enviados).toHaveLength(1);
      expect(aceito.carteiro.enviados).toHaveLength(1);
    });

    test("cancelado enquanto o Clerk respondia: o link novo é revogado e o reenvio recusa", async () => {
      const { carteiro, destino, id } = await convidado();
      const depois = new Date(AGORA.getTime() + DIA);
      const cancelaNoMeio = {
        ...carteiro,
        enviar: async (para: Email, agora: Date) => {
          const r = await carteiro.enviar(para, agora);
          await cancelarConvite(db, convitesDeTeste(), ADMIN, id, agora);
          return r;
        },
      };
      expect(
        await recusa(reenviarConvite(db, cancelaNoMeio, id, depois))
      ).toEqual(["PRECONDITION_FAILED", "Este convite foi cancelado."]);
      expect(carteiro.revogados).toEqual(["inv_teste2"]);
      expect(await umaLinha(destino)).toMatchObject({
        canceladoEm: depois,
        clerkConviteId: "inv_teste1",
        enviadoEm: AGORA,
      });
    });
  });

  describe("cancelar", () => {
    test("cancela, revoga o link, e cancelar de novo não muda a linha", async () => {
      const destino = email("cancelar");
      const carteiro = convitesDeTeste();
      await convidar(
        db,
        { convites: carteiro, pessoas: semConta },
        ADMIN,
        pedido([destino]),
        AGORA
      );
      const id = (await umaLinha(destino)).id as ConviteId;
      const depois = new Date(AGORA.getTime() + MIN);
      expect(
        await cancelarConvite(db, carteiro, OUTRO_ADMIN, id, depois)
      ).toEqual({ cancelado: true });
      const cancelada = await umaLinha(destino);
      expect(cancelada).toMatchObject({
        canceladoEm: depois,
        canceladoPor: OUTRO_ADMIN,
      });
      expect(
        await cancelarConvite(
          db,
          carteiro,
          ADMIN,
          id,
          new Date(depois.getTime() + MIN)
        )
      ).toEqual({ cancelado: false });
      expect(await umaLinha(destino)).toEqual(cancelada);
      expect(carteiro.revogados).toEqual(["inv_teste1", "inv_teste1"]);
    });

    test("o e-mail do convite cancelado pode ser convidado de novo", async () => {
      const destino = email("denovo");
      const portas = { convites: convitesDeTeste(), pessoas: semConta };
      await convidar(db, portas, ADMIN, pedido([destino]), AGORA);
      const [primeiro] = await linhaDe(destino);
      await cancelarConvite(
        db,
        portas.convites,
        ADMIN,
        primeiro?.id as ConviteId,
        AGORA
      );
      const r = await convidar(
        db,
        portas,
        ADMIN,
        { ...pedido([destino]), perfil: "funcionario" },
        AGORA
      );
      expect(r.convites).toEqual([{ email: destino, tipo: "enviado" }]);
      const linhas = await linhaDe(destino);
      expect(
        linhas.map((l) => [l.perfil, l.canceladoEm !== null]).sort()
      ).toEqual([
        ["cliente", true],
        ["funcionario", false],
      ]);
    });

    test("convite aceito recusa e manda para a ficha; o que não existe recusa", async () => {
      const destino = email("aceito");
      const carteiro = convitesDeTeste();
      await convidar(
        db,
        { convites: carteiro, pessoas: semConta },
        ADMIN,
        pedido([destino]),
        AGORA
      );
      const id = (await umaLinha(destino)).id as ConviteId;
      await db
        .update(convite)
        .set({ aceitoEm: AGORA, aceitoPor: `user_aceitou${hex()}` })
        .where(eq(convite.id, id));
      expect(
        await recusa(cancelarConvite(db, carteiro, ADMIN, id, AGORA))
      ).toEqual([
        "PRECONDITION_FAILED",
        "Esta pessoa já aceitou o convite. Mude na ficha dela.",
      ]);
      expect(
        await recusa(
          cancelarConvite(
            db,
            carteiro,
            ADMIN,
            "00000000-0000-4000-8000-000000000000" as ConviteId,
            AGORA
          )
        )
      ).toEqual(["NOT_FOUND", "Este convite não existe."]);
      expect(carteiro.revogados).toEqual([]);
      expect((await umaLinha(destino)).canceladoEm).toBeNull();
    });
  });

  describe("a opção Convidados", () => {
    test("lista os vivos que casam o trecho do e-mail, do mais novo ao mais antigo, com os cursos", async () => {
      const marca = `lista${hex()}`;
      const [velho, novo, cancelado, aceito] = [
        "velho",
        "novo",
        "cancelado",
        "aceito",
      ].map((nome) => `${nome}.${marca}@convite${S}.com` as Email) as [
        Email,
        Email,
        Email,
        Email,
      ];
      const [envase, rotulagem] = [
        await cursoDeTeste("Envase"),
        await cursoDeTeste("Rotulagem"),
      ];
      const portas = { convites: convitesDeTeste(), pessoas: semConta };
      await convidar(db, portas, ADMIN, pedido([velho]), AGORA);
      await convidar(
        db,
        portas,
        ADMIN,
        { ...pedido([novo, cancelado, aceito], [rotulagem, envase]) },
        new Date(AGORA.getTime() + MIN)
      );
      await cancelarConvite(
        db,
        portas.convites,
        ADMIN,
        (await umaLinha(cancelado)).id as ConviteId,
        AGORA
      );
      await db
        .update(convite)
        .set({ aceitoEm: AGORA, aceitoPor: `user_aceitou${hex()}` })
        .where(eq(convite.email, aceito));

      const linhas = await linhasDosConvites(db, marca.toUpperCase());
      expect(linhas.convidados.map((c) => c.email)).toEqual([novo, velho]);
      expect(linhas.convidados[0]?.cursos.map((c) => c.id)).toEqual([
        envase,
        rotulagem,
      ]);
      expect(linhas.convidados[1]?.cursos).toEqual([]);
      expect(linhas.total).toBeGreaterThanOrEqual(2);
      expect(linhas.cursos.map((c) => c.id)).toEqual(
        expect.arrayContaining([envase, rotulagem])
      );
    });

    test("o % e o _ do termo casam o próprio caractere", async () => {
      const marca = `curinga${hex()}`;
      const comSublinhado = `a_b.${marca}@convite${S}.com` as Email;
      const semSublinhado = `axb.${marca}@convite${S}.com` as Email;
      await convidar(
        db,
        { convites: convitesDeTeste(), pessoas: semConta },
        ADMIN,
        pedido([comSublinhado, semSublinhado]),
        AGORA
      );
      const linhas = await linhasDosConvites(db, `a_b.${marca}`);
      expect(linhas.convidados.map((c) => c.email)).toEqual([comSublinhado]);
      expect((await linhasDosConvites(db, `%${marca}%`)).convidados).toEqual(
        []
      );
    });

    test("o painel do admin sai com o estado e o dia de cada convidado", async () => {
      const marca = `painel${hex()}`;
      const destino = `ana.${marca}@convite${S}.com` as Email;
      const admin = createCaller(
        contextoDeTeste({ db, papel: "admin", userId: ADMIN })
      );
      await admin.admin.convites.enviar(pedido([destino]));
      const painel = await admin.admin.convites.painel({ termo: marca });
      expect(painel.convidados).toHaveLength(1);
      expect(painel.convidados[0]).toMatchObject({
        comoAdmin: false,
        cursos: [],
        email: destino,
        estado: { enviadoEm: painel.hoje, tipo: "pendente" },
        perfil: "cliente",
      });
    });
  });

  test("lerEmail e o check convite_email_formato aceitam e recusam os mesmos textos", async () => {
    const textos = [
      `ana.${hex()}@convite${S}.com`,
      `Ana.${hex()}@Convite${S}.com`,
      ` ana.${hex()}@convite${S}.com`,
      `ana.${hex()}@convite${S}`,
      `ana ${hex()}@convite${S}.com`,
      `ana.${hex()}@@convite${S}.com`,
      `@convite${S}.com`,
      `${"a".repeat(250)}@convite${S}.com`,
    ];
    const noBanco = await Promise.all(
      textos.map((texto) =>
        db
          .insert(convite)
          .values({
            comoAdmin: false,
            convidadoPor: ADMIN,
            email: texto,
            expiraEm: AGORA,
            perfil: "publico",
          })
          .then(
            () => true,
            () => false
          )
      )
    );
    expect(noBanco).toEqual(textos.map((texto) => lerEmail(texto) === texto));
  });
});
