import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { initTRPC, TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { registrarErroInterno } from "./erro-interno";

const t = initTRPC.create();
const router = t.router({
  quebra: t.procedure.query(() => {
    throw new Error("violou aula_assistida_aula_id_aula_id_fkey");
  }),
  recusa: t.procedure.query(() => {
    throw new TRPCError({ code: "CONFLICT", message: "recusa de negócio" });
  }),
});

const chamar = (caminho: string) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    onError: registrarErroInterno,
    req: new Request(`http://localhost:3001/api/trpc/${caminho}`),
    router,
  });

describe("registrarErroInterno no fetchRequestHandler", () => {
  const log = spyOn(console, "error").mockImplementation(() => undefined);
  afterEach(() => log.mockClear());

  test("INTERNAL_SERVER_ERROR vai ao log com caminho, código e causa", async () => {
    const resposta = await chamar("quebra");
    expect(resposta.status).toBe(500);
    expect(log).toHaveBeenCalledTimes(1);
    const [linha, erro] = log.mock.calls[0] ?? [];
    expect(linha).toBe("tRPC quebra INTERNAL_SERVER_ERROR");
    expect((erro as TRPCError).cause?.message).toBe(
      "violou aula_assistida_aula_id_aula_id_fkey"
    );
  });

  test("recusa de negócio não vai ao log", async () => {
    const resposta = await chamar("recusa");
    expect(resposta.status).toBe(409);
    expect(log).not.toHaveBeenCalled();
  });
});
