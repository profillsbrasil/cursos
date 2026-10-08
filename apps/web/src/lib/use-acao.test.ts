import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TRPCClientError } from "@trpc/client";
import { Glob } from "bun";

import { type OpcoesDaAcao, rodarAcao } from "./use-acao";

function erroDoServidor(code: string, message: string, paraAPessoa: boolean) {
  return new TRPCClientError(message, {
    result: {
      error: { code: -32_000, data: { code, paraAPessoa }, message },
    },
  });
}

/** Roda a ação com efeitos falsos e devolve, em ordem, tudo o que ela fez. */
async function rodar<T>(fazer: () => Promise<T>, opcoes: OpcoesDaAcao<T>) {
  const feito: string[] = [];
  await rodarAcao(
    fazer,
    {
      ...opcoes,
      depois: (r) => {
        feito.push(`depois:${String(r)}`);
        opcoes.depois?.(r);
      },
    },
    {
      atualizar: () => feito.push("atualizar"),
      toast: {
        error: (texto) => feito.push(`erro:${texto}`),
        success: (texto) => feito.push(`sucesso:${texto}`),
      },
    }
  );
  return feito;
}

const GENERICO = "erro:Não deu para salvar. Tente de novo em instantes.";

describe("rodarAcao", () => {
  test("no sucesso mostra o toast, roda depois e recarrega a página", async () => {
    expect(
      await rodar(() => Promise.resolve("ok"), { sucesso: "Liberado." })
    ).toEqual(["sucesso:Liberado.", "depois:ok", "atualizar"]);
  });

  test("o texto de sucesso pode depender do resultado", async () => {
    expect(
      await rodar(() => Promise.resolve(false), {
        sucesso: (nova) => (nova ? "Liberado." : "Já estava liberado."),
      })
    ).toEqual(["sucesso:Já estava liberado.", "depois:false", "atualizar"]);
  });

  test("na recusa marcada mostra a mensagem do servidor, não roda depois e recarrega", async () => {
    const recusa = erroDoServidor("CONFLICT", "O preço mudou.", true);
    expect(
      await rodar(() => Promise.reject(recusa), { sucesso: "Trocado." })
    ).toEqual(["erro:O preço mudou.", "atualizar"]);
  });

  test("erro sem a marca mostra o texto genérico, mesmo com código de recusa", async () => {
    const semMarca = [
      erroDoServidor("NOT_FOUND", 'No procedure found on path "x"', false),
      erroDoServidor("BAD_REQUEST", "Invalid input", false),
      new Error("Failed to fetch"),
    ];
    const toasts = await Promise.all(
      semMarca.map(async (e) => (await rodar(() => Promise.reject(e), {}))[0])
    );
    expect(toasts).toEqual([GENERICO, GENERICO, GENERICO]);
    expect(
      await rodar(() => Promise.reject(semMarca[0]), {
        erro: "Confira o saldo.",
      })
    ).toEqual(["erro:Confira o saldo.", "atualizar"]);
  });

  test("com naRecusa, a recusa mostra o toast, entrega o erro e não recarrega", async () => {
    const recusa = erroDoServidor("CONFLICT", "Outra pessoa salvou.", true);
    const recebidos: unknown[] = [];
    expect(
      await rodar(() => Promise.reject(recusa), {
        naRecusa: (e) => recebidos.push(e),
      })
    ).toEqual(["erro:Outra pessoa salvou."]);
    expect(recebidos).toEqual([recusa]);
  });

  test("com naRecusa, o sucesso ainda recarrega", async () => {
    expect(
      await rodar(() => Promise.resolve("ok"), {
        naRecusa: () => undefined,
        sucesso: "Curso salvo.",
      })
    ).toEqual(["sucesso:Curso salvo.", "depois:ok", "atualizar"]);
  });
});

const SRC = join(import.meta.dir, "..");
const MUTACAO = /\.mutate\(|useMutation\(/;

/** Quem muta fora do useAcao, e por quê. */
const FORA_DO_USE_ACAO: Record<string, string> = {
  "lib/player/use-player-da-aula.ts":
    "o progresso da aula sincroniza em segundo plano, sem toast e sem recarregar a página",
};

describe("useAcao é o caminho das mutações que a pessoa dispara", () => {
  test("todo arquivo que muta usa o useAcao, ou está na lista de exceções", () => {
    const fora = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)]
      .filter((arquivo) => !arquivo.endsWith(".test.ts"))
      .filter((arquivo) => !(arquivo in FORA_DO_USE_ACAO))
      .filter((arquivo) => {
        const texto = readFileSync(join(SRC, arquivo), "utf8");
        return MUTACAO.test(texto) && !texto.includes("useAcao(");
      });
    expect(fora).toEqual([]);
  });
});
