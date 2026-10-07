import { describe, expect, test } from "bun:test";

import { BancoNaoLocalError, garantirBancoLocal } from "./guarda-local";

const CITA_CLAUDE_MD = /seção Banco do CLAUDE\.md/;

describe("garantirBancoLocal", () => {
  test("recusa o pooler de transação do Supabase cloud", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://postgres.projeto:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
      )
    ).toThrow(BancoNaoLocalError);
  });

  test("recusa o session pooler na porta 5432", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://postgres.projeto:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
      )
    ).toThrow(BancoNaoLocalError);
  });

  test("recusa host local fora da porta do Supabase local", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
      )
    ).toThrow(BancoNaoLocalError);
  });

  test("recusa URL inválida", () => {
    expect(() => garantirBancoLocal("não é url")).toThrow(BancoNaoLocalError);
  });

  test("a mensagem cita a seção Banco do CLAUDE.md", () => {
    expect(() =>
      garantirBancoLocal(
        "postgresql://u:p@db.exemplo.supabase.co:5432/postgres"
      )
    ).toThrow(CITA_CLAUDE_MD);
  });

  test("aceita o Supabase local em 127.0.0.1 e localhost", () => {
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
        "postgresql://p:p@pooler.supabase.com:6543/postgres",
        null
      )
    ).toThrow(BancoNaoLocalError);
  });
});
