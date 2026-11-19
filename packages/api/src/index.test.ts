import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Glob } from "bun";
import { z } from "zod";

import { ESPERA_ESGOTADA } from "./consultas/erros";
import { contextoDeTeste } from "./contexto-de-teste";
import {
  adminProcedure,
  ErroParaAPessoa,
  publicProcedure,
  router,
  traduzErroDoBanco,
} from "./index";

const erroDeNodePostgresNaCadeiaDeCause = (restricao: string) =>
  Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "23505",
    constraint: restricao,
  });

const lockTimeoutEmbrulhadoPeloDrizzle = () =>
  new Error('Failed query: insert into "cota_video"', {
    cause: Object.assign(new Error("canceling statement due to lock timeout"), {
      code: "55P03",
    }),
  });

const rotas = router({
  doBanco: publicProcedure.query(() => {
    throw new TRPCError({
      code: "CONFLICT",
      message: 'Failed query: insert into "liberacao"',
    });
  }),
  esperaEsgotada: publicProcedure.use(traduzErroDoBanco).query(() => {
    throw lockTimeoutEmbrulhadoPeloDrizzle();
  }),
  liberacaoRepetida: adminProcedure.query(() => {
    throw erroDeNodePostgresNaCadeiaDeCause("liberacao_curso_ativa_unica");
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
  versaoMudou: publicProcedure.query(() => {
    throw new ErroParaAPessoa({
      code: "CONFLICT",
      message: "Outra pessoa salvou este curso.",
      motivo: "versao_mudou",
    });
  }),
});

const CORPO_DO_ERRO = z.object({
  error: z.object({
    data: z.object({
      code: z.string(),
      motivo: z.string().nullish(),
      paraAPessoa: z.boolean().optional(),
    }),
    message: z.string(),
  }),
});

async function corpoDoErroNoHttpDepoisDoErrorFormatter(caminho: string) {
  const resposta = await fetchRequestHandler({
    createContext: () =>
      contextoDeTeste({ db: {} as never, papel: "admin", userId: "user_x" }),
    endpoint: "/api/trpc",
    onError: () => undefined,
    req: new Request(`http://localhost/api/trpc/${caminho}`),
    router: rotas,
  });

  const corpo = CORPO_DO_ERRO.parse(await resposta.json());

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
        readFileSync(join(import.meta.dir, arquivo), "utf8").includes(
          "new TRPCError("
        )
      );

    expect(comTRPCError).toEqual(["index.ts"]);
  });
});

describe("errorFormatter marca a mensagem escrita para a pessoa", () => {
  test("ErroParaAPessoa chega com paraAPessoa: true e o texto dela", async () => {
    expect(
      await corpoDoErroNoHttpDepoisDoErrorFormatter("paraAPessoa")
    ).toEqual({
      code: "CONFLICT",
      message: "O preço deste curso mudou.",
      motivo: null,
      paraAPessoa: true,
    });
  });

  test("TRPCError comum, erro solto e procedimento que não existe chegam sem a marca", async () => {
    const r = await Promise.all(
      ["doBanco", "quebrou", "naoExiste"].map(async (c) => {
        const { code, motivo, paraAPessoa } =
          await corpoDoErroNoHttpDepoisDoErrorFormatter(c);

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
  test("versao_mudou chega com o motivo e a mensagem para a pessoa", async () => {
    expect(
      await corpoDoErroNoHttpDepoisDoErrorFormatter("versaoMudou")
    ).toEqual({
      code: "CONFLICT",
      message: "Outra pessoa salvou este curso.",
      motivo: "versao_mudou",
      paraAPessoa: true,
    });
  });

  test("restrição traduzida sem motivo próprio chega marcada e com motivo null", async () => {
    expect(
      await corpoDoErroNoHttpDepoisDoErrorFormatter("liberacaoRepetida")
    ).toEqual({
      code: "CONFLICT",
      message: "A pessoa já tem este curso liberado.",
      motivo: null,
      paraAPessoa: true,
    });
  });

  test("lock_timeout (55P03) chega como TOO_MANY_REQUESTS, que o player tenta de novo", async () => {
    expect(
      await corpoDoErroNoHttpDepoisDoErrorFormatter("esperaEsgotada")
    ).toEqual({
      code: "TOO_MANY_REQUESTS",
      message: ESPERA_ESGOTADA.message,
      motivo: null,
      paraAPessoa: true,
    });
  });
});
