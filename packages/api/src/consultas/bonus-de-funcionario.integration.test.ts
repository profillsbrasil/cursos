import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import { perfilDaPessoa, pontoLancamento } from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { and, eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type { Perfil } from "../dominio/perfil";
import { BONUS_DE_FUNCIONARIO } from "../dominio/regras";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { Conta, Pessoa } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { perfilDe } from "./perfil";
import { linhasDoSaldo } from "./pontos";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ADMIN = `user_admin${S}`;

const conta = (userId: string, email: string): Conta => ({
  criadaEm: new Date("2026-10-01T12:00:00Z"),
  email,
  emailVerificado: true,
  foto: null,
  jeitosDeEntrar: [],
  nome: `Pessoa ${userId}`,
  papel: "aluno",
  ultimoAcesso: null,
  userId,
});

describe.skipIf(URL_TESTE === null)("bônus de funcionário", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const ids: string[] = [];
  const pessoas: Pessoa[] = [
    { email: null, foto: null, nome: "Admin", userId: ADMIN },
  ];

  const pessoa = () => {
    const userId = `user_bonus${S}${ids.length}`;
    ids.push(userId);
    pessoas.push({ email: null, foto: null, nome: `Pessoa ${userId}`, userId });
    return userId;
  };

  const admin = () =>
    createCaller(
      contextoDeTeste({ db, papel: "admin", pessoas, userId: ADMIN })
    );

  const mudar = (userId: string, perfil: Perfil) =>
    admin().admin.pessoas.definirPerfil({ perfil, userId });

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

  const semana = () => segundaDaSemana(diaLocal(new Date()));

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, ids));
    await db.delete(perfilDaPessoa).where(inArray(perfilDaPessoa.userId, ids));
    await db.$client.end();
  });

  test("o primeiro acesso com e-mail da empresa dá o bônus, fora dos pontos da semana", async () => {
    const userId = pessoa();
    const ler = () => Promise.resolve(conta(userId, "bia@profills.com"));
    expect(await perfilDe(db, userId, ler)).toBe("funcionario");
    expect(await perfilDe(db, userId, ler)).toBe("funcionario");
    expect(await bonusDe(userId)).toEqual([BONUS_DE_FUNCIONARIO]);
    expect(await linhasDoSaldo(db, userId, semana())).toEqual({
      entradasDaSemana: 0,
      saldo: BONUS_DE_FUNCIONARIO,
    });
  });

  test("o primeiro acesso de outro e-mail não dá o bônus", async () => {
    const userId = pessoa();
    const ler = () => Promise.resolve(conta(userId, "caio@cliente.example"));
    expect(await perfilDe(db, userId, ler)).toBe("publico");
    expect(await bonusDe(userId)).toEqual([]);
  });

  test("dois primeiros acessos ao mesmo tempo dão um bônus só", async () => {
    const userId = pessoa();
    const ler = () => Promise.resolve(conta(userId, "duda@profills.com"));
    const lidos = await Promise.all([
      perfilDe(db, userId, ler),
      perfilDe(db, userId, ler),
    ]);
    expect(lidos).toEqual(["funcionario", "funcionario"]);
    expect(await bonusDe(userId)).toEqual([BONUS_DE_FUNCIONARIO]);
  });

  test("o admin muda Público aberto para Funcionário e o bônus nasce, uma vez", async () => {
    const userId = pessoa();
    const ler = () => Promise.resolve(conta(userId, "eva@cliente.example"));
    expect(await perfilDe(db, userId, ler)).toBe("publico");
    expect(await mudar(userId, "funcionario")).toEqual({
      bonus: true,
      perfil: "funcionario",
    });
    expect(await mudar(userId, "funcionario")).toEqual({
      bonus: false,
      perfil: "funcionario",
    });
    expect(await bonusDe(userId)).toEqual([BONUS_DE_FUNCIONARIO]);
    const ficha = await admin().admin.pessoas.ficha({ userId });
    expect(ficha?.pontos.saldo).toBe(BONUS_DE_FUNCIONARIO);
  });

  test("sair de Funcionário e voltar não dá o bônus de novo", async () => {
    const userId = pessoa();
    expect((await mudar(userId, "funcionario")).bonus).toBe(true);
    expect(await mudar(userId, "cliente")).toEqual({
      bonus: false,
      perfil: "cliente",
    });
    expect((await mudar(userId, "funcionario")).bonus).toBe(false);
    expect(await bonusDe(userId)).toEqual([BONUS_DE_FUNCIONARIO]);
  });

  test("duas mudanças para Funcionário ao mesmo tempo dão um bônus só", async () => {
    const userId = pessoa();
    const r = await Promise.all([
      mudar(userId, "funcionario"),
      mudar(userId, "funcionario"),
    ]);
    expect(r.map((x) => x.bonus).sort()).toEqual([false, true]);
    expect(await bonusDe(userId)).toEqual([BONUS_DE_FUNCIONARIO]);
  });

  test("o bônus não muda os pontos da semana de quem estuda", async () => {
    const userId = pessoa();
    await db.insert(pontoLancamento).values({
      criadoEm: new Date(),
      diaMarco: diaLocal(new Date()),
      motivo: "sequencia_7_dias",
      pontos: 30,
      userId,
    });
    await mudar(userId, "funcionario");
    expect(await linhasDoSaldo(db, userId, semana())).toEqual({
      entradasDaSemana: 30,
      saldo: 30 + BONUS_DE_FUNCIONARIO,
    });
  });
});
