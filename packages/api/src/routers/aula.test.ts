import { describe, expect, test } from "bun:test";

import { contextoDeTeste } from "../contexto-de-teste";
import { createCaller } from "./index";

// O banco só sabe ler o perfil já gravado, que o alunoProcedure lê antes do input:
// o slug fora do formato não chega a nenhuma outra consulta.
const soOPerfil = {
  query: {
    perfilDaPessoa: {
      findFirst: () => Promise.resolve({ perfil: "publico" }),
    },
  },
};
const caller = createCaller(
  contextoDeTeste({ db: soOPerfil as never, userId: "user_x" })
);
const FORA_DO_FORMATO = ["Comercial", "comercial.", "a_b", "%C3%A7urso"];
const AULA = "00000000-0000-4000-8000-000000000000";

describe("slug fora do formato", () => {
  test("a página do curso devolve null, como curso que não existe", async () => {
    const r = await Promise.all(
      FORA_DO_FORMATO.map((slug) => caller.curso.pagina({ slug }))
    );
    expect(r).toEqual([null, null, null, null]);
  });

  test("abrir devolve null, como aula que não existe", async () => {
    const r = await Promise.all(
      FORA_DO_FORMATO.map((slug) => caller.aula.abrir({ aulaId: AULA, slug }))
    );
    expect(r).toEqual([null, null, null, null]);
  });
});

describe("aula com aulaId fora do formato", () => {
  test("abrir devolve null, como aula que não existe", async () => {
    const r = await caller.aula.abrir({ aulaId: "nao-e-uuid", slug: "curso" });
    expect(r).toBeNull();
  });
});
