import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Glob } from "bun";

import { contextoDeTeste } from "./contexto-de-teste";
import { ErroParaAPessoa, publicProcedure, router } from "./index";

const NEW_TRPC_ERROR = /new TRPCError\(/;

const rotas = router({
  doBanco: publicProcedure.query(() => {
    throw new TRPCError({
      code: "CONFLICT",
      message: 'Failed query: insert into "liberacao"',
    });
  }),
  paraAPessoa: publicProcedure.query(() => {
    throw new ErroParaAPessoa({
      code: "CONFLICT",
      message: "O preço deste curso mudou.",
    });
  }),
  quebrou: publicProcedure.query(() => {
    throw new Error("connection terminated");
  }),
});

/** O corpo de erro que o cliente recebe pelo HTTP, depois do errorFormatter. */
async function erroDe(caminho: string) {
  const resposta = await fetchRequestHandler({
    createContext: () => contextoDeTeste({ db: {} as never, userId: null }),
    endpoint: "/api/trpc",
    onError: () => undefined,
    req: new Request(`http://localhost/api/trpc/${caminho}`),
    router: rotas,
  });
  const corpo = (await resposta.json()) as {
    error: { data: { code: string; paraAPessoa?: boolean }; message: string };
  };
  return {
    code: corpo.error.data.code,
    message: corpo.error.message,
    paraAPessoa: corpo.error.data.paraAPessoa,
  };
}

describe("recusa de negócio sai como ErroParaAPessoa", () => {
  test("só index.ts cria TRPCError direto (o UNAUTHORIZED, em inglês, sem mensagem para a pessoa)", () => {
    const comTRPCError = [...new Glob("**/*.ts").scanSync(import.meta.dir)]
      .filter((arquivo) => !arquivo.endsWith(".test.ts"))
      .filter((arquivo) =>
        NEW_TRPC_ERROR.test(
          readFileSync(join(import.meta.dir, arquivo), "utf8")
        )
      );
    expect(comTRPCError).toEqual(["index.ts"]);
  });
});

describe("errorFormatter marca a mensagem escrita para a pessoa", () => {
  test("ErroParaAPessoa chega com paraAPessoa: true e o texto dela", async () => {
    expect(await erroDe("paraAPessoa")).toEqual({
      code: "CONFLICT",
      message: "O preço deste curso mudou.",
      paraAPessoa: true,
    });
  });

  test("TRPCError comum, erro solto e procedimento que não existe chegam sem a marca", async () => {
    const r = await Promise.all(
      ["doBanco", "quebrou", "naoExiste"].map(async (c) => {
        const { code, paraAPessoa } = await erroDe(c);
        return [code, paraAPessoa];
      })
    );
    expect(r).toEqual([
      ["CONFLICT", false],
      ["INTERNAL_SERVER_ERROR", false],
      ["NOT_FOUND", false],
    ]);
  });
});
