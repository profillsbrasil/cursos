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
      comunicados: [linha("a", "user_dona"), linha("b", "user_seed")],
      cursos: [],
    },
    [{ email: null, foto: null, nome: "Dona do admin", userId: "user_dona" }]
  );

  test("quem o Clerk conhece aparece pelo nome, e quem ele não conhece fica sem autor, nunca com o userId", () => {
    expect(comunicados.map((c) => c.publicadoPor)).toEqual([
      "Dona do admin",
      null,
    ]);
  });
});
