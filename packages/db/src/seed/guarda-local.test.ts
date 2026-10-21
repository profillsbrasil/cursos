import { describe, expect, test } from "bun:test";

import { BancoNaoLocalError, garantirBancoLocal } from "./guarda-local";

const CITA_CLAUDE_MD = /seção Banco do CLAUDE\.md/;

describe("garantirBancoLocal", () => {
  test("recusa o proxy TCP do Postgres de dev da Railway", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://postgres:senha@exemplo.proxy.rlwy.net:41234/railway"
      )
    ).toThrow(BancoNaoLocalError);
  });

  test("recusa o Postgres de produção pela rede interna", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://postgres:senha@postgres.railway.internal:5432/railway"
      )
    ).toThrow(BancoNaoLocalError);
  });

  test("recusa host local fora da porta do Postgres local", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
      )
    ).toThrow(BancoNaoLocalError);
  });

  test("recusa host e porta sobrescritos pela query, que o pg usa no lugar dos do URL", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres?host=exemplo.proxy.rlwy.net&port=41234"
      )
    ).toThrow(BancoNaoLocalError);
    expect(() =>
      garantirBancoLocal(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable&port=6543",
        null
      )
    ).toThrow(BancoNaoLocalError);
  });

  test("recusa URL inválida", () => {
    expect(() => garantirBancoLocal("não é url")).toThrow(BancoNaoLocalError);
  });

  test("a mensagem cita a seção Banco do CLAUDE.md", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://u:p@exemplo.proxy.rlwy.net:41234/railway"
      )
    ).toThrow(CITA_CLAUDE_MD);
  });

  test("aceita o Postgres local em 127.0.0.1 e localhost", () => {
    expect(
      garantirBancoLocal(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      )
    ).toEqual({ host: "127.0.0.1", porta: "54322" });
    expect(
      garantirBancoLocal(
        "postgresql://postgres:postgres@localhost:54322/postgres"
      )
    ).toEqual({ host: "localhost", porta: "54322" });
  });

  test("com porta nula aceita qualquer porta, mas só em host local", () => {
    expect(
      garantirBancoLocal("postgresql://p:p@127.0.0.1:55499/postgres", null)
        .porta
    ).toBe("55499");
    expect(() =>
      garantirBancoLocal(
        "postgresql://p:p@exemplo.proxy.rlwy.net:41234/railway",
        null
      )
    ).toThrow(BancoNaoLocalError);
  });
});
