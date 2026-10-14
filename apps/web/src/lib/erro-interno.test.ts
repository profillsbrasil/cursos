import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { initTRPC, TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { registrarErroInterno } from "./erro-interno";

const t = initTRPC.context<{ auth: { userId: string } | null }>().create();
const router = t.router({
  ocupado: t.procedure.query(() => {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Outro pedido seu ainda está em andamento. Tente de novo.",
    });
  }),
  quebra: t.procedure.query(() => {
    throw new Error("violou aula_assistida_aula_id_aula_id_fkey");
  }),
  recusa: t.procedure.query(() => {
    throw new TRPCError({ code: "CONFLICT", message: "recusa de negócio" });
  }),
});

const chamar = (caminho: string) =>
  fetchRequestHandler({
    createContext: () => ({ auth: { userId: "user_teste" } }),
    endpoint: "/api/trpc",
    onError: registrarErroInterno,
    req: new Request(`http://localhost:3001/api/trpc/${caminho}`),
    router,
  });

describe("registrarErroInterno no fetchRequestHandler", () => {
  const log = spyOn(console, "error").mockImplementation(() => undefined);
  const aviso = spyOn(console, "warn").mockImplementation(() => undefined);
  afterEach(() => {
    log.mockClear();
    aviso.mockClear();
  });

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

  test("TOO_MANY_REQUESTS vai ao aviso com caminho e userId, sem o erro", async () => {
    const resposta = await chamar("ocupado");
    expect(resposta.status).toBe(429);
    expect(aviso.mock.calls).toEqual([
      ["tRPC ocupado TOO_MANY_REQUESTS user_teste"],
    ]);
    expect(log).not.toHaveBeenCalled();
  });

  test("recusa de negócio não vai ao log", async () => {
    const resposta = await chamar("recusa");
    expect(resposta.status).toBe(409);
    expect(log).not.toHaveBeenCalled();
    expect(aviso).not.toHaveBeenCalled();
  });
});
