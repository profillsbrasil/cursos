import { describe, expect, test } from "bun:test";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { z } from "zod";

import { bancoSemServidor, contextoDeTeste } from "../contexto-de-teste";
import { appRouter } from "./index";

const db = bancoSemServidor();

function enviar(corpo: FormData) {
  return fetchRequestHandler({
    createContext: () =>
      contextoDeTeste({ db, papel: "admin", userId: "user_admin" }),
    endpoint: "/api/trpc",
    req: new Request("http://localhost/api/trpc/admin.catalogo.salvarCurso", {
      body: corpo,
      method: "POST",
    }),
    router: appRouter,
  });
}

describe("salvarCurso por HTTP", () => {
  test("o fetch adapter lê o multipart/form-data, entrega o FormData ao procedure e o documento quebrado vira BAD_REQUEST sem tocar o banco", async () => {
    const corpo = new FormData();
    corpo.set("documento", "{");
    corpo.set("capa", new Blob([new Uint8Array([1])]), "capa.jpg");

    const resposta = await enviar(corpo);

    const json = z
      .object({
        error: z.object({
          data: z.object({ code: z.string() }),
          message: z.string(),
        }),
      })
      .parse(await resposta.json());

    expect(resposta.status).toBe(400);
    expect([json.error.data.code, json.error.message]).toEqual([
      "BAD_REQUEST",
      "O documento não é JSON.",
    ]);
  });
});
