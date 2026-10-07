import { describe, expect, test } from "bun:test";

import { createCaller } from "./index";

const caller = createCaller({ auth: { userId: "user_x" }, db: {} as never });
const FORA_DO_FORMATO = ["Comercial", "comercial.", "a_b", "%C3%A7urso"];
const AULA = "00000000-0000-4000-8000-000000000000";

describe("aula com slug fora do formato", () => {
  test("entrada devolve null, como curso que não existe", async () => {
    const r = await Promise.all(
      FORA_DO_FORMATO.map((slug) => caller.aula.entrada({ slug }))
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
