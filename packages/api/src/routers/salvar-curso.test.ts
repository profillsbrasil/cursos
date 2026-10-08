// O caminho HTTP de admin.catalogo.salvarCurso: o fetch adapter do tRPC lê o corpo
// multipart/form-data e entrega o FormData ao procedure. Sem banco: o documento
// quebrado é recusado pelo leitor do formulário antes de qualquer consulta.

import { describe, expect, test } from "bun:test";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { contextoDeTeste } from "../contexto-de-teste";
import { appRouter } from "./index";

const db = {} as never;

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
  test("o FormData chega ao procedure e o documento quebrado vira BAD_REQUEST", async () => {
    const corpo = new FormData();
    corpo.set("documento", "{");
    corpo.set("capa", new Blob([new Uint8Array([1])]), "capa.jpg");

    const resposta = await enviar(corpo);
    const json = (await resposta.json()) as {
      error: { data: { code: string }; message: string };
    };

    expect(resposta.status).toBe(400);
    expect([json.error.data.code, json.error.message]).toEqual([
      "BAD_REQUEST",
      "O documento não é JSON.",
    ]);
  });
});
