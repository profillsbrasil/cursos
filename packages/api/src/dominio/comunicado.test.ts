import { describe, expect, test } from "bun:test";

import { montarComunicados } from "./comunicado";
import type { ComunicadoId } from "./tipos";

const linha = (id: string, publicadoPor: string) => ({
  curso: null,
  id: id as ComunicadoId,
  publicadoEm: new Date("2026-10-01T12:00:00Z"),
  publicadoPor,
  texto: "Texto",
  titulo: `Comunicado ${id}`,
});

describe("autor do comunicado", () => {
  const { comunicados } = montarComunicados(
    {
      comunicados: [
        linha("a", "user_dona"),
        linha("b", "user_seed"),
        linha("c", "user_so_telefone"),
      ],
      cursos: [],
    },
    [
      { email: null, foto: null, nome: "Dona do admin", userId: "user_dona" },
      // Sem nome, usuário nem e-mail, o Clerk devolve o userId no lugar do nome.
      {
        email: null,
        foto: null,
        nome: "user_so_telefone",
        userId: "user_so_telefone",
      },
    ]
  );

  test("quem o Clerk conhece aparece pelo nome; quem ele não conhece ou conhece sem nome fica sem autor, nunca com o userId", () => {
    expect(comunicados.map((c) => c.publicadoPor)).toEqual([
      "Dona do admin",
      null,
      null,
    ]);
  });
});
