import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Glob } from "bun";

import { contextoDeTeste } from "./contexto-de-teste";
import {
  adminProcedure,
  ErroParaAPessoa,
  publicProcedure,
  router,
} from "./index";

const NEW_TRPC_ERROR = /new TRPCError\(/;

/** O erro do node-postgres, como o drizzle o deixa na cadeia de cause. */
const violou = (restricao: string) =>
  Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "23505",
    constraint: restricao,
  });

const rotas = router({
  codigoRepetido: adminProcedure.query(() => {
    throw violou("curso_codigo_key");
  }),
  doBanco: publicProcedure.query(() => {
    throw new TRPCError({
      code: "CONFLICT",
      message: 'Failed query: insert into "liberacao"',
    });
  }),
  liberacaoRepetida: adminProcedure.query(() => {
    throw violou("liberacao_curso_ativa_unica");
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
  slugRepetido: adminProcedure.query(() => {
    throw violou("curso_slug_key");
  }),
  versaoMudou: publicProcedure.query(() => {
    throw new ErroParaAPessoa({
      code: "CONFLICT",
      message: "Outra pessoa salvou este curso.",
      motivo: "versao_mudou",
    });
  }),
});

/** O corpo de erro que o cliente recebe pelo HTTP, depois do errorFormatter. */
async function erroDe(caminho: string) {
  const resposta = await fetchRequestHandler({
    createContext: () =>
      contextoDeTeste({ db: {} as never, papel: "admin", userId: "user_x" }),
    endpoint: "/api/trpc",
    onError: () => undefined,
    req: new Request(`http://localhost/api/trpc/${caminho}`),
    router: rotas,
  });
  const corpo = (await resposta.json()) as {
    error: {
      data: { code: string; motivo?: string | null; paraAPessoa?: boolean };
      message: string;
    };
  };
  return {
    code: corpo.error.data.code,
    message: corpo.error.message,
    motivo: corpo.error.data.motivo,
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
      motivo: null,
      paraAPessoa: true,
    });
  });

  test("TRPCError comum, erro solto e procedimento que não existe chegam sem a marca", async () => {
    const r = await Promise.all(
      ["doBanco", "quebrou", "naoExiste"].map(async (c) => {
        const { code, motivo, paraAPessoa } = await erroDe(c);
        return [code, paraAPessoa, motivo];
      })
    );
    expect(r).toEqual([
      ["CONFLICT", false, null],
      ["INTERNAL_SERVER_ERROR", false, null],
      ["NOT_FOUND", false, null],
    ]);
  });
});

describe("errorFormatter leva o motivo, que o editor lê sem ler o texto", () => {
  test("versao_mudou, slug e código repetidos chegam com motivos distintos e a mensagem para a pessoa", async () => {
    const r = await Promise.all(
      ["versaoMudou", "slugRepetido", "codigoRepetido"].map(erroDe)
    );
    expect(r).toEqual([
      {
        code: "CONFLICT",
        message: "Outra pessoa salvou este curso.",
        motivo: "versao_mudou",
        paraAPessoa: true,
      },
      {
        code: "CONFLICT",
        message: "Já existe um curso com este endereço.",
        motivo: "slug_repetido",
        paraAPessoa: true,
      },
      {
        code: "CONFLICT",
        message: "Já existe um curso com este código.",
        motivo: "codigo_repetido",
        paraAPessoa: true,
      },
    ]);
  });

  test("restrição traduzida sem motivo próprio chega marcada e com motivo null", async () => {
    expect(await erroDe("liberacaoRepetida")).toEqual({
      code: "CONFLICT",
      message: "A pessoa já tem este curso liberado.",
      motivo: null,
      paraAPessoa: true,
    });
  });
});
